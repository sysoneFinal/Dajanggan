import { useState, useMemo } from "react";
import "/src/styles/layout/top-query.css";

/**
 * 리소스 사용량 기준 Top-N 쿼리 페이지
 * - 메모리/CPU/I/O/실행시간 기준 Top 쿼리 목록
 * - 슬로우 쿼리 모니터링
 * 
 * @author 이해든
 */

/* ---------- 타입 정의 ---------- */
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
  icon: string;
  query: string;
  fullQuery: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  suggestion: string;
  executionTime: string;
  occurredAt: string;
};

type SortOption = "최근 발생순" | "실행시간 느린순" | "실행시간 빠른순";

/* ---------- 데모 데이터 ---------- */
const demoTopQueries: Record<ResourceType, TopQueryItem[]> = {
  메모리: [
    { rank: 1, id: "#1234", value: 850, unit: "MB", query: "SELECT * FROM orders JOIN ...", callCount: 234, avgTime: "125ms", detail: "SELECT * FROM orders JOIN customers ON orders.customer_id = customers.id WHERE orders.created_at > NOW() - INTERVAL '30 days';" },
    { rank: 2, id: "#5678", value: 620, unit: "MB", query: "UPDATE inventory SET ...", callCount: 156, avgTime: "98ms", detail: "UPDATE inventory SET stock = stock - 1 WHERE product_id = ? AND stock > 0;" },
    { rank: 3, id: "#9012", value: 480, unit: "MB", query: "SELECT COUNT(*) FROM logs ...", callCount: 892, avgTime: "45ms", detail: "SELECT COUNT(*) FROM logs WHERE timestamp > NOW() - INTERVAL '1 hour';" },
    { rank: 4, id: "#3456", value: 410, unit: "MB", query: "INSERT INTO analytics ...", callCount: 523, avgTime: "78ms", detail: "INSERT INTO analytics (user_id, event_type, data) VALUES (?, ?, ?);" },
    { rank: 5, id: "#7890", value: 380, unit: "MB", query: "DELETE FROM temp_data ...", callCount: 67, avgTime: "156ms", detail: "DELETE FROM temp_data WHERE created_at < NOW() - INTERVAL '7 days';" },
    { rank: 6, id: "#2345", value: 350, unit: "MB", query: "SELECT * FROM users WHERE ...", callCount: 445, avgTime: "67ms", detail: "SELECT * FROM users WHERE active = TRUE AND last_login > NOW() - INTERVAL '30 days';" },
    { rank: 7, id: "#6789", value: 320, unit: "MB", query: "UPDATE orders SET status ...", callCount: 234, avgTime: "112ms", detail: "UPDATE orders SET status = 'shipped' WHERE id IN (SELECT order_id FROM shipments WHERE date = CURRENT_DATE);" },
    { rank: 8, id: "#1111", value: 290, unit: "MB", query: "SELECT AVG(price) FROM ...", callCount: 678, avgTime: "89ms", detail: "SELECT AVG(price) FROM products WHERE category = ? AND stock > 0;" },
    { rank: 9, id: "#2222", value: 270, unit: "MB", query: "INSERT INTO logs ...", callCount: 1234, avgTime: "23ms", detail: "INSERT INTO logs (level, message, timestamp) VALUES (?, ?, NOW());" },
    { rank: 10, id: "#3333", value: 250, unit: "MB", query: "SELECT * FROM payments ...", callCount: 345, avgTime: "145ms", detail: "SELECT * FROM payments WHERE status = 'pending' AND created_at < NOW() - INTERVAL '1 hour';" },
  ],
  CPU: [
    { rank: 1, id: "#5678", value: 89, unit: "%", query: "SELECT * FROM orders JOIN ...", callCount: 456, avgTime: "234ms", detail: "SELECT * FROM orders JOIN customers ON orders.customer_id = customers.id WHERE orders.status = 'processing';" },
    { rank: 2, id: "#1234", value: 76, unit: "%", query: "UPDATE inventory SET ...", callCount: 234, avgTime: "189ms", detail: "UPDATE inventory SET stock = stock - ? WHERE product_id = ?;" },
    { rank: 3, id: "#9012", value: 68, unit: "%", query: "DELETE FROM sessions ...", callCount: 123, avgTime: "345ms", detail: "DELETE FROM sessions WHERE last_activity < NOW() - INTERVAL '24 hours';" },
    { rank: 4, id: "#3456", value: 54, unit: "%", query: "SELECT COUNT(*) FROM ...", callCount: 789, avgTime: "123ms", detail: "SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '1 month';" },
    { rank: 5, id: "#7890", value: 47, unit: "%", query: "INSERT INTO logs ...", callCount: 2345, avgTime: "45ms", detail: "INSERT INTO logs (user_id, action, timestamp) VALUES (?, ?, NOW());" },
    { rank: 6, id: "#2345", value: 42, unit: "%", query: "SELECT * FROM products ...", callCount: 567, avgTime: "98ms", detail: "SELECT * FROM products WHERE stock < 10 AND active = TRUE;" },
    { rank: 7, id: "#6789", value: 38, unit: "%", query: "UPDATE users SET ...", callCount: 345, avgTime: "156ms", detail: "UPDATE users SET last_login = NOW() WHERE id = ?;" },
    { rank: 8, id: "#1111", value: 34, unit: "%", query: "SELECT SUM(amount) FROM ...", callCount: 234, avgTime: "189ms", detail: "SELECT SUM(amount) FROM orders WHERE date = CURRENT_DATE;" },
    { rank: 9, id: "#2222", value: 29, unit: "%", query: "DELETE FROM cache ...", callCount: 456, avgTime: "67ms", detail: "DELETE FROM cache WHERE expires_at < NOW();" },
    { rank: 10, id: "#3333", value: 25, unit: "%", query: "INSERT INTO metrics ...", callCount: 1234, avgTime: "34ms", detail: "INSERT INTO metrics (name, value, timestamp) VALUES (?, ?, NOW());" },
  ],
  "I/O": [
    { rank: 1, id: "#9012", value: 1250, unit: "MB/s", query: "SELECT * FROM logs WHERE ...", callCount: 1234, avgTime: "234ms", detail: "SELECT * FROM logs WHERE timestamp > NOW() - INTERVAL '1 hour' ORDER BY timestamp DESC;" },
    { rank: 2, id: "#1234", value: 980, unit: "MB/s", query: "INSERT INTO events ...", callCount: 3456, avgTime: "56ms", detail: "INSERT INTO events (type, data, timestamp) VALUES (?, ?, NOW());" },
    { rank: 3, id: "#5678", value: 875, unit: "MB/s", query: "UPDATE analytics SET ...", callCount: 567, avgTime: "178ms", detail: "UPDATE analytics SET processed = TRUE WHERE date = CURRENT_DATE;" },
    { rank: 4, id: "#3456", value: 723, unit: "MB/s", query: "SELECT * FROM orders WHERE ...", callCount: 789, avgTime: "145ms", detail: "SELECT * FROM orders WHERE status IN ('pending', 'processing');" },
    { rank: 5, id: "#7890", value: 654, unit: "MB/s", query: "DELETE FROM temp_files ...", callCount: 123, avgTime: "456ms", detail: "DELETE FROM temp_files WHERE created_at < NOW() - INTERVAL '1 day';" },
    { rank: 6, id: "#2345", value: 589, unit: "MB/s", query: "SELECT COUNT(*) FROM ...", callCount: 2345, avgTime: "67ms", detail: "SELECT COUNT(*) FROM sessions WHERE active = TRUE;" },
    { rank: 7, id: "#6789", value: 512, unit: "MB/s", query: "INSERT INTO audit_log ...", callCount: 4567, avgTime: "34ms", detail: "INSERT INTO audit_log (user_id, action, details) VALUES (?, ?, ?);" },
    { rank: 8, id: "#1111", value: 478, unit: "MB/s", query: "UPDATE cache SET ...", callCount: 1234, avgTime: "89ms", detail: "UPDATE cache SET value = ?, expires_at = NOW() + INTERVAL '1 hour' WHERE key = ?;" },
    { rank: 9, id: "#2222", value: 423, unit: "MB/s", query: "SELECT * FROM products ...", callCount: 567, avgTime: "123ms", detail: "SELECT * FROM products WHERE category = ? ORDER BY price DESC LIMIT 100;" },
    { rank: 10, id: "#3333", value: 389, unit: "MB/s", query: "DELETE FROM notifications ...", callCount: 234, avgTime: "234ms", detail: "DELETE FROM notifications WHERE read = TRUE AND created_at < NOW() - INTERVAL '7 days';" },
  ],
  실행시간: [
    { rank: 1, id: "#7890", value: 4.2, unit: "초", query: "SELECT * FROM orders o JOIN ...", callCount: 45, avgTime: "4.2s", detail: "SELECT * FROM orders o JOIN customers c ON o.customer_id = c.id WHERE o.created_at > NOW() - INTERVAL '30 days';" },
    { rank: 2, id: "#1234", value: 3.8, unit: "초", query: "UPDATE inventory SET ...", callCount: 23, avgTime: "3.8s", detail: "UPDATE inventory SET stock = stock - 1 WHERE product_id IN (SELECT id FROM products WHERE stock > 0);" },
    { rank: 3, id: "#5678", value: 3.1, unit: "초", query: "DELETE FROM old_data ...", callCount: 12, avgTime: "3.1s", detail: "DELETE FROM old_data WHERE created_at < NOW() - INTERVAL '1 year';" },
    { rank: 4, id: "#9012", value: 2.9, unit: "초", query: "SELECT * FROM users WHERE ...", callCount: 67, avgTime: "2.9s", detail: "SELECT * FROM users WHERE active = TRUE AND (role = 'admin' OR role = 'manager');" },
    { rank: 5, id: "#3456", value: 2.5, unit: "초", query: "INSERT INTO analytics ...", callCount: 89, avgTime: "2.5s", detail: "INSERT INTO analytics SELECT * FROM staging_analytics WHERE processed = FALSE;" },
    { rank: 6, id: "#2345", value: 2.1, unit: "초", query: "SELECT AVG(price) FROM ...", callCount: 134, avgTime: "2.1s", detail: "SELECT AVG(price) FROM products WHERE category IN (SELECT id FROM categories WHERE active = TRUE);" },
    { rank: 7, id: "#6789", value: 1.8, unit: "초", query: "UPDATE orders SET ...", callCount: 156, avgTime: "1.8s", detail: "UPDATE orders SET status = 'completed' WHERE id IN (SELECT order_id FROM shipments WHERE delivered = TRUE);" },
    { rank: 8, id: "#1111", value: 1.5, unit: "초", query: "SELECT COUNT(*) FROM ...", callCount: 234, avgTime: "1.5s", detail: "SELECT COUNT(*) FROM logs WHERE level = 'ERROR' AND timestamp > NOW() - INTERVAL '1 day';" },
    { rank: 9, id: "#2222", value: 1.2, unit: "초", query: "DELETE FROM sessions ...", callCount: 345, avgTime: "1.2s", detail: "DELETE FROM sessions WHERE last_activity < NOW() - INTERVAL '7 days';" },
    { rank: 10, id: "#3333", value: 0.9, unit: "초", query: "INSERT INTO logs ...", callCount: 567, avgTime: "0.9s", detail: "INSERT INTO logs SELECT * FROM temp_logs WHERE processed = TRUE;" },
  ],
};

