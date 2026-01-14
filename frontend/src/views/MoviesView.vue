<template>
  <div class="container mt-4 mb-5">
    
    <div class="d-flex justify-content-between align-items-center mb-4 pb-2">
      <h2 class="ps-3 m-0">
        {{ selectedGenre ? selectedGenre : 'All Movies' }}
      </h2>

      <div class="dropdown">
        <button 
          class="btn btn-outline-primary dropdown-toggle" 
          type="button" 
          data-bs-toggle="dropdown" 
          aria-expanded="false"
          style="color: white;"
        >
          {{ selectedGenre ? selectedGenre : 'Filter by genres' }}
        </button>
        
        <ul class="dropdown-menu dropdown-menu-end" data-bs-theme="dark" style="max-height: 300px; overflow-y: auto;">
          <li><a class="dropdown-item fw-bold text-warning" href="#" @click.prevent="filterByGenre(null)">All Movies</a></li>
          <li><hr class="dropdown-divider"></li>

          <li><a class="dropdown-item" href="#" @click.prevent="filterByGenre('Action')">Action</a></li>
          <li><a class="dropdown-item" href="#" @click.prevent="filterByGenre('Adventure')">Adventure</a></li>
          <li><a class="dropdown-item" href="#" @click.prevent="filterByGenre('Animation')">Animation</a></li>
          <li><a class="dropdown-item" href="#" @click.prevent="filterByGenre('Children')">Children</a></li>
          <li><a class="dropdown-item" href="#" @click.prevent="filterByGenre('Comedy')">Comedy</a></li>
          <li><a class="dropdown-item" href="#" @click.prevent="filterByGenre('Crime')">Crime</a></li>
          <li><a class="dropdown-item" href="#" @click.prevent="filterByGenre('Documentary')">Documentary</a></li>
          <li><a class="dropdown-item" href="#" @click.prevent="filterByGenre('Drama')">Drama</a></li>
          <li><a class="dropdown-item" href="#" @click.prevent="filterByGenre('Fantasy')">Fantasy</a></li>
          <li><a class="dropdown-item" href="#" @click.prevent="filterByGenre('Film-Noir')">Film-Noir</a></li>
          <li><a class="dropdown-item" href="#" @click.prevent="filterByGenre('Horror')">Horror</a></li>
          <li><a class="dropdown-item" href="#" @click.prevent="filterByGenre('IMAX')">IMAX</a></li>
          <li><a class="dropdown-item" href="#" @click.prevent="filterByGenre('Musical')">Musical</a></li>
          <li><a class="dropdown-item" href="#" @click.prevent="filterByGenre('Mystery')">Mystery</a></li>
          <li><a class="dropdown-item" href="#" @click.prevent="filterByGenre('Romance')">Romance</a></li>
          <li><a class="dropdown-item" href="#" @click.prevent="filterByGenre('Sci-Fi')">Sci-Fi</a></li>
          <li><a class="dropdown-item" href="#" @click.prevent="filterByGenre('Thriller')">Thriller</a></li>
          <li><a class="dropdown-item" href="#" @click.prevent="filterByGenre('War')">War</a></li>
          <li><a class="dropdown-item" href="#" @click.prevent="filterByGenre('Western')">Western</a></li>
          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item" href="#" @click.prevent="filterByGenre('(no genres listed)')">no genres listed</a></li>
        </ul>
      </div>
    </div>

    <div v-if="loading" class="text-center my-5 py-5">
      <div class="spinner-border text-primary" style="width: 3rem; height: 3rem;" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>

    <div v-else>
      <div v-if="movies.length === 0" class="alert alert-info text-center">
        No movies found in category: <strong>{{ selectedGenre }}</strong>.
      </div>

      <div class="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-5 row-cols-xl-6 row-cols-xxl-7 g-3">
        <div class="col" v-for="movie in movies" :key="movie.id">
          <MovieCard 
          :id="movie.id"
            :title="movie.title" 
            :posterPath="movie.poster_path"
          />
        </div>
      </div>
<!-- WYGLĄD PRZYCISKÓW!!! -->
      <div v-if="movies.length > 0" class="d-flex justify-content-center align-items-center mt-5 gap-3">
        <button 
          class="btn btn-dark px-4" 
          @click="changePage(currentPage - 1)"
          :disabled="currentPage === 1"
        >
          <i class="bi bi-arrow-left"></i> Previous
        </button>
        
        <span class="fw-bold fs-5">Page {{ currentPage }} / {{ totalPages }}</span>

        <button 
          class="btn btn-dark px-4" 
          @click="changePage(currentPage + 1)"
          :disabled="currentPage >= totalPages"
        >
          Next <i class="bi bi-arrow-right"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import MovieCard from '../components/MovieCard.vue'

export default {
  name: 'MoviesView',
  components: { MovieCard },
  data() {
    return {
      movies: [],
      currentPage: 1,
      totalPages: 1,
      selectedGenre: null,
      loading: false
    }
  },
  methods: {
    async fetchMovies(page) {
      this.loading = true;
      try {
        const searchQuery = this.$route.query.search;

        let url = `http://localhost:3000/movies?page=${page}`;
        
 
        if (this.selectedGenre) {
          url += `&genre=${this.selectedGenre}`;
        }


        if (searchQuery) {
          url += `&search=${searchQuery}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        this.movies = data.movies;
        this.totalPages = data.totalPages;
        this.currentPage = data.currentPage;
        
        window.scrollTo({ top: 0, behavior: 'smooth' });

      } catch (error) {
        console.error("Błąd:", error);
      } finally {
        this.loading = false;
      }
    },


    filterByGenre(genre) {
      this.selectedGenre = genre; 

      this.changePage(1); 
    },

    changePage(newPage) {
      if (newPage >= 1 && newPage <= this.totalPages) {
        this.fetchMovies(newPage);
        this.currentPage = newPage; 
      }
    }
  },
  mounted() {
    this.fetchMovies(1);
  },

watch: {
    '$route.query': {
      handler(newQuery) {

        if (newQuery.search) {
          this.selectedGenre = null;
        }
        

        if (!newQuery.genre) {

        }

        this.fetchMovies(1);
      },
      immediate: true
    }
  }
}
</script>