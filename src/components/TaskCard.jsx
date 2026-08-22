import { CATEGORY_INFO } from '../utils/constants'
import './TaskCard.css'

export default function TaskCard({ task, onDelete, onDragStart }) {
  const info = CATEGORY_INFO[task.category]
  const isNeutralScore = Math.round(task.importance) === 50 && Math.round(task.urgency) === 50
  const guidanceText = isNeutralScore
    ? '상황에 따라 달라지므로, 사용자 직접 드래그가 필요합니다.'
    : task.reason

  return (
    <div
      className={`task-card${task.placed ? ' task-card--placed' : ''}`}
      style={{ borderLeftColor: info.color }}
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      title={task.reason || undefined}
    >
      <div className="task-card__header">
        <span className="task-card__title">{task.title}</span>
        <button
          className="task-card__delete"
          onClick={() => onDelete(task.id)}
          aria-label="삭제"
        >
          ×
        </button>
      </div>
      <div className="task-card__meta">
        <span className="task-card__badge" style={{ background: info.color }}>
          {info.label}
        </span>
        <span className="task-card__scores">
          IMP {task.importance} · URG {task.urgency}
        </span>
      </div>
      {guidanceText && (
        <p className={`task-card__reason${isNeutralScore ? ' task-card__reason--warning' : ''}`}>
          {guidanceText}
        </p>
      )}
    </div>
  )
}
