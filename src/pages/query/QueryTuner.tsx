import { useState } from "react";
import "/src/styles/query/query-tuner.css";

/**
 * Query Analysis 페이지
 * - SQL 쿼리 분석 및 최적화 제안
 * - EXPLAIN ANALYZE 실행
 * - AI 기반 개선 제안
 * 
 * @author 이해든
 */

/* ---------- 타입 ---------- */
type ExecutionMode = "safe" | "dangerous";

type ExecutionResult = {
  executionTime: string;
  ioReads: number;
  bufferHitRate: number;
  memoryUsage: string;
};

type ExplainPlan = {
  plan: string;
};

type SuggestionLevel = "필수" | "권장" | "참고";

type AISuggestion = {
  level: SuggestionLevel;
  title: string;
  description: string;
  sqlCode?: string;
  improvement?: string;
};

type PerformanceComparison = {
  before: string;
  after: string;
  improvementRate: number;
};

/* ---------- 데모 데이터 ---------- */
const demoSafeQuery = `UPDATE orders
SET status = 'completed'
WHERE order_id = 12345;`;

const demoExecutionResult: ExecutionResult = {
  executionTime: "234ms",
  ioReads: 1250,
  bufferHitRate: 85,
  memoryUsage: "48MB",
};

const demoExplainPlan: ExplainPlan = {
  plan: `└─ Seq Scan on orders (cost=0..1250) [234ms]
   └─ Filter: created_at > '2024-01-01'`,
};

const demoAISuggestions: AISuggestion[] = [
  {
    level: "필수",
    title: "created_at 컬럼에 인덱스 추가",
    description: "",
    sqlCode: "CREATE INDEX idx_orders_created ON orders(created_at);",
    improvement: "234ms → 15ms (약 93%)",
  },
  {
    level: "권장",
    title: "ORDER BY에 LIMIT 추가 고려",
    description: "필요한 행 수만 정렬하면 불필요한 정렬 비용이 크게 줄어듭니다.",
  },
  {
    level: "참고",
    title: "날짜 기준 파티셔닝 검토",
    description: "월/분기 단위 파티션으로 범위 스캔 범위를 축소하세요.",
  },
];

const demoPerformance: PerformanceComparison = {
  before: "234ms",
  after: "15ms",
  improvementRate: 93,
};

