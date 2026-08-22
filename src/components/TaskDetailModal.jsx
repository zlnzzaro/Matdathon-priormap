import { useState, useEffect } from 'react'
import { CATEGORY_INFO } from '../utils/constants'
import './TaskDetailModal.css'

const MISSING_SIGNAL_LABELS = {
  deadlineContext: '마감 정보 부족',
  impactContext: '영향도 정보 부족',
  meetingImpact: '회의 중요도 정보 부족',
}

export default function TaskDetailModal({ task, onClose, onSave }) {
  const [notes, setNotes] = useState(task?.notes || '')
  const info = task ? CATEGORY_INFO[task.category] : null

  useEffect(() => {
    if (task) {
      setNotes(task.notes || '')
    }
  }, [task])

  if (!task) return null

  const isNeutralScore = Math.round(task.importance) === 50 && Math.round(task.urgency) === 50
  const isLowConfidence = task.confidence === 'low' || isNeutralScore
  const hasMissingSignals = Array.isArray(task.missingSignals) && task.missingSignals.length > 0
  const missingLabels = hasMissingSignals
    ? task.missingSignals
        .slice(0, 3)
        .map((signal) => MISSING_SIGNAL_LABELS[signal] || signal)
    : []
  const missingText = hasMissingSignals
    ? `판단 신호가 부족해요: ${missingLabels.join(', ')}`
    : '상황에 따라 달라지므로, 사용자 직접 드래그가 필요합니다.'
  const analysisText = isLowConfidence ? missingText : task.reason

  const handleSave = () => {
    onSave(task.id, { notes })
    onClose()
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick} onKeyDown={handleKeyDown}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal__header" style={{ borderColor: info.color }}>
          <h2 className="modal__title">{task.title}</h2>
          <button className="modal__close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>

        <div className="modal__body">
          <div className="modal__meta">
            <span className="modal__badge" style={{ background: info.color }}>
              {info.label}
            </span>
            <span className="modal__scores">
              중요도 {Math.round(task.importance)} · 긴급도 {Math.round(task.urgency)}
            </span>
          </div>

          {task.dueDate && (
            <p className="modal__info">
              <span className="modal__info-icon">📅</span>
              마감일: {task.dueDate}
            </p>
          )}

          {task.estimatedMinutes && (
            <p className="modal__info">
              <span className="modal__info-icon">⏱️</span>
              예상 소요 시간: {task.estimatedMinutes}분
            </p>
          )}

          {analysisText && (
            <div className="modal__section">
              <h3 className="modal__section-title">AI 분석</h3>
              <p className={`modal__reason${isLowConfidence ? ' modal__reason--warning' : ''}`}>
                {analysisText}
              </p>
            </div>
          )}

          <div className="modal__section">
            <h3 className="modal__section-title">메모</h3>
            <textarea
              className="modal__textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="여기에 상세 내용이나 메모를 입력하세요..."
              rows={6}
            />
          </div>
        </div>

        <div className="modal__footer">
          <button className="modal__btn modal__btn--secondary" onClick={onClose}>
            취소
          </button>
          <button className="modal__btn modal__btn--primary" onClick={handleSave}>
            저장
          </button>
        </div>
      </div>
    </div>
  )
}
