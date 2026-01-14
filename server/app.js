const express = require('express');
const cors = require('cors');

const { sequelize, User, Movie, Genre, Tag, Watched, Link } = require('./models/models');
// --------------------

const app = express();
const cron = require('node-cron'); 
const { Op, QueryTypes } = require('sequelize');

// --- KONFIGURACJA ---
app.use(cors());
app.use(express.json());




let to_10_list = []; 
let genre_otw = { 
    name: "",
    movies: []
};

// ==========================================================
// 2. FUNKCJA AKTUALIZUJĄCA (Wykonuje się tylko w poniedziałki)
// ==========================================================

async function wykonajObliczenia() {
    console.log('Aktualizacja rankingów (Top 10 i Gatunek)...');
    try {
        // 1. TOP 10 (SQL dla wydajności)
        let queryTop10 = `
            SELECT m.id, m.title, m.poster_path, AVG(r.rating) as srednia
            FROM movie m
            JOIN rating r ON m.id = r.id_movie
            WHERE m.poster_path IS NOT NULL
            GROUP BY m.id, m.title, m.poster_path
            ORDER BY srednia DESC
            LIMIT 10;
        `;
       let wyniki = await sequelize.query(queryTop10, { type: QueryTypes.SELECT });


        if (wyniki.length === 0) {
            console.log("⚠️ Brak ocenianych filmów z plakatami. Uruchamiam PLAN B (losowe filmy)...");
            wyniki = await Movie.findAll({
                where: { poster_path: { [Op.ne]: null } }, 
                order: sequelize.random(),
                limit: 10
            });
        }

        if (wyniki.length === 0) {
             console.log(" Brak plakatów w bazie. Uruchamiam PLAN C (filmy bez plakatów)...");
             wyniki = await Movie.findAll({
                limit: 10,
                order: sequelize.random()
             });
        }

        to_10_list = wyniki;

   
        const najlepszyGatunek = await Genre.getBestRated();
        if (najlepszyGatunek) {
            genre_otw.nazwa = najlepszyGatunek.name;
          
            genre_otw.filmy = await Movie.findAll({
                include: [{ model: Genre, where: { name: najlepszyGatunek.name }, attributes: [], through: { attributes: [] } }],
                where: { poster_path: { [Op.ne]: null } },
                order: sequelize.random(), limit: 10
            });
        }
        console.log('Rankingi zaktualizowane.');
    } catch (e) { console.error("Błąd aktualizacji rankingów:", e.message); }
}

cron.schedule('0 0 * * 1', wykonajObliczenia);

setTimeout(wykonajObliczenia, 2000);

// ==========================================================
// 4. ENDPOINTY (Tylko wyświetlają gotowe tablice)
// ==========================================================
// Zwraca Top 10 z pamięci
app.get('/api/weekly-top', (req, res) => {
    res.json(to_10_list);
});


app.get('/api/weekly-genre', (req, res) => {
    res.json(genre_otw);
});

// --- ENDPOINTY ---

// 1. REJESTRACJA
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
       
        const user = await User.signup(username, email, password);

        //.........................SUKCES.......................................
        // res.status(201).json({ message: "Rejestracja udana!", userId: user.id });
        console.error("Register successful", sukces.message);
        res.status(201).json({ message: sukces.message });
//....................................................................
    } catch (error) {

        // Obsługa błędów (np. "Użytkownik już istnieje")
        console.error("Błąd rejestracji:", error.message);
        res.status(400).json({ message: error.message });
    }
});

// 2. LOGOWANIE
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
 
        const user = await User.authenticate(email, password);

        // Sukces
        console.log(`Zalogowano: ${user.username}`);
        res.status(200).json({ 
            message: "Login successful", 
            user: user 
        });

    } catch (error) {
    
        console.error("Błąd logowania:", error.message);
        res.status(401).json({ message: error.message });
    }
});




// NOWY ENDPOINT: Najlepszy gatunek
app.get('/genres/best', async (req, res) => {
    try {
        const bestGenre = await Genre.getBestRated();
        
        if (!bestGenre) {
 
            return res.json({ name: 'N/A', avg_rating: 0 });
        }
        
       
        bestGenre.avg_rating = parseFloat(bestGenre.avg_rating).toFixed(2);
        
        res.json(bestGenre);
    } catch (error) {
        console.error("Błąd pobierania najlepszego gatunku:", error);
        res.status(500).json({ message: "Błąd serwera" });
    }
});




// --- ENDPOINT: TOP MOVIES ---
app.get('/movies/top', async (req, res) => {
    try {
       
        const { Op } = require('sequelize');
        
        const movies = await Movie.findAll({
            where: {
                poster_path: {
                    [Op.ne]: null
                }
            },
            limit: 10, 
        });

        res.json(movies);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Błąd pobierania filmów" });
    }
});


