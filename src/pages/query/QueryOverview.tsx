import { useState, useMemo, useEffect } from "react";
import Chart from "../../components/chart/ChartComponent";
import "/src/styles/query/query-overview.css";

/**
 * 쿼리 오버뷰 대시보드
 * - 실시간 쿼리 모니터링 및 시스템 리소스 현황
 * 
 * @author 이해든
 */

/* ---------- 타입 ---------- */
type MetricData = {
  label: string;
  value: string | number;
  status?: "normal" | "warning" | "critical";
  icon?: string;
  tooltip?: Record<string, string | number>;
};

type SlowQuery = {
  text: string;
  timestamp: string;
  executionTime: string;
};

/* ---------- 데모 데이터 ---------- */
const demoMetrics: MetricData[] = [
  {
    label: "현재 TPS",
    value: "1,250",
    status: "normal",
    icon: "",
    tooltip: { 
      "이전 대비": "+8.5%", 
      "최대 TPS (1h)": "1,420", 
      "최소 TPS (1h)": "980",
      "총 실행 횟수": "45,230"
    },
  },
  {
    label: "현재 QPS",
    value: "5,500",
    status: "warning",
    icon: "⚠️",
    tooltip: { 
      "SELECT": "2,890 (75%)",
      "INSERT": "520 (14%)",
      "UPDATE": "310 (8%)",
      "DELETE": "120 (3%)"
    },
  },
  {
    label: "활성 세션 수",
    value: 185,
    status: "critical",
    icon: "⚠️",
    tooltip: { 
      "실행 중 (active)": "25",
      "대기 중 (idle)": "55",
      "I/O 블록 수": "18",
      "최대 연결 수": "200"
    },
  },
  {
    label: "평균 응답 시간",
    value: "12ms",
    status: "normal",
    icon: "",
    tooltip: { 
      "이전 대비": "+15.3ms",
      "최대 응답시간": "125ms",
      "최소 응답시간": "8ms",
      "슬로우 쿼리 기준": ">100ms"
    },
  },
];

const demoSlowQueries: SlowQuery[] = [
  {
    text: "SELECT * FROM orders o JOIN customers c ON c.cust_id = c.id WHERE o.created_at > NOW() - INTERVAL '30 days';",
    timestamp: "14:20:15",
    executionTime: "4.2s",
  },
  {
    text: "SELECT * FROM users WHERE active = TRUE;",
    timestamp: "14:21:20",
    executionTime: "3.1s",
  },
  {
    text: "SELECT * FROM payments;",
    timestamp: "14:22:45",
    executionTime: "2.9s",
  },
  {
    text: "SELECT * FROM inventory;",
    timestamp: "14:23:10",
    executionTime: "2.1s",
  },
  {
    text: "SELECT * FROM logs WHERE date > NOW() - INTERVAL '1 day';",
    timestamp: "14:23:50",
    executionTime: "1.8s",
  },
];

/* ---------- 메인 페이지 ---------- */
export default function QueryOverview() {
  const [hoveredMetric, setHoveredMetric] = useState<number | null>(null);
  const [isResourceMounted, setIsResourceMounted] = useState(false);
  const [resourceUsage, setResourceUsage] = useState({
    cpu: 42,
    memory: 87,
    disk: 67,
  });

  // TPS/QPS 차트 시리즈
  const trendChartSeries = useMemo(
    () => [
      { name: "TPS", data: [4200, 3838, 4150, 3988, 4175, 4250, 3963, 3838, 4200, 4263, 4175, 3650] },
      { name: "QPS", data: [1250, 1213, 1338, 1275, 1250, 1288, 1325, 1263, 1300, 1325, 1288, 1238] },
    ],
    []
  );

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
    // CSV 내보내기 로직
  };

  return (
    <div className="qo-root">
      {/* 메트릭 카드 */}
      <section className="qo-metrics">
        {demoMetrics.map((metric, index) => (
          <div
            key={index}
            className={`qo-metric-card ${metric.status || ""}`}
            onMouseEnter={() => setHoveredMetric(index)}
            onMouseLeave={() => setHoveredMetric(null)}
          >
            <div className="qo-metric-label">
              {metric.icon && <span className="qo-metric-icon">{metric.icon}</span>}
              {metric.label}
            </div>
            <div className="qo-metric-value">{metric.value}</div>

            {hoveredMetric === index && metric.tooltip && (
              <div className="qo-tooltip">
                {Object.entries(metric.tooltip).map(([key, value]) => {
                  // 경고 색상이 필요한 항목들
                  const isWarning = 
                    (key === "I/O 블록 수") || 
                    (key === "최대 응답시간");
                  
                  return (
                    <div key={key} className="qo-tooltip-row">
                      <span className="qo-tooltip-key">{key}</span>
                      <span className={`qo-tooltip-value ${isWarning ? "critical" : ""}`}>
                        {value}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </section>

      {/* TPS/QPS 실시간 그래프 */}
      <section className="qo-card">
        <div className="qo-card__header">
          <h3>TPS/QPS 실시간 그래프</h3>
          <div className="qo-legend">
            <div className="qo-legend-item">
              <span className="qo-legend-dot" style={{ background: "#6366F1" }}></span>
              TPS
            </div>
            <div className="qo-legend-item">
              <span className="qo-legend-dot" style={{ background: "#FBBF24" }}></span>
              QPS
            </div>
          </div>
        </div>
        <Chart
          type="line"
          series={trendChartSeries}
          categories={["0:00", "1:00", "2:00", "3:00", "4:00", "5:00", "6:00", "7:00", "8:00", "9:00", "10:00", "11:00"]}
          colors={["#6366F1", "#FBBF24"]}
          height={320}
          showLegend={false}
          showToolbar={false}
        />
      </section>

      {/* 하단 그리드 */}
      <div className="qo-grid">
        {/* 슬로우 쿼리 TOP 5 */}
        <section className="qo-card">
          <div className="qo-card__header">
            <div className="qo-card__title">
              <span className="qo-icon">⚠️</span>
              슬로우 쿼리 TOP 5
            </div>
            <button className="qo-csv-btn" onClick={handleExport}>
              <span className="qo-csv-icon">📥</span>
              CSV 내보내기
            </button>
          </div>
          <div className="qo-query-list">
            {demoSlowQueries.map((query, index) => (
              <div key={index} className="qo-query-item">
                <div className="qo-query-content">
                  <div className="qo-query-text">{query.text}</div>
                  <div className="qo-query-timestamp">{query.timestamp}</div>
                </div>
                <div className="qo-query-time">{query.executionTime}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 리소스 사용률 */}
        <section className="qo-card">
          <div className="qo-card__header">
            <div className="qo-card__title">
              <span className="qo-icon">💾</span>
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
                    backgroundColor: "#6366F1" 
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
                    backgroundColor: "#EF4444" 
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
                    backgroundColor: "#FBBF24" 
                  }}
                ></div>
              </div>
              <div className="qo-resource-value">{Math.round(resourceUsage.disk)}%</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}