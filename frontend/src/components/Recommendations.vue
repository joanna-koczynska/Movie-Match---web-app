<template>
  <div class="container mt-5 text-white">
    <h2 class="mb-4 border-bottom pb-2 border-secondary">
      <i class="bi bi-magic text-warning me-2"></i> Recommended for You
    </h2>

    <div v-if="loading" class="text-center mt-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-2 text-muted">Analyzing your taste...</p>
    </div>

    <div v-else-if="movies.length === 0" class="text-center mt-5 opacity-75">
      <i class="bi bi-star display-1"></i>
      <p class="fs-4 mt-3">We need more data!</p>
      <p>Rate some movies <strong>5 stars</strong> to get personalized recommendations.</p>
      <router-link to="/movies" class="btn btn-primary mt-2">
        Rate Movies
      </router-link>
    </div>

    <div v-else>
      <p class="text-muted mb-4">
        Based on your 5-star ratings, genres, and tags you enjoy.
      </p>
      
      <div class="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-5 row-cols-xl-6 g-3">
        <div class="col" v-for="movie in movies" :key="movie.id">
           <MovieCard 
              :id="movie.id"
              :title="movie.title" 
              :posterPath="movie.poster_path"
            />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import MovieCard from '../components/MovieCard.vue';

export default {
  name: 'Recommendations',
  components: { MovieCard },
  data() {
    return {
      movies: [],
      loading: true,
      currentUser: null
    }
  },
  methods: {
    checkUser() {
      const userStored = localStorage.getItem('user');
      if (userStored) {
        this.currentUser = JSON.parse(userStored);
      } else {
        this.$router.push('/login');
      }
    },

    async fetchRecommendations() {
      if (!this.currentUser) return;

      try {
        const response = await fetch(`http://localhost:3000/users/${this.currentUser.id}/recommendations`);
        if (response.ok) {
          this.movies = await response.json();
        }
      } catch (error) {
        console.error("Błąd sieci:", error);
      } finally {
        this.loading = false;
      }
    }
  },
  async mounted() {
    this.checkUser();
    if (this.currentUser) {
      await this.fetchRecommendations();
    }
  }
}
</script>