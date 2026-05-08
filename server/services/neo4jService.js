// plik: server/services/neo4jService.js
const driver = require('../config/neo4j_db');

async function getTopMovies() {
    const session = driver.session();
    try {
        const result = await session.run(
            `MATCH (m:Movie) 
             WHERE m.poster_path IS NOT NULL 
             RETURN m 
             LIMIT 10`
        );
        return result.records.map(record => record.get('m').properties);
    } finally {
        await session.close();
    }
}

async function getMovieById(id) {
    const session = driver.session();
    try {
        const result = await session.run(
            `MATCH (m:Movie {id: toInteger($id)})
             OPTIONAL MATCH (m)-[:HAS_GENRE]->(g:Genre)
             RETURN m, collect(g.name) as genres`,
            { id: parseInt(id) }
        );

        if (result.records.length === 0) return null;

        const record = result.records[0];
        const movie = record.get('m').properties;
        
        movie.Genres = record.get('genres').map(name => ({ id: name, name: name }));
        return movie;
    } finally {
        await session.close();
    }
}

// --- NOWE: LISTA FILMÓW Z PAGINACJĄ ---
// --- NOWE: LISTA FILMÓW Z PAGINACJĄ I WYSZUKIWANIEM ROZMYTYM (FUZZY) ---
async function getMovies(page = 1, genreName = null, search = null) {
    const session = driver.session();
    const limit = 60;
    const skip = (page - 1) * limit;

    try {
        let matchClause = "";
        let params = { skip: skip, limit: limit };

        if (search) {
            // FUZZY SEARCH: Dodajemy znak '~' do każdego słowa. 
            // Dzięki temu 'badman' zamieni się na 'badman~' i Neo4j dopasuje 'batman'
            const fuzzySearch = search.trim().split(/\s+/).map(word => word + "~").join(" ");
            
            // Używamy naszego nowego indeksu pełnotekstowego!
            matchClause = `CALL db.index.fulltext.queryNodes("movie_title_index", $search) YIELD node AS m WHERE m.poster_path IS NOT NULL`;
            params.search = fuzzySearch;
        } else {
            // Jeśli nie szukamy, zwracamy po prostu wszystkie filmy
            matchClause = `MATCH (m:Movie) WHERE m.poster_path IS NOT NULL`;
        }

        if (genreName) {
            // Podążamy ścieżką relacji od filmu do konkretnego gatunku
            matchClause += ` MATCH (m)-[:HAS_GENRE]->(g:Genre {name: $genreName})`;
            params.genreName = genreName;
        }

        // 1. Zliczamy wszystkie pasujące filmy (do paginacji)
        const countResult = await session.run(`${matchClause} RETURN count(m) AS total`, params);
        const totalItems = countResult.records[0].get('total');

        // 2. Pobieramy właściwą stronę wyników. 
        // Jeśli jest wyszukiwanie -> sortujemy od najlepszego dopasowania. Jeśli nie -> alfabetycznie.
        let returnClause = search 
            ? `RETURN m SKIP toInteger($skip) LIMIT toInteger($limit)` 
            : `RETURN m ORDER BY m.title ASC SKIP toInteger($skip) LIMIT toInteger($limit)`;

        const result = await session.run(`${matchClause} ${returnClause}`, params);

        const movies = result.records.map(record => record.get('m').properties);

        return {
            movies, totalItems,
            totalPages: Math.ceil(totalItems / limit),
            currentPage: page, currentGenre: genreName
        };
    } finally {
        await session.close();
    }
}

// --- NOWE: POTĘŻNE REKOMENDACJE (Filtrowanie Kolaboratywne) ---
async function getRecommendations(userId) {
    const session = driver.session();
    try {
        // Grafowe filtrowanie w 3 krokach:
        // 1. Znajdź użytkowników, którzy bardzo lubią (>=4) to samo co my.
        // 2. Zobacz, co ci użytkownicy lubią jeszcze (>=4).
        // 3. Pomiń to, co my już oceniliśmy (żeby nie polecać obejrzanych).
        const result = await session.run(
            `MATCH (u:User {id: toInteger($userId)})-[r1:WATCHED]->(m:Movie)<-[r2:WATCHED]-(other:User)
             WHERE r1.rating >= 4 AND r2.rating >= 4
             MATCH (other)-[r3:WATCHED]->(rec:Movie)
             WHERE r3.rating >= 4 
               AND NOT (u)-[:WATCHED]->(rec) 
               AND rec.poster_path IS NOT NULL
             RETURN rec, COUNT(*) AS score
             ORDER BY score DESC
             LIMIT 10`,
            { userId: parseInt(userId) }
        );

        return result.records.map(record => record.get('rec').properties);
    } finally {
        await session.close();
    }
}

