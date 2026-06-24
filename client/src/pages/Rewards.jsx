import { useCallback, useEffect, useState } from 'react'
import { getBalance, listRewards, redeemReward, ApiError } from '../lib/api'
import StarBalance from '../components/StarBalance'
import RewardCard from '../components/RewardCard'

/**
 * Kid-facing catalog. Fetches rewards + balance, always shows the balance, and
 * wires the redeem flow: on success the balance updates immediately with a
 * brief confirmation; on failure (e.g. 400 insufficient stars) it shows a
 * friendly inline message and leaves the balance unchanged.
 */
export default function Rewards() {
  const [rewards, setRewards] = useState([])
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pendingId, setPendingId] = useState(null)
  const [feedback, setFeedback] = useState(null) // { type: 'success' | 'error', text }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [rewardsData, balanceData] = await Promise.all([
        listRewards(),
        getBalance(),
      ])
      setRewards(rewardsData || [])
      setBalance(balanceData)
    } catch (err) {
      setError('Could not load rewards. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleRedeem = useCallback(async (reward) => {
    setPendingId(reward.id)
    setFeedback(null)
    try {
      const result = await redeemReward(reward.id)
      // Trust the server's authoritative new balance.
      setBalance(result.balance)
      setFeedback({ type: 'success', text: `Redeemed “${reward.name}”! 🎉` })
    } catch (err) {
      const text =
        err instanceof ApiError
          ? err.message
          : 'Something went wrong. Please try again.'
      // Balance is intentionally left unchanged on failure.
      setFeedback({ type: 'error', text })
    } finally {
      setPendingId(null)
    }
  }, [])

  return (
    <section className="rewards-page">
      <header className="rewards-page__header">
        <h1>Rewards</h1>
        <StarBalance stars={balance} loading={loading} />
      </header>

      {feedback && (
        <div
          className={`rewards-page__feedback rewards-page__feedback--${feedback.type}`}
          role="alert"
        >
          {feedback.text}
        </div>
      )}

      {loading && <p className="rewards-page__loading">Loading rewards…</p>}

      {!loading && error && (
        <div className="rewards-page__error" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && rewards.length === 0 && (
        <p className="rewards-page__empty">No rewards yet — check back soon!</p>
      )}

      {!loading && !error && rewards.length > 0 && (
        <div className="rewards-page__grid" data-testid="rewards-grid">
          {rewards.map((reward) => (
            <RewardCard
              key={reward.id}
              reward={reward}
              balance={balance}
              pending={pendingId === reward.id}
              onRedeem={handleRedeem}
            />
          ))}
        </div>
      )}
    </section>
  )
}
