import { useMemo, useState } from "react";
import Chart from "../../components/chart/ChartComponent";
import Pagination from "../../components/util/Pagination";
import "/src/styles/query/execution-status.css";

/**
 * 쿼리 실행 상태 페이지
 * - 실행 통계 테이블 및 차트 시각화
 * 
 * @author 이해든
 */

/* ---------- 타입/데모데이터 ---------- */
type QueryStat = {
  id: string;
  shortQuery: string;
  executionCount: number;
  avgTime: string;
  totalTime: string;
  callCount: number;
};

type DashboardData = {
  transactionDistribution: { 
    data: number[];    // 트랜잭션 건수
    labels: string[];  // 쿼리 수 구간 (1, 2-3, 4-7, 8-15, 16+)
  };
  queryTypeDistribution: { labels: string[]; data: number[] };
  stats: QueryStat[];
};

/* ---------- 데모 데이터 ---------- */
// 시간대별 데모 데이터
const demoDataByTime: Record<TimeFilter, DashboardData> = {
  "1h": {
    // 트랜잭션당 쿼리 수 분포 (최근 1시간 - 적은 데이터)
    transactionDistribution: {
      data: [450, 280, 180, 90, 45],
      labels: ["1", "2-3", "4-7", "8-15", "16+"],
    },
    queryTypeDistribution: {
      labels: ["SELECT", "UPDATE", "INSERT", "DELETE"],
      data: [70, 18, 8, 4],
    },
    stats: [
      { id: "#1234", shortQuery: "SELECT - orders, customers", executionCount: 456, avgTime: "12ms", totalTime: "5.5s", callCount: 456 },
      { id: "#5678", shortQuery: "UPDATE - inventory", executionCount: 234, avgTime: "18ms", totalTime: "4.2s", callCount: 234 },
      { id: "#2345", shortQuery: "SELECT COUNT - logs", executionCount: 189, avgTime: "6ms", totalTime: "1.1s", callCount: 189 },
      { id: "#7777", shortQuery: "INSERT - logs", executionCount: 678, avgTime: "4ms", totalTime: "2.7s", callCount: 678 },
      { id: "#3333", shortQuery: "DELETE - temp_data", executionCount: 12, avgTime: "95ms", totalTime: "1.1s", callCount: 12 },
      { id: "#9012", shortQuery: "SELECT - users, orders", executionCount: 145, avgTime: "32ms", totalTime: "4.6s", callCount: 145 },
      { id: "#6789", shortQuery: "UPDATE - users", executionCount: 389, avgTime: "9ms", totalTime: "3.5s", callCount: 389 },
      { id: "#4444", shortQuery: "SELECT AVG - orders", executionCount: 78, avgTime: "58ms", totalTime: "4.5s", callCount: 78 },
    ],
  },
  "6h": {
    // 최근 6시간 - 중간 데이터
    transactionDistribution: {
      data: [890, 620, 430, 210, 95],
      labels: ["1", "2-3", "4-7", "8-15", "16+"],
    },
    queryTypeDistribution: {
      labels: ["SELECT", "UPDATE", "INSERT", "DELETE"],
      data: [68, 19, 9, 4],
    },
    stats: [
      { id: "#1234", shortQuery: "SELECT - orders, customers", executionCount: 892, avgTime: "14ms", totalTime: "12.5s", callCount: 892 },
      { id: "#5678", shortQuery: "UPDATE - inventory", executionCount: 567, avgTime: "21ms", totalTime: "11.9s", callCount: 567 },
      { id: "#2345", shortQuery: "SELECT COUNT - logs", executionCount: 423, avgTime: "7ms", totalTime: "3.0s", callCount: 423 },
      { id: "#7777", shortQuery: "INSERT - logs", executionCount: 1456, avgTime: "5ms", totalTime: "7.3s", callCount: 1456 },
      { id: "#3333", shortQuery: "DELETE - temp_data", executionCount: 34, avgTime: "110ms", totalTime: "3.7s", callCount: 34 },
      { id: "#9012", shortQuery: "SELECT - users, orders", executionCount: 456, avgTime: "38ms", totalTime: "17.3s", callCount: 456 },
      { id: "#6789", shortQuery: "UPDATE - users", executionCount: 923, avgTime: "11ms", totalTime: "10.2s", callCount: 923 },
      { id: "#4444", shortQuery: "SELECT AVG - orders", executionCount: 167, avgTime: "68ms", totalTime: "11.4s", callCount: 167 },
    ],
  },
  "24h": {
    // 최근 24시간 - 많은 데이터
    transactionDistribution: {
      data: [1450, 980, 620, 350, 180],
      labels: ["1", "2-3", "4-7", "8-15", "16+"],
    },
    queryTypeDistribution: {
      labels: ["SELECT", "UPDATE", "INSERT", "DELETE"],
      data: [65, 20, 10, 5],
    },
    stats: [
      { id: "#1234", shortQuery: "SELECT - orders, customers", executionCount: 1234, avgTime: "15ms", totalTime: "18.5s", callCount: 1234 },
      { id: "#5678", shortQuery: "UPDATE - inventory", executionCount: 890, avgTime: "23ms", totalTime: "20.4s", callCount: 890 },
      { id: "#2345", shortQuery: "SELECT COUNT - logs", executionCount: 567, avgTime: "8ms", totalTime: "4.5s", callCount: 567 },
      { id: "#7777", shortQuery: "INSERT - logs", executionCount: 2341, avgTime: "5ms", totalTime: "11.7s", callCount: 2341 },
      { id: "#3333", shortQuery: "DELETE - temp_data", executionCount: 45, avgTime: "120ms", totalTime: "5.4s", callCount: 45 },
      { id: "#9012", shortQuery: "SELECT - users, orders", executionCount: 678, avgTime: "45ms", totalTime: "30.5s", callCount: 678 },
      { id: "#6789", shortQuery: "UPDATE - users", executionCount: 1567, avgTime: "12ms", totalTime: "18.8s", callCount: 1567 },
      { id: "#4444", shortQuery: "SELECT AVG - orders", executionCount: 234, avgTime: "78ms", totalTime: "18.3s", callCount: 234 },
    ],
  },
  "7d": {
    // 최근 7일 - 가장 많은 데이터
    transactionDistribution: {
      data: [2340, 1680, 1120, 780, 450],
      labels: ["1", "2-3", "4-7", "8-15", "16+"],
    },
    queryTypeDistribution: {
      labels: ["SELECT", "UPDATE", "INSERT", "DELETE"],
      data: [63, 21, 11, 5],
    },
    stats: [
      { id: "#1234", shortQuery: "SELECT - orders, customers", executionCount: 4567, avgTime: "16ms", totalTime: "73.1s", callCount: 4567 },
      { id: "#5678", shortQuery: "UPDATE - inventory", executionCount: 3421, avgTime: "24ms", totalTime: "82.1s", callCount: 3421 },
      { id: "#2345", shortQuery: "SELECT COUNT - logs", executionCount: 2134, avgTime: "9ms", totalTime: "19.2s", callCount: 2134 },
      { id: "#7777", shortQuery: "INSERT - logs", executionCount: 8765, avgTime: "6ms", totalTime: "52.6s", callCount: 8765 },
      { id: "#3333", shortQuery: "DELETE - temp_data", executionCount: 189, avgTime: "125ms", totalTime: "23.6s", callCount: 189 },
      { id: "#9012", shortQuery: "SELECT - users, orders", executionCount: 2456, avgTime: "48ms", totalTime: "117.9s", callCount: 2456 },
      { id: "#6789", shortQuery: "UPDATE - users", executionCount: 5432, avgTime: "13ms", totalTime: "70.6s", callCount: 5432 },
      { id: "#4444", shortQuery: "SELECT AVG - orders", executionCount: 987, avgTime: "82ms", totalTime: "80.9s", callCount: 987 },
    ],
  },
};

