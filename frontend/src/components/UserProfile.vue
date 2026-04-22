<template>
  <div class="container mt-5 text-light">
    <div class="row justify-content-center">
      <div class="col-md-6">
        
        <div class="card bg-dark border-secondary shadow-lg">
          <div class="card-body text-center py-5">
            
            <div class="display-1 mb-3">👤</div>
            <h2 class="card-title text-white fw-bold">
              {{ user.username }}
            </h2>
            <p class="text-muted mb-4">{{ user.name || 'Brak imienia' }}</p>
            
            <div class="d-flex justify-content-center gap-5 mb-4">
              <div>
                <h3 class="mb-0 text-white">{{ followersCount }}</h3>
                <small class="text-muted">Followers</small>
              </div>
              <div>
                <h3 class="mb-0 text-white">{{ followingCount }}</h3>
                <small class="text-muted">Following</small>
              </div>
            </div>

            <div v-if="!isMyProfile && currentUser">
              <button 
                class="btn rounded-pill px-5 fw-bold" 
                :class="isFollowing ? 'btn-outline-light' : 'btn-primary'"
                @click="toggleFollow"
              >
                {{ isFollowing ? 'Unfollow' : 'Follow' }}
              </button>
            </div>
            <div v-else-if="!currentUser" class="text-muted small">
              Zaloguj się, aby obserwować.
            </div>
            
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'UserProfile',
  data() {
    return {
      user: { username: 'Wczytywanie...' },
      currentUser: null,
      isFollowing: false,
      followersCount: 0,
      followingCount: 0
    }
  },
  computed: {
    isMyProfile() {
      // Czy ten profil to my?
      if (!this.currentUser || !this.user.id) return false;
      return this.currentUser.id === this.user.id;
    }
  },
mounted() {
    // Odczyt z LocalStorage
    const userStored = localStorage.getItem('user');
    if (userStored) {
      const parsedData = JSON.parse(userStored);
      // Sprawdzamy, czy dane z backendu były zawinięte w obiekt 'user'
      this.currentUser = parsedData.user ? parsedData.user : parsedData;
    }
    this.fetchUserData();
  },
  methods: {
    async fetchUserData() {
      const targetUsername = this.$route.params.username;

      try {
        if (targetUsername) {
          // Oglądamy profil z linku
        
const response = await axios.get(`http://localhost:3000/users/${targetUsername}`);

console.log("👉 DANE Z BACKENDU (Inny profil):", response.data);

this.user = response.data;
this.followersCount = Number(response.data.followersCount) || 0;
this.followingCount = Number(response.data.followingCount) || 0;

          // Jeśli jesteśmy zalogowani, sprawdźmy czy już go obserwujemy
          if (this.currentUser && !this.isMyProfile) {
            const statusRes = await axios.get(`http://localhost:3000/users/follow-status?followerId=${this.currentUser.id}&followedId=${this.user.id}`);
            this.isFollowing = statusRes.data.isFollowing;
          }
       } else {
          // Oglądamy swój własny profil (/profile)
          if (this.currentUser && this.currentUser.username) { // Zabezpieczenie!
            const response = await axios.get(`http://localhost:3000/users/${this.currentUser.username}`);
            console.log("👉 DANE Z BACKENDU (Mój profil):", response.data);
            this.user = response.data;
           // Upewniamy się, że jeśli z backendu przyjdzie 0, to Vue nie podmieni tego na nic innego
this.followersCount = response.data.followersCount ?? 0;
this.followingCount = response.data.followingCount ?? 0;
          } else {
             console.error("Brak username w obiekcie currentUser:", this.currentUser);
          }
        }
      } catch (error) {
        console.error("Błąd pobierania profilu:", error);
      }
      
    },

    async toggleFollow() {
      try {
        const response = await axios.post(`http://localhost:3000/users/toggle-follow`, {
          followerId: this.currentUser.id,
          followedId: this.user.id
        });
        
        this.isFollowing = response.data.isFollowing;

        // Natychmiastowa aktualizacja licznika bez przeładowania strony!
        if (this.isFollowing) {
          this.followersCount++;
        } else {
          this.followersCount--;
        }
      } catch (error) {
        console.error("Błąd przy zmianie statusu obserwacji:", error);
      }
    }
  },
  watch: {
    '$route'() {
      this.fetchUserData();
    }
  }
}
</script>