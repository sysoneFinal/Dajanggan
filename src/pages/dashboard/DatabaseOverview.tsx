import React, { useState, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import Chart from "../../components/chart/ChartComponent";
import "@/styles/dashboard/databaseSummary.css";

interface Database {
  name: string;
  activity: number;
}

interface MetricData {
  activeSessions: number[];
  tps: number[];
  waitEvent: { name: string; value: number }[];
  diskIO: { read: number; hit: number; time: string }[];
  vacuum: { lastVacuum: string; autoVacuumCount: number };
  slowQueries: { query: string; time: string; calls: number }[];
  events: { type: string; time: string; severity: string }[];
}

export default function DatabaseDashboard() {
  const [selectedDB, setSelectedDB] = useState<string>("wiki-miki");
  const [isPending, startTransition] = useTransition();

  /** DB 리스트 */
  const databases: Database[] = [
    { name: "wiki-miki", activity: 47 },
    { name: "dp-prod", activity: 80 },
    { name: "sales-db", activity: 65 },
    { name: "log-db", activity: 24 },
    { name: "log-db", activity: 24 },
    { name: "log-db", activity: 24 },
    { name: "log-db", activity: 24 },
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
      vacuum: { lastVacuum: "13m ago", autoVacuumCount: 132 },
      slowQueries: [
        { query: "SELECT * FROM orders", time: "4.3s", calls: 12 },
        { query: "SELECT * FROM users", time: "3.5s", calls: 10 },
        { query: "SELECT * FROM logs", time: "3.0s", calls: 7 },
      ],
      events: [
        { type: "High Disk I/O", time: "2m", severity: "Critical" },
        { type: "CPU Spike", time: "4m", severity: "Warning" },
      ],
    }),
  });

  const handleSelectDB = (db: string) => {
    startTransition(() => setSelectedDB(db));
  };

  if (isLoading || !data) return <div className="loading">Loading...</div>;

  return (
    <div className="database-dashboard">
      {/* Database Activity */}
      <div className="db-card database-activity-section">
        <h4>Database Activity</h4>
        <p>Database를 선택하여 상태를 확인하세요.</p>

        <div className="database-list">
          {databases.map((db) => (
            <div
              key={db.name}
              className={clsx("database-item", {
                active: selectedDB === db.name,
              })}
              onClick={() => handleSelectDB(db.name)}
            >
              <div className="progress-bar">
                <div
                className="progress-fill"
                data-level={
                    db.activity >= 80 ? "high" : db.activity >= 50 ? "medium" : "low"
                }
                style={{ width: `${db.activity}%` }}
                />

              </div>
              <div className="db-name">{db.name}</div>
              <div className="db-percent">{db.activity}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Sessions */}
      <div className="db-card active-sessions">
        <Chart
        type="line"
        series={[{ name: "활성 세션 수", data: data.activeSessions }]}
        categories={["13:30", "13:33", "13:36", "13:39", "13:42", "13:45"]}
        titleOptions={{
            text: "Active Sessions",
            align: "left",
            color: "#111827",
            fontSize: "14px",
            fontWeight: 600,
        }}
        colors={["#8979FF"]} 
        height={280}
        tooltipFormatter={(v) => `${v} sessions`}
        customOptions={{
        stroke: {
            width: 3,
            curve: "straight",
            colors: ["#8979FF"], 
        },
        markers: {
            size: 5,
            colors: ["#ffffff"], 
            strokeColors: "#6366F1", 
            strokeWidth: 2,
            hover: { size: 7 },
        },
        grid: {
            borderColor: "#E5E7EB",
            strokeDashArray: 4,
        },
        fill: {
            type: "solid", 
            colors: ["#8979FF"],
            opacity: 0.5, 
        },
        
        yaxis: {
            labels: { style: { colors: "#6B7280", fontSize: "12px" } },
        },
        xaxis: {
            labels: { style: { colors: "#6B7280", fontSize: "12px" } },
        },
            chart: {
            toolbar: { show: false },
            zoom: { enabled: false },
            foreColor: "#4B5563",
            animations: {
                enabled: true,
                easing: "easeinout",
                speed: 800,
            },
            },
        }}
        />
      </div>

      {/* TPS */}
      <div className="db-card tps">
        <Chart
        type="line"
        series={[{ name: "TPS", data: data.tps }]}
        categories={["13:30", "13:33", "13:36", "13:39", "13:42", "13:45"]}
        titleOptions={{
            text: "TPS (초당 트랜잭션 수)",
            align: "left",
            color: "#111827",
            fontSize: "14px",
            fontWeight: 600,
        }}
        colors={["#8979FF"]} 
        height={280}
        tooltipFormatter={(v) => `${v} sessions`}
        customOptions={{
        stroke: {
            width: 3,
            curve: "straight",
            colors: ["#8979FF"], 
        },
        markers: {
            size: 5,
            colors: ["#ffffff"], 
            strokeColors: "#6366F1", 
            strokeWidth: 2,
            hover: { size: 7 },
        },
        grid: {
            borderColor: "#E5E7EB",
            strokeDashArray: 4,
        },
        fill: {
            type: "solid", 
            colors: ["#8979FF"],
            opacity: 0.5, 
        },
        
        yaxis: {
            labels: { style: { colors: "#6B7280", fontSize: "12px" } },
        },
        xaxis: {
            labels: { style: { colors: "#6B7280", fontSize: "12px" } },
        },
            chart: {
            toolbar: { show: false },
            zoom: { enabled: false },
            foreColor: "#4B5563",
            animations: {
                enabled: true,
                easing: "easeinout",
                speed: 800,
            },
            },
        }}
        />
      </div>

      {/* Wait Event */}
      <div className="db-card wait-event">
        <Chart
        type="donut"
        series={data.waitEvent.map((e) => e.value)}
        categories={data.waitEvent.map((e) => e.name)}
        titleOptions={{
            text: "최근 30분 내 Wait Event Type",
            align: "left",
            color: "#111827",
            fontSize: "14px",
            fontWeight: 600,
        }}
        colors={[
            "rgba(81, 76, 166, 1)",
            "#7B61FF",
            "#BFB7FF",
            "#D5D3F7",
            "#7F81F2",
        ]}
        height={280}
        tooltipFormatter={(v) => `${v} events`} 
        customOptions={{
            legend: {
            position: "right",
            labels: { colors: "#6B7280" },
            },
            dataLabels: {
            enabled: true,
            style: { fontSize: "13px", fontWeight: 500 },
            formatter: (val: number, opts: any) => {
                const seriesIndex = opts.seriesIndex;
                const label = opts.w.globals.labels[seriesIndex];
                const value = opts.w.globals.series[seriesIndex];
                return `${label}: ${value}`; 
            },
            dropShadow: { enabled: false },
            },
            tooltip: {
            y: {
                formatter: (val: number) => `${val}회`, 
            },
            },
        }}
        />


      </div>

      {/* Vacuum  --------------수정해야함@@@ radial bar 안됨!! */}
      <div className="db-card vacuum">
        <h4>Vacuum</h4>
        <Chart
            type="radialBar"
            series={[47]}
            categories={["Dead Tuples"]}
            colors={["#7B61FF"]}
            height={200}
            customOptions={{
                plotOptions: {
                radialBar: {
                    hollow: {
                    size: "60%",
                    },
                    track: {
                    background: "#E5E7EB",
                    },
                    dataLabels: {
                    show: true,
                    name: {
                        show: true,
                        fontSize: "14px",
                        color: "#6B7280",
                        offsetY: 10,
                    },
                    value: {
                        show: true,
                        fontSize: "24px",
                        fontWeight: 600,
                        color: "#111827",
                        offsetY: -10,
                        formatter: (val: number) => `${Math.round(val)}%`,
                    },
                    },
                },
                },
            }}
            />

        <div className="vacuum-info">
          <div>
            <span>Last Vacuum:</span> {data.vacuum.lastVacuum}
          </div>
          <div>
            <span>AutoVacuum Count:</span> {data.vacuum.autoVacuumCount}
          </div>
        </div>
      </div>

        {/* Slow Query */}
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


      {/*  Disk I/O */}
      <div className="db-card disk-io">
        <Chart
          type="area"
          titleOptions={{ text: "Disk I/O Activity" }}
          series={[
            { name: "blks_hit", data: data.diskIO.map((d) => d.hit) },
            { name: "blks_read", data: data.diskIO.map((d) => d.read) },
          ]}
          categories={data.diskIO.map((d) => d.time)}
          colors={["#7B61FF", "#FF928A"]}
          height={280}
        />
      </div>

      <div className="event-summary-card">
      <h4 className="event-title">EVENT Summary</h4>

      <div className="event-stats">
        <div className="stat info">
          <div className="label">Info</div>
          <div className="value">13</div>
        </div>
        <div className="stat warning">
          <div className="label">Warning</div>
          <div className="value">7</div>
        </div>
        <div className="stat critical">
          <div className="label">Critical</div>
          <div className="value">1</div>
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

          <div className="table-row">
            <span>High Disk I/O</span>
            <span>2m</span>
            <span className="severity critical">Critical</span>
          </div>

          <div className="table-row">
            <span>CPU Spike</span>
            <span>4m</span>
            <span className="severity warning">Warning</span>
          </div>
        </div>
      </div>
    </div>

    </div>
  );
}
