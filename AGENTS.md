# Priormap Agents

## 주의
절대 .env 파일을 커밋하거나 github에 업로드하지 마세요.

## 개요

Priormap은 Microsoft Agent Framework를 기반으로 한 **Task Planning Agent**를 통해 사용자의 자연어 입력을 우선순위가 지정된 작업으로 변환합니다.

## 에이전트

### Task Planning Agent

**목적**: 사용자가 입력한 할 일을 분석하여 아이젠하워 매트릭스에 자동으로 배치하고, Focus Now 작업을 추천합니다.

**입력**: 자연어 텍스트 (쉼표 또는 줄바꿈 구분)
**출력**: PlanningResponse 객체

```javascript
{
  tasks: [
    {
      id: string,
      title: string,
      description: string,
      dueDate?: string,
      estimatedMinutes?: number,
      importance: number,      // 1-5
      urgency: number,         // 1-5
      quadrant: string,
      recommendationReason?: string,
      inferredFields: string[],
      source: 'ai' | 'user',
      userModified: boolean
    }
  ],
  focusNowTaskId: string
}
```

## 도구 (Tools)

### 1. createTasks
- **역할**: 자연어를 분석하여 구조화된 task 객체 배열 생성
- **입력**: 
  - `rawInput: string` - 사용자의 자연어 입력
  - `existingTasks?: Task[]` - 기존 작업 목록
- **출력**: `Task[]` - 생성된 작업 목록
- **예시**:
  ```
  입력: "발표 자료 작성, 팀원에게 일정 보내기, 장보기"
  출력: 3개의 Task 객체 배열
  ```

### 2. updateTaskPriority
- **역할**: Task의 중요도/긴급도 점수 업데이트 및 quadrant 재계산
- **입력**:
  - `taskId: string`
  - `importance: number` (1-5)
  - `urgency: number` (1-5)
- **출력**: 업데이트된 `Task`

### 3. getFocusRecommendation
- **역할**: 모든 작업을 분석하여 지금 가장 먼저 처리해야 할 작업 반환
- **입력**: `tasks: Task[]`
- **출력**: `{ taskId: string, reason: string }`
- **로직**:
  - importance + urgency 점수가 가장 높은 작업 선택
  - 또는 dueDate가 가장 임박한 작업 우선

## 워크플로우

```
사용자 입력
    ↓
InputScreen (입력 수집)
    ↓
Task Planning Agent 호출
    ├─→ createTasks (자연어 분석)
    ├─→ updateTaskPriority (우선순위 계산)
    └─→ getFocusRecommendation (Focus Now 선정)
    ↓
PlanningResponse 검증
    ├─→ 모든 task가 필수 필드 포함
    ├─→ importance/urgency 범위 확인 (1-5)
    └─→ focusNowTaskId가 tasks에 존재
    ↓
UI 업데이트 (Focus Now + Matrix)
```

## 상태 머신

```
idle (입력 대기)
  ↓
analyzing (분석 중)
  ├─→ extracting: 할 일 추출 중
  ├─→ scoring: 중요도/긴급도 분석 중
  ├─→ recommending: Focus Now 선정 중
  └─→ placing: 매트릭스 배치 중
  ↓
success (분석 완료)
  ├→ 결과 화면 표시
  └→ 사용자 수정 대기
  ↓
approved (사용자 확인)
  ↓
idle (새 분석 가능)
```

## 컨텍스트 처리

에이전트는 다음을 고려합니다:

- **마감일 추론**: "내일", "이번 주", "3일 후" → ISO 날짜로 변환
- **예상 소요 시간**: 키워드 분석 ("회의" → 15분, "보고서" → 45분 등)
- **팀 협업 영향도**: "회의", "공유", "검토" 포함 시 urgency 상향
- **사용자 수정 이력**: 재분석 시 userModified 속성 추적

## 설정 및 초기화

### 현재 (Mock API)

```javascript
import { analyzeTasks } from './api/mockPlanningApi'

const response = await analyzeTasks(rawInput, (step) => {
  console.log(`현재 단계: ${step}`)
})

const validation = validatePlanningResponse(response)
if (!validation.valid) {
  console.error('검증 실패:', validation.error)
}
```

### 환경 변수 (향후 Copilot SDK 통합 시)

```env
VITE_COPILOT_SDK_KEY=...       # Copilot SDK 키
```

## 사용 예시

### 예시 1: 단순 할 일 목록

