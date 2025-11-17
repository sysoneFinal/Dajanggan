import React, { useEffect, useMemo, useRef, useState } from "react";
import "/src/styles/alarm/alarm-rule.css";
import "/src/styles/alarm/alarm-modal-root.css";
import { useInstanceContext } from "../../context/InstanceContext";

export type Metric = "dead_tuples" | "bloat_pct" | "vacuum_backlog" | "wal_lag";
export type Aggregation = "latest_avg" | "avg_5m" | "avg_15m" | "p95_15m";

export interface RuleThreshold {
  threshold: number;
  minDurationMin: number;
  occurCount: number;
  windowMin: number;
}

export interface AlarmRulePayload {
  enabled: boolean;
  instanceId: number;
  databaseId: number;
  metricType: Metric;
  aggregationType: Aggregation;
  levels: {
    notice: RuleThreshold;
    warn: RuleThreshold;   // 프론트 내부 키
    danger: RuleThreshold; // 프론트 내부 키
  };
}

type Mode = "create" | "edit";

// ===== 서버(JSONB)로 보낼 페이로드 타입 =====
export interface ServerCreatePayload {
  instanceId: number | null;
  databaseId: number | null;
  metricType: Metric;
  aggregationType: Aggregation;
  operator: "gt" | "gte" | "lt" | "lte" | "eq";
  enabled: boolean;
  levels: {
    notice: RuleThreshold;
    warning: RuleThreshold;   // ★ 서버는 warning/critical
    critical: RuleThreshold;
  };
}

export default function AlarmRuleModal({
  open,
  onClose,
  mode = "create",
  onSubmit = async () => {},
}: {
  open: boolean;
  onClose: () => void;
  mode?: Mode;
  onSubmit?: (payload: AlarmRulePayload) => void | Promise<void>;
}) {
  const { selectedInstance, selectedDatabase } = useInstanceContext();

  const defaultLevels: AlarmRulePayload["levels"] = {
    notice: { threshold: 100_000, minDurationMin: 1, occurCount: 2, windowMin: 15 },
    warn:   { threshold: 500_000, minDurationMin: 5, occurCount: 2, windowMin: 15 },
    danger: { threshold: 1_000_000, minDurationMin: 10, occurCount: 1, windowMin: 10 },
  };

  const [enabled, setEnabled] = useState<boolean>(true);
  const [metric, setMetric] = useState<Metric>("dead_tuples");
  const [aggregation, setAggregation] = useState<Aggregation>("latest_avg");
  const [levels, setLevels] = useState<AlarmRulePayload["levels"]>(defaultLevels);

  const overlayRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLSelectElement>(null);

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

  // 프론트 상태 → 서버(JSONB) 페이로드 매핑
  const toServerJSONB = (p: AlarmRulePayload): ServerCreatePayload => ({
    instanceId: p.instanceId || null,
    databaseId: p.databaseId || null,
    metricType: p.metricType,
    aggregationType: p.aggregationType,
    operator: "gt",
    enabled: p.enabled,
    levels: {
      notice:   p.levels.notice,
      warning:  p.levels.warn,     // warn -> warning
      critical: p.levels.danger,   // danger -> critical
    },
  });

  const payload: AlarmRulePayload = useMemo(
    () => ({
      enabled,
      instanceId: selectedInstance?.instanceId || 0,
      databaseId: selectedDatabase?.databaseId || 0,
      metricType: metric,
      aggregationType: aggregation,
      levels,
    }),
    [enabled, selectedInstance, selectedDatabase, metric, aggregation, levels]
  );

  const handleSave = async () => {
    if (!selectedInstance) { alert("인스턴스를 선택해주세요."); return; }
    
    await onSubmit(payload);
    onClose();
  };

  const title = mode === "create" ? "알림 규칙 생성" : "알림 규칙 수정";
  const saveLabel = mode === "create" ? "규칙 생성" : "규칙 수정";

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onMouseDown={handleOutside}
      className="amr-overlay"
      aria-modal="true"
      role="dialog"
      aria-labelledby="alarm-rule-modal-title"
    >
      <div className="amr-modal" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 800 }}>
        <header className="amr-modal__header">
          <div id="alarm-rule-modal-title" className="amr-modal__title">{title}</div>
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
          <div className="ar-grid">
            <div>
              <div className="ar-kicker">대상 인스턴스</div>
              <input className="ar-select" value={selectedInstance?.instanceName || "선택 필요"} disabled style={{ backgroundColor: '#F3F4F6', cursor: 'not-allowed' }}/>
            </div>
            <div>
              <div className="ar-kicker">대상 데이터베이스</div>
              <input className="ar-select" value={selectedDatabase?.databaseName || "전체"} disabled style={{ backgroundColor: '#F3F4F6', cursor: 'not-allowed' }}/>
            </div>

            <div>
              <div className="ar-kicker">지표</div>
              <select ref={firstFieldRef} className="ar-select" value={metric} onChange={(e) => setMetric(e.target.value as Metric)}>
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
        </div>

        <footer className="amr-modal__footer">
          <button className="amr-btn" onClick={onClose}>취소</button>
          <button className="amr-btn amr-btn--primary" onClick={handleSave}>{saveLabel}</button>
        </footer>
      </div>
    </div>
  );
}
