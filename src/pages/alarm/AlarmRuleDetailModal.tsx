// src/pages/alarm/AlarmRuleDetailModal.tsx
import React, { useEffect, useRef } from "react";
import "/src/styles/alarm/alarm-rule-detail.css";
import "/src/styles/alarm/alarm-modal-root.css";
import AlarmRuleEditModal from "./AlarmRuleEditModal";


type Metric = "dead_tuples" | "bloat_pct" | "vacuum_backlog" | "wal_lag";
type Aggregation = "latest_avg" | "avg_5m" | "avg_15m" | "p95_15m";
type Section = "vacuum" | "bloat" | "wal" | "session";

interface RuleThreshold {
  threshold: number;
  minDurationMin: number;
  occurCount: number;
  windowMin: number;
}

export interface SavedAlertRule {
  id: number;
  enabled: boolean;
  tardgetInstance: string;
  tardgetDatabase: string;
  section: Section;
  metric: Metric;
  aggregation: Aggregation;
  updatedAt?: string;
  levels: {
    notice: RuleThreshold;
    wardning: RuleThreshold;
    critical: RuleThreshold;
  };
}

/** 데모 데이터 (id로 조회 가능하도록) */
const DEMO_RULES: SavedAlertRule[] = [
  {
    id: 1,
    enabled: true,
    tardgetInstance: "prod-pg01",
    tardgetDatabase: "orders",
    section: "vacuum",
    metric: "dead_tuples",
    aggregation: "avg_5m",
    updatedAt: "2025-11-02 15:20",
    levels: {
      notice: { threshold: 10000, minDurationMin: 5, occurCount: 1, windowMin: 10 },
      wardning: { threshold: 50000, minDurationMin: 10, occurCount: 2, windowMin: 15 },
      critical: { threshold: 100000, minDurationMin: 15, occurCount: 3, windowMin: 20 },
    },
  },
  {
    id: 2,
    enabled: false,
    tardgetInstance: "staging-pg",
    tardgetDatabase: "sessions",
    section: "bloat",
    metric: "bloat_pct",
    aggregation: "avg_15m",
    updatedAt: "2025-10-25 09:40",
    levels: {
      notice: { threshold: 10, minDurationMin: 10, occurCount: 1, windowMin: 15 },
      wardning: { threshold: 20, minDurationMin: 20, occurCount: 2, windowMin: 25 },
      critical: { threshold: 30, minDurationMin: 30, occurCount: 3, windowMin: 30 },
    },
  },
  {
    id: 3,
    enabled: true,
    tardgetInstance: "prod-pg02",
    tardgetDatabase: "analytics",
    section: "wal",
    metric: "wal_lag",
    aggregation: "latest_avg",
    updatedAt: "2025-11-01 13:00",
    levels: {
      notice: { threshold: 100, minDurationMin: 5, occurCount: 1, windowMin: 10 },
      wardning: { threshold: 200, minDurationMin: 10, occurCount: 2, windowMin: 15 },
      critical: { threshold: 500, minDurationMin: 15, occurCount: 3, windowMin: 20 },
    },
  },
];

const SECTION_LABEL: Record<Section, string> = {
  vacuum: "Vacuum",
  bloat: "Bloat",
  wal: "WAL",
  session: "Session",
};

const METRIC_LABEL: Record<Metric, string> = {
  dead_tuples: "Dead tuples",
  bloat_pct: "Bloat %",
  vacuum_backlog: "Vacuum backlog",
  wal_lag: "WAL lag",
};

const AGG_LABEL: Record<Aggregation, string> = {
  latest_avg: "최근값 평균",
  avg_5m: "5분 평균",
  avg_15m: "15분 평균",
  p95_15m: "p95(15m)",
};

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

interface AlarmRuleDetailModalProps {
  open: boolean;
  onClose: () => void;
  ruleId?: number;
  rule?: SavedAlertRule;
  onEdit?: (rule: SavedAlertRule) => void;
}

