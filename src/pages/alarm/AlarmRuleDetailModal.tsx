// 작성자: 김민서
// 알람 규칙 상세 조회 모달
// 역할: 규칙 상세 정보 표시 (읽기 전용)

import { useEffect, useRef, useState } from "react";
import "/src/styles/alarm/alarm-rule.css";
import "/src/styles/alarm/alarm-modal-root.css";
import apiClient from "../../api/apiClient";
import {
  CATEGORY_LABELS,
  METRIC_BY_CATEGORY,
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
  onEdit?: (ruleId: number) => void;
};

type RuleDetail = {
  enabled: boolean;
  instanceName: string;
  databaseName: string;
  category: MetricCategory | null;
  metric: Metric | null;
  operator: Operator;
  levels: {
    info: RuleThreshold;
    warn: RuleThreshold;
    critical: RuleThreshold;
  };
};

// ============= Constants =============
const EMPTY_THRESHOLD: RuleThreshold = {
  threshold: null,
  minDurationMin: null,
  occurCount: null,
  windowMin: null,
  resolveThreshold: null,
  resolveDurationMin: null,
  cooldownMin: null,
};

const INITIAL_DETAIL: RuleDetail = {
  enabled: true,
  instanceName: "",
  databaseName: "",
  category: null,
  metric: null,
  operator: "gt",
  levels: {
    info: { ...EMPTY_THRESHOLD },
    warn: { ...EMPTY_THRESHOLD },
    critical: { ...EMPTY_THRESHOLD },
  },
};

// ============= Utilities =============
const formatValue = (value: number | null, useLocale = false): string => {
  if (value === null || value === undefined) return "-";
  return useLocale ? value.toLocaleString() : String(value);
};

const findCategoryByMetric = (metricType: string): MetricCategory | null => {
  for (const [cat, metrics] of Object.entries(METRIC_BY_CATEGORY)) {
    if (metrics.some((m) => m.value === metricType)) {
      return cat as MetricCategory;
    }
  }
  return null;
};

const getMetricLabel = (metricType: Metric | null): string => {
  if (!metricType) return "-";
  const allMetrics = Object.values(METRIC_BY_CATEGORY).flat();
  return allMetrics.find((m) => m.value === metricType)?.label ?? metricType;
};

const getOperatorLabel = (operator: Operator): string => {
  return OPERATOR_OPTIONS.find((opt) => opt.value === operator)?.label ?? operator;
};

