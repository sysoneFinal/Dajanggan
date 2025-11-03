import { useEffect, useRef } from "react";
import "../../styles/session/deadlock-modal.css";
import Clock from "../../assets/icon/clock.svg"

export type DeadlockDetail = {
  detectedAt: string;
  dbName: string;
  tableName: string;
  lockType: string;
  durationMs: number;
  blocker: {
    pid: number;
    user: string;
    query: string;
  };
  blocked: {
    pid: number;
    user: string;
    query: string;
  };
  endedInfo: string;
  repeats24h?: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  detail: DeadlockDetail;
};

export default function DeadlockModal({ open, onClose, detail }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
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

  return (
    <div
      className="deadlock-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="deadlock-modal" ref={dialogRef} role="dialog" aria-modal="true">
        {/* Header */}
        <header className="deadlock-header">
          <h2 className="deadlock-title">Deadlock Detected</h2>
          <div className="deadlock-timestamp">{detail.detectedAt}</div>
        </header>

        {/* DB 정보  */}
        <section className="deadlock-topcards">
          <div className="deadlock-card">
            <div className="deadlock-label">DB</div>
            <div className="deadlock-value">{detail.dbName}</div>
          </div>
          <div className="deadlock-card">
            <div className="deadlock-label">Table</div>
            <div className="deadlock-value">{detail.tableName}</div>
          </div>
        </section>

        {/* 차단 관계 구조 */}
        <section className="deadlock-graph">
          <div className="deadlock-graph-container">
            <h6>교착 관계</h6>
          </div>
            <div className="deadlock-lane deadlock-lane-blocker">
              <div className="deadlock-lane-head deadlock-lane-head-blocker">차단 세션</div>
              <div className="deadlock-lane-meta">
                <span className="deadlock-pid">PID: {detail.blocker.pid}</span>
                <span className="deadlock-user">user : {detail.blocker.user}</span>
              </div>
              <pre className="deadlock-query">{detail.blocker.query}</pre>
            </div>

            <div className="deadlock-arrow">↓</div>

            <div className="deadlock-lane deadlock-lane-blocked">
              <div className="deadlock-lane-head deadlock-lane-head-blocked">차단당한 세션</div>
              <div className="deadlock-lane-meta">
                <span className="deadlock-pid">PID: {detail.blocked.pid}</span>
                <span className="deadlock-user">user : {detail.blocked.user}</span>
              </div>
              <pre className="deadlock-query">{detail.blocked.query}</pre>
            </div>
        </section>

        {/* 락 정보  */}
        <section className="deadlock-section">
          <h3 className="deadlock-section-title">락 정보</h3>
          <div className="deadlock-rowgrid">
            <div className="deadlock-card">
              <div className="deadlock-label">Lock Type</div>
              <div className="deadlock-value">{detail.lockType}</div>
            </div>
            <div className="deadlock-card">
              <div className="deadlock-label">Duration</div>
              <div className="deadlock-value">{detail.durationMs}ms</div>
            </div>
          </div>
        </section>

        {/* 영향도  */}
        <section className="deadlock-impact">
          <div className="deadlock-impact-head">
            <span className="deadlock-impact-badge">⚠️ 영향도</span>
          </div>
          <div className="deadlock-impact-sub">
            <span className="deadlock-ended">
              <span className="deadlock-dot" aria-hidden="true"></span>
              {detail.endedInfo}
            </span>
            <span className="deadlock-repeats">
              <img src={Clock} alt="시계" />
              반복 발생: {detail.repeats24h ?? 0}회 / 최근 24시간
            </span> 

          </div>
        </section>

        {/* Footer */}
        <footer className="deadlock-footer">
          <button ref={closeBtnRef} className="deadlock-modal-btn" onClick={onClose}>
            닫기
          </button>
        </footer>
      </div>
    </div>
  );
}
