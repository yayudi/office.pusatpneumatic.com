// main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/main.css'
import FontAwesomeIcon from './plugins/fontawesome.js'
import { VueQueryPlugin } from '@tanstack/vue-query'

const app = createApp(App)

// Global Error Handler
app.config.errorHandler = (err, instance, info) => {
  console.error('Global Error:', err, info)
  // Ensure we don't catch intentional aborts or normal axios errors (axios interceptor handles those)
  if (err?.name === 'AxiosError') return
}

app.use(createPinia())
app.use(router)
app.use(VueQueryPlugin, {
  queryClientConfig: {
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false, // Don't refetch automatically on alt-tab
        retry: 2, // Auto retry 2 times if network fails
        staleTime: 5 * 60 * 1000 // Data is fresh for 5 mins by default
      }
    }
  }
})
app.component('font-awesome-icon', FontAwesomeIcon)
app.mount('#app')
