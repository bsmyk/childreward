import { useEffect, useRef, useState } from 'react'

// Prominent header showing the live star count. Animates ("pops") whenever the
// count increases.
export default function StarBalance({ count }) {
  const [popping, setPopping] = useState(false)
  const prev = useRef(count)

  useEffect(() => {
    if (count > prev.current) {
      setPopping(true)
      const timer = setTimeout(() => setPopping(false), 600)
      prev.current = count
      return () => clearTimeout(timer)
    }
    prev.current = count
  }, [count])

  return (
    <header className="star-balance">
      <span className="star-balance__label">Your Stars</span>
      <span
        className={`star-balance__count${popping ? ' star-balance__count--pop' : ''}`}
        data-testid="star-balance"
        aria-live="polite"
      >
        <span className="star-balance__icon" aria-hidden="true">⭐</span>
        <span className="star-balance__number">{count}</span>
      </span>
    </header>
  )
}
