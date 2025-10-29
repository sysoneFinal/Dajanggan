import "../../styles/session/session-detail-modal.css";

export interface SessionDetail {
  pid: number;
  user: string;
  db: string;
  waitType: string;
  waitEvent: string;
  duration: string;
  state: string;
  cpu: string;
  memory: string;
  query: string;
  startTime: string;
}

interface Props {
  session: SessionDetail | null;
  onClose: () => void;
}

export default function SessionDetailModal({ session, onClose }: Props) {
  if (!session) return null;

  return (
    <div className="session-detail-overlay">
      <div className="session-detail-modal">
        <div className="session-detail-header">
          <h3>Session Detail</h3>
          <div className="pid-badge">PID {session.pid}</div>
        </div>

        <div className="session-info-section">
          <h4>Info</h4>
          <div className="info-grid">
            <div><strong>사용자:</strong> {session.user}</div>
            <div><strong>DB:</strong> {session.db}</div>
            <div><strong>병목 유형:</strong> {session.waitType}</div>
            <div><strong>병목 원인:</strong> {session.waitEvent}</div>
            <div><strong>상태:</strong> {session.state}</div>
            <div><strong>CPU:</strong> {session.cpu}</div>
            <div><strong>Memory:</strong> {session.memory}</div>
            <div><strong>Query Start:</strong> {session.startTime}</div>
            <div><strong>Duration:</strong> {session.duration}</div>
          </div>
        </div>

        <div className="session-query-section">
          <h4>Query</h4>
          <pre className="query-box">{session.query}</pre>
        </div>

        <div className="session-actions">
          <button className="cancel-btn">Cancel Query</button>
          <button className="deadlock-btn">Deadlock</button>
        </div>

        <button className="close-btn" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}
