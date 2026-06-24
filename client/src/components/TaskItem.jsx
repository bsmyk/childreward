import { useEffect, useRef, useState } from 'react'

// A single big, touch-friendly task card. Tapping an incomplete card completes
// it and fires a one-shot star-burst animation.
export default function TaskItem({ todo, onComplete }) {
  const { id, title, done } = todo
  const [burst, setBurst] = useState(false)
  const wasDone = useRef(done)

  // Fire the burst exactly once, when this card transitions to done.
  useEffect(() => {
    if (done && !wasDone.current) {
      setBurst(true)
      const timer = setTimeout(() => setBurst(false), 800)
      wasDone.current = done
      return () => clearTimeout(timer)
    }
    wasDone.current = done
  }, [done])

  const handleClick = () => {
    if (done) return // completed tasks are not tappable for re-completion
    onComplete(id)
  }

  return (
    <li>
      <button
        type="button"
        className={`task-card${done ? ' task-card--done' : ''}`}
        onClick={handleClick}
        disabled={done}
        aria-pressed={done}
        data-testid={`task-${id}`}
      >
        <span className="task-card__check" aria-hidden="true">
          {done ? '✅' : '⬜'}
        </span>
        <span className="task-card__title">{title}</span>
        {burst && (
          <span className="task-card__burst" data-testid={`burst-${id}`} aria-hidden="true">
            <span className="task-card__star">⭐</span>
            <span className="task-card__star">✨</span>
            <span className="task-card__star">🌟</span>
            <span className="task-card__star">⭐</span>
          </span>
        )}
      </button>
    </li>
  )
}
