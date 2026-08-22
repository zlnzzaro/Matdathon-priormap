import { analyzeTasks as analyzeTasksMock } from './mockPlanningApi'

async function analyzeTasksWithServer(rawInput) {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawInput }),
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const message = data?.error || `AI 분석 요청 실패 (${response.status})`
    const err = new Error(message)
    err.status = response.status
    throw err
  }

  return data
}

async function runVisualSteps(onStep) {
  const steps = [
    '할 일을 추출하고 있습니다...',
    '마감일과 영향도를 분석하고 있습니다...',
    'Focus Now를 선정하고 있습니다...',
    '매트릭스에 배치하고 있습니다...',
  ]

  for (const message of steps) {
    onStep(message)
    // 실서버 호출 중에도 사용자에게 단계 피드백을 주기 위한 짧은 UI 스텝
    await new Promise((resolve) => setTimeout(resolve, 180))
  }
}

/**
 * 실 AI 우선 + 실패 시 Mock 폴백
 * @param {string} rawInput
 * @param {(step: string) => void} [onStep]
 */
export async function analyzeTasks(rawInput, onStep = () => {}) {
  const trimmed = String(rawInput || '').trim()
  if (!trimmed) {
    throw new Error('입력에서 할 일을 찾을 수 없습니다.')
  }

  await runVisualSteps(onStep)

  try {
    return await analyzeTasksWithServer(trimmed)
  } catch (error) {
    // 데모 안정성을 위해 서버 미기동/키 미설정/일시 오류 시 Mock 결과로 폴백
    const fallbackStatuses = [404, 500, 502, 503]
    if (error?.status && fallbackStatuses.includes(error.status)) {
      console.warn('[planningApi] server analyze failed, fallback to mock:', error.message)
      return analyzeTasksMock(trimmed, onStep)
    }

    if (error instanceof TypeError) {
      console.warn('[planningApi] network error, fallback to mock:', error.message)
      return analyzeTasksMock(trimmed, onStep)
    }

    throw error
  }
}
