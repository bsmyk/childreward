import { useCallback, useEffect, useState } from 'react'
import {
  listTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  listRewards,
  createReward,
  updateReward,
  deleteReward,
} from '../lib/api'

/**
 * Parent-facing CRUD panel. Two sections — Tasks (/todos) and Rewards
 * (/rewards) — each with create / edit / delete. Changes here are reflected on
 * the Rewards page on its next load. No auth; this is just a separate route.
 */
export default function ParentPanel() {
  const [tab, setTab] = useState('tasks')

  return (
    <section className="parent-panel">
      <h1>Parent Panel</h1>
      <div className="parent-panel__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'tasks'}
          className={tab === 'tasks' ? 'is-active' : ''}
          onClick={() => setTab('tasks')}
        >
          Tasks
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'rewards'}
          className={tab === 'rewards' ? 'is-active' : ''}
          onClick={() => setTab('rewards')}
        >
          Rewards
        </button>
      </div>

      {tab === 'tasks' ? <TaskManager /> : <RewardManager />}
    </section>
  )
}

// --- Tasks -----------------------------------------------------------------

const EMPTY_TASK = { title: '' }

function TaskManager() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [draft, setDraft] = useState(EMPTY_TASK)
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState(EMPTY_TASK)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setTasks((await listTodos()) || [])
    } catch {
      setError('Could not load tasks.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleCreate(e) {
    e.preventDefault()
    if (!draft.title.trim()) return
    try {
      await createTodo({ title: draft.title.trim() })
      setDraft(EMPTY_TASK)
      await load()
    } catch {
      setError('Could not create task.')
    }
  }

  function startEdit(task) {
    setEditingId(task.id)
    setEditDraft({ title: task.title })
  }

  async function handleEditSave(id) {
    try {
      await updateTodo(id, { title: editDraft.title.trim() })
      setEditingId(null)
      await load()
    } catch {
      setError('Could not update task.')
    }
  }

  async function handleDelete(id) {
    try {
      await deleteTodo(id)
      await load()
    } catch {
      setError('Could not delete task.')
    }
  }

  return (
    <div className="manager" data-testid="task-manager">
      <h2>Tasks</h2>
      {error && <div className="manager__error" role="alert">{error}</div>}

      <form className="manager__create" onSubmit={handleCreate}>
        <input
          aria-label="New task title"
          placeholder="New task title"
          value={draft.title}
          onChange={(e) => setDraft({ title: e.target.value })}
        />
        <button type="submit">Add task</button>
      </form>

      {loading ? (
        <p>Loading tasks…</p>
      ) : tasks.length === 0 ? (
        <p className="manager__empty">No tasks yet.</p>
      ) : (
        <ul className="manager__list">
          {tasks.map((task) => (
            <li key={task.id} data-testid={`task-${task.id}`}>
              {editingId === task.id ? (
                <>
                  <input
                    aria-label="Edit task title"
                    value={editDraft.title}
                    onChange={(e) => setEditDraft({ title: e.target.value })}
                  />
                  <button type="button" onClick={() => handleEditSave(task.id)}>
                    Save
                  </button>
                  <button type="button" onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span className="manager__title">{task.title}</span>
                  <button type="button" onClick={() => startEdit(task)}>
                    Edit
                  </button>
                  <button type="button" onClick={() => handleDelete(task.id)}>
                    Delete
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// --- Rewards ---------------------------------------------------------------

const EMPTY_REWARD = { name: '', icon: '', cost: '' }

function RewardManager() {
  const [rewards, setRewards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [draft, setDraft] = useState(EMPTY_REWARD)
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState(EMPTY_REWARD)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRewards((await listRewards()) || [])
    } catch {
      setError('Could not load rewards.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function toPayload(d) {
    return {
      name: d.name.trim(),
      icon: d.icon.trim(),
      cost: Number(d.cost) || 0,
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!draft.name.trim()) return
    try {
      await createReward(toPayload(draft))
      setDraft(EMPTY_REWARD)
      await load()
    } catch {
      setError('Could not create reward.')
    }
  }

  function startEdit(reward) {
    setEditingId(reward.id)
    setEditDraft({
      name: reward.name,
      icon: reward.icon || '',
      cost: String(reward.cost),
    })
  }

  async function handleEditSave(id) {
    try {
      await updateReward(id, toPayload(editDraft))
      setEditingId(null)
      await load()
    } catch {
      setError('Could not update reward.')
    }
  }

  async function handleDelete(id) {
    try {
      await deleteReward(id)
      await load()
    } catch {
      setError('Could not delete reward.')
    }
  }

  return (
    <div className="manager" data-testid="reward-manager">
      <h2>Rewards</h2>
      {error && <div className="manager__error" role="alert">{error}</div>}

      <form className="manager__create" onSubmit={handleCreate}>
        <input
          aria-label="New reward name"
          placeholder="Name"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
        <input
          aria-label="New reward icon"
          placeholder="Icon (emoji)"
          value={draft.icon}
          onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
        />
        <input
          aria-label="New reward cost"
          type="number"
          min="0"
          placeholder="Cost"
          value={draft.cost}
          onChange={(e) => setDraft({ ...draft, cost: e.target.value })}
        />
        <button type="submit">Add reward</button>
      </form>

      {loading ? (
        <p>Loading rewards…</p>
      ) : rewards.length === 0 ? (
        <p className="manager__empty">No rewards yet.</p>
      ) : (
        <ul className="manager__list">
          {rewards.map((reward) => (
            <li key={reward.id} data-testid={`reward-row-${reward.id}`}>
              {editingId === reward.id ? (
                <>
                  <input
                    aria-label="Edit reward name"
                    value={editDraft.name}
                    onChange={(e) =>
                      setEditDraft({ ...editDraft, name: e.target.value })
                    }
                  />
                  <input
                    aria-label="Edit reward icon"
                    value={editDraft.icon}
                    onChange={(e) =>
                      setEditDraft({ ...editDraft, icon: e.target.value })
                    }
                  />
                  <input
                    aria-label="Edit reward cost"
                    type="number"
                    min="0"
                    value={editDraft.cost}
                    onChange={(e) =>
                      setEditDraft({ ...editDraft, cost: e.target.value })
                    }
                  />
                  <button type="button" onClick={() => handleEditSave(reward.id)}>
                    Save
                  </button>
                  <button type="button" onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span className="manager__icon" aria-hidden="true">
                    {reward.icon || '🎁'}
                  </span>
                  <span className="manager__title">{reward.name}</span>
                  <span className="manager__cost">{reward.cost} ⭐</span>
                  <button type="button" onClick={() => startEdit(reward)}>
                    Edit
                  </button>
                  <button type="button" onClick={() => handleDelete(reward.id)}>
                    Delete
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
