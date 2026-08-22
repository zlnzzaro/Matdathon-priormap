import { useState } from 'react'
import InputScreen from './components/InputScreen'
import Sidebar from './components/Sidebar'
import Matrix from './components/Matrix'
import TaskDetailModal from './components/TaskDetailModal'
import { analyzeTasks } from './api/planningApi'
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
    confidence: task.confidence || 'medium',
    missingSignals: task.missingSignals || [],
    scoringSignals: task.scoringSignals || [],
    source: task.source,
    userModified: task.userModified,
    quadrant: task.quadrant,
  }
}

/**
 * Focus Now는 중요도 우선, 동점이면 긴급도로 선택
 */
function pickFocusTaskId(taskList) {
  if (!Array.isArray(taskList) || taskList.length === 0) return null

  const sorted = [...taskList].sort((a, b) => {
    if (b.importance !== a.importance) return b.importance - a.importance
    if (b.urgency !== a.urgency) return b.urgency - a.urgency
    return (a.createdAt || 0) - (b.createdAt || 0)
  })

  return sorted[0].id
}

export default function App() {
  const [draft, setDraft] = useState(createInitialDraft())
  const [tasks, setTasks] = useState([])
  const [focusNowTaskId, setFocusNowTaskId] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)

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
      const nextFocusTaskId = pickFocusTaskId(legacyTasks) || response.focusNowTaskId
      setTasks(legacyTasks)
      setFocusNowTaskId(nextFocusTaskId)
      setDraft((prev) => ({
        ...prev,
        tasks: response.tasks,
        focusNowTaskId: nextFocusTaskId,
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
    setTasks((prev) => {
      const nextTasks = prev.filter((task) => task.id !== id)

      // Focus Now가 삭제되면 남은 첫 task를 새 Focus Now로 지정
      if (id === focusNowTaskId) {
        setFocusNowTaskId(pickFocusTaskId(nextTasks))
      }

      return nextTasks
    })

    setSelectedTask((prev) => (prev?.id === id ? null : prev))
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

  // 카드 클릭 시 상세 모달 열기
  const handleTaskClick = (task) => {
    setSelectedTask(task)
  }

  // 태스크 메모 저장
  const handleSaveTask = (taskId, updates) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, ...updates } : task)),
    )
    // 선택된 태스크 정보도 업데이트
    setSelectedTask((prev) => (prev && prev.id === taskId ? { ...prev, ...updates } : prev))
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
    try {
      const response = await analyzeTasks(title)
      const validation = validatePlanningResponse(response)
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      const analyzedTask = convertToLegacyTask(response.tasks[0])
      setTasks((prev) => {
        const nextTasks = [...prev, analyzedTask]
        setFocusNowTaskId(pickFocusTaskId(nextTasks))
        return nextTasks
      })
      return
    } catch (error) {
      console.warn('추가 task AI 분석 실패, 기본값으로 추가합니다:', error)
    }

    const fallbackTask = {
      id: `task-${Date.now()}`,
      title,
      description: '',
      importance: 50,
      urgency: 50,
      category: getCategory(50, 50),
      reason: 'AI 분석에 실패해 기본 중요도(중간)로 추가되었습니다.',
      confidence: 'low',
      missingSignals: ['deadlineContext', 'impactContext'],
      scoringSignals: ['분석 실패로 기본값 적용'],
      placed: true,
      x: 50,
      y: 50,
      createdAt: Date.now(),
      source: 'user',
      userModified: false,
      quadrant: 'important-urgent',
    }

    setTasks((prev) => {
      const nextTasks = [...prev, fallbackTask]
      setFocusNowTaskId(pickFocusTaskId(nextTasks))
      return nextTasks
    })
  }

  // 결과 화면
  const focusTask = tasks.find((t) => t.id === focusNowTaskId)

  return (
    <div className="app app--with-focus">
      <div className="focus-now">
        <div className="focus-now__header">
          <span className="focus-now__badge">Focus Now</span>
          <span className="focus-now__ai-label">추천</span>
        </div>
        {focusTask ? (
          <>
            <h2 className="focus-now__title">{focusTask.title}</h2>
            <p className="focus-now__reason">{focusTask.reason}</p>
          </>
        ) : (
          <>
            <h2 className="focus-now__title">추천 작업이 비어 있습니다</h2>
            <p className="focus-now__reason">
              왼쪽에서 할 일을 추가하거나 아래 버튼으로 메인 화면으로 돌아가 입력을 다시 시작해 주세요.
            </p>
          </>
        )}
        <button className="focus-now__reset" onClick={handleReset}>
          ← 다시 입력하기
        </button>
      </div>
      <div className="app__main">
        <Sidebar
          tasks={tasks}
          onAdd={handleAdd}
          onDelete={handleDelete}
          onDragStart={handleDragStart}
        />
        <Matrix 
          tasks={tasks} 
          onDrop={handleDropTask} 
          onDragStart={handleDragStart}
          onTaskClick={handleTaskClick}
        />
      </div>
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onSave={handleSaveTask}
        />
      )}
    </div>
  )
}
