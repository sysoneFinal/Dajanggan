# Dajanggan - 데이터베이스 모니터링 플랫폼

Dajanggan은 데이터베이스 성능 모니터링, 세션 관리, 이벤트 로그 분석 등을 제공하는 통합 모니터링 플랫폼입니다.

## 주요 기능

### 📊 대시보드 및 시각화
- 사용자 정의 가능한 대시보드 (드래그 앤 드롭 위젯 레이아웃)
- 실시간 데이터베이스 성능 메트릭 시각화
- 데이터베이스별 상세 현황 조회

### 🔍 세션 관리
- 활성 세션 목록 조회 및 모니터링
- 세션 필터링 (DB, 상태, 대기 유형, 쿼리 유형)
- 데드락 감지 및 상세 정보 조회
- CSV 내보내기 기능

### 📈 쿼리 성능 분석
- TPS/QPS 차트 (12시간 추이)
- 리소스 사용률 모니터링 (CPU, Memory, Disk I/O)
- Top-N 쿼리 조회 (메모리, CPU, I/O, 실행시간 기준)
- 슬로우 쿼리 감지 및 EXPLAIN ANALYZE 실행 계획 분석
- 쿼리 최적화 제안

### 📝 이벤트 로그
- 모든 데이터베이스 이벤트 기록 조회
- 시간대, 레벨, 카테고리별 필터링
- 요약 정보 (전체, 정상, 경고, 위험)
- CSV 내보내기

### 🧹 VACUUM 유지보수
- Dead Tuple 및 테이블 Bloat 분석
- Autovacuum 동작 모니터링
- VACUUM 이력 조회 (최근 7일)
- Vacuum 관련 위험 요소 분석

### 💾 시스템 리소스 모니터링
- **CPU**: CPU 사용률, Load Average, Wait Event 분포
- **Memory**: 메모리 사용률 모니터링
- **Disk**: 디스크 I/O 및 사용률 추이
- Backend 프로세스 현황 및 연결 상태 분석

### ⚙️ 데이터베이스 엔진 모니터링
- Background Writer (BGWriter) 성능 분석
- Checkpoint 관련 메트릭
- Buffer 재사용률 및 Flush 비율

### 🚨 알람 및 알림
- 알람 규칙 생성/편집/삭제
- 다중 레벨 설정 (INFO, WARN, CRITICAL)
- 임계값 기반 자동 트리거
- Slack 채널 연동 및 실시간 알람 피드

### 🖥️ 인스턴스 관리
- PostgreSQL 인스턴스 등록/편집/삭제
- 인스턴스별 데이터베이스 관리
- 상태 및 가동시간 모니터링

## 기술 스택

- **Frontend Framework**: React 18 + TypeScript
- **Build Tool**: Vite 7
- **상태 관리**: React Context + TanStack Query
- **UI 라이브러리**: Emotion (CSS-in-JS)
- **테이블**: TanStack React Table
- **차트**: ApexCharts
- **API Client**: Axios
- **라우팅**: React Router v6

## 시작하기

### 설치