// --- UŻYTKOWNICY (Logowanie i Rejestracja) ---
async function registerUser(username, email, password) {
    const session = driver.session();
    try {
        // Zapisujemy hasło w grafie (w wersji produkcyjnej użyj bcrypt w Node.js!)
        const result = await session.run(
            `MERGE (u:User {email: $email})
             ON CREATE SET u.id = toInteger(rand() * 1000000), u.username = $username, u.password = $password
             RETURN u`,
            { username, email, password }
        );
        return result.records[0].get('u').properties;
    } finally { await session.close(); }
}

async function loginUser(email, password) {
    const session = driver.session();
    try {
        const result = await session.run(
            `MATCH (u:User {email: $email, password: $password}) RETURN u`,
            { email, password }
        );
        if (result.records.length === 0) throw new Error("Nieprawidłowy email lub hasło");
        return result.records[0].get('u').properties;
    } finally { await session.close(); }
}

// --- ZADANIA CRON I STATYSTYKI ---
async function getBestGenre() {
    const session = driver.session();
    try {
        const result = await session.run(
            `MATCH (m:Movie)<-[r:WATCHED]-(u:User)
             MATCH (m)-[:HAS_GENRE]->(g:Genre)
             RETURN g.name AS name, avg(r.rating) AS avg_rating
             ORDER BY avg_rating DESC LIMIT 1`
        );
        if (result.records.length === 0) return null;
        
        return { 
            name: result.records[0].get('name'), 
            avg_rating: Number(result.records[0].get('avg_rating')).toFixed(2) 
        };
    } finally { await session.close(); }
}

async function getWeeklyStats() {
    const top10 = await getTopMovies();
    const bestGenreData = await getBestGenre();
    let genreTop = { name: bestGenreData ? bestGenreData.name : "", movies: [] };

    if (bestGenreData) {
        const session = driver.session();
        try {
            const moviesResult = await session.run(
                `MATCH (m:Movie)-[:HAS_GENRE]->(g:Genre {name: $genre})
                 WHERE m.poster_path IS NOT NULL
                 RETURN m ORDER BY rand() LIMIT 10`,
                { genre: bestGenreData.name }
            );
            genreTop.movies = moviesResult.records.map(r => r.get('m').properties);
        } finally { await session.close(); }
    }
    return { top10, genreTop };
}


async function rateMovie(userId, movieId, rating) {
    const session = driver.session();
    try {
        const result = await session.run(
            `MATCH (u:User {id: toInteger($userId)}), (m:Movie {id: toInteger($movieId)})
             MERGE (u)-[r:WATCHED]->(m)
             SET r.rating = toFloat($rating), r.timestamp = timestamp()
             RETURN r.rating AS rating`,
            { userId: parseInt(userId), movieId: parseInt(movieId), rating: parseFloat(rating) }
        );
        return { rating: result.records[0].get('rating') };
    } finally { await session.close(); }
}

async function getWatchedStatus(userId, movieId) {
    const session = driver.session();
    try {
        const result = await session.run(
            `MATCH (u:User {id: toInteger($userId)})-[r:WATCHED]->(m:Movie {id: toInteger($movieId)}) RETURN r.rating AS rating`,
            { userId: parseInt(userId), movieId: parseInt(movieId) }
        );
        return { WATCHED: result.records.length > 0, rating: result.records.length > 0 ? result.records[0].get('rating') : 0 };
    } finally { await session.close(); }
}

async function getUserWatched(userId) {
    const session = driver.session();
    try {
        const result = await session.run(
            `MATCH (u:User {id: toInteger($userId)})-[r:WATCHED]->(m:Movie)
             RETURN m, r.rating AS rating ORDER BY r.timestamp DESC`,
            { userId: parseInt(userId) }
        );
        return result.records.map(record => {
            const movie = record.get('m').properties;
            return { Movie: movie, rating: record.get('rating') };
        });
    } finally { await session.close(); }
}

async function removeWatched(userId, movieId) {
    const session = driver.session();
    try {
        await session.run(`MATCH (u:User {id: toInteger($userId)})-[r:WATCHED]->(m:Movie {id: toInteger($movieId)}) DELETE r`, { userId: parseInt(userId), movieId: parseInt(movieId) });
        return true;
    } finally { await session.close(); }
}

