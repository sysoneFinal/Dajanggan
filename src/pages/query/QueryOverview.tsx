import { useState, useMemo, useEffect } from "react";
import Chart from "../../components/chart/ChartComponent";
import Pagination from "../../components/util/Pagination";
import CsvButton from "../../components/util/CsvButton";
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
  status?: "normal" | "warn" | "danger";
  diff: number;
  desc: string;
};

type SlowQuery = {
  text: string;
  timestamp: string;
  executionTime: string;
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

/* ---------- 트렌드 아이콘 SVG ---------- */
const TrendUpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 12V4M8 4L4 8M8 4L12 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const TrendDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 4V12M8 12L12 8M8 12L4 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

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
    status: "normal",
    diff: 8.5,
    desc: "이전 대비"
  },
  {
    label: "현재 QPS",
    value: "5,500",
    status: "warn",
    diff: 12.3,
    desc: "이전 대비"
  },
  {
    label: "활성 세션 수",
    value: 185,
    status: "danger",
    diff: -5.2,
    desc: "이전 대비"
  },
  {
    label: "평균 응답 시간",
    value: "12ms",
    status: "normal",
    diff: 2.1,
    desc: "이전 대비"
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
  const [currentSlowPage, setCurrentSlowPage] = useState(1);
  const [currentFullSlowPage, setCurrentFullSlowPage] = useState(1);
  const slowItemsPerPage = 5;
  const fullSlowItemsPerPage = 5;

  // TPS/QPS 차트 시리즈
  const trendChartSeries = useMemo(
    () => [
      { name: "TPS", data: [4200, 3838, 4150, 3988, 4175, 4250, 3963, 3838, 4200, 4263, 4175, 3650] },
      { name: "QPS", data: [1250, 1213, 1338, 1275, 1250, 1288, 1325, 1263, 1300, 1325, 1288, 1238] },
    ],
    []
  );

  // 리소스별 Top Query 목록 (최대 5개)
  const topQueries = useMemo(() => demoTopQueries[resourceType].slice(0, 5), [resourceType]);

  // 슬로우 쿼리 정렬
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

  // TOP 5 슬로우 쿼리 페이지네이션
  const totalSlowPages = Math.ceil(sortedSlowQueries.length / slowItemsPerPage);
  const currentSlowQueries = sortedSlowQueries.slice(
    (currentSlowPage - 1) * slowItemsPerPage,
    currentSlowPage * slowItemsPerPage
  );

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

  const handleExport = () => {
    console.log("Exporting slow queries...");
  };

  const handleQueryClick = (query: TopQueryItem) => {
    console.log("Query clicked:", query);
  };

  return (
    <div className="qo-root">
      {/* 메트릭 카드 */}
      <section className="qo-metrics">
        {demoMetrics.map((card, idx) => {
          const isUp = card.diff > 0;
          const isDown = card.diff < 0;
          const trendClass = isUp ? "up" : isDown ? "down" : "flat";
          const statusClass = card.status && card.status !== "normal" ? `status-${card.status}` : "";

          return (
            <div key={idx} className={`qo-metric-card ${statusClass}`}>
              <p className="qo-metric-label">{card.label}</p>
              <h2 className="qo-metric-value">{card.value}</h2>

              <div className="qo-summary-bottom">
                <div className={`qo-trend ${trendClass}`}>
                  {isUp ? (
                    <TrendUpIcon />
                  ) : isDown ? (
                    <TrendDownIcon />
                  ) : (
                    <span className="qo-trend-dash">–</span>
                  )}
                  <span className="qo-trend-value">{isUp ? `+${card.diff}` : card.diff}</span>
                </div>
                <span className="qo-desc">{card.desc}</span>
              </div>
            </div>
          );
        })}
      </section>

      {/* TPS/QPS 그래프 + 리소스 사용률 */}
      <div className="qo-grid-2col">
        <section className="qo-card">
          <div className="qo-card__header">
            <div className="qo-card__title">TPS/QPS 실시간 그래프</div>
            <div className="qo-legend">
              <div className="qo-legend-item">
                <span className="qo-legend-dot" style={{ background: "#7B61FF" }}></span>
                TPS
              </div>
              <div className="qo-legend-item">
                <span className="qo-legend-dot" style={{ background: "#FF928A" }}></span>
                QPS
              </div>
            </div>
          </div>
          <Chart
            type="area"
            series={trendChartSeries}
            categories={["0:00", "1:00", "2:00", "3:00", "4:00", "5:00", "6:00", "7:00", "8:00", "9:00", "10:00", "11:00"]}
            colors={["#7B61FF", "#FF928A"]}
            height={280}
            showLegend={false}
            showToolbar={false}
            customOptions={{
              chart: { 
                redrawOnParentResize: true, 
                redrawOnWindowResize: true 
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
            }}
          />
        </section>

        <section className="qo-card qo-card-resource">
          <div className="qo-card__header">
            <div className="qo-card__title">
              리소스 사용률
            </div>
          </div>
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
        </section>
      </div>

      {/* Top-N 쿼리 + 슬로우 쿼리 (3컬럼) */}
      <div className="qo-grid-3col">
        <section className="qo-card qo-card-fixed-height">
          <div className="qo-card__header">
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
                <div key={`${resourceType}-${query.id}-${index}`} className="qo-query-item-wrapper">
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
                    <div 
                      className="qo-query-arrow"
                      onClick={() => handleQueryClick(query)}
                    >
                      <ChevronRightIcon />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="qo-card qo-card-slow-top5">
          <div className="qo-card__header">
            <div className="qo-card__title">
              슬로우 쿼리 TOP 5
            </div>
            <CsvButton onClick={handleExport} />
          </div>
          <div className="qo-query-list-wrapper">
            <div className="qo-query-list">
              {currentSlowQueries.map((query, index) => (
                <div key={index} className="qo-query-item">
                  <div className="qo-query-content">
                    <div className="qo-query-text">{query.query}</div>
                    <div className="qo-query-timestamp">{query.occurredAt}</div>
                  </div>
                  <div className="qo-query-time">{query.executionTime}</div>
                </div>
              ))}
            </div>
            <div className="qo-pagination-wrapper">
              <Pagination
                currentPage={currentSlowPage}
                totalPages={totalSlowPages}
                onPageChange={(page: number) => setCurrentSlowPage(page)}
              />
            </div>
          </div>
        </section>

        {/* 슬로우 쿼리 리스트 (간소화) */}
        <section className="qo-card qo-card-slow-list">
          <div className="qo-card__header">
            <div className="qo-card__title">
              슬로우 쿼리
            </div>
            <CsvButton onClick={handleExport} />
          </div>

          <div className="qo-sort-options">
            <SortButton
              active={sortOption === "최근 발생순"}
              label="최근 발생순"
              onClick={() => setSortOption("최근 발생순")}
            />
            <SortButton
              active={sortOption === "실행시간 느린순"}
              label="실행시간 느린순"
              onClick={() => setSortOption("실행시간 느린순")}
            />
            <SortButton
              active={sortOption === "실행시간 빠른순"}
              label="실행시간 빠른순"
              onClick={() => setSortOption("실행시간 빠른순")}
            />
          </div>

          <div className="qo-slow-list-wrapper">
            <div className="qo-slow-list-compact">
              {currentFullSlowQueries.map((slowQuery) => (
                <div key={slowQuery.id} className="qo-slow-card">
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
                  <div className="qo-slow-card-suggestion">
                    {slowQuery.suggestion}
                  </div>
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
            <div className="qo-pagination-wrapper">
              <Pagination
                currentPage={currentFullSlowPage}
                totalPages={totalFullSlowPages}
                onPageChange={(page: number) => setCurrentFullSlowPage(page)}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}