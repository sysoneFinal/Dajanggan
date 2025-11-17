import React, { useEffect, useRef, useState } from "react";
import "/src/styles/alarm/alarm-rule.css";
import "/src/styles/alarm/alarm-modal-root.css";
import apiClient from "../../api/apiClient";

export type Metric = "dead_tuples" | "bloat_pct" | "vacuum_backlog" | "wal_lag";
export type Aggregation = "latest_avg" | "avg_5m" | "avg_15m" | "p95_15m";

export interface RuleThreshold {
  threshold: number;
  minDurationMin: number;
  occurCount: number;
  windowMin: number;
}

export default function AlarmRuleDetailModal({
  open,
  onClose,
  ruleId,
  onEdit,
}: {
  open: boolean;
  onClose: () => void;
  ruleId?: number;
  onEdit?: (ruleId: number) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState<boolean>(true);
  const [instanceName, setInstanceName] = useState<string>("");
  const [databaseName, setDatabaseName] = useState<string>("");
  const [metric, setMetric] = useState<Metric>("dead_tuples");
  const [aggregation, setAggregation] = useState<Aggregation>("latest_avg");
  const [levels, setLevels] = useState<{
    notice: RuleThreshold;
    warning: RuleThreshold;
    critical: RuleThreshold;
  }>({
    notice: { threshold: 0, minDurationMin: 0, occurCount: 0, windowMin: 0 },
    warning: { threshold: 0, minDurationMin: 0, occurCount: 0, windowMin: 0 },
    critical: { threshold: 0, minDurationMin: 0, occurCount: 0, windowMin: 0 },
  });

  const overlayRef = useRef<HTMLDivElement>(null);

  // 규칙 상세 조회
  useEffect(() => {
    if (!open || !ruleId) return;

    const ac = new AbortController();
    
    (async () => {
      try {
        setLoading(true);

        const res = await apiClient.get(`/alarms/rules/${ruleId}`, {
          signal: ac.signal
        });

        const detail = res.data;
        
        setEnabled(detail.enabled ?? true);
        setInstanceName(detail.instanceName || "Unknown");
        setDatabaseName(detail.databaseName || "Unknown");
        setMetric(detail.metricType as Metric);
        setAggregation(detail.aggregationType as Aggregation);
        
        // levels 매핑
        if (detail.levels) {
          setLevels({
            notice: detail.levels.notice || { threshold: 0, minDurationMin: 0, occurCount: 0, windowMin: 0 },
            warning: detail.levels.warning || { threshold: 0, minDurationMin: 0, occurCount: 0, windowMin: 0 },
            critical: detail.levels.critical || { threshold: 0, minDurationMin: 0, occurCount: 0, windowMin: 0 },
          });
        }
      } catch (e: any) {
        if (e?.name !== "CanceledError") {
          console.error('Failed to fetch rule:', e);
          alert("규칙 조회에 실패했습니다.");
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [open, ruleId]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleOutside = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleEdit = () => {
    if (onEdit && ruleId) {
      onEdit(ruleId);
    }
  };

  const getMetricLabel = (metric: Metric) => {
    const labels: Record<Metric, string> = {
      dead_tuples: "Dead Tuples",
      bloat_pct: "Bloat %",
      vacuum_backlog: "Vacuum Backlog",
      wal_lag: "WAL Lag"
    };
    return labels[metric];
  };

  const getAggregationLabel = (agg: Aggregation) => {
    const labels: Record<Aggregation, string> = {
      latest_avg: "Latest Average",
      avg_5m: "Avg (5m)",
      avg_15m: "Avg (15m)",
      p95_15m: "P95 (15m)"
    };
    return labels[agg];
  };

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onMouseDown={handleOutside}
      className="amr-overlay"
      aria-modal="true"
      role="dialog"
      aria-labelledby="alarm-rule-detail-title"
    >
      <div className="amr-modal" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 800 }}>
        <header className="amr-modal__header">
          <div id="alarm-rule-detail-title" className="amr-modal__title">알림 규칙 상세</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className={`al-badge ${enabled ? "al-badge--ok" : "al-badge--warn"}`}>
              {enabled ? "활성화" : "비활성화"}
            </span>
          </div>
        </header>

        <div className="amr-modal__body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px' }}>
              로딩 중...
            </div>
          ) : (
            <>
              <div className="ar-grid">
                <div>
                  <div className="ar-kicker">대상 인스턴스</div>
                  <div className="ar-select" style={{ backgroundColor: '#F9FAFB', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
                    {instanceName}
                  </div>
                </div>
                <div>
                  <div className="ar-kicker">대상 데이터베이스</div>
                  <div className="ar-select" style={{ backgroundColor: '#F9FAFB', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
                    {databaseName}
                  </div>
                </div>

                <div>
                  <div className="ar-kicker">지표</div>
                  <div className="ar-select" style={{ backgroundColor: '#F9FAFB', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
                    {getMetricLabel(metric)}
                  </div>
                </div>

                <div>
                  <div className="ar-kicker">집계</div>
                  <div className="ar-select" style={{ backgroundColor: '#F9FAFB', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
                    {getAggregationLabel(aggregation)}
                  </div>
                </div>
              </div>

              <div className="ar-tablewrap" style={{ marginTop: '24px' }}>
                <table className="ar-table">
                  <thead>
                    <tr>
                      <th></th>
                      <th>주의</th>
                      <th>경고</th>
                      <th>위험</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="ar-row">
                      <td className="ar-td-strong">임계치</td>
                      <td>{levels.notice.threshold.toLocaleString()}</td>
                      <td>{levels.warning.threshold.toLocaleString()}</td>
                      <td>{levels.critical.threshold.toLocaleString()}</td>
                      <td className="ar-right"></td>
                    </tr>

                    <tr className="ar-row">
                      <td className="ar-td-strong">지속 시간</td>
                      <td>{levels.notice.minDurationMin}</td>
                      <td>{levels.warning.minDurationMin}</td>
                      <td>{levels.critical.minDurationMin}</td>
                      <td className="ar-right">분</td>
                    </tr>

                    <tr className="ar-row">
                      <td className="ar-td-strong">발생 횟수</td>
                      <td>{levels.notice.occurCount}</td>
                      <td>{levels.warning.occurCount}</td>
                      <td>{levels.critical.occurCount}</td>
                      <td className="ar-right">회</td>
                    </tr>

                    <tr className="ar-row">
                      <td className="ar-td-strong">윈도우</td>
                      <td>{levels.notice.windowMin}</td>
                      <td>{levels.warning.windowMin}</td>
                      <td>{levels.critical.windowMin}</td>
                      <td className="ar-right">분</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <footer className="amr-modal__footer">
          <button className="amr-btn" onClick={onClose}>닫기</button>
          {onEdit && ruleId && (
            <button className="amr-btn amr-btn--primary" onClick={handleEdit}>수정</button>
          )}
        </footer>
      </div>
    </div>
  );
}