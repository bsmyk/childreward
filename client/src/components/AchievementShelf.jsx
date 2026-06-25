/**
 * Presentational badge shelf. Renders every achievement in the catalog as a
 * card. Unlocked badges are highlighted and show when they were earned; locked
 * badges are dimmed (marked `aria-disabled`) but still display their title and
 * description so kids can see what's left to earn.
 *
 * @param {{ achievements: Array<{ id, title, description, unlocked, unlockedAt }> }} props
 */
export default function AchievementShelf({ achievements = [] }) {
  if (achievements.length === 0) {
    return <p className="achievement-shelf__empty">No achievements yet.</p>
  }

  return (
    <div className="achievement-shelf" data-testid="achievement-shelf">
      {achievements.map((badge) => (
        <div
          key={badge.id}
          className={`achievement-card achievement-card--${
            badge.unlocked ? 'unlocked' : 'locked'
          }`}
          data-testid={`achievement-${badge.id}`}
          aria-disabled={!badge.unlocked}
        >
          <div className="achievement-card__icon" aria-hidden="true">
            {badge.unlocked ? '🏅' : '🔒'}
          </div>
          <div className="achievement-card__title">{badge.title}</div>
          <div className="achievement-card__description">{badge.description}</div>
          {badge.unlocked && badge.unlockedAt && (
            <div className="achievement-card__earned">
              Earned {new Date(badge.unlockedAt).toLocaleDateString()}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
