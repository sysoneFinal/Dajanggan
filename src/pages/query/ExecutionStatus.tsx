import { useMemo, useState } from "react";
import Chart from "../../components/chart/ChartComponent";
import Pagination from "../../components/util/Pagination";
import CsvButton from "../../components/util/CsvButton";
import QueryModal from "../query/QueryModal";
import type { QueryDetail } from "../query/QueryModal";
import "/src/styles/query/execution-status.css";

/**
 * 쿼리 실행 상태 페이지
 * - 실행 통계 테이블 및 차트 시각화
 * 
 * @author 이해든
 */

type TimeFilter = "1h" | "6h" | "24h" | "7d";

type QueryStat = {
  id: string;
  shortQuery: string;
  fullQuery: string;
  executionCount: number;
  avgTime: string;
  totalTime: string;
  callCount: number;
};

type DashboardData = {
  transactionDistribution: {
    data: number[];
    labels: string[];
  };
  queryTypeDistribution: { labels: string[]; data: number[] };
  stats: QueryStat[];
};

/* ---------- 데모 데이터 ---------- */
const demoDataByTime: Record<TimeFilter, DashboardData> = {
  "1h": {
    transactionDistribution: { data: [450, 280, 180, 90, 45], labels: ["1", "2-3", "4-7", "8-15", "16+"] },
    queryTypeDistribution: { labels: ["SELECT", "UPDATE", "INSERT", "DELETE"], data: [70, 18, 8, 4] },
    stats: [
      { id: "#1234", shortQuery: "SELECT - orders, customers", fullQuery: "SELECT * FROM orders JOIN customers ON orders.customer_id = customers.id WHERE orders.created_at > '2024-01-01'", executionCount: 456, avgTime: "12ms", totalTime: "5.5s", callCount: 456 },
      { id: "#5678", shortQuery: "UPDATE - inventory", fullQuery: "UPDATE inventory SET stock = stock - 1 WHERE product_id = ? AND stock > 0", executionCount: 234, avgTime: "18ms", totalTime: "4.2s", callCount: 234 },
      { id: "#2345", shortQuery: "SELECT COUNT - logs", fullQuery: "SELECT COUNT(*) FROM logs WHERE created_at > NOW() - INTERVAL '1 hour'", executionCount: 189, avgTime: "6ms", totalTime: "1.1s", callCount: 189 },
      { id: "#7777", shortQuery: "INSERT - logs", fullQuery: "INSERT INTO logs (user_id, action, created_at) VALUES (?, ?, NOW())", executionCount: 678, avgTime: "4ms", totalTime: "2.7s", callCount: 678 },
      { id: "#3333", shortQuery: "DELETE - temp_data", fullQuery: "DELETE FROM temp_data WHERE created_at < NOW() - INTERVAL '7 days'", executionCount: 12, avgTime: "95ms", totalTime: "1.1s", callCount: 12 },
      { id: "#9012", shortQuery: "SELECT - users, orders", fullQuery: "SELECT users.*, COUNT(orders.id) as order_count FROM users LEFT JOIN orders ON users.id = orders.user_id GROUP BY users.id", executionCount: 145, avgTime: "32ms", totalTime: "4.6s", callCount: 145 },
      { id: "#6789", shortQuery: "UPDATE - users", fullQuery: "UPDATE users SET last_login = NOW() WHERE id = ?", executionCount: 389, avgTime: "9ms", totalTime: "3.5s", callCount: 389 },
      { id: "#4444", shortQuery: "SELECT AVG - orders", fullQuery: "SELECT AVG(total_amount) FROM orders WHERE created_at > '2024-01-01'", executionCount: 78, avgTime: "58ms", totalTime: "4.5s", callCount: 78 },
      { id: "#1111", shortQuery: "SELECT - products", fullQuery: "SELECT * FROM products WHERE category_id = ?", executionCount: 523, avgTime: "7ms", totalTime: "3.7s", callCount: 523 },
      { id: "#2222", shortQuery: "UPDATE - orders", fullQuery: "UPDATE orders SET status = 'shipped' WHERE id = ?", executionCount: 312, avgTime: "15ms", totalTime: "4.7s", callCount: 312 },
      { id: "#3344", shortQuery: "INSERT - users", fullQuery: "INSERT INTO users (email, name, created_at) VALUES (?, ?, NOW())", executionCount: 89, avgTime: "11ms", totalTime: "1.0s", callCount: 89 },
      { id: "#5566", shortQuery: "SELECT - sessions", fullQuery: "SELECT * FROM sessions WHERE expires_at > NOW()", executionCount: 234, avgTime: "5ms", totalTime: "1.2s", callCount: 234 },
      { id: "#7788", shortQuery: "DELETE - logs", fullQuery: "DELETE FROM logs WHERE created_at < NOW() - INTERVAL '30 days'", executionCount: 23, avgTime: "120ms", totalTime: "2.8s", callCount: 23 },
      { id: "#9999", shortQuery: "SELECT - analytics", fullQuery: "SELECT DATE(created_at), COUNT(*) FROM orders GROUP BY DATE(created_at)", executionCount: 156, avgTime: "45ms", totalTime: "7.0s", callCount: 156 },
    ],
  },
  "6h": {
    transactionDistribution: { data: [890, 620, 430, 210, 95], labels: ["1", "2-3", "4-7", "8-15", "16+"] },
    queryTypeDistribution: { labels: ["SELECT", "UPDATE", "INSERT", "DELETE"], data: [68, 19, 9, 4] },
    stats: [
      { id: "#1234", shortQuery: "SELECT - orders, customers", fullQuery: "SELECT * FROM orders JOIN customers ON orders.customer_id = customers.id WHERE orders.created_at > '2024-01-01'", executionCount: 892, avgTime: "14ms", totalTime: "12.5s", callCount: 892 },
      { id: "#5678", shortQuery: "UPDATE - inventory", fullQuery: "UPDATE inventory SET stock = stock - 1 WHERE product_id = ? AND stock > 0", executionCount: 567, avgTime: "21ms", totalTime: "11.9s", callCount: 567 },
      { id: "#2345", shortQuery: "SELECT COUNT - logs", fullQuery: "SELECT COUNT(*) FROM logs WHERE created_at > NOW() - INTERVAL '1 hour'", executionCount: 423, avgTime: "7ms", totalTime: "3.0s", callCount: 423 },
      { id: "#7777", shortQuery: "INSERT - logs", fullQuery: "INSERT INTO logs (user_id, action, created_at) VALUES (?, ?, NOW())", executionCount: 1456, avgTime: "5ms", totalTime: "7.3s", callCount: 1456 },
      { id: "#3333", shortQuery: "DELETE - temp_data", fullQuery: "DELETE FROM temp_data WHERE created_at < NOW() - INTERVAL '7 days'", executionCount: 34, avgTime: "110ms", totalTime: "3.7s", callCount: 34 },
      { id: "#9012", shortQuery: "SELECT - users, orders", fullQuery: "SELECT users.*, COUNT(orders.id) as order_count FROM users LEFT JOIN orders ON users.id = orders.user_id GROUP BY users.id", executionCount: 456, avgTime: "38ms", totalTime: "17.3s", callCount: 456 },
      { id: "#6789", shortQuery: "UPDATE - users", fullQuery: "UPDATE users SET last_login = NOW() WHERE id = ?", executionCount: 923, avgTime: "11ms", totalTime: "10.2s", callCount: 923 },
      { id: "#4444", shortQuery: "SELECT AVG - orders", fullQuery: "SELECT AVG(total_amount) FROM orders WHERE created_at > '2024-01-01'", executionCount: 167, avgTime: "68ms", totalTime: "11.4s", callCount: 167 },
      { id: "#1111", shortQuery: "SELECT - products", fullQuery: "SELECT * FROM products WHERE category_id = ?", executionCount: 1023, avgTime: "8ms", totalTime: "8.2s", callCount: 1023 },
      { id: "#2222", shortQuery: "UPDATE - orders", fullQuery: "UPDATE orders SET status = 'shipped' WHERE id = ?", executionCount: 612, avgTime: "16ms", totalTime: "9.8s", callCount: 612 },
      { id: "#3344", shortQuery: "INSERT - users", fullQuery: "INSERT INTO users (email, name, created_at) VALUES (?, ?, NOW())", executionCount: 189, avgTime: "12ms", totalTime: "2.3s", callCount: 189 },
      { id: "#5566", shortQuery: "SELECT - sessions", fullQuery: "SELECT * FROM sessions WHERE expires_at > NOW()", executionCount: 534, avgTime: "6ms", totalTime: "3.2s", callCount: 534 },
      { id: "#7788", shortQuery: "DELETE - logs", fullQuery: "DELETE FROM logs WHERE created_at < NOW() - INTERVAL '30 days'", executionCount: 45, avgTime: "125ms", totalTime: "5.6s", callCount: 45 },
      { id: "#9999", shortQuery: "SELECT - analytics", fullQuery: "SELECT DATE(created_at), COUNT(*) FROM orders GROUP BY DATE(created_at)", executionCount: 356, avgTime: "48ms", totalTime: "17.1s", callCount: 356 },
    ],
  },
  "24h": {
    transactionDistribution: { data: [1450, 980, 620, 350, 180], labels: ["1", "2-3", "4-7", "8-15", "16+"] },
    queryTypeDistribution: { labels: ["SELECT", "UPDATE", "INSERT", "DELETE"], data: [65, 20, 10, 5] },
    stats: [
      { id: "#1234", shortQuery: "SELECT - orders, customers", fullQuery: "SELECT * FROM orders JOIN customers ON orders.customer_id = customers.id WHERE orders.created_at > '2024-01-01'", executionCount: 1234, avgTime: "15ms", totalTime: "18.5s", callCount: 1234 },
      { id: "#5678", shortQuery: "UPDATE - inventory", fullQuery: "UPDATE inventory SET stock = stock - 1 WHERE product_id = ? AND stock > 0", executionCount: 890, avgTime: "23ms", totalTime: "20.4s", callCount: 890 },
      { id: "#2345", shortQuery: "SELECT COUNT - logs", fullQuery: "SELECT COUNT(*) FROM logs WHERE created_at > NOW() - INTERVAL '1 hour'", executionCount: 567, avgTime: "8ms", totalTime: "4.5s", callCount: 567 },
      { id: "#7777", shortQuery: "INSERT - logs", fullQuery: "INSERT INTO logs (user_id, action, created_at) VALUES (?, ?, NOW())", executionCount: 2341, avgTime: "5ms", totalTime: "11.7s", callCount: 2341 },
      { id: "#3333", shortQuery: "DELETE - temp_data", fullQuery: "DELETE FROM temp_data WHERE created_at < NOW() - INTERVAL '7 days'", executionCount: 45, avgTime: "120ms", totalTime: "5.4s", callCount: 45 },
      { id: "#9012", shortQuery: "SELECT - users, orders", fullQuery: "SELECT users.*, COUNT(orders.id) as order_count FROM users LEFT JOIN orders ON users.id = orders.user_id GROUP BY users.id", executionCount: 678, avgTime: "45ms", totalTime: "30.5s", callCount: 678 },
      { id: "#6789", shortQuery: "UPDATE - users", fullQuery: "UPDATE users SET last_login = NOW() WHERE id = ?", executionCount: 1567, avgTime: "12ms", totalTime: "18.8s", callCount: 1567 },
      { id: "#4444", shortQuery: "SELECT AVG - orders", fullQuery: "SELECT AVG(total_amount) FROM orders WHERE created_at > '2024-01-01'", executionCount: 234, avgTime: "78ms", totalTime: "18.3s", callCount: 234 },
      { id: "#1111", shortQuery: "SELECT - products", fullQuery: "SELECT * FROM products WHERE category_id = ?", executionCount: 1523, avgTime: "9ms", totalTime: "13.7s", callCount: 1523 },
      { id: "#2222", shortQuery: "UPDATE - orders", fullQuery: "UPDATE orders SET status = 'shipped' WHERE id = ?", executionCount: 1012, avgTime: "17ms", totalTime: "17.2s", callCount: 1012 },
      { id: "#3344", shortQuery: "INSERT - users", fullQuery: "INSERT INTO users (email, name, created_at) VALUES (?, ?, NOW())", executionCount: 289, avgTime: "13ms", totalTime: "3.8s", callCount: 289 },
      { id: "#5566", shortQuery: "SELECT - sessions", fullQuery: "SELECT * FROM sessions WHERE expires_at > NOW()", executionCount: 834, avgTime: "7ms", totalTime: "5.8s", callCount: 834 },
      { id: "#7788", shortQuery: "DELETE - logs", fullQuery: "DELETE FROM logs WHERE created_at < NOW() - INTERVAL '30 days'", executionCount: 67, avgTime: "130ms", totalTime: "8.7s", callCount: 67 },
      { id: "#9999", shortQuery: "SELECT - analytics", fullQuery: "SELECT DATE(created_at), COUNT(*) FROM orders GROUP BY DATE(created_at)", executionCount: 556, avgTime: "52ms", totalTime: "28.9s", callCount: 556 },
    ],
  },
  "7d": {
    transactionDistribution: { data: [2340, 1680, 1120, 780, 450], labels: ["1", "2-3", "4-7", "8-15", "16+"] },
    queryTypeDistribution: { labels: ["SELECT", "UPDATE", "INSERT", "DELETE"], data: [63, 21, 11, 5] },
    stats: [
      { id: "#1234", shortQuery: "SELECT - orders, customers", fullQuery: "SELECT * FROM orders JOIN customers ON orders.customer_id = customers.id WHERE orders.created_at > '2024-01-01'", executionCount: 4567, avgTime: "16ms", totalTime: "73.1s", callCount: 4567 },
      { id: "#5678", shortQuery: "UPDATE - inventory", fullQuery: "UPDATE inventory SET stock = stock - 1 WHERE product_id = ? AND stock > 0", executionCount: 3421, avgTime: "24ms", totalTime: "82.1s", callCount: 3421 },
      { id: "#2345", shortQuery: "SELECT COUNT - logs", fullQuery: "SELECT COUNT(*) FROM logs WHERE created_at > NOW() - INTERVAL '1 hour'", executionCount: 2134, avgTime: "9ms", totalTime: "19.2s", callCount: 2134 },
      { id: "#7777", shortQuery: "INSERT - logs", fullQuery: "INSERT INTO logs (user_id, action, created_at) VALUES (?, ?, NOW())", executionCount: 8765, avgTime: "6ms", totalTime: "52.6s", callCount: 8765 },
      { id: "#3333", shortQuery: "DELETE - temp_data", fullQuery: "DELETE FROM temp_data WHERE created_at < NOW() - INTERVAL '7 days'", executionCount: 189, avgTime: "125ms", totalTime: "23.6s", callCount: 189 },
      { id: "#9012", shortQuery: "SELECT - users, orders", fullQuery: "SELECT users.*, COUNT(orders.id) as order_count FROM users LEFT JOIN orders ON users.id = orders.user_id GROUP BY users.id", executionCount: 2456, avgTime: "48ms", totalTime: "117.9s", callCount: 2456 },
      { id: "#6789", shortQuery: "UPDATE - users", fullQuery: "UPDATE users SET last_login = NOW() WHERE id = ?", executionCount: 5432, avgTime: "13ms", totalTime: "70.6s", callCount: 5432 },
      { id: "#4444", shortQuery: "SELECT AVG - orders", fullQuery: "SELECT AVG(total_amount) FROM orders WHERE created_at > '2024-01-01'", executionCount: 987, avgTime: "82ms", totalTime: "80.9s", callCount: 987 },
      { id: "#1111", shortQuery: "SELECT - products", fullQuery: "SELECT * FROM products WHERE category_id = ?", executionCount: 5523, avgTime: "10ms", totalTime: "55.2s", callCount: 5523 },
      { id: "#2222", shortQuery: "UPDATE - orders", fullQuery: "UPDATE orders SET status = 'shipped' WHERE id = ?", executionCount: 4012, avgTime: "18ms", totalTime: "72.2s", callCount: 4012 },
      { id: "#3344", shortQuery: "INSERT - users", fullQuery: "INSERT INTO users (email, name, created_at) VALUES (?, ?, NOW())", executionCount: 1089, avgTime: "14ms", totalTime: "15.2s", callCount: 1089 },
      { id: "#5566", shortQuery: "SELECT - sessions", fullQuery: "SELECT * FROM sessions WHERE expires_at > NOW()", executionCount: 3834, avgTime: "8ms", totalTime: "30.7s", callCount: 3834 },
      { id: "#7788", shortQuery: "DELETE - logs", fullQuery: "DELETE FROM logs WHERE created_at < NOW() - INTERVAL '30 days'", executionCount: 234, avgTime: "135ms", totalTime: "31.6s", callCount: 234 },
      { id: "#9999", shortQuery: "SELECT - analytics", fullQuery: "SELECT DATE(created_at), COUNT(*) FROM orders GROUP BY DATE(created_at)", executionCount: 2156, avgTime: "55ms", totalTime: "118.6s", callCount: 2156 },
    ],
  },
};

