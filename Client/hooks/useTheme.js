import { useEffect, useState } from 'react'

const THEME_KEY = 'cloudcraft-theme'

function initialTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function useTheme() {
  const [theme, setTheme] = useState(initialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme

    const meta = document.querySelector('meta[name="theme-color"]')

    if (meta) {
      meta.setAttribute('content', theme === 'light' ? '#f5f7fb' : '#070b14')
    }

    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // Storage can be unavailable in private or restricted browsing modes.
    }
  }, [theme])

  return [theme, () => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))]
}
