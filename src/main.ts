import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import { initTheme } from './utils/theme'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
// Initialize theme (system, eco, or air)
initTheme()
app.mount('#app')
