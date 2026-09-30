import { createRouter, createWebHistory } from 'vue-router'
import SimulationView from './views/SimulationView.vue'

const routes = [
  {
    path: '/',
    name: 'Simulation',
    component: SimulationView
  },
  {
    path: '/sim',
    name: 'SimulationAlt',
    component: SimulationView
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
