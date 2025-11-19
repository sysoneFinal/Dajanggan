import React, { useEffect, useMemo, useRef, useState } from "react";
import "/src/styles/alarm/alarm-rule.css";
import "/src/styles/alarm/alarm-modal-root.css";
import { useInstanceContext } from "../../context/InstanceContext";

// 카테고리 타입
export type MetricCategory = "vacuum" | "session" | "query";

// 지표 타입 확장
export type Metric = 
  // Vacuum
  | "autovacuum_worker_utilization"
  | "blockers_per_hour"
  | "transaction_age"
  | "block_duration"
  | "wraparound_progress"
  | "total_table_bloat"
  | "bloat_percent"
  | "dead_tuples"
  | "table_size"
  // Session
  | "long_running_queries"
  | "lock_waits"
  | "long_idle_sessions"
  | "blocking_sessions"
  // Query
  | "slow_query_spike"
  | "avg_execution_spike"
  | "qps_spike";

export type Aggregation = "latest_avg" | "avg_5m" | "avg_15m" | "p95_15m";

// 카테고리별 지표 매핑
export const METRIC_BY_CATEGORY: Record<MetricCategory, { value: Metric; label: string }[]> = {
  vacuum: [
    { value: "autovacuum_worker_utilization", label: "Autovacuum Worker 사용률" },
    { value: "blockers_per_hour", label: "시간당 블로커 수" },
    { value: "transaction_age", label: "트랜잭션 나이" },
    { value: "block_duration", label: "블록 지속 시간" },
    { value: "wraparound_progress", label: "Wraparound 진행률" },
    { value: "total_table_bloat", label: "전체 테이블 Bloat" },
    { value: "bloat_percent", label: "Bloat 비율" },
    { value: "dead_tuples", label: "Dead Tuples" },
    { value: "table_size", label: "테이블 크기" },
  ],
  session: [
    { value: "long_running_queries", label: "장기 실행 쿼리" },
    { value: "lock_waits", label: "락 대기" },
    { value: "long_idle_sessions", label: "장기 유휴 세션" },
    { value: "blocking_sessions", label: "블로킹 세션" },
  ],
  query: [
    { value: "slow_query_spike", label: "슬로우 쿼리 급증" },
    { value: "avg_execution_spike", label: "평균 실행 시간 급증" },
    { value: "qps_spike", label: "QPS 급증" },
  ],
};

// 카테고리 라벨
export const CATEGORY_LABELS: Record<MetricCategory, string> = {
  vacuum: "Vacuum",
  session: "Session",
  query: "Query",
};

export const AGGREGATION_OPTIONS: { value: Aggregation; label: string }[] = [
  { value: "latest_avg", label: "Latest Average" },
  { value: "avg_5m", label: "Avg (5m)" },
  { value: "avg_15m", label: "Avg (15m)" },
  { value: "p95_15m", label: "P95 (15m)" },
];

export interface RuleThreshold {
  threshold: number | null;
  minDurationMin: number | null;
  occurCount: number | null;
  windowMin: number | null;
}

export interface AlarmRulePayload {
  enabled: boolean;
  instanceId: number;
  databaseId: number;
  metricType: Metric;
  aggregationType: Aggregation;
  levels: {
    notice: RuleThreshold;
    warn: RuleThreshold;
    danger: RuleThreshold;
  };
}

type Mode = "create" | "edit";

