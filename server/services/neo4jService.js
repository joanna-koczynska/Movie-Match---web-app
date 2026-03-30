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
        
        movie.Genres = record.get('genres').map(name => ({ name: name }));
        return movie;
    } finally {
        await session.close();
    }
}

// --- NOWE: LISTA FILMÓW Z PAGINACJĄ ---
async function getMovies(page = 1, genreName = null, search = null) {
    const session = driver.session();
    const limit = 60;
    const skip = (page - 1) * limit;

    try {
        let matchClause = `MATCH (m:Movie) WHERE m.poster_path IS NOT NULL`;
        let params = { skip: skip, limit: limit };

        if (search) {
            // Wyszukiwanie ignorujące wielkość liter (iLike)
            matchClause += ` AND toLower(m.title) CONTAINS toLower($search)`;
            params.search = search;
        }

        if (genreName) {
            // Podążamy ścieżką relacji od filmu do konkretnego gatunku
            matchClause += ` MATCH (m)-[:HAS_GENRE]->(g:Genre {name: $genreName})`;
            params.genreName = genreName;
        }

        // 1. Zliczamy wszystkie pasujące filmy (do paginacji)
        const countResult = await session.run(`${matchClause} RETURN count(m) AS total`, params);
        const totalItems = countResult.records[0].get('total').toNumber();

        // 2. Pobieramy właściwą stronę wyników
        const result = await session.run(
            `${matchClause} RETURN m ORDER BY m.title ASC SKIP toInteger($skip) LIMIT toInteger($limit)`,
            params
        );

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
            `MATCH (u:User {id: toInteger($userId)})-[r1:RATED]->(m:Movie)<-[r2:RATED]-(other:User)
             WHERE r1.rating >= 4 AND r2.rating >= 4
             MATCH (other)-[r3:RATED]->(rec:Movie)
             WHERE r3.rating >= 4 
               AND NOT (u)-[:RATED]->(rec) 
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
            `MATCH (m:Movie)<-[r:RATED]-(u:User)
             MATCH (m)-[:HAS_GENRE]->(g:Genre)
             RETURN g.name AS name, avg(r.rating) AS avg_rating
             ORDER BY avg_rating DESC LIMIT 1`
        );
        if (result.records.length === 0) return null;
        return { name: result.records[0].get('name'), avg_rating: result.records[0].get('avg_rating').toFixed(2) };
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

// --- SYSTEM OCEN (Watched) ---
async function rateMovie(userId, movieId, rating) {
    const session = driver.session();
    try {
        const result = await session.run(
            `MATCH (u:User {id: toInteger($userId)}), (m:Movie {id: toInteger($movieId)})
             MERGE (u)-[r:RATED]->(m)
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
            `MATCH (u:User {id: toInteger($userId)})-[r:RATED]->(m:Movie {id: toInteger($movieId)}) RETURN r.rating AS rating`,
            { userId: parseInt(userId), movieId: parseInt(movieId) }
        );
        return { rated: result.records.length > 0, rating: result.records.length > 0 ? result.records[0].get('rating') : 0 };
    } finally { await session.close(); }
}

async function getUserWatched(userId) {
    const session = driver.session();
    try {
        const result = await session.run(
            `MATCH (u:User {id: toInteger($userId)})-[r:RATED]->(m:Movie)
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
        await session.run(`MATCH (u:User {id: toInteger($userId)})-[r:RATED]->(m:Movie {id: toInteger($movieId)}) DELETE r`, { userId: parseInt(userId), movieId: parseInt(movieId) });
        return true;
    } finally { await session.close(); }
}

// --- LISTA DO OBEJRZENIA (ToWatch) ---
async function toggleToWatch(userId, movieId) {
    const session = driver.session();
    try {
        const check = await session.run(`MATCH (u:User {id: toInteger($userId)})-[r:TO_WATCH]->(m:Movie {id: toInteger($movieId)}) RETURN r`, { userId: parseInt(userId), movieId: parseInt(movieId) });
        if (check.records.length > 0) {
            await session.run(`MATCH (u:User {id: toInteger($userId)})-[r:TO_WATCH]->(m:Movie {id: toInteger($movieId)}) DELETE r`, { userId: parseInt(userId), movieId: parseInt(movieId) });
            return { message: "Usunięto z listy" };
        } else {
            await session.run(`MATCH (u:User {id: toInteger($userId)}), (m:Movie {id: toInteger($movieId)}) MERGE (u)-[:TO_WATCH]->(m)`, { userId: parseInt(userId), movieId: parseInt(movieId) });
            return { message: "Dodano do listy" };
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

module.exports = {
    getTopMovies, getMovieById, getMovies, getRecommendations,
    registerUser, loginUser, getBestGenre, getWeeklyStats,
    rateMovie, getWatchedStatus, getUserWatched, removeWatched,
    toggleToWatch, getToWatchStatus, getUserToWatch, removeToWatch
};
