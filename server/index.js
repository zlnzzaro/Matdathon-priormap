import express from 'express'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { CopilotClient, defineTool, approveAll } from '@github/copilot-sdk'
import { z } from 'zod'

dotenv.config()

// Application Insights 초기화 (production에서만)
async function initAppInsights() {
  if (!process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) return
  try {
    const appInsights = await import('applicationinsights')
    appInsights.default
      .setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
      .setAutoCollectConsole(true)
      .setAutoCollectExceptions(true)
      .setAutoCollectRequests(true)
      .start()
    console.log('✅ Application Insights initialized')
  } catch (err) {
    console.warn('⚠️ Application Insights initialization failed:', err.message)
  }
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const port = Number(process.env.PORT || 3001)
const model = process.env.COPILOT_MODEL || 'gpt-4o'

app.use(express.json({ limit: '1mb' }))

// GitHub Token 확인 (환경변수: GITHUB_TOKEN, GH_TOKEN, COPILOT_GITHUB_TOKEN 중 하나)
const githubToken = process.env.COPILOT_GITHUB_TOKEN || process.env.GITHUB_TOKEN || process.env.GH_TOKEN
const hasGitHubToken = Boolean(githubToken)

// Copilot SDK 클라이언트 생성
let copilotClient = null

async function initCopilotClient() {
  if (!hasGitHubToken) {
    console.log('⚠️ GitHub token not found. AI features disabled.')
    return
  }
  
  try {
    copilotClient = new CopilotClient({
      gitHubToken: githubToken,
    })
    await copilotClient.start()
    console.log('✅ Copilot SDK client initialized')
  } catch (error) {
    console.error('❌ Failed to initialize Copilot SDK:', error.message)
    copilotClient = null
  }
}

const ALLOWED_QUADRANTS = [
  'important-urgent',
  'important-not-urgent',
  'not-important-urgent',
  'not-important-not-urgent',
]

const ALLOWED_CONFIDENCE = ['high', 'medium', 'low']

// === 도구 정의 (Copilot SDK의 defineTool 사용) ===

const createTasksTool = defineTool('createTasks', {
  description: '자연어 입력에서 여러 할 일을 추출해 task 목록을 생성합니다. 각 task에는 제목, 설명, 마감일, 예상 소요 시간, 중요도(1-5), 긴급도(1-5)를 포함합니다.',
  parameters: z.object({
    tasks: z.array(z.object({
      id: z.string().describe('task 고유 ID (예: task-1)'),
      title: z.string().describe('작업 제목'),
      description: z.string().optional().describe('상세 설명'),
      dueDate: z.string().optional().describe('마감일 (YYYY-MM-DD 형식)'),
      estimatedMinutes: z.number().optional().describe('예상 소요 시간(분)'),
      importance: z.number().min(1).max(5).describe('중요도 (1-5)'),
      urgency: z.number().min(1).max(5).describe('긴급도 (1-5)'),
      recommendationReason: z.string().optional().describe('이 우선순위를 부여한 이유'),
      inferredFields: z.array(z.string()).optional().describe('추정한 필드 목록'),
      confidence: z.enum(['high', 'medium', 'low']).optional().describe('분석 신뢰도'),
      missingSignals: z.array(z.string()).optional().describe('부족한 판단 신호'),
    })).describe('추출된 task 목록'),
  }),
  skipPermission: true,
  handler: async ({ tasks }) => {
    const normalizedTasks = tasks.map((task, index) => normalizeTask(task, index))
    return { success: true, tasks: normalizedTasks }
  },
})

const updateTaskPriorityTool = defineTool('updateTaskPriority', {
  description: '특정 task의 우선순위(중요도/긴급도)를 업데이트합니다.',
  parameters: z.object({
    taskId: z.string().describe('업데이트할 task의 ID'),
    importance: z.number().min(1).max(5).optional().describe('새 중요도 (1-5)'),
    urgency: z.number().min(1).max(5).optional().describe('새 긴급도 (1-5)'),
    reason: z.string().optional().describe('변경 이유'),
  }),
  skipPermission: true,
  handler: async ({ taskId, importance, urgency, reason }) => {
    return {
      success: true,
      taskId,
      updates: { importance, urgency },
      reason: reason || '사용자 요청에 따라 우선순위를 조정했습니다.',
    }
  },
})

const getFocusRecommendationTool = defineTool('getFocusRecommendation', {
  description: 'task 목록을 분석해 지금 가장 먼저 해야 할 Focus Now 작업 1개와 추천 근거를 계산합니다.',
  parameters: z.object({
    tasks: z.array(z.object({
      id: z.string(),
      title: z.string().optional(),
      importance: z.number(),
      urgency: z.number(),
      estimatedMinutes: z.number().optional(),
    })).describe('분석할 task 목록'),
  }),
  skipPermission: true,
  handler: async ({ tasks }) => {
    if (!tasks || tasks.length === 0) {
      return { success: false, error: 'task 목록이 비어 있습니다.' }
    }

    const sorted = [...tasks].sort((a, b) => {
      if (b.importance !== a.importance) return b.importance - a.importance
      if (b.urgency !== a.urgency) return b.urgency - a.urgency
      return (a.estimatedMinutes || 999) - (b.estimatedMinutes || 999)
    })

    const focusTask = sorted[0]
    return {
      success: true,
      focusNowTaskId: focusTask.id,
      focusNowTitle: focusTask.title,
      reason: `중요도(${focusTask.importance})와 긴급도(${focusTask.urgency})가 가장 높아 먼저 처리하는 것이 좋습니다.`,
    }
  },
})

// 사용할 도구 목록
const tools = [createTasksTool, updateTaskPriorityTool, getFocusRecommendationTool]

// 시스템 메시지 (Agent 역할 정의)
const systemMessage = {
  content: `당신은 개인 생산성 코치입니다.
사용자가 여러 할 일을 자연어로 입력하면 다음 단계를 수행하세요:

1. createTasks 도구를 호출해 입력에서 task를 추출합니다.
2. 각 task의 마감일, 영향도, 예상 소요 시간을 분석해 중요도와 긴급도를 1-5 점수로 계산합니다.
3. getFocusRecommendation 도구를 호출해 Focus Now 작업 1개를 선정합니다.

규칙:
- "오늘", "바로", "곧", "지금" 등 시간 신호가 있으면 긴급도를 높게 판단합니다.
- "발표", "고객", "데모", "출시", "마감" 등 영향 신호가 있으면 중요도를 높게 판단합니다.
- 입력에 명시되지 않은 값은 추정값으로 표시합니다.
- 한국어로 응답합니다.
- 분석이 끝나면 반드시 createTasks를 호출해 결과를 반환하세요.`,
}

// === 유틸리티 함수 ===

function clampScore(value) {
  const num = Number(value)
  if (Number.isNaN(num)) return 3
  return Math.max(1, Math.min(5, Math.round(num)))
}

function normalizeTask(task, index) {
  let importance = clampScore(task.importance)
  let urgency = clampScore(task.urgency)
  const text = `${task.title || ''} ${task.description || ''}`.toLowerCase()
  const scoringSignals = []

  // 시간 신호 감지
  const hasTodaySignal = /오늘|지금|바로|곧|금일/.test(text)
  const hasTomorrowSignal = /내일/.test(text)
  const hasDayAfterTomorrowSignal = /모레|이틀\s*뒤|2일\s*뒤/.test(text)

  if (hasTodaySignal) {
    urgency = Math.max(urgency, 5)
    scoringSignals.push('시간 신호(오늘/바로)')
  } else if (hasTomorrowSignal) {
    urgency = Math.max(urgency, 4)
    scoringSignals.push('시간 신호(내일)')
  } else if (hasDayAfterTomorrowSignal) {
    urgency = Math.max(urgency, 3)
    scoringSignals.push('시간 신호(모레)')
  }

  // 영향 신호 감지
  if (/발표|고객|데모|출시|마감|면접/.test(text)) {
    importance = Math.min(5, importance + 1)
    scoringSignals.push('영향 신호(발표/고객/마감)')
  }

  // 회의 준비 신호
  if (/(미팅|회의).*(준비)|준비.*(미팅|회의)/.test(text)) {
    urgency = Math.min(5, urgency + 1)
    scoringSignals.push('미팅 준비 신호')
  }

  // missingSignals 정규화
  const missingSignals = Array.isArray(task.missingSignals)
    ? task.missingSignals.filter((v) => typeof v === 'string' && v.trim())
    : []

  // confidence 정규화
  let confidence = typeof task.confidence === 'string' ? task.confidence.toLowerCase() : 'medium'
  if (!ALLOWED_CONFIDENCE.includes(confidence)) {
    confidence = 'medium'
  }
  if (missingSignals.length >= 2 && confidence === 'high') {
    confidence = 'medium'
  }

  // quadrant 계산
  const midpoint = 3
  const isImportant = importance > midpoint
  const isUrgent = urgency > midpoint
  let quadrant
  if (isImportant && isUrgent) quadrant = 'important-urgent'
  else if (isImportant && !isUrgent) quadrant = 'important-not-urgent'
  else if (!isImportant && isUrgent) quadrant = 'not-important-urgent'
  else quadrant = 'not-important-not-urgent'

  return {
    id: typeof task.id === 'string' && task.id.trim() ? task.id : `task-${Date.now()}-${index}`,
    title: String(task.title || '').trim() || `Task ${index + 1}`,
    description: typeof task.description === 'string' ? task.description : '',
    dueDate: typeof task.dueDate === 'string' && task.dueDate.trim() ? task.dueDate : undefined,
    estimatedMinutes:
      typeof task.estimatedMinutes === 'number' && task.estimatedMinutes > 0
        ? Math.round(task.estimatedMinutes)
        : undefined,
    importance,
    urgency,
    quadrant,
    recommendationReason:
      typeof task.recommendationReason === 'string' && task.recommendationReason.trim()
        ? task.recommendationReason
        : '시간 신호와 업무 영향도를 기반으로 우선순위를 추정했습니다.',
    inferredFields: Array.isArray(task.inferredFields)
      ? task.inferredFields.filter((v) => typeof v === 'string')
      : [],
    confidence,
    missingSignals,
    scoringSignals,
    source: 'ai',
    userModified: false,
  }
}

// === API 엔드포인트 ===

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, model, hasGitHubToken, sdk: 'github-copilot-sdk' })
})

