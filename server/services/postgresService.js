const { Movie, Genre, Tag, Watched, User, ToWatch, Link, Follower,  sequelize } = require('../models/models');
const { QueryTypes, Op } = require('sequelize'); 

// --- UŻYTKOWNICY (Logowanie i Rejestracja) ---
async function registerUser(username, email, password) {
    return await User.signup(username, email, password);
}

async function loginUser(email, password) {
    return await User.authenticate(email, password);
}

// Wyszukiwanie użytkowników po nazwie
async function searchUsers(searchQuery) {
    return await User.findAll({
        where: {
            username: { [Op.iLike]: `%${searchQuery}%` }
        },
        attributes: ['id', 'username', 'name'],
        limit: 10
    });
}

// Pobieranie profilu konkretnego użytkownika
async function getUserProfile(username) {
    const user = await User.findOne({
        where: { username: username }, 
        attributes: ['id', 'username', 'name']
    });

    if (!user) return null;
// W pliku postgresService.js zmień te dwie linijki:

    const followersData = await sequelize.query(
        `SELECT COUNT(*) AS count FROM followers WHERE followed_id = :userId`, 
        { replacements: { userId: user.id }, type: QueryTypes.SELECT }
    );
    const followingData = await sequelize.query(
        `SELECT COUNT(*) AS count FROM followers WHERE follower_id = :userId`, 
        { replacements: { userId: user.id }, type: QueryTypes.SELECT }
    );

    const rawFollowers = followersData[0]?.count || 0;
    const rawFollowing = followingData[0]?.count || 0;

    return { 
        ...user.toJSON(), 
        followersCount: parseInt(rawFollowers, 10) || 0, 
        followingCount: parseInt(rawFollowing, 10) || 0 
    };
}

// --- ZADANIA CRON I STATYSTYKI ---
async function getBestGenre() {
    return await Genre.getBestRated();
}


async function getTopMovies() {
    return await Movie.findAll({
        where: { poster_path: { [Op.ne]: null } },
        limit: 10, 
    });
}

async function getMovieById(id) {
    return await Movie.findOne({
        where: { id: id },
        include: [
            { model: Genre, through: { attributes: [] } },
            // Zauważ: tu usunąłem błąd z { model: Link }, upewnij się że masz zaimportowany Link jeśli chcesz go użyć!
        ]
    });
}

// --- NOWE: LISTA FILMÓW Z PAGINACJĄ ---
async function getMovies(page = 1, genreName = null, search = null) {
    const limit = 60;
    const offset = (page - 1) * limit;

    const queryOptions = {
        where: { poster_path: { [Op.ne]: null } },
        include: [],
        limit: limit,
        offset: offset,
        order: [['title', 'ASC']],
        distinct: true
    };

    if (search) {
        queryOptions.where.title = { [Op.iLike]: `%${search}%` };
    }

    if (genreName) {
        queryOptions.include.push({
            model: Genre,
            where: { name: genreName },
            through: { attributes: [] },
            required: true
        });
    }

    const { count, rows } = await Movie.findAndCountAll(queryOptions);

    return {
        movies: rows,
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        currentGenre: genreName
    };
}

// --- NOWE: REKOMENDACJE (Stary kod z app.js) ---
async function getRecommendations(userId) {
    const likedMovies = await Watched.findAll({
        where: { userId: userId, rating: 5 },
        include: [ { model: Movie, include: [ { model: Genre }, { model: Tag } ] } ]
    });

    if (likedMovies.length === 0) return [];

    const favGenreIds = new Set();
    const favTags = new Set();

    likedMovies.forEach(entry => {
        if (!entry.Movie) return;
        if (entry.Movie.Genres) entry.Movie.Genres.forEach(g => favGenreIds.add(g.id));
        if (entry.Movie.Tags) entry.Movie.Tags.forEach(t => favTags.add(t.tag));
    });

    const allWatched = await Watched.findAll({ where: { userId }, attributes: ['movieId'] });
    const watchedIds = allWatched.map(w => w.movieId);

    let candidatesByGenre = [];
    if (favGenreIds.size > 0) {
        candidatesByGenre = await Movie.findAll({
            where: { id: { [Op.notIn]: watchedIds }, poster_path: { [Op.ne]: null } },
            include: [{ model: Genre, where: { id: { [Op.in]: Array.from(favGenreIds) } }, through: { attributes: [] } }],
            limit: 30 
        });
    }

    let candidatesByTag = [];
    if (favTags.size > 0) {
        candidatesByTag = await Movie.findAll({
            where: { id: { [Op.notIn]: watchedIds }, poster_path: { [Op.ne]: null } },
            include: [{ model: Tag, where: { tag: { [Op.in]: Array.from(favTags) } } }],
            limit: 30
        });
    }

    const allCandidates = [...candidatesByGenre, ...candidatesByTag];
    const uniqueMap = new Map();
    allCandidates.forEach(m => { if (!uniqueMap.has(m.id)) uniqueMap.set(m.id, m); });
    
    return Array.from(uniqueMap.values()).sort(() => 0.5 - Math.random()).slice(0, 10);
}


async function getWeeklyStats() {
    let to_10_list = [];
    let genre_otw = { name: "", movies: [] };

    let queryTop10 = `
        SELECT m.id, m.title, m.poster_path, AVG(r.rating) as srednia
        FROM movie m JOIN rating r ON m.id = r.id_movie
        WHERE m.poster_path IS NOT NULL GROUP BY m.id, m.title, m.poster_path ORDER BY srednia DESC LIMIT 10;
    `;
    to_10_list = await sequelize.query(queryTop10, { type: QueryTypes.SELECT });

    if (to_10_list.length === 0) {
        to_10_list = await Movie.findAll({ where: { poster_path: { [Op.ne]: null } }, order: sequelize.random(), limit: 10 });
    }

    const bestGenre = await Genre.getBestRated();
    if (bestGenre) {
        genre_otw.name = bestGenre.name;
        genre_otw.movies = await Movie.findAll({
            include: [{ model: Genre, where: { name: bestGenre.name }, attributes: [], through: { attributes: [] } }],
            where: { poster_path: { [Op.ne]: null } },
            order: sequelize.random(), limit: 10
        });
    }
    return { top10: to_10_list, genreTop: genre_otw };
}

