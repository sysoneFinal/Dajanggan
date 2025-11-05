import { useMemo } from "react";
import Chart from "../../components/chart/ChartComponent";
import "/src/styles/vacuum/VacuumPage.css";

/* ---------- 타입 및 데모 데이터 ---------- */
type VacuumSession = {
  tableName: string;
  schema: string;
  startTime: string;
  endTime?: string; // 진행 중이면 없음
  duration?: string; // 진행 중이면 없음
  elapsed?: string; // 진행 중일 때 경과 시간 (서버에서 계산된 값)
  autovacuum: boolean;
  role: string;
  heapBlocksTotal: string;
  deadTuplesPerPhase: string;
  phase: string; // 현재 진행 단계
  status: "진행 중" | "완료" | "실패";
  lastUpdated?: string; // 마지막 업데이트 시간
  progress: {
    scanned: number[];
    vacuumed: number[];
    deadRows: number[];
    labels: string[];
  };
  summary: Record<string, string>;
};

// 진행 중인 세션 예시
const ongoingDemo: VacuumSession = {
  tableName: "orders",
  schema: "public.snapshots",
  startTime: "Jul 24, 2023 11:30:40 PM PDT",
  elapsed: "45:23",
  autovacuum: true,
  role: "n/a",
  heapBlocksTotal: "175.3 GB · 22,979,917 blocks",
  deadTuplesPerPhase: "178,956,969",
  phase: "vacuuming indexes",
  status: "진행 중",
  lastUpdated: "3분 전",
  progress: {
     // 실제 시간
    labels: ["11:30", "11:35", "11:40", "11:45", "11:50", "11:55", "12:00"],
    
    // 실제 데이터 크기 (GB)
    scanned: [0, 30.5, 61.0, 91.5, 122.0, 145.6, 152.6],
    vacuumed: [0, 0, 20.3, 50.8, 91.5, 122.0, 152.6],
    deadRows: [0, 0, 0, 15.2, 45.7, 76.3, 91.5],
  },
  summary: {
    "Time Elapsed": "45:23",
    "CPU Time": "user: 1543.44 s, system: 235.07 s",
    "Pages Removed": "0 / 0 B",
    "Pages Remaining": "22,979,917 / 175.3 GB",
    "Pages Skipped Due To Pin": "0 / 0 B",
    "Pages Skipped Frozen": "15,183,404 / 115.8 GB",
    "Tuples Deleted": "424,711",
    "Tuples Remaining": "1,745,563,359",
    "Tuples Dead But Not Removable": "13,014,687",
    "Max Dead Tuples / Phase": "178,956,969",
    "Data Read from Cache": "182 GB",
    "Data Read from Disk": "364.9 GB",
    "Data Flushed to Disk": "54.5 GB",
    "Avg Read Rate": "90.06 MB/s",
    "Avg Write Rate": "13.46 MB/s",
  },
};