// --- ENDPOINT: WSZYSTKIE FILMY (Z PAGINACJĄ I FILTROWANIEM) ---
app.get('/movies', async (req, res) => {
    try {
        const { Op } = require('sequelize');
        const { Movie, Genre } = require('./models/models'); 
        
        const page = parseInt(req.query.page) || 1;
        const limit = 60;
        const offset = (page - 1) * limit;

       
        const genreName = req.query.genre;
       const search = req.query.search; 

const queryOptions = {
    where: {
        poster_path: { [Op.ne]: null } 
    },
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

        res.json({
            movies: rows,
            totalItems: count,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            currentGenre: genreName
        });

    } catch (error) {
        console.error("Błąd pobierania filmów:", error);
        res.status(500).json({ message: "Błąd serwera" });
    }
});


// --- ENDPOINT: POJEDYNCZY FILM (Szczegóły + Gatunki) ---
app.get('/movies/:id', async (req, res) => {
    try {
        const { Movie, Genre, Link } = require('./models/models');

     
        const movieId = req.params.id;

        const movie = await Movie.findOne({
            where: { id: movieId },
            include: [
                {
                    model: Genre,
                    through: { attributes: [] } 
                },
                {
                    model: Link, 
                }
            ]
        });

        if (!movie) {
            return res.status(404).json({ message: "Film nie znaleziony" });
        }

        res.json(movie);

    } catch (error) {
        console.error("Błąd pobierania filmu:", error);
        res.status(500).json({ message: "Błąd serwera" });
    }
});


app.post('/rate', async (req, res) => {
    try {
        const { userId, movieId, rating } = req.body;
       
        const { Watched } = require('./models/models');


        const result = await Watched.rateMovie(userId, movieId, rating);

        res.json({ message: "Oceniono pomyślnie", rating: result.rating });

    } catch (error) {
        console.error("Błąd oceniania:", error);
        res.status(500).json({ message: "Błąd serwera" });
    }
});

// --- ENDPOINT: POBIERZ STATUS I OCENĘ (GET) ---

app.get('/watched/:userId/:movieId', async (req, res) => {
    try {
        const { Watched } = require('./models/models');
        
        const entry = await Watched.findOne({
            where: { 
                userId: req.params.userId, 
                movieId: req.params.movieId 
            }
        });

        if (entry) {
           
            res.json({ rated: true, rating: entry.rating });
        } else {
    
            res.json({ rated: false, rating: 0 });
        }

    } catch (error) {
        console.error("Błąd pobierania oceny:", error);
        res.status(500).json({ message: "Błąd serwera" });
    }
});



// --- NOWY ENDPOINT: LISTA OBEJRZANYCH FILMÓW UŻYTKOWNIKA ---
app.get('/users/:userId/watched', async (req, res) => {
    try {
        const { Watched, Movie } = require('./models/models');
        
        const watchedList = await Watched.findAll({
            where: { 
                userId: req.params.userId 
            },
            include: [{
                model: Movie, 
                attributes: ['id', 'title', 'poster_path', 'overview']
            }],
            order: [['id', 'DESC']] 
        });

        res.json(watchedList);

    } catch (error) {
        console.error("Błąd pobierania listy watched:", error);
        res.status(500).json({ message: "Błąd serwera" });
    }
});


// --- ENDPOINT: REKOMENDACJE  ---
app.get('/users/:userId/recommendations', async (req, res) => {
    try {
      
        const { Movie, Genre, Tag, Watched } = require('./models/models');
        const { Op } = require('sequelize');
        const userId = req.params.userId;

       
        const likedMovies = await Watched.findAll({
            where: { 
                userId: userId, 
                rating: 5 
            },
            include: [
                {
                    model: Movie,
                    include: [
                        { model: Genre }, 
                        { model: Tag }   
                    ]
                }
            ]
        });

     
        if (likedMovies.length === 0) return res.json([]);

      
        const favGenreIds = new Set();
        const favTags = new Set();

        likedMovies.forEach(watchedEntry => {
            const movie = watchedEntry.Movie;
            if (!movie) return;

            if (movie.Genres && movie.Genres.length > 0) {
                movie.Genres.forEach(g => favGenreIds.add(g.id));
            }
         
            if (movie.Tags && movie.Tags.length > 0) {
                movie.Tags.forEach(t => favTags.add(t.tag));
            }
        });

        
        const allWatched = await Watched.findAll({ 
            where: { userId }, 
            attributes: ['movieId'] 
        });
        const watchedIds = allWatched.map(w => w.movieId);

        
        let candidatesByGenre = [];
        if (favGenreIds.size > 0) {
            candidatesByGenre = await Movie.findAll({
                where: {
                    id: { [Op.notIn]: watchedIds },
                    poster_path: { [Op.ne]: null }
                },
                include: [{
                    model: Genre,
                    where: { id: { [Op.in]: Array.from(favGenreIds) } },
                    through: { attributes: [] }
                }],
                limit: 30 
            });
        }

        let candidatesByTag = [];
        if (favTags.size > 0) {
            candidatesByTag = await Movie.findAll({
                where: {
                    id: { [Op.notIn]: watchedIds },
                    poster_path: { [Op.ne]: null }
                },
                include: [{
                    model: Tag,
                    where: { tag: { [Op.in]: Array.from(favTags) } }
                }],
                limit: 30
            });
        }


        const allCandidates = [...candidatesByGenre, ...candidatesByTag];

        const uniqueMoviesMap = new Map();
        allCandidates.forEach(movie => {
            if (!uniqueMoviesMap.has(movie.id)) {
                uniqueMoviesMap.set(movie.id, movie);
            }
        });
        
        const uniqueMovies = Array.from(uniqueMoviesMap.values());


        const shuffled = uniqueMovies.sort(() => 0.5 - Math.random());
        const result = shuffled.slice(0, 10);

        res.json(result);

    } catch (error) {
        console.error("Błąd rekomendacji:", error);
        res.status(500).json({ message: "Błąd serwera", error: error.message });
    }
});


// --- ENDPOINT: TOGGLE WATCH LIST (Dodaj/Usuń) ---
app.post('/towatch', async (req, res) => {
    try {
        const { userId, movieId } = req.body;
        const { ToWatch } = require('./models/models');


        const result = await ToWatch.toggleMovie(userId, movieId);

        res.json(result); 

    } catch (error) {
        console.error("Błąd ToWatch:", error);
        res.status(500).json({ message: "Błąd serwera" });
    }
});

// --- NOWY ENDPOINT: SPRAWDŹ CZY FILM JEST NA LIŚCIE ---
app.get('/towatch/:userId/:movieId', async (req, res) => {
    try {
        const { ToWatch } = require('./models/models');
        
        const entry = await ToWatch.findOne({
            where: { 
                userId: req.params.userId, 
                movieId: req.params.movieId 
            }
        });


        res.json({ inList: !!entry });

    } catch (error) {
        console.error("Błąd sprawdzania ToWatch:", error);
        res.status(500).json({ message: "Błąd serwera" });
    }
});

// --- ENDPOINT: POBIERZ LISTĘ TO WATCH ---
app.get('/users/:userId/towatch', async (req, res) => {
    try {
        const { ToWatch, Movie } = require('./models/models');
        
        const list = await ToWatch.findAll({
            where: { 
                userId: req.params.userId 
            },
            include: [{
                model: Movie, 
                attributes: ['id', 'title', 'poster_path']
            }],
            order: [['id', 'DESC']] 
        });

        res.json(list);

    } catch (error) {
        console.error("Błąd pobierania listy ToWatch:", error);
        res.status(500).json({ message: "Błąd serwera" });
    }
});



// --- ENDPOINT: USUŃ Z TO WATCH (DELETE) ---
app.delete('/towatch/:userId/:movieId', async (req, res) => {
    try {
        const { ToWatch } = require('./models/models');
        
        const result = await ToWatch.destroy({
            where: { 
                userId: req.params.userId, 
                movieId: req.params.movieId 
            }
        });

        if (result) {
            res.json({ message: "Usunięto z listy" });
        } else {
            res.status(404).json({ message: "Nie znaleziono filmu na liście" });
        }

    } catch (error) {
        console.error("Błąd usuwania z ToWatch:", error);
        res.status(500).json({ message: "Błąd serwera" });
    }
});

// --- ENDPOINT: USUŃ Z WATCHED (DELETE) ---
app.delete('/watched/:userId/:movieId', async (req, res) => {
    try {
        const { Watched } = require('./models/models');
        
     
        const result = await Watched.destroy({
            where: { 
                userId: req.params.userId, 
                movieId: req.params.movieId 
            }
        });

        if (result) {
            res.json({ message: "Usunięto z obejrzanych" });
        } else {
            res.status(404).json({ message: "Nie znaleziono wpisu" });
        }

    } catch (error) {
        console.error("Błąd usuwania z Watched:", error);
        res.status(500).json({ message: "Błąd serwera" });
    }
});


// --- START SERWERA ---
async function startServer() {
    try {
        await sequelize.authenticate();
        console.log('Baza danych podłączona.');
        
        await sequelize.sync({ force: false, alter: false });
        console.log(' Modele zsynchronizowane.');

        app.listen(3000, () => {
            console.log('Serwer działa na http://localhost:3000');
        });

    } catch (error) {
        console.error('Błąd startu:', error);
    }
};


startServer();