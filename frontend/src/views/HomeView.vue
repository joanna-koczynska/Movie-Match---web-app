<template>

<div v-if="!currentUser" class="hero-section d-flex align-items-center justify-content-center text-center text-white position-relative overflow-hidden">
      <div class="background-overlay position-absolute top-0 start-0 w-100 h-100"></div>
      <div class="content position-relative z-index-1 p-4">
        <h1 class="display-3 fw-bold mb-3">Welcome to Movie Match</h1>
        <p class="lead mb-4">Discover, rate, and track your favorite movies.</p>
        <button @click="$router.push('/movies')" class="btn-primary btn-lg px-5 py-3 rounded-pill ">
          Browse Movies <i class="bi bi-arrow-right-circle ms-2"></i>
        </button>
      </div>
    </div>


  <div class="container-fluid mt-5 mb-5">
      
      <div class="TopMovies row justify-content-center">

        <div class="m-0 d-flex align-items-center  section-header px-3 text-center">
            <h3 class=" m-4  fw-bold text-white">Top 10 Rated Movies</h3>
          </div>
        
        <div class="col-12 col-md-10 col-xl-9 mb-5">
          
          

          <div v-if="loadingTop" class="text-center my-5">
            <div class="spinner-border text-primary" role="status"></div>
          </div>

          <div v-else class="carousel-wrapper">
            <swiper
              :modules="modules"
              :slides-per-view="1"
              :space-between="30"
              :centered-slides="true" 
              :loop="true"
              :navigation="true"
              :autoplay="{ delay: 3000, disableOnInteraction: false, pauseOnMouseEnter: true }"
              :breakpoints="{
                '576': { slidesPerView: 2, spaceBetween: 20 }, 
                '992': { slidesPerView: 3, spaceBetween: 40 }, 
              }"
              class="mySwiper movie-3d-carousel"
            >
              <swiper-slide v-for="movie in topMovies" :key="movie.id" >
                <MovieCard 
                  :id="movie.id"
                  :title="movie.title" 
                  :posterPath="movie.poster_path"
                />
              </swiper-slide>
            </swiper>
          </div>

        </div>
      </div>

<div v-if="currentUser" class="row justify-content-center mt-5 mb-2" >
            <hr class="border-secondary opacity-25" />
       <div  class="d-flex align-items-center mt-2 section-header px-3">
              <div>
                <h3 class="fw-bold m-0 text-white">Recommended for You</h3>
              </div>
              
        </div>

          <div v-if="loadingRecs" class="text-center my-5">
            <div class="spinner-border text-primary" role="status"></div>
          </div>

            

      <div v-else-if="recommendations.length > 0" class="simple-carousel-wrapper">
              <swiper
                :modules="modules"
                :navigation="true"
                :space-between="2"
                :slides-per-view="1"
                :breakpoints="{
                  '576': { slidesPerView: 2, spaceBetween: 20 },
                  '768': { slidesPerView: 3, spaceBetween: 20 },
                  '1200': { slidesPerView: 5, spaceBetween: 20 }, 
                }"
                class="mySwiper simple-swiper"
              >
                <swiper-slide v-for="movie in recommendations" :key="'rec-' + movie.id">
                  <MovieCard 
                    :id="movie.id"
                    :title="movie.title" 
                    :posterPath="movie.poster_path"
                    
                  />
                </swiper-slide>
              </swiper>
            </div>

             <div v-else class="text-center mt-4">
                <div class="alert alert-dark border-0 shadow-lg d-inline-block px-5">
                  <i class="bi bi-info-circle me-2"></i>Rate movies 5 stars to get recommendations!
                </div>
            </div>


</div>


    <div class="row justify-content-center mt-5 mb-2" >
      <hr class="border-secondary opacity-25" />
          <div class="d-flex align-items-center mt-2 section-header px-3">
              <div class="text-white">
                <h3 class="fw-bold m-0">
                 Best Genre:
                  <span style="color: #a855f7;">{{ bestGenreName }}</span>
                </h3>
              </div>
            </div>

              <div v-if="loadingGenre" class="text-center my-5">
                <div class="spinner-border text-warning" role="status"></div>
              </div>

             <div class="simple-carousel-wrapper">
              <swiper
                :modules="modules"
                :navigation="true"
                :space-between="20"
                :slides-per-view="1"
                :breakpoints="{
                  '576': { slidesPerView: 2, spaceBetween: 20 },
                  '768': { slidesPerView: 3, spaceBetween: 20 },
                  '1200': { slidesPerView: 5, spaceBetween: 20 }, 
                }"
                class="mySwiper simple-swiper"
              >
                <swiper-slide v-for="movie in bestGenreMovies" :key="'genre-' + movie.id">
                  <MovieCard 
                    :id="movie.id"
                    :title="movie.title" 
                    :posterPath="movie.poster_path"
                  />
                </swiper-slide>
              </swiper>
            </div>

