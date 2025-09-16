import { createRouter, createWebHistory } from 'vue-router'
import EcoSimGameView from './views/EcoSimGameView.vue'
import SimulationView from './views/SimulationView.vue'
import SimulationChunkView from './views/SimulationChunkView.vue'

const routes = [
  {
    path: '/',
    name: 'EcoSimGame',
    component: EcoSimGameView
  },
  {
    path: '/sim',
    name: 'Simulation',
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
