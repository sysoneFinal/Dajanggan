import { useState, useMemo, useEffect } from "react";
import Chart from "../../components/chart/ChartComponent";
import Pagination from "../../components/util/Pagination";
import CsvButton from "../../components/util/CsvButton";
import SummaryCard from "../../components/util/SummaryCard";
import ChartGridLayout from "../../components/layout/ChartGridLayout";
import WidgetCard from "../../components/util/WidgetCard";
import QueryModal from "../query/QueryModal";
import type { QueryDetail } from "../query/QueryModal";
import "/src/styles/query/query-overview.css";

/**
 * 쿼리 오버뷰 통합 대시보드
 * - 실시간 쿼리 모니터링 및 시스템 리소스 현황
 * - Top-N 쿼리 및 슬로우 쿼리 모니터링
 * 
 * @author 이해든
 */

/* ---------- 타입 ---------- */
type MetricData = {
  label: string;
  value: string | number;
  status?: "info" | "warning" | "critical";
  diff: number;
  desc: string;
};

type ResourceType = "메모리" | "CPU" | "I/O" | "실행시간";

type TopQueryItem = {
  rank: number;
  id: string;
  value: number;
  unit: string;
  query: string;
  callCount: number;
  avgTime: string;
  detail?: string;
};

type SlowQueryItem = {
  id: string;
  query: string;
  fullQuery: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  suggestion: string;
  executionTime: string;
  occurredAt: string;
};

type SortOption = "최근 발생순" | "실행시간 느린순" | "실행시간 빠른순";

/* ---------- 아이콘 SVG ---------- */
const ChevronRightIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 4L13 10L7 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ---------- 데모 데이터 ---------- */
const demoMetrics: MetricData[] = [
  {
    label: "현재 TPS",
    value: "1,250",
    status: "info",
    diff: 8.5,
    desc: "최근 5분 평균 기준"
  },
  {
    label: "현재 QPS",
    value: "5,500",
    status: "warning",
    diff: 12.3,
    desc: "최근 5분 평균 기준"
  },
  {
    label: "활성 세션 수",
    value: 185,
    status: "critical",
    diff: -5.2,
    desc: "최근 5분 평균 기준"
  },
  {
    label: "평균 응답 시간",
    value: "12ms",
    status: "info",
    diff: 2.1,
    desc: "최근 5분 평균 기준"
  },
];

const demoTopQueries: Record<ResourceType, TopQueryItem[]> = {
  메모리: [
    { rank: 1, id: "#5678", value: 850, unit: "MB", query: "(SELECT on Users)", callCount: 234, avgTime: "125ms" },
    { rank: 2, id: "#9012", value: 620, unit: "MB", query: "(Insert on Orders)", callCount: 156, avgTime: "98ms" },
    { rank: 3, id: "#3456", value: 480, unit: "MB", query: "(SELECT on Customers)", callCount: 892, avgTime: "45ms" },
    { rank: 4, id: "#4567", value: 410, unit: "MB", query: "(UPDATE inventory)", callCount: 523, avgTime: "78ms" },
    { rank: 5, id: "#2345", value: 350, unit: "MB", query: "(DELETE temp_data)", callCount: 67, avgTime: "156ms" },
  ],
  CPU: [
    { rank: 1, id: "#5678", value: 89, unit: "%", query: "(SELECT on Users)", callCount: 456, avgTime: "234ms" },
    { rank: 2, id: "#1234", value: 76, unit: "%", query: "(UPDATE inventory)", callCount: 234, avgTime: "189ms" },
    { rank: 3, id: "#9012", value: 68, unit: "%", query: "(DELETE sessions)", callCount: 123, avgTime: "345ms" },
    { rank: 4, id: "#3456", value: 54, unit: "%", query: "(SELECT COUNT users)", callCount: 789, avgTime: "123ms" },
    { rank: 5, id: "#2468", value: 47, unit: "%", query: "(INSERT logs)", callCount: 2345, avgTime: "45ms" },
  ],
  "I/O": [
    { rank: 1, id: "#9012", value: 1250, unit: "MB/s", query: "(SELECT logs)", callCount: 1234, avgTime: "234ms" },
    { rank: 2, id: "#1234", value: 980, unit: "MB/s", query: "(INSERT events)", callCount: 3456, avgTime: "56ms" },
    { rank: 3, id: "#5678", value: 875, unit: "MB/s", query: "(UPDATE analytics)", callCount: 567, avgTime: "178ms" },
    { rank: 4, id: "#3456", value: 723, unit: "MB/s", query: "(SELECT orders)", callCount: 789, avgTime: "145ms" },
    { rank: 5, id: "#8901", value: 654, unit: "MB/s", query: "(DELETE temp_files)", callCount: 123, avgTime: "456ms" },
  ],
  실행시간: [
    { rank: 1, id: "#6789", value: 4.2, unit: "초", query: "(SELECT orders)", callCount: 45, avgTime: "4.2s" },
    { rank: 2, id: "#1234", value: 3.8, unit: "초", query: "(UPDATE inventory)", callCount: 23, avgTime: "3.8s" },
    { rank: 3, id: "#5678", value: 3.1, unit: "초", query: "(DELETE old_data)", callCount: 12, avgTime: "3.1s" },
    { rank: 4, id: "#9012", value: 2.9, unit: "초", query: "(SELECT users)", callCount: 67, avgTime: "2.9s" },
    { rank: 5, id: "#3456", value: 2.5, unit: "초", query: "(INSERT analytics)", callCount: 89, avgTime: "2.5s" },
  ],
};

