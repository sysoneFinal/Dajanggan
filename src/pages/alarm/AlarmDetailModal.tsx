// components/alert/AlertDetailModal.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom"; 
import Chart from "../../components/chart/ChartComponent"; 
import "/src/styles/alarm/alarm-modal.css";

type RelatedItem = {
  type: "table" | "index" | "schema";
  name: string;
  metric: string; // e.g., "Dead 780K"
  level: "위험" | "경고" | "주의" | "정상";
};

type AlertSeverity = "CRITICAL" | "WARNING" | "INFO";

export type LatencyData = {
  data: number[];
  labels: string[];
};

export type AlertDetailData = {
  id: string;
  title: string;            // e.g., "Autovacuum Backlog — prod-a"
  severity: AlertSeverity;  // "CRITICAL"
  occurredAt: string;       // "2025-10-12 14:22"
  description: string;      // 본문 한 줄
  latency: LatencyData;     // (24h) 시계열
  summary: {                // 우측 요약
    current: number | string;    // 현재값 18.6
    threshold: number | string;  // 임계치 6
    duration: string;            // 지속시간 "15m"
  };
  related: RelatedItem[];   // 하단 테이블
};

type Props = {
  open: boolean;
  data: AlertDetailData;
  onClose: () => void;
  onAcknowledge?: (id: string) => void;
};

// 데모 알림 리스트
const DEMO_ALERTS = [
  {
    id: "alert-1",
    title: "Autovacuum Backlog — prod-a",
    severity: "CRITICAL" as AlertSeverity,
    occurredAt: "2025-10-12 14:22",
    description: "자동 청소가 중단되었습니다. 지연 18.6시간",
    isRead: false,
  },
  {
    id: "alert-2",
    title: "I/O Saturation (pg_stat_io)",
    severity: "CRITICAL" as AlertSeverity,
    occurredAt: "2025-10-12 13:55",
    description: "I/O 대기율 72% 초과",
    isRead: false,
  },
  {
    id: "alert-3",
    title: "VACUUM Timeout: facilities",
    severity: "CRITICAL" as AlertSeverity,
    occurredAt: "2025-10-12 13:40",
    description: "VACUUM이 임계시간을 초과",
    isRead: true,
  },
  {
    id: "alert-4",
    title: "Connection Pool Saturation",
    severity: "WARNING" as AlertSeverity,
    occurredAt: "2025-10-12 12:30",
    description: "연결 풀 사용률 85% 초과",
    isRead: true,
  }, 
];