const demoSlowQueries: SlowQueryItem[] = [
  {
    id: "#1",
    icon: "⚠️",
    query: "SELECT * FROM orders WHERE...",
    fullQuery: "SELECT * FROM orders WHERE created_at > NOW() - INTERVAL '30 days' ORDER BY created_at DESC;",
    severity: "HIGH",
    suggestion: "인덱스 최적화가 필요합니다",
    executionTime: "4.2초",
    occurredAt: "2분 전",
  },
  {
    id: "#2",
    icon: "⚠️",
    query: "UPDATE inventory SET...",
    fullQuery: "UPDATE inventory SET stock = stock - 1 WHERE product_id = ? AND stock > 0;",
    severity: "MEDIUM",
    suggestion: "인덱스 최적화가 필요합니다",
    executionTime: "1.8초",
    occurredAt: "4분 전",
  },
  {
    id: "#3",
    icon: "⚠️",
    query: "DELETE FROM temp_data",
    fullQuery: "DELETE FROM temp_data WHERE created_at < NOW() - INTERVAL '7 days';",
    severity: "LOW",
    suggestion: "대량 삭제 작업으로 시간이 소요됩니다",
    executionTime: "1.2초",
    occurredAt: "8분 전",
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
      className={`tq-tab ${active ? "tq-tab--active" : ""}`}
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
      className={`tq-sort-btn ${active ? "tq-sort-btn--active" : ""}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

/* ---------- 메인 페이지 ---------- */
export default function TopQuery() {
  const [resourceType, setResourceType] = useState<ResourceType>("메모리");
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>("최근 발생순");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  // 현재 선택된 리소스 타입의 데이터
  const currentQueries = useMemo(
    () => demoTopQueries[resourceType],
    [resourceType]
  );

  // 선택된 쿼리의 상세 정보
  const selectedQuery = useMemo(
    () => currentQueries.find((q) => q.id === selectedQueryId),
    [currentQueries, selectedQueryId]
  );

  // 쿼리 클릭 핸들러
  const handleQueryClick = (id: string) => {
    setSelectedQueryId(selectedQueryId === id ? null : id);
  };

  // 리소스 타입 변경 핸들러
  const handleResourceTypeChange = (type: ResourceType) => {
    setResourceType(type);
    setSelectedQueryId(null);
  };

  // 최대값 계산 (막대 그래프 정규화용)
  const maxValue = useMemo(
    () => Math.max(...currentQueries.map((q) => q.value)),
    [currentQueries]
  );

  // 슬로우 쿼리 정렬
  const sortedSlowQueries = useMemo(() => {
    const sorted = [...demoSlowQueries];
    if (sortOption === "실행시간 느린순") {
      return sorted.sort((a, b) => parseFloat(b.executionTime) - parseFloat(a.executionTime));
    } else if (sortOption === "실행시간 빠른순") {
      return sorted.sort((a, b) => parseFloat(a.executionTime) - parseFloat(b.executionTime));
    }
    return sorted;
  }, [sortOption]);

  // 페이지네이션
  const totalPages = Math.ceil(sortedSlowQueries.length / itemsPerPage);
  const currentSlowQueries = sortedSlowQueries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 심각도별 색상
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "HIGH":
        return "#EF4444";
      case "MEDIUM":
        return "#F59E0B";
      case "LOW":
        return "#10B981";
      default:
        return "#6B7280";
    }
  };

  return (
    <div className="tq-root">
      {/* 리소스 사용량 기준 Top-N 쿼리 */}
      <section className="tq-card">
        <header className="tq-card__header">
          <h2 className="tq-title">리소스 사용량 기준 Top-N 쿼리</h2>
          <div className="tq-tabs">
            <ResourceTab
              active={resourceType === "메모리"}
              label="메모리"
              onClick={() => handleResourceTypeChange("메모리")}
            />
            <ResourceTab
              active={resourceType === "CPU"}
              label="CPU"
              onClick={() => handleResourceTypeChange("CPU")}
            />
            <ResourceTab
              active={resourceType === "I/O"}
              label="I/O"
              onClick={() => handleResourceTypeChange("I/O")}
            />
            <ResourceTab
              active={resourceType === "실행시간"}
              label="실행시간"
              onClick={() => handleResourceTypeChange("실행시간")}
            />
          </div>
        </header>

        <div className="tq-section-title">{resourceType} 사용량 Top 10</div>

        {/* Top 쿼리 목록 */}
        <div className="tq-query-list">
          {currentQueries.map((query) => {
            const barWidth = (query.value / maxValue) * 100;
            const isSelected = selectedQueryId === query.id;

            return (
              <div key={query.id} className="tq-query-item-wrapper">
                <div
                  className="tq-query-item"
                  onClick={() => handleQueryClick(query.id)}
                >
                  <div className="tq-query-rank">#{query.rank}</div>
                  <div className="tq-query-id">{query.id}</div>
                  <div className="tq-query-bar-container">
                    <div
                      className="tq-query-bar"
                      style={{
                        width: `${barWidth}%`,
                        animationDelay: `${query.rank * 0.05}s`,
                      }}
                    >
                      <span className="tq-query-bar-label">
                        {query.value}
                        {query.unit}
                      </span>
                    </div>
                  </div>
                  <div className="tq-query-value">
                    {query.value}
                    {query.unit}
                  </div>
                </div>

                {/* 상세 정보 */}
                {isSelected && selectedQuery && (
                  <div className="tq-query-detail">
                    <div className="tq-detail-section">
                      <div className="tq-detail-label">QUERY</div>
                      <div className="tq-detail-query">{selectedQuery.detail}</div>
                    </div>
                    <div className="tq-detail-actions">
                      <button className="tq-detail-btn tq-detail-btn--primary">
                        상세 보기
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 슬로우 쿼리 */}
      <section className="tq-card">
        <header className="tq-card__header">
          <div className="tq-slow-header">
            <div className="tq-slow-title">
              <span className="tq-slow-icon">⚠️</span>
              슬로우 쿼리
            </div>
            <button className="tq-csv-btn">
              <span className="tq-csv-icon">📥</span>
              CSV 내보내기
            </button>
          </div>
        </header>

        <div className="tq-slow-stats">
          <div className="tq-slow-stat">
            <span className="tq-slow-stat-label">총 슬로우 쿼리:</span>
            <span className="tq-slow-stat-value">23</span>
          </div>
          <div className="tq-slow-stat">
            <span className="tq-slow-stat-label">평균 실행시간:</span>
            <span className="tq-slow-stat-value">2.3초</span>
          </div>
          <div className="tq-slow-stat">
            <span className="tq-slow-stat-label">최대 실행시간:</span>
            <span className="tq-slow-stat-value">15.2초</span>
          </div>
        </div>

        {/* 정렬 옵션 */}
        <div className="tq-sort-options">
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

        {/* 슬로우 쿼리 카드 목록 */}
        <div className="tq-slow-list">
          {currentSlowQueries.map((slowQuery) => (
            <div key={slowQuery.id} className="tq-slow-card">
              <div className="tq-slow-card-header">
                <div className="tq-slow-card-left">
                  <span className="tq-slow-card-icon">{slowQuery.icon}</span>
                  <div className="tq-slow-card-query">{slowQuery.query}</div>
                </div>
                <div
                  className="tq-slow-card-severity"
                  style={{ backgroundColor: getSeverityColor(slowQuery.severity) }}
                >
                  {slowQuery.severity}
                </div>
              </div>
              <div className="tq-slow-card-suggestion">{slowQuery.suggestion}</div>
              <div className="tq-slow-card-footer">
                <span className="tq-slow-card-time">실행: {slowQuery.executionTime}</span>
                <span className="tq-slow-card-occurred">발생: {slowQuery.occurredAt}</span>
              </div>
            </div>
          ))}
        </div>

        {/* 페이지네이션 */}
        <div className="tq-pagination">
          <button
            className="tq-page-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            이전
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              className={`tq-page-num ${currentPage === page ? "tq-page-num--active" : ""}`}
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </button>
          ))}
          <button
            className="tq-page-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            다음
          </button>
        </div>
      </section>
    </div>
  );
}