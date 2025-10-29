import { useEffect, useRef } from "react";
import "../../styles/session/deadlock-modal.css";

export type DeadlockDetail = {
  detectedAt: string;            // "2025-10-14 14:32:18"
  dbName: string;                // "post1-db"
  tableName: string;             // "public.users"
  lockType: string;              // "RowExclusiveLock ↔ ShareLock"
  durationMs: number;            // 1220
  blocker: {
    pid: number;                 // 18423
    user: string;                // "analyst"
    query: string;               // "UPDATE orders SET status='DONE' WHERE id=10;"
  };
  blocked: {
    pid: number;                 // 19501
    user: string;                // "app_user"
    query: string;               // "DELETE FROM orders WHERE id=10;"
  };
  endedInfo: string;             // "종료된 세션: 19501 (자동 ROLLBACK)"
  repeats24h?: number;           // 3
};

type Props = {
  open: boolean;
  onClose: () => void;
  detail: DeadlockDetail;
};

export default function DeadlockModal({ open, onClose, detail }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // ESC 닫기 + 바디 스크롤 잠금
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // 초기 포커스
    closeBtnRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="deadlock-modal__backdrop"
      onMouseDown={(e) => {
        // 내용 영역 밖 클릭 시 닫기
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="deadlock-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="deadlock-modal-title"
        ref={dialogRef}
      >
        {/* 헤더 */}
        <header className="deadlock-modal__header">
          <h2 id="deadlock-modal-title" className="deadlock-modal__title">
            Deadlock Detected
          </h2>
          <div className="deadlock-modal__timestamp">
            {detail.detectedAt}
          </div>
        </header>

        {/* 상단 정보 카드 */}
        <section className="deadlock-modal__topcards">
          <div className="deadlock-modal__card">
            <div className="deadlock-modal__label">DB</div>
            <div className="deadlock-modal__value">{detail.dbName}</div>
          </div>
          <div className="deadlock-modal__card">
            <div className="deadlock-modal__label">Table</div>
            <div className="deadlock-modal__value">{detail.tableName}</div>
          </div>
        </section>

        {/* 본문: 세션 관계 다이어그램 + 텍스트 */}
        <section className="deadlock-modal__graph">
          <div className="deadlock-modal__lane">
            <div className="deadlock-modal__lane-head deadlock-modal__lane-head--blocker">
              차단 세션
            </div>
            <div className="deadlock-modal__lane-meta">
              <span className="deadlock-modal__pid">PID: {detail.blocker.pid}</span>
              <span className="deadlock-modal__user">user: {detail.blocker.user}</span>
            </div>
            <pre className="deadlock-modal__query">{detail.blocker.query}</pre>
          </div>

          <div className="deadlock-modal__arrow">↓</div>

          <div className="deadlock-modal__lane">
            <div className="deadlock-modal__lane-head deadlock-modal__lane-head--blocked">
              차단당한 세션
            </div>
            <div className="deadlock-modal__lane-meta">
              <span className="deadlock-modal__pid">PID: {detail.blocked.pid}</span>
              <span className="deadlock-modal__user">user: {detail.blocked.user}</span>
            </div>
            <pre className="deadlock-modal__query">{detail.blocked.query}</pre>
          </div>
        </section>

        {/* 락 정보 */}
        <section className="deadlock-modal__section">
          <h3 className="deadlock-modal__section-title">락 정보</h3>
          <div className="deadlock-modal__rowgrid">
            <div className="deadlock-modal__card">
              <div className="deadlock-modal__label">Lock Type</div>
              <div className="deadlock-modal__value">{detail.lockType}</div>
            </div>
            <div className="deadlock-modal__card">
              <div className="deadlock-modal__label">Duration</div>
              <div className="deadlock-modal__value">{detail.durationMs}ms</div>
            </div>
          </div>
        </section>

        {/* 영향도 */}
        <section className="deadlock-modal__impact">
          <div className="deadlock-modal__impact-head">
            <span className="deadlock-modal__impact-badge">⚠️ 영향도</span>
            <span className="deadlock-modal__ended">{detail.endedInfo}</span>
          </div>
          <div className="deadlock-modal__impact-sub">
            <span className="deadlock-modal__clock" aria-hidden="true">🕒</span>
            <span>
              반복 발생: {detail.repeats24h ?? 0}회 / 최근 24시간
            </span>
          </div>
        </section>

        {/* 푸터 */}
        <footer className="deadlock-modal__footer">
          <button
            ref={closeBtnRef}
            className="deadlock-modal__btn"
            onClick={onClose}
          >
            닫기
          </button>
        </footer>
      </div>
    </div>
  );
}
