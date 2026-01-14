// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import MoviesView from '@/views/MoviesView.vue'
import RegisterView from '@/views/RegisterView.vue'
import ToWatch from '@/views/ToWatch.vue'
import Watched from '@/views/Watched.vue'
import MoviePage from '@/components/MoviePage.vue'


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/home'
    },
    {
      path: '/home',
      name: 'home',
      component: HomeView
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/movies',
      name: 'movies',
      component: MoviesView
    },
      {
      path: '/toWach',
      name: 'toWatch',
      component: ToWatch
    },
     {
      path: '/watched',
      name: 'watched',
      component: Watched
    },
         {
     path: '/movie/:id', 
      name: 'movie',
      component: MoviePage,
      props: true
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterView
    },
   
  ]
})

export default router