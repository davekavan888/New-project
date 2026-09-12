import { Route, Routes } from 'react-router-dom'
import { SovereignShell } from '@/pages/SovereignShell'

/**
 * Palace gate lives inside SovereignShell (session unlock).
 * No separate login pages required for personal desk.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/*" element={<SovereignShell />} />
    </Routes>
  )
}
