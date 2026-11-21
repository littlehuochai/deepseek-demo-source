import { createRoot } from 'react-dom/client'
import { App } from './app/App.js'
import { setupTheme } from './app/theme.js'
import { ensureKatex } from './services/markdown/katex.js'
import './app/theme.css'
import './app/global.css'
import './app/mobile.css'
import { installImageLightbox } from './app/imageLightbox.js'

ensureKatex()
setupTheme()
installImageLightbox()

// PWA：缓存页面与静态资源，域名不稳定时也能离线打开
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('sw.js').catch(() => {})
  })
}

createRoot(document.getElementById('root') as HTMLElement).render(<App />)