```bash
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

Vite 개발 서버가 시작되며 HMR(Hot Module Replacement)이 활성화됩니다.

### 빌드

```bash
npm run build
```

프로덕션용 최적화된 번들을 생성합니다.

### 린트 검사

```bash
npm run lint
```

ESLint를 이용한 코드 품질 검사를 수행합니다.

## 프로젝트 구조

```
src/
├── components/                   # 재사용 가능한 UI 컴포넌트
│   ├── chart/                   # 차트 컴포넌트
│   │   ├── ChartComponent.tsx   # 라인/바 차트
│   │   ├── GaugeChart.tsx       # 게이지 차트
│   │   └── CircleGaugeChart.tsx # 원형 게이지
│   ├── dashboard/               # 대시보드 관련 컴포넌트
│   │   ├── DashboardEditor.tsx  # 대시보드 편집 모드
│   │   ├── WidgetRenderer.tsx   # 위젯 렌더링
│   │   ├── InstanceSelector.tsx # 인스턴스 선택기
│   │   └── DatabaseList.tsx     # 데이터베이스 목록
│   ├── layout/                  # 레이아웃 컴포넌트
│   │   ├── Header.tsx           # 상단 헤더
│   │   ├── Sidebar.tsx          # 사이드바
│   │   ├── ChartGridLayout.tsx  # 차트 그리드 레이아웃
│   │   ├── DbDropdown.tsx       # DB 드롭다운
│   │   └── SidebarMenu.ts       # 사이드바 메뉴 정의
│   ├── session/                 # 세션 관련 컴포넌트
│   │   ├── SessionDetailModal.tsx # 세션 상세 정보 모달
│   │   └── DeadlockModal.tsx    # 데드락 정보 모달
│   └── util/                    # 유틸리티 컴포넌트
│       ├── WidgetCard.tsx       # 위젯 카드
│       ├── SummaryCard.tsx      # 요약 정보 카드
│       ├── MultiSelectDropdown.tsx # 다중 선택 드롭다운
│       ├── CsvButton.tsx        # CSV 내보내기 버튼
│       └── Pagination.tsx       # 페이지네이션
├── pages/                        # 페이지 컴포넌트
│   ├── Home.tsx                 # 홈 페이지
│   ├── dashboard/               # 대시보드 페이지
│   │   ├── Overview.tsx         # 대시보드 오버뷰
│   │   └── DatabaseOverview.tsx # 데이터베이스 오버뷰
│   ├── session/                 # 세션 페이지
│   │   ├── SessionListPage.tsx  # 세션 목록
│   │   └── SessionDashboard.tsx # 세션 대시보드
│   ├── query/                   # 쿼리 분석 페이지
│   │   ├── QueryOverview.tsx    # 쿼리 오버뷰
│   │   ├── QueryTuner.tsx       # 쿼리 튜너
│   │   ├── ExecutionStatus.tsx  # 실행 상태
│   │   └── QueryModal.tsx       # 쿼리 상세 정보 모달
│   ├── eventlog/                # 이벤트 로그 페이지
│   │   └── EventLogPage.tsx     # 이벤트 로그
│   ├── vacuum/                  # VACUUM 유지보수 페이지
│   │   ├── VacuumMaintenance.tsx # VACUUM 유지보수
│   │   ├── VacuumBloat.tsx      # Bloat 분석
│   │   ├── VacuumBloatDetail.tsx # Bloat 상세
│   │   ├── VacuumRisk.tsx       # 위험 분석
│   │   ├── VacuumDetailPage.tsx # VACUUM 상세
│   │   └── VacuumTableMenu.tsx  # 테이블 메뉴
│   ├── system/                  # 시스템 모니터링 페이지
│   │   ├── CpuPage.tsx          # CPU 상세
│   │   ├── CpuListPage.tsx      # CPU 목록
│   │   ├── MemoryPage.tsx       # 메모리 상세
│   │   ├── MemoryListPage.tsx   # 메모리 목록
│   │   ├── DiskPage.tsx         # 디스크 상세
│   │   └── DiskListPage.tsx     # 디스크 목록
│   ├── engine/                  # 엔진 모니터링 페이지
│   │   ├── BGWriterPage.tsx     # BGWriter 상세
│   │   ├── BGWriterListPage.tsx # BGWriter 목록
│   │   ├── CheckPointPage.tsx   # Checkpoint 상세
│   │   └── CheckPointListPage.tsx # Checkpoint 목록
│   ├── alarm/                   # 알람 설정 페이지
│   │   ├── AlarmList.tsx        # 알람 규칙 목록
│   │   ├── AlarmRuleModal.tsx   # 알람 규칙 생성
│   │   ├── AlarmRuleEditModal.tsx # 알람 규칙 편집
│   │   ├── AlarmRuleDetailModal.tsx # 알람 규칙 상세
│   │   ├── AlarmFeedModal.tsx   # 알람 피드
│   │   └── SlackSetting.tsx     # Slack 연동 설정
│   ├── instance/                # 인스턴스 관리 페이지
│   │   ├── InstancePage.tsx     # 인스턴스 목록
│   │   ├── InstanceRegister.tsx # 인스턴스 등록
│   │   └── InstanceEdit.tsx     # 인스턴스 편집
│   └── guide/                   # 가이드 페이지
│       └── SetUpGuide.tsx       # 설정 가이드
├── api/                          # API 클라이언트
│   ├── apiClient.ts             # Axios 인스턴스 설정
│   ├── instance.ts              # 인스턴스 API
│   ├── query.ts                 # 쿼리 API
│   ├── queryagg.ts              # 쿼리 집계 API
│   └── suggestion.ts            # 제안 API
├── context/                      # React Context (상태 관리)
│   ├── InstanceContext.tsx      # 인스턴스/DB 선택 상태
│   ├── DashboardContext.tsx     # 대시보드 상태
│   ├── LoaderContext.tsx        # 로딩 상태
│   └── OsMetricSseContext.tsx   # OS 메트릭 SSE 스트림
├── types/                        # TypeScript 타입 정의
│   ├── instance.ts              # 인스턴스 타입
│   ├── database.ts              # 데이터베이스 타입
│   ├── metricDefinition.ts      # 메트릭 정의 타입
│   ├── databaseMetricsAgg.ts    # 집계 메트릭 타입
│   └── dashboard.d.ts           # 대시보드 관련 타입
├── utils/                        # 유틸리티 함수
│   ├── formatDateTime.ts        # 날짜/시간 포맷팅
│   ├── formatRunTime.ts         # 실행 시간 포맷팅
│   └── time.ts                  # 시간 관련 유틸
├── routes/                       # 라우팅 설정
│   └── index.tsx                # 라우트 정의
├── App.tsx                       # 메인 앱 컴포넌트
├── main.tsx                      # 진입점
└── index.css                     # 글로벌 스타일
```
