const axios = require('axios');

// === WYBÓR BAZY DANYCH ===
//const ACTIVE_DB = 'postgres'; 
const ACTIVE_DB = 'neo4j'; 
// =========================

let db;
if (ACTIVE_DB === 'postgres') {
    db = require('./services/postgresService');
} else if (ACTIVE_DB === 'neo4j') {
    db = require('./services/neo4jService');
}

const TMDB_API_KEY = '3bcc206589f8d410319c1037b109a0af';

async function fetchMovieDetails() {
  try {
    // 1. Skrypt prosi bazę (obojętnie którą) o listę filmów i linków
    const movies = await db.getAllMoviesWithLinks();
    console.log(`Znaleziono filmów gotowych do aktualizacji w bazie [${ACTIVE_DB}]: ${movies.length}`);

    for (const movie of movies) {
      try {
        // 2. Pobieramy dane z zewnętrznego API
        const response = await axios.get(
          `https://api.themoviedb.org/3/movie/${movie.tmdbId}?api_key=${TMDB_API_KEY}`
        );
        const movieDetails = response.data;

        // 3. Przygotowujemy czyste, sformatowane zmienne
        const releaseYear = movieDetails.release_date ? parseInt(movieDetails.release_date.split('-')[0]) : null;
        const posterPath = movieDetails.poster_path ? `https://image.tmdb.org/t/p/w500${movieDetails.poster_path}` : null;
        const genresList = movieDetails.genres ? movieDetails.genres.map(g => g.name) : [];

        // 4. Wysyłamy sformatowane dane z powrotem do bazy (obojętnie jakiej)
        await db.updateMovieDetails(movie.id, {
            poster_path: posterPath,
            overview: movieDetails.overview,
            release_year: releaseYear,
            genres: genresList
        });

        console.log(`Zaktualizowano (${ACTIVE_DB}): ${movie.title}`);
        
      } catch (err) {
        // Łapiemy ewentualny błąd z TMDB API (np. limit zapytań lub film nie istnieje)
        console.error(`Błąd API TMDB dla filmu ${movie.title}:`, err.message);
      }
    }

    console.log(`Zakończono pełną aktualizację bazy ${ACTIVE_DB}!`);
  } catch (error) {
    console.error('Błąd ogólny serwisu bazy:', error);
  }
}

fetchMovieDetails();