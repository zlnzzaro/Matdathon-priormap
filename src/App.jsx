import { useState } from 'react'
import InputScreen from './components/InputScreen'
import Sidebar from './components/Sidebar'
import Matrix from './components/Matrix'
import { analyzeTasks } from './api/mockPlanningApi'
import { validatePlanningResponse, createInitialDraft } from './types/planning'
import { getCategory } from './utils/category'
import { scoreToPosition } from './utils/position'
import './App.css'

/**
 * PlanningResponse의 task를 기존 UI용 task로 변환
 */
function convertToLegacyTask(task) {
  // importance/urgency를 1-5에서 0-100으로 변환
  const importance100 = ((task.importance - 1) / 4) * 100
  const urgency100 = ((task.urgency - 1) / 4) * 100
  const { x, y } = scoreToPosition(importance100, urgency100)

  return {
    id: task.id,
    title: task.title,
    importance: importance100,
    urgency: urgency100,
    category: getCategory(importance100, urgency100),
    reason: task.recommendationReason || '',
    placed: true,
    x,
    y,
    createdAt: Date.now(),
    // 새 필드
    description: task.description,
    dueDate: task.dueDate,
    estimatedMinutes: task.estimatedMinutes,
    inferredFields: task.inferredFields,
    source: task.source,
    userModified: task.userModified,
    quadrant: task.quadrant,
  }
}

export default function App() {
  const [draft, setDraft] = useState(createInitialDraft())
  const [tasks, setTasks] = useState([])
  const [focusNowTaskId, setFocusNowTaskId] = useState(null)

  // 분석 요청
  const handleAnalyze = async (rawInput) => {
    setDraft((prev) => ({
      ...prev,
      status: 'analyzing',
      currentStep: '준비 중...',
      errorMessage: undefined,
    }))

    try {
      const response = await analyzeTasks(rawInput, (step) => {
        setDraft((prev) => ({ ...prev, currentStep: step }))
      })

      // 응답 검증
      const validation = validatePlanningResponse(response)
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      // 성공: 결과 화면으로 전환
      const legacyTasks = response.tasks.map(convertToLegacyTask)
      setTasks(legacyTasks)
      setFocusNowTaskId(response.focusNowTaskId)
      setDraft((prev) => ({
        ...prev,
        tasks: response.tasks,
        focusNowTaskId: response.focusNowTaskId,
        status: 'success',
        currentStep: undefined,
      }))
    } catch (err) {
      console.error('분석 실패:', err)
      setDraft((prev) => ({
        ...prev,
        status: 'error',
        currentStep: undefined,
        errorMessage: err.message || '분석 중 오류가 발생했습니다.',
      }))
    }
  }

  // 입력 화면으로 돌아가기
  const handleReset = () => {
    setDraft(createInitialDraft())
    setTasks([])
    setFocusNowTaskId(null)
  }

  const handleDelete = (id) => {
    setTasks((prev) => prev.filter((task) => task.id !== id))
  }

  const handleDragStart = (e, id) => {
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDropTask = (id, x, y) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== id) return task
        const importance = Math.round(100 - y)
        const urgency = Math.round(100 - x)
        return {
          ...task,
          x,
          y,
          importance,
          urgency,
          category: getCategory(importance, urgency),
          placed: true,
          userModified: true,
        }
      }),
    )
  }

  // 입력 화면 또는 결과 화면
  if (draft.status === 'idle' || draft.status === 'analyzing' || draft.status === 'error') {
    return (
      <InputScreen
        onAnalyze={handleAnalyze}
        status={draft.status}
        currentStep={draft.currentStep}
        errorMessage={draft.errorMessage}
        onRetry={() => setDraft((prev) => ({ ...prev, status: 'idle' }))}
      />
    )
  }

  // 새 할일 추가 (결과 화면에서)
  const handleAdd = async (title) => {
    const newTask = {
      id: `task-${Date.now()}`,
      title,
      description: '',
      importance: 50,
      urgency: 50,
      category: getCategory(50, 50),
      reason: '사용자가 직접 추가',
      placed: true,
      x: 50,
      y: 50,
      createdAt: Date.now(),
      source: 'user',
      userModified: false,
      quadrant: 'important-urgent',
    }
    setTasks((prev) => [...prev, newTask])
  }

  // 결과 화면
  const focusTask = tasks.find((t) => t.id === focusNowTaskId)

  return (
    <div className="app app--with-focus">
      {focusTask && (
        <div className="focus-now">
          <div className="focus-now__header">
            <span className="focus-now__badge">🎯 Focus Now</span>
            <span className="focus-now__ai-label">AI 추천</span>
          </div>
          <h2 className="focus-now__title">{focusTask.title}</h2>
          {focusTask.dueDate && (
            <p className="focus-now__meta">📅 {focusTask.dueDate}</p>
          )}
          {focusTask.estimatedMinutes && (
            <p className="focus-now__meta">⏱️ 예상 {focusTask.estimatedMinutes}분</p>
          )}
          <p className="focus-now__reason">{focusTask.reason}</p>
          <button className="focus-now__reset" onClick={handleReset}>
            ← 다시 입력하기
          </button>
        </div>
      )}
      <div className="app__main">
        <Sidebar
          tasks={tasks}
          onAdd={handleAdd}
          onDelete={handleDelete}
          onDragStart={handleDragStart}
        />
        <Matrix tasks={tasks} onDrop={handleDropTask} onDragStart={handleDragStart} />
      </div>
    </div>
  )
}
