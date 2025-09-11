import { createRouter, createWebHistory } from 'vue-router'
import EcoSimGameView from './views/EcoSimGameView.vue'
import GameView from './views/GameView.vue'
import SpriteShowcase from './views/SpriteShowcase.vue'
import MapGeneratorView from './views/MapGeneratorView.vue'
import SelectMapView from './views/SelectMapView.vue'
import SimulationView from './views/SimulationView.vue'
import SimulationChunkView from './views/SimulationChunkView.vue'

const routes = [
  {
    path: '/',
    name: 'EcoSimGame',
    component: EcoSimGameView
  },
  {
    path: '/old-game',
    name: 'Game',
    component: GameView
  },
  {
    path: '/sprites',
    name: 'Sprites',
    component: SpriteShowcase
  },
  {
    path: '/map-generator',
    name: 'MapGenerator',
    component: MapGeneratorView
  },
  {
    path: '/select-map',
    name: 'SelectMap',
    component: SelectMapView
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
