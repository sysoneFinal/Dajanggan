// 작성자: 김민서
// 알람 규칙 생성 모달
// 역할: 새로운 알람 규칙 생성

import { useEffect, useMemo, useRef, useState } from "react";
import "/src/styles/alarm/alarm-rule.css";
import "/src/styles/alarm/alarm-modal-root.css";
import { useInstanceContext } from "../../context/InstanceContext";

// ============= Types & Constants =============
export type MetricCategory = "vacuum" | "session" | "query" | "cpu";

export type Metric =
  | "autovacuum_worker_utilization"
  | "transaction_age"
  | "wraparound_progress"
  | "long_running_queries"
  | "lock_waits"
  | "long_idle_sessions"
  | "blocking_sessions"
  | "slow_query_spike"
  | "avg_execution_spike"
  | "qps_spike"
  | "cpu_usage_high";

export type Aggregation = "latest_avg" | "avg_5m" | "avg_15m" | "p95_15m";
export type Operator = "gt" | "gte" | "lt" | "lte" | "eq";

export interface RuleThreshold {
  threshold: number | null;
  minDurationMin: number | null;
  occurCount: number | null;
  windowMin: number | null;
  resolveThreshold: number | null;
  resolveDurationMin: number | null;
  cooldownMin: number | null;
}

export interface AlarmRulePayload {
  enabled: boolean;
  instanceId: number;
  databaseId: number;
  metricCategory: MetricCategory;
  metricType: Metric;
  aggregationType: Aggregation;
  operator: Operator;
  levels: {
    info: RuleThreshold;
    warn: RuleThreshold;
    danger: RuleThreshold;
  };
}

type Props = {
  open: boolean;
  onClose: () => void;
  mode?: "create" | "edit";
  onSubmit?: (payload: AlarmRulePayload) => void | Promise<void>;
};

