import { Route, Routes } from 'react-router-dom'
import { SovereignShell } from '@/pages/SovereignShell'

export default function App() {
  return (
    <Routes>
      <Route path="/*" element={<SovereignShell />} />
    </Routes>
  )
}