/* ---------- 메인 페이지 ---------- */
export default function QueryTuner() {
  const [sqlQuery, setSqlQuery] = useState(demoSafeQuery);
  const [executionMode, setExecutionMode] = useState<ExecutionMode>("dangerous");
  const [hasExecuted, setHasExecuted] = useState(true);

  // SQL 안전성 체크
  const checkQuerySafety = (query: string): ExecutionMode => {
    const dangerousKeywords = ["DELETE", "DROP", "TRUNCATE", "UPDATE", "INSERT"];
    const upperQuery = query.toUpperCase();
    
    for (const keyword of dangerousKeywords) {
      if (upperQuery.includes(keyword)) {
        return "dangerous";
      }
    }
    return "safe";
  };

  // 실행 버튼 클릭
  const handleExecute = () => {
    const safety = checkQuerySafety(sqlQuery);
    setExecutionMode(safety);
    setHasExecuted(true);
  };

  // 초기화 버튼 클릭
  const handleReset = () => {
    setSqlQuery("");
    setHasExecuted(false);
  };

  // 제안 레벨별 색상
  const getSuggestionColor = (level: SuggestionLevel): string => {
    switch (level) {
      case "필수":
        return "#EF4444";
      case "권장":
        return "#F59E0B";
      case "참고":
        return "#10B981";
    }
  };

  return (
    <div className="qt-root">
      {/* 메인 2열 그리드 */}
      <div className="qt-main-grid">
        {/* 왼쪽 열 */}
        <div className="qt-left-column">
          {/* SQL 입력 에디터 */}
          <section className="qt-card">
            <div className="qt-card-header">
              <h3>SQL 입력 에디터</h3>
            </div>
            <textarea
              className="qt-textarea"
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              placeholder="SELECT * FROM ..."
            />
            <div className="qt-editor-actions">
              <button className="qt-btn qt-btn--primary" onClick={handleExecute}>
                실행
              </button>
              <button className="qt-btn qt-btn--secondary" onClick={handleReset}>
                초기화
              </button>
            </div>
          </section>

          {/* 실행 결과 */}
          {hasExecuted && (
            <section className="qt-card">
              <div className="qt-card-header">
                <h3>실행 결과</h3>
                <div className="qt-execution-badges">
                  <div className={`qt-mode-badge ${executionMode === "safe" ? "qt-mode-badge--safe" : "qt-mode-badge--estimate"}`}>
                    {executionMode === "safe" ? "실제 실행" : "추정 결과"}
                  </div>
                  {executionMode === "dangerous" && (
                    <div className="qt-mode-badge qt-mode-badge--danger">
                      안전모드
                    </div>
                  )}
                </div>
              </div>

              <div className="qt-metrics-grid">
                <div className="qt-metric">
                  <div className="qt-metric-label">실행 시간</div>
                  <div className="qt-metric-value">{demoExecutionResult.executionTime}</div>
                </div>
                <div className="qt-metric">
                  <div className="qt-metric-label">I/O 읽기</div>
                  <div className="qt-metric-value">
                    {demoExecutionResult.ioReads.toLocaleString()}
                    <span className="qt-metric-unit">blocks</span>
                  </div>
                </div>
                <div className="qt-metric">
                  <div className="qt-metric-label">버퍼 히트율</div>
                  <div className="qt-metric-value">{demoExecutionResult.bufferHitRate}%</div>
                </div>
                <div className="qt-metric">
                  <div className="qt-metric-label">메모리 사용</div>
                  <div className="qt-metric-value">{demoExecutionResult.memoryUsage}</div>
                </div>
              </div>
            </section>
          )}

          {/* 실행 계획 */}
          {hasExecuted && (
            <section className="qt-card">
              <div className="qt-card-header">
                <h3>실행 계획 (EXPLAIN ANALYZE)</h3>
              </div>
              <div className="qt-explain-plan">
                <pre>{demoExplainPlan.plan}</pre>
              </div>
              
              {/* 안전모드 경고 */}
              {executionMode === "dangerous" && (
                <div className="qt-safety-warning">
                  <div className="qt-safety-warning-icon">⚠️</div>
                  <div className="qt-safety-warning-content">
                    <div className="qt-safety-warning-title">
                      데이터 변경 명령이 포함되어 있어 실제 실행 없이 추정치만 표시됩니다.
                    </div>
                    <div className="qt-safety-warning-desc">
                      UPDATE, INSERT, DELETE 쿼리는 안전을 위해 EXPLAIN만 수행합니다.
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        {/* 오른쪽 열 */}
        <div className="qt-right-column">
          {/* AI 개선 제안 */}
          {hasExecuted && (
            <section className="qt-card">
              <div className="qt-card-header">
                <h3>AI 개선 제안</h3>
              </div>
              <div className="qt-suggestions">
                {demoAISuggestions.map((suggestion, index) => (
                  <div key={index} className="qt-suggestion-card">
                    <div className="qt-suggestion-header">
                      <div
                        className="qt-suggestion-badge"
                        style={{ backgroundColor: getSuggestionColor(suggestion.level) }}
                      >
                        {suggestion.level}
                      </div>
                      <div className="qt-suggestion-title">{suggestion.title}</div>
                    </div>
                    
                    {suggestion.sqlCode && (
                      <div className="qt-suggestion-code">
                        <code>{suggestion.sqlCode}</code>
                      </div>
                    )}
                    
                    {suggestion.description && (
                      <div className="qt-suggestion-description">
                        {suggestion.description}
                      </div>
                    )}
                    
                    {suggestion.improvement && (
                      <div className="qt-suggestion-improvement">
                        예상 개선: {suggestion.improvement}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Before/After 예상 성능 */}
          {hasExecuted && (
            <section className="qt-card qt-card--performance">
              <div className="qt-card-header">
                <h3>Before / After 예상 성능</h3>
              </div>
              <div className="qt-performance">
                <div className="qt-performance-section">
                  <div className="qt-performance-label">Before</div>
                  <div className="qt-performance-value qt-performance-value--before">
                    {demoPerformance.before}
                  </div>
                </div>
                <div className="qt-performance-arrow">→</div>
                <div className="qt-performance-section">
                  <div className="qt-performance-label">After</div>
                  <div className="qt-performance-value qt-performance-value--after">
                    {demoPerformance.after}
                  </div>
                </div>
              </div>
              <div className="qt-performance-improvement">
                예상 개선율 약 {demoPerformance.improvementRate}%
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}