// 카테고리별 지표 매핑
export const METRIC_BY_CATEGORY: Record<MetricCategory, { value: Metric; label: string }[]> = {
  vacuum: [
    { value: "autovacuum_worker_utilization", label: "Autovacuum Worker 사용률" },
    { value: "transaction_age", label: "트랜잭션 나이" },
    { value: "wraparound_progress", label: "Wraparound 진행률" },
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
  cpu: [{ value: "cpu_usage_high", label: "CPU 사용량" }],
};

export const CATEGORY_LABELS: Record<MetricCategory, string> = {
  vacuum: "Vacuum",
  session: "Session",
  query: "Query",
  cpu: "CPU",
};

export const OPERATOR_OPTIONS: { value: Operator; label: string }[] = [
  { value: "gt", label: "초과 (>)" },
  { value: "gte", label: "이상 (≥)" },
  { value: "lt", label: "미만 (<)" },
  { value: "lte", label: "이하 (≤)" },
  { value: "eq", label: "같음 (=)" },
];

export const AGGREGATION_OPTIONS: { value: Aggregation; label: string }[] = [
  { value: "latest_avg", label: "Latest Average" },
  { value: "avg_5m", label: "Avg (5m)" },
  { value: "avg_15m", label: "Avg (15m)" },
  { value: "p95_15m", label: "P95 (15m)" },
];

const EMPTY_THRESHOLD: RuleThreshold = {
  threshold: null,
  minDurationMin: null,
  occurCount: null,
  windowMin: null,
  resolveThreshold: null,
  resolveDurationMin: null,
  cooldownMin: null,
};

const INITIAL_LEVELS = {
  info: { ...EMPTY_THRESHOLD },
  warn: { ...EMPTY_THRESHOLD },
  danger: { ...EMPTY_THRESHOLD },
};

// ============= Utilities =============
const parseNumeric = (v: string): number | null => {
  const cleaned = String(v).replace(/[^0-9.-]/g, "").trim();
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

// ============= Main Component =============
export default function AlarmRuleModal({ open, onClose, mode = "create", onSubmit = async () => {} }: Props) {
  const { selectedInstance, selectedDatabase } = useInstanceContext();

  const [enabled, setEnabled] = useState(true);
  const [category, setCategory] = useState<MetricCategory>("vacuum");
  const [metric, setMetric] = useState<Metric>("transaction_age");
  const [aggregation, setAggregation] = useState<Aggregation>("latest_avg");
  const [operator, setOperator] = useState<Operator>("gt");
  const [levels, setLevels] = useState(INITIAL_LEVELS);

  const overlayRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLButtonElement>(null);
  const [openDropdown, setOpenDropdown] = useState<"category" | "metric" | "operator" | null>(null);

  const dropdownRefs = {
    category: useRef<HTMLDivElement>(null),
    metric: useRef<HTMLDivElement>(null),
    operator: useRef<HTMLDivElement>(null),
  };

  // 현재 카테고리의 지표 목록
  const currentMetricOptions = useMemo(() => METRIC_BY_CATEGORY[category] || [], [category]);

  const metricLabel = useMemo(
    () => currentMetricOptions.find((m) => m.value === metric)?.label ?? "지표 선택",
    [metric, currentMetricOptions]
  );

  // 카테고리 변경 시 첫 번째 지표로 초기화
  useEffect(() => {
    const firstMetric = currentMetricOptions[0];
    if (firstMetric) {
      setMetric(firstMetric.value);
    }
  }, [category, currentMetricOptions]);

  // ESC 키 처리
  useEffect(() => {
    if (!open) return;
    firstFieldRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // 드롭다운 외부 클릭 처리
  useEffect(() => {
    if (!openDropdown) return;

    const handleClick = (e: MouseEvent) => {
      const targetRef = dropdownRefs[openDropdown];
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
      operator,
      levels,
    }),
    [enabled, selectedInstance, selectedDatabase, category, metric, aggregation, operator, levels]
  );

  const handleSave = async () => {
    if (!selectedInstance) {
      alert("인스턴스를 선택해주세요.");
      return;
    }

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
          <div id="alarm-rule-modal-title" className="amr-modal__title">
            {title}
          </div>
        </header>

        <div className="amr-modal__body" style={{ maxHeight: "85vh", overflowY: "auto" }}>
          {/* 기본 정보 그리드 */}
          <BasicInfoGrid
            instanceName={selectedInstance?.instanceName || "선택 필요"}
            databaseName={selectedDatabase?.databaseName || "전체"}
            category={category}
            metric={metric}
            operator={operator}
            metricLabel={metricLabel}
            currentMetricOptions={currentMetricOptions}
            openDropdown={openDropdown}
            dropdownRefs={dropdownRefs}
            firstFieldRef={firstFieldRef}
            onCategoryChange={setCategory}
            onMetricChange={setMetric}
            onOperatorChange={setOperator}
            onDropdownToggle={setOpenDropdown}
          />

          {/* 임계값 테이블 */}
          <ThresholdCreateTable levels={levels} operator={operator} onUpdateLevel={updateLevel} />

          {/* 활성화 토글 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginTop: "1px",
              paddingTop: "16px",
              paddingRight: "10px",
            }}
          >
            <span style={{ fontSize: "14px", fontWeight: "500", color: "#374151" }}>활성화</span>
            <button
              type="button"
              aria-pressed={enabled}
              onClick={() => setEnabled((v) => !v)}
              className={`ar-toggle ${enabled ? "ar-toggle--on" : ""}`}
              title={enabled ? "활성화" : "비활성화"}
            >
              <span className="ar-dot" />
            </button>
          </div>
        </div>

        <footer className="amr-modal__footer">
          <button className="amr-btn" onClick={onClose}>
            취소
          </button>
          <button className="amr-btn amr-btn--primary" onClick={handleSave}>
            {saveLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}

// ============= BasicInfoGrid Component =============
// 기본 정보 그리드 (인스턴스, DB, 카테고리, 지표, 연산자)

type BasicInfoGridProps = {
  instanceName: string;
  databaseName: string;
  category: MetricCategory;
  metric: Metric;
  operator: Operator;
  metricLabel: string;
  currentMetricOptions: Array<{ label: string; value: Metric }>;
  openDropdown: "category" | "metric" | "operator" | null;
  dropdownRefs: {
    category: React.RefObject<HTMLDivElement>;
    metric: React.RefObject<HTMLDivElement>;
    operator: React.RefObject<HTMLDivElement>;
  };
  firstFieldRef: React.RefObject<HTMLButtonElement>;
  onCategoryChange: (category: MetricCategory) => void;
  onMetricChange: (metric: Metric) => void;
  onOperatorChange: (operator: Operator) => void;
  onDropdownToggle: (dropdown: "category" | "metric" | "operator" | null) => void;
};

function BasicInfoGrid({
  instanceName,
  databaseName,
  category,
  metric,
  operator,
  metricLabel,
  currentMetricOptions,
  openDropdown,
  dropdownRefs,
  firstFieldRef,
  onCategoryChange,
  onMetricChange,
  onOperatorChange,
  onDropdownToggle,
}: BasicInfoGridProps) {
  return (
    <div className="ar-grid">
      {/* 인스턴스 (비활성화) */}
      <div>
        <div className="ar-kicker">대상 인스턴스</div>
        <input
          className="ar-select"
          value={instanceName}
          disabled
          style={{ backgroundColor: "#F3F4F6", cursor: "not-allowed" }}
        />
      </div>

      {/* 데이터베이스 (비활성화) */}
      <div>
        <div className="ar-kicker">대상 데이터베이스</div>
        <input
          className="ar-select"
          value={databaseName}
          disabled
          style={{ backgroundColor: "#F3F4F6", cursor: "not-allowed" }}
        />
      </div>

      {/* 카테고리 드롭다운 */}
      <Dropdown
        label="카테고리"
        value={CATEGORY_LABELS[category]}
        isOpen={openDropdown === "category"}
        dropdownRef={dropdownRefs.category}
        buttonRef={firstFieldRef}
        onToggle={() => onDropdownToggle(openDropdown === "category" ? null : "category")}
      >
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button
            key={key}
            className={`dropdown-item ${category === key ? "active" : ""}`}
            onClick={() => {
              onCategoryChange(key as MetricCategory);
              onDropdownToggle(null);
            }}
          >
            {label}
          </button>
        ))}
      </Dropdown>

      {/* 지표 드롭다운 */}
      <Dropdown
        label="지표"
        value={metricLabel}
        isOpen={openDropdown === "metric"}
        dropdownRef={dropdownRefs.metric}
        onToggle={() => onDropdownToggle(openDropdown === "metric" ? null : "metric")}
        maxHeight="200px"
      >
        {currentMetricOptions.map((m) => (
          <button
            key={m.value}
            className={`dropdown-item ${metric === m.value ? "active" : ""}`}
            onClick={() => {
              onMetricChange(m.value);
              onDropdownToggle(null);
            }}
          >
            {m.label}
          </button>
        ))}
      </Dropdown>

      {/* 연산자 드롭다운 */}
      <Dropdown
        label="연산자"
        value={OPERATOR_OPTIONS.find((opt) => opt.value === operator)?.label ?? "연산자 선택"}
        isOpen={openDropdown === "operator"}
        dropdownRef={dropdownRefs.operator}
        onToggle={() => onDropdownToggle(openDropdown === "operator" ? null : "operator")}
      >
        {OPERATOR_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`dropdown-item ${operator === opt.value ? "active" : ""}`}
            onClick={() => {
              onOperatorChange(opt.value);
              onDropdownToggle(null);
            }}
          >
            {opt.label}
          </button>
        ))}
      </Dropdown>
    </div>
  );
}

