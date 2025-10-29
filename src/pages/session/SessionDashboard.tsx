import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Chart from "../../components/chart/ChartComponent";
import trendUp from "../../assets/icon/trend-up.svg";
import trendDown from "../../assets/icon/trend-down.svg";
import "../../styles/session/session-dashboard.css";
import GaugeChart from "../../components/chart/GaugeChart";
import DeadlockModal from "../../components/session/DeadlockModal";
import type { DeadlockDetail } from "../../components/session/DeadlockModal";


/** 더미 데이터 */
const mockData = {
  summary: [
    { label: "Active Sessions", value: 10, diff: 3, desc: "최근 5분 평균 기준" },
    { label: "Idle In Transaction", value: 2, diff: -3, desc: "최근 5분 평균 기준" },
    { label: "Waiting Sessions", value: 2, diff: 0, desc: "최근 5분 평균 기준" },
    { label: "Avg Transaction Time", value: "3.8s", diff: 1, desc: "최근 5분 평균 기준" },
    { label: "DeadLocks", value: 1, diff: 0, desc: "최근 10분 이내 발생", warn: true },
  ],

  charts: {
    sessionTrend: {
      series: [
        { name: "Active", data: [8, 9, 11, 10, 12, 10] },
        { name: "Idle", data: [3, 4, 2, 3, 2, 2] },
        { name: "Waiting", data: [1, 2, 3, 3, 2, 1] },
      ],
      categories: ["10:00", "10:05", "10:10", "10:15", "10:20", "10:25", "10:30"],
    },
    waitEvent: {
      series: [
        { name: "Lock", data: [60, 45, 25, 15] },
        { name: "I/O", data: [25, 40, 60, 70] },
        { name: "Client", data: [10, 10, 5, 10] },
        { name: "LWLock", data: [5, 5, 10, 5] },
      ],
      categories: ["10:15", "10:20", "10:25", "10:30"],
    },
    txDuration: { data: [1, 2, 4, 6, 7, 5, 3] },
    lockWait: { data: [1, 3, 5, 7, 6, 5, 2] },
    topUsers: { data: [42, 18, 8, 4] },
    deadlockTrend: { data: [0, 0.5, 2, 2.5, 3, 3, 2.5] },
  },

  connection: { usage: 50, max: 100, current: 50 },

  /** DeadlockDetail 타입에 맞는 구조 */
  recentDeadlocks: [
    {
      detectedAt: "2025-10-14 10:22:05",
      dbName: "post1-db",
      tableName: "public.orders",
      lockType: "RowExclusiveLock ↔ ShareLock",
      durationMs: 4800,
      blocker: {
        pid: 18423,
        user: "batch_user",
        query: "UPDATE orders SET status='DONE' WHERE id=10;",
      },
      blocked: {
        pid: 19501,
        user: "app_user",
        query: "DELETE FROM orders WHERE id=10;",
      },
      endedInfo: "종료된 세션: 19501 (자동 ROLLBACK)",
      repeats24h: 3,
    },
    {
      detectedAt: "2025-10-14 10:18:41",
      dbName: "post1-db",
      tableName: "public.session_log",
      lockType: "AccessExclusiveLock ↔ ShareRowExclusiveLock",
      durationMs: 6100,
      blocker: {
        pid: 22310,
        user: "api_srv",
        query: "INSERT INTO session_log VALUES (...);",
      },
      blocked: {
        pid: 22540,
        user: "app_user",
        query: "UPDATE session_log SET status='RUNNING' WHERE id=77;",
      },
      endedInfo: "종료된 세션: 22540 (자동 ROLLBACK)",
      repeats24h: 2,
    },
    {
      detectedAt: "2025-10-14 10:05:02",
      dbName: "post1-db",
      tableName: "public.payments",
      lockType: "ExclusiveLock ↔ ShareLock",
      durationMs: 4200,
      blocker: {
        pid: 14302,
        user: "admin",
        query: "UPDATE payments SET status='PAID' WHERE id=240;",
      },
      blocked: {
        pid: 14810,
        user: "report_user",
        query: "SELECT * FROM payments WHERE id=240 FOR UPDATE;",
      },
      endedInfo: "종료된 세션: 14810 (자동 ROLLBACK)",
      repeats24h: 1,
    },
  ],
};


/** API 요청 */
async function fetchSessionDashboard() {
  const res = await fetch("/api/dashboard/session");
  if (!res.ok) throw new Error("Failed to fetch session dashboard");
  return res.json();
}

