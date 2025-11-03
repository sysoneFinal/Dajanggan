import React, { useEffect, useMemo, useRef, useState } from "react";
import "/src/styles/alarm/alarm-rule.css";
import "/src/styles/alarm/alarm-modal-root.css";

export type Metric = "dead_tuples" | "bloat_pct" | "vacuum_backlog" | "wal_lag";
export type Aggregation = "latest_avg" | "avg_5m" | "avg_15m" | "p95_15m";

export interface RuleThreshold {
  threshold: number;
  minDurationMin: number;
  occurCount: number;
  windowMin: number;
}

export interface AlertRulePayload {
  enabled: boolean;
  targetInstance: string;
  targetDatabase: string;
  metric: Metric;
  aggregation: Aggregation;
  levels: {
    notice: RuleThreshold;
    warn: RuleThreshold;
    danger: RuleThreshold;
  };
}

export default function AlarmRuleEditModal({
  open,
  onClose,
  initialData,
  onSubmit = async () => {},
  onDelete,
  lockMetricInstanceOnEdit = true,
}: {
  open: boolean;
  onClose: () => void;
  initialData?: Partial<AlertRulePayload>;
  onSubmit?: (payload: AlertRulePayload) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  lockMetricInstanceOnEdit?: boolean;
}) {
  const defaultLevels: AlertRulePayload["levels"] = {
    notice: { threshold: 100_000, minDurationMin: 1, occurCount: 2, windowMin: 15 },
    warn: { threshold: 500_000, minDurationMin: 5, occurCount: 2, windowMin: 15 },
    danger: { threshold: 1_000_000, minDurationMin: 10, occurCount: 1, windowMin: 10 },
  };

  const [enabled, setEnabled] = useState<boolean>(initialData?.enabled ?? true);
  const [instance, setInstance] = useState<string>(initialData?.targetInstance ?? "postgres");
  const [database, setDatabase] = useState<string>(initialData?.targetDatabase ?? "session");
  const [metric, setMetric] = useState<Metric>(initialData?.metric ?? "dead_tuples");
  const [aggregation, setAggregation] = useState<Aggregation>(initialData?.aggregation ?? "latest_avg");
  const [levels, setLevels] = useState<AlertRulePayload["levels"]>(initialData?.levels ?? defaultLevels);

  const overlayRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (!open) return;

    // 모달이 열릴 때 initialData로 상태 업데이트
    if (initialData) {
      if (typeof initialData.enabled === "boolean") setEnabled(initialData.enabled);
      if (initialData.targetInstance) setInstance(initialData.targetInstance);
      if (initialData.targetDatabase) setDatabase(initialData.targetDatabase);
      if (initialData.metric) setMetric(initialData.metric);
      if (initialData.aggregation) setAggregation(initialData.aggregation);
      if (initialData.levels) setLevels(initialData.levels);
    }

    // 포커스 및 ESC 키 핸들링
    firstFieldRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, initialData, onClose]);

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

  const payload: AlertRulePayload = useMemo(
    () => ({
      enabled,
      targetInstance: instance,
      targetDatabase: database,
      metric,
      aggregation,
      levels,
    }),
    [enabled, instance, database, metric, aggregation, levels]
  );

  const handleSave = async () => {
    await onSubmit(payload);
    onClose();
  };

  const handleDelete = async () => {
    if (onDelete) {
      await onDelete();
      onClose();
    }
  };

  const lockKeys = lockMetricInstanceOnEdit;

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
          {/* Selectors */}
          <div className="ar-grid">
            <div>
              <div className="ar-kicker">대상 인스턴스</div>
              <select
                ref={firstFieldRef}
                className="ar-select"
                value={instance}
                onChange={(e) => setInstance(e.target.value)}
                disabled={lockKeys}
              >
                <option value="postgres">postgres</option>
                <option value="prod-pg01">prod-pg01</option>
                <option value="staging-pg">staging-pg</option>
              </select>
            </div>
            <div>
              <div className="ar-kicker">대상 데이터베이스</div>
              <select
                className="ar-select"
                value={database}
                onChange={(e) => setDatabase(e.target.value)}
                disabled={lockKeys}
              >
                <option value="session">session</option>
                <option value="orders">orders</option>
                <option value="payments">payments</option>
              </select>
            </div>

            <div>
              <div className="ar-kicker">지표</div>
              <select
                className="ar-select"
                value={metric}
                onChange={(e) => setMetric(e.target.value as Metric)}
                disabled={lockKeys}
              >
                <option value="dead_tuples">Dead Tuples</option>
                <option value="bloat_pct">Bloat %</option>
                <option value="vacuum_backlog">Vacuum Backlog</option>
                <option value="wal_lag">WAL Lag</option>
              </select>
            </div>

            <div>
              <div className="ar-kicker">집계</div>
              <select
                className="ar-select"
                value={aggregation}
                onChange={(e) => setAggregation(e.target.value as Aggregation)}
              >
                <option value="latest_avg">Latest Average</option>
                <option value="avg_5m">Avg (5m)</option>
                <option value="avg_15m">Avg (15m)</option>
                <option value="p95_15m">P95 (15m)</option>
              </select>
            </div>
          </div>

          {/* Threshold Table */}
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
                  <td className="ar-td-strong">알람 레벨</td>
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
        </div>

        <footer className="amr-modal__footer">
          {onDelete && (
            <button 
              className="amr-btn" 
              onClick={handleDelete} 
              style={{ marginRight: "auto", color: "#dc2626" }}
            >
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