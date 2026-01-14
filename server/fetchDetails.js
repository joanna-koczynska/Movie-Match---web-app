const axios = require('axios');
const { sequelize, Movie, Link, Genre } = require('./models/models');

const TMDB_API_KEY = '3bcc206589f8d410319c1037b109a0af';

async function fetchMovieDetails() {
  try {
    const movies = await Movie.findAll();
    console.log('Znaleziono filmów:', movies.length);


    for (const movie of movies) {
      try {
      
        const tmdbLink = await Link.findOne({ where: { movieId: movie.id } });

        if (tmdbLink && tmdbLink.tmdbId) {

          const response = await axios.get(
            `https://api.themoviedb.org/3/movie/${tmdbLink.tmdbId}?api_key=${TMDB_API_KEY}`
          );
          const movieDetails = response.data;

 
          const releaseYear = movieDetails.release_date ? parseInt(movieDetails.release_date.split('-')[0]) : null;

    
          await movie.update({
            poster_path: `https://image.tmdb.org/t/p/w500${movieDetails.poster_path}`,
            overview: movieDetails.overview,
            release_year: releaseYear
          });


          if (movieDetails.genres) {
            for (const genreData of movieDetails.genres) {
              const [genre] = await Genre.findOrCreate({
                where: { name: genreData.name }, 
                defaults: {
                  name: genreData.name
   
                }
              });
              

              await movie.addGenre(genre);
            }
          }

          console.log(`Zaktualizowano: ${movie.title}`);
        }
      } catch (err) {

        console.error(`Błąd dla filmu ${movie.title}:`, err.message);
      }
    }

    console.log('Zakończono aktualizację wszystkich filmów.');
  } catch (error) {
    console.error('Błąd ogólny:', error);
  }
}

fetchMovieDetails();