import { useCallback, useEffect, useMemo, useState } from 'react'
import { BrowserRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { listTodos, completeTodo } from './api.js'
import StarBalance from './components/StarBalance.jsx'
import TaskList from './components/TaskList.jsx'
import Rewards from './pages/Rewards'
import ParentPanel from './pages/ParentPanel'

// The kid-facing task board: stars are derived purely from completed tasks, so
// the balance can never double-count and always recomputes from the list.
function Tasks() {
  const [todos, setTodos] = useState([])
  const [status, setStatus] = useState('loading') // 'loading' | 'ready' | 'error'

  const load = useCallback(async () => {
    setStatus('loading')
    try {
      const data = await listTodos()
      setTodos(data)
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const starBalance = useMemo(
    () => todos.filter((t) => t.done).length,
    [todos],
  )

  const handleComplete = useCallback(async (id) => {
    const target = todos.find((t) => t.id === id)
    // Guard: already-done tasks never award extra stars.
    if (!target || target.done) return

    // Optimistically flip the card to completed.
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: true } : t)),
    )

    try {
      await completeTodo(id)
    } catch {
      // Roll back on failure — leave the task incomplete.
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, done: false } : t)),
      )
    }
  }, [todos])

  return (
    <>
      <StarBalance count={starBalance} />

      {status === 'loading' && (
        <p className="app__message" role="status">
          Loading your tasks…
        </p>
      )}

      {status === 'error' && (
        <div className="app__message app__message--error" role="alert">
          <p>Oops! We couldn’t load your tasks.</p>
          <button className="app__retry" type="button" onClick={load}>
            Try again
          </button>
        </div>
      )}

      {status === 'ready' && (
        <TaskList todos={todos} onComplete={handleComplete} />
      )}
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <nav className="app__nav">
          <NavLink to="/">Tasks</NavLink>
          <NavLink to="/rewards">Rewards</NavLink>
          <NavLink to="/parent">Parent Panel</NavLink>
        </nav>
        <main className="app__main">
          <Routes>
            <Route path="/" element={<Tasks />} />
            <Route path="/rewards" element={<Rewards />} />
            <Route path="/parent" element={<ParentPanel />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
