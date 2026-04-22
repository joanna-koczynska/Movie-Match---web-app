<template>
  <nav class="navbar border-body  navbar-expand-lg bg-body-tertiary " data-bs-theme="dark">
    <div class="container-fluid ms-2 position-relative">
      <router-link class="navbar-brand" to="/">MOVIE MATCH</router-link>

      <div class="collapse navbar-collapse" id="navbarSupportedContent">
        
        <ul class="navbar-nav ms-auto d-flex justify-content-around">
          <li class="nav-item pe-3">
            <router-link class="nav-link" to="/home">HOME</router-link>
          </li>
          <li class="nav-item pe-3">
            <router-link class="nav-link" to="/movies">MOVIES</router-link>
          </li>
          
          <li class="nav-item pe-3" v-if="currentUser">
            <router-link class="nav-link" to="/watched">WATCHED</router-link>
          </li>

         <li class="nav-item pe-3" v-if="currentUser">
            <router-link class="nav-link" to="/toWach">TO WATCH</router-link>
          </li>

        </ul>
        
      
      <div class=" ms-4 d-flex align-items-center" >


          <form class="search-box mx-3 d-flex justify-content-around" @submit.prevent="handleSearch">
             <div class="me-2 d-flex bg-dark rounded px-2 py-1 border border-secondary">
            <span 
              class="me-2 user-select-none" 
              :class="searchMode === 'movie' ? 'opacity-100 fs-5' : 'opacity-50'" 
              style="cursor: pointer; transition: all 0.2s;"
              @click="searchMode = 'movie'"
              title="Search movies"
            >🎬</span>
            <span 
              class="user-select-none"
              :class="searchMode === 'user' ? 'opacity-100 fs-5' : 'opacity-50'" 
              style="cursor: pointer; transition: all 0.2s;"
              @click="searchMode = 'user'"
              title="Search users"
            >👤</span>
            </div>
            <input class="search-input form-control me-2" type="search" :placeholder="placeholderText" aria-label="Search"
            v-model="searchQuery">

            
            <button class="btn" type="submit"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-search" viewBox="0 0 16 16">
  <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/>
</svg></button>
          </form>
        </div>



        <div class="d-flex align-items-center ms-3">
     
          <div class="d-flex dropdown w-50 align-items-end justify-content-end me-5" v-if="currentUser">
            <a class="nav-link dropdown-toggle  " href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
              {{ currentUser.username }}
            </a>
            <ul class="dropdown-menu ">
               <li><router-link class="dropdown-item" to="/profile">Profile</router-link></li>
             
              <li><hr class="dropdown-divider"></li>
              <li><a class="dropdown-item text-danger" href="#" @click.prevent="logout">Logout</a></li>
            </ul>
          </div>

          <router-link 
            v-if="!currentUser" 
            class="btn  ms-3 d-flex" 
            style="border-radius: 1rem; border-color: white;"
            to="/login"
          >
            Login
          </router-link>

           <router-link 
            v-if="!currentUser" 
            class="btn btn-primary ms-3 d-flex" 
            to="/register"
          >
            Signup
          </router-link>
        </div>

      </div>
    </div>
  </nav>
</template>

<script>
export default {
  name: 'NavBar',
  data() {
    return {
      currentUser: null, 
      searchQuery: '' ,
      searchMode: 'movie'  
    }
  },
  computed: {
    // Dynamically change placeholder based on selected mode
    placeholderText() {
      return this.searchMode === 'movie' ? 'Search movies...' : 'Search users...';
    }
  },
  mounted() {
    this.checkUser();
  },
  methods: {
   handleSearch() {
      if (this.searchQuery.trim() !== '') {
        // Route to different views based on active mode
        if (this.searchMode === 'movie') {
          this.$router.push({ path: '/movies', query: { search: this.searchQuery } });
        } else {
          this.$router.push({ path: '/users', query: { search: this.searchQuery } });
        }
        
        this.searchQuery = ''; // Clear input after search
      }
    },

    checkUser() {
      const userStored = localStorage.getItem('user');
      if (userStored) {
        this.currentUser = JSON.parse(userStored);
      } else {
        this.currentUser = null;
      }
    },

    logout() {
      localStorage.removeItem('user'); 
      this.currentUser = null;       
      this.$router.push('/login');  
    }
  },
  mounted() {

    this.checkUser();
  },
  watch: {
    $route() {
      this.checkUser();
    }
  }
}
</script>


<style scoped>

.navbar-nav .nav-link.router-link-exact-active {
  color: #ffffff !important;    
  
  border-bottom: 1px solid #ffffff ;       
  padding-bottom: 4px;             
}
</style>