// 알림별 상세 데이터
const DEMO_ALERT_DETAILS: Record<string, AlertDetailData> = {
  "alert-1": {
    id: "alert-1",
    title: "Autovacuum Backlog — prod-a",
    severity: "CRITICAL",
    occurredAt: "2025-10-12 14:22",
    description: "자동 청소가 중단되었습니다. 지연 18.6시간, 미처리 Dead Tuples ≈ 120만.",
    latency: {
      data: [300,400,280,600,320,290,410,370,350,450,320,310,330,420,380,360,340,390,410,430,370,350,320,310],
      labels: ["00:00","01:00","02:00","03:00","04:00","05:00","06:00","07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00","23:00"],
    },
    summary: { current: 18.6, threshold: 6, duration: "15m" },
    related: [
      { type: "table", name: "orders", metric: "Dead 780K", level: "경고" },
      { type: "table", name: "sessions", metric: "Dead 1.2M", level: "위험" },
      { type: "table", name: "logs", metric: "Dead 450K", level: "주의" },
    ],
  },
  "alert-2": {
    id: "alert-2",
    title: "I/O Saturation (pg_stat_io)",
    severity: "CRITICAL",
    occurredAt: "2025-10-12 13:55",
    description: "I/O 대기율 72% 초과, Shared Buffer 쓰기 65%, Temp I/O 40% 이상.",
    latency: {
      data: [200,250,300,450,500,520,480,460,490,510,530,550,520,500,480,460,440,420,400,380,360,340,320,300],
      labels: ["00:00","01:00","02:00","03:00","04:00","05:00","06:00","07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00","23:00"],
    },
    summary: { current: 72, threshold: 50, duration: "25m" },
    related: [
      { type: "table", name: "transactions", metric: "I/O 85%", level: "위험" },
      { type: "table", name: "analytics", metric: "I/O 60%", level: "경고" },
    ],
  },
  "alert-3": {
    id: "alert-3",
    title: "VACUUM Timeout: facilities",
    severity: "CRITICAL",
    occurredAt: "2025-10-12 13:40",
    description: "VACUUM이 임계시간을 초과했습니다. 남은 Dead ≈ 87,000.",
    latency: {
      data: [150,180,200,220,240,260,280,300,320,340,360,380,400,420,440,460,480,500,480,460,440,420,400,380],
      labels: ["00:00","01:00","02:00","03:00","04:00","05:00","06:00","07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00","23:00"],
    },
    summary: { current: 87000, threshold: 50000, duration: "45m" },
    related: [
      { type: "table", name: "facilities", metric: "Dead 87K", level: "위험" },
    ],
  },
  "alert-4": {
    id: "alert-4",
    title: "Connection Pool Saturation",
    severity: "WARNING",
    occurredAt: "2025-10-12 12:30",
    description: "연결 풀 사용률이 85%를 초과했습니다.",
    latency: {
      data: [50,55,60,65,70,75,80,85,90,92,90,88,86,84,82,80,78,76,74,72,70,68,66,64],
      labels: ["00:00","01:00","02:00","03:00","04:00","05:00","06:00","07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00","23:00"],
    },
    summary: { current: 85, threshold: 80, duration: "10m" },
    related: [
      { type: "schema", name: "public", metric: "Conn 250/300", level: "경고" },
    ],
  },
};

