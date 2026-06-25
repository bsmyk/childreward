import { useCallback, useEffect, useState } from 'react'
import { getAchievements } from '../lib/api'
import AchievementShelf from '../components/AchievementShelf'

/**
 * Achievements page. Loads the full badge catalog from the API and renders the
 * shelf. Loading + error states mirror pages/Rewards.jsx.
 */
export default function Achievements() {
  const [achievements, setAchievements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAchievements()
      setAchievements(data || [])
    } catch (err) {
      setError('Could not load achievements. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <section className="achievements-page">
      <header className="achievements-page__header">
        <h1>Achievements</h1>
      </header>

      {loading && <p className="achievements-page__loading">Loading achievements…</p>}

      {!loading && error && (
        <div className="achievements-page__error" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && <AchievementShelf achievements={achievements} />}
    </section>
  )
}
