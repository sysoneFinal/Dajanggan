import { useMemo } from "react";
import Chart from "../../components/chart/ChartComponent";
import "/src/styles/VacuumPage.css";

/* ---------- 타입 및 데모 데이터 ---------- */
type VacuumRecord = {
  tableName: string;
  schema: string;
  startTime: string;
  endTime: string;
  duration: string;
  autovacuum: boolean;
  role: string;
  heapBlocksTotal: string;
  deadTuplesPerPhase: string;
  progress: {
    scanned: number[];
    vacuumed: number[];
    deadRows: number[];
    labels: string[];
  };
  summary: Record<string, string>;
};

const demo: VacuumRecord = {
  tableName: "orders",
  schema: "public.snapshots",
  startTime: "Jul 24, 2023 11:30:40 PM PDT",
  endTime: "Jul 25, 2023 12:39:50 AM PDT",
  duration: "an hour",
  autovacuum: true,
  role: "n/a",
  heapBlocksTotal: "175.3 GB · 22,979,917 blocks",
  deadTuplesPerPhase: "178,956,969",
  progress: {
    scanned: [0, 20, 40, 60, 70, 80, 85, 90, 95, 100],
    vacuumed: [0, 10, 30, 40, 50, 60, 75, 80, 90, 100],
    deadRows: [5, 8, 12, 20, 30, 45, 60, 75, 85, 90],
    labels: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
  },
  summary: {
    "Time Elapsed": "1:09:09",
    "CPU Time": "user: 1543.44 s, system: 235.07 s",
    "Index Vacuum Phases": "1",
    "Aggressive Vacuum": "Yes",
    "Pages Removed": "0 / 0 B",
    "Pages Remaining": "22,979,917 / 175.3 GB",
    "Pages Skipped Due To Pin": "0 / 0 B",
    "Pages Skipped Frozen": "15,183,404 / 115.8 GB",
    "Tuples Deleted": "424,711",
    "Tuples Remaining": "1,745,563,359",
    "Tuples Dead But Not Removable": "13,014,687",
    "Data Read from Cache": "182 GB",
    "Data Read from Disk": "364.9 GB",
    "Data Flushed to Disk": "54.5 GB",
    "Avg Read Rate": "90.06 MB/s",
    "Avg Write Rate": "13.46 MB/s",
  },
};

/* ---------- 페이지 ---------- */
export default function VacuumRecordDetailPage({ data = demo }: { data?: VacuumRecord }) {
  const progressSeries = useMemo(
    () => [
      { name: "Heap Bytes Scanned", data: data.progress.scanned },
      { name: "Heap Bytes Vacuumed", data: data.progress.vacuumed },
      { name: "Dead Rows", data: data.progress.deadRows },
    ],
    [data.progress]
  );

  return (
    <div className="vd-root">
      {/* 상단 메타정보 */}
      <div className="vd-grid4">
      <section className="vd-card">
        <header className="vd-card__header">
          <h2>VACUUM Record · {data.tableName} <span className="vd-dim">({data.startTime.split(" ")[0]} {data.startTime.split(",")[1]})</span></h2>
        </header>
        <div className="vd-info-grid">
          <div><strong>Table Name</strong><span>{data.schema}</span></div>
          <div><strong>Start Time</strong><span>{data.startTime}</span></div>
          <div><strong>Duration</strong><span>{data.duration}</span></div>
          <div><strong>End Time</strong><span>{data.endTime}</span></div>
          <div><strong>Autovacuum</strong><span>{data.autovacuum ? "Yes" : "No"}</span></div>
          <div><strong>Postgres Role</strong><span>{data.role}</span></div>
          <div><strong>Heap Blocks Total</strong><span>{data.heapBlocksTotal}</span></div>
          <div><strong>Max Dead Tuples / Phase</strong><span>{data.deadTuplesPerPhase}</span></div>
        </div>
      </section>
    </div>
      {/* Progress 차트 */}
      <div className="vd-grid4">
      <section className="vd-card vd-chart">
        <header className="vd-card__header">
          <h3>Progress</h3>
        </header>
        <Chart
          type="area"
          series={progressSeries}
          categories={data.progress.labels}
          height={400}
          width="100%"
          showLegend={true}
          showToolbar={false}
          colors={["#6366F1", "#10B981", "#FBBF24"]}
          customOptions={{
            chart: { redrawOnParentResize: true, redrawOnWindowResize: true },
            stroke: { curve: "smooth", width: 2 },
            fill: {
              type: "gradient",
              gradient: { shadeIntensity: 0.4, opacityFrom: 0.35, opacityTo: 0.05, stops: [0, 90, 100] },
            },
            grid: { borderColor: "#E5E7EB", strokeDashArray: 4 },
            legend: { position: "bottom" },
            yaxis: { title: { text: "%" }, min: 0, max: 100 },
          }}
        />
      </section>
    </div>   
      {/* Summary Statistics */}
      <div className="vd-grid4">
      <section className="vd-card">
        <header className="vd-card__header">
          <h3>Summary Statistics</h3>
        </header>
        <div className="vd-summary-grid">
          {Object.entries(data.summary).map(([k, v]) => (
            <div key={k} className="vd-summary-item">
              <strong>{k}</strong>
              <span>{v}</span>
            </div>
          ))}
        </div>
      </section>
      </div>
    </div>
  );
}