export interface ServerCreatePayload {
  instanceId: number | null;
  databaseId: number | null;
  metricCategory: MetricCategory;
  metricType: Metric;
  aggregationType: Aggregation;
  operator: "gt" | "gte" | "lt" | "lte" | "eq";
  enabled: boolean;
  levels: {
    notice: RuleThreshold;
    warning: RuleThreshold;
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

  const emptyLevel: RuleThreshold = { threshold: null, minDurationMin: null, occurCount: null, windowMin: null };

  const [enabled, setEnabled] = useState<boolean>(true);
  const [category, setCategory] = useState<MetricCategory>("vacuum");
  const [metric, setMetric] = useState<Metric>("dead_tuples");
  const [aggregation, setAggregation] = useState<Aggregation>("latest_avg");
  const [levels, setLevels] = useState<AlarmRulePayload["levels"]>({
    notice: { ...emptyLevel },
    warn: { ...emptyLevel },
    danger: { ...emptyLevel },
  });

  const overlayRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLButtonElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const metricDropdownRef = useRef<HTMLDivElement>(null);
  const aggregationDropdownRef = useRef<HTMLDivElement>(null);
  const [openDropdown, setOpenDropdown] = useState<"category" | "metric" | "aggregation" | null>(null);

  // 카테고리 변경 시 첫 번째 지표로 초기화
  useEffect(() => {
    const firstMetric = METRIC_BY_CATEGORY[category][0];
    if (firstMetric) {
      setMetric(firstMetric.value);
    }
  }, [category]);

  useEffect(() => {
    if (!open) return;
    firstFieldRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!openDropdown) return;
    const handleClick = (e: MouseEvent) => {
      const refMap = {
        category: categoryDropdownRef,
        metric: metricDropdownRef,
        aggregation: aggregationDropdownRef,
      } as const;
      const targetRef = refMap[openDropdown];
      if (targetRef.current && !targetRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClick, true);
    return () => document.removeEventListener("mousedown", handleClick, true);
  }, [openDropdown]);

  const handleOutside = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const parseNumeric = (v: string): number | null => {
    const cleaned = String(v).replace(/[^0-9.-]/g, "").trim();
    if (cleaned === "") return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  };

  const updateLevel = (key: keyof typeof levels, field: keyof RuleThreshold, value: string) => {
    setLevels((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: parseNumeric(value) },
    }));
  };

  const payload: AlarmRulePayload = useMemo(
    () => ({
      enabled,
      instanceId: selectedInstance?.instanceId || 0,
      databaseId: selectedDatabase?.databaseId || 0,
      metricCategory: category,
      metricType: metric,
      aggregationType: aggregation,
      levels,
    }),
    [enabled, selectedInstance, selectedDatabase, category, metric, aggregation, levels]
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

            {/* 카테고리 선택 */}
            <div>
              <div className="ar-kicker">카테고리</div>
              <div
                className="dropdown-wrapper"
                ref={categoryDropdownRef}
                style={{ position: "relative" }}
              >
                <button
                  ref={firstFieldRef}
                  type="button"
                  className="header-btn"
                  onClick={() => setOpenDropdown((prev) => (prev === "category" ? null : "category"))}
                  style={{
                    width: "100%",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                  }}
                >
                  <span className="header-btn-text" style={{ fontWeight: 400 }}>{CATEGORY_LABELS[category]}</span>
                  <span className="dropdown-arrow">▼</span>
                </button>
                {openDropdown === "category" && (
                  <div className="dropdown-menu" style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, width: "100%", zIndex: 20 }}>
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <button
                        key={key}
                        className={`dropdown-item ${category === key ? "active" : ""}`}
                        style={{ fontWeight: 400 }}
                        onClick={() => {
                          setCategory(key as MetricCategory);
                          setOpenDropdown(null);
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 지표 선택 - 카테고리에 따라 동적으로 변경 */}
            <div>
              <div className="ar-kicker">지표</div>
              <div
                className="dropdown-wrapper"
                ref={metricDropdownRef}
                style={{ position: "relative" }}
              >
                <button
                  type="button"
                  className="header-btn"
                  onClick={() => setOpenDropdown((prev) => (prev === "metric" ? null : "metric"))}
                  style={{
                    width: "100%",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                  }}
                >
                  <span className="header-btn-text" style={{ fontWeight: 400 }}>
                    {METRIC_BY_CATEGORY[category].find((m) => m.value === metric)?.label ?? "지표 선택"}
                  </span>
                  <span className="dropdown-arrow">▼</span>
                </button>
                {openDropdown === "metric" && (
                  <div className="dropdown-menu" style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, width: "100%", zIndex: 20, maxHeight: "200px", overflowY: "auto" }}>
                    {METRIC_BY_CATEGORY[category].map((m) => (
                      <button
                        key={m.value}
                        className={`dropdown-item ${metric === m.value ? "active" : ""}`}
                        style={{ fontWeight: 400 }}
                        onClick={() => {
                          setMetric(m.value);
                          setOpenDropdown(null);
                        }}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="ar-kicker">집계</div>
              <div
                className="dropdown-wrapper"
                ref={aggregationDropdownRef}
                style={{ position: "relative" }}
              >
                <button
                  type="button"
                  className="header-btn"
                  onClick={() =>
                    setOpenDropdown((prev) => (prev === "aggregation" ? null : "aggregation"))
                  }
                  style={{
                    width: "100%",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                  }}
                >
                  <span className="header-btn-text" style={{ fontWeight: 400 }}>
                    {AGGREGATION_OPTIONS.find((opt) => opt.value === aggregation)?.label ??
                      "집계 선택"}
                  </span>
                  <span className="dropdown-arrow">▼</span>
                </button>
                {openDropdown === "aggregation" && (
                  <div
                    className="dropdown-menu"
                    style={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      left: 0,
                      width: "100%",
                      zIndex: 20,
                    }}
                  >
                    {AGGREGATION_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        className={`dropdown-item ${aggregation === opt.value ? "active" : ""}`}
                        style={{ fontWeight: 400 }}
                        onClick={() => {
                          setAggregation(opt.value);
                          setOpenDropdown(null);
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
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
                      <td><input className="ar-input" type="number" min={0} step={1}
                            value={levels.notice.threshold ?? ""}
                        onChange={(e) => updateLevel("notice", "threshold", e.target.value)} /></td>
                      <td><input className="ar-input" type="number" min={0} step={1}
                            value={levels.warn.threshold ?? ""}
                        onChange={(e) => updateLevel("warn", "threshold", e.target.value)} /></td>
                      <td><input className="ar-input" type="number" min={0} step={1}
                            value={levels.danger.threshold ?? ""}
                        onChange={(e) => updateLevel("danger", "threshold", e.target.value)} /></td>
                  <td className="ar-right"></td>
                </tr>

                <tr className="ar-row">
                  <td className="ar-td-strong">지속 시간</td>
                      <td><input className="ar-input" type="number" min={0} step={1}
                            value={levels.notice.minDurationMin ?? ""}
                        onChange={(e) => updateLevel("notice", "minDurationMin", e.target.value)} /></td>
                      <td><input className="ar-input" type="number" min={0} step={1}
                            value={levels.warn.minDurationMin ?? ""}
                        onChange={(e) => updateLevel("warn", "minDurationMin", e.target.value)} /></td>
                      <td><input className="ar-input" type="number" min={0} step={1}
                            value={levels.danger.minDurationMin ?? ""}
                        onChange={(e) => updateLevel("danger", "minDurationMin", e.target.value)} /></td>
                  <td className="ar-right">분</td>
                </tr>

                <tr className="ar-row">
                  <td className="ar-td-strong">발생 횟수</td>
                      <td><input className="ar-input" type="number" min={0} step={1}
                            value={levels.notice.occurCount ?? ""}
                        onChange={(e) => updateLevel("notice", "occurCount", e.target.value)} /></td>
                      <td><input className="ar-input" type="number" min={0} step={1}
                            value={levels.warn.occurCount ?? ""}
                        onChange={(e) => updateLevel("warn", "occurCount", e.target.value)} /></td>
                      <td><input className="ar-input" type="number" min={0} step={1}
                            value={levels.danger.occurCount ?? ""}
                        onChange={(e) => updateLevel("danger", "occurCount", e.target.value)} /></td>
                  <td className="ar-right">회</td>
                </tr>

                <tr className="ar-row">
                  <td className="ar-td-strong">윈도우</td>
                      <td><input className="ar-input" type="number" min={1} step={1}
                            value={levels.notice.windowMin ?? ""}
                        onChange={(e) => updateLevel("notice", "windowMin", e.target.value)} /></td>
                      <td><input className="ar-input" type="number" min={1} step={1}
                            value={levels.warn.windowMin ?? ""}
                        onChange={(e) => updateLevel("warn", "windowMin", e.target.value)} /></td>
                      <td><input className="ar-input" type="number" min={1} step={1}
                            value={levels.danger.windowMin ?? ""}
                        onChange={(e) => updateLevel("danger", "windowMin", e.target.value)} /></td>
                  <td className="ar-right">분</td>
                </tr>
              </tbody>
            </table>
          </div>
           {/* 활성화 버튼을 테이블 아래에 추가 */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            marginTop: '1px',
            paddingTop: '16px',
            paddingRight: '10px'
          }}>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>활성화</span>
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
        </div>

        <footer className="amr-modal__footer">
          <button className="amr-btn" onClick={onClose}>취소</button>
          <button className="amr-btn amr-btn--primary" onClick={handleSave}>{saveLabel}</button>
        </footer>
      </div>
    </div>
  );
}