export default function AlertDetailModal({ open, data, onClose, onAcknowledge }: Props) {
  const dlgRef = useRef<HTMLDivElement>(null);
  const [alerts, setAlerts] = useState(DEMO_ALERTS);
  const [currentData, setCurrentData] = useState<typeof data | null>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const onBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const latencySeries = useMemo(
    () => currentData ? [{ name: "Latency (ms)", data: currentData.latency.data }] : [],
    [currentData]
  );

  const handleDeleteAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const handleMarkAsRead = (id: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === id ? { ...a, isRead: !a.isRead } : a
    ));
  };

  const handleSelectAlert = (id: string) => {
    const alertDetail = DEMO_ALERT_DETAILS[id];
    if (alertDetail) {
      setCurrentData(alertDetail);
      // 읽음 처리
      setAlerts(prev => prev.map(a => 
        a.id === id ? { ...a, isRead: true } : a
      ));
    }
  };

  if (!open) return null;

   return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-detail-title"
      className="am-modal__backdrop"
      onMouseDown={onBackdropClick}
    >
      <div className={`am-modal ${currentData ? 'am-modal--wide' : 'am-modal--narrow'}`} ref={dlgRef}>
        <header className="am-modal__header">
          <div className="am-modal__titlewrap">
            {currentData && (
              <>
                <span className={`am-badge am-badge--${currentData.severity.toLowerCase()}`}>{currentData.severity}</span>
                <h2 id="alert-detail-title" className="am-modal__title">{currentData.title}</h2>
              </>
            )}
            {!currentData && <h2 id="alert-detail-title" className="am-modal__title">알림 상세</h2>}
          </div>
          <button className="am-iconbtn" aria-label="닫기" onClick={onClose}>×</button>
        </header>

        {currentData && (
          <p className="am-modal__subtitle">{currentData.occurredAt} · {currentData.description}</p>
        )}

        <div className="am-modal__layout">
          {/* 좌측: 알림 리스트 */}
          <aside className="am-alerts-list">
            <header className="am-alerts-list__header">
              <h3>알림 내역</h3>
              <span className="am-alerts-count">{alerts.length}</span>
            </header>
            <div className="am-alerts-list__body">
              {alerts.length === 0 ? (
                <div className="am-alerts-empty">알림이 없습니다</div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`am-alert-item ${alert.isRead ? 'am-alert-item--read' : ''} ${currentData && alert.id === currentData.id ? 'am-alert-item--active' : ''}`}
                    onClick={() => handleSelectAlert(alert.id)}
                  >
                    <div className="am-alert-item__header">
                      <span className={`am-badge am-badge--${alert.severity.toLowerCase()}`}>
                        {alert.severity}
                      </span>
                      <div className="am-alert-item__actions">
                        <button
                          className="am-alert-action-btn"
                          title={alert.isRead ? "읽지 않음으로 표시" : "읽음으로 표시"}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(alert.id);
                          }}
                        >
                          {alert.isRead ? '○' : '●'}
                        </button>
                        <button
                          className="am-alert-action-btn am-alert-action-btn--delete"
                          title="삭제"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAlert(alert.id);
                          }}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <h4 className="am-alert-item__title">{alert.title}</h4>
                    <p className="am-alert-item__desc">{alert.description}</p>
                    <time className="am-alert-item__time">{alert.occurredAt}</time>
                  </div>
                ))
              )}
            </div>
          </aside>

          {/* 우측: 기존 내용 */}
          {currentData && (
            <div className="am-modal__content">
              <div className="am-modal__grid">
                {/* 좌측: 차트 */}
                <section className="am-card am-chart">
                  <header className="am-card__header">
                    <h3>latency Trend <span className="am-dim">(24h)</span></h3>
                  </header>
                  <Chart
                    type="line"
                    series={latencySeries}
                    categories={currentData.latency.labels}
                    height={360}
                    width="100%"
                    showLegend={false}
                    showToolbar={false}
                    colors={["#6366F1"]}
                    customOptions={{
                      chart: { redrawOnParentResize: true, redrawOnWindowResize: true },
                      stroke: { width: 2, curve: "smooth" },
                      grid: { borderColor: "#E5E7EB", strokeDashArray: 4 },
                      markers: { size: 3 },
                      yaxis: { min: 0 },
                      tooltip: { x: { show: true } },
                    }}
                    tooltipFormatter={(v) => `${Math.round(v).toLocaleString()}`}
                  />
                </section>

                {/* 우측: 요약 & 버튼 */}
                <aside className="am-side">
                  <div className="am-summary">
                    <h4>요약</h4>
                    <dl>
                      <div><dt>현재값</dt><dd>{String(currentData.summary.current)}</dd></div>
                      <div><dt>임계치</dt><dd>{String(currentData.summary.threshold)}</dd></div>
                      <div><dt>지속시간</dt><dd>{currentData.summary.duration}</dd></div>
                    </dl>
                    <button
                      className="am-btn am-btn--primary"
                      onClick={() => onAcknowledge?.(currentData.id)}
                    >
                      Acknowledge
                    </button>
                  </div>
                </aside>
              </div>

              {/* 관련 객체 테이블 */}
              <section className="am-card">
                <header className="am-card__header">
                  <h3>관련 객체</h3>
                </header>
                <div className="am-tablewrap">
                  <table className="am-table">
                    <thead>
                      <tr>
                        <th>유형</th>
                        <th>이름</th>
                        <th>지표값</th>
                        <th>상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentData.related.map((r, i) => (
                        <tr key={i}>
                          <td>{r.type}</td>
                          <td>{r.name}</td>
                          <td>{r.metric}</td>
                          <td>
                            <span className={`am-tag am-tag--${(
                              r.level === "위험" ? "critical" :
                              r.level === "경고" ? "warn" :
                              r.level === "주의" ? "caution" : "ok"
                            )}`}>{r.level}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
    ,document.body
  );
}