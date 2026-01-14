<template>
  <div class="star-rating">
    <i 
      v-for="star in 5" 
      :key="star"
      class="bi fs-4 cursor-pointer transition"
      :class="getStarClass(star)"
      @mouseover="hoverRating = star"
      @mouseleave="hoverRating = 0"
      @click="setRating(star)"
    ></i>
    
    <span v-if="loading" class="ms-2 spinner-border spinner-border-sm text-warning"></span>
  </div>
</template>

<script>
export default {
  name: 'StarRating',
  props: {
    initialRating: { type: Number, default: 0 },
    readOnly: { type: Boolean, default: false }  
  },
  data() {
    return {
      currentRating: this.initialRating,
      hoverRating: 0,
      loading: false
    }
  },
  watch: {
    initialRating(newVal) {
      this.currentRating = newVal;
    }
  },
  methods: {
    getStarClass(star) {
   
      if (this.readOnly) {
        return star <= this.currentRating ? 'bi-star-fill text-warning' : 'bi-star text-secondary';
      }

      const valueToCheck = this.hoverRating || this.currentRating;
      
      if (star <= valueToCheck) {
        return 'bi-star-fill text-warning'; 
      } else {
        return 'bi-star text-secondary';
      }
    },
    setRating(star) {
      if (this.readOnly || this.loading) return;
      
      this.currentRating = star;
      this.$emit('rate-updated', star); 
    }
  }
}
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
.transition {
  transition: color 0.2s, transform 0.1s;
}
.bi-star-fill:active {
  transform: scale(1.3); 
}
</style>