/* ---------- 페이지 ---------- */
export default function VacuumSessionDetailPage({ 
  data = ongoingDemo 
}: { 
  data?: VacuumSession 
}) {
  const isOngoing = data.status === "진행 중";

  const progressSeries = useMemo(
    () => [
      { name: "Heap Bytes Scanned", data: data.progress.scanned },
      { name: "Heap Bytes Vacuumed", data: data.progress.vacuumed },
      { name: "Dead Rows", data: data.progress.deadRows },
    ],
    [data.progress]
  );

  // 데이터 그룹핑
  const performanceMetrics = {
    "Time Elapsed": data.summary["Time Elapsed"],
    "CPU Time": data.summary["CPU Time"],
    "Avg Read Rate": data.summary["Avg Read Rate"],
    "Avg Write Rate": data.summary["Avg Write Rate"],
  };

  const dataIO = {
    "Data Read from Cache": data.summary["Data Read from Cache"],
    "Data Read from Disk": data.summary["Data Read from Disk"],
    "Data Flushed to Disk": data.summary["Data Flushed to Disk"],
  };

  const tuples = {
    "Tuples Deleted": isOngoing ? `${data.summary["Tuples Deleted"]} ` : data.summary["Tuples Deleted"],
    "Tuples Remaining": isOngoing ? `${data.summary["Tuples Remaining"]} ` : data.summary["Tuples Remaining"],
    "Tuples Dead But Not Removable": data.summary["Tuples Dead But Not Removable"],
    "Max Dead Tuples / Phase": data.summary["Max Dead Tuples / Phase"],
  };

  const pages = {
    "Pages Remaining": data.summary["Pages Remaining"],
    "Pages Skipped Frozen": data.summary["Pages Skipped Frozen"],
    "Pages Removed": data.summary["Pages Removed"],
    "Pages Skipped Due To Pin": data.summary["Pages Skipped Due To Pin"],
  };

  // 상태별 배지 스타일
  const getStatusBadge = (status: string) => {
    const styles = {
      "진행 중": "vd-badge vd-badge--info",
      "완료": "vd-badge vd-badge--ok",
      "실패": "vd-badge vd-badge--error",
    };
    return styles[status as keyof typeof styles] || "vd-badge";
  };

  return (
    <div className="vd-root">
      {/* 상단 메타정보 */}
      <div className="vd-grid4">
        <section className="vd-card">
          <header className="vd-card__header">
            <h2>
              VACUUM - {data.tableName}{" "}
               {isOngoing && data.lastUpdated && (
              <span style={{ marginTop: "8px", fontSize: "0.875rem", color: "#6B7280" }}>
                마지막 업데이트: {data.lastUpdated}
              </span>
            )}
            </h2>
            <div className="vd-kpis">
              <div className="vd-chip">
                <span className="vd-chip__label">Autovacuum</span>
                <span className="vd-chip__value">{data.autovacuum ? "Yes" : "No"}</span>
              </div>
              <div className="vd-chip">
                <span className="vd-chip__label">Start</span>
                <span className="vd-chip__value">{data.startTime}</span>
              </div>
              {isOngoing ? (
                <>
                 
                  <div className="vd-chip">
                    <span className="vd-chip__label">Phase</span>
                    <span className="vd-chip__value">{data.phase}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="vd-chip">
                    <span className="vd-chip__label">End</span>
                    <span className="vd-chip__value">{data.endTime}</span>
                  </div>
                  <div className="vd-chip">
                    <span className="vd-chip__label">Duration</span>
                    <span className="vd-chip__value">{data.duration}</span>
                  </div>
                </>
              )}
            </div>
          </header>
        </section>
      </div>

      {/* Progress 차트 */}
      <div className="vd-grid5">
        <section className="vd-card vd-chart2">
          <header className="vd-card__header">
            <h3>Progress</h3>
          </header>
          <Chart
            type="line"
            series={progressSeries}
            categories={data.progress.labels}
            height="100%"
            width="100%"
            colors={["#6366F1", "#10B981", "#FBBF24"]}
            customOptions={{
              chart: { redrawOnParentResize: true, redrawOnWindowResize: true },
              stroke: { curve: "smooth", width: 2 },
             
              grid: { borderColor: "#E5E7EB", strokeDashArray: 4 },
              legend: { position: "bottom" },
              yaxis: { title: { text: "GB" }},
            }}
          />
        </section>

        {/* 성능 및 데이터 I/O */}
        <div className="vd-grid3">
          <section className="vd-card">
            <header className="vd-card__header">
              <h3>성능 지표</h3>
            </header>
            <div className="vd-tablewrap">
              <table className="vd-table2">
                <tbody>
                  {Object.entries(performanceMetrics).map(([key, value]) => (
                    <tr key={key}>
                      <td>
                        <strong>{key}</strong>
                      </td>
                      <td>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="vd-card">
            <header className="vd-card__header">
              <h3>데이터 I/O</h3>
            </header>
            <div className="vd-tablewrap">
              <table className="vd-table2">
                <tbody>
                  {Object.entries(dataIO).map(([key, value]) => (
                    <tr key={key}>
                      <td>
                        <strong>{key}</strong>
                      </td>
                      <td>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="vd-card">
            <header className="vd-card__header">
              <h3>튜플</h3>
            </header>
            <div className="vd-tablewrap">
              <table className="vd-table2">
                <tbody>
                  {Object.entries(tuples).map(([key, value]) => (
                    <tr key={key}>
                      <td>
                        <strong>{key}</strong>
                      </td>
                      <td>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="vd-card">
            <header className="vd-card__header">
              <h3>페이지</h3>
            </header>
            <div className="vd-tablewrap">
              <table className="vd-table2">
                <tbody>
                  {Object.entries(pages).map(([key, value]) => (
                    <tr key={key}>
                      <td>
                        <strong>{key}</strong>
                      </td>
                      <td>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}