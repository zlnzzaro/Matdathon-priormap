# Priormap TRD

## 1. 문서 목적

Priormap MVP의 기술 구조와 구현 경계를 정의한다. 목표는 4시간 30분 안에 자연어 입력부터 AI 분석, Focus Now 추천, 매트릭스 수정과 승인까지 안정적으로 시연하는 것이다.

## 2. 기술 원칙

- 기존 React와 Vite 구조를 유지한다.
- 핵심 흐름을 먼저 완성하고 부가 기능은 추가하지 않는다.
- AI 응답은 자유 형식 텍스트가 아니라 검증 가능한 구조화 데이터로 받는다.
- AI가 임시 결과를 만들고 사용자가 승인한 뒤 최종 상태로 전환한다.
- 사용자의 직접 수정은 AI 재분석보다 우선한다.
- 민감한 설정과 모델 연결 정보는 소스 코드에 포함하지 않는다.
- 모든 외부 호출은 로딩, 성공, 실패 상태를 갖는다.

## 3. 논리 아키텍처

```text
React UI
  |
  | 자연어 입력 / 수정 / 승인
  v
Application API
  |
  | Copilot SDK session
  v
Task Planning Agent
  |
  +--> createTasks
  +--> updateTaskPriority
  +--> getFocusRecommendation
  |
  v
Structured Analysis Result
  |
  v
Draft Task State -> User Edit -> Approved Task State
```

프론트엔드는 분석 요청과 사용자 상호작용을 담당한다. 에이전트는 task 추출, 우선순위 분석, 도구 호출, Focus Now 추천을 오케스트레이션한다. 최종 승인 전까지 결과는 draft 상태로 관리한다.

## 4. 애플리케이션 구성

### Frontend

- React
- Vite
- 기존 `src/` 컴포넌트 구조 활용
- 입력 화면, 분석 상태 화면, Focus Now 영역, 매트릭스, 상세 편집 패널
- 매트릭스 영역 간 기본 HTML5 drag and drop 또는 현재 프로젝트에 적합한 최소 구현

### Agent Runtime

- Microsoft Agent Framework 기반 단일 `Task Planning Agent`
- GitHub Copilot SDK를 통한 모델 연결과 세션 관리
- 분석 단계 및 결과 스트리밍
- 도구 호출 결과를 구조화된 task 상태로 반영

### Hosting And Operations

- Azure App Service 또는 Static Web Apps 중 현재 프로젝트에 맞는 단일 호스팅 대상
- 모델 연결 정보는 환경 변수로 주입
- 배포 환경에서는 Azure Key Vault 사용을 고려
- Application Insights로 요청 실패와 응답 시간을 관찰

## 5. 도메인 모델

```ts
type Quadrant =
  | 'important-urgent'
  | 'important-not-urgent'
  | 'not-important-urgent'
  | 'not-important-not-urgent';

type TaskSource = 'ai' | 'user';

type Task = {
  id: string;
  title: string;
  description: string;
  dueDate?: string;
  estimatedMinutes?: number;
  importance: number;
  urgency: number;
  quadrant: Quadrant;
  recommendationReason?: string;
  inferredFields: string[];
  source: TaskSource;
  userModified: boolean;
};

type PlanningDraft = {
  tasks: Task[];
  focusNowTaskId?: string;
  status: 'idle' | 'analyzing' | 'success' | 'error' | 'approved';
  currentStep?: string;
  errorMessage?: string;
};
```

점수의 정밀한 알고리즘은 MVP에서 만들지 않는다. 에이전트가 구조화된 중요도·긴급도와 추천 근거를 반환하고, 화면은 그 결과를 일관되게 표현한다.

## 6. 에이전트 계약

### Agent Input

```ts
type PlanningRequest = {
  rawInput: string;
  existingTasks?: Task[];
};
```

### Agent Output

```ts
type PlanningResponse = {
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    dueDate?: string;
    estimatedMinutes?: number;
    importance: number;
    urgency: number;
    quadrant: Quadrant;
    recommendationReason?: string;
    inferredFields: string[];
  }>;
  focusNowTaskId: string;
};
```

응답 검증 규칙:

- `tasks`는 배열이어야 한다.
- task마다 `id`, `title`, `importance`, `urgency`, `quadrant`가 있어야 한다.
- `importance`와 `urgency`는 정해진 범위의 숫자여야 한다.
- `quadrant`는 허용된 네 값 중 하나여야 한다.
- `focusNowTaskId`는 반환된 task 중 하나를 가리켜야 한다.
- 검증 실패 시 결과를 화면에 반영하지 않고 오류 상태로 전환한다.

## 7. 도구 설계

### `createTasks`

자연어 분석 결과로 생성된 task를 draft 목록에 추가한다. 이 도구는 승인 전 임시 상태만 변경한다.

### `updateTaskPriority`

사용자의 드래그 앤 드롭 또는 상세 편집 결과를 반영한다. 사용자 수정 여부를 `userModified: true`로 기록한다.

### `getFocusRecommendation`

현재 draft task 목록을 받아 Focus Now task ID와 추천 근거를 반환한다. `userModified`가 true인 task의 매트릭스 위치와 수정 필드는 재계산으로 덮어쓰지 않는다.

## 8. 상태 머신