/* ---------- 작은 컴포넌트 ---------- */
type TimeFilter = "1h" | "6h" | "24h" | "7d";

function TimeButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button className={`es-time-btn ${active ? "es-time-btn--active" : ""}`} onClick={onClick}>
      {label}
    </button>
  );
}

/* ---------- 페이지 ---------- */
export default function ExecutionStatus() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("24h");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof QueryStat | null;
    direction: "asc" | "desc";
  }>({ key: "executionCount", direction: "desc" });
  const itemsPerPage = 8;

  // 시간 필터에 따라 데이터 선택
  const data = useMemo(() => demoDataByTime[timeFilter], [timeFilter]);

  // 시간 필터 변경 핸들러
  const handleTimeFilterChange = (filter: TimeFilter) => {
    setTimeFilter(filter);
    setCurrentPage(1); // 필터 변경 시 첫 페이지로
  };

  // VacuumPage와 동일한 패턴: useMemo로 차트 series 만들기
  const transactionSeries = useMemo(
    () => [{ name: "트랜잭션 건수", data: data.transactionDistribution.data }],
    [data.transactionDistribution.data]
  );

  const queryTypeSeries = useMemo(
    () => data.queryTypeDistribution.data,
    [data.queryTypeDistribution.data]
  );

  // 정렬 함수
  const handleSort = (key: keyof QueryStat) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
    setCurrentPage(1); // 정렬 시 첫 페이지로
  };

  // 시간 문자열을 숫자로 변환 (15ms -> 15, 18.5s -> 18500)
  const parseTime = (timeStr: string): number => {
    const match = timeStr.match(/^([\d.]+)(ms|s)$/);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    const unit = match[2];
    return unit === "s" ? value * 1000 : value;
  };

  // 정렬된 데이터
  const sortedStats = useMemo(() => {
    if (!sortConfig.key) return data.stats;

    const sorted = [...data.stats].sort((a, b) => {
      const aValue = a[sortConfig.key!];
      const bValue = b[sortConfig.key!];

      // 시간 문자열 처리
      if (sortConfig.key === "avgTime" || sortConfig.key === "totalTime") {
        const aTime = parseTime(aValue as string);
        const bTime = parseTime(bValue as string);
        return sortConfig.direction === "asc" ? aTime - bTime : bTime - aTime;
      }

      // 숫자 처리
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
      }

      // 문자열 처리
      return sortConfig.direction === "asc"
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });

    return sorted;
  }, [data.stats, sortConfig]);

  // 페이지네이션
  const totalPages = Math.ceil(sortedStats.length / itemsPerPage);
  const currentStats = sortedStats.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 정렬 아이콘 렌더링
  const renderSortIcon = (key: keyof QueryStat) => {
    if (sortConfig.key !== key) {
      return <span className="es-sort es-sort--inactive">⇅</span>;
    }
    return (
      <span className="es-sort es-sort--active">
        {sortConfig.direction === "asc" ? "▲" : "▼"}
      </span>
    );
  };

  return (
    <div className="es-root">
      {/* 전체 실행 통계 테이블 */}
      <section className="es-card">
        <header className="es-card__header">
          <h3>전체 실행 통계</h3>
          <div className="es-controls">
            <div className="es-time-filters">
              <TimeButton active={timeFilter === "1h"} label="1h" onClick={() => handleTimeFilterChange("1h")} />
              <TimeButton active={timeFilter === "6h"} label="6h" onClick={() => handleTimeFilterChange("6h")} />
              <TimeButton active={timeFilter === "24h"} label="24h" onClick={() => handleTimeFilterChange("24h")} />
              <TimeButton active={timeFilter === "7d"} label="7d" onClick={() => handleTimeFilterChange("7d")} />
            </div>
            <button className="es-csv-btn">
              <span className="es-csv-icon">📥</span>
              CSV 내보내기
            </button>
          </div>
        </header>
        <div className="es-tablewrap">
          <table className="es-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>SHORT QUERY</th>
                <th className="es-th-sortable" onClick={() => handleSort("executionCount")}>
                  실행 횟수 {renderSortIcon("executionCount")}
                </th>
                <th className="es-th-sortable" onClick={() => handleSort("avgTime")}>
                  평균 시간 {renderSortIcon("avgTime")}
                </th>
                <th className="es-th-sortable" onClick={() => handleSort("totalTime")}>
                  호출 시간 {renderSortIcon("totalTime")}
                </th>
                <th className="es-th-sortable" onClick={() => handleSort("callCount")}>
                  호출수 {renderSortIcon("callCount")}
                </th>
              </tr>
            </thead>
            <tbody>
              {currentStats.map((stat) => (
                <tr key={stat.id}>
                  <td className="es-td-id">{stat.id}</td>
                  <td className="es-td-query">{stat.shortQuery}</td>
                  <td>{stat.executionCount.toLocaleString()}</td>
                  <td>{stat.avgTime}</td>
                  <td>{stat.totalTime}</td>
                  <td>{stat.callCount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* 페이지네이션 - 공통 컴포넌트 사용 */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </section>

      {/* 하단 차트 그리드 (VacuumPage와 동일한 구조) */}
      <div className="es-grid">
        <section className="es-card es-chart">
          <header className="es-card__header">
            <h3>트랜잭션당 쿼리 수 분포</h3>
          </header>
          <Chart
            type="bar"
            series={transactionSeries}
            categories={data.transactionDistribution.labels}
            height={320}
            width="100%"
            showLegend={false}
            showToolbar={false}
            colors={["#6366F1"]}
            customOptions={{
              chart: { redrawOnParentResize: true, redrawOnWindowResize: true },
              plotOptions: {
                bar: {
                  borderRadius: 8,
                  columnWidth: "65%",
                },
              },
              grid: { borderColor: "#E5E7EB", strokeDashArray: 4 },
              dataLabels: { enabled: false },
              xaxis: {
                title: {
                  text: "쿼리 수",
                  style: {
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#6B7280",
                  },
                },
                labels: {
                  style: {
                    colors: "#6B7280",
                    fontSize: "12px",
                  },
                },
              },
              yaxis: { 
                min: 0,
                title: {
                  text: "트랜잭션 건수",
                  style: {
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#6B7280",
                  },
                },
                labels: {
                  formatter: (val: number) => val.toLocaleString(),
                },
              },
            }}
            tooltipFormatter={(v) => `${Math.round(v).toLocaleString()} 트랜잭션`}
          />
        </section>

        <section className="es-card es-chart">
          <header className="es-card__header">
            <h3>쿼리 타입별 분포</h3>
          </header>
          <Chart
            type="pie"
            series={queryTypeSeries}
            categories={data.queryTypeDistribution.labels}
            height={320}
            width="100%"
            showLegend={true}
            showToolbar={false}
            colors={["#6366F1", "#EC4899", "#10B981", "#F59E0B"]}
            customOptions={{
              chart: { redrawOnParentResize: true, redrawOnWindowResize: true },
              legend: {
                position: "right",
                fontSize: "14px",
                fontWeight: 600,
                labels: {
                  colors: "#374151",
                },
              },
              dataLabels: {
                enabled: false,
              },
              stroke: {
                width: 0,
              },
            }}
          />
        </section>
      </div>
    </div>
  );
}