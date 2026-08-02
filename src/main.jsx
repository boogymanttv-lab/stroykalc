import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Скрий SEO landing shell само ако потребителят е логнат
const seoShell = document.getElementById('seo-shell')
if (seoShell) {
  try {
    const hasSession = Object.keys(localStorage).some(
      k => k.includes('supabase') && k.includes('auth-token')
    )
    if (hasSession) seoShell.style.display = 'none'
  } catch(e) {
    seoShell.style.display = 'none'
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
