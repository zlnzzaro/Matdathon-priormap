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
      confidence: mockData.confidence,
      missingSignals: mockData.missingSignals,
      scoringSignals: mockData.scoringSignals,
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
      : `중요도 ${focusTask.importance}/5, 긴급도 ${focusTask.urgency}/5로 우선 처리 권장합니다.`
  }

  return { tasks, focusNowTaskId }
}

/**
 * task 제목에 따른 mock 분석 결과
 */
function getMockAnalysis(title, index) {
  const lower = title.toLowerCase()

  const hasTodaySignal = /오늘|지금|바로|곧|금일/.test(lower)
  const hasTomorrowSignal = /내일/.test(lower)
  const hasDayAfterTomorrowSignal = /모레|이틀\s*뒤|2일\s*뒤/.test(lower)
  const hasTodayOrDayAfterAmbiguousSignal = /오늘\s*아니면\s*모레|오늘\s*또는\s*모레/.test(lower)
  const hasDeadlineSignal = /마감|데드라인|기한/.test(lower)
  const hasDueBySignal = /까지|전까지/.test(lower)
  const hasMeetingPrepSignal = /(미팅|회의).*(준비)|준비.*(미팅|회의)/.test(lower)
  const hasHighImpactSignal = /발표|고객|면접|데모|출시|리뷰/.test(lower)
  const hasMailSignal = /메일|이메일|mail/.test(lower)
  const hasProfessorSignal = /교수|교수님/.test(lower)

  const timeUrgencyScore = hasTodayOrDayAfterAmbiguousSignal
    ? 3
    : hasTodaySignal
      ? 5
      : hasTomorrowSignal
        ? 4
        : hasDayAfterTomorrowSignal
          ? 3
          : 0

  if (hasMailSignal && hasProfessorSignal && (hasTomorrowSignal || hasDayAfterTomorrowSignal || hasDueBySignal)) {
    return {
      importance: 4,
      urgency: timeUrgencyScore || 3,
      estimatedMinutes: 20,
      dueDate: hasTomorrowSignal ? getDateOffset(1) : hasDayAfterTomorrowSignal ? getDateOffset(2) : undefined,
      reason: '대외 커뮤니케이션 성격의 작업이며 마감 표현이 있어 중요도는 높고 긴급도는 중간 이상으로 판단했습니다.',
      inferredFields: ['dueDate', 'estimatedMinutes', 'importance', 'urgency'],
      confidence: 'high',
      missingSignals: [],
      scoringSignals: ['마감 신호(내일/모레/까지)', '수신자 신호(교수님)', '업무 신호(메일)'],
    }
  }

  // "오늘 바로 미팅 준비" 같은 케이스 보정
  if (hasMeetingPrepSignal && hasTodaySignal) {
    return {
      importance: 4,
      urgency: 5,
      estimatedMinutes: 35,
      dueDate: undefined,
      reason: '오늘 바로 필요한 준비 작업이라 긴급도가 높고, 일정 영향으로 중요도도 높게 판단했습니다.',
      inferredFields: ['estimatedMinutes', 'importance', 'urgency'],
      confidence: 'medium',
      missingSignals: ['meetingImpact'],
      scoringSignals: ['시간 신호(오늘/바로)', '미팅 준비 신호'],
    }
  }

  // 키워드 기반 간단한 분석
  if (lower.includes('발표') || hasDeadlineSignal || hasTomorrowSignal || hasDayAfterTomorrowSignal || hasDueBySignal) {
    return {
      importance: 5,
      urgency: timeUrgencyScore || 4,
      estimatedMinutes: 60,
      dueDate: hasTodaySignal
        ? getDateOffset(0)
        : hasTomorrowSignal
          ? getDateOffset(1)
          : hasDayAfterTomorrowSignal
            ? getDateOffset(2)
            : getDateOffset(1),
      reason: '마감이 임박하고 업무 영향도가 높습니다.',
      inferredFields: ['dueDate', 'estimatedMinutes'],
      confidence: 'high',
      missingSignals: [],
      scoringSignals: ['마감 신호(내일/모레/까지)', '영향 신호(발표/마감)'],
    }
  }

  if (lower.includes('회의') || lower.includes('일정') || lower.includes('미팅')) {
    return {
      importance: 4,
      urgency: 4,
      estimatedMinutes: 15,
      dueDate: undefined,
      reason: '팀 협업에 영향을 주는 업무입니다.',
      inferredFields: ['estimatedMinutes'],
      confidence: 'medium',
      missingSignals: ['meetingImpact'],
      scoringSignals: ['협업 일정 신호'],
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
      confidence: 'medium',
      missingSignals: [],
      scoringSignals: ['문서 작업 신호'],
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
      confidence: 'high',
      missingSignals: [],
      scoringSignals: ['개인 용무 신호'],
    }
  }

  if (lower.includes('낮잠') || lower.includes('휴식')) {
    const isCritical = /피곤|졸림|두통|집중|컨디션|회복|잠이 안/.test(lower)

    if (isCritical) {
      return {
        importance: 4,
        urgency: hasTodaySignal ? 4 : hasTomorrowSignal ? 3 : 2,
        estimatedMinutes: 25,
        dueDate: undefined,
        reason: '컨디션 회복이 오늘 업무 성과에 직접 영향을 줄 수 있어 중요도를 높게 반영했습니다.',
        inferredFields: ['estimatedMinutes', 'importance'],
        confidence: 'medium',
        missingSignals: ['deadlineContext'],
        scoringSignals: ['건강/회복 신호'],
      }
    }
  }

  if (hasTodaySignal || hasHighImpactSignal) {
    return {
      importance: hasHighImpactSignal ? 4 : 3,
      urgency: hasTodaySignal ? 4 : 3,
      estimatedMinutes: 30,
      dueDate: undefined,
      reason: '시간 또는 영향 신호가 일부 확인되어 중간 이상 우선순위로 판단했습니다.',
      inferredFields: ['importance', 'urgency', 'estimatedMinutes'],
      confidence: 'medium',
      missingSignals: hasHighImpactSignal ? ['deadlineContext'] : ['impactContext'],
      scoringSignals: [
        hasTodaySignal ? '시간 신호(오늘/바로)' : '시간 신호 부족',
        hasHighImpactSignal ? '영향 신호' : '영향 신호 부족',
      ],
    }
  }

  // 기본값
  return {
    importance: 3,
    urgency: 3,
    estimatedMinutes: 30,
    dueDate: undefined,
    reason: '상황 정보가 부족해 중립 우선순위로 임시 분류했습니다.',
    inferredFields: ['importance', 'urgency', 'estimatedMinutes'],
    confidence: 'low',
    missingSignals: ['deadlineContext', 'impactContext'],
    scoringSignals: ['시간 신호 부족', '영향 신호 부족'],
  }
}

function getTomorrow() {
  return getDateOffset(1)
}

function getDateOffset(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
