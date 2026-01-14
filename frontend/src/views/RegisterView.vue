<template>
  <div class="container mt-5 p-5">
   <div class="row justify-content-center">
      <div class="col-md-6 ">
        
       <form @submit.prevent="handleRegister">  
        <div class="form-box card ">
          <div class="card-header text-center">
            <h3>Signup</h3>
          </div>
          
          <div class="card-body">
            
              <div v-if="errorMessage" class="alert alert-danger">
                {{ errorMessage }}
              </div>
                      <!-- error sukces message catch-->
              <div v-if="sukcesMessage" class="alert alert-success" role="alert">
                A simple success alert—check it out!
                {{ sukcesMessage }}
              </div>
              <!-- ////////////////////////////////////////// -->

              <div class="mb-3">
                <label for="username" class="form-label">Username</label>
                <input 
                  type="text" 
                  class="form-control" 
                  id="username" 
                  v-model="username" 
                  placeholder="username"
                  required
                >
              </div>

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

              <!-- IF SUKCES PRZEJDZ DO HOME PAGE Z WIDOKIEM ZALOGOWANEGO -->

              <button type="submit" class="btn submit-btn w-100 mt-3">
                Create account
              </button>


         
          </div>
        </div>
       </form>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'RegisterView',
  data() {
    return {
      username: '',
      email: '',
      password: '',
      errorMessage: '',
      sukcesMessage: ''
    }
  },
  methods: {
    async handleRegister() {
      this.errorMessage = '';
      
      try {
        const response = await fetch('http://localhost:3000/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: this.username,
                email: this.email,
                password: this.password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            // Jeśli serwer zwrócił błąd (np. email zajęty)
            throw new Error(data.message || 'Błąd rejestracji');
        }

       alert("sukces")
        alert('Konto utworzone pomyślnie!');
        
        // Przekierowanie
        this.$router.push('/home');

      } catch (error) {
        console.error(error);
        this.errorMessage = error.message;


      }
      
    }
  }
}
</script>