/**
 * 스트리밍 분석 엔드포인트 (SSE)
 * Copilot SDK 스트리밍으로 분석 단계를 실시간 전달
 */
app.post('/api/analyze/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const sendEvent = (type, data) => {
    res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`)
  }

  let session = null

  try {
    const rawInput = String(req.body?.rawInput || '').trim()
    if (!rawInput) {
      sendEvent('error', { message: 'rawInput is required' })
      return res.end()
    }

    if (!copilotClient) {
      sendEvent('error', { message: 'GITHUB_TOKEN is not configured' })
      return res.end()
    }

    // 단계 1: task 추출 시작
    sendEvent('step', { step: 'extracting', message: 'task 추출 중...' })

    // 세션 생성 (도구 포함)
    session = await copilotClient.createSession({
      model,
      tools,
      systemMessage,
      streaming: true,
      onPermissionRequest: approveAll,
    })

    let tasks = []
    let focusNowTaskId = null

    // 이벤트 핸들러 설정
    session.on('tool.execution_start', (event) => {
      const toolName = event.data?.toolName
      if (toolName === 'createTasks') {
        sendEvent('step', { step: 'analyzing', message: '우선순위 판단 중...' })
      } else if (toolName === 'getFocusRecommendation') {
        sendEvent('step', { step: 'focusing', message: 'Focus Now 계산 중...' })
      }
    })

    session.on('tool.execution_complete', (event) => {
      const toolName = event.data?.toolName
      const result = event.data?.result
      if (toolName === 'createTasks' && result?.tasks) {
        tasks = result.tasks
      }
      if (toolName === 'getFocusRecommendation' && result?.focusNowTaskId) {
        focusNowTaskId = result.focusNowTaskId
      }
    })

    // 메시지 전송 및 완료 대기
    await session.sendAndWait({ prompt: rawInput })

    // 완료
    sendEvent('complete', { tasks, focusNowTaskId })
    
    await session.disconnect()
    res.end()
  } catch (error) {
    sendEvent('error', { message: error.message || 'AI 분석 중 오류가 발생했습니다.' })
    if (session) {
      try { await session.disconnect() } catch {}
    }
    res.end()
  }
})

/**
 * 일반 분석 엔드포인트 (기존 호환)
 */
app.post('/api/analyze', async (req, res) => {
  let session = null
  
  try {
    const rawInput = String(req.body?.rawInput || '').trim()
    if (!rawInput) {
      return res.status(400).json({ error: 'rawInput is required' })
    }

    if (!copilotClient) {
      return res.status(503).json({ error: 'GITHUB_TOKEN is not configured' })
    }

    // 세션 생성 (도구 포함)
    session = await copilotClient.createSession({
      model,
      tools,
      systemMessage,
      onPermissionRequest: approveAll,
    })

    let tasks = []
    let focusNowTaskId = null

    // 도구 실행 완료 이벤트에서 결과 수집
    session.on('tool.execution_complete', (event) => {
      const toolName = event.data?.toolName
      const result = event.data?.result
      if (toolName === 'createTasks' && result?.tasks) {
        tasks = result.tasks
      }
      if (toolName === 'getFocusRecommendation' && result?.focusNowTaskId) {
        focusNowTaskId = result.focusNowTaskId
      }
    })

    // 메시지 전송 및 완료 대기
    await session.sendAndWait({ prompt: rawInput })

    // 세션 정리
    await session.disconnect()

    // 도구 호출이 없거나 실패한 경우 fallback
    if (tasks.length === 0) {
      return res.status(502).json({ error: 'Agent did not produce valid task output' })
    }

    if (!focusNowTaskId && tasks.length > 0) {
      const sorted = [...tasks].sort((a, b) => {
        if (b.importance !== a.importance) return b.importance - a.importance
        return b.urgency - a.urgency
      })
      focusNowTaskId = sorted[0].id
    }

    return res.json({ tasks, focusNowTaskId })
  } catch (error) {
    if (session) {
      try { await session.disconnect() } catch {}
    }
    const status = error?.status || 500
    const message = error?.message || 'Failed to analyze tasks with AI provider'
    return res.status(status).json({ error: message })
  }
})

// 정적 파일 서빙 (프론트엔드 빌드 결과물)
const distPath = join(__dirname, '..', 'dist')
app.use(express.static(distPath))

// SPA 라우팅 - API가 아닌 모든 요청은 index.html로
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next()
  }
  res.sendFile(join(distPath, 'index.html'))
})

// 서버 시작
async function startServer() {
  await initAppInsights()
  await initCopilotClient()
  
  app.listen(port, () => {
    console.log(`[priormap-server] listening on http://localhost:${port}`)
    console.log(`[priormap-server] model=${model}`)
    console.log(`[priormap-server] SDK: GitHub Copilot SDK`)
    console.log(`[priormap-server] Static files: ${distPath}`)
    if (!hasGitHubToken) {
      console.warn('[priormap-server] GITHUB_TOKEN is missing; /api/analyze will return 503')
    }
  })
}

startServer().catch(console.error)