```
입력: "발표 자료 작성, 이메일 회신, 보고서 검토"
분석:
  - createTasks: 3개 task 생성
  - updateTaskPriority: 각각 우선순위 계산
    • "발표 자료 작성" → importance: 5, urgency: 4 (DO 사분면)
    • "이메일 회신" → importance: 2, urgency: 3 (DELEGATE)
    • "보고서 검토" → importance: 4, urgency: 2 (SCHEDULE)
  - getFocusRecommendation: "발표 자료 작성" 선택
결과:
  ✅ Focus Now: "발표 자료 작성"
  📊 Matrix에 3개 task 배치
```

### 예시 2: 자연어 문장

```
입력: "내일 회의가 있고, 그 전에 슬라이드를 완성해야 하고, 
       팀원들에게 공유하는 것도 잊으면 안 돼"
분석:
  - createTasks: 3개 task 추출
    • "슬라이드 완성" (dueDate: 내일)
    • "회의 준비"
    • "팀원에게 공유"
  - updateTaskPriority:
    • "슬라이드 완성" → importance: 5, urgency: 5, dueDate 인식
    • "회의 준비" → importance: 4, urgency: 4
    • "팀원에게 공유" → importance: 4, urgency: 4 (팀 협업 감지)
  - getFocusRecommendation: "슬라이드 완성" 선택 (마감 임박 + 중요도 최고)
결과:
  ✅ Focus Now: "슬라이드 완성" (⏱️ 내일, 📍 DO 사분면)
  📊 나머지 2개 task도 Matrix 배치
```

## 테스트

### 로컬 개발 환경

```bash
cd C:\Projects\priormap
npm run dev
# http://localhost:5174 접속
```

**테스트 입력 제안:**

```
1. 단순 목록: "발표 자료 작성, 팀원에게 일정 보내기, 장보기"
2. 자연어: "내일 발표가 있는데 자료가 아직 안 돼"
3. 혼합: "보고서 초안, 이번 주 회의 예정 짜기, 커피 구매"
```

**기대 동작:**

1. InputScreen에서 입력 후 "우선순위 분석하기" 클릭
2. 4단계 애니메이션 표시 (약 2초)
   - "할 일을 추출하고 있습니다..."
   - "마감일과 영향도를 분석하고 있습니다..."
   - "Focus Now를 선정하고 있습니다..."
   - "매트릭스에 배치하고 있습니다..."
3. Focus Now 배너 + 아이젠하워 매트릭스 화면 표시
4. Sidebar에서 새 할일 추가 가능

### 단위 테스트 (향후)

```javascript
// tests/planning.test.js
import { validatePlanningResponse, calculateQuadrant } from '../src/types/planning'
import { analyzeTasks } from '../src/api/mockPlanningApi'

describe('Task Planning', () => {
  it('should validate correct PlanningResponse', () => {
    const response = {
      tasks: [{ id: '1', title: 'Test', importance: 3, urgency: 3, quadrant: 'important-urgent' }],
      focusNowTaskId: '1'
    }
    const result = validatePlanningResponse(response)
    expect(result.valid).toBe(true)
  })

  it('should extract multiple tasks from input', async () => {
    const response = await analyzeTasks('Task 1, Task 2, Task 3')
    expect(response.tasks.length).toBe(3)
    expect(response.focusNowTaskId).toBeDefined()
  })

  it('should calculate correct quadrant', () => {
    expect(calculateQuadrant(4, 5)).toBe('important-urgent')
    expect(calculateQuadrant(2, 1)).toBe('not-important-not-urgent')
  })
})
```

## 향후 개선사항

- [ ] **Copilot SDK 통합**: gpt-4-turbo 모델로 실제 자연어 분석
- [ ] **Microsoft Agent Framework**: 공식 agent 오케스트레이션 사용
- [ ] **멀티 턴 대화**: "이 작업의 마감일을 내일로 바꿔줘" 같은 추가 명령
- [ ] **Task 수정/삭제 후 자동 재분석**: userModified 플래그 기반
- [ ] **사용자 선호도 학습**: 자주 DO 사분면에 놓는 작업 패턴 분석
- [ ] **백그라운드 스케줄러 에이전트**: 미리 설정된 반복 작업 관리
- [ ] **음성 입력**: "Hey Copilot, 내일 회의 있어" → 음성을 텍스트로 변환
- [ ] **팀 협업**: 타 사용자의 Focus Now 공유 및 의존성 추적

## 관련 파일

- **Type 정의**: `src/types/planning.js`
- **Mock API**: `src/api/mockPlanningApi.js`
- **UI 컴포넌트**: `src/components/InputScreen.jsx`, `App.jsx`
- **PRD**: `PRD.md`
- **TRD**: `TRD.md`
- **아이디어**: `ideation.md`
