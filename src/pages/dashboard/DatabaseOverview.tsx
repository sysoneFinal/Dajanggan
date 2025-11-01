import React, { useState, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import Chart from "../../components/chart/ChartComponent";
import "@/styles/dashboard/databaseSummary.css";
import WidgetCard from "../../components/util/WidgetCard";
import ChartGridLayout from "../../components/layout/ChartGridLayout";
import rightArrowIcon from "../../assets/icon/right-arrow.svg";
import CircleGaugeChart from "../../components/chart/CircleGaugeChart";

interface Database {
  name: string;
  activity: number;
}

interface MetricData {
  activeSessions: number[];
  tps: number[];
  waitEvent: { name: string; value: number }[];
  diskIO: { read: number; hit: number; time: string }[];
  vacuum: {
    lastVacuum: string;
    autoVacuumCount: number;
    trend: { time: string; count: number }[]; 
  };
  slowQueries: { query: string; time: string; calls: number }[];
  events: { type: string; time: string; severity: string }[];
  eventSummary: { info: number; warning: number; critical: number };
}


export default function DatabaseDashboard() {
  const [selectedDB, setSelectedDB] = useState<string>("wiki-miki");
  const [isPending, startTransition] = useTransition();

  /** DB 리스트 */
  const databases: Database[] = [
    { name: "wiki-miki", activity: 47 },
    { name: "dp-prod", activity: 87 },
    { name: "sales-db", activity: 75 },
    { name: "log-db", activity: 24 },
    { name: "user-db", activity: 80 },
    { name: "user-db", activity: 80 },
    { name: "user-db", activity: 80 },
    { name: "user-db", activity: 80 },

  ];

/** React Query: 메트릭 데이터 */
const { data, isLoading } = useQuery<MetricData>({
  queryKey: ["metrics", selectedDB],
  queryFn: async () => ({
    activeSessions: [4, 8, 12, 7, 16, 10, 18, 15],
    tps: [200, 400, 600, 500, 900, 1000, 800],
    waitEvent: [
      { name: "I/O", value: 2 },
      { name: "Lock", value: 8 },
      { name: "LWLock", value: 3 },
      { name: "Client", value: 6 },
    ],
    diskIO: [
      { read: 4000, hit: 16000, time: "13:00" },
      { read: 6000, hit: 18000, time: "13:05" },
      { read: 12000, hit: 20000, time: "13:10" },
    ],
    vacuum: {
      lastVacuum: "13m ago",
      autoVacuumCount: 132,
      trend: [
        { time: "10:05", count: 121 },
        { time: "10:10", count: 124 },
        { time: "10:15", count: 130 },
        { time: "10:20", count: 132 },
        { time: "10:25", count: 128 },
        { time: "10:30", count: 129 },
        { time: "10:35", count: 133 },
        { time: "10:40", count: 136 },
        { time: "10:45", count: 135 },
        { time: "10:50", count: 137 },
      ],
    },
    slowQueries: [
      { query: "SELECT * FROM orders", time: "4.3s", calls: 12 },
      { query: "SELECT * FROM users", time: "3.5s", calls: 10 },
      { query: "SELECT * FROM logs", time: "3.0s", calls: 7 },
    ],
    eventSummary: {
      info: 13,
      warning: 7,
      critical: 1,
    },
    events: [
      { type: "High Disk I/O", time: "2m", severity: "critical" },
      { type: "CPU Spike", time: "4m", severity: "warning" },
      { type: "Memory Alert", time: "6m", severity: "warning" },
    ],
  }),
});


  const handleSelectDB = (db: string) => {
    startTransition(() => setSelectedDB(db));
  };

  if (isLoading || !data) return <div className="loading">Loading...</div>;

  return (
    <div className="database-dashboard">

      {/* 1번째 행  */}
      <ChartGridLayout>
        <WidgetCard title="Database Activity" span={2}> 
          <div className="db-sm-container">
            <div className="db-sm-header">
              <p className="db-sm-desc">
                Database를 선택하여 상태를 확인하세요.
              </p>
            </div>

            <div className="db-sm-list">
              {databases.map((db) => (
                <button
                  key={db.name}
                  className={`db-sm-item ${selectedDB === db.name ? "active" : ""}`}
                  onClick={() => handleSelectDB(db.name)}
                >
                  <span className="db-sm-name">{db.name}</span>
                  <img src={rightArrowIcon} alt="Select Database" />
                </button>
              ))}
            </div>
          </div>
        </WidgetCard>
        <WidgetCard span={5} title="Active Sessions Over Time" >
          <Chart
          type="line"
          series={[{ name: "활성 세션 수", data: data.activeSessions }]}
          categories={["13:30", "13:33", "13:36", "13:39", "13:42=", "13:45"]}
          tooltipFormatter={(v) => `${v} sessions`}
          />
        </WidgetCard>
        <WidgetCard span={5} title="Transactions Per Second (TPS)">
          <Chart
          type="line"
          series={[{ name: "TPS", data: data.tps }]}
          categories={["13:30", "13:33", "13:36", "13:39", "13:42", "13:45"]}
          tooltipFormatter={(v) => `${v} sessions`}
          />
        </WidgetCard>

      </ChartGridLayout>

      {/* 2번째 행  */}

      <ChartGridLayout>
        <div className="db-sm-gauge-vacuum-box">
          <div className="db-sm-gauge-container">
            <CircleGaugeChart
              label="Connection Usage" 
              value={75}
            />
            <div className="wait-event-chart">

            <Chart
            type="donut"
            series={data.waitEvent.map((e) => e.value)}
            categories={data.waitEvent.map((e) => e.name)}
            tooltipFormatter={(v) => `${v} events`} 
            height={150}
            showLegend={false}
            showDonutTotal={true}
            colors={["#866ffcff", "#7d7fffff", "#b1a7ffff", "#d2d0fbff"]}
            enableDonutShadow
            donutTitle="Wait Event"  
            />
            </div>

            <CircleGaugeChart
              label="Dead Tuples" 
              value={47}
            />
          </div>
          {data?.vacuum?.trend && (
            <div className="vacuum-card">
              <div className="vacuum-card-header">
                <div className="vacuum-card-title">AutoVacuum Count</div>
                <div className="vacuum-card-count">
                  <span className="count-label">Count</span>
                  <span className="count-value">
                    {data.vacuum.trend[data.vacuum.trend.length - 1]?.count ?? 0}
                  </span>
                </div>
              </div>

              <Chart
                type="line"
                series={[
                  {
                    name: "AutoVacuum Count",
                    data: data.vacuum.trend.map((d) => d.count),
                  },
                ]}
                categories={data.vacuum.trend.map((d) => d.time)}
                height={90}
                showLegend={false}
              />
            </div>
          )}
        </div>
        

        <WidgetCard title="CPU/Memory (Last 30min)" span={6}>
          <Chart
          type="line"
          series={[
              { name: "blks_hit", data: data.diskIO.map((d) => d.hit) },
              { name: "blks_read", data: data.diskIO.map((d) => d.read) },
          ]}
          categories={data.diskIO.map((d) => d.time)}
          />
        </WidgetCard>


          <WidgetCard title="" span={5} className="no-style">
            <div className="sq-card slow-query">
            <h4 className="section-title">slow query Top 3</h4>

            <ul className="slow-query-list">
                {data.slowQueries.map((q, i) => (
                <li key={i} className="query-item">
                    <div className="query-text">
                    {q.query.length > 35 ? q.query.slice(0, 35) + " ..." : q.query}
                    </div>

                    <div className="query-meta">
                    <span className="divider" />
                    <span className="query-time">{q.time}</span>
                    <span className="divider" />
                    <span className="query-calls">{q.calls} calls</span>
                    </div>
                </li>
                ))}
            </ul>
            </div>
          </WidgetCard>  
      </ChartGridLayout>
      
      {/* 3번째 행  */}
      <ChartGridLayout>

        <WidgetCard title="Disk I/O Activity" span={6} height="auto">
          <Chart
          type="area"
          series={[
              { name: "blks_hit", data: data.diskIO.map((d) => d.hit) },
              { name: "blks_read", data: data.diskIO.map((d) => d.read) },
          ]}
          categories={data.diskIO.map((d) => d.time)}
          height={300}
          />
        </WidgetCard>
        <WidgetCard title="System Events" span={6} height="auto">
          <div className="event-summary-card">
            <div className="event-stats">
              <div className="stat info">
                <div className="label">Info</div>
                <div className="value">{data.eventSummary.info}</div>
              </div>
              <div className="stat warning">
                <div className="label">Warning</div>
                <div className="value">{data.eventSummary.warning}</div>
              </div>
              <div className="stat critical">
                <div className="label">Critical</div>
                <div className="value">{data.eventSummary.critical}</div>
              </div>
            </div>

            <div className="recent-section">
              <h5 className="recent-title">Recent Event</h5>
              <div className="recent-table">
                <div className="table-header">
                  <span>Type</span>
                  <span>Time</span>
                  <span>Severity</span>
                </div>

                {data.events.slice(0, 3).map((event, index) => (
                  <div key={index} className="table-row">
                    <span>{event.type}</span>
                    <span>{event.time}</span>
                    <span className={`severity ${event.severity.toLowerCase()}`}>
                      {event.severity.charAt(0).toUpperCase() + event.severity.slice(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </WidgetCard>
      </ChartGridLayout>

    </div>
  );
}