export default function AlarmRuleDetailModal({
  open,
  onClose,
  ruleId,
  rule: ruleProp,
  onEdit,
}: AlarmRuleDetailModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // rule 우선순위: prop으로 전달된 rule → ruleId로 찾은 rule
  const rule = ruleProp ?? (ruleId ? DEMO_RULES.find((r) => r.id === ruleId) : undefined);

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
    if (rule && onEdit) {
      onEdit(rule);
      onClose();
    }
  };

  if (!open) return null;

  if (!rule) {
    return (
      <div
        ref={overlayRef}
        onMouseDown={handleOutside}
        className="amr-overlay"
        aria-modal="true"
        role="dialog"
      >
        <div className="amr-modal" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 900 }}>
          <header className="amr-modal__header">
            <div className="amr-modal__title">알림 규칙 상세</div>
          </header>
        <div className="amr-modal__body" style={{ height: "20vh", maxHeight: "20vh", overflowY: "auto", padding: "16px" }}>
            <div className="ard-empty">
              규칙을 찾을 수 없습니다.
              <br />
              올바른 규칙 ID를 전달해주세요.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={overlayRef}
      onMouseDown={handleOutside}
      className="amr-overlay"
      aria-modal="true"
      role="dialog"
    >
      <div className="amr-modal" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 900 }}>
        <header className="amr-modal__header">
          <div className="amr-modal__title">알림 규칙 상세</div>
        </header>

        <div className="amr-modal__body" style={{ height: "50vh", maxHeight: "50vh", overflowY: "auto", padding: "16px" }}>
          {/* 규칙 헤더 정보 */}
          <div className="ard-rule-header" style={{ marginBottom: "24px" }}>
            <div className="ard-rule-title">
              <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 600 }}>
                {SECTION_LABEL[rule.section]} · {METRIC_LABEL[rule.metric]}{" "}
                <span className="ard-dim">({AGG_LABEL[rule.aggregation]})</span>
              </h3>
              <div className="ard-sub" style={{ marginTop: "8px", fontSize: "14px", color: "#6b7280" }}>
                <span className="ard-kicker">인스턴스</span> {rule.tardgetInstance}
                <span className="ard-sep">•</span>
                <span className="ard-kicker">데이터베이스</span> {rule.tardgetDatabase}
                {rule.updatedAt && (
                  <>
                    <span className="ard-sep">•</span>
                    <span className="ard-kicker">업데이트</span> {rule.updatedAt}
                  </>
                )}
              </div>
            </div>
            <div className="ard-badges" style={{ marginTop: "12px" }}>
              <span
                className={`ard-chip ${rule.enabled ? "ard-chip--on" : "ard-chip--off"}`}
              >
                {rule.enabled ? "ENABLED" : "DISABLED"}
              </span>
            </div>
          </div>

          {/* 임계값 표 */}
          <div className="ard-tablewrap">
            <table className="ard-table">
              <thead>
                <tr>
                  <th></th>
                  <th>주의</th>
                  <th>경고</th>
                  <th>위험</th>
                </tr>
              </thead>
              <tbody>
               
                <tr className="ard-row">
                  <td className="ard-td-strong">알람 레벨</td>
                  <td>{fmt(rule.levels.notice.threshold)}</td>
                  <td>{fmt(rule.levels.wardning.threshold)}</td>
                  <td>{fmt(rule.levels.critical.threshold)}</td>
                </tr>
                <tr className="ard-row">
                  <td className="ard-td-strong">지속 시간(분)</td>
                  <td>{rule.levels.notice.minDurationMin}</td>
                  <td>{rule.levels.wardning.minDurationMin}</td>
                  <td>{rule.levels.critical.minDurationMin}</td>
                </tr>
                <tr className="ard-row">
                  <td className="ard-td-strong">발생 횟수</td>
                  <td>{rule.levels.notice.occurCount}</td>
                  <td>{rule.levels.wardning.occurCount}</td>
                  <td>{rule.levels.critical.occurCount}</td>
                </tr>
                <tr className="ard-row">
                  <td className="ard-td-strong">윈도우(분)</td>
                  <td>{rule.levels.notice.windowMin}</td>
                  <td>{rule.levels.wardning.windowMin}</td>
                  <td>{rule.levels.critical.windowMin}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <footer className="amr-modal__footer">
          <button className="amr-btn" onClick={handleEdit}>
            수정
          </button>
          <button className="amr-btn amr-btn--primary" onClick={onClose}>
            확인
          </button>
        </footer>
      </div>
    </div>
  );
}