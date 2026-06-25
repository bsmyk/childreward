import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import Rewards from './pages/Rewards'
import Achievements from './pages/Achievements'
import ParentPanel from './pages/ParentPanel'

export default function App() {
  return (
    <div className="app">
      <nav className="app__nav">
        <NavLink to="/rewards">Rewards</NavLink>
        <NavLink to="/achievements">Achievements</NavLink>
        <NavLink to="/parent">Parent Panel</NavLink>
      </nav>
      <main className="app__main">
        <Routes>
          <Route path="/" element={<Navigate to="/rewards" replace />} />
          <Route path="/rewards" element={<Rewards />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/parent" element={<ParentPanel />} />
          <Route path="*" element={<Navigate to="/rewards" replace />} />
        </Routes>
      </main>
    </div>
  )
}
