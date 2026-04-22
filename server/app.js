// === WYBÓR  BAZY DANYCH ===
const ACTIVE_DB = 'postgres'; 
//const ACTIVE_DB = 'neo4j'; 

const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// ŁADOWANIE ODPOWIEDNIEJ BAZY 
let db;
if (ACTIVE_DB === 'postgres') {
    db = require('./services/postgresService');
} else if (ACTIVE_DB === 'neo4j') {
    db = require('./services/neo4jService');
} else {
    throw new Error("Nieprawidłowa nazwa bazy w ACTIVE_DB");
}

const cron = require('node-cron');
let to_10_list = []; 
let genre_otw = { name: "", movies: [] };


// ==========================================================
// 2. FUNKCJA AKTUALIZUJĄCA (Wykonuje się tylko w poniedziałki)
// ==========================================================

async function wykonajObliczenia() {
    console.log('Aktualizacja rankingów...');
    try {
        const stats = await db.getWeeklyStats();
        to_10_list = stats.top10;
        genre_otw = stats.genreTop;
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

// REJESTRACJA
app.post('/register', async (req, res) => {
    try {
        const user = await db.registerUser(req.body.username, req.body.email, req.body.password);
        res.status(201).json({ message: "Rejestracja udana!", user });
    } catch (error) { res.status(400).json({ message: error.message }); }
});

// LOGOWANIE
app.post('/login', async (req, res) => {
    try {
        const user = await db.loginUser(req.body.email, req.body.password);
        res.status(200).json({ message: "Login successful", user });
    } catch (error) { res.status(401).json({ message: error.message }); }
});

// Endpoint: Szukaj użytkownika
app.get('/users/search', async (req, res) => {
    try {
        const query = req.query.q;
        const users = await db.searchUsers(query);
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: "Błąd wyszukiwania użytkowników" });
    }
});

// Endpoint: Sprawdź czy obserwuję
app.get('/users/follow-status', async (req, res) => {
    try {
        const { followerId, followedId } = req.query;
        const result = await db.checkFollowStatus(followerId, followedId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: "Błąd sprawdzania statusu" });
    }
});

// Endpoint: Profil użytkownika po nazwie
app.get('/users/:username', async (req, res) => {
    try {
        const user = await db.getUserProfile(req.params.username);
        if (!user) return res.status(404).json({ error: "Nie znaleziono użytkownika" });
        res.json(user);
    } catch (error) {
        // DODAJEMY CONSOLE.ERROR, żeby wiedzieć co się sypie!
        console.error("❌ BŁĄD POBIERANIA PROFILU (backend):", error);
        res.status(500).json({ error: "Błąd pobierania profilu" });
    }
});

// ENDPOINT: Najlepszy gatunek
app.get('/genres/best', async (req, res) => {
    try { res.json(await db.getBestGenre() || { name: 'N/A', avg_rating: 0 }); } 
    catch (error) { res.status(500).json({ message: "Błąd serwera" }); }
});



// Endpoint: Przełącz Follow/Unfollow

app.post('/users/toggle-follow', async (req, res) => {
    try {
        const { followerId, followedId } = req.body;
        console.log(`[DEBUG] Próba follow. Kto: ${followerId} | Kogo: ${followedId}`);
        const result = await db.toggleFollow(followerId, followedId);
        res.json(result);
    } catch (error) {
        console.error("❌ BŁĄD PRZY FOLLOW:", error); // Teraz backend nam wszystko wyśpiewa!
        res.status(500).json({ error: "Błąd zmiany statusu obserwowania" });
    }
});
// --- ENDPOINT: TOP MOVIES ---
app.get('/movies/top', async (req, res) => {
    try {
        const movies = await db.getTopMovies();
        res.json(movies);
    } catch (error) {
        console.error("Błąd pobierania top filmów:", error);
        res.status(500).json({ message: "Błąd serwera" });
    }
});

// --- ENDPOINT: POJEDYNCZY FILM ---
app.get('/movies/:id', async (req, res) => {
    try {
        const movieId = req.params.id;
        const movie = await db.getMovieById(movieId);

        if (!movie) {
            return res.status(404).json({ message: "Film nie znaleziony" });
        }
        res.json(movie);
    } catch (error) {
        console.error("Błąd pobierania filmu:", error);
        res.status(500).json({ message: "Błąd serwera" });
    }
});


// --- ENDPOINT: WSZYSTKIE FILMY (Z PAGINACJĄ I FILTROWANIEM) ---
app.get('/movies', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const genreName = req.query.genre;
        const search = req.query.search; 

        // App.js znów nie wie skąd są dane. Po prostu prosi o nie bazę!
        const result = await db.getMovies(page, genreName, search);
        res.json(result);

    } catch (error) {
        console.error("Błąd pobierania filmów:", error);
        res.status(500).json({ message: "Błąd serwera" });
    }
});


