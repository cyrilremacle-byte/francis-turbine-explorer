import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(<App />)

// Exposed for automated validation only.
import { live } from './state/live'
import { useStore } from './state/store'
;(window as any).__francis = { live, store: useStore }
