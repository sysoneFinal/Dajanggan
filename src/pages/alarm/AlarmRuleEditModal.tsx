// 작성자: 김민서
// 알람 규칙 수정 모달
// 역할: 기존 규칙 조회 및 수정, 삭제 기능

import { useEffect, useMemo, useRef, useState } from "react";
import "/src/styles/alarm/alarm-rule.css";
import "/src/styles/alarm/alarm-modal-root.css";
import apiClient from "../../api/apiClient";
import {
  METRIC_BY_CATEGORY,
  CATEGORY_LABELS,
  OPERATOR_OPTIONS,
  type Metric,
  type MetricCategory,
  type Operator,
} from "./AlarmRuleModal";

// ============= Types =============
export interface RuleThreshold {
  threshold: number | null;
  minDurationMin: number | null;
  occurCount: number | null;
  windowMin: number | null;
  resolveThreshold: number | null;
  resolveDurationMin: number | null;
  cooldownMin: number | null;
}

type Props = {
  open: boolean;
  onClose: () => void;
  ruleId?: number;
  onSubmit?: (payload: ServerUpdatePayload) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  lockMetricInstanceOnEdit?: boolean;
};

type ServerRuleDetail = {
  alarmRuleId: number;
  instanceName: string;
  databaseName: string | null;
  metricType: Metric;
  operator: string;
  enabled: boolean;
  levels: {
    info: RuleThreshold;
    warn: RuleThreshold;
    critical: RuleThreshold;
  };
};

export type ServerUpdatePayload = {
  alarmRuleId: number;
  metricCategory?: MetricCategory;
  metricType?: Metric;
  operator?: Operator;
  enabled: boolean;
  levels: {
    info: RuleThreshold;
    warn: RuleThreshold;
    critical: RuleThreshold;
  };
};

// 프론트엔드 내부 상태용 (danger 사용)
type FrontendLevels = {
  info: RuleThreshold;
  warn: RuleThreshold;
  danger: RuleThreshold; // 내부에서는 danger 사용
};

// ============= Constants =============
const EMPTY_THRESHOLD: RuleThreshold = {
  threshold: 0,
  minDurationMin: 0,
  occurCount: 0,
  windowMin: 1,
  resolveThreshold: null,
  resolveDurationMin: null,
  cooldownMin: null,
};

const INITIAL_LEVELS: FrontendLevels = {
  info: { ...EMPTY_THRESHOLD },
  warn: { ...EMPTY_THRESHOLD },
  danger: { ...EMPTY_THRESHOLD },
};

// ============= Utilities =============
const findCategoryByMetric = (metricType: Metric): MetricCategory => {
  for (const [cat, metrics] of Object.entries(METRIC_BY_CATEGORY)) {
    if (metrics.some((m) => m.value === metricType)) {
      return cat as MetricCategory;
    }
  }
  return "vacuum";
};

const parseNumeric = (v: string): number | null => {
  const cleaned = String(v).replace(/[^0-9.-]/g, "").trim();
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

// ============= Main Component =============
export default function AlarmRuleEditModal({
  open,
  onClose,
  ruleId,
  onSubmit = async () => {},
  onDelete,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [instanceName, setInstanceName] = useState("");
  const [databaseName, setDatabaseName] = useState("");
  const [category, setCategory] = useState<MetricCategory>("vacuum");
  const [metric, setMetric] = useState<Metric>("autovacuum_worker_utilization");
  const [operator, setOperator] = useState<Operator>("gt");
  const [levels, setLevels] = useState<FrontendLevels>(INITIAL_LEVELS);

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
    () => currentMetricOptions.find((opt) => opt.value === metric)?.label ?? metric,
    [metric, currentMetricOptions]
  );

  // 카테고리 변경 시 첫 번째 지표로 초기화
  useEffect(() => {
    const firstMetric = currentMetricOptions[0];
    if (firstMetric && !currentMetricOptions.some((m) => m.value === metric)) {
      setMetric(firstMetric.value);
    }
  }, [category, currentMetricOptions, metric]);

  // 규칙 상세 조회
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
        setCategory(findCategoryByMetric(detail.metricType as Metric));
        setMetric(detail.metricType as Metric);
        setOperator((detail.operator as Operator) || "gt");

        // 서버(critical) → 프론트(danger) 매핑
        if (detail.levels) {
          setLevels({
            info: detail.levels.info,
            warn: detail.levels.warn,
            danger: detail.levels.critical, // critical → danger
          });
        }
      } catch (error: any) {
        if (error?.name !== "CanceledError") {
          console.error("규칙 조회 실패:", error);
          alert("규칙 조회에 실패했습니다.");
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [open, ruleId]);

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

  const updateLevel = (key: keyof FrontendLevels, field: keyof RuleThreshold, value: string) => {
    setLevels((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: parseNumeric(value) },
    }));
  };

  // 프론트(danger) → 서버(critical) 변환
  const toServerPayload = (): ServerUpdatePayload => ({
    alarmRuleId: ruleId!,
    metricCategory: category,
    metricType: metric,
    operator,
    enabled,
    levels: {
      info: levels.info,
      warn: levels.warn,
      critical: levels.danger, // danger → critical
    },
  });

  const handleSave = async () => {
    const serverPayload = toServerPayload();
    await onSubmit(serverPayload);
    onClose();
  };

  const handleDelete = async () => {
    if (!confirm("이 규칙을 삭제하시겠습니까?\n\n⚠️ 주의: 관련 알림 이력도 함께 삭제됩니다.")) return;

    try {
      if (onDelete) {
        await onDelete();
        alert("규칙이 삭제되었습니다.");
      }
    } catch (error: any) {
      console.error("삭제 실패:", error);
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
          <div id="alarm-rule-edit-title" className="amr-modal__title">
            알림 규칙 수정
          </div>
        </header>

        <div className="amr-modal__body" style={{ maxHeight: "75vh", overflowY: "auto" }}>
          {loading ? (
            <div style={{ textAlign: "center", color: "#9CA3AF", padding: "40px" }}>로딩 중...</div>
          ) : (
            <>
              {/* 기본 정보 */}
              <BasicInfoGrid
                instanceName={instanceName}
                databaseName={databaseName}
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
              <ThresholdEditTable levels={levels} operator={operator} onUpdateLevel={updateLevel} />

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
            </>
          )}
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
          <button className="amr-btn" onClick={onClose}>
            취소
          </button>
          <button className="amr-btn amr-btn--primary" onClick={handleSave}>
            규칙 수정
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
        maxHeight="220px"
      >
        {currentMetricOptions.map((opt) => (
          <button
            key={opt.value}
            className={`dropdown-item ${metric === opt.value ? "active" : ""}`}
            onClick={() => {
              onMetricChange(opt.value);
              onDropdownToggle(null);
            }}
          >
            {opt.label}
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
            fontWeight: 400,
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

// ============= ThresholdEditTable Component =============
// 임계값 편집 테이블

type ThresholdEditTableProps = {
  levels: FrontendLevels;
  operator: Operator;
  onUpdateLevel: (key: keyof FrontendLevels, field: keyof RuleThreshold, value: string) => void;
};

function ThresholdEditTable({ levels, operator, onUpdateLevel }: ThresholdEditTableProps) {
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