app.post('/rate', async (req, res) => {
    try { res.json(await db.rateMovie(req.body.userId, req.body.movieId, req.body.rating)); } 
    catch (error) { res.status(500).json({ message: "Błąd serwera" }); }
});

// --- ENDPOINT: POBIERZ STATUS I OCENĘ (GET) ---

app.get('/watched/:userId/:movieId', async (req, res) => {
    try { res.json(await db.getWatchedStatus(req.params.userId, req.params.movieId)); } 
    catch (error) { res.status(500).json({ message: "Błąd serwera" }); }
});


// --- NOWY ENDPOINT: LISTA OBEJRZANYCH FILMÓW UŻYTKOWNIKA ---
app.get('/users/:userId/watched', async (req, res) => {
    try { res.json(await db.getUserWatched(req.params.userId)); } 
    catch (error) { res.status(500).json({ message: "Błąd serwera" }); }
});


// --- ENDPOINT: REKOMENDACJE  ---
// --- ENDPOINT 1: STANDARDOWE REKOMENDACJE (Gatunki i Tagi - Twoja oryginalna funkcja) ---
app.get('/users/:userId/recommendations', async (req, res) => {
    try {
        const userId = req.params.userId;
        // Wywołujemy starą, dobrą funkcję opartą na ocenach (5 gwiazdek)
        const recommendations = await db.getRecommendations(userId);
        res.json(recommendations);
    } catch (error) {
        console.error("Błąd standardowych rekomendacji:", error);
        res.status(500).json({ message: "Błąd serwera", error: error.message });
    }
});

// --- ENDPOINT 2: SOCIAL REKOMENDACJE (Polecane od obserwowanych użytkowników) ---
app.get('/users/:userId/social-recommendations', async (req, res) => {
    try {
        const userId = req.params.userId;
        // Wywołujemy nową funkcję społecznościową
        const socialRecommendations = await db.getSocialRecommendations(userId);
        res.json(socialRecommendations);
    } catch (error) {
        console.error("Błąd social rekomendacji:", error);
        res.status(500).json({ message: "Błąd serwera", error: error.message });
    }
});

// --- ENDPOINT: TOGGLE WATCH LIST (Dodaj/Usuń) ---
app.post('/towatch', async (req, res) => {
    try { res.json(await db.toggleToWatch(req.body.userId, req.body.movieId)); } 
    catch (error) { res.status(500).json({ message: "Błąd serwera" }); }
});

// --- NOWY ENDPOINT: SPRAWDŹ CZY FILM JEST NA LIŚCIE ---
app.get('/towatch/:userId/:movieId', async (req, res) => {
    try { res.json(await db.getToWatchStatus(req.params.userId, req.params.movieId)); } 
    catch (error) { res.status(500).json({ message: "Błąd serwera" }); }
});

// --- ENDPOINT: POBIERZ LISTĘ TO WATCH ---
app.get('/users/:userId/towatch', async (req, res) => {
    try { res.json(await db.getUserToWatch(req.params.userId)); } 
    catch (error) { res.status(500).json({ message: "Błąd serwera" }); }
});



// --- ENDPOINT: USUŃ Z TO WATCH (DELETE) ---
app.delete('/towatch/:userId/:movieId', async (req, res) => {
    try { 
        await db.removeToWatch(req.params.userId, req.params.movieId);
        res.json({ message: "Usunięto z listy" }); 
    } catch (error) { res.status(500).json({ message: "Błąd serwera" }); }
});

// --- ENDPOINT: USUŃ Z WATCHED (DELETE) ---
app.delete('/watched/:userId/:movieId', async (req, res) => {
    try { 
        await db.removeWatched(req.params.userId, req.params.movieId);
        res.json({ message: "Usunięto z obejrzanych" }); 
    } catch (error) { res.status(500).json({ message: "Błąd serwera" }); }
});

// --- START SERWERA ---
async function startServer() {
    try {
        if (ACTIVE_DB === 'postgres') {
            const { sequelize } = require('./models/models');
            await sequelize.authenticate();
            console.log('🐘 Baza danych (PostgreSQL) podłączona.');
        } else if (ACTIVE_DB === 'neo4j') {
            const driver = require('./config/neo4j_db');
            await driver.getServerInfo();
            console.log('🕸️ Baza danych (Neo4j) podłączona.');
        }

        app.listen(3000, () => {
            console.log(`🚀 Serwer działa na http://localhost:3000 (Aktywna baza: ${ACTIVE_DB})`);
        });

    } catch (error) {
        console.error('Błąd startu:', error);
    }
}


startServer();