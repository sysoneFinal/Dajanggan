import { useMemo } from "react";
import Chart from "../../components/chart/ChartComponent";
import "/src/styles/vacuum/VacuumPage.css";

/* ---------- 타입/데모데이터 ---------- */

type DashboardData = {
  xminHorizonMonitor: { data: number[][]; labels: string[] };
  bloatTrend: { data: number[]; labels: string[] };
  bloatDistribution: { data: number[]; labels: string[] };
  Kpi: { tableBloat: string; criticalTable: number; bloatGrowth: string;};
};

const demo: DashboardData = {
   xminHorizonMonitor: {
    data: [
      // Xmin Horizon Age (시간 단위)
      [1.2, 1.3, 1.5, 1.6, 2.1, 2.8, 3.5, 4.2, 4.8, 5.5, 5.8, 6.2, 5.9, 6.0, 5.7, 5.5, 5.3, 4.9, 4.6, 4.2, 3.8, 3.5, 3.2, 2.8],
      // Vacuum 처리 속도 (rows/sec)
      [1000, 1200, 1500, 1700, 1800, 2100, 2300, 2400, 2500, 2600, 2650, 2700, 2750, 2600, 2500, 2300, 2000, 1800, 1600, 1500, 1400, 1300, 1200, 1100],
  ],
    labels: [
      "00:00","01:00","02:00","03:00","04:00","05:00","06:00","07:00",
      "08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00",
      "16:00","17:00","18:00","19:00","20:00","21:00","22:00","23:00"
    ],
  },

  bloatTrend: {
    data: 
        [1,2,3,4,5,6,9,10,14,16,17,20,23,26,27,29,31,34,35,36,37,38,40,43,47,48,49,50,55,57],
    labels: [
      "9/27","9/28","9/29","9/30","10/1","10/2","10/3","10/4","10/5","10/6","10/7",
      "10/8","10/9","10/10","10/11","10/12","10/13","10/14","10/15","10/16","10/17","10/18",
      "10/19","10/20","10/21","10/22","10/23","10/24","10/25","10/26","10/27","10/28","10/29"
    ],
  },

  bloatDistribution: {
    data: [342, 389, 186, 72, 31, 42],
    labels: [
      "0-5%", "5-10%", "10-15%", "15-20%","20-30%", "30%+"
    ],
  },

  Kpi: {
    tableBloat: "305.3GB",
    criticalTable: 42,
    bloatGrowth: "+31GB (+6.5+)",
  }
};


