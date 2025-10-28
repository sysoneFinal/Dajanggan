import { useMemo, useState } from "react";
import Chart from "../../components/chart/ChartComponent";
import "/src/styles/VacuumPage.css";
import VacuumTableMenu from "./VacuumTableMenu";


/* ---------- 타입/데모데이터 ---------- */
type BloatDetailData = {
  kpi: { bloatPct: string; tableSize: string; wastedSpace: string };
  bloatTrend: { data: number[]; labels: string[] };
  deadTuplesTrend: { data: number[]; labels: string[] };
  indexBloatTrend: { data: number[][]; labels: string[]; names: string[] };
};

const demo: BloatDetailData = {
  kpi: {
    bloatPct: "9.4%",
    tableSize: "16 GB",
    wastedSpace: "1.5 GB",
  },
  bloatTrend: {
    data: [3, 3.5, 4, 4.3, 4.8, 5.2, 5.6, 6, 6.5, 7, 7.4, 8, 8.2, 8.5, 8.9, 9.4],
    labels: [
      "30d ago", "29d ago", "28d ago", "25d ago", "20d ago", "18d ago", "15d ago",
      "13d ago", "10d ago", "8d ago", "6d ago", "4d ago", "3d ago", "2d ago", "1d ago", "Now"
    ],
  },
  deadTuplesTrend: {
    data: [30000, 40000, 38000, 50000, 48000, 55000, 60000, 62000, 70000, 65000, 72000, 80000, 78000, 85000],
    labels: [
      "30d ago", "28d ago", "27d ago", "25d ago", "20d ago", "18d ago", "15d ago",
      "13d ago", "10d ago", "8d ago", "6d ago", "4d ago", "2d ago", "Now"
    ],
  },
  indexBloatTrend: {
    data: [
      [5, 6, 7, 8, 9, 10, 11], // idx_customer
      [4, 4.5, 5, 6, 6.5, 7, 7.5], // idx_date
      [3, 3.2, 3.5, 4, 4.3, 4.8, 5], // orders_pkey
      [2, 2.1, 2.3, 2.5, 2.7, 2.9, 3.2], // idx_status
    ],
    labels: ["30d ago", "25d ago", "20d ago", "15d ago", "10d ago", "5d ago", "Now"],
    names: ["idx_customer", "idx_date", "orders_pkey", "idx_status"],
  },
};


/* ---------- 페이지 ---------- */
export default function BloatDetailPage({ data = demo }: { data?: BloatDetailData }) {
  const bloatTrendSeries = useMemo(() => [{ name: "Bloat %", data: data.bloatTrend.data }], [data]);
  const deadTuplesSeries = useMemo(() => [{ name: "Dead Tuples", data: data.deadTuplesTrend.data }], [data]);
  const indexBloatSeries = useMemo(
    () => data.indexBloatTrend.names.map((name, i) => ({ name, data: data.indexBloatTrend.data[i] })),
    [data]
  );

  const [selectedTable, setSelectedTable] = useState("public.orders");
  const tableList = [
    "public.orders",
    "public.order_items",
    "public.customers",
    "public.payments",
    "public.shipments",
  ];

  return (
    <div className="vd-root">
      <div className="vd-grid4">
          <VacuumTableMenu
            tables={tableList}
            selectedTable={selectedTable}
            onChange={(t: string) => {
              setSelectedTable(t);
            }}
            dbName="appdb"
            autovacuumEnabled={true}
            lastVacuumText="2025-10-20 11:30"
          />
      </div>
      {/* ---------- KPI ---------- */}
      <div className="vd-grid">
        <section className="vd-card2">
          <header className="vd-card2__header"><h5>Bloat %</h5></header>
          <h1>{data.kpi.bloatPct}</h1>
          <p className="vd-dim">Wasted space ratio</p>
        </section>
        <section className="vd-card2">
          <header className="vd-card2__header"><h5>Table Size</h5></header>
          <h1>{data.kpi.tableSize}</h1>
          <p className="vd-dim">incl. toast & indexes</p>
        </section>
        <section className="vd-card2">
          <header className="vd-card2__header"><h5>Wasted Space</h5></header>
          <h1>{data.kpi.wastedSpace}</h1>
          <p className="vd-dim">Bloat size estimate</p>
        </section>
      </div>

      {/* ---------- 차트 ---------- */}
      <div className="vd-grid4">
        {/* Bloat % Trend */}
        <section className="vd-card vd-chart">
          <header className="vd-card__header">
            <h3>Bloat % Trend <span className="vd-dim">(Last 30 Days)</span></h3>
          </header>
          <Chart
            type="line"
            series={bloatTrendSeries}
            categories={data.bloatTrend.labels}
            height={380}
            width="100%"
            showLegend={false}
            colors={["#6366F1"]}
            customOptions={{
              stroke: { width: 2, curve: "smooth" },
              grid: { borderColor: "#E5E7EB", strokeDashArray: 4 },
              yaxis: { min: 0, title: { text: "Bloat %" } },
            }}
          />
        </section>

        {/* Dead Tuples Trend */}
        <section className="vd-card vd-chart">
          <header className="vd-card__header">
            <h3>Dead Tuples Trend <span className="vd-dim">(Last 30 Days)</span></h3>
          </header>
          <Chart
            type="line"
            series={deadTuplesSeries}
            categories={data.deadTuplesTrend.labels}
            height={380}
            width="100%"
            showLegend={false}
            colors={["#6366F1"]}
            customOptions={{
              stroke: { width: 2, curve: "smooth" },
              grid: { borderColor: "#E5E7EB", strokeDashArray: 4 },
              yaxis: { min: 0, title: { text: "Dead Tuples Count" } },
            }}
          />
        </section>

        {/* Index Bloat Trend */}
        <section className="vd-card vd-chart">
          <header className="vd-card__header">
            <h3>Index Bloat Trend <span className="vd-dim">(Last 30 Days)</span></h3>
          </header>
          <Chart
            type="line"
            series={indexBloatSeries}
            categories={data.indexBloatTrend.labels}
            height={400}
            width="100%"
            showLegend={true}
            colors={["#EF4444", "#6366F1", "#F59E0B", "#10B981"]}
            customOptions={{
              stroke: { width: 2, curve: "smooth" },
              grid: { borderColor: "#E5E7EB", strokeDashArray: 4 },
              yaxis: { min: 0, title: { text: "Bloat %" } },
              legend: { position: "bottom" },
            }}
          />
        </section>
      </div>
    </div>
  );
}
