/**
 * Always-visible star balance. The current count is owned by the parent page
 * (so it can refresh after a redeem); this component just renders it.
 */
export default function StarBalance({ stars, loading }) {
  return (
    <div className="star-balance" role="status" aria-label="Star balance">
      <span className="star-balance__icon" aria-hidden="true">⭐</span>
      <span className="star-balance__count" data-testid="star-count">
        {loading ? '…' : stars}
      </span>
      <span className="star-balance__label">stars</span>
    </div>
  )
}
