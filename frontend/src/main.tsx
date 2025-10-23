import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Button } from './components/ui/button'
import "./index.css"
import NodeEditor from './pages/NodeEditor'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NodeEditor/>
  </StrictMode>,
)
