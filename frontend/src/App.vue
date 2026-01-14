<script setup>
import NavBar from './components/NavBar.vue'
</script>

<template>
  <NavBar />

 <div class="container-fluid px-4 mt-3 w-100">
    <router-view />
  </div>
</template>

