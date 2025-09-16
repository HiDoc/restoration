import { createRouter, createWebHistory } from 'vue-router'
import SimulationView from './views/SimulationView.vue'
import SimulationChunkView from './views/SimulationChunkView.vue'

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
  {
    path: '/simulation-chunk',
    name: 'SimulationChunk',
    component: SimulationChunkView
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
