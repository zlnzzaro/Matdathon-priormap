import { CATEGORY_INFO } from '../utils/constants'
import './MatrixCard.css'

export default function MatrixCard({ task, onDragStart, onClick }) {
  const info = CATEGORY_INFO[task.category]

  // 경계 내 위치 계산 (카드가 영역 밖으로 나가지 않도록)
  const clampedX = Math.max(8, Math.min(92, task.x))
  const clampedY = Math.max(6, Math.min(94, task.y))

  const handleClick = (e) => {
    // 드래그 중이 아닐 때만 클릭 이벤트 발생
    if (!e.defaultPrevented) {
      onClick?.(task)
    }
  }

  return (
    <div
      className="matrix-card"
      style={{ 
        left: `${clampedX}%`, 
        top: `${clampedY}%`, 
        borderColor: info.color 
      }}
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onClick={handleClick}
      title={task.title}
    >
      <span className="matrix-card__dot" style={{ background: info.color }} />
      <span className="matrix-card__title">{task.title}</span>
    </div>
  )
}
