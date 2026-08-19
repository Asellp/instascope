import { ref, onMounted } from 'vue'

export function useTheme(defaultTheme: 'dark' | 'light' = 'dark') {
  const isDark = ref(defaultTheme === 'dark')

  function applyTheme(theme: 'dark' | 'light') {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }

  function toggleTheme() {
    isDark.value = !isDark.value
    applyTheme(isDark.value ? 'dark' : 'light')
  }

  onMounted(() => {
    const saved = (localStorage.getItem('theme') as 'dark' | 'light' | null) || defaultTheme
    isDark.value = saved === 'dark'
    applyTheme(saved)
  })

  return { isDark, toggleTheme }
}