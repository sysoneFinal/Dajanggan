// QueryModal.tsx의 개선된 버전

import { useEffect, useRef } from "react";
import "../../styles/query/query-modal.css";

export type QueryDetail = {
  queryId: string;
  status: "안전 모드" | "실제 실행" | "🔄 실행 계획 분석 중..." | "⚠️ 분석 실패" | string;
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
                ? "query-modal__status-badge--executed"
                : isLoading
                ? "query-modal__status-badge--loading"
                : isError
                ? "query-modal__status-badge--error"
                : "query-modal__status-badge--safe"
            }`}
          >
            {detail.status}
          </div>
        </header>

        {/* 본문 */}
        <div className="query-modal__body">
          {/* 왼쪽 섹션 */}
          <section className="query-modal__left-section">
            <div className="query-modal__section">
              <h3 className="query-modal__section-title">쿼리 정보</h3>
              <div className="query-modal__section-content">
                <div className="query-modal__info-grid">
                  <div className="query-modal__info-row">
                    <span className="query-modal__info-label">평균 실행시간:</span>
                    <span className="query-modal__info-value">{detail.avgExecutionTime}</span>
                  </div>
                  <div className="query-modal__info-row">
                    <span className="query-modal__info-label">총 호출 횟수:</span>
                    <span className="query-modal__info-value">{detail.totalCalls.toLocaleString()}회</span>
                  </div>
                  <div className="query-modal__info-row">
                    <span className="query-modal__info-label">메모리 사용량:</span>
                    <span className="query-modal__info-value">{detail.memoryUsage}</span>
                  </div>
                  <div className="query-modal__info-row">
                    <span className="query-modal__info-label">I/O 사용량:</span>
                    <span className="query-modal__info-value">{detail.ioUsage}</span>
                  </div>
                </div>

                <div className="query-modal__cpu-section">
                  <div className="query-modal__cpu-header">
                    <span className="query-modal__cpu-label">CPU 사용률</span>
                  </div>
                  <div className="query-modal__cpu-bar-wrapper">
                    <div className="query-modal__cpu-bar-bg">
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

            {/* 개선 제안 */}
            {detail.suggestion && !isLoading && !isError && (
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

            {/* 안전 모드 경고 */}
            {detail.isModifyingQuery && detail.status === "안전 모드" && !isLoading && (
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
          </section>

          {/* 오른쪽 섹션 */}
          <section className="query-modal__right-section">
            <div className="query-modal__section">
              <h3 className="query-modal__section-title">
                실행 계획 (EXPLAIN {detail.status === "실제 실행" ? "ANALYZE" : ""})
              </h3>
              <div className="query-modal__section-content">
                {isLoading ? (
                  <div className="query-modal__loading-container">
                    <div className="query-modal__loading-spinner"></div>
                    <p className="query-modal__loading-text">실행 계획을 분석하고 있습니다...</p>
                  </div>
                ) : isError ? (
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

                {!isLoading && (
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
                        <span className="query-modal__stat-label">이 실행 시간:</span>
                        <span className="query-modal__stat-value">{detail.stats.totalTime}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* 푸터 */}
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