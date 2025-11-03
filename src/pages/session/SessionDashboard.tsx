import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import Chart from "../../components/chart/ChartComponent";
import GaugeChart from "../../components/chart/GaugeChart";
import DeadlockModal from "../../components/session/DeadlockModal";
import type { DeadlockDetail } from "../../components/session/DeadlockModal";
import WidgetCard from "../../components/util/WidgetCard";
import ChartGridLayout from "../../components/layout/ChartGridLayout";
import SummaryCard from "../../components/util/SummaryCard";
import "../../styles/session/session-dashboard.css";


/** 더미 데이터 */
const mockData = {
  summary: [
    { label: "Active Sessions", value: 10, diff: 3, desc: "최근 5분 평균 기준" , status: "info" },
    { label: "Idle In Transaction", value: 2, diff: -3, desc: "최근 5분 평균 기준", status: "info" },
    { label: "Waiting Sessions", value: 2, diff: 0, desc: "최근 5분 평균 기준", status: "info" },
    { label: "Avg Transaction Time", value: "3.8s", diff: 1, desc: "최근 5분 평균 기준", status: "critical" },
    { label: "DeadLocks", value: 1, diff: 0, desc: "최근 10분 이내 발생", status: "warning" },
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

  /**  실시간 차트 업데이트 (5초 단위) */
  const [sessionTrend, setSessionTrend] = useState(dashboard.charts.sessionTrend);
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionTrend((prev: any) => {
        const now = new Date();
        const hh = now.getHours().toString().padStart(2, "0");
        const mm = now.getMinutes().toString().padStart(2, "0");
        const ss = now.getSeconds().toString().padStart(2, "0");
        const newTimeLabel = `${hh}:${mm}:${ss}`;

        const updatedSeries = prev.series.map((s: any) => ({
          ...s,
          data: [...s.data.slice(1), Math.max(0, s.data.at(-1) + Math.floor(Math.random() * 5 - 2))],
        }));

        const newCategories = [...prev.categories.slice(1), newTimeLabel];

        return {
          ...prev,
          series: updatedSeries,
          categories: newCategories,
        };
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="session-db-dashboard">
      {/* --- 상단 요약 카드 --- */}
      <div className="session-db-summary-cards">
         {dashboard.summary.map((card:any, idx : any) => (
          <SummaryCard
            key={idx}
            label={card.label}
            value={card.value}
            diff={card.diff}
            desc={card.desc}
            status={card.status}
          />
        ))}
      </div>

      {/* --- 첫 번째 차트 섹션 --- */}
      <ChartGridLayout>
        <WidgetCard title="Session State Trend (Realtime Dummy)" span={4}>
          <Chart
            type="area"
            series={sessionTrend.series}
            categories={sessionTrend.categories}
          />
        </WidgetCard>

        <WidgetCard title="Wait Event Type Ratio Trend (Last 15 Minutes)" span={4}>
          <Chart
            type="column"
            series={dashboard.charts.waitEvent.series}
            categories={dashboard.charts.waitEvent.categories}
            isStacked={true}
          />
        </WidgetCard>

        <WidgetCard title="Database Connection Usage" span={4}>
          <div className="session-db-connection-content">
            <div className="session-db-connection-chart">
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
            <div className="session-db-connection-info">
              <p>
                <strong>Max:</strong> {dashboard.connection.max}
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
            height={130}
          />
          </div>
        </WidgetCard>
      </ChartGridLayout>

      {/* --- 두 번째 차트 섹션 --- */}
      <ChartGridLayout>
        <WidgetCard title="Avg Transaction Duration Trend (Last 30 Minutes)" span={4}>
          <Chart
            type="line"
            series={[{ name: "Avg Tx Duration", data: dashboard.charts.txDuration.data }]}
            categories={dashboard.charts.sessionTrend.categories}
          />
        </WidgetCard>

        <WidgetCard title="Avg Lock Wait Time (Last 30 Minutes)" span={4}>
          <Chart
            type="line"
            series={[{ name: "Lock Wait", data: dashboard.charts.lockWait.data }]}
            categories={dashboard.charts.sessionTrend.categories}
          />
        </WidgetCard>

        <WidgetCard title="Top Users by Session Count" span={4}>
          <Chart
            type="bar"
            series={[{ name: "Session Count", data: dashboard.charts.topUsers.data }]}
            categories={["app_user", "batch_service", "admin_user", "report_user"]}
          />
        </WidgetCard>
      </ChartGridLayout>

      {/* --- Deadlock 섹션 --- */}
      <ChartGridLayout>
        <WidgetCard title="DeadLock Overview (Last 30 Minutes)" span={8}>
          <div className="deadlock-content">
            <div className="deadlock-chart">
              <Chart
                type="line"
                series={[{ name: "Deadlock", data: dashboard.charts.deadlockTrend.data }]}
                categories={dashboard.charts.sessionTrend.categories}
                colors={["#FF6363"]}
              
              />
            </div>

            <div className="recent-deadlocks-mini">
              <h6>Recent DeadLocks</h6>
              <ul>
                {dashboard.recentDeadlocks.map((d, idx) => (
                  <li
                    key={idx}
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
                      <span className="dur">
                        {(d.durationMs / 1000).toFixed(1)}s
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </WidgetCard>
      </ChartGridLayout>

      {/* --- Deadlock 상세 모달 --- */}
      {selected && (
        <DeadlockModal open={open} onClose={() => setOpen(false)} detail={selected} />
      )}
    </div>
  );
}
