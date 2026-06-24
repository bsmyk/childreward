import { useCallback, useEffect, useMemo, useState } from 'react'
import { listTodos, completeTodo } from './api.js'
import StarBalance from './components/StarBalance.jsx'
import TaskList from './components/TaskList.jsx'

export default function App() {
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

  // Star balance is derived purely from completed-task count, so it can never
  // double-count and always recomputes correctly from the loaded list.
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
    <div className="app">
      <StarBalance count={starBalance} />
      <main className="app__main">
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
      </main>
    </div>
  )
}