```text
idle
  -> analyzing
  -> success
  -> approved

analyzing -> error
error -> analyzing
success -> success (user edit / drag and drop)
success -> approved (user approval)
```

분석 단계의 표시 상태:

1. `extracting`: 할 일을 추출하고 있습니다.
2. `scoring`: 마감일과 영향도를 분석하고 있습니다.
3. `recommending`: Focus Now를 선정하고 있습니다.
4. `placing`: 매트릭스에 배치하고 있습니다.
5. `awaiting-confirmation`: 사용자 확인을 기다리고 있습니다.

스트리밍 이벤트가 끊기거나 순서가 바뀌어도 마지막으로 유효한 상태를 유지하고, 완료 이벤트가 없으면 오류 또는 재시도 상태로 전환한다.

## 9. 입력 파싱 정책

MVP 입력창은 쉼표로 task를 구분하도록 안내한다. 클라이언트에서 단순 분리한 값을 바로 확정하지 않고, 자연어 전체를 에이전트에 전달해 task 경계를 최종 판단하게 한다.

- 앞뒤 공백을 제거한다.
- 빈 task는 제거한다.
- 원문에 쉼표가 포함된 경우 모델의 구조화 결과를 우선한다.
- 추출 결과는 AI 분석 결과로 표시한다.

## 10. 사용자 편집과 우선순위 규칙

- AI가 처음 배치한 task는 `userModified: false`다.
- 사용자가 카드를 다른 영역으로 옮기면 해당 task의 `quadrant`를 즉시 변경하고 `userModified: true`로 표시한다.
- 사용자가 상세정보를 저장하면 변경된 필드만 사용자 수정값으로 기록한다.
- AI 재분석 시 사용자 수정 필드는 보존한다.
- 사용자가 승인하기 전까지 draft 상태를 유지한다.
- 승인 후 결과를 현재 화면의 최종 task 상태로 확정한다.

## 11. 매트릭스 드래그 앤 드롭

MVP 지원 범위:

- 네 영역 사이의 task 이동
- 드래그 중 대상 영역 강조
- 드롭 성공 후 quadrant 갱신
- 사용자 수정 상태 표시
- 키보드 또는 편집 패널을 통한 대체 수정 경로

MVP 제외 범위:

- 영역 내부 순서 정렬
- 다중 선택 이동
- 터치 기기에서의 고급 제스처
- 드래그 중 서버 저장

## 12. 상세 편집 패널

필드:

- 제목: 필수 문자열
- 상세 내용: 선택 문자열
- 마감일: 선택 ISO 날짜
- 예상 소요 시간: 0보다 큰 분 단위 정수
- 중요도: 정의된 범위의 정수
- 긴급도: 정의된 범위의 정수

저장 시 로컬 draft 상태를 먼저 갱신하고, 승인 시점에 최종 상태로 전환한다. 취소 시 해당 카드의 마지막 저장값을 유지한다.

## 13. 오류 처리

- 빈 입력: 분석 요청을 보내지 않고 입력 안내 표시
- 네트워크 오류: 재시도 버튼과 오류 메시지 표시
- 모델 응답 오류: 구조화 응답 검증 후 안전하게 실패 처리
- Focus Now 누락: 결과를 확정하지 않고 재분석 제공
- 잘못된 날짜 또는 점수: 해당 필드를 추정값 또는 편집 가능 상태로 표시
- 스트리밍 중단: 마지막 상태와 재시도 동작 유지

## 14. 보안과 개인정보

- API 키와 모델 연결 정보는 `.env` 또는 Azure 비밀 관리에 둔다.
- 비밀 정보를 클라이언트 번들에 포함하지 않는다.
- task 원문을 불필요하게 로그에 기록하지 않는다.
- Application Insights에는 식별 가능한 task 내용 대신 상태, 응답 시간, 오류 유형을 기록한다.
- 분석 결과는 AI 생성 결과임을 UI에 표시한다.

## 15. 관찰 가능성

최소 측정 항목:

- 분석 요청 횟수
- 분석 성공·실패 횟수
- 모델 응답 시간
- 구조화 응답 검증 실패 횟수
- 사용자가 AI 추천을 수정한 횟수
- 승인까지 걸린 시간

task 제목, 상세 내용 등 개인정보가 될 수 있는 값은 텔레메트리에 포함하지 않는다.

## 16. 구현 순서

1. 기존 UI에 입력 화면과 분석 결과 상태를 연결한다.
2. mock 구조화 응답으로 Focus Now와 매트릭스 렌더링을 먼저 완성한다.
3. 카드 클릭 상세 편집과 영역 간 드래그 앤 드롭을 연결한다.
4. Copilot SDK와 Task Planning Agent를 연결한다.
5. 스트리밍 상태, 오류 처리, 승인 흐름을 추가한다.
6. 최소 Azure 배포와 환경 변수 설정을 검증한다.

AI 연결이 지연되더라도 UI와 사용자 편집 흐름을 먼저 검증할 수 있도록 mock 응답 경계를 유지한다.

## 17. 기술적 비목표

- 데이터베이스 스키마와 장기 저장
- 인증 및 권한 시스템
- 실시간 협업
- 외부 생산성 서비스 동기화
- 복잡한 우선순위 최적화 알고리즘
- 멀티 에이전트 구조
