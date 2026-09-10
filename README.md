# PriorMap

> **"지금 뭐부터 하지?"를 AI가 대신 결정해주는 개인 생산성 도구**

할 일이 쏟아질 때 가장 먼저 해야 할 일 **하나**를 추천하고, 나머지는 아이젠하워 매트릭스에 자동 배치합니다.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![GitHub Copilot SDK](https://img.shields.io/badge/GitHub_Copilot_SDK-black?logo=github)
![Azure App Service](https://img.shields.io/badge/Azure_App_Service-0078D4?logo=microsoft-azure)

## 문제 인식

기존 Todo 앱은 할 일을 **기록**하는 데는 도움을 주지만, 여러 작업 중 **지금 무엇부터 해야 하는지** 결정하는 과정은 지원하지 못합니다.

Priormap은 자연어로 입력된 여러 할 일을 AI가 분석해 **Focus Now**(가장 먼저 처리할 작업 1개)를 추천합니다. 추천 이유를 함께 제시하고, 최종 판단은 사용자에게 남깁니다.

### Target User
- 하루에 여러 업무와 요청을 동시에 처리하는 **스타트업 실무자**
- 마감이 촉박한 **해커톤 참가자**
- 회의/메신저/문서에서 생긴 할 일을 정리하기 어려운 사람

---

##  주요 기능

| 기능 | 설명 |
|------|------|
| **자연어 입력** | 여러 할 일을 쉼표로 구분하거나 자연스러운 문장으로 입력 |
| **AI 우선순위 분석** | 마감일, 영향도, 예상 소요 시간을 바탕으로 중요도/긴급도 분석 |
| **Focus Now 추천** | 가장 먼저 처리할 작업 1개와 추천 이유 제시 |
| **아이젠하워 매트릭스** | 나머지 작업을 4분면에 자동 배치 |
| **드래그 앤 드롭** | 사용자가 직접 작업을 다른 영역으로 이동 |
| **상세 편집** | 제목, 마감일, 예상 시간, 중요도/긴급도 수정 |
| **사용자 승인** | AI 결과를 사용자가 확인 후 최종 확정 |

---

##  기술 스택

### GitHub Copilot SDK & Agent Framework

```
React UI
  │
  │ 자연어 입력 / 수정 / 승인
  ▼
Application API (Express)
  │
  │ Copilot SDK session
  ▼
Task Planning Agent
  │
  ├─▶ createTasks          (할 일 추출 및 생성)
  ├─▶ updateTaskPriority   (우선순위 조정)
  └─▶ getFocusRecommendation (Focus Now 계산)
  │
  ▼
Structured Analysis Result → User Edit → Approved State
```

- **GitHub Copilot SDK** (`@github/copilot-sdk`): 모델 연결, 세션 관리, 분석 단계 스트리밍
- **defineTool**: 구조화된 도구 호출로 task 생성/수정/추천 오케스트레이션
- **Zod 스키마**: AI 응답을 검증 가능한 구조화 데이터로 처리

### Azure 클라우드 통합

| 서비스 | 용도 |
|--------|------|
| **Azure App Service** | 프론트엔드 + 백엔드 통합 호스팅 |
| **Application Insights** | 요청 추적, 오류 모니터링, 성능 관찰 |
| **Log Analytics** | 로그 집계 및 분석 |
| **azd (Azure Developer CLI)** | 반복 가능한 배포 자동화 |
| **Bicep** | 인프라 코드화 (IaC) |

### 프론트엔드

- React 18 + Vite
- HTML5 Drag and Drop API
- CSS Modules

---

##  빠른 시작

### 로컬 실행

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정 (.env)
cp .env

# 3. 프론트엔드 + 백엔드 동시 실행
npm run dev:all
```

### 환경 변수

```env
COPILOT_MODEL=claude-opus-4
PORT=3001
```

> GitHub 토큰은 `gh auth login`으로 인증하거나, 환경 변수로 별도 설정하기

---

##  Azure 배포

### azd를 이용한 배포

```bash
# Azure Developer CLI 로그인
azd auth login

# 환경 초기화 및 배포
azd up
```

### 배포 아키텍처

```
Azure Subscription
└── Resource Group (rg-priormap)
    ├── App Service Plan
    ├── App Service (프론트엔드 + API)
    ├── Application Insights
    └── Log Analytics Workspace
```

---

## 🤖 책임 있는 AI

| 원칙 | 구현 |
|------|------|
| **투명성** | AI가 생성한 작업과 추천에 `AI 추천` 라벨 표시 |
| **설명 가능성** | Focus Now 추천 이유를 항상 함께 제시 |
| **추정값 명시** | 입력에 근거가 없는 마감일/소요 시간은 "추정" 표시 |
| **사용자 통제** | 승인 전까지 결과를 최종 확정하지 않음 |
| **수정 우선** | 사용자의 직접 수정은 AI 재분석보다 우선 |
| **오류 복구** | 분석 실패 시 재시도 동작 제공 |

---

##  프로젝트 구조

```
priormap/
├── src/                    # React 프론트엔드
│   ├── components/         # UI 컴포넌트
│   ├── api/                # API 호출 레이어
│   ├── types/              # 타입 정의
│   └── utils/              # 유틸리티 함수
├── server/                 # Express 백엔드
│   └── index.js            # Copilot SDK 연동 API
├── infra/                  # Azure 인프라 (Bicep)
│   ├── main.bicep
│   └── modules/
└── azure.yaml              # azd 배포 설정
```
