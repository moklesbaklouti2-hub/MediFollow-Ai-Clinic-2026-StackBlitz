import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import DoctorAppGate from './components/DoctorAppGate.tsx'
import { doctorAuthRequested } from './services/doctorAuthMode'

// By default, preserve the existing local application unchanged.
// A non-empty opt-in value MUST pass the doctor gate or fail closed.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {doctorAuthRequested ? <DoctorAppGate /> : <App />}
  </StrictMode>,
)
