/**
 * Mock Planning API
 * AI 연동 전까지 사용하는 고정 응답
 */

import { calculateQuadrant } from '../types/planning.js'

/**
 * 분석 단계를 순서대로 시뮬레이션
 * @param {(step: string) => void} onStep
 * @returns {Promise<void>}
 */
async function simulateSteps(onStep) {
  const steps = [
    { key: 'extracting', message: '할 일을 추출하고 있습니다...' },
    { key: 'scoring', message: '마감일과 영향도를 분석하고 있습니다...' },
    { key: 'recommending', message: 'Focus Now를 선정하고 있습니다...' },
    { key: 'placing', message: '매트릭스에 배치하고 있습니다...' },
  ]

  for (const step of steps) {
    onStep(step.message)
    await delay(400 + Math.random() * 300)
  }
}

/**
 * 자연어 입력을 분석해 PlanningResponse 반환 (Mock)
 * @param {string} rawInput
 * @param {(step: string) => void} [onStep]
 * @returns {Promise<import('../types/planning.js').PlanningResponse>}
 */
export async function analyzeTasks(rawInput, onStep = () => {}) {
  // 스트리밍 시뮬레이션
  await simulateSteps(onStep)

  // 쉼표 또는 줄바꿈으로 task 분리
  const titles = rawInput
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)

  if (titles.length === 0) {
    throw new Error('입력에서 할 일을 찾을 수 없습니다.')
  }

  // Mock 분석 결과 생성
  const tasks = titles.map((title, index) => {
    const mockData = getMockAnalysis(title, index)
    return {
      id: `task-${Date.now()}-${index}`,
      title,
      description: '',
      dueDate: mockData.dueDate,
      estimatedMinutes: mockData.estimatedMinutes,
      importance: mockData.importance,
      urgency: mockData.urgency,
      quadrant: calculateQuadrant(mockData.importance, mockData.urgency),
      recommendationReason: mockData.reason,
      inferredFields: mockData.inferredFields,
      source: 'ai',
      userModified: false,
    }
  })

  // Focus Now: 중요도 우선, 동점이면 긴급도 기준
  const sorted = [...tasks].sort((a, b) => {
    if (b.importance !== a.importance) return b.importance - a.importance
    return b.urgency - a.urgency
  })

  const focusNowTaskId = sorted[0].id

  // Focus Now task에 추천 이유 강화
  const focusTask = tasks.find((t) => t.id === focusNowTaskId)
  if (focusTask) {
    const isNeutral = focusTask.importance === 3 && focusTask.urgency === 3
    focusTask.recommendationReason = isNeutral
      ? '상황에 따라 달라지므로, 사용자 직접 드래그가 필요합니다.'
      : '중요도가 가장 높고, 긴급도도 높아 먼저 처리를 추천합니다.'
  }

  return { tasks, focusNowTaskId }
}

/**
 * task 제목에 따른 mock 분석 결과
 */
function getMockAnalysis(title, index) {
  const lower = title.toLowerCase()

  // 키워드 기반 간단한 분석
  if (lower.includes('발표') || lower.includes('마감') || lower.includes('내일')) {
    return {
      importance: 5,
      urgency: 5,
      estimatedMinutes: 60,
      dueDate: getTomorrow(),
      reason: '마감이 임박하고 업무 영향도가 높습니다.',
      inferredFields: ['dueDate', 'estimatedMinutes'],
    }
  }

  if (lower.includes('회의') || lower.includes('일정')) {
    return {
      importance: 4,
      urgency: 4,
      estimatedMinutes: 15,
      dueDate: undefined,
      reason: '팀 협업에 영향을 주는 업무입니다.',
      inferredFields: ['estimatedMinutes'],
    }
  }

  if (lower.includes('보고서') || lower.includes('문서')) {
    return {
      importance: 4,
      urgency: 3,
      estimatedMinutes: 45,
      dueDate: undefined,
      reason: '중요하지만 즉시 처리할 필요는 없습니다.',
      inferredFields: ['estimatedMinutes'],
    }
  }

  if (lower.includes('장보기') || lower.includes('쇼핑')) {
    return {
      importance: 2,
      urgency: 2,
      estimatedMinutes: 30,
      dueDate: undefined,
      reason: '개인 용무로 여유 있게 처리 가능합니다.',
      inferredFields: ['estimatedMinutes'],
    }
  }

  // 기본값
  return {
    importance: 3,
    urgency: 3,
    estimatedMinutes: 30,
    dueDate: undefined,
    reason: '일반적인 업무입니다.',
    inferredFields: ['importance', 'urgency', 'estimatedMinutes'],
  }
}

function getTomorrow() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
