<template>
  <div class="container mt-5 text-light">
    <h2 class="mb-4">Search results for: <span class="text-primary">"{{ searchQuery }}"</span></h2>
    
    <div v-if="loading" class="text-center mt-5">
      <div class="spinner-border text-primary" role="status"></div>
    </div>
    
    <div v-else-if="users.length === 0" class="alert alert-dark border-secondary">
      No users found matching "{{ searchQuery }}".
    </div>
    
    <div v-else class="row">
      <div class="col-md-6 col-lg-4 mb-3" v-for="user in users" :key="user.id">
        <router-link :to="`/users/${user.username}`" class="text-decoration-none">
          <div class="card bg-dark border-secondary text-light h-100 table-hover" style="transition: transform 0.2s;">
            <div class="card-body d-flex align-items-center">
              <div class="display-6 me-3">👤</div>
              <div>
                <h5 class="card-title mb-1 text-white">{{ user.username }}</h5>
                <small class="text-muted">{{ user.name || 'User' }}</small>
              </div>
            </div>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'UsersSearch',
  data() {
    return {
      users: [],
      loading: false
    }
  },
  computed: {
    searchQuery() {
      return this.$route.query.search || '';
    }
  },
  mounted() {
    this.fetchUsers();
  },
  methods: {
    async fetchUsers() {
      if (!this.searchQuery) return;
      
      this.loading = true;
      try {
        const response = await axios.get(`http://localhost:3000/users/search?q=${this.searchQuery}`);
        
        // 1. Pobieramy Twoje dane z przeglądarki
        const userStored = localStorage.getItem('user');
        
        if (userStored) {
          const currentUser = JSON.parse(userStored);
          // 2. Filtrujemy wyniki: zostawiamy tylko tych, których ID jest INNE niż Twoje
          this.users = response.data.filter(user => user.id !== currentUser.id);
        } else {
          // Jeśli ktoś wyszukuje bez logowania, pokazujemy wszystkich
          this.users = response.data;
        }
        
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        this.loading = false;
      }
    }
  },
  watch: {
    // Odśwież wyniki, jeśli użytkownik wpisze nową frazę będąc już na tej stronie
    '$route.query.search'() {
      this.fetchUsers();
    }
  }
}
</script>

<style scoped>
.table-hover:hover {
  transform: translateY(-3px);
  background-color: #2b3035 !important;
}
</style>