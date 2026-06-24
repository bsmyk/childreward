import { useEffect, useRef, useState } from 'react'

// Prominent star balance. Supports two call styles so it can serve both views:
//   - Todo view:    <StarBalance count={n} />            derived from completed
//                                                         tasks; "pops" on increase.
//   - Rewards view: <StarBalance stars={n} loading={b} /> owned by the page so it
//                                                         can refresh after a redeem.
export default function StarBalance({ count, stars, loading }) {
  const value = count ?? stars ?? 0
  const display = loading ? '…' : value

  const [popping, setPopping] = useState(false)
  const prev = useRef(value)

  useEffect(() => {
    if (typeof value === 'number' && value > prev.current) {
      setPopping(true)
      const timer = setTimeout(() => setPopping(false), 600)
      prev.current = value
      return () => clearTimeout(timer)
    }
    prev.current = value
  }, [value])

  return (
    <header className="star-balance" role="status" aria-label="Star balance">
      <span className="star-balance__label">Your Stars</span>
      <span
        className={`star-balance__count${popping ? ' star-balance__count--pop' : ''}`}
        data-testid="star-balance"
        aria-live="polite"
      >
        <span className="star-balance__icon" aria-hidden="true">⭐</span>
        <span className="star-balance__number" data-testid="star-count">
          {display}
        </span>
        <span className="star-balance__suffix">stars</span>
      </span>
    </header>
  )
}
