import TaskItem from './TaskItem.jsx'

export default function TaskList({ todos, onComplete }) {
  if (!todos.length) {
    return (
      <p className="task-list__empty" role="status">
        No tasks yet — enjoy your day! 🎉
      </p>
    )
  }

  return (
    <ul className="task-list">
      {todos.map((todo) => (
        <TaskItem key={todo.id} todo={todo} onComplete={onComplete} />
      ))}
    </ul>
  )
}
