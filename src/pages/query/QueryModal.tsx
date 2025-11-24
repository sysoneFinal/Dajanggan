import { useEffect, useRef, useState } from "react";
import { analyzeQueryWithAI } from "../../api/query";
import type { QuerySuggestion } from "../../api/suggestion";
import "../../styles/query/query-modal.css";

export type QueryDetail = {
  queryId: string;
  status: "안전 모드" | "실제 실행" | "추정치 (파라미터 없음)" | "추정치 (실행 불가)" | "시스템 통계 조회" | "분석 불가" | "🔄 실행 계획 분석 중..." | " 분석 실패" | string;
  avgExecutionTime: string;
  totalCalls: number;
  memoryUsage: string;
  ioUsage: string;
  cpuUsagePercent: number;
  sqlQuery: string;
  suggestion?: {
    priority: "필수" | "권장";
    description: string;
    code: string;
  };
  explainResult: string;
  stats: {
    min: string;
    avg: string;
    max: string;
    stdDev: string;
    totalTime: string;
  };
  isModifyingQuery?: boolean;
  isSlowQuery?: boolean;
  databaseId?: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  detail: QueryDetail;
};

export default function QueryModal({ open, onClose, detail }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  
  // AI 제안 상태
  const [aiSuggestions, setAiSuggestions] = useState<QuerySuggestion[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  // 슬로우 쿼리 판단 및 AI 분석 자동 실행
  useEffect(() => {
    if (!open || !detail.databaseId) {
      setAiSuggestions([]);
      setAiError(null);
      return;
    }

    const avgTimeStr = detail.avgExecutionTime;
    let avgTimeMs = parseFloat(avgTimeStr.replace(/[^0-9.]/g, ""));
    
    if (avgTimeStr.includes("초")) {
      avgTimeMs = avgTimeMs * 1000;
    }
    
    const isSlowQuery = detail.isSlowQuery || avgTimeMs > 1000;

    if (!isSlowQuery) {
      setAiSuggestions([]);
      setAiError(null);
      return;
    }

    const fetchAISuggestions = async () => {
      setIsLoadingAI(true);
      setAiError(null);
      setAiSuggestions([]);
      
      try {
        const response = await analyzeQueryWithAI(detail.databaseId!, detail.sqlQuery);

        if (response.data.success && response.data.data) {
          const suggestions = response.data.data.suggestions || [];
          setAiSuggestions(suggestions);
        } else {
          throw new Error("AI 분석 응답이 올바르지 않습니다.");
        }
      } catch (error: any) {
        setAiError(error.response?.data?.message || "AI 분석에 실패했습니다.");
      } finally {
        setIsLoadingAI(false);
      }
    };

    fetchAISuggestions();
  }, [open, detail.databaseId, detail.sqlQuery, detail.avgExecutionTime, detail.isSlowQuery]);

  if (!open) return null;

  const isLoading = detail.status.includes("분석 중");
  const isError = detail.status.includes("분석 실패");
  const isUnable = detail.status === "분석 불가";

  const avgTimeStr = detail.avgExecutionTime;
  let avgTimeMs = parseFloat(avgTimeStr.replace(/[^0-9.]/g, ''));
  
  if (avgTimeStr.includes("초")) {
    avgTimeMs = avgTimeMs * 1000;
  }
  
  const isSlowQuery = detail.isSlowQuery || avgTimeMs > 1000;

  return (
    <div
      className="query-modal__backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="query-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="query-modal-title"
        ref={dialogRef}
      >
        <header className="query-modal__header">
          <h2 id="query-modal-title" className="query-modal__title">
            {detail.queryId}
          </h2>
          <div
            className={`query-modal__status-badge ${
              detail.status === "실제 실행"
                ? "query-modal__status-badge--analyze"
                : detail.status === "시스템 통계 조회"
                ? "query-modal__status-badge--system"
                : detail.status.includes("추정치")
                ? "query-modal__status-badge--estimate"
                : detail.status === "분석 불가"
                ? "query-modal__status-badge--error"
                : isLoading
                ? "query-modal__status-badge--loading"
                : isError
                ? "query-modal__status-badge--error"
                : "query-modal__status-badge--explain"
            }`}
          >
            {detail.status}
          </div>
        </header>

        <div className="query-modal__content">
          {/* 왼쪽 섹션 */}
          <section className="query-modal__left-section">
            <div className="query-modal__section">
              <h3 className="query-modal__section-title">쿼리 정보</h3>
              <div className="query-modal__section-content">
                <div className="query-modal__metrics">
                  <div className="query-modal__metric-card">
                    <div className="query-modal__metric-label">평균 실행시간</div>
                    <div className={`query-modal__metric-value ${isSlowQuery ? 'query-modal__metric-value--slow' : ''}`}>
                      {detail.avgExecutionTime}
                    </div>
                    {isSlowQuery && (
                      <span className="query-modal__slow-badge-modern"> SLOW</span>
                    )}
                  </div>
                  <div className="query-modal__metric-card">
                    <div className="query-modal__metric-label">총 호출 횟수</div>
                    <div className="query-modal__metric-value">
                      {detail.totalCalls.toLocaleString()}회
                    </div>
                  </div>
                  <div className="query-modal__metric-card">
                    <div className="query-modal__metric-label">메모리 사용</div>
                    <div className="query-modal__metric-value">
                      {detail.memoryUsage}
                    </div>
                  </div>
                  <div className="query-modal__metric-card">
                    <div className="query-modal__metric-label">I/O 사용</div>
                    <div className="query-modal__metric-value">{detail.ioUsage}</div>
                  </div>
                </div>

                <div className="query-modal__sql-section">
                  <h4 className="query-modal__sql-title">SQL 쿼리</h4>
                  <pre className="query-modal__sql-box">{detail.sqlQuery}</pre>
                </div>
              </div>
            </div>

            {(detail.status === "안전 모드" || detail.isModifyingQuery || isUnable) && !isLoading && (
              <div className="query-modal__warning-box">
                <svg className="query-modal__warning-icon" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="query-modal__warning-content">
                  <div className="query-modal__warning-title">
                    데이터 변경 명령이 포함되어 있어 실제 실행 없이 추정치만 표시됩니다.
                  </div>
                  <div className="query-modal__warning-desc">
                    UPDATE, INSERT, DELETE 쿼리는 안전을 위해 EXPLAIN만 수행됩니다.
                  </div>
                </div>
              </div>
            )}

            {detail.status.includes("추정치") && !isLoading && !isUnable && (
              <div className="query-modal__info-box">
                <svg className="query-modal__info-icon" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="query-modal__info-content">
                  <div className="query-modal__info-title">
                    이 쿼리는 실제로 실행하지 않고 추정한 실행 계획입니다.
                  </div>
                  <div className="query-modal__info-desc">
                    {detail.status === "추정치 (파라미터 없음)" 
                      ? "pg_stat_statements에 저장된 정규화 쿼리($1, $2 등)는 실제 값이 없어 NULL로 치환하여 실행 계획을 생성했습니다. 실제 값과 다를 수 있으니 참고용으로만 사용하세요."
                      : "DML 쿼리, 파라미터 포함 쿼리, 복잡한 시스템 쿼리 등은 EXPLAIN ANALYZE를 실행할 수 없어 추정치만 제공됩니다. 참고용으로만 사용하세요."}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* 오른쪽 섹션 */}
          <section className="query-modal__right-section">
            <div className="query-modal__section">
              <h3 className="query-modal__section-title">
                {detail.status === "시스템 통계 조회" 
                  ? "쿼리 실행 결과"
                  : `실행 계획 (EXPLAIN ${detail.status === "실제 실행" ? "ANALYZE" : ""})`}
              </h3>
              <div className="query-modal__section-content">
                {isLoading ? (
                  <div className="query-modal__loading-container">
                    <div className="query-modal__loading-spinner"></div>
                    <p className="query-modal__loading-text">실행 계획을 분석하고 있습니다...</p>
                  </div>
                ) : isError || isUnable ? (
                  <div className="query-modal__error-container">
                    <svg className="query-modal__error-icon" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <pre className="query-modal__explain-box query-modal__explain-box--error">
                      {detail.explainResult}
                    </pre>
                  </div>
                ) : (
                  <pre className="query-modal__explain-box">{detail.explainResult}</pre>
                )}

                {!isLoading && !isUnable && (detail.status === "실제 실행" || detail.status === "시스템 통계 조회") && (
                  <div className="query-modal__stats-section">
                    <h4 className="query-modal__stats-title">실행 시간 통계</h4>
                    <div className="query-modal__stats-list">
                      <div className="query-modal__stat-row">
                        <span className="query-modal__stat-label">최소:</span>
                        <span className="query-modal__stat-value">{detail.stats.min}</span>
                      </div>
                      <div className="query-modal__stat-row">
                        <span className="query-modal__stat-label">평균:</span>
                        <span className="query-modal__stat-value">{detail.stats.avg}</span>
                      </div>
                      <div className="query-modal__stat-row">
                        <span className="query-modal__stat-label">최대:</span>
                        <span className="query-modal__stat-value query-modal__stat-value--danger">
                          {detail.stats.max}
                        </span>
                      </div>
                      <div className="query-modal__stat-row">
                        <span className="query-modal__stat-label">표준편차:</span>
                        <span className="query-modal__stat-value">{detail.stats.stdDev}</span>
                      </div>
                      <div className="query-modal__stat-row">
                        <span className="query-modal__stat-label">총 시간:</span>
                        <span className="query-modal__stat-value">{detail.stats.totalTime}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/*  AI 개선 제안 - 오른쪽으로 이동 */}
            {isSlowQuery && !isLoading && !isError && (
              <div className="query-modal__ai-section-right">
                <h3 className="query-modal__ai-section-title">
                  🤖 AI 성능 개선 제안
                </h3>
                
                {isLoadingAI ? (
                  <div className="query-modal__ai-loading">
                    <div className="query-modal__loading-spinner"></div>
                    <p>AI가 쿼리를 분석하고 있습니다...</p>
                  </div>
                ) : aiError ? (
                  <div className="query-modal__ai-error">
                     {aiError}
                  </div>
                ) : aiSuggestions.length > 0 ? (
                  <div className="query-modal__ai-cards">
                    {aiSuggestions.map((suggestion, index) => (
                      <div 
                        key={suggestion.suggestionId || index} 
                        className={`query-modal__ai-card ${
                          suggestion.suggestionLevel === "높음" 
                            ? "query-modal__ai-card--high" 
                            : suggestion.suggestionLevel === "경고" 
                            ? "query-modal__ai-card--warning" 
                            : "query-modal__ai-card--info"
                        }`}
                      >
                        <div className="query-modal__ai-card-header">
                          <div className="query-modal__ai-card-badges">
                            <span className={`query-modal__ai-badge query-modal__ai-badge--${
                              suggestion.suggestionLevel === "높음" ? "high" :
                              suggestion.suggestionLevel === "경고" ? "warning" : "info"
                            }`}>
                              {suggestion.suggestionLevel === "높음" ? "🔴 필수" :
                               suggestion.suggestionLevel === "경고" ? "🟡 경고" : "🟢 권장"}
                            </span>
                            <span className="query-modal__ai-type">
                              {suggestion.suggestionType}
                            </span>
                          </div>
                          {suggestion.expectedImprovementPercent && (
                            <span className="query-modal__ai-improvement">
                              🟢 {suggestion.expectedImprovementPercent}% 개선예상
                            </span>
                          )}
                        </div>
                        
                        <h4 className="query-modal__ai-card-title">
                          {suggestion.suggestionTitle}
                        </h4>
                        
                        <p className="query-modal__ai-card-desc">
                          {suggestion.suggestionDescription}
                        </p>
                        
                        {suggestion.suggestionSql && suggestion.suggestionSql !== "N/A" && (
                          <div className="query-modal__ai-sql">
                            <div className="query-modal__ai-sql-header">
                              <span>개선된 쿼리</span>
                              <button 
                                className="query-modal__ai-copy"
                                onClick={() => navigator.clipboard.writeText(suggestion.suggestionSql!)}
                              >
                                📋 복사
                              </button>
                            </div>
                            <pre className="query-modal__ai-sql-code">{suggestion.suggestionSql}</pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="query-modal__ai-empty">
                    AI가 이 쿼리에 대한 최적화 제안을 생성하지 못했습니다.
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        <footer className="query-modal__footer">
          <button
            ref={closeBtnRef}
            className="query-modal__close-btn"
            onClick={onClose}
            disabled={isLoading}
          >
            {isLoading ? "분석 중..." : "닫기"}
          </button>
        </footer>
      </div>
    </div>
  );
}