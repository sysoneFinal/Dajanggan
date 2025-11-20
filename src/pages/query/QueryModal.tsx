import { useEffect, useRef } from "react";
import "../../styles/query/query-modal.css";

export type QueryDetail = {
  queryId: string;
  status: "안전 모드" | "실제 실행" | "추정치 (파라미터 없음)" | "추정치 (실행 불가)" | "시스템 통계 조회" | "분석 불가" | "🔄 실행 계획 분석 중..." | "⚠️ 분석 실패" | string;
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
  isSlowQuery?: boolean; // 슬로우 쿼리 여부 추가
};

type Props = {
  open: boolean;
  onClose: () => void;
  detail: QueryDetail;
};

export default function QueryModal({ open, onClose, detail }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

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

  if (!open) return null;

  // 로딩 상태 확인
  const isLoading = detail.status.includes("분석 중");
  const isError = detail.status.includes("분석 실패");
  const isUnable = detail.status === "분석 불가";

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
        {/* 헤더 */}
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
            {/* 개요 */}
            <div className="query-modal__section">
              <h3 className="query-modal__section-title">쿼리 정보</h3>
              <div className="query-modal__section-content">
                <div className="query-modal__metrics">
                  <div className="query-modal__metric-card">
                    <div className="query-modal__metric-label">평균 실행시간</div>
                    <div className="query-modal__metric-value">
                      {detail.avgExecutionTime}
                    </div>
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
                    <div className="query-modal__metric-value">
                      {detail.ioUsage}
                    </div>
                  </div>
                </div>

                <div className="query-modal__cpu-usage">
                  <div className="query-modal__cpu-label">CPU 사용량</div>
                  <div className="query-modal__cpu-bar-wrapper">
                    <div className="query-modal__cpu-bar">
                      <div
                        className="query-modal__cpu-bar-fill"
                        style={{ width: `${detail.cpuUsagePercent}%` }}
                      />
                    </div>
                    <div className="query-modal__cpu-percent">
                      {detail.cpuUsagePercent}%
                    </div>
                  </div>
                </div>

                <div className="query-modal__sql-section">
                  <h4 className="query-modal__sql-title">전체 SQL</h4>
                  <pre className="query-modal__sql-box">{detail.sqlQuery}</pre>
                </div>
              </div>
            </div>

            {/* 안전 모드 경고 - 전체 SQL 바로 밑, EXPLAIN 안 되는 경우 */}
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

            {/* 개선 제안 - 슬로우 쿼리일 때만 표시 (안전 모드 경고 밑 또는 전체 SQL 밑) */}
            {detail.isSlowQuery && detail.suggestion && !isLoading && !isError && (
              <div className="query-modal__suggestion-section">
                <h3 className="query-modal__section-title">개선 제안</h3>
                <div
                  className={`query-modal__suggestion-box ${
                    detail.suggestion.priority === "필수"
                      ? "query-modal__suggestion-box--required"
                      : "query-modal__suggestion-box--recommended"
                  }`}
                >
                  <div
                    className={`query-modal__suggestion-badge ${
                      detail.suggestion.priority === "필수"
                        ? "query-modal__suggestion-badge--required"
                        : "query-modal__suggestion-badge--recommended"
                    }`}
                  >
                    {detail.suggestion.priority}
                  </div>
                  <div className="query-modal__suggestion-desc">
                    {detail.suggestion.description}
                  </div>
                  <div className="query-modal__suggestion-code">
                    {detail.suggestion.code}
                  </div>
                </div>
              </div>
            )}

            {/* 파라미터 치환 안내 */}
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
          </section>
        </div>

        {/* 푸터 - 원래대로 복원 */}
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