</div>

  </div>
</template>

<script>

import { Swiper, SwiperSlide } from 'swiper/vue';
import { Navigation, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';

import MovieCard from '../components/MovieCard.vue';

export default {
  name: 'HomeView',
  components: {
    Swiper,
    SwiperSlide,
    MovieCard
  },
  setup() {
    return {
      modules: [Navigation, Autoplay],
    };
  },
  data() {
    return {
      topMovies: [],
      recommendations: [],
      loadingTop: true,
      loadingRecs: false,
      currentUser: null,
bestGenreMovies: [],
      bestGenreName: '',
      bestGenreAvg: 0,
      loadingGenre: true,
    }
  },
  methods: {
    checkUser() {
      const userStored = localStorage.getItem('user');
      if (userStored) {
        this.currentUser = JSON.parse(userStored);
      }
    },

    async fetchTopMovies() {
      this.loadingTop = true;
      try {
        // Zmieniony URL na nowy endpoint
        const response = await fetch('http://localhost:3000/api/weekly-top');
        
        if (response.ok) {
          // Serwer zwraca gotową tablicę, przypisujemy ją wprost
          this.topMovies = await response.json();
        }
      } catch (error) {
        console.error("Błąd pobierania Top 10:", error);
      } finally {
        this.loadingTop = false;
      }
    },

    async fetchRecommendations() {
      if (!this.currentUser) return;
      this.loadingRecs = true;
      try {
        const response = await fetch(`http://localhost:3000/users/${this.currentUser.id}/recommendations`);
        if (response.ok) {
          this.recommendations = await response.json();
        }
      } catch (error) {
        console.error("Błąd rekomendacji:", error);
      } finally {
        this.loadingRecs = false;
      }
    },


async fetchBestGenre() {
      this.loadingGenre = true;
      try {
        // Zmieniony URL na nowy endpoint
        const response = await fetch('http://localhost:3000/api/weekly-genre');
        
        if (response.ok) {
          const data = await response.json();
          // Przypisujemy dane zgodnie ze strukturą z app.js (nazwa, filmy)
          this.bestGenreName = data.nazwa;
          this.bestGenreMovies = data.filmy;
        }
      } catch (error) {
        console.error("Błąd pobierania gatunku:", error);
      } finally {
        this.loadingGenre = false;
      }
    },


  },
  async mounted() {
    this.checkUser();
    this.fetchTopMovies();
    this.fetchBestGenre(); 
    this.fetchRecommendations();
  }
}
</script>

<style>

.TopMovies{
/* background: linear-gradient(90deg,#000000 0%, #7226ff 50%, #000000 100%); */
/* style="background: linear-gradient(0deg,rgba(0, 0, 0, 1) 0%, rgba(114, 38, 255, 1) 50%, rgba(0, 0, 0, 1) 100%);" */

background: linear-gradient(180deg,rgba(114, 38, 255, 0) 0%, rgba(114, 38, 255, 1) 47%, rgba(0, 0, 0, 0) 98%);

 width: 100vw; 
 margin-left: -2.5rem !important;
 /* box-shadow: 0 5px 5rem 0.5rem rgba(114, 38, 255, 1); */
 margin-bottom: 0;
}

.carousel-wrapper {
  overflow: visible;
 /* background-color: #6832ce;
 border-radius: 10px;
 border-color: #6832ce; */
}

/* 2. SLAJDY */
.movie-3d-carousel .swiper-slide {
  width: 100%;
  height:max-content;

  display: flex;
  justify-content: center;
  align-items: center;
  
  transform: scale(0.7);
  transition: all 0.4s ease;
       box-shadow: 1px 3px 20px 15px #ffd000;

}

/* 3. KARTA WEWNĄTRZ */
.movie-3d-carousel :deep(.movie-card) {
  width: 100%;
}

/* 4. AKTYWNY SLAJD */
.movie-3d-carousel .swiper-slide-active {
  transform: scale(0.9); /* Lekkie powiększenie */
  z-index: 10;


}





/* Rozsuwamy strzałki szerzej niż karty */
.movie-3d-carousel .swiper-button-prev { left: -60px; }
.movie-3d-carousel .swiper-button-next { right: -60px; }


.simple-swiper .swiper-slide {
  
  transform: scale(0.8);

  display: flex;
  justify-content: center;
}

.swiper-button-prev,
.swiper-button-next {
  color: #ffffff !important;
  background: rgb(49, 49, 49);
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  font-weight: bold;
padding: 10px;
}

/* Rozsunięcie strzałek na boki */
.swiper-button-prev { left: -60px; }
.swiper-button-next { right: -60px; }

</style>

<style scoped>
.hero-section {
  height: 60vh;
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
}
</style>