import React, { useEffect, useMemo, useRef, useState } from "react";
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

export interface ServerRuleDetail {
  alarmRuleId: number;
  instanceName: string;
  databaseName: string | null;
  metricType: Metric;
  aggregationType: Aggregation;
  operator: string;
  enabled: boolean;
  // JSONB levels 원본
  levels: {
    notice: RuleThreshold;
    warning: RuleThreshold;
    critical: RuleThreshold;
  };
}

export interface ServerUpdatePayload {
  alarmRuleId: number;
  aggregationType: Aggregation;
  enabled: boolean;
  levels: {
    notice: RuleThreshold;
    warning: RuleThreshold;
    critical: RuleThreshold;
  };
}

export default function AlarmRuleEditModal({
  open,
  onClose,
  ruleId,
  onSubmit = async () => {},
  onDelete,
  lockMetricInstanceOnEdit = true,
}: {
  open: boolean;
  onClose: () => void;
  ruleId?: number;
  onSubmit?: (payload: ServerUpdatePayload) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  lockMetricInstanceOnEdit?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState<boolean>(true);
  const [instanceName, setInstanceName] = useState<string>("");
  const [databaseName, setDatabaseName] = useState<string>("");
  const [metric, setMetric] = useState<Metric>("dead_tuples");
  const [aggregation, setAggregation] = useState<Aggregation>("latest_avg");
  const [levels, setLevels] = useState<{
    notice: RuleThreshold;
    warn: RuleThreshold;    // 프론트 내부 키
    danger: RuleThreshold;  // 프론트 내부 키
  }>({
    notice: { threshold: 0, minDurationMin: 0, occurCount: 0, windowMin: 1 },
    warn:   { threshold: 0, minDurationMin: 0, occurCount: 0, windowMin: 1 },
    danger: { threshold: 0, minDurationMin: 0, occurCount: 0, windowMin: 1 },
  });

  const overlayRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLSelectElement>(null);

  // 규칙 상세 조회(JSONB levels 포함)
  useEffect(() => {
    if (!open || !ruleId) return;
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        const res = await apiClient.get<ServerRuleDetail>(`/alarms/rules/${ruleId}`, { signal: ac.signal });
        const detail = res.data;

        setEnabled(detail.enabled ?? true);
        setInstanceName(detail.instanceName || "Unknown");
        setDatabaseName(detail.databaseName || "Unknown");
        setMetric(detail.metricType as Metric);
        setAggregation(detail.aggregationType as Aggregation);

        // 서버 -> 프론트 내부 키로 매핑 (warning -> warn, critical -> danger)
        if (detail.levels) {
          setLevels({
            notice: detail.levels.notice,
            warn:   detail.levels.warning,
            danger: detail.levels.critical,
          });
        }
      } catch (e: any) {
        if (e?.name !== "CanceledError") {
          console.error("Failed to fetch rule:", e);
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
    firstFieldRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleOutside = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const num = (v: string, fallback = 0) => {
    const n = Number(String(v).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : fallback;
  };

  const updateLevel = (key: keyof typeof levels, field: keyof RuleThreshold, value: string) => {
    setLevels(prev => ({ ...prev, [key]: { ...prev[key], [field]: num(value) } }));
  };

  // 프론트 상태 → 서버(JSONB) 업데이트 페이로드
  const toServerUpdate = (): ServerUpdatePayload => ({
    alarmRuleId: ruleId!,
    aggregationType: aggregation,
    enabled,
    levels: {
      notice: levels.notice,
      warning: levels.warn,     // warn -> warning
      critical: levels.danger,  // danger -> critical
    },
  });

  const handleSave = async () => {
    const serverPayload = toServerUpdate();
    await onSubmit(serverPayload);
    onClose();
  };

  const handleDelete = async () => {
    if (!confirm("이 규칙을 삭제하시겠습니까?\n\n⚠️ 주의: 관련 알림 이력도 함께 삭제됩니다.")) return;
    try {
      if (onDelete) { await onDelete(); alert("규칙이 삭제되었습니다."); }
    } catch (error: any) {
      console.error("Delete error:", error);
      alert(`삭제 실패: ${error?.response?.data?.message || error.message}`);
    }
  };

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onMouseDown={handleOutside}
      className="amr-overlay"
      aria-modal="true"
      role="dialog"
      aria-labelledby="alarm-rule-edit-title"
    >
      <div className="amr-modal" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 800 }}>
        <header className="amr-modal__header">
          <div id="alarm-rule-edit-title" className="amr-modal__title">알림 규칙 수정</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              aria-pressed={enabled}
              onClick={() => setEnabled(v => !v)}
              className={`ar-toggle ${enabled ? "ar-toggle--on" : ""}`}
              title={enabled ? "활성화" : "비활성화"}
            >
              <span className="ar-dot" />
            </button>
          </div>
        </header>

        <div className="amr-modal__body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px' }}>로딩 중...</div>
          ) : (
            <>
              <div className="ar-grid">
                <div>
                  <div className="ar-kicker">대상 인스턴스</div>
                  <input className="ar-select" value={instanceName} disabled style={{ backgroundColor: '#F3F4F6', cursor: 'not-allowed' }}/>
                </div>
                <div>
                  <div className="ar-kicker">대상 데이터베이스</div>
                  <input className="ar-select" value={databaseName} disabled style={{ backgroundColor: '#F3F4F6', cursor: 'not-allowed' }}/>
                </div>

                <div>
                  <div className="ar-kicker">지표</div>
                  <select ref={firstFieldRef} className="ar-select" value={metric} onChange={(e) => setMetric(e.target.value as Metric)} disabled={lockMetricInstanceOnEdit}>
                    <option value="dead_tuples">Dead Tuples</option>
                    <option value="bloat_pct">Bloat %</option>
                    <option value="vacuum_backlog">Vacuum Backlog</option>
                    <option value="wal_lag">WAL Lag</option>
                  </select>
                </div>

                <div>
                  <div className="ar-kicker">집계</div>
                  <select className="ar-select" value={aggregation} onChange={(e) => setAggregation(e.target.value as Aggregation)}>
                    <option value="latest_avg">Latest Average</option>
                    <option value="avg_5m">Avg (5m)</option>
                    <option value="avg_15m">Avg (15m)</option>
                    <option value="p95_15m">P95 (15m)</option>
                  </select>
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
                      <td><input className="ar-input" type="number" min={0} step={1}
                            value={levels.notice.threshold}
                            onChange={(e) => updateLevel("notice", "threshold", e.target.value)} /></td>
                      <td><input className="ar-input" type="number" min={0} step={1}
                            value={levels.warn.threshold}
                            onChange={(e) => updateLevel("warn", "threshold", e.target.value)} /></td>
                      <td><input className="ar-input" type="number" min={0} step={1}
                            value={levels.danger.threshold}
                            onChange={(e) => updateLevel("danger", "threshold", e.target.value)} /></td>
                      <td className="ar-right"></td>
                    </tr>

                    <tr className="ar-row">
                      <td className="ar-td-strong">지속 시간</td>
                      <td><input className="ar-input" type="number" min={0} step={1}
                            value={levels.notice.minDurationMin}
                            onChange={(e) => updateLevel("notice", "minDurationMin", e.target.value)} /></td>
                      <td><input className="ar-input" type="number" min={0} step={1}
                            value={levels.warn.minDurationMin}
                            onChange={(e) => updateLevel("warn", "minDurationMin", e.target.value)} /></td>
                      <td><input className="ar-input" type="number" min={0} step={1}
                            value={levels.danger.minDurationMin}
                            onChange={(e) => updateLevel("danger", "minDurationMin", e.target.value)} /></td>
                      <td className="ar-right">분</td>
                    </tr>

                    <tr className="ar-row">
                      <td className="ar-td-strong">발생 횟수</td>
                      <td><input className="ar-input" type="number" min={0} step={1}
                            value={levels.notice.occurCount}
                            onChange={(e) => updateLevel("notice", "occurCount", e.target.value)} /></td>
                      <td><input className="ar-input" type="number" min={0} step={1}
                            value={levels.warn.occurCount}
                            onChange={(e) => updateLevel("warn", "occurCount", e.target.value)} /></td>
                      <td><input className="ar-input" type="number" min={0} step={1}
                            value={levels.danger.occurCount}
                            onChange={(e) => updateLevel("danger", "occurCount", e.target.value)} /></td>
                      <td className="ar-right">회</td>
                    </tr>

                    <tr className="ar-row">
                      <td className="ar-td-strong">윈도우</td>
                      <td><input className="ar-input" type="number" min={1} step={1}
                            value={levels.notice.windowMin}
                            onChange={(e) => updateLevel("notice", "windowMin", e.target.value)} /></td>
                      <td><input className="ar-input" type="number" min={1} step={1}
                            value={levels.warn.windowMin}
                            onChange={(e) => updateLevel("warn", "windowMin", e.target.value)} /></td>
                      <td><input className="ar-input" type="number" min={1} step={1}
                            value={levels.danger.windowMin}
                            onChange={(e) => updateLevel("danger", "windowMin", e.target.value)} /></td>
                      <td className="ar-right">분</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <footer className="amr-modal__footer">
          {onDelete && (
            <button className="amr-btn" onClick={handleDelete} style={{ marginRight: "auto", color: "#dc2626" }}>
              삭제
            </button>
          )}
          <button className="amr-btn" onClick={onClose}>취소</button>
          <button className="amr-btn amr-btn--primary" onClick={handleSave}>규칙 수정</button>
        </footer>
      </div>
    </div>
  );
}
