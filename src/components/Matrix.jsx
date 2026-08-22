import { useRef } from 'react'
import { CATEGORY_INFO } from '../utils/constants'
import MatrixCard from './MatrixCard'
import './Matrix.css'

export default function Matrix({ tasks, onDrop, onDragStart, onTaskClick }) {
  const areaRef = useRef(null)
  const quadrantBackgrounds = [
    'rgba(255, 255, 255, 0.05)',
    'rgba(255, 255, 255, 0.035)',
    'rgba(255, 255, 255, 0.03)',
    'rgba(255, 255, 255, 0.02)',
  ]

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    if (!id || !areaRef.current) return

    const rect = areaRef.current.getBoundingClientRect()
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100))
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100))
    onDrop(id, x, y)
  }

  const placedTasks = tasks.filter((task) => task.placed)

  return (
    <section className="matrix">
      <div className="matrix__axis-top">Importance ↑</div>

      <div
        className="matrix__area"
        ref={areaRef}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="matrix__grid">
          {Object.values(CATEGORY_INFO).map((info, index) => (
            <div
              key={info.label}
              className="matrix__quadrant"
              style={{
                '--accent': info.color,
                '--quadrant-bg': quadrantBackgrounds[index] || quadrantBackgrounds[3],
              }}
            >
              <span className="matrix__label">{info.label}</span>
              <span className="matrix__sub">{info.sub}</span>
            </div>
          ))}
        </div>

        <div className="matrix__cards">
          {placedTasks.map((task) => (
            <MatrixCard
              key={task.id}
              task={task}
              onDragStart={onDragStart}
              onClick={onTaskClick}
            />
          ))}
        </div>
      </div>

      <div className="matrix__axis-bottom">← Urgency</div>
    </section>
  )
}
