// components/alert/AlertDetailModal.tsx
import { useEffect, useMemo, useRef } from "react";
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

export default function AlertDetailModal({ open, data, onClose, onAcknowledge }: Props) {
  const dlgRef = useRef<HTMLDivElement>(null);

  // 화면 스크롤 잠금
  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; };
  }, [open]);

  // ESC 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // 외부 클릭 닫기
  const onBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Apex 시리즈
  const latencySeries = useMemo(
    () => [{ name: "Latency (ms)", data: data.latency.data }],
    [data.latency.data]
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-detail-title"
      className="ad-modal__backdrop"
      onMouseDown={onBackdropClick}
    >
      <div className="ad-modal" ref={dlgRef}>
        <header className="ad-modal__header">
          <div className="ad-modal__titlewrap">
            <span className={`ad-badge ad-badge--${data.severity.toLowerCase()}`}>{data.severity}</span>
            <h2 id="alert-detail-title" className="ad-modal__title">{data.title}</h2>
          </div>
          <button className="ad-iconbtn" aria-label="닫기" onClick={onClose}>×</button>
        </header>

        <p className="ad-modal__subtitle">{data.occurredAt} · {data.description}</p>

        <div className="ad-modal__grid">
          {/* 좌측: 차트 */}
          <section className="ad-card ad-chart">
            <header className="ad-card__header">
              <h3>latency Trend <span className="ad-dim">(24h)</span></h3>
            </header>
            <Chart
              type="line"
              series={latencySeries}
              categories={data.latency.labels}
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
          <aside className="ad-side">
            <div className="ad-summary">
              <h4>요약</h4>
              <dl>
                <div><dt>현재값</dt><dd>{String(data.summary.current)}</dd></div>
                <div><dt>임계치</dt><dd>{String(data.summary.threshold)}</dd></div>
                <div><dt>지속시간</dt><dd>{data.summary.duration}</dd></div>
              </dl>
              <button
                className="ad-btn ad-btn--primary"
                onClick={() => onAcknowledge?.(data.id)}
              >
                Acknowledge
              </button>
            </div>
          </aside>
        </div>

        {/* 관련 객체 테이블 */}
        <section className="ad-card">
          <header className="ad-card__header">
            <h3>관련 객체</h3>
          </header>
          <div className="ad-tablewrap">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>유형</th>
                  <th>이름</th>
                  <th>지표값</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {data.related.map((r, i) => (
                  <tr key={i}>
                    <td>{r.type}</td>
                    <td>{r.name}</td>
                    <td>{r.metric}</td>
                    <td>
                      <span className={`ad-tag ad-tag--${(
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
    </div>
  );
}
