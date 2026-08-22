import { useState } from 'react'
import TaskCard from './TaskCard'
import './Sidebar.css'

export default function Sidebar({ tasks, onAdd, onDelete, onDragStart }) {
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed || loading) return
    setLoading(true)
    try {
      await onAdd(trimmed)
      setTitle('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <aside className="sidebar">
      <h1 className="sidebar__title">Priority Map</h1>

      <form className="sidebar__form" onSubmit={handleSubmit}>
        <input
          className="sidebar__input"
          type="text"
          placeholder="할 일을 입력하세요"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={loading}
        />
        <button type="submit" className="sidebar__add-btn" disabled={loading}>
          {loading ? '분석 중...' : '+ 추가하고 자동 배치'}
        </button>
      </form>

      <div className="sidebar__list">
        {tasks.length === 0 && (
          <p className="sidebar__empty">아직 할 일이 없어요.</p>
        )}
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onDelete={onDelete}
            onDragStart={onDragStart}
          />
        ))}
      </div>
    </aside>
  )
}
