import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { initTheme } from './utils/theme'

const app = createApp(App)
app.use(router)
// Initialize theme (system, eco, or air)
initTheme()
app.mount('#app')
