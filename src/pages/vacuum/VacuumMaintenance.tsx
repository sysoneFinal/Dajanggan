import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import Chart from "../../components/chart/ChartComponent";
import ChartGridLayout from "../../components/layout/ChartGridLayout"
import WidgetCard from "../../components/util/WidgetCard"
import SummaryCard from "../../components/util/SummaryCard";
import "/src/styles/vacuum/VacuumPage.css";

/* ---------- 타입/데모데이터 ---------- */
type VacuumSession = {
  table: string;
  phase: "initializing" | "scanning" | "vacuuming" | "index_cleanup" | "truncating";
  deadTuples: string;
  trigger: "autovacuum" | "manual";
  elapsed: string;
  progressSeries: number[]; // 0~100
};

type DashboardData = {
  deadtuple: { data: number[][]; labels: string[] };
  autovacuum: { data: number[][]; labels: string[] };
  latency: { data: number[]; labels: string[] };
  sessions: VacuumSession[];
  Kpi: { avgDelay: number; avgDuration: number; totalDeadTuple: number; autovacuumWorker:number; };
};

const demo: DashboardData = {
   deadtuple: {
    data: [
        [12, 18, 25, 20, 15, 30, 40, 55, 48, 70, 85, 90, 100, 92, 80, 65, 50, 45, 40, 38, 35, 30, 25, 20],
        [10, 12, 18, 25, 22, 28, 35, 45, 55, 65, 72, 80, 85, 88, 84, 70, 60, 55, 45, 40, 38, 32, 28, 25],
    ],
    labels: [
      "00:00","01:00","02:00","03:00","04:00","05:00","06:00","07:00",
      "08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00",
      "16:00","17:00","18:00","19:00","20:00","21:00","22:00","23:00"
    ],
  },

  // Autovacuum Cost Delay vs Active Workers (Last 24h)
  autovacuum: {
    data: [
        [200, 220, 210, 230, 260, 240, 250, 270, 280, 260, 250, 245, 255, 265, 270, 260, 250, 240, 235, 220, 210, 205, 200, 195],
        [2, 3, 2, 4, 3, 3, 4, 5, 5, 4, 4, 3, 4, 4, 5, 4, 3, 3, 2, 2, 2, 1, 1, 1]
    ],
    labels: [
      "00:00","01:00","02:00","03:00","04:00","05:00","06:00","07:00",
      "08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00",
      "16:00","17:00","18:00","19:00","20:00","21:00","22:00","23:00"
    ],
  },

  // Average Latency Trend (24h)
  latency: {
    data: [300, 400, 280, 600, 320, 290, 410, 370, 350, 450, 320, 310, 330, 420, 380, 360, 340, 390, 410, 430, 370, 350, 320, 310],
    labels: [
      "00:00","01:00","02:00","03:00","04:00","05:00","06:00","07:00",
      "08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00",
      "16:00","17:00","18:00","19:00","20:00","21:00","22:00","23:00"
    ],
  },
  sessions: [
    {
      table: "orders",
      phase: "vacuuming",
      deadTuples: "81K",
      trigger: "autovacuum",
      elapsed: "05m",
      progressSeries: [86,84,81,79,76,75,78,83,89],
    },
    {
      table: "sessions",
      phase: "scanning",
      deadTuples: "22K",
      trigger: "manual",
      elapsed: "22m",
      progressSeries: [70,68,66,65,64,66,71,79,85],
    },
  ],
  Kpi: {
    avgDelay: 3.4,
    avgDuration: 2.4,
    totalDeadTuple: 1.5,
    autovacuumWorker: 67
  }
};


