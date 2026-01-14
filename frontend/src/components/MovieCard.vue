<template>
  <div 
    class="card text-white border-0 shadow-sm overflow-hidden movie-card"
    @click="goToDetails"
  >
    <img 
      :src="fullPosterUrl" 
      class="card-img h-100" 
      :alt="title"
      style="object-fit: cover;"
    >
    
    <div class="card-img-overlay d-flex flex-column justify-content-end p-0">
      <div class="overlay-content p-3 text-center">
        <div class="card-title fw-bold text-white mb-0 text-truncate">
          {{ title }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MovieCard',
  props: {
    id: {
      type: [Number, String],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    posterPath: {
      type: String,
      default: null 
    }
  },
  computed: {
    fullPosterUrl() {
      if (!this.posterPath) return 'https://via.placeholder.com/500x750?text=No+Image';
      return `https://image.tmdb.org/t/p/w500${this.posterPath}`;
    }
  },
  methods: {
    goToDetails() {
      this.$router.push({ name: 'movie', params: { id: this.id } });
    }
  }
}
</script>

<style scoped>
.movie-card {
  cursor: pointer;
  position: relative;
  background-color: #000; 
      font-size: 1.5rem
}

.movie-card img {
  transition: transform 0.4s ease, opacity 0.4s ease;
}

.card-img-overlay {
  background: linear-gradient(to top, rgba(0, 0, 0, 0.74) 0%, rgba(0, 0, 0, 0.336) 50%, transparent 100%);
  opacity: 0;
  transition: opacity 0.3s ease-in-out;

}


.movie-card:hover .card-img-overlay {
  opacity: 1; 
    font-size: 1.5rem
}

.movie-card:hover img {
  transform: scale(1.05);
  opacity: 0.8; 
}
</style>