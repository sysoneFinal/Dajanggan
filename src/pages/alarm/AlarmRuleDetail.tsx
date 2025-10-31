import React, { useMemo, useState } from "react";
import "/src/styles/alarm/alarm-rule.css"; 
/**
 * Alert Rule Create (CSS class-based)
 * - Uses provided ar-* styles for card/table/buttons/hover
 * - Minimal extra styles for inputs/toggles scoped in this component
 */

// ---------- Types ----------
export type Metric = "dead_tuples" | "bloat_pct" | "vacuum_backlog" | "wal_lag";
export type Aggregation = "latest_avg" | "avg_5m" | "avg_15m" | "p95_15m";

export interface RuleThreshold {
  threshold: number;       // 기준값
  minDurationMin: number;  // 지속 시간(분)
  occurCount: number;      // 발생 횟수(윈도우 내)
  windowMin: number;       // 윈도우(분)
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

export default function AlertRuleCreate({
  onSubmit,
}: {
  onSubmit?: (payload: AlertRulePayload) => void | Promise<void>;
}) {
  const [enabled, setEnabled] = useState(true);
  const [instance, setInstance] = useState("postgres");
  const [database, setDatabase] = useState("session");
  const [metric, setMetric] = useState<Metric>("dead_tuples");
  const [aggregation, setAggregation] = useState<Aggregation>("latest_avg");

  const [levels, setLevels] = useState({
    notice: { threshold: 100_000, minDurationMin: 1,  occurCount: 2, windowMin: 15 },
    warn:   { threshold: 500_000, minDurationMin: 5,  occurCount: 2, windowMin: 15 },
    danger: { threshold: 1_000_000, minDurationMin: 10, occurCount: 1, windowMin: 10 },
  });

  const updateLevel = (
    key: keyof typeof levels,
    field: keyof RuleThreshold,
    value: string
  ) => {
    const num = Number(String(value).replace(/[^0-9.-]/g, "")) || 0;
    setLevels((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: num },
    }));
  };

  const payload: AlertRulePayload = useMemo(
    () => ({ enabled, targetInstance: instance, targetDatabase: database, metric, aggregation, levels }),
    [enabled, instance, database, metric, aggregation, levels]
  );

  const handleSave = async () => { await onSubmit?.(payload); };

  return (
    <div className="ar-root">
      <section className="vd-card3">
        {/* Header */}
        <header className="vd-card3__header">
          <h3>알림 규칙 생성</h3>
          <button
            type="button"
            aria-pressed={enabled}
            onClick={() => setEnabled((v) => !v)}
            className={`ar-toggle ${enabled ? "ar-toggle--on" : ""}`}
            title={enabled ? "활성화" : "비활성화"}
          >
            <span className="ar-dot"/>
          </button>
        </header>

        {/* Selectors */}
        <div className="ar-grid" >
          <div>
            <div className="ar-kicker">대상 인스턴스</div>
            <select className="ar-select" value={instance} onChange={(e)=>setInstance(e.target.value)}>
              <option value="postgres">postgres</option>
              <option value="prod-pg01">prod-pg01</option>
              <option value="staging-pg">staging-pg</option>
            </select>
          </div>
          <div>
            <div className="ar-kicker">대상 데이터베이스</div>
            <select className="ar-select" value={database} onChange={(e)=>setDatabase(e.target.value)}>
              <option value="session">session</option>
              <option value="orders">orders</option>
              <option value="payments">payments</option>
            </select>
          </div>
           <div>
            <div className="ar-kicker">구분</div>
            <select className="ar-select" value={metric} onChange={(e)=>setMetric(e.target.value as Metric)}>
              <option value="dead_tuples">Vacuum</option>
              <option value="bloat_pct">Session</option>
              <option value="vacuum_backlog">Hot Table</option>
              <option value="wal_lag">Query</option>
            </select>
          </div>
          <div>
            <div className="ar-kicker">지표</div>
            <select className="ar-select" value={metric} onChange={(e)=>setMetric(e.target.value as Metric)}>
              <option value="dead_tuples">Dead Tuples</option>
              <option value="bloat_pct">Bloat %</option>
              <option value="vacuum_backlog">Vacuum Backlog</option>
              <option value="wal_lag">WAL Lag</option>
            </select>
          </div>
           <div>
            <div className="ar-kicker">집계</div>
            <select className="ar-select" value={aggregation} onChange={(e)=>setAggregation(e.target.value as Aggregation)}>
              <option value="latest_avg">Latest Average</option>
              <option value="avg_5m">Avg (5m)</option>
              <option value="avg_15m">Avg (15m)</option>
              <option value="p95_15m">P95 (15m)</option>
            </select>
          </div>
        </div>

        {/* Threshold Table */}
        <div className="ar-tablewrap">
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
              {/* 알람 레벨 */}
              <tr className="ar-row">
                <td className="ar-td-strong">알람 레벨</td>
                <td><input className="ar-input" value={levels.notice.threshold}
                      onChange={(e)=>updateLevel("notice","threshold", e.target.value)} /></td>
                <td><input className="ar-input" value={levels.warn.threshold}
                      onChange={(e)=>updateLevel("warn","threshold", e.target.value)} /></td>
                <td><input className="ar-input" value={levels.danger.threshold}
                      onChange={(e)=>updateLevel("danger","threshold", e.target.value)} /></td>
                <td className="ar-right"></td>
              </tr>

              {/* 지속 시간 */}
              <tr className="ar-row">
                <td className="ar-td-strong">지속 시간</td>
                <td><input className="ar-input" value={levels.notice.minDurationMin}
                      onChange={(e)=>updateLevel("notice","minDurationMin", e.target.value)} /></td>
                <td><input className="ar-input" value={levels.warn.minDurationMin}
                      onChange={(e)=>updateLevel("warn","minDurationMin", e.target.value)} /></td>
                <td><input className="ar-input" value={levels.danger.minDurationMin}
                      onChange={(e)=>updateLevel("danger","minDurationMin", e.target.value)} /></td>
                <td className="ar-right">분</td>
              </tr>

              {/* 발생 횟수 */}
              <tr className="ar-row">
                <td className="ar-td-strong">발생 횟수</td>
                <td><input className="ar-input" value={levels.notice.occurCount}
                      onChange={(e)=>updateLevel("notice","occurCount", e.target.value)} /></td>
                <td><input className="ar-input" value={levels.warn.occurCount}
                      onChange={(e)=>updateLevel("warn","occurCount", e.target.value)} /></td>
                <td><input className="ar-input" value={levels.danger.occurCount}
                      onChange={(e)=>updateLevel("danger","occurCount", e.target.value)} /></td>
                <td className="ar-right">회</td>
              </tr>

              {/* 윈도우 */}
              <tr className="ar-row">
                <td className="ar-td-strong">윈도우</td>
                <td><input className="ar-input" value={levels.notice.windowMin}
                      onChange={(e)=>updateLevel("notice","windowMin", e.target.value)} /></td>
                <td><input className="ar-input" value={levels.warn.windowMin}
                      onChange={(e)=>updateLevel("warn","windowMin", e.target.value)} /></td>
                <td><input className="ar-input" value={levels.danger.windowMin}
                      onChange={(e)=>updateLevel("danger","windowMin", e.target.value)} /></td>
                <td className="ar-right">분</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Save Button */}
        <div className="ar-save">
          <button className="al-btn" onClick={handleSave}>규칙 저장</button>
        </div>

      </section>
    </div>
  );
}
