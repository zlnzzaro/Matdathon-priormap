/**
 * Priormap Planning Types
 * TRD 섹션 5, 6에서 정의한 도메인 모델과 에이전트 계약
 */

/**
 * @typedef {'important-urgent' | 'important-not-urgent' | 'not-important-urgent' | 'not-important-not-urgent'} Quadrant
 */

/**
 * @typedef {'ai' | 'user'} TaskSource
 */

/**
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} [dueDate] - ISO 날짜 문자열
 * @property {number} [estimatedMinutes]
 * @property {number} importance - 1-5
 * @property {number} urgency - 1-5
 * @property {Quadrant} quadrant
 * @property {string} [recommendationReason]
 * @property {string[]} inferredFields - AI가 추정한 필드 목록
 * @property {TaskSource} source
 * @property {boolean} userModified
 */

/**
 * @typedef {Object} PlanningDraft
 * @property {Task[]} tasks
 * @property {string} [focusNowTaskId]
 * @property {'idle' | 'analyzing' | 'success' | 'error' | 'approved'} status
 * @property {string} [currentStep]
 * @property {string} [errorMessage]
 */

/**
 * @typedef {Object} PlanningRequest
 * @property {string} rawInput
 * @property {Task[]} [existingTasks]
 */

/**
 * @typedef {Object} PlanningResponse
 * @property {Task[]} tasks
 * @property {string} focusNowTaskId
 */

/** 허용된 Quadrant 값 */
export const QUADRANTS = [
  'important-urgent',
  'important-not-urgent',
  'not-important-urgent',
  'not-important-not-urgent',
]

/** 중요도/긴급도 범위 */
export const SCORE_MIN = 1
export const SCORE_MAX = 5

/**
 * PlanningResponse 검증
 * @param {unknown} data
 * @returns {{ valid: boolean, error?: string, data?: PlanningResponse }}
 */
export function validatePlanningResponse(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: '응답이 객체가 아닙니다.' }
  }

  const { tasks, focusNowTaskId } = data

  if (!Array.isArray(tasks)) {
    return { valid: false, error: 'tasks가 배열이 아닙니다.' }
  }

  if (tasks.length === 0) {
    return { valid: false, error: 'tasks가 비어 있습니다.' }
  }

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i]
    const prefix = `tasks[${i}]`

    if (!task.id || typeof task.id !== 'string') {
      return { valid: false, error: `${prefix}.id가 유효하지 않습니다.` }
    }

    if (!task.title || typeof task.title !== 'string') {
      return { valid: false, error: `${prefix}.title이 유효하지 않습니다.` }
    }

    if (
      typeof task.importance !== 'number' ||
      task.importance < SCORE_MIN ||
      task.importance > SCORE_MAX
    ) {
      return {
        valid: false,
        error: `${prefix}.importance가 ${SCORE_MIN}-${SCORE_MAX} 범위가 아닙니다.`,
      }
    }

    if (
      typeof task.urgency !== 'number' ||
      task.urgency < SCORE_MIN ||
      task.urgency > SCORE_MAX
    ) {
      return {
        valid: false,
        error: `${prefix}.urgency가 ${SCORE_MIN}-${SCORE_MAX} 범위가 아닙니다.`,
      }
    }

    if (!QUADRANTS.includes(task.quadrant)) {
      return {
        valid: false,
        error: `${prefix}.quadrant가 허용된 값이 아닙니다: ${task.quadrant}`,
      }
    }
  }

  if (typeof focusNowTaskId !== 'string') {
    return { valid: false, error: 'focusNowTaskId가 문자열이 아닙니다.' }
  }

  const focusTask = tasks.find((t) => t.id === focusNowTaskId)
  if (!focusTask) {
    return {
      valid: false,
      error: `focusNowTaskId(${focusNowTaskId})가 tasks에 존재하지 않습니다.`,
    }
  }

  return { valid: true, data }
}

/**
 * importance와 urgency로 quadrant 계산
 * @param {number} importance
 * @param {number} urgency
 * @returns {Quadrant}
 */
export function calculateQuadrant(importance, urgency) {
  const midpoint = (SCORE_MIN + SCORE_MAX) / 2
  const isImportant = importance >= midpoint
  const isUrgent = urgency >= midpoint

  if (isImportant && isUrgent) return 'important-urgent'
  if (isImportant && !isUrgent) return 'important-not-urgent'
  if (!isImportant && isUrgent) return 'not-important-urgent'
  return 'not-important-not-urgent'
}

/**
 * 초기 PlanningDraft 생성
 * @returns {PlanningDraft}
 */
export function createInitialDraft() {
  return {
    tasks: [],
    focusNowTaskId: undefined,
    status: 'idle',
    currentStep: undefined,
    errorMessage: undefined,
  }
}
