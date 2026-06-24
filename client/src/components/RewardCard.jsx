/**
 * A single reward: icon, name, cost, and a Redeem button. The button is
 * disabled when the reward costs more than the current balance or while a
 * redeem is in flight. Redeeming is delegated to the parent via onRedeem.
 */
export default function RewardCard({ reward, balance, onRedeem, pending }) {
  const affordable = reward.cost <= balance
  const disabled = !affordable || pending

  return (
    <div className="reward-card" data-testid={`reward-${reward.id}`}>
      <div className="reward-card__icon" aria-hidden="true">
        {reward.icon || '🎁'}
      </div>
      <div className="reward-card__name">{reward.name}</div>
      <div className="reward-card__cost">{reward.cost} ⭐</div>
      <button
        type="button"
        className="reward-card__redeem"
        disabled={disabled}
        onClick={() => onRedeem(reward)}
      >
        {pending ? 'Redeeming…' : affordable ? 'Redeem' : 'Not enough stars'}
      </button>
    </div>
  )
}
