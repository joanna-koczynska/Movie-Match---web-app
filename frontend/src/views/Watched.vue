<template>
  <div class="container mt-5 text-white">
    <h2 class="mb-4 border-bottom pb-2 border-secondary">
      Your Watched History
    </h2>

    <div v-if="loading" class="text-center mt-5">
      <div class="spinner-border text-primary" role="status"></div>
    </div>

    <div v-else-if="watchedList.length === 0" class="text-center mt-5 opacity-75">
      <i class="bi bi-film display-1"></i>
      <p class="fs-4 mt-3">You haven't watched any movies yet.</p>
      <router-link to="/movies" class="btn btn-outline-warning mt-2">
        Browse Movies
      </router-link>
    </div>

    <div v-else class="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-5 row-cols-xl-6 g-3">
      
      <div 
        class="col" 
        v-for="entry in watchedList" 
        :key="entry.id"
      >
        <div class="position-relative h-100">

           <div class="position-absolute top-0 " style="z-index: 10;">
                <span class="badge bg-warning text-dark fs-6 shadow">
                    <i class="bi bi-star-fill me-1"></i> {{ entry.rating }}
                </span>
            </div>

            <button 
              class="btn btn-danger btn-sm position-absolute top-0 end-0 m-2 shadow" 
              style="z-index: 10;"
              @click.prevent="removeFromWatched(entry.Movie.id)"
              title="Remove from history"
    >
              <i class="bi bi-trash-fill"></i>
           </button>


           
          
            <MovieCard 
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
// 1. Importujemy komponent
import MovieCard from '../components/MovieCard.vue';

export default {
  name: 'Watched',
  components: { MovieCard }, // 2. Rejestrujemy go
  data() {
    return {
      watchedList: [],
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

    async fetchWatchedMovies() {
      if (!this.currentUser) return;

      try {
        const response = await fetch(`http://localhost:3000/users/${this.currentUser.id}/watched`);
        if (response.ok) {
          this.watchedList = await response.json();
        } else {
          console.error("Błąd pobierania listy");
        }
      } catch (error) {
        console.error("Błąd sieci:", error);
      } finally {
        this.loading = false;
      }
    },

async removeFromWatched(movieId) {
      if (!confirm("Remove from watched history? This will delete your rating.")) return;

      try {
        const response = await fetch(`http://localhost:3000/watched/${this.currentUser.id}/${movieId}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          // Aktualizujemy listę lokalnie
          this.watchedList = this.watchedList.filter(entry => entry.Movie.id !== movieId);
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
      await this.fetchWatchedMovies();
    }
  }
}
</script>

<style scoped>
/* MovieCard ma swoje style, tu ewentualnie tylko dopieszczamy grid */
</style>