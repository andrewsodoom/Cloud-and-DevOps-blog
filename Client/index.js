import { StrictMode, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

createRoot(document.getElementById('root')).render(
  createElement(StrictMode, null, createElement(App)),
)
