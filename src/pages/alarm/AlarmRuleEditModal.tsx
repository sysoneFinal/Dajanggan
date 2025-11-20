import React, { useEffect, useMemo, useRef, useState } from "react";
import "/src/styles/alarm/alarm-rule.css";
import "/src/styles/alarm/alarm-modal-root.css";
import apiClient from "../../api/apiClient";
import {
  AGGREGATION_OPTIONS,
  METRIC_BY_CATEGORY,
  CATEGORY_LABELS,
  OPERATOR_OPTIONS,
  type Metric,
} from "./AlarmRuleModal";
import type { Aggregation, MetricCategory, Operator } from "./AlarmRuleModal";

export interface RuleThreshold {
  threshold: number | null;
  minDurationMin: number | null;
  occurCount: number | null;
  windowMin: number | null;
}

export interface ServerRuleDetail {
  alarmRuleId: number;
  instanceName: string;
  databaseName: string | null;
  metricType: Metric;
  aggregationType: Aggregation;
  operator: string;
  enabled: boolean;
  levels: {
    notice: RuleThreshold;
    warning: RuleThreshold;
    critical: RuleThreshold;
  };
}

export interface ServerUpdatePayload {
  alarmRuleId: number;
  metricCategory?: MetricCategory;
  metricType?: Metric;
  aggregationType: Aggregation;
  operator?: Operator;
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
  const [category, setCategory] = useState<MetricCategory>("vacuum");
  const [metric, setMetric] = useState<Metric>("dead_tuples");
  const [aggregation, setAggregation] = useState<Aggregation>("latest_avg");
  const [operator, setOperator] = useState<Operator>("gt");
  const [levels, setLevels] = useState<{
    notice: RuleThreshold;// 프론트 내부 키
    warn: RuleThreshold;    
    danger: RuleThreshold;  
  }>({
    notice: { threshold: 0, minDurationMin: 0, occurCount: 0, windowMin: 1 },
    warn:   { threshold: 0, minDurationMin: 0, occurCount: 0, windowMin: 1 },
    danger: { threshold: 0, minDurationMin: 0, occurCount: 0, windowMin: 1 },
  });

  const overlayRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLButtonElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const metricDropdownRef = useRef<HTMLDivElement>(null);
  const aggregationDropdownRef = useRef<HTMLDivElement>(null);
  const operatorDropdownRef = useRef<HTMLDivElement>(null);
  const [openDropdown, setOpenDropdown] = useState<"category" | "metric" | "aggregation" | "operator" | null>(null);

  // metricType으로부터 카테고리 찾기
  const findCategoryByMetric = (metricType: Metric): MetricCategory => {
    for (const [cat, metrics] of Object.entries(METRIC_BY_CATEGORY)) {
      if (metrics.some((m) => m.value === metricType)) {
        return cat as MetricCategory;
      }
    }
    return "vacuum"; // 기본값
  };

  // 현재 카테고리의 지표 목록
  const currentMetricOptions = useMemo(() => {
    return METRIC_BY_CATEGORY[category] || [];
  }, [category]);

  const metricLabel = useMemo(() => {
    return currentMetricOptions.find((opt) => opt.value === metric)?.label ?? metric;
  }, [metric, currentMetricOptions]);

  // 카테고리 변경 시 첫 번째 지표로 초기화
  useEffect(() => {
    const firstMetric = currentMetricOptions[0];
    if (firstMetric && !currentMetricOptions.some((m) => m.value === metric)) {
      setMetric(firstMetric.value);
    }
  }, [category, currentMetricOptions, metric]);

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
        const detectedCategory = findCategoryByMetric(detail.metricType as Metric);
        setCategory(detectedCategory);
        setMetric(detail.metricType as Metric);
        setAggregation(detail.aggregationType as Aggregation);
        setOperator((detail.operator as Operator) || "gt");

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

  useEffect(() => {
    if (!openDropdown) return;
    const handleClick = (e: MouseEvent) => {
      const refMap = {
        category: categoryDropdownRef,
        metric: metricDropdownRef,
        aggregation: aggregationDropdownRef,
        operator: operatorDropdownRef,
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

  // 프론트 상태 → 서버(JSONB) 업데이트 페이로드
  const toServerUpdate = (): ServerUpdatePayload => ({
    alarmRuleId: ruleId!,
    metricCategory: category,
    metricType: metric,
    aggregationType: aggregation,
    operator,
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
          </div>
        </header>

        <div className="amr-modal__body" style={{ maxHeight: '73vh', overflowY: 'auto' }}>
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
                      onClick={() =>
                        setOpenDropdown((prev) => (prev === "category" ? null : "category"))
                      }
                      style={{
                        width: "100%",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        fontWeight: 400,
                      }}
                    >
                      <span className="header-btn-text" style={{ fontWeight: 400 }}>
                        {CATEGORY_LABELS[category]}
                      </span>
                      <span className="dropdown-arrow">▼</span>
                    </button>
                    {openDropdown === "category" && (
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

                <div>
                  <div className="ar-kicker">지표</div>
                  <div
                    className="dropdown-wrapper"
                    ref={metricDropdownRef}
                    style={{ position: "relative" }}
                  >
                    <button
                      ref={firstFieldRef}
                      type="button"
                      className="header-btn"
                      onClick={() => {
                        setOpenDropdown((prev) => (prev === "metric" ? null : "metric"));
                      }}
                      style={{
                        width: "100%",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        fontWeight: 400,
                      }}
                    >
                      <span className="header-btn-text" style={{ fontWeight: 400 }}>
                        {metricLabel}
                      </span>
                      <span className="dropdown-arrow">▼</span>
                    </button>
                    {openDropdown === "metric" && (
                      <div
                        className="dropdown-menu"
                        style={{
                          position: "absolute",
                          top: "calc(100% + 8px)",
                          left: 0,
                          width: "100%",
                          zIndex: 20,
                          maxHeight: "220px",
                          overflowY: "auto",
                        }}
                      >
                        {currentMetricOptions.map((opt) => (
                          <button
                            key={opt.value}
                            className={`dropdown-item ${metric === opt.value ? "active" : ""}`}
                            style={{ fontWeight: 400 }}
                            onClick={() => {
                              setMetric(opt.value);
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
                        fontWeight: 400,
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

                <div>
                  <div className="ar-kicker">연산자</div>
                  <div
                    className="dropdown-wrapper"
                    ref={operatorDropdownRef}
                    style={{ position: "relative" }}
                  >
                    <button
                      type="button"
                      className="header-btn"
                      onClick={() =>
                        setOpenDropdown((prev) => (prev === "operator" ? null : "operator"))
                      }
                      style={{
                        width: "100%",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        fontWeight: 400,
                      }}
                    >
                      <span className="header-btn-text" style={{ fontWeight: 400 }}>
                        {OPERATOR_OPTIONS.find((opt) => opt.value === operator)?.label ?? "연산자 선택"}
                      </span>
                      <span className="dropdown-arrow">▼</span>
                    </button>
                    {openDropdown === "operator" && (
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
                        {OPERATOR_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            className={`dropdown-item ${operator === opt.value ? "active" : ""}`}
                            style={{ fontWeight: 400 }}
                            onClick={() => {
                              setOperator(opt.value);
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
                      <td className="ar-td-strong">연산자</td>
                      <td colSpan={3} style={{ textAlign: "center", padding: "10px" }}>
                        {OPERATOR_OPTIONS.find((opt) => opt.value === operator)?.label ?? operator}
                      </td>
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