// ============= Main Component =============
export default function AlarmRuleDetailModal({ open, onClose, ruleId, onEdit }: Props) {
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<RuleDetail>(INITIAL_DETAIL);
  const overlayRef = useRef<HTMLDivElement>(null);

  // 규칙 상세 조회
  useEffect(() => {
    if (!open || !ruleId) return;

    const ac = new AbortController();

    (async () => {
      try {
        setLoading(true);

        const res = await apiClient.get(`/alarms/rules/${ruleId}`, { signal: ac.signal });
        const data = res.data;

        const metricType = data.metricType as Metric;
        const detectedCategory = data.metricCategory
          ? (data.metricCategory as MetricCategory)
          : metricType
          ? findCategoryByMetric(metricType)
          : null;

        setDetail({
          enabled: data.enabled ?? true,
          instanceName: data.instanceName || "Unknown",
          databaseName: data.databaseName || "Unknown",
          category: detectedCategory,
          metric: metricType,
          operator: (data.operator as Operator) || "gt",
          levels: {
            info: data.levels?.info || { ...EMPTY_THRESHOLD },
            warn: data.levels?.warn || { ...EMPTY_THRESHOLD },
            critical: data.levels?.critical || { ...EMPTY_THRESHOLD },
          },
        });
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

  // ESC 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
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
          <div id="alarm-rule-detail-title" className="amr-modal__title">
            알림 규칙 상세
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span className={`al-badge ${detail.enabled ? "al-badge--ok" : "al-badge--warn"}`}>
              {detail.enabled ? "활성화" : "비활성화"}
            </span>
          </div>
        </header>

        <div className="amr-modal__body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
          {loading ? (
            <div style={{ textAlign: "center", color: "#9CA3AF", padding: "40px" }}>로딩 중...</div>
          ) : (
            <>
              {/* 기본 정보 그리드 */}
              <RuleInfoGrid detail={detail} />

              {/* 임계값 테이블 */}
              <ThresholdTable levels={detail.levels} operator={detail.operator} />
            </>
          )}
        </div>

        <footer className="amr-modal__footer">
          <button className="amr-btn" onClick={onClose}>
            닫기
          </button>
          {onEdit && ruleId && (
            <button className="amr-btn amr-btn--primary" onClick={handleEdit}>
              수정
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

// ============= RuleInfoGrid Component =============
// 규칙 기본 정보 그리드

function RuleInfoGrid({ detail }: { detail: RuleDetail }) {
  return (
    <div className="ar-grid">
      <InfoField label="대상 인스턴스" value={detail.instanceName} />
      <InfoField label="대상 데이터베이스" value={detail.databaseName} />
      {detail.category && <InfoField label="카테고리" value={CATEGORY_LABELS[detail.category]} />}
      <InfoField label="지표" value={getMetricLabel(detail.metric)} />
      <InfoField label="연산자" value={getOperatorLabel(detail.operator)} />
    </div>
  );
}

// 단일 정보 필드 컴포넌트
function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="ar-kicker">{label}</div>
      <div
        className="ar-select"
        style={{
          backgroundColor: "#F9FAFB",
          padding: "10px 12px",
          border: "1px solid #E5E7EB",
          borderRadius: "6px",
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ============= ThresholdTable Component =============
// 임계값 테이블

type ThresholdTableProps = {
  levels: {
    info: RuleThreshold;
    warn: RuleThreshold;
    critical: RuleThreshold;
  };
  operator: Operator;
};

function ThresholdTable({ levels, operator }: ThresholdTableProps) {
  const rows = [
    {
      label: "임계치",
      info: formatValue(levels.info.threshold, true),
      warn: formatValue(levels.warn.threshold, true),
      critical: formatValue(levels.critical.threshold, true),
      unit: "",
      isOperatorRow: false,
    },
    {
      label: "연산자",
      info: "",
      warn: "",
      critical: "",
      unit: "",
      isOperatorRow: true,
      operatorLabel: getOperatorLabel(operator),
    },
    {
      label: "지속 시간",
      info: formatValue(levels.info.minDurationMin),
      warn: formatValue(levels.warn.minDurationMin),
      critical: formatValue(levels.critical.minDurationMin),
      unit: "분",
      isOperatorRow: false,
    },
    {
      label: "발생 횟수",
      info: formatValue(levels.info.occurCount),
      warn: formatValue(levels.warn.occurCount),
      critical: formatValue(levels.critical.occurCount),
      unit: "회",
      isOperatorRow: false,
    },
    {
      label: "윈도우",
      info: formatValue(levels.info.windowMin),
      warn: formatValue(levels.warn.windowMin),
      critical: formatValue(levels.critical.windowMin),
      unit: "분",
      isOperatorRow: false,
    },
    {
      label: "복구 임계치",
      info: formatValue(levels.info.resolveThreshold, true),
      warn: formatValue(levels.warn.resolveThreshold, true),
      critical: formatValue(levels.critical.resolveThreshold, true),
      unit: "",
      isOperatorRow: false,
    },
    {
      label: "복구 지속 시간",
      info: formatValue(levels.info.resolveDurationMin),
      warn: formatValue(levels.warn.resolveDurationMin),
      critical: formatValue(levels.critical.resolveDurationMin),
      unit: "분",
      isOperatorRow: false,
    },
    {
      label: "쿨다운",
      info: formatValue(levels.info.cooldownMin),
      warn: formatValue(levels.warn.cooldownMin),
      critical: formatValue(levels.critical.cooldownMin),
      unit: "분",
      isOperatorRow: false,
    },
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
                  {row.operatorLabel}
                </td>
              ) : (
                <>
                  <td>{row.info}</td>
                  <td>{row.warn}</td>
                  <td>{row.critical}</td>
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