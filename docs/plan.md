# PriorMap — 구현 로드맵

## 기술 스택

- React (Vite)
- HTML5 Drag & Drop API (라이브러리 없이)
- Claude API (AI 분석)
- localStorage (저장)

---

## Phase 1 — 기본 UI (0:00 ~ 0:40)

### 1-1. 프로젝트 셋업
- [ ] React + Vite 프로젝트 생성
- [ ] 기본 폴더 구조 잡기 (`components/`, `utils/`)

### 1-2. 레이아웃
- [ ] 전체 화면을 좌/우 분할 (사이드바 30% / 매트릭스 70%)
- [ ] 다크 모드 배경 적용

### 1-3. 사이드바
- [ ] 할 일 입력창 (텍스트 input)
- [ ] "+ 추가하고 자동 배치" 버튼
- [ ] 생성된 블록 목록 (카드 리스트)
- [ ] 각 카드에 제목, IMP/URG 점수, 카테고리 라벨(DO/SCHEDULE/DELEGATE/ELIMINATE) 표시
- [ ] 카드 삭제 (× 버튼)

### 1-4. 매트릭스
- [ ] 4분할 영역 (2×2)
- [ ] 각 영역에 라벨 표시 (DO · 중요+긴급 / SCHEDULE · 중요+비긴급 / DELEGATE · 비중요+긴급 / ELIMINATE · 비중요+비긴급)
- [ ] 축 라벨: Y축 = Importance(위로 갈수록 중요), X축 = Urgency(왼쪽이 긴급)

### ✅ 체크포인트 1
> 할 일을 입력하면 사이드바에 카드가 생기고, 매트릭스 4분할이 화면에 보인다.

---

## Phase 2 — 드래그 & 드롭 (0:40 ~ 1:20)

### 2-1. 카드 자유 배치
- [ ] 매트릭스 영역 안에서 카드를 자유 위치에 배치 (격자 스냅 없음)
- [ ] importance/urgency 점수를 % 좌표로 변환 → `position: absolute`
- [ ] 좌표 변환 공식: `left = (100 - urgency)%`, `top = (100 - importance)%`

### 2-2. 드래그 구현 (HTML5 Drag API)
- [ ] 사이드바 카드에 `draggable` 속성
- [ ] `onDragStart`: 드래그 중인 카드 ID 저장
- [ ] 매트릭스 영역에 `onDragOver` + `onDrop`
- [ ] drop 시 마우스 위치 → 카드 좌표 계산
- [ ] 매트릭스 내 카드도 재드래그 가능

### 2-3. 상태 구분
- [ ] 미배치 카드: 사이드바에만 표시
- [ ] 배치 완료 카드: 매트릭스에 표시 + 사이드바에서 스타일 변경 (흐리게 처리 등)

### ✅ 체크포인트 2
> 사이드바에서 카드를 드래그해서 매트릭스에 놓으면 해당 위치에 카드가 표시된다. 매트릭스 안에서 카드를 다시 드래그해서 위치를 바꿀 수 있다.

---

## Phase 3 — 저장 & 삭제 (1:20 ~ 1:40)

### 3-1. localStorage
- [ ] 카드 목록 + 좌표를 localStorage에 저장
- [ ] 새로고침 시 자동 복구
- [ ] 카드 추가/삭제/이동 시마다 저장

### 3-2. 삭제
- [ ] 사이드바 × 버튼으로 카드 삭제
- [ ] 매트릭스에서도 삭제 반영

### ✅ 체크포인트 3
> 카드를 추가하고 매트릭스에 배치한 뒤 새로고침해도 상태가 유지된다.

---

## Phase 4 — AI 연동 (1:40 ~ 2:20)

### 4-1. API 연결
- [ ] Claude API (또는 해커톤 제공 API) 호출 함수 작성
- [ ] 프롬프트: 할 일 텍스트 → `{ importance, urgency, reason }` 반환

### 4-2. 자동 배치
- [ ] 할 일 입력 → AI 분석 → 점수 기반으로 매트릭스에 자동 배치
- [ ] 로딩 상태 표시 (분석 중...)
- [ ] AI 분석 이유(reason)를 카드 hover/클릭 시 표시

### 4-3. Fallback (AI 실패 시)
- [ ] 사용자가 직접 중요도/긴급도 슬라이더로 입력
- [ ] 또는 랜덤 값으로 임시 배치

### ✅ 체크포인트 4
> "금요일까지 알고리즘 과제 제출"을 입력하면 AI가 분석하고 매트릭스의 적절한 위치에 자동으로 카드가 배치된다.

---

## Phase 5 — 뷰 토글 (2:20 ~ 2:40)

### 5-1. 리스트 뷰
- [ ] 매트릭스 중앙 토글 버튼 (매트릭스 ↔ 리스트)
- [ ] 리스트 뷰: 카드를 우선순위순(importance × urgency 또는 카테고리별)으로 정렬
- [ ] 각 카드에 카테고리 색상 유지

### ✅ 체크포인트 5
> 중앙 토글 버튼을 누르면 매트릭스 뷰와 리스트 뷰가 전환된다.

---

## Phase 6 — UI 다듬기 + 발표 준비 (2:40 ~ 3:00)

### 6-1. 디자인 마무리
- [ ] 카드 색상 통일 (DO=빨강, SCHEDULE=파랑, DELEGATE=노랑, ELIMINATE=보라)
- [ ] 빈 매트릭스일 때 안내 문구 ("할 일을 추가해보세요")
- [ ] 입력 시 로딩 애니메이션
- [ ] 카드 hover 효과

### 6-2. 발표 준비
- [ ] 데모 시나리오: 할 일 3개 입력 → AI 자동 배치 → 하나 드래그로 수정 → 리스트 뷰 전환
- [ ] 발표용 한 줄 소개: "PriorMap은 AI가 할 일의 우선순위를 분석해 시각적 매트릭스에 자동 배치하는 생산성 도구입니다."

---

## 시간 부족 시 포기 순서 (아래로 갈수록 먼저 포기)

1. ~~Phase 6 — UI 다듬기~~ → 기본 스타일로 충분
2. ~~Phase 5 — 뷰 토글~~ → 매트릭스만으로 데모 가능
3. ~~Phase 4-2 — AI 자동 배치~~ → 수동 입력 fallback 사용
4. **Phase 3 — 저장** → 반드시 유지
5. **Phase 2 — 드래그 & 드롭** → 반드시 유지
6. **Phase 1 — 기본 UI** → 반드시 유지

---

## 데이터 구조

```js
const task = {
  id: crypto.randomUUID(),
  title: "알고리즘 과제 제출",
  importance: 92,      // 0~100
  urgency: 85,         // 0~100
  category: "DO",      // DO | SCHEDULE | DELEGATE | ELIMINATE
  reason: "마감일이 가까운 학업 과제",
  placed: true,        // 매트릭스에 배치 여부
  x: 15,               // 매트릭스 내 % 좌표
  y: 8,                // 매트릭스 내 % 좌표
  createdAt: Date.now()
};
```

## 카테고리 자동 계산

```js
function getCategory(importance, urgency) {
  if (importance >= 50 && urgency >= 50) return "DO";
  if (importance >= 50 && urgency < 50)  return "SCHEDULE";
  if (importance < 50  && urgency >= 50) return "DELEGATE";
  return "ELIMINATE";
}
```

## 점수 → 매트릭스 좌표 변환

```js
function scoreToPosition(importance, urgency) {
  return {
    x: 100 - urgency,    // 왼쪽 = 긴급
    y: 100 - importance   // 위쪽 = 중요
  };
}
```