const demoSlowQueries: SlowQueryItem[] = [
  {
    id: "#1",
    query: "SELECT * FROM orders WHERE...",
    fullQuery: "SELECT * FROM orders WHERE created_at > NOW() - INTERVAL '30 days' ORDER BY created_at DESC;",
    severity: "HIGH",
    suggestion: "인덱스 최적화가 필요합니다",
    executionTime: "4.2초",
    occurredAt: "2분 전",
  },
  {
    id: "#2",
    query: "UPDATE inventory SET...",
    fullQuery: "UPDATE inventory SET stock = stock - 1 WHERE product_id = ? AND stock > 0;",
    severity: "MEDIUM",
    suggestion: "인덱스 최적화가 필요합니다",
    executionTime: "1.8초",
    occurredAt: "4분 전",
  },
  {
    id: "#3",
    query: "DELETE FROM temp_data",
    fullQuery: "DELETE FROM temp_data WHERE created_at < NOW() - INTERVAL '7 days';",
    severity: "LOW",
    suggestion: "대량 삭제 작업으로 시간이 소요됩니다",
    executionTime: "1.2초",
    occurredAt: "8분 전",
  },
  {
    id: "#4",
    query: "SELECT * FROM users WHERE...",
    fullQuery: "SELECT * FROM users WHERE active = TRUE AND last_login < NOW() - INTERVAL '90 days';",
    severity: "MEDIUM",
    suggestion: "WHERE 조건 최적화 필요",
    executionTime: "2.1초",
    occurredAt: "12분 전",
  },
  {
    id: "#5",
    query: "INSERT INTO logs SELECT...",
    fullQuery: "INSERT INTO logs SELECT * FROM staging_logs WHERE processed = FALSE;",
    severity: "HIGH",
    suggestion: "배치 처리 크기 조정 필요",
    executionTime: "3.5초",
    occurredAt: "15분 전",
  },
  {
    id: "#6",
    query: "SELECT * FROM products WHERE...",
    fullQuery: "SELECT * FROM products WHERE stock < 10 AND active = TRUE;",
    severity: "LOW",
    suggestion: "인덱스 추가 권장",
    executionTime: "0.9초",
    occurredAt: "18분 전",
  },
  {
    id: "#7",
    query: "UPDATE users SET...",
    fullQuery: "UPDATE users SET last_login = NOW() WHERE id = ?;",
    severity: "LOW",
    suggestion: "최적화 불필요",
    executionTime: "0.5초",
    occurredAt: "20분 전",
  },
];

/* ---------- 작은 컴포넌트 ---------- */
function ResourceTab({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: ResourceType;
  onClick: () => void;
}) {
  return (
    <button
      className={`qo-tab ${active ? "qo-tab--active" : ""}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function SortButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: SortOption;
  onClick: () => void;
}) {
  return (
    <button
      className={`qo-sort-btn ${active ? "qo-sort-btn--active" : ""}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

/* ---------- 메인 페이지 ---------- */
export default function QueryOverview() {
  const [isResourceMounted, setIsResourceMounted] = useState(false);
  const [resourceUsage, setResourceUsage] = useState({
    cpu: 42,
    memory: 87,
    disk: 67,
  });
  const [resourceType, setResourceType] = useState<ResourceType>("메모리");
  const [sortOption, setSortOption] = useState<SortOption>("최근 발생순");
  const [currentFullSlowPage, setCurrentFullSlowPage] = useState(1);
  const fullSlowItemsPerPage = 5;

  // 모달 상태 관리
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedQueryDetail, setSelectedQueryDetail] = useState<QueryDetail | null>(null);

  // 현재 시간 기준 카테고리 생성 (5분 단위, 12개 = 1시간)
  const generateTimeCategories = () => {
  const now = new Date();
  
  // 현재 시간을 5분 단위로 내림
  const currentMinutes = now.getMinutes();
  const roundedMinutes = Math.floor(currentMinutes / 5) * 5;
  
  const baseTime = new Date(now);
  baseTime.setMinutes(roundedMinutes);
  baseTime.setSeconds(0);
  baseTime.setMilliseconds(0);
  
  const categories: string[] = [];
  
  // 11개 과거 시간 + 1개 현재 시간 = 총 12개
  for (let i = 11; i >= 0; i--) {
    const time = new Date(baseTime.getTime() - i * 5 * 60 * 1000);
    const hours = time.getHours().toString().padStart(2, '0');
    const minutes = time.getMinutes().toString().padStart(2, '0');
    categories.push(`${hours}:${minutes}`);
  }
  
  return categories;
};

  const [timeCategories, setTimeCategories] = useState(generateTimeCategories());

  // 실시간 차트 데이터 상태
  const [tpsQpsData, setTpsQpsData] = useState({
    tps: [4200, 3838, 4150, 3988, 4175, 4250, 3963, 3838, 4200, 4263, 4175, 3650],
    qps: [1250, 1213, 1338, 1275, 1250, 1288, 1325, 1263, 1300, 1325, 1288, 1238],
  });

  // TPS/QPS 차트 시리즈
  const trendChartSeries = useMemo(
    () => [
      { name: "TPS", data: tpsQpsData.tps },
      { name: "QPS", data: tpsQpsData.qps },
    ],
    [tpsQpsData]
  );

  // 리소스별 Top Query 목록 (최대 5개)
  const topQueries = useMemo(() => demoTopQueries[resourceType].slice(0, 5), [resourceType]);

  // 슬로우 쿼리 TOP 5 (정렬 없이 항상 상위 5개)
  const topFiveSlowQueries = useMemo(() => demoSlowQueries.slice(0, 5), []);

  // 슬로우 쿼리 리스트 정렬 (독립적으로 관리)
  const sortedSlowQueries = useMemo(() => {
    const queries = [...demoSlowQueries];
    
    if (sortOption === "실행시간 느린순") {
      return queries.sort((a, b) => {
        const aTime = parseFloat(a.executionTime);
        const bTime = parseFloat(b.executionTime);
        return bTime - aTime;
      });
    } else if (sortOption === "실행시간 빠른순") {
      return queries.sort((a, b) => {
        const aTime = parseFloat(a.executionTime);
        const bTime = parseFloat(b.executionTime);
        return aTime - bTime;
      });
    }
    
    return queries;
  }, [sortOption]);

  // 전체 슬로우 쿼리 페이지네이션
  const totalFullSlowPages = Math.ceil(sortedSlowQueries.length / fullSlowItemsPerPage);
  const currentFullSlowQueries = sortedSlowQueries.slice(
    (currentFullSlowPage - 1) * fullSlowItemsPerPage,
    currentFullSlowPage * fullSlowItemsPerPage
  );

  // Severity 색상
  const getSeverityColor = (severity: "HIGH" | "MEDIUM" | "LOW") => {
    switch (severity) {
      case "HIGH":
        return "#FF928A";
      case "MEDIUM":
        return "#FFD66B";
      case "LOW":
        return "#51DAA8";
      default:
        return "#6B7280";
    }
  };

  // 리소스 사용률에 따른 상태 색상
  const getResourceStatusColor = (value: number) => {
    if (value >= 80) return "#FF928A"; // danger
    if (value >= 60) return "#FFD66B"; // warn
    return "#7B61FF"; // normal
  };

  // 리소스 바 초기 애니메이션
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsResourceMounted(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // 리소스 사용률 실시간 업데이트
  useEffect(() => {
    const interval = setInterval(() => {
      setResourceUsage((prev) => ({
        cpu: Math.max(35, Math.min(50, prev.cpu + (Math.random() - 0.5) * 3)),
        memory: Math.max(82, Math.min(92, prev.memory + (Math.random() - 0.5) * 2)),
        disk: Math.max(60, Math.min(75, prev.disk + (Math.random() - 0.5) * 2.5)),
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // TPS/QPS 데이터 실시간 업데이트 (5분마다)
  useEffect(() => {
    const interval = setInterval(() => {
      setTpsQpsData((prev) => {
        // 새로운 데이터 생성
        const newTps = Math.floor(3800 + Math.random() * 600); // 3800-4400 범위
        const newQps = Math.floor(1200 + Math.random() * 200); // 1200-1400 범위
        
        // 기존 데이터에서 첫 번째 제거하고 새 데이터 추가 (왼쪽으로 밀림)
        return {
          tps: [...prev.tps.slice(1), newTps],
          qps: [...prev.qps.slice(1), newQps],
        };
      });

      // 시간 카테고리도 업데이트
      setTimeCategories(generateTimeCategories());
    }, 5 * 60 * 1000); // 5분마다 실행

    return () => clearInterval(interval);
  }, []);

  const handleExport = () => {
    console.log("Exporting slow queries...");
  };

  // Top Query 클릭 핸들러
  const handleTopQueryClick = (query: TopQueryItem) => {
    const isModifyingQuery = query.query.includes("UPDATE") || 
                            query.query.includes("INSERT") || 
                            query.query.includes("DELETE");

    const detail: QueryDetail = {
      queryId: `Query ${query.id}`,
      status: isModifyingQuery ? "안전 모드" : "실제 실행",
      avgExecutionTime: query.avgTime,
      totalCalls: query.callCount,
      memoryUsage: `${query.value}${query.unit}`,
      ioUsage: "890 blocks",
      cpuUsagePercent: 80,
      sqlQuery: query.query.replace(/[()]/g, ""),
      suggestion: {
        priority: "필수",
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
        avg: "125ms",
        max: "312ms",
        stdDev: "38ms",
        totalTime: "29.2s"
      },
      isModifyingQuery
    };

    setSelectedQueryDetail(detail);
    setIsModalOpen(true);
  };

  // Slow Query 클릭 핸들러
  const handleSlowQueryClick = (slowQuery: SlowQueryItem) => {
    const isModifyingQuery = slowQuery.fullQuery.includes("UPDATE") || 
                            slowQuery.fullQuery.includes("INSERT") || 
                            slowQuery.fullQuery.includes("DELETE");

    const detail: QueryDetail = {
      queryId: `Query ${slowQuery.id}`,
      status: isModifyingQuery ? "안전 모드" : "실제 실행",
      avgExecutionTime: slowQuery.executionTime,
      totalCalls: 1,
      memoryUsage: "450MB",
      ioUsage: "890 blocks",
      cpuUsagePercent: 80,
      sqlQuery: slowQuery.fullQuery,
      suggestion: {
        priority: slowQuery.severity === "HIGH" ? "필수" : "권장",
        description: slowQuery.suggestion,
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
        avg: "125ms",
        max: slowQuery.executionTime,
        stdDev: "38ms",
        totalTime: "29.2s"
      },
      isModifyingQuery
    };

    setSelectedQueryDetail(detail);
    setIsModalOpen(true);
  };

  return (
    <div className="qo-root">
      {/* 메트릭 카드 - SummaryCard 컴포넌트 사용 */}
      <section className="qo-metrics">
        {demoMetrics.map((card, idx) => (
          <SummaryCard
            key={idx}
            label={card.label}
            value={card.value}
            diff={card.diff}
            desc={card.desc}
            status={card.status}
          />
        ))}
      </section>

      {/* TPS/QPS 그래프 + 리소스 사용률 - ChartGridLayout 사용 */}
      <ChartGridLayout>
        <WidgetCard title="TPS/QPS 실시간 그래프" span={9} height={350}>
          <div style={{ width: '100%', height: '100%', paddingBottom: '1rem' }}>
            <div className="qo-legend" style={{ marginBottom: '0.75rem', justifyContent: 'flex-end' }}>
              <div className="qo-legend-item">
                <span className="qo-legend-dot" style={{ background: "#7B61FF" }}></span>
                TPS
              </div>
              <div className="qo-legend-item">
                <span className="qo-legend-dot" style={{ background: "#FF928A" }}></span>
                QPS
              </div>
            </div>
            <Chart
              type="area"
              series={trendChartSeries}
              categories={timeCategories}
              colors={["#7B61FF", "#FF928A"]}
              height={260}
              showLegend={false}
              showToolbar={false}
              customOptions={{
                chart: { 
                  redrawOnParentResize: true, 
                  redrawOnWindowResize: true,
                  offsetX: 0,
                  offsetY: 0,
                  animations: {
                    enabled: true,
                    easing: 'linear',
                    dynamicAnimation: {
                      enabled: true,
                      speed: 1000
                    }
                  }
                },
                stroke: {
                  curve: "smooth",
                  width: 2,
                },
                fill: {
                  type: "gradient",
                  gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.7,
                    opacityTo: 0.2,
                    stops: [0, 90, 100],
                  },
                },
                dataLabels: { enabled: false },
                xaxis: {
                  type: 'category',
                  categories: timeCategories,
                  labels: {
                    show: true,
                    style: {
                      fontSize: '11px',
                    },
                    offsetY: 0,
                  },
                  axisBorder: {
                    show: true,
                  },
                  axisTicks: {
                    show: true,
                  },
                },
                yaxis: {
                  labels: {
                    style: {
                      fontSize: '11px',
                    },
                  },
                },
                grid: {
                  padding: {
                    left: 10,
                    right: 20,
                    bottom: 10,
                  },
                },
              }}
            />
          </div>
        </WidgetCard>

        <WidgetCard title="리소스 사용률" span={3} height={350}>
          <div className="qo-resource-wrapper">
            <div className="qo-resource-item">
              <div className="qo-resource-label">CPU</div>
              <div className="qo-resource-bar-container">
                <div 
                  className="qo-resource-bar" 
                  style={{ 
                    width: isResourceMounted ? `${resourceUsage.cpu}%` : '0%', 
                    backgroundColor: getResourceStatusColor(resourceUsage.cpu)
                  }}
                ></div>
              </div>
              <div className="qo-resource-value">{Math.round(resourceUsage.cpu)}%</div>
            </div>
            <div className="qo-resource-item">
              <div className="qo-resource-label">Memory</div>
              <div className="qo-resource-bar-container">
                <div 
                  className="qo-resource-bar" 
                  style={{ 
                    width: isResourceMounted ? `${resourceUsage.memory}%` : '0%', 
                    backgroundColor: getResourceStatusColor(resourceUsage.memory)
                  }}
                ></div>
              </div>
              <div className="qo-resource-value">{Math.round(resourceUsage.memory)}%</div>
            </div>
            <div className="qo-resource-item">
              <div className="qo-resource-label">Disk I/O</div>
              <div className="qo-resource-bar-container">
                <div 
                  className="qo-resource-bar" 
                  style={{ 
                    width: isResourceMounted ? `${resourceUsage.disk}%` : '0%', 
                    backgroundColor: getResourceStatusColor(resourceUsage.disk)
                  }}
                ></div>
              </div>
              <div className="qo-resource-value">{Math.round(resourceUsage.disk)}%</div>
            </div>
          </div>
        </WidgetCard>
      </ChartGridLayout>

      {/* 하단 3개 카드 - 각각 독립 카드로 분리 */}
      <div className="qo-bottom-cards">
        {/* Top N 쿼리 카드 */}
        <div className="qo-top-query-card">
          <div className="qo-widget-header">
            <div className="qo-card__title">{resourceType} 사용량 Top 5</div>
            <div className="qo-tabs">
              <ResourceTab
                active={resourceType === "메모리"}
                label="메모리"
                onClick={() => setResourceType("메모리")}
              />
              <ResourceTab
                active={resourceType === "CPU"}
                label="CPU"
                onClick={() => setResourceType("CPU")}
              />
              <ResourceTab
                active={resourceType === "I/O"}
                label="I/O"
                onClick={() => setResourceType("I/O")}
              />
              <ResourceTab
                active={resourceType === "실행시간"}
                label="실행시간"
                onClick={() => setResourceType("실행시간")}
              />
            </div>
          </div>
          
          <h4 className="qo-section-title">
            아이콘을 클릭하면 SQL 상세 내용을 볼 수 있습니다.
          </h4>

          <div className="qo-query-bar-list">
            {topQueries.map((query, index) => {
              const maxValue = Math.max(...topQueries.map((q) => q.value));
              const barWidth = (query.value / maxValue) * 100;

              return (
                <div 
                  key={`${resourceType}-${query.id}-${index}`} 
                  className="qo-query-item-wrapper"
                  onClick={() => handleTopQueryClick(query)}
                >
                  <div className="qo-query-bar-item">
                    <div className="qo-query-id-info">
                      <div className="qo-query-id">{query.id}</div>
                      <div className="qo-query-desc">{query.query}</div>
                    </div>
                    <div className="qo-query-bar-container">
                      <div
                        className="qo-query-bar"
                        style={{
                          width: `${barWidth}%`,
                          animationDelay: `${index * 0.05}s`,
                        }}
                      >
                        <span className="qo-query-bar-label">
                          {query.value}{query.unit}
                        </span>
                      </div>
                    </div>
                    <div className="qo-query-arrow">
                      <ChevronRightIcon />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 슬로우 쿼리 TOP 5 카드 */}
        <div className="qo-slow-top5-card">
          <div className="qo-widget-header">
            <div className="qo-card__title">
              슬로우 쿼리 TOP 5
            </div>
            <CsvButton onClick={handleExport} />
          </div>
          <div className="qo-query-list-wrapper-top5">
            <div className="qo-query-list">
              {topFiveSlowQueries.map((query, index) => (
                <div 
                  key={index} 
                  className="qo-query-item"
                  onClick={() => handleSlowQueryClick(query)}
                >
                  <div className="qo-query-item-header">
                    <div className="qo-query-content">
                      <div className="qo-query-text">{query.query}</div>
                    </div>
                    <div className="qo-query-time">{query.executionTime}</div>
                  </div>
                  <div className="qo-query-timestamp">발생: {query.occurredAt}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 슬로우 쿼리 리스트 카드 */}
        <div className="qo-slow-list-card">
          <div className="qo-widget-header">
            <div className="qo-card__title">
              슬로우 쿼리
            </div>
            <div className="qo-header-right">
              <div className="qo-sort-options">
                <SortButton
                  active={sortOption === "최근 발생순"}
                  label="최근 발생순"
                  onClick={() => {
                    setSortOption("최근 발생순");
                    setCurrentFullSlowPage(1);
                  }}
                />
                <SortButton
                  active={sortOption === "실행시간 느린순"}
                  label="실행시간 느린순"
                  onClick={() => {
                    setSortOption("실행시간 느린순");
                    setCurrentFullSlowPage(1);
                  }}
                />
                <SortButton
                  active={sortOption === "실행시간 빠른순"}
                  label="실행시간 빠른순"
                  onClick={() => {
                    setSortOption("실행시간 빠른순");
                    setCurrentFullSlowPage(1);
                  }}
                />
              </div>
              <CsvButton onClick={handleExport} />
            </div>
          </div>

          <div className="qo-slow-list-wrapper-tall">
            <div className="qo-slow-list-content">
              {currentFullSlowQueries.map((slowQuery) => (
                <div 
                  key={slowQuery.id} 
                  className="qo-slow-card-fixed"
                  onClick={() => handleSlowQueryClick(slowQuery)}
                >
                  <div className="qo-slow-card-header">
                    <div className="qo-slow-card-left">
                      <div className="qo-slow-card-query">{slowQuery.query}</div>
                    </div>
                    <div
                      className="qo-slow-card-severity"
                      style={{
                        backgroundColor: getSeverityColor(slowQuery.severity),
                      }}
                    >
                      {slowQuery.severity}
                    </div>
                  </div>
                  <div className="qo-slow-card-suggestion">{slowQuery.suggestion}</div>
                  <div className="qo-slow-card-footer">
                    <span className="qo-slow-card-time">
                      실행: {slowQuery.executionTime}
                    </span>
                    <span className="qo-slow-card-occurred">
                      발생: {slowQuery.occurredAt}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {/* 페이지네이션 공통 컴포넌트 사용 */}
            <div className="qo-pagination-fixed">
              <Pagination
                currentPage={currentFullSlowPage}
                totalPages={totalFullSlowPages}
                onPageChange={(page: number) => setCurrentFullSlowPage(page)}
              />
            </div>
          </div>
        </div>
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