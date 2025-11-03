import { useMemo } from "react";
import Chart from "../../components/chart/ChartComponent";
import ChartGridLayout from "../../components/layout/ChartGridLayout"
import WidgetCard from "../../components/util/WidgetCard"
import "/src/styles/vacuum/VacuumPage.css";

/* ---------- 타입/데모데이터 ---------- */
type TopBloatTables = {
  table: string;
  bloat: string;
  tableSize: string;
  deadTuple: string;
};

type VacuumBlockersTables = {
  table: string;
  pid: string;
  lockType: "AccessExclusive"| "ShareLock";
  txAge: string;
  지속시간: string;
  status: "active"|"idle"| "waiting";
};

type DashboardData = {
    blockers: { data: number[]; labels: string[] };
    autovacuum: { data: number[][]; labels: string[] };
    wraparound: { data: number[]; labels: string[] };
    bloat: TopBloatTables[];
    vacuumblockers: VacuumBlockersTables[];
};

const demo: DashboardData = {
   blockers: {
    data: 
        [1.0, 1.0,1.0,1.0,1.0, 1.0,1.0,1.0, 1.2, 1.2,1.2, 2.0, 1.0, 1.0,1.0,1.0,1.0, 1.5, 2.0, 1.0,1.0,1.0, 1.0, 1.0]
        ,
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
  wraparound: {
    data: [62.32, 26.91, 97.0, 33.4],
    labels: [
      "orders", "session", "events", "ppl"
    ],
  },
  bloat: [
    {
      table: "orders",
      bloat: "9.4%",
      tableSize: "16GB",
      deadTuple: "81K",
    },
     {
      table: "history",
      bloat: "6.1%",
      tableSize: "11GB",
      deadTuple: "41K",
    },
     {
      table: "event",
      bloat: "4.2%",
      tableSize: "8GB",
      deadTuple: "29K",
    }
  ],
   vacuumblockers: [
    {
      table: "orders",
      pid: "4411",
      lockType: "AccessExclusive",
      txAge: "2h 13m",
      지속시간: "14m",
      status: "active"
    },
      {
      table: "orders",
      pid: "4411",
      lockType: "AccessExclusive",
      txAge: "2h 13m",
      지속시간: "14m",
      status: "active"
    },
      {
      table: "orders",
      pid: "4411",
      lockType: "AccessExclusive",
      txAge: "2h 13m",
      지속시간: "14m",
      status: "active"
    },
     {
      table: "orders",
      pid: "4411",
      lockType: "AccessExclusive",
      txAge: "2h 13m",
      지속시간: "14m",
      status: "active"
    }
  ]
};
// Transaction Age vs Block Duration 더미 데이터
function generateScatterData(count = 80) {
  const data: [number, number][] = [];

  for (let i = 0; i < count; i++) {
    const transactionAge = Math.floor(Math.random() * 10000) + 500; // 500~10500초
    const blockDuration = Math.floor(Math.random() * 15000); // 0~15000초
    data.push([transactionAge, blockDuration]);
  }

  return data.sort((a, b) => a[0] - b[0]); // x축 순서 정렬
}


/* ---------- 페이지 ---------- */
export default function VacuumPage({ data = demo }: { data?: DashboardData }) {
  // Overview에서 하던 그대로: useMemo로 series 만들기
  const BlockersSeries = useMemo(
    () => [{ name: "blocker", data: data.blockers.data }],
    [data.blockers.data]
  );
    const transactionScatterSeries = [
    {
        name: "Transaction vs Block",
        data: generateScatterData(80),
    },
    ];
  const wraparoundSeries = useMemo(
    () => [{ name: "wraparound", data: data.wraparound.data }],
    [data.wraparound.data]
  );


  
  return (
    <div className="vd-root">

      <ChartGridLayout>
      <WidgetCard title="Blockers per Hour (24h)" span={4}>
      <Chart
            type="line"
            series={BlockersSeries}
            categories={data.wraparound.labels}
            width="100%"
            />
          </WidgetCard>
        
          <WidgetCard title="Transaction Age vs Block Duration" span={4}>
          <Chart
            type="scatter"
            series={transactionScatterSeries}
            customOptions={{
                chart: { zoom: { enabled: true }, toolbar: { show: false } },
                xaxis: {
                title: { text: "Transaction Age (sec)" },
                min: 0,
                max: 10000,
                tickAmount: 10,
                },
                yaxis: {
                title: { text: "Block Duration (sec)" },
                min: 0,
                max: 15000,
                tickAmount: 6,
                },
                markers: {
                size: 5,
                colors: ["#818CF8"],
                strokeColors: "transparent",
                fillOpacity: 0.45,
                },
                grid: {
                borderColor: "#E5E7EB",
                strokeDashArray: 4,
                },
            }}
            />
          </WidgetCard>

          <WidgetCard title="Wraparound Progress" span={4}>
          <Chart
            type="bar"
            series={wraparoundSeries}
            categories={data.wraparound.labels}
            width="100%"
            customOptions={{
                chart: { redrawOnParentResize: true, redrawOnWindowResize: true },
                stroke: { width: 2, curve: "smooth" },
                grid: { borderColor: "#E5E7EB", strokeDashArray: 4 },
                markers: { size: 4 },
                yaxis: { min: 0 },
            }}
            />
          </WidgetCard>

        </ChartGridLayout>
      {/* 하단 테이블*/}
    <div className="vd-grid3">
      <section className="vd-card">
        <header className="vd-card__header">
          <h3>Top-3 Bloat Tables</h3>
        </header>
        <div className="vd-tablewrap">
          <table className="vd-table2">
            <thead>
              <tr>
                <th>TABLE</th>
                <th>PROGRESS</th>
                <th>PHASE</th>
                <th>DEAD TUPLES</th>
              </tr>
            </thead>
            <tbody>
              {data.bloat.map((s) => (
                <tr key={s.table}>
                  <td className="vd-td-strong">{s.table}</td>
                  <td>{s.bloat}</td>
                  <td>{s.tableSize}</td>
                  <td>{s.deadTuple}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="vd-card">
        <header className="vd-card__header">
          <h3>Vacuum Blockers / Inaccessible Tables</h3>
        </header>
        <div className="vd-tablewrap">
          <table className="vd-table2">
            <thead>
              <tr>
                <th>TABLE</th>
                <th>PID</th>
                <th>LOCKTYPE</th>
                <th>TX AGE</th>
                <th>지속시간</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {data.vacuumblockers.map((s) => (
                <tr key={s.table}>
                  <td className="vd-td-strong">{s.table}</td>
                  <td>{s.pid}</td>
                  <td>{s.lockType}</td>
                  <td>{s.txAge}</td>
                  <td>{s.지속시간}</td>
                  <td>{s.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
    </div>
  );
}