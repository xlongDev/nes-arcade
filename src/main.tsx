import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'
import './styles/index.css'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('#root not found')

createRoot(rootEl).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)

// React 接管后移除首屏骨架
requestAnimationFrame(() => {
  const boot = document.getElementById('boot')
  if (!boot) return
  boot.style.transition = 'opacity .45s var(--ease-glass)'
  boot.style.opacity = '0'
  setTimeout(() => boot.remove(), 500)
})