function ProgressMini({ series }: { series: number[] }) {
  return (
    <div className="vd-progress">
      <div className="vd-progress__spark">
        <Chart
          type="area"
          series={[{ name: "progress", data: series }]}
          categories={series.map((_, i) => `${i}`)}
          height={100}
          width="360px"
          showGrid={false}
          showLegend={false}
          showToolbar={false}
          colors={["#6366F1"]}
          customOptions={{
            chart: { redrawOnParentResize: true, redrawOnWindowResize: true },
            yaxis: { min: 0, max: 100, labels: { show: false } },
            xaxis: { labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
            tooltip: { enabled: false },
            stroke: { curve: "smooth", width: 2 },
            fill: {
              type: "gradient",
              gradient: { shadeIntensity: 0.4, opacityFrom: 0.45, opacityTo: 0.05, stops: [0, 90, 100] },
            },
          }}
        />
      </div>
    
    </div>
  );
}

/* ---------- 페이지 ---------- */
export default function VacuumPage({ data = demo }: { data?: DashboardData }) {
  const navigate = useNavigate();
  const handleRowClick = (tableName: string) => {
    navigate("/database/vacuum/session-detail", {
      state: { tableName: tableName }, 
    });
  };
  const deadtupleSeries = useMemo(
    () => [
            { name: "Dead Tuple 증가 속도", data: data.deadtuple.data[0] },
            { name: "Vacuum 처리 속도", data: data.deadtuple.data[1] },
        ],
    [data.deadtuple.data]
  );
  const autovacuumSeries = useMemo(
      () => [
            { name: "Autovacuum Cost Delay", data: data.autovacuum.data[0] }, // yAxis 0
            { name: "Active Workers", data: data.autovacuum.data[1] },        // yAxis 1
        ],
    [data.autovacuum.data]
  );
  const latencySeries = useMemo(
    () => [{ name: "latency", data: data.latency.data }],
    [data.latency.data]
  );


  return (
    <div className="vd-root">
          <div className="vd-grid2">
             <SummaryCard
                label="평균 지연시간"
                value={data.Kpi.avgDelay}
                diff={3}
                desc="rows/sec • 24h"
              />

              <SummaryCard
                label="Average Duration"
                value={data.Kpi.avgDuration}
                diff={3}
                desc="24h"
              />

              <SummaryCard
                label="Total Dead Tuples Processed"
                value={data.Kpi.totalDeadTuple}
                diff={3}
                desc="24h"
              />
              
              <SummaryCard
                label="Auto Vacuum Worker 활동률"
                value={data.Kpi.autovacuumWorker}
                diff={3}
                desc="%"
              />
            
        </div>

        <ChartGridLayout>
        <WidgetCard title="Vacuum deadtuple (rows/sec • 24h)" span={4}>
          <Chart
            type="line"
            series={deadtupleSeries}
            categories={data.deadtuple.labels}
            width="100%"
            customOptions={{
              chart: { redrawOnParentResize: true, redrawOnWindowResize: true },
              stroke: { curve: "smooth", width: 2 },
              legend: { show: true, position: "bottom" },
              xaxis: {
                labels: { style: { colors: "#9CA3AF" } },
                axisBorder: { show: false },
                axisTicks: { show: false },
                categories: data.deadtuple.labels,
              },
              yaxis: { title: { text: "rows/sec" } },
            }}
          />
        </WidgetCard>

        <WidgetCard title="Vacuum autovacuum(rows/sec • 24h)" span={4}>
          <Chart
            type="line"
            series={autovacuumSeries} // ★ yAxisIndex 붙이지 마세요 (ApexCharts는 지원 X)
            categories={data.autovacuum.labels}
            width="100%"
             customOptions={{
              chart: { redrawOnParentResize: true, redrawOnWindowResize: true },
              stroke: { width: 2, curve: "smooth" },
              grid: { borderColor: "#E5E7EB", strokeDashArray: 4 },
              markers: { size: 0 },
              // series[0] = 왼쪽 Y축, series[1] = 오른쪽 Y축로 매핑
              yaxis: [
                { title: { text: "Cost Delay (ms)" }, decimalsInFloat: 0 },
                { title: { text: "Active Workers" }, opposite: true, decimalsInFloat: 0 },
              ],
            }}
            tooltipFormatter={(v) => `${Math.round(v).toLocaleString()}`}
          />
        </WidgetCard>
        
        <WidgetCard title="Latency Trend(24h)" span={4}>
          <Chart
            type="line"
            series={latencySeries}
            categories={data.latency.labels}
            width="100%"
            customOptions={{
              chart: { redrawOnParentResize: true, redrawOnWindowResize: true },
              stroke: { width: 2, curve: "smooth" },
              grid: { borderColor: "#E5E7EB", strokeDashArray: 4 },
              markers: { size: 4 },
              yaxis: { min: 0 },
            }}
            tooltipFormatter={(v) => `${Math.round(v).toLocaleString()}`}
          />
        </WidgetCard>
      </ChartGridLayout>

  
      {/* 하단 세션 테이블 (Progress에도 미니 차트) */}
      <section className="vd-card">
        <header className="vd-card__header">
          <h3>Current VACUUM Sessions</h3>
        </header>
        <div className="vd-tablewrap">
          <table className="vd-table">
            <thead>
              <tr>
                <th>TABLE</th>
                <th>PROGRESS</th>
                <th>PHASE</th>
                <th>DEAD TUPLES</th>
                <th>TRIGGER</th>
                <th>ELAPSED</th>
              </tr>
            </thead>
            <tbody>
              {data.sessions.map((s) => (
                <tr key={s.table}
                    onClick={() => handleRowClick(s.table)}>
                  <td className="vd-td-strong">{s.table}</td>
                  <td><ProgressMini series={s.progressSeries} /></td>
                  <td>{s.phase}</td>
                  <td>{s.deadTuples}</td>
                  <td>{s.trigger}</td>
                  <td>{s.elapsed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}