// ============= Dropdown Component =============
// 재사용 가능한 드롭다운 컴포넌트

type DropdownProps = {
  label: string;
  value: string;
  isOpen: boolean;
  dropdownRef: React.RefObject<HTMLDivElement>;
  buttonRef?: React.RefObject<HTMLButtonElement>;
  onToggle: () => void;
  maxHeight?: string;
  children: React.ReactNode;
};

function Dropdown({
  label,
  value,
  isOpen,
  dropdownRef,
  buttonRef,
  onToggle,
  maxHeight,
  children,
}: DropdownProps) {
  return (
    <div>
      <div className="ar-kicker">{label}</div>
      <div className="dropdown-wrapper" ref={dropdownRef} style={{ position: "relative" }}>
        <button
          ref={buttonRef}
          type="button"
          className="header-btn"
          onClick={onToggle}
          style={{
            width: "100%",
            justifyContent: "space-between",
            padding: "10px 14px",
          }}
        >
          <span className="header-btn-text" style={{ fontWeight: 400 }}>
            {value}
          </span>
          <span className="dropdown-arrow">▼</span>
        </button>
        {isOpen && (
          <div
            className="dropdown-menu"
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              left: 0,
              width: "100%",
              zIndex: 20,
              ...(maxHeight && { maxHeight, overflowY: "auto" }),
            }}
          >
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

// ============= ThresholdCreateTable Component =============
// 임계값 생성 테이블

type ThresholdCreateTableProps = {
  levels: {
    info: RuleThreshold;
    warn: RuleThreshold;
    danger: RuleThreshold;
  };
  operator: Operator;
  onUpdateLevel: (key: "info" | "warn" | "danger", field: keyof RuleThreshold, value: string) => void;
};

function ThresholdCreateTable({ levels, operator, onUpdateLevel }: ThresholdCreateTableProps) {
  const rows: Array<{
    label: string;
    field: keyof RuleThreshold;
    unit: string;
    min?: number;
    step?: number;
    isOperatorRow?: boolean;
  }> = [
    { label: "임계치", field: "threshold", unit: "", min: 0, step: 1 },
    { label: "연산자", field: "threshold", unit: "", isOperatorRow: true },
    { label: "지속 시간", field: "minDurationMin", unit: "분", min: 0, step: 1 },
    { label: "발생 횟수", field: "occurCount", unit: "회", min: 0, step: 1 },
    { label: "윈도우", field: "windowMin", unit: "분", min: 1, step: 1 },
    { label: "복구 임계치", field: "resolveThreshold", unit: "", min: 0, step: 0.01 },
    { label: "복구 지속 시간", field: "resolveDurationMin", unit: "분", min: 0, step: 1 },
    { label: "쿨다운", field: "cooldownMin", unit: "분", min: 0, step: 1 },
  ];

  return (
    <div className="ar-tablewrap" style={{ marginTop: "24px" }}>
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
          {rows.map((row, index) => (
            <tr key={index} className="ar-row">
              <td className="ar-td-strong">{row.label}</td>
              {row.isOperatorRow ? (
                <td colSpan={3} style={{ textAlign: "center", padding: "10px" }}>
                  {OPERATOR_OPTIONS.find((opt) => opt.value === operator)?.label ?? operator}
                </td>
              ) : (
                <>
                  <td>
                    <input
                      className="ar-input"
                      type="number"
                      min={row.min}
                      step={row.step}
                      value={levels.info[row.field] ?? ""}
                      onChange={(e) => onUpdateLevel("info", row.field, e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="ar-input"
                      type="number"
                      min={row.min}
                      step={row.step}
                      value={levels.warn[row.field] ?? ""}
                      onChange={(e) => onUpdateLevel("warn", row.field, e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="ar-input"
                      type="number"
                      min={row.min}
                      step={row.step}
                      value={levels.danger[row.field] ?? ""}
                      onChange={(e) => onUpdateLevel("danger", row.field, e.target.value)}
                    />
                  </td>
                </>
              )}
              <td className="ar-right">{row.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}