/* ---------- 페이지 ---------- */
export default function VacuumPage({ data = demo }: { data?: DashboardData }) {
    const WARN_H = 4;
    const ALERT_H = 6;

    const toHours = (v: number) => v; 

    const xminHorizonMonitorSeries = useMemo(() => {
      const ageHours = data.xminHorizonMonitor.data[0].map(toHours);
      const warn = Array(ageHours.length).fill(WARN_H);
      const alert = Array(ageHours.length).fill(ALERT_H);

      return [
        { name: "Xmin Horizon Age", data: ageHours },                       // 면적선
        { name: `Warning Threshold (${WARN_H}h)`, data: warn },             // 주황 점선
        { name: `Alert Threshold (${ALERT_H}h)`, data: alert },             // 빨강 점선
      ];
    }, [data.xminHorizonMonitor.data]);


  const bloatTrendSeries = useMemo(
      () => [
            { name: "bloatTrend", data: data.bloatTrend.data }
        ],
    [data.bloatTrend.data]
  );
  const bloatDistributionSeries = useMemo(
    () => [{ name: "Bloat Distribution", data: data.bloatDistribution.data }],
    [data.bloatDistribution.data]
  );
  
  return (
    <div className="vd-root">
        <div className="vd-grid">
            <section className="vd-card2">
                <header className="vd-card2__header">
                    <h5>Est. Table Bloat <span className="vd-dim"></span></h5>
                </header>
                <h1>{data.Kpi.tableBloat}</h1>
            </section>

             <section className="vd-card2">
                <header className="vd-card2__header">
                    <h5>Critical Tables <span className="vd-dim"></span></h5>
                </header>
                 <h1>{data.Kpi.criticalTable}</h1>
            </section>

             <section className="vd-card2">
                <header className="vd-card2__header">
                    <h5>Bloat Growth<span className="vd-dim">(30d)</span></h5>
                </header>
                 <h1>{data.Kpi.bloatGrowth}</h1>
            </section>
        </div>

      <div className="vd-grid">
        <section className="vd-card vd-chart">
          <header className="vd-card__header">
            <h3>Xmin Horizon Monitor <span className="vd-dim">(last 7d)</span></h3>
          </header>

          <Chart
            type="area"                                 // 면적 라인
            series={xminHorizonMonitorSeries}
            categories={data.xminHorizonMonitor.labels} // "7d ago ~ Today" 식 라벨이면 더 그럴듯
            height={380}
            width="100%"
            showToolbar={false}
            colors={["#22C55E", "#F59E0B", "#EF4444"]}  // 초록/주황/빨강
            customOptions={{
              chart: { redrawOnParentResize: true, redrawOnWindowResize: true, toolbar: { show: false } },
              dataLabels: { enabled: false },
              stroke: {
                curve: "smooth",
                width: [2, 2, 2],
                dashArray: [0, 8, 8],                   // 임계치 두 개는 점선
              },
              fill: {                                   // 첫 시리즈만 은은한 면적
                type: "gradient",
                gradient: { shadeIntensity: 0.2, opacityFrom: 0.25, opacityTo: 0.05, stops: [0, 100] }
              },
              markers: { size: 0 },
              grid: { borderColor: "#E5E7EB", strokeDashArray: 4 },
              legend: { show: true, position: "bottom" },
              xaxis: {
                categories: data.xminHorizonMonitor.labels,
                labels: { style: { colors: "#9CA3AF" } },
                axisBorder: { show: false },
                axisTicks: { show: false },
              },
              yaxis: {
                min: 0,
                max: 8,                  // 스샷처럼 0~8h 범위
                tickAmount: 4,
                labels: { formatter: (v: number) => `${v}h` },
              },
              // 오른쪽 끝에 Warn/Alert 텍스트(겹쳐도 자연스러움)
              annotations: {
                yaxis: [
                  {
                    y: WARN_H,
                    borderColor: "#F59E0B",
                    strokeDashArray: 8,
                    label: {
                      text: `Warn (4h)`,
                      position: "right",
                      style: { background: "transparent", color: "#F59E0B", fontWeight: 700 }
                    }
                  },
                  {
                    y: ALERT_H,
                    borderColor: "#EF4444",
                    strokeDashArray: 8,
                    label: {
                      text: `Alert (6h)`,
                      position: "right",
                      style: { background: "transparent", color: "#EF4444", fontWeight: 700 }
                    }
                  }
                ]
              },
              tooltip: {
                shared: true,
                y: { formatter: (val: number) => `${val.toFixed(2)}h` }
              }
            }}
          />
        </section>

        <section className="vd-card vd-chart">
          <header className="vd-card__header">
            <h3>Total Bloat Trend <span className="vd-dim"> (Last 30 Days) </span></h3>
          </header>
          <Chart
            type="line"
            series={bloatTrendSeries}
            categories={data.bloatTrend.labels}
            height={400}
            width="100%"
            showLegend={false}
            showToolbar={false}
            colors={["#6366F1"]}
            customOptions={{
                chart: { redrawOnParentResize: true, redrawOnWindowResize: true },
                stroke: { width: 2, curve: "smooth" },
                grid: { borderColor: "#E5E7EB", strokeDashArray: 4 },
                markers: { size: 0 },
                yaxis: {min:0},
            }}
            tooltipFormatter={(v) => `${Math.round(v).toLocaleString()}`}
            />
        </section>


        <section className="vd-card vd-chart">
          <header className="vd-card__header">
            <h3>Bloat Distribution by Percentage <span className="vd-dim">(24h)</span></h3>
          </header>
          <Chart
            type="bar"
            series={bloatDistributionSeries}
            categories={data.bloatDistribution.labels}
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
    </div>
  );
}