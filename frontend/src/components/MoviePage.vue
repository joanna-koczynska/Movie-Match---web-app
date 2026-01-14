<template>
  <div v-if="loading" class="text-center mt-5">
    <div class="spinner-border text-primary" role="status"></div>
  </div>

  <div v-else-if="movie">
    
    <div 
      class="movie-global-background"
      :style="{ backgroundImage: `url(${fullPosterUrl})` }"
    ></div>

    <div class="container text-white position-relative py-4">
      
      <button class="btn btn-outline-light mb-4" @click="$router.go(-1)">
        <i class="bi bi-arrow-left"></i> Back
      </button>

      <div class="row align-items-center glass-panel p-4 rounded">
        
        <div class="col-md-4 mb-4 mb-md-0 text-center">
          <img 
            :src="fullPosterUrl" 
            class="img-fluid rounded shadow-lg poster-img" 
            :alt="movie.title"
          >
        </div>

        <div class="col-md-8">
          <h1 class="display-4 fw-bold mb-2">{{ cleanTitle }}</h1>
          
          <div class="fs-4 mb-3">
            <span class="badge bg-light text-dark me-2">{{ releaseYear }}</span>
            <span v-if="movie.duration" class="badge bg-secondary me-2">{{ movie.duration }} min</span>
          </div>

          <div class="mb-4">
            <span 
              v-for="genre in movie.Genres" 
              :key="genre.id" 
              class="badge border border-light me-2 px-3 py-2 bg-transparent"
            >
              {{ genre.name }}
            </span>
          </div>

          <h4 class="border-bottom pb-2 mb-3">Overview</h4>
          <p class="lead" style="line-height: 1.6;">
            {{ movie.overview || "There is no description for this video." }}
          </p>

          <div class="mb-4 mt-4" v-if="currentUser">
             <div class="d-flex align-items-center gap-3">
               <h5 class="text-white-50 m-0">Watched? Rate:</h5>
               
               <StarRating 
                  :initialRating="userRating" 
                  @rate-updated="handleRate" 
               />
               
                <div class="heart-container ms-auto">
                  <button class="btn heart-btn" @click="addToWatchList">
                     <i class="bi bi-heart-fill" 
                        :class="{ 'text-danger': isInWatchList, 'text-white': !isInWatchList }">
                     </i>
                   </button>
    
                  <span class="tooltip-text">
                    {{ isInWatchList ? 'Remove from list' : 'Add to watch list' }}
                  </span>
              </div>

             </div>
             <p class="text-muted small mt-1">
               *Rating automatically adds the movie to your Watched list.
             </p>
             <div v-if="ratingSaved" class="text-success fw-bold fade-in">
                <i class="bi bi-check-lg"></i> Saved!
             </div>

          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<script>
import StarRating from './StarRating.vue';

export default {
  components: { StarRating },
  name: 'MoviePage',
  props: ['id'], 
  data() {
    return {
      movie: null,
      loading: true,
      currentUser: null,
      ratingSaved: false,
      userRating: 0,
      isInWatchList: false
    }
  },
  computed: {
    fullPosterUrl() {
      if (!this.movie || !this.movie.poster_path) return 'https://via.placeholder.com/500x750';
      return `https://image.tmdb.org/t/p/original${this.movie.poster_path}`;
    },
    releaseYear() {
      if (!this.movie || !this.movie.title) return 'N/A';
      const match = this.movie.title.match(/\((\d{4})\)/);
      return match ? match[1] : 'N/A';
    },
    cleanTitle() {
        if (!this.movie || !this.movie.title) return '';
        return this.movie.title.replace(/\s*\(\d{4}\)/, '');
    }
  },
  methods: {
    checkUser() {
      const userStored = localStorage.getItem('user');
      if (userStored) {
        this.currentUser = JSON.parse(userStored);
      }
    },
    async handleRate(stars) {
      if (!this.currentUser) return;
      try {
        const response = await fetch('http://localhost:3000/rate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: this.currentUser.id,
            movieId: this.movie.id,
            rating: stars
          })
        });
        if (response.ok) {
          this.userRating = stars;
          this.ratingSaved = true;
          setTimeout(() => this.ratingSaved = false, 2000); 
        }
      } catch (e) { console.error(e); }
    },
    async fetchUserRating() {
      if (!this.currentUser) return;
      try {
         const res = await fetch(`http://localhost:3000/watched/${this.currentUser.id}/${this.id}`);
         if (res.ok) {
           const data = await res.json();
           if (data && data.rated) this.userRating = data.rating;
         }
      } catch (e) {}
    },



    async addToWatchList() {
      if (!this.currentUser) {
        alert("Zaloguj się, aby zarządzać listą!");
        this.$router.push('/login');
        return;
      }

      try {
        const response = await fetch('http://localhost:3000/towatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: this.currentUser.id,
            movieId: this.movie.id
          })
        });

        if (response.ok) {
          const data = await response.json();
          

          this.isInWatchList = data.added; 
          
         
        }
      } catch (e) {
        console.error(e);
      }
    },

   
    async checkWatchListStatus() {
       if (!this.currentUser) return;
       try {
         const res = await fetch(`http://localhost:3000/towatch/${this.currentUser.id}/${this.id}`);
         if (res.ok) {
           const data = await res.json();
           this.isInWatchList = data.inList;
         }
       } catch (e) { console.error(e); }
    }
  },
  async mounted() {
    this.checkUser();
    try {
      const response = await fetch(`http://localhost:3000/movies/${this.id}`);
      if (!response.ok) throw new Error("Błąd");
      this.movie = await response.json();
    } catch (error) { console.error(error); } 
    finally { this.loading = false; }
    await this.fetchUserRating();
    await this.checkWatchListStatus();
  }
}
</script>

<style scoped>
.fade-in { animation: fadeIn 0.5s; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.movie-global-background {
  position: fixed; 
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  
  z-index: -1; 
  
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  
  
  filter: blur(15px) brightness(0.4);
  transform: scale(1.1);
}

/* --- PANEL --- */
.glass-panel {
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  animation: slideUp 0.6s ease-out;
}

@keyframes slideUp {
  from { transform: translateY(50px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.poster-img {
  max-height: 30rem;
  border: 1px solid rgba(255,255,255,0.2);
}
::-webkit-scrollbar {
    display: none;
}




.heart-container {
  position: relative;
  display: inline-block;
}


.heart-btn {
  color: #ffffff; 
  font-size: 3rem; 
  padding: 0;
  border: none;
  transition: transform 0.2s, color 0.2s;
}

.heart-btn:hover {
  transform: scale(1.15); 
  color: #ff0000; 
}

.tooltip-text {
  visibility: hidden;
  width: 140px;
  background-color: #333; 
  color: #fff;
  text-align: center;
  border-radius: 6px;
  padding: 5px 0;
  

  position: absolute;
  z-index: 1;
  bottom: 110%; 
  left: 50%;
  margin-left: -70px; 
  

  opacity: 0;
  transition: opacity 0.3s;
  font-size: 0.85rem;
  pointer-events: none; 
}


.tooltip-text::after {
  content: "";
  position: absolute;
  top: 100%; 
  left: 50%;
  margin-left: -5px;
  border-width: 5px;
  border-style: solid;
  border-color: #333 transparent transparent transparent;
}


.heart-container:hover .tooltip-text {
  visibility: visible;
  opacity: 1;
}

</style>