/* ---------- 정렬 타입 ---------- */
type SortKey = "executionCount" | "avgTime" | "totalTime" | "callCount";
type SortDir = "asc" | "desc" | null;

/* ---------- 유틸 ---------- */
const parseTimeMs = (timeStr: string): number => {
  const m = timeStr.match(/^([\d.]+)(ms|s)$/);
  if (!m) return 0;
  const v = parseFloat(m[1]);
  return m[2] === "s" ? v * 1000 : v;
};

type Bin = { value: number; weight: number };
function weightedQuantile(bins: Bin[], q: number): number {
  const total = bins.reduce((s, b) => s + b.weight, 0);
  if (total === 0) return 0;
  let acc = 0;
  for (const b of bins) {
    acc += b.weight;
    if (acc / total >= q) return b.value;
  }
  return bins[bins.length - 1].value;
}

export default function ExecutionStatus() {
  /* ---------- 리스트 상태 ---------- */
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 14;

  // 모달 상태 관리
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedQueryDetail, setSelectedQueryDetail] = useState<QueryDetail | null>(null);

  const timeFilter: TimeFilter = "24h";
  const listData = useMemo(() => demoDataByTime[timeFilter], [timeFilter]);

  const sortedStats = useMemo(() => {
    if (!sortKey || !sortDir) return listData.stats;

    const arr = [...listData.stats];
    return arr.sort((a, b) => {
      let av: number | string = (a as any)[sortKey];
      let bv: number | string = (b as any)[sortKey];

      if (sortKey === "avgTime" || sortKey === "totalTime") {
        av = parseTimeMs(av as string);
        bv = parseTimeMs(bv as string);
      }

      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }

      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [listData.stats, sortKey, sortDir]);

  const totalPages = Math.ceil(sortedStats.length / itemsPerPage);
  const currentStats = sortedStats.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  /* ---------- 차트 데이터 ---------- */
  const chartRefTime: TimeFilter = "24h";
  const chartData = demoDataByTime[chartRefTime];

  const boxPlotData = useMemo(() => {
    const rep: Record<string, number> = {
      "1": 1,
      "2-3": 2.5,
      "4-7": 5.5,
      "8-15": 11.5,
      "16+": 18,
    };
    const bins: Bin[] = chartData.transactionDistribution.labels
      .map((label, i) => ({
        value: rep[label] ?? 0,
        weight: chartData.transactionDistribution.data[i] ?? 0,
      }))
      .sort((a, b) => a.value - b.value);

    const q1 = weightedQuantile(bins, 0.25);
    const median = weightedQuantile(bins, 0.5);
    const q3 = weightedQuantile(bins, 0.75);
    const min = Math.min(...bins.map(b => b.value));
    const max = Math.max(...bins.map(b => b.value));

    return {
      series: [{
        name: "쿼리 수",
        type: "boxPlot",
        data: [{
          x: "10:00",
          y: [min, q1, median, q3, max]
        }, {
          x: "11:00",
          y: [min, q1, median, q3, max]
        }, {
          x: "12:00",
          y: [min, q1, median, q3, max]
        }]
      }]
    };
  }, [chartData]);

  const queryTypeSeries = useMemo(() => chartData.queryTypeDistribution.data, [chartData]);

  // 행 클릭 핸들러 - 모달 열기
  const onRowClick = (row: QueryStat) => {
    const isModifyingQuery = row.fullQuery.includes("UPDATE") || 
                            row.fullQuery.includes("INSERT") || 
                            row.fullQuery.includes("DELETE");

    const detail: QueryDetail = {
      queryId: `Query ${row.id}`,
      status: isModifyingQuery ? "안전 모드" : "실제 실행",
      avgExecutionTime: row.avgTime,
      totalCalls: row.callCount,
      memoryUsage: "450MB",
      ioUsage: "890 blocks",
      cpuUsagePercent: 75,
      sqlQuery: row.fullQuery,
      suggestion: {
        priority: parseTimeMs(row.avgTime) > 50 ? "필수" : "권장",
        description: "created_at 인덱스 생성 및 ORDER BY 컬럼 커버링 인덱스 고려",
        code: "CREATE INDEX idx_orders_created_amount ON orders(created_at, total_amount DESC);"
      },
      explainResult: `Seq Scan on orders (cost=0..75000) (actual time=0.123..5100.321 rows=120k loops=1)
Filter: (created_at > '2024-01-01')
Rows Removed by Filter: 980k
Sort (ORDER BY total_amount DESC) (actual time=100..5200)
Sort Method: external merge Disk: 512MB
Execution Time: 5200.789 ms`,
      stats: {
        min: "75ms",
        avg: row.avgTime,
        max: parseTimeMs(row.avgTime) > 50 ? `${Math.round(parseTimeMs(row.avgTime) * 1.5)}ms` : row.avgTime,
        stdDev: "38ms",
        totalTime: row.totalTime
      },
      isModifyingQuery
    };

    setSelectedQueryDetail(detail);
    setIsModalOpen(true);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === "desc") {
        setSortDir("asc");
      } else if (sortDir === "asc") {
        setSortKey(null);
        setSortDir(null);
      }
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setCurrentPage(1);
  };

  const getSortIcon = (key: SortKey) => {
    if (sortKey !== key) return "⇅";
    if (sortDir === "desc") return "▼";
    if (sortDir === "asc") return "▲";
    return "⇅";
  };

  const handleExport = () => {
    const headers = [
      "ID",
      "QUERY",
      "실행횟수",
      "평균 시간",
      "총 시간",
      "호출 수"
    ];
    
    const csvData = sortedStats.map((row) => [
      row.id,
      row.shortQuery,
      row.executionCount,
      row.avgTime,
      row.totalTime,
      row.callCount
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map((row) => row.join(",")),
    ].join("\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const fileName = `execution_status_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="es-root">
      <div className="es-layout">
        {/* 좌측: 리스트 카드 */}
        <section className="es-left-card">
          <div className="es-card-header">
            <h3 className="es-card-title">전체 실행 통계</h3>
            <CsvButton onClick={handleExport} />
          </div>

          <div className="es-table">
            <div className="es-thead">
              <div>ID</div>
              <div>QUERY</div>
              <div 
                className="sortable" 
                onClick={() => handleSort("executionCount")}
              >
                실행횟수 <span className="sort-icon">{getSortIcon("executionCount")}</span>
              </div>
              <div 
                className="sortable" 
                onClick={() => handleSort("avgTime")}
              >
                평균 시간 <span className="sort-icon">{getSortIcon("avgTime")}</span>
              </div>
              <div 
                className="sortable" 
                onClick={() => handleSort("totalTime")}
              >
                총 시간 <span className="sort-icon">{getSortIcon("totalTime")}</span>
              </div>
              <div 
                className="sortable" 
                onClick={() => handleSort("callCount")}
              >
                호출 수 <span className="sort-icon">{getSortIcon("callCount")}</span>
              </div>
            </div>
            <div className="es-tbody">
              {currentStats.map((stat, i) => (
                <div key={i} className="es-row" onClick={() => onRowClick(stat)}>
                  <div className="cell-id">{stat.id}</div>
                  <div className="cell-q">{stat.shortQuery}</div>
                  <div>{stat.executionCount.toLocaleString()}</div>
                  <div>{stat.avgTime}</div>
                  <div>{stat.totalTime}</div>
                  <div>{stat.callCount.toLocaleString()}</div>
                </div>
              ))}
              {currentStats.length === 0 && (
                <div className="es-empty">데이터가 없습니다.</div>
              )}
            </div>
          </div>

          <div className="es-pagination">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </section>

        {/* 우측: 차트 카드 2개 */}
        <aside className="es-right-cards">
          <section className="es-chart-card">
            <h4 className="es-chart-title">트랜잭션당 쿼리 수 분포</h4>
            <div className="es-chart-body">
              <Chart
                type="boxPlot"
                series={boxPlotData.series}
                categories={["10:00", "11:00", "12:00"]}
                height="100%"
                showLegend={false}
                showToolbar={false}
                colors={["var(--color-normal)"]}
                titleOptions={{
                  text: "",
                  align: "left"
                }}
                customOptions={{
                  chart: {
                    animations: { enabled: false },
                    redrawOnParentResize: true,
                    redrawOnWindowResize: true,
                  },
                  xaxis: {
                    categories: ["10:00", "11:00", "12:00"],
                    title: { 
                      text: "시간", 
                      style: { fontSize: "11px", fontWeight: 600 } 
                    },
                  },
                  yaxis: {
                    title: { 
                      text: "쿼리 수", 
                      style: { fontSize: "11px", fontWeight: 600 } 
                    },
                  },
                  grid: { borderColor: "var(--border)", strokeDashArray: 4 },
                  tooltip: {
                    enabled: true,
                    y: {
                      formatter: (val: number) => `${val.toFixed(1)} 쿼리`
                    }
                  }
                }}
              />
            </div>
          </section>

          <section className="es-chart-card">
            <h4 className="es-chart-title">쿼리 타입별 분포</h4>
            <div className="es-chart-body">
              <Chart
                type="pie"
                series={queryTypeSeries}
                categories={chartData.queryTypeDistribution.labels}
                height="100%"
                showLegend={true}
                showToolbar={false}
                showDonutTotal={false}
                colors={[
                  "var(--color-normal)",
                  "var(--color-danger)",
                  "var(--color-success)",
                  "var(--color-warn)",
                ]}
                customOptions={{
                  chart: {
                    animations: { enabled: false },
                    redrawOnParentResize: true,
                    redrawOnWindowResize: true,
                  },
                  legend: { position: "right", fontSize: "11px", fontWeight: 600 },
                  dataLabels: {
                    enabled: true,
                    formatter: (_: number, opts: any) => {
                      const series = opts?.w?.config?.series || [];
                      const total = series.reduce((s: number, n: number) => s + (n || 0), 0) || 1;
                      const v = series[opts.seriesIndex] || 0;
                      const pct = Math.round((v / total) * 100);
                      return `${pct}%`;
                    },
                    style: { fontSize: "11px", fontWeight: 700 },
                    dropShadow: { enabled: false },
                  },
                  stroke: { width: 0 },
                  tooltip: {
                    enabled: false
                  },
                }}
              />
            </div>
          </section>
        </aside>
      </div>

      {/* Query 상세 모달 */}
      {selectedQueryDetail && (
        <QueryModal
          open={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedQueryDetail(null);
          }}
          detail={selectedQueryDetail}
        />
      )}
    </div>
  );
}