<template>
  <div class="container mt-5 p-5">
    <div class="row justify-content-center">
      <div class="col-md-6">
        
       <form @submit.prevent="handleLogin">
        <div class="form-box card ">
          <div class="card-header text-center">
            <h3>Login</h3>
          </div>
          
          <div class="card-body">
            <div v-if="errorMessage" class="alert alert-danger">{{ errorMessage }}</div>
           
              <div class="mb-3">
                <label for="email" class="form-label">Email</label>
                <input 
                  type="email" 
                  class="form-control" 
                  id="email" 
                  v-model="email" 
                  placeholder="name@example.com"
                  required
                >
              </div>

              <div class="mb-3">
                <label for="password" class="form-label">Password</label>
                <input 
                  type="password" 
                  class="form-control" 
                  id="password" 
                  v-model="password" 
                  placeholder="******"
                  required
                >
              </div>

              <button type="submit" class="btn submit-btn w-100 mt-3">
                Continue
              </button>
            
          </div>
          
          <div class="card-footer text-muted text-center">
            <small>You don't have an account? <a href="register" class="text-gold">Sign up</a></small>
          </div>
        </div>
      </form>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LoginView',
  data() {
    return {
      email: '',
      password: '',
      errorMessage: ''
    }
  },
  methods: {
    async handleLogin() {
      this.errorMessage = '';
      
      try {
        const response = await fetch('http://localhost:3000/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: this.email, 
            password: this.password 
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Login failed');
        }

        // Save user to localStorage
        localStorage.setItem('user', JSON.stringify(data.user));

        // Redirect to Home
        this.$router.push('/'); 
        
      } catch (error) {
        this.errorMessage = error.message;
      }
    }
  }
}
</script>

