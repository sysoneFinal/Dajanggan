import { useMemo } from "react";
import Chart from "../../components/chart/ChartComponent";
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
  throughput: { data: number[]; labels: string[] };
  backlog: { data: number[]; labels: string[] };
  kpi: { avgProgressPct: number; running: number; backlogTables: number };
  sessions: VacuumSession[];
};

const demo: DashboardData = {
  kpi: { avgProgressPct: 82, running: 200, backlogTables: 8 },
  throughput: {
    data: [
      8,12,10,25,18,40,22,80,35,120,60,92,45,33,27,22,20,18,15,13,10,8,6,5,
      25,45,38,95,28,70,33,55,42,36,31,28,26,24,22,20,18,16,14,12,10,8,6,5
    ],
    labels: Array.from({ length: 48 }, (_, i) => {
      const m = i * 30, h = String(Math.floor(m / 60)).padStart(2, "0"), mm = String(m % 60).padStart(2, "0");
      return `${h}:${mm}`;
    }),
  },
  backlog: {
    data: [600, 420, 300, 520, 430, 280, 610, 680],
    labels: ["00:00","03:00","06:00","09:00","12:00","15:00","18:00","21:00"],
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
};

/* ---------- 작은 컴포넌트 ---------- */
function Kpi({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="vd-chip">
      <span className="vd-chip__label">{label}</span>
      <span className="vd-chip__value">
        {value} {sub && <span className="vd-chip__sub">{sub}</span>}
      </span>
    </div>
  );
}

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
  // Overview에서 하던 그대로: useMemo로 series 만들기
  const throughputSeries = useMemo(
    () => [{ name: "rows/sec", data: data.throughput.data }],
    [data.throughput.data]
  );
  const backlogSeries = useMemo(
    () => [{ name: "backlog", data: data.backlog.data }],
    [data.backlog.data]
  );

  return (
    <div className="vd-root">
      {/* 상단 2개 차트 (Overview와 동일 패턴) */}
         {/* KPI 칩 */}
      <section className="vd-kpis">
        <Kpi label="Average Progress" value={`${data.kpi.avgProgressPct}%`} sub="(현재)" />
        <Kpi label="Running VACUUMs" value={data.kpi.running} sub="(active)" />
        <Kpi label="Backlog Tables" value={data.kpi.backlogTables} sub="(24h 기준)" />
      </section>

      <div className="vd-grid">
        <section className="vd-card vd-chart">
          <header className="vd-card__header">
            <h3>Vacuum Throughput <span className="vd-dim">(rows/sec • 24h)</span></h3>
          </header>
          <Chart
            type="line"
            series={throughputSeries}
            categories={data.throughput.labels}
            height={400}
            width="100%"
            showLegend={false}
            showToolbar={false}
            colors={["#6366F1"]}
            customOptions={{
              chart: { redrawOnParentResize: true, redrawOnWindowResize: true },
              stroke: { width: 2, curve: "straight" },
              grid: { borderColor: "#E5E7EB", strokeDashArray: 4 },
              markers: { size: 0 },
              yaxis: { min: 0 },
            }}
            tooltipFormatter={(v) => `${Math.round(v).toLocaleString()} rows/s`}
          />
        </section>

        <section className="vd-card vd-chart">
          <header className="vd-card__header">
            <h3>Backlog Trend <span className="vd-dim">(24h)</span></h3>
          </header>
          <Chart
            type="line"
            series={backlogSeries}
            categories={data.backlog.labels}
            height={400}
            width="100%"
            showLegend={false}
            showToolbar={false}
            colors={["#6366F1"]}
            customOptions={{
              chart: { redrawOnParentResize: true, redrawOnWindowResize: true },
              stroke: { width: 2, curve: "smooth" },
              grid: { borderColor: "#E5E7EB", strokeDashArray: 4 },
              markers: { size: 4 },
              yaxis: { min: 0 },
            }}
            tooltipFormatter={(v) => `${Math.round(v).toLocaleString()}`}
          />
        </section>
      </div>

  
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
                <tr key={s.table}>
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