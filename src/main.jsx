import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Скрий SEO landing shell щом React се зареди
const seoShell = document.getElementById('seo-shell')
if (seoShell) seoShell.style.display = 'none'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
