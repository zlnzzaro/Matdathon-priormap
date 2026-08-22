import { CATEGORY_INFO } from '../utils/constants'
import './TaskCard.css'

const MISSING_SIGNAL_LABELS = {
  deadlineContext: '마감 정보 부족',
  impactContext: '영향도 정보 부족',
  meetingImpact: '회의 중요도 정보 부족',
}

export default function TaskCard({ task, onDelete, onDragStart }) {
  const info = CATEGORY_INFO[task.category]
  const isNeutralScore = Math.round(task.importance) === 50 && Math.round(task.urgency) === 50
  const isLowConfidence = task.confidence === 'low' || isNeutralScore
  const hasMissingSignals = Array.isArray(task.missingSignals) && task.missingSignals.length > 0
  const missingLabels = hasMissingSignals
    ? task.missingSignals
        .slice(0, 2)
        .map((signal) => MISSING_SIGNAL_LABELS[signal] || signal)
    : []
  const missingText = hasMissingSignals
    ? `판단 신호 부족: ${missingLabels.join(', ')}`
    : '상황에 따라 달라지므로, 사용자 직접 드래그가 필요합니다.'
  const guidanceText = isLowConfidence ? missingText : task.reason

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
        <p className={`task-card__reason${isLowConfidence ? ' task-card__reason--warning' : ''}`}>
          {guidanceText}
        </p>
      )}
    </div>
  )
}