async function toggleToWatch(userId, movieId) {
    const session = driver.session();
    try {
        const check = await session.run(`MATCH (u:User {id: toInteger($userId)})-[r:TO_WATCH]->(m:Movie {id: toInteger($movieId)}) RETURN r`, { userId: parseInt(userId), movieId: parseInt(movieId) });
        // Odszukaj ten fragment w neo4jService.js i podmień te dwa returny:
if (check.records.length > 0) {
    await session.run(`MATCH (u:User {id: toInteger($userId)})-[r:TO_WATCH]->(m:Movie {id: toInteger($movieId)}) DELETE r`, { userId: parseInt(userId), movieId: parseInt(movieId) });
    return { message: "Usunięto z listy", added: false }; // <- DODANO added: false
} else {
    await session.run(`MATCH (u:User {id: toInteger($userId)}), (m:Movie {id: toInteger($movieId)}) MERGE (u)-[:TO_WATCH]->(m)`, { userId: parseInt(userId), movieId: parseInt(movieId) });
    return { message: "Dodano do listy", added: true }; // <- DODANO added: true
}
    } finally { await session.close(); }
}

async function getToWatchStatus(userId, movieId) {
    const session = driver.session();
    try {
        const result = await session.run(`MATCH (u:User {id: toInteger($userId)})-[r:TO_WATCH]->(m:Movie {id: toInteger($movieId)}) RETURN r`, { userId: parseInt(userId), movieId: parseInt(movieId) });
        return { inList: result.records.length > 0 };
    } finally { await session.close(); }
}

async function getUserToWatch(userId) {
    const session = driver.session();
    try {
        const result = await session.run(`MATCH (u:User {id: toInteger($userId)})-[r:TO_WATCH]->(m:Movie) RETURN m ORDER BY r.timestamp DESC`, { userId: parseInt(userId) });
        return result.records.map(record => ({ Movie: record.get('m').properties }));
    } finally { await session.close(); }
}

async function removeToWatch(userId, movieId) {
    const session = driver.session();
    try {
        await session.run(`MATCH (u:User {id: toInteger($userId)})-[r:TO_WATCH]->(m:Movie {id: toInteger($movieId)}) DELETE r`, { userId: parseInt(userId), movieId: parseInt(movieId) });
        return true;
    } finally { await session.close(); }
}

async function getAllMoviesWithLinks() {
    const session = driver.session();
    try {
        // Pobieramy filmy, które mają tmdbId
        const result = await session.run(
            'MATCH (m:Movie) WHERE m.tmdbId IS NOT NULL RETURN m.id AS id, m.title AS title, m.tmdbId AS tmdbId'
        );
        
        return result.records.map(r => {
            const rawId = r.get('id');
            const rawTmdbId = r.get('tmdbId');

            // Zabezpieczenie: Jeśli to specjalny obiekt Neo4j, użyj toNumber(), jeśli nie, użyj zwykłego Number()
            const safeId = typeof rawId.toNumber === 'function' ? rawId.toNumber() : Number(rawId);
            const safeTmdbId = typeof rawTmdbId.toNumber === 'function' ? rawTmdbId.toNumber() : Number(rawTmdbId);

            return {
                id: safeId,
                title: r.get('title'),
                tmdbId: safeTmdbId
            };
        });
    } catch (error) {
        console.error("Błąd podczas pobierania filmów z linkami:", error);
        throw error;
    } finally {
        await session.close();
    }
}

async function updateMovieDetails(id, details) {
    const session = driver.session();
    try {
        // Zapisujemy detale i używamy pętli FOREACH do połączenia z nowymi gatunkami
        await session.run(
            `MATCH (m:Movie {id: toInteger($id)})
             SET m.poster_path = $poster_path, 
                 m.overview = $overview, 
                 m.release_year = toInteger($release_year)
             FOREACH (genreName IN $genres |
                 MERGE (g:Genre {name: genreName})
                 MERGE (m)-[:HAS_GENRE]->(g)
             )`,
            {
                id: parseInt(id),
                poster_path: details.poster_path,
                overview: details.overview,
                release_year: details.release_year,
                genres: details.genres || []
            }
        );
    } finally { await session.close(); }
}

// =========================================================================
// --- NOWE: FUNKCJE SPOŁECZNOŚCIOWE (WYSZUKIWANIE I FOLLOW DLA NEO4J) ---
// =========================================================================