// --- SYSTEM OCEN (Watched) ---
async function rateMovie(userId, movieId, rating) {
    return await Watched.rateMovie(userId, movieId, rating);
}

async function getWatchedStatus(userId, movieId) {
    const entry = await Watched.findOne({ where: { userId, movieId } });
    return { rated: !!entry, rating: entry ? entry.rating : 0 };
}

async function getUserWatched(userId) {
    return await Watched.findAll({
        where: { userId },
        include: [{ model: Movie, attributes: ['id', 'title', 'poster_path', 'overview'] }],
        order: [['id', 'DESC']]
    });
}

async function removeWatched(userId, movieId) {
    return await Watched.destroy({ where: { userId, movieId } });
}

// --- LISTA DO OBEJRZENIA (ToWatch) ---
async function toggleToWatch(userId, movieId) {
    return await ToWatch.toggleMovie(userId, movieId);
}

async function getToWatchStatus(userId, movieId) {
    const entry = await ToWatch.findOne({ where: { userId, movieId } });
    return { inList: !!entry };
}

async function getUserToWatch(userId) {
    return await ToWatch.findAll({
        where: { userId },
        include: [{ model: Movie, attributes: ['id', 'title', 'poster_path'] }],
        order: [['id', 'DESC']]
    });
}

async function removeToWatch(userId, movieId) {
    return await ToWatch.destroy({ where: { userId, movieId } });
}

async function getAllMoviesWithLinks() {
    const movies = await Movie.findAll({
        include: [{ model: Link, attributes: ['tmdbId'] }]
    });

    return movies.map(m => {
        // Zmieniamy obiekt Sequelize na czysty, prosty JSON
        const plain = m.get({ plain: true });
        
        // Zabezpieczenie: bierzemy Link (z dużej) lub link (z małej litery)
        const linkData = plain.Link || plain.link;
        
        return {
            id: plain.id,
            title: plain.title,
            tmdbId: linkData ? linkData.tmdbId : null
        };
    }).filter(m => m.tmdbId !== null);
}

async function updateMovieDetails(id, details) {
    const movie = await Movie.findByPk(id);
    if (!movie) return;

    await movie.update({
        poster_path: details.poster_path,
        overview: details.overview,
        release_year: details.release_year
    });

    if (details.genres && details.genres.length > 0) {
        for (const genreName of details.genres) {
            const [genre] = await Genre.findOrCreate({ where: { name: genreName } });
            await movie.addGenre(genre);
        }
    }
}

async function followUser(followerId, followedId) {
    const existingEntry = await Follower.findOne({ where: { followerId, followedId } });
    if (!existingEntry) {
        await Follower.create({ followerId, followedId });
        return { message: "Rozpoczęto obserwowanie!" };
    }
    return { message: "Już obserwujesz." };
}

// 2. Rekomendacje od obserwowanych
async function getSocialRecommendations(userId) {
    // Używamy tu sequelize.query, ponieważ zapytanie przez ORM byłoby mało wydajne
    const query = `
        SELECT DISTINCT m.id, m.title, m.poster_path
        FROM movie m
        JOIN watched w ON m.id = w.id_movie
        JOIN followers f ON w.id_user = f.followed_id
        WHERE f.follower_id = :userId
          AND w.rating >= 4
          AND m.poster_path IS NOT NULL
          AND m.id NOT IN (
              SELECT id_movie FROM watched WHERE id_user = :userId
          )
        LIMIT 10;
    `;
    
    const recommendations = await sequelize.query(query, {
        replacements: { userId },
        type: QueryTypes.SELECT
    });

    return recommendations;
}

// Sprawdzanie, czy użytkownik A obserwuje użytkownika B
async function checkFollowStatus(followerId, followedId) {
    const existing = await Follower.findOne({ where: { followerId, followedId } });
    return { isFollowing: !!existing }; 
}

// Przełączanie statusu (Follow / Unfollow)
async function toggleFollow(followerId, followedId) {
    const existing = await sequelize.query(
        `SELECT 1 FROM followers WHERE follower_id = :followerId AND followed_id = :followedId`,
        { replacements: { followerId, followedId }, type: QueryTypes.SELECT }
    );
    
    if (existing.length > 0) {
        await sequelize.query(
            `DELETE FROM followers WHERE follower_id = :followerId AND followed_id = :followedId`,
            { replacements: { followerId, followedId } }
        );
        return { isFollowing: false };
    } else {
        await sequelize.query(
            `INSERT INTO followers (follower_id, followed_id) VALUES (:followerId, :followedId)`,
            { replacements: { followerId, followedId } }
        );
        return { isFollowing: true };
    }
}



module.exports = {
    getTopMovies, getMovieById, getMovies, getRecommendations,
    registerUser, loginUser, getBestGenre, getWeeklyStats,
    rateMovie, getWatchedStatus, getUserWatched, removeWatched,
    toggleToWatch, getToWatchStatus, getUserToWatch, removeToWatch, updateMovieDetails, 
    getAllMoviesWithLinks, getSocialRecommendations, followUser, getUserProfile, searchUsers, checkFollowStatus, toggleFollow,
};