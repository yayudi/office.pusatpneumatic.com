// src/composables/useTheme.js
import { ref } from 'vue'

const currentTheme = ref(localStorage.getItem('theme') || 'terang')

const themes = [
  'terang',
  'gelap',
  'sepia',
  'gurun',
  'darah',
  'hutan',
  'lautan',
  'pantai',
  'sunset',
  'permen',
  'retro',
]

export function useTheme() {
  const applyTheme = (themeName) => {
    currentTheme.value = themeName
    document.documentElement.setAttribute('data-theme', themeName)
    localStorage.setItem('theme', themeName)
  }

  const initTheme = () => {
    applyTheme(currentTheme.value)
  }

  return {
    themes,
    currentTheme,
    applyTheme,
    initTheme,
  }
}
