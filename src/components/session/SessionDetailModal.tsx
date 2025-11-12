import "../../styles/session/session-detail-modal.css";
import { formatDateTime } from "../../utils/formatDateTime";

export interface SessionDetail {
  pid: number;
  user: string;
  db: string;
  client: string;
  state: string;
  cpu: string;
  memory: string;
  waitType: string;
  waitEvent: string;
  blockingPid: number | string;
  startTime: string;
  duration: string;
  query: string;
  guides?: string[];
}

interface Props {
  session: SessionDetail | null;
  onClose: () => void;
}

export default function SessionDetailModal({ session, onClose }: Props) {
  if (!session) return null;

  console.log('모달에서 전달 받은 값 ', session);

  return (
    <div className="session-detail-overlay">
      <div className="session-detail-modal">
        {/* Header */}
        <div className="session-detail-header">
          <h3>Session Detail</h3>
          <div className="pid-badge">PID {session.pid}</div>
        </div>

        {/* Body */}
        <div className="session-detail-body">
          {/* 왼쪽 상세 정보  */}
          <div className="session-info-panel">
            <div className="section-head">
              <h4>Info</h4>
            </div>

            <div className="info-top-grid">
              <div className="info-card">
                <span>사용자</span>
                <p>{session.user}</p>
              </div>
              <div className="info-card">
                <span>DB</span>
                <p>{session.db}</p>
              </div>
              <div className="info-card">
                <span>Client</span>
                <p>{session.client}</p>
              </div>
              <div className="info-card">
                <span>상태</span>
                <p>{session.state}</p>
              </div>
            </div>

            {/* CPU & Performance */}
            <div className="perf-box">
              <div className="cpu-row">
                <span>CPU</span>
                <div className="cpu-bar">
                  <div className="cpu-progress" style={{ width: session.cpu }}></div>
                </div>
                <span className="cpu-value">{session.cpu}</span>
              </div>

              <div className="perf-row">
                <div>
                  <span>Query Start</span>
                  <p className="bold">{formatDateTime(session.startTime)}</p>
                </div>
                <div>
                  <span>Memory</span>
                  <p className="bold">{session.memory}</p>
                </div>
                <div>
                  <span>Duration</span>
                  <p className="bold">{session.duration}</p>
                </div>
              </div>
            </div>

            {/* Wait Event */}
            <div className="wait-box">
              <h5>Wait Event</h5>
              <div className="wait-grid">
                <div className="wait-card">
                  <span>병목 유형</span>
                  <p>{session.waitType}</p>
                </div>
                <div className="wait-card">
                  <span>병목 원인</span>
                  <p>{session.waitEvent}</p>
                </div>
                <div className="wait-card">
                  <span>Blocking PID</span>
                  <p>{session.blockingPid}</p>
                </div>
              </div>
            </div>

            {/*  Action Guide  */}
            {session.guides && session.guides.length > 0 && (
              <div className="action-box">
                <h5>Action Guide</h5>
                <div className="session-actions">
                  {session.guides.map((guide, idx) => (
                    <span key={idx} className="action-tag">
                      {guide}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 오른쪽 쿼리 섹션  */}
          <div className="session-query-panel">
            <div className="section-head">
              <h4>Query</h4>
            </div>
            <pre className="query-box">{session.query}</pre>
          </div>
        </div>

        <button className="close-btn" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}
