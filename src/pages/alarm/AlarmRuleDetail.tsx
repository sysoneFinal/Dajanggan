// src/pages/alardm/AlardmRuleDetailPage.tsx
import React from "react";
import { useLocation } from "react-router-dom";
import "/src/styles/alarm/alarm-rule-detail.css";

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
      critical:{ threshold: 100000, minDurationMin: 15, occurCount: 3, windowMin: 20 },
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
      critical:{ threshold: 30, minDurationMin: 30, occurCount: 3, windowMin: 30 },
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
      critical:{ threshold: 500, minDurationMin: 15, occurCount: 3, windowMin: 20 },
    },
  },
];

const SECTION_LABEL: Record<Section, string> = {
  vacuum: "Vacuum", bloat: "Bloat", wal: "WAL", session: "Session",
};
const METRIC_LABEL: Record<Metric, string> = {
  dead_tuples: "Dead tuples", bloat_pct: "Bloat %", vacuum_backlog: "Vacuum backlog", wal_lag: "WAL lag",
};
const AGG_LABEL: Record<Aggregation, string> = {
  latest_avg: "최근값 평균", avg_5m: "5분 평균", avg_15m: "15분 평균", p95_15m: "p95(15m)",
};

function useQueryId(): number | null {
  const { search } = window.location;
  const sp = new URLSearchParams(search);
  const idStr = sp.get("id");
  return idStr ? Number(idStr) : null;
}
function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function AlardmRuleDetailPage() {
  const location = useLocation() as { state?: { rule?: SavedAlertRule } };
  const ruleFromState = location.state?.rule;
  const idFromQuery = useQueryId();

  // 우선순위: state.rule → ?id → fallback(없음)
  const rule =
    ruleFromState ??
    (idFromQuery ? DEMO_RULES.find(r => r.id === idFromQuery) : undefined);

  if (!rule) {
    return (
      <div className="ard-root">
        <section className="vd-cardd3">
          <header className="vd-cardd3__header">
            <h3>알림 규칙 상세</h3>
          </header>
          <div className="ard-empty">
            규칙을 찾을 수 없습니다.<br />
            목록에서 행을 클릭해 들어오시거나, URL에 <code>?id=1</code> 처럼 id를 포함해 접근하세요.
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="ard-root">
      <section className="vd-cardd3 ard-cardd">
        {/* 헤더 */}
        <header className="vd-cardd3__header ard-rule-header">
          <div className="ard-rule-title">
            <h3>
              {SECTION_LABEL[rule.section]} · {METRIC_LABEL[rule.metric]}{" "}
              <span className="ard-dim">({AGG_LABEL[rule.aggregation]})</span>
            </h3>
            <div className="ard-sub">
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
          <div className="ard-badges">
            <span className={`ard-chip ${rule.enabled ? "ard-chip--on" : "ard-chip--off"}`}>
              {rule.enabled ? "ENABLED" : "DISABLED"}
            </span>
          </div>
        </header>

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
                <td><span className="ard-chip ard-chip--notice">NOTICE</span></td>
                <td><span className="ard-chip ard-chip--wardning">WardNING</span></td>
                <td><span className="ard-chip ard-chip--critical">CRITICAL</span></td>
              </tr>
              <tr className="ard-row">
                <td className="ard-td-strong">기준값</td>
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
      </section>
    </div>
  );
}
