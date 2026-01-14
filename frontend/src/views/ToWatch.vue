<template>
  <div class="container mt-5 text-white">
    <h2 class="mb-4 border-bottom pb-2 border-secondary">
      Your Watch List
    </h2>

    <div v-if="loading" class="text-center mt-5">
      <div class="spinner-border text-primary" role="status"></div>
    </div>

    <div v-else-if="toWatchList.length === 0" class="text-center mt-5 opacity-75">
      <i class="bi bi-bookmark-plus display-1"></i>
      <p class="fs-4 mt-3">Your watch list is empty.</p>
      <router-link to="/movies" class="btn btn-outline-warning mt-2">
        Browse Movies
      </router-link>
    </div>

    <div v-else class="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-5 row-cols-xl-6 g-3">
      
      <div 
        class="col" 
        v-for="entry in toWatchList" 
        :key="entry.id"
      >
        <div class="position-relative h-100">

            <button 
        class="btn btn-danger btn-sm position-absolute top-0 end-0 m-2 shadow" 
        style="z-index: 10;"
        @click.prevent="removeFromToWatch(entry.Movie.id)"
        title="Remove from list"
    >
        <i class="bi bi-trash-fill"></i>
    </button>
            
            <MovieCard 
              v-if="entry.Movie"
              :id="entry.Movie.id"
              :title="entry.Movie.title" 
              :posterPath="entry.Movie.poster_path"
            />
            
        </div>
      </div>

    </div>
  </div>
</template>

<script>
import MovieCard from '../components/MovieCard.vue';

export default {
  name: 'ToWatch',
  components: { MovieCard },
  data() {
    return {
      toWatchList: [],
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
        // Jeśli niezalogowany, przekieruj do logowania
        this.$router.push('/login');
      }
    },

    async fetchToWatchMovies() {
      if (!this.currentUser) return;

      try {
        // Zmieniony endpoint na /towatch
        const response = await fetch(`http://localhost:3000/users/${this.currentUser.id}/towatch`);
        
        if (response.ok) {
          this.toWatchList = await response.json();
        } else {
          console.error("Błąd pobierania listy ToWatch");
        }
      } catch (error) {
        console.error("Błąd sieci:", error);
      } finally {
        this.loading = false;
      }
    },

    async removeFromToWatch(movieId) {
      if (!confirm("Are you sure you want to remove this movie?")) return;

      try {
        const response = await fetch(`http://localhost:3000/towatch/${this.currentUser.id}/${movieId}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          // Usuwamy film z lokalnej tablicy, żeby zniknął bez odświeżania strony
          this.toWatchList = this.toWatchList.filter(entry => entry.Movie.id !== movieId);
        } else {
          alert("Błąd podczas usuwania.");
        }
      } catch (error) {
        console.error("Błąd sieci:", error);
      }
    }
  },
  
  
  async mounted() {
    this.checkUser();
    if (this.currentUser) {
      await this.fetchToWatchMovies();
    }
  }
}
</script>

<style scoped>
/* Style analogiczne do Watched */
</style>