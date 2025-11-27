import { useState } from "react";
import { useLoader } from "../../context/LoaderContext";
import { analyzeQueryWithAI } from "../../api/query";
import type { QueryAnalysisResponse, QuerySuggestion, SuggestionLevel } from "../../api/suggestion";
import "/src/styles/query/query-tuner.css";

/**
 * Query Tuner 페이지 - 실제 API 연동
 * - SQL 쿼리 분석 및 최적화 제안
 * - EXPLAIN ANALYZE 실행
 * - OpenAI 기반 AI 개선 제안 (캐싱 적용)
 * 
 * 작성자: 이해든
 */

type ExecutionMode = "실제 실행" | "안전 모드";

interface ExecutionResult {
  executionTimeMs: number | null;
  planningTimeMs: number | null;
  rowsReturned?: number | null;
  ioBlocks?: number | null;
}

export default function QueryTuner() {
  const { showLoader, hideLoader } = useLoader();
  
  // State
  const [databaseId, setDatabaseId] = useState<number>(1); // TODO: 실제 DB 선택 UI와 연동
  const [sqlQuery, setSqlQuery] = useState("");
  const [executionMode, setExecutionMode] = useState<ExecutionMode | null>(null);
  const [hasExecuted, setHasExecuted] = useState(false);
  
  // 분석 결과
  const [explainPlan, setExplainPlan] = useState<string>("");
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [suggestions, setSuggestions] = useState<QuerySuggestion[]>([]);
  
  // 캐시 정보
  const [isCachedResult, setIsCachedResult] = useState<boolean>(false);
  
  // 에러 처리
  const [error, setError] = useState<string | null>(null);

  // SQL 안전성 체크 (클라이언트 측 사전 검증)
  const checkQuerySafety = (query: string): ExecutionMode => {
    const dangerousKeywords = ["DELETE", "DROP", "TRUNCATE", "UPDATE", "INSERT"];
    const upperQuery = query.toUpperCase();
    
    for (const keyword of dangerousKeywords) {
      if (upperQuery.includes(keyword)) {
        return "안전 모드";
      }
    }
    return "실제 실행";
  };

  // 실행 버튼 클릭
  const handleExecute = async () => {
    if (!sqlQuery.trim()) {
      setError("SQL 쿼리를 입력해주세요.");
      return;
    }

    try {
      showLoader("AI 기반 쿼리 분석 중...");
      setError(null);
      
      // 사전 안전성 체크
      const safety = checkQuerySafety(sqlQuery);
      setExecutionMode(safety);
      
      // API 호출: EXPLAIN ANALYZE + AI 제안
      const response = await analyzeQueryWithAI(databaseId, sqlQuery);
      
      if (response.data.success) {
        const data: QueryAnalysisResponse = response.data.data;
        
        // 실행 계획 설정
        setExplainPlan(data.explainResult.explainPlan);
        
        // 실행 결과 설정
        setExecutionResult({
          executionTimeMs: data.explainResult.executionTimeMs,
          planningTimeMs: data.explainResult.planningTimeMs,
          rowsReturned: data.explainResult.rowsReturned,
          ioBlocks: data.explainResult.ioBlocks
        });
        
        // 실행 모드 업데이트 (서버 응답 기준)
        setExecutionMode(data.explainResult.executionMode as ExecutionMode);
        
        // AI 제안 설정
        setSuggestions(data.suggestions || []);
        
        // 캐시 여부 확인
        const hasCache = data.suggestions && data.suggestions.length > 0 
          && data.suggestions[0].isFromCache === true;
        setIsCachedResult(hasCache);
        
        setHasExecuted(true);
      } else {
        setError(response.data.message || "쿼리 분석에 실패했습니다.");
      }
      
    } catch (err: any) {
      console.error("쿼리 분석 실패:", err);
      setError(
        err.response?.data?.message || 
        "쿼리 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
      );
    } finally {
      hideLoader();
    }
  };

  // 초기화 버튼 클릭
  const handleReset = () => {
    setSqlQuery("");
    setHasExecuted(false);
    setExplainPlan("");
    setExecutionResult(null);
    setSuggestions([]);
    setError(null);
    setExecutionMode(null);
    setIsCachedResult(false);
  };

  // 제안 레벨별 색상
  const getSuggestionColor = (level: SuggestionLevel): string => {
    switch (level) {
      case "높음":
        return "#EF4444";
      case "경고":
        return "#F59E0B";
      case "정보":
        return "#10B981";
    }
  };

  // 성능 개선율 계산 (소수점 2자리 표시로 수정)
  const calculatePerformance = (): { before: number; after: number; improvement: number } | null => {
    if (!executionResult?.executionTimeMs || suggestions.length === 0) {
      return null;
    }

    const beforeMs = executionResult.executionTimeMs;
    
    // 가장 높은 개선율을 가진 제안 찾기
    const maxImprovement = Math.max(
      ...suggestions
        .filter(s => s.expectedImprovementPercent)
        .map(s => s.expectedImprovementPercent!)
    );

    if (maxImprovement === -Infinity || maxImprovement === 0) {
      return null;
    }

    const afterMs = beforeMs * (1 - maxImprovement / 100);

    return {
      before: beforeMs,
      after: afterMs,
      improvement: maxImprovement
    };
  };

  const performance = calculatePerformance();

  // I/O 블록 수 추출 (Buffers에서 파싱)
  const extractIOBlocks = (plan: string): number => {
    // PostgreSQL EXPLAIN (ANALYZE, BUFFERS) 결과 파싱
    // "Buffers: shared hit=123 read=45 written=10" 형태
    let total = 0;
    
    const sharedHitMatch = plan.match(/shared\s+hit=(\d+)/i);
    const sharedReadMatch = plan.match(/shared\s+read=(\d+)/i);
    const sharedWrittenMatch = plan.match(/shared\s+written=(\d+)/i);
    const sharedDirtiedMatch = plan.match(/shared\s+dirtied=(\d+)/i);
    
    if (sharedHitMatch) total += parseInt(sharedHitMatch[1]);
    if (sharedReadMatch) total += parseInt(sharedReadMatch[1]);
    if (sharedWrittenMatch) total += parseInt(sharedWrittenMatch[1]);
    if (sharedDirtiedMatch) total += parseInt(sharedDirtiedMatch[1]);
    
    return total;
  };

  // 버퍼 히트율 계산
  const calculateBufferHitRate = (plan: string): number => {
    // PostgreSQL EXPLAIN (ANALYZE, BUFFERS) 결과에서 계산
    const sharedHitMatch = plan.match(/shared hit=(\d+)/);
    const sharedReadMatch = plan.match(/shared read=(\d+)/);
    
    const hits = sharedHitMatch ? parseInt(sharedHitMatch[1]) : 0;
    const reads = sharedReadMatch ? parseInt(sharedReadMatch[1]) : 0;
    const total = hits + reads;
    
    return total > 0 ? Math.round((hits / total) * 100) : 0;
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
              {isCachedResult && (
                <div className="qt-cache-badge">
                  💰 캐시됨 (비용 절감)
                </div>
              )}
            </div>
            <textarea
              className="qt-textarea"
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              placeholder="SELECT * FROM orders WHERE ..."
            />
            <div className="qt-editor-actions">
              <button 
                className="qt-btn qt-btn--primary" 
                onClick={handleExecute}
                disabled={!sqlQuery.trim()}
              >
                실행
              </button>
              <button 
                className="qt-btn qt-btn--secondary" 
                onClick={handleReset}
              >
                초기화
              </button>
            </div>
            
            {/* 에러 메시지 */}
            {error && (
              <div className="qt-error-message">
                 {error}
              </div>
            )}
          </section>

          {/* 실행 결과 */}
          {hasExecuted && executionResult && (
            <section className="qt-card">
              <div className="qt-card-header">
                <h3>실행 결과</h3>
                <div className="qt-execution-badges">
                  <div 
                    className={`qt-mode-badge ${
                      executionMode === "실제 실행" 
                        ? "qt-mode-badge--safe" 
                        : "qt-mode-badge--estimate"
                    }`}
                  >
                    {executionMode}
                  </div>
                </div>
              </div>

              <div className="qt-metrics-grid">
                {executionResult.executionTimeMs !== null && (
                  <div className="qt-metric">
                    <div className="qt-metric-label">실행 시간</div>
                    <div className="qt-metric-value">
                      {executionResult.executionTimeMs.toFixed(2)}
                      <span className="qt-metric-unit">ms</span>
                    </div>
                  </div>
                )}
                
                {executionResult.planningTimeMs !== null && (
                  <div className="qt-metric">
                    <div className="qt-metric-label">계획 시간</div>
                    <div className="qt-metric-value">
                      {executionResult.planningTimeMs.toFixed(2)}
                      <span className="qt-metric-unit">ms</span>
                    </div>
                  </div>
                )}
                
                <div className="qt-metric">
                  <div className="qt-metric-label">I/O 읽기</div>
                  <div className="qt-metric-value">
                    {(executionResult.ioBlocks ?? extractIOBlocks(explainPlan)).toLocaleString()}
                    <span className="qt-metric-unit">blocks</span>
                  </div>
                </div>
                
                <div className="qt-metric">
                  <div className="qt-metric-label">버퍼 히트율</div>
                  <div className="qt-metric-value">
                    {calculateBufferHitRate(explainPlan)}%
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* 실행 계획 */}
          {hasExecuted && explainPlan && (
            <section className="qt-card">
              <div className="qt-card-header">
                <h3>실행 계획 (EXPLAIN ANALYZE)</h3>
              </div>
              <div className="qt-explain-plan">
                <pre>{explainPlan}</pre>
              </div>
              
              {/* 안전모드 경고 */}
              {executionMode === "안전 모드" && (
                <div className="qt-safety-warning">
                  <div className="qt-safety-warning-icon"></div>
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
          {hasExecuted && suggestions.length > 0 && (
            <section className="qt-card">
              <div className="qt-card-header">
                <h3>AI 개선 제안</h3>
              </div>
              <div className="qt-suggestions">
                {suggestions.map((suggestion, index) => (
                  <div key={suggestion.suggestionId || index} className="qt-suggestion-card">
                    <div className="qt-suggestion-header">
                      <div
                        className="qt-suggestion-badge"
                        style={{ backgroundColor: getSuggestionColor(suggestion.suggestionLevel) }}
                      >
                        {suggestion.suggestionLevel}
                      </div>
                      <div className="qt-suggestion-title">{suggestion.suggestionTitle}</div>
                    </div>
                    
                    {suggestion.suggestionSql && (
                      <div className="qt-suggestion-code">
                        <code>{suggestion.suggestionSql}</code>
                      </div>
                    )}
                    
                    {suggestion.suggestionDescription && (
                      <div className="qt-suggestion-description">
                        {suggestion.suggestionDescription}
                      </div>
                    )}
                    
                    {suggestion.expectedImprovementPercent && (
                      <div className="qt-suggestion-improvement">
                        예상 개선: 약 {suggestion.expectedImprovementPercent}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 제안 없음 메시지 */}
          {hasExecuted && suggestions.length === 0 && (
            <section className="qt-card">
              <div className="qt-card-header">
                <h3>AI 개선 제안</h3>
              </div>
              <div className="qt-no-suggestions">
                <p>🎉 이 쿼리는 이미 최적화되어 있습니다!</p>
                <p>특별한 개선 제안이 없습니다.</p>
              </div>
            </section>
          )}

          {/* Before/After 예상 성능 (소수점 2자리로 수정) */}
          {hasExecuted && performance && (
            <section className="qt-card qt-card--performance">
              <div className="qt-card-header">
                <h3>Before / After 예상 성능</h3>
              </div>
              <div className="qt-performance">
                <div className="qt-performance-section">
                  <div className="qt-performance-label">Before</div>
                  <div className="qt-performance-value qt-performance-value--before">
                    {performance.before.toFixed(2)}ms
                  </div>
                </div>
                <div className="qt-performance-arrow">→</div>
                <div className="qt-performance-section">
                  <div className="qt-performance-label">After</div>
                  <div className="qt-performance-value qt-performance-value--after">
                    {performance.after.toFixed(2)}ms
                  </div>
                </div>
              </div>
              <div className="qt-performance-improvement">
                예상 개선율 약 {performance.improvement}%
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}