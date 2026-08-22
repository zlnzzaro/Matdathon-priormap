import { useState } from 'react'
import './InputScreen.css'

/**
 * 메인 입력 화면
 * PRD 섹션 7: 첫 화면은 입력 중심으로 구성
 */
export default function InputScreen({ onAnalyze, status, currentStep, errorMessage, onRetry }) {
  const [input, setInput] = useState('')

  const isAnalyzing = status === 'analyzing'
  const isEmpty = input.trim().length === 0

  const handleSubmit = (e) => {
    e.preventDefault()
    if (isEmpty || isAnalyzing) return
    onAnalyze(input.trim())
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isEmpty && !isAnalyzing) {
        onAnalyze(input.trim())
      }
    }
  }

  const handleInput = (e) => {
    // chat-like 입력감을 위해 높이를 자동 조절
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 220)}px`
  }

  return (
    <div className="input-screen">
      <div className="input-screen__bg" aria-hidden="true">
        <div className="input-screen__paper-stack input-screen__paper-stack--left">
          <div className="input-screen__paper input-screen__paper--a" />
          <div className="input-screen__paper input-screen__paper--b" />
          <div className="input-screen__paper input-screen__paper--c" />
        </div>
        <div className="input-screen__paper-stack input-screen__paper-stack--right">
          <div className="input-screen__paper input-screen__paper--d" />
          <div className="input-screen__paper input-screen__paper--e" />
          <div className="input-screen__paper input-screen__paper--f" />
        </div>
      </div>
      <div className="input-screen__spotlight" aria-hidden="true" />

      <div className="input-screen__container">
        <header className="input-screen__header">
          <h1 className="input-screen__logo">Priority Map</h1>
          <p className="input-screen__tagline">
            할 일을 적으면 우선순위를 정리해 바로 실행할 수 있게 도와드립니다
          </p>
        </header>

        <form className="input-screen__form" onSubmit={handleSubmit}>
          <div className="input-screen__chatbox">
            <textarea
              className="input-screen__textarea"
              placeholder="예: 내일 발표 자료 정리, 3시 팀 회의 안건 준비, 월간 리포트 초안 작성"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              disabled={isAnalyzing}
              rows={1}
            />
            <button
              type="submit"
              className="input-screen__submit"
              disabled={isEmpty || isAnalyzing}
              aria-label="우선순위 분석 시작"
            >
              {isAnalyzing ? '분석 중' : '분석 시작'}
            </button>
          </div>

          <p className="input-screen__hint">
            Enter로 전송, 줄바꿈은 Shift + Enter
          </p>
        </form>

        {isAnalyzing && currentStep && (
          <div className="input-screen__progress">
            <div className="input-screen__spinner" />
            <p className="input-screen__step">{currentStep}</p>
          </div>
        )}

        {status === 'error' && errorMessage && (
          <div className="input-screen__error">
            <p className="input-screen__error-text">{errorMessage}</p>
            {onRetry && (
              <button type="button" className="input-screen__retry" onClick={onRetry}>
                다시 시도
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