// 1. Wyszukiwanie użytkowników w pasku nawigacji
async function searchUsers(searchQuery) {
    const session = driver.session();
    try {
        const result = await session.run(
            `MATCH (u:User)
             WHERE toLower(u.username) CONTAINS toLower($query)
             RETURN u.id AS id, u.username AS username, u.name AS name
             LIMIT 10`,
            { query: searchQuery }
        );
        return result.records.map(r => {
            const rawId = r.get('id');
            return {
                // Bezpieczne konwertowanie identyfikatorów Neo4j
                id: typeof rawId.toNumber === 'function' ? rawId.toNumber() : Number(rawId),
                username: r.get('username'),
                name: r.get('name') || null
            };
        });
    } finally {
        await session.close();
    }
}

// 2. Pobieranie profilu (wraz ze zliczeniem followersów w locie)
// 2. Pobieranie profilu (zaktualizowane dla nowszego Neo4j 5+)
async function getUserProfile(username) {
    const session = driver.session();
    try {
        const result = await session.run(
            `MATCH (u:User {username: $username})
             RETURN u.id AS id, u.username AS username, u.name AS name,
                    COUNT { (u)<-[:FOLLOWS]-() } AS followersCount,
                    COUNT { (u)-[:FOLLOWS]->() } AS followingCount`,
            { username: username }
        );

        if (result.records.length === 0) return null;

        const record = result.records[0];
        const rawId = record.get('id');
        const rawFollowers = record.get('followersCount');
        const rawFollowing = record.get('followingCount');

        return {
            id: typeof rawId.toNumber === 'function' ? rawId.toNumber() : Number(rawId),
            username: record.get('username'),
            name: record.get('name') || null,
            // Upewniamy się, że to na pewno liczba
            followersCount: typeof rawFollowers.toNumber === 'function' ? rawFollowers.toNumber() : Number(rawFollowers),
            followingCount: typeof rawFollowing.toNumber === 'function' ? rawFollowing.toNumber() : Number(rawFollowing)
        };
    } finally {
        await session.close();
    }
}


async function checkFollowStatus(followerId, followedId) {
    const session = driver.session();
    try {
        const result = await session.run(
            `MATCH (u1:User {id: toInteger($followerId)})-[r:FOLLOWS]->(u2:User {id: toInteger($followedId)}) 
             RETURN r`,
            { followerId: parseInt(followerId), followedId: parseInt(followedId) }
        );
        return { isFollowing: result.records.length > 0 };
    } finally {
        await session.close();
    }
}


async function toggleFollow(followerId, followedId) {
    const session = driver.session();
    try {
        const check = await session.run(
            `MATCH (u1:User {id: toInteger($followerId)})-[r:FOLLOWS]->(u2:User {id: toInteger($followedId)}) RETURN r`,
            { followerId: parseInt(followerId), followedId: parseInt(followedId) }
        );

        if (check.records.length > 0) {
            // Jeśli relacja już jest -> Usuwamy ją
            await session.run(
                `MATCH (u1:User {id: toInteger($followerId)})-[r:FOLLOWS]->(u2:User {id: toInteger($followedId)}) DELETE r`,
                { followerId: parseInt(followerId), followedId: parseInt(followedId) }
            );
            return { isFollowing: false };
        } else {
            // Jeśli nie ma relacji -> Tworzymy ją za pomocą MERGE
            await session.run(
                `MATCH (u1:User {id: toInteger($followerId)}), (u2:User {id: toInteger($followedId)}) MERGE (u1)-[:FOLLOWS]->(u2)`,
                { followerId: parseInt(followerId), followedId: parseInt(followedId) }
            );
            return { isFollowing: true };
        }
    } finally {
        await session.close();
    }
}


async function getSocialRecommendations(userId) {
    const session = driver.session();
    try {
        const result = await session.run(
            `MATCH (u:User {id: toInteger($userId)})-[:FOLLOWS]->(followed:User)
             MATCH (followed)-[r:WATCHED]->(m:Movie)
             WHERE r.rating >= 4 AND m.poster_path IS NOT NULL
               AND NOT (u)-[:WATCHED]->(m)
             RETURN m, COUNT(followed) AS popularity
             ORDER BY popularity DESC, rand()
             LIMIT 10`,
            { userId: parseInt(userId) }
        );

        return result.records.map(record => record.get('m').properties);
    } finally {
        await session.close();
    }
}

module.exports = {
    getTopMovies, getMovieById, getMovies, getRecommendations,
    registerUser, loginUser, getBestGenre, getWeeklyStats,
    rateMovie, getWatchedStatus, getUserWatched, removeWatched,
    toggleToWatch, getToWatchStatus, getUserToWatch, removeToWatch,updateMovieDetails, getAllMoviesWithLinks,
    toggleFollow, searchUsers, getUserProfile, checkFollowStatus, getSocialRecommendations
};
