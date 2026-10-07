// plik: server/services/neo4jService.js
const driver = require('../config/neo4j_db');
const bcrypt = require('bcrypt');
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

async function getMovies(page = 1, genreName = null, search = null) {
    const session = driver.session();
    const limit = 60;
    const skip = (page - 1) * limit;

    try {
        let matchClause = "";
        let params = { skip: skip, limit: limit };

        if (search) {
            const fuzzySearch = search.trim().split(/\s+/).map(word => word + "~").join(" ");
            
            matchClause = `CALL db.index.fulltext.queryNodes("movie_title_index", $search) YIELD node AS m WHERE m.poster_path IS NOT NULL`;
            params.search = fuzzySearch;
        } else {
            matchClause = `MATCH (m:Movie) WHERE m.poster_path IS NOT NULL`;
        }

        if (genreName) {
            matchClause += ` MATCH (m)-[:HAS_GENRE]->(g:Genre {name: $genreName})`;
            params.genreName = genreName;
        }

        const countResult = await session.run(`${matchClause} RETURN count(m) AS total`, params);
        const totalItems = countResult.records[0].get('total');

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


async function getRecommendations(userId) {
    const session = driver.session();
    try {
        const id = parseInt(userId);

 
        const profileResult = await session.run(
            `MATCH (u:User {id: $userId})-[r:WATCHED]->(m:Movie)
             WHERE r.rating = 5
             OPTIONAL MATCH (m)-[:HAS_GENRE]->(g:Genre)
             OPTIONAL MATCH (m)-[:HAS_TAG]->(t:Tag)
             RETURN collect(DISTINCT g.name) AS genres,
                    collect(DISTINCT t.name)  AS tags`,
            { userId: id }
        );

        const favGenres = profileResult.records[0]?.get('genres') ?? [];
        const favTags   = profileResult.records[0]?.get('tags')   ?? [];


        if (favGenres.length === 0 && favTags.length === 0) return [];


        const watchedResult = await session.run(
            `MATCH (u:User {id: $userId})-[:WATCHED]->(m:Movie)
             RETURN collect(m.id) AS watchedIds`,
            { userId: id }
        );
        const watchedIds = watchedResult.records[0]?.get('watchedIds') ?? [];

                let candidatesByGenre = [];
        if (favGenres.length > 0) {
            const res = await session.run(
                `MATCH (m:Movie)-[:HAS_GENRE]->(g:Genre)
                 WHERE g.name IN $favGenres
                   AND m.poster_path IS NOT NULL
                   AND NOT (m.id IN $watchedIds)
                 RETURN DISTINCT m
                 ORDER BY rand()
                 LIMIT 30`,
                { favGenres, watchedIds }
            );
            candidatesByGenre = res.records.map(r => r.get('m').properties);
        }

        let candidatesByTag = [];
        if (favTags.length > 0) {
            const res = await session.run(
                `MATCH (m:Movie)-[:HAS_TAG]->(t:Tag)
                 WHERE t.name IN $favTags
                   AND m.poster_path IS NOT NULL
                   AND NOT (m.id IN $watchedIds)
                 RETURN DISTINCT m
                 ORDER BY rand()
                 LIMIT 30`,
                { favTags, watchedIds }
            );
            candidatesByTag = res.records.map(r => r.get('m').properties);
        }

        const uniqueMap = new Map();
        [...candidatesByGenre, ...candidatesByTag].forEach(m => {
            const key = Number(m.id);
            if (!uniqueMap.has(key)) uniqueMap.set(key, m);
        });
        return Array.from(uniqueMap.values())
                    .sort(() => 0.5 - Math.random())
                    .slice(0, 10);
    } finally {
        await session.close();
    }
}


async function registerUser(username, email, password) {
    const session = driver.session();
    try {
        const exists = await session.run(
            `MATCH (u:User {email: $email}) RETURN u LIMIT 1`,
            { email }
        );
        if (exists.records.length > 0) {
            throw new Error("Użytkownik o takim emailu już istnieje!");
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const idResult = await session.run(
            `MATCH (u:User) WHERE u.id IS NOT NULL
             RETURN coalesce(max(u.id), 0) + 1 AS newId`
        );
        const newId = idResult.records[0].get('newId');

        const result = await session.run(
            `CREATE (u:User {
                id: toInteger($newId),
                username: $username,
                email: $email,
                password: $hashedPassword
             })
             RETURN u.id AS id, u.username AS username, u.email AS email`,
            { newId, username, email, hashedPassword }
        );

        const record = result.records[0];
        return {
            id: record.get('id'),
            username: record.get('username'),
            email: record.get('email')
        };
    } finally {
        await session.close();
    }
}

async function loginUser(email, password) {
    const session = driver.session();
    try {
        const result = await session.run(
            `MATCH (u:User {email: $email})
             RETURN u.id AS id, u.username AS username,
                    u.email AS email, u.password AS password`,
            { email }
        );

        if (result.records.length === 0) {
            throw new Error("Nieprawidłowy email lub hasło");
        }

        const record = result.records[0];
        const match = await bcrypt.compare(password, record.get('password') || '');
        if (!match) {
            throw new Error("Nieprawidłowy email lub hasło");
        }

        return {
            id: record.get('id'),
            username: record.get('username'),
            email: record.get('email')
        };
    } finally {
        await session.close();
    }
}

async function getBestGenre() {
    const session = driver.session();
    try {
        const result = await session.run(
            `MATCH (m:Movie)<-[r:WATCHED]-()
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

async function getTopRatedMovies() {
    const session = driver.session();
    try {
        const result = await session.run(
            `MATCH (m:Movie)<-[r:WATCHED]-()
             WHERE m.poster_path IS NOT NULL
             WITH m, avg(r.rating) AS srednia, count(r) AS liczba
             WHERE liczba >= 50
             RETURN m, srednia
             ORDER BY srednia DESC, m.id
             LIMIT 10`
        );
        return result.records.map(record => {
            const movie = record.get('m').properties;
            movie.srednia = record.get('srednia');
            return movie;
        });
    } finally {
        await session.close();
    }
}

async function getWeeklyStats() {
    let top10 = await getTopRatedMovies();

    if (top10.length === 0) {
        top10 = await getTopMovies();
    }

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
if (check.records.length > 0) {
    await session.run(`MATCH (u:User {id: toInteger($userId)})-[r:TO_WATCH]->(m:Movie {id: toInteger($movieId)}) DELETE r`, { userId: parseInt(userId), movieId: parseInt(movieId) });
    return { message: "Usunięto z listy", added: false };
} else {
    await session.run(`MATCH (u:User {id: toInteger($userId)}), (m:Movie {id: toInteger($movieId)}) MERGE (u)-[:TO_WATCH]->(m)`, { userId: parseInt(userId), movieId: parseInt(movieId) });
    return { message: "Dodano do listy", added: true };
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
        const result = await session.run(
            'MATCH (m:Movie) WHERE m.tmdbId IS NOT NULL RETURN m.id AS id, m.title AS title, m.tmdbId AS tmdbId'
        );
        
        return result.records.map(r => {
            const rawId = r.get('id');
            const rawTmdbId = r.get('tmdbId');

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
                id: typeof rawId.toNumber === 'function' ? rawId.toNumber() : Number(rawId),
                username: r.get('username'),
                name: r.get('name') || null
            };
        });
    } finally {
        await session.close();
    }
}

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
            await session.run(
                `MATCH (u1:User {id: toInteger($followerId)})-[r:FOLLOWS]->(u2:User {id: toInteger($followedId)}) DELETE r`,
                { followerId: parseInt(followerId), followedId: parseInt(followedId) }
            );
            return { isFollowing: false };
        } else {
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
    toggleFollow, searchUsers, getUserProfile, checkFollowStatus, getSocialRecommendations, getTopRatedMovies
};









