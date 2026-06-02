import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { LocaleProvider } from './context/LocaleContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { detectBrowserLocale } from './i18n/translations.js'
import { initTheme } from './theme/theme.js'
import './index.css'

initTheme()
document.documentElement.lang = detectBrowserLocale()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <LocaleProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </LocaleProvider>
    </BrowserRouter>
  </StrictMode>,
)