export default function SessionDashboard() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<DeadlockDetail | null>(null);



  const { data, isLoading, isError } = useQuery({
    queryKey: ["sessionDashboard"],
    queryFn: fetchSessionDashboard,
    retry: 1,
  });

  const dashboard = data || mockData;

  return (
    <div className="session-db-dashboard">
      {/* --- 상단 요약 카드 --- */}
      <div className="session-db-summary-cards">
      {dashboard.summary.map((card, idx) => {
        const isUp = card.diff > 0;
        const isDown = card.diff < 0;

        const icon = isUp ? trendUp : isDown ? trendDown : null;
        const trendClass = isUp ? "up" : isDown ? "down" : "flat";

        return (
          <div key={idx} className={`session-db-summary-card ${card.warn ? "warn-active" : ""}`}>
            <p className="label">{card.label}</p>
            <h2>{card.value}</h2>

            <div className="summary-bottom">
              <div className={`trend ${trendClass}`}>
                {isUp ? (
                  <img src={trendUp} alt="up" className="trend-icon" />
                ) : isDown ? (
                  <img src={trendDown} alt="down" className="trend-icon" />
                ) : (
                  <span className="trend-dash">–</span>
                )}
                <span className="trend-value">{isUp ? `+${card.diff}` : card.diff}</span>
              </div>

              <span className="desc">{card.desc}</span>
            </div>
          </div>


        );
      })}

      </div>

      {/*  메인 차트  */}
      <div className="session-db-chart-grid">
        <div className="session-db-chart-card">
          <Chart
            type="area"
            titleOptions={{ text: "Session State Trend (Last 30 Minutes)" }}
            series={dashboard.charts.sessionTrend.series}
            categories={dashboard.charts.sessionTrend.categories}
            colors={["#7B61FF", "#9AA0F7", "#FF9FAE"]}
            height={250}
          />
        </div>

        <div className="session-db-chart-card">
          <Chart
            type="column"
            titleOptions={{ text: "Wait Event Type Ratio Trend (Last 15 Minutes)" }}
            series={dashboard.charts.waitEvent.series}
            categories={dashboard.charts.waitEvent.categories}
            colors={["#7B61FF", "#FF928A", "#FFD66B", "#9BE7C4"]}
            height={250}
            isStacked={true}
          />
        </div>

        <div className="session-db-chart-card">
            <p className="session-db-connection-title">Database Connection Usage</p>
          <div className="session-db-connection-content">
            <div className="session-db-connection-chart">
            <ul>
              <li><span className="dot normal"></span>정상</li>
              <li><span className="dot warn"></span>경고</li>
              <li><span className="dot danger"></span>위험</li>
            </ul>
                <GaugeChart
              value={dashboard.connection.usage}
              status={
                dashboard.connection.usage >= 90
                  ? "critical"
                  : dashboard.connection.usage >= 70
                  ? "warning"
                  : "normal"
              }
              type="semi-circle"
            />
            </div>
            <div className="session-db-connection-info">
              <p>
                <strong>Max:</strong> {dashboard.connection.max}<br />
              </p>
              <p>
                <strong>Current:</strong> {dashboard.connection.current}
              </p>
            </div>
          </div>
          <Chart
            type="line"
            series={[{ name: "Usage", data: [6, 5, 4, 3, 2, 4, 5] }]}
            categories={dashboard.charts.sessionTrend.categories}
            colors={["#7B61FF"]}
            height={100}
          />
        </div>

        <div className="session-db-chart-card">
          <Chart
            type="line"
            titleOptions={{ text: "Avg Transaction Duration Trend (Last 30 Minutes)" }}
            series={[{ name: "Avg Tx Duration", data: dashboard.charts.txDuration.data }]}
            categories={dashboard.charts.sessionTrend.categories}
            colors={["#8979FF"]}
            height={250}
          />
        </div>

        <div className="session-db-chart-card">
          <Chart
            type="line"
            titleOptions={{ text: "Avg Lock Wait Time (Last 30 Minutes)" }}
            series={[{ name: "Lock Wait", data: dashboard.charts.lockWait.data }]}
            categories={dashboard.charts.sessionTrend.categories}
            colors={["#9AA0F7"]}
            height={250}
          />
        </div>

        <div className="session-db-chart-card">
          <Chart
            type="bar"
            titleOptions={{ text: "Top Users by Session Count" }}
            series={[{ name: "Session Count", data: dashboard.charts.topUsers.data }]}
            categories={["app_user", "batch_service", "admin_user", "report_user"]}
            colors={["#7B61FF"]}
            height={250}
          />
        </div>
      </div>

      {/*  Deadlock 섹션  */}
<div className="session-db-bottom-grid">
  <div className="session-db-chart-card deadlock-summary-card">
    <div className="deadlock-header">
      <h4>DeadLock Overview (Last 30 Minutes)</h4>
    </div>

    <div className="deadlock-content">
      <div className="deadlock-chart">
        <Chart
          type="line"
          series={[{ name: "Deadlock", data: dashboard.charts.deadlockTrend.data }]}
          categories={dashboard.charts.sessionTrend.categories}
          colors={["#FF6363"]}
          height={250}
        />
      </div>

      <div className="recent-deadlocks-mini">
        <h6>Recent DeadLocks</h6>
        <ul>
          {dashboard.recentDeadlocks.map((d, idx) => (
            <li key={idx}
              onClick={() => {
              setSelected(d);
              setOpen(true);
              }}
            >
              <div className="deadlock-info">
                <span className="time">{d.detectedAt}</span>
                <div className="tags">
                  <span className="tag user">
                    <i className="ri-user-3-line"></i> {d.blocker.user}
                  </span>
                  <span className="tag table">
                    <i className="ri-database-2-line"></i> {d.tableName}
                  </span>
                </div>
              </div>
              <div className="deadlock-body">
                <span className="msg">{d.blocked.query}</span>
                <span className="dur">{(d.durationMs / 1000).toFixed(1)}s</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
</div>
  {selected && (
    <DeadlockModal
      open={open}
      onClose={() => setOpen(false)}
      detail={selected}
    />
  )}
</div>
    
  );
}
