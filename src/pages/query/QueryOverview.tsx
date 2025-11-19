import { useState, useMemo, useEffect } from "react";
import { useInstanceContext } from "../../context/InstanceContext";
import Chart from "../../components/chart/ChartComponent";
import Pagination from "../../components/util/Pagination";
import CsvButton from "../../components/util/CsvButton";
import SummaryCard from "../../components/util/SummaryCard";
import ChartGridLayout from "../../components/layout/ChartGridLayout";
import WidgetCard from "../../components/util/WidgetCard";
import QueryModal from "../query/QueryModal";
import type { QueryDetail } from "../query/QueryModal";
import {
  formatDate,
  calculateSeverity,
  postExplainAnalyze, // ✅ 추가
} from "../../api/query";

import {
  getQuerySummary,
  getQueryTrend,
  getSlowQueryList,
  getTopQueries,
  type QuerySummaryDto,
  type QueryOverviewTrendDto,
  type SlowQueryListDto,
  type QueryAgg1mDto
} from "../../api/queryagg";
import "/src/styles/query/query-overview.css";

/**
 * 쿼리 오버뷰 통합 대시보드
 * - 쿼리 모니터링 및 시스템 리소스 현황
 * - Top-N 쿼리 및 슬로우 쿼리 모니터링
 * 
 * @author 이해든 
 */

/* ---------- 타입 ---------- */
type MetricData = {
  label: string;
  value: string | number;
  status?: "info" | "warning" | "critical";
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
  const { selectedDatabase, selectedInstance } = useInstanceContext();
  const databaseId = selectedDatabase?.databaseId ?? null;

  const [isResourceMounted, setIsResourceMounted] = useState(false);
  const [resourceUsage, setResourceUsage] = useState({
    cpu: 0,
    memory: 0,
    disk: 0,
  });
  const [resourceType, setResourceType] = useState<ResourceType>("메모리");
  const [sortOption, setSortOption] = useState<SortOption>("최근 발생순");
  const [currentFullSlowPage, setCurrentFullSlowPage] = useState(1);
  const fullSlowItemsPerPage = 5;

  // 모달 상태 관리
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedQueryDetail, setSelectedQueryDetail] = useState<QueryDetail | null>(null);

  // API 데이터 상태
  const [topQueries, setTopQueries] = useState<TopQueryItem[]>([]);
  const [slowQueries, setSlowQueries] = useState<SlowQueryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 📌 슬로우 쿼리 Top 5
  const [slowQueriesTop5, setSlowQueriesTop5] = useState<SlowQueryItem[]>([]);

  // 요약 카드 메트릭 상태
  const [summaryMetrics, setSummaryMetrics] = useState<MetricData[]>([
    { label: "현재 TPS", value: "0", status: "info", desc: "최근 5분 평균 기준" },
    { label: "현재 QPS", value: "0", status: "info", desc: "최근 5분 평균 기준" },
    { label: "활성 세션 수", value: 0, status: "info", desc: "최근 5분 평균 기준" },
    { label: "평균 응답 시간", value: "0ms", status: "info", desc: "최근 5분 평균 기준" },
  ]);

  // 🕐 시간 카테고리 (12시간, 고정값)
  const timeCategories = useMemo(() => {
    const now = new Date();
    const baseTime = new Date(now);
    baseTime.setMinutes(0);
    baseTime.setSeconds(0);
    baseTime.setMilliseconds(0);
    const categories: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const time = new Date(baseTime.getTime() - i * 60 * 60 * 1000);
      const hours = time.getHours().toString().padStart(2, '0');
      categories.push(`${hours}:00`);
    }
    return categories;
  }, []);

  // 차트 데이터 상태
  const [tpsQpsData, setTpsQpsData] = useState({
    tps: Array(12).fill(0),
    qps: Array(12).fill(0),
  });

  // TPS/QPS 차트 시리즈
  const trendChartSeries = useMemo(
    () => [
      { name: "TPS", data: tpsQpsData.tps },
      { name: "QPS", data: tpsQpsData.qps },
    ],
    [tpsQpsData]
  );

  /**
   * 🎨 리소스 사용률 색상 결정
   */
  const getResourceColor = (resourceName: string, value: number) => {
    switch (resourceName) {
      case "CPU":
        if (value >= 90) return "#FF928A";
        if (value >= 70) return "#FFD66B";
        return "#7B61FF";
      case "Memory":
        if (value >= 75) return "#FF928A";
        if (value >= 60) return "#FFD66B";
        return "#7B61FF";
      case "Disk I/O":
        if (value >= 70) return "#FF928A";
        if (value >= 50) return "#FFD66B";
        return "#7B61FF";
      default:
        return "#7B61FF";
    }
  };

  /**
   * QueryAgg1mDto를 TopQueryItem으로 변환
   */
  const convertToTopQueryItem = (item: QueryAgg1mDto, index: number, resourceType: ResourceType): TopQueryItem => {
    let value = 0;
    let unit = "";

    switch (resourceType) {
      case "메모리":
        value = item.avgMemoryUsageMb || 0;
        unit = "MB";
        break;
      case "CPU":
        value = item.avgCpuUsagePercent || 0;
        unit = "%";
        break;
      case "I/O":
        value = (item.avgIoBlocks || 0) / 1000;
        unit = "MB/s";
        break;
      case "실행시간":
        value = item.avgExecutionTimeMs || 0;
        unit = "ms";
        break;
    }

    return {
      rank: index + 1,
       id: item.queryMetricId ? `#${item.queryMetricId}` : `#${index + 1}`,
    value,
    unit,
    // 🔧 수정: shortQuery 사용
    query: item.shortQuery || item.queryText?.substring(0, 50) || "N/A",
    // 🔧 수정: executionCount 사용
    callCount: item.executionCount || 0,
    avgTime: `${item.avgExecutionTimeMs || 0}ms`,
    };
  };

  // 🔄 초기 데이터 로드
  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);

        if (!databaseId || !selectedInstance?.instanceId) {
          console.warn("⚠️ instanceId 또는 databaseId가 없습니다");
          return;
        }

        const instanceId = selectedInstance.instanceId;

        // 초기화
        setTopQueries([]);
        setSlowQueries([]);
        setSlowQueriesTop5([]);
        setResourceUsage({ cpu: 0, memory: 0, disk: 0 });
        setSummaryMetrics([
          { label: "현재 TPS", value: "0", status: "info", desc: "데이터 없음" },
          { label: "현재 QPS", value: "0", status: "info", desc: "데이터 없음" },
          { label: "활성 세션 수", value: 0, status: "info", desc: "데이터 없음" },
          { label: "평균 응답 시간", value: "0ms", status: "info", desc: "데이터 없음" },
        ]);
        setTpsQpsData({ tps: Array(12).fill(0), qps: Array(12).fill(0) });

        // ===================================================
        // Step 1: 집계 API로 요약 데이터 조회
        // ===================================================
        const summaryResponse = await getQuerySummary(selectedInstance.instanceId, databaseId);

        let summary: QuerySummaryDto | null = null;

        if (summaryResponse.data.success && summaryResponse.data.data) {
          summary = summaryResponse.data.data;
          
          // 요약 카드 메트릭 설정
          setSummaryMetrics([
            {
              label: "현재 TPS",
              value: summary.currentTps.toLocaleString(),
              status: summary.currentTps > 1000 ? "warning" : "info",
              desc: summary.timeRange
            },
            {
              label: "현재 QPS",
              value: summary.currentQps.toLocaleString(),
              status: summary.currentQps > 5000 ? "critical" : summary.currentQps > 3000 ? "warning" : "info",
              desc: summary.timeRange
            },
            {
              label: "활성 세션 수",
              value: summary.activeSessions,
              status: summary.activeSessions > 200 ? "critical" : summary.activeSessions > 150 ? "warning" : "info",
              desc: summary.timeRange
            },
            {
              label: "평균 응답 시간",
              value: `${Math.round(summary.avgExecutionTimeMs)}ms`,
              status: summary.avgExecutionTimeMs > 100 ? "critical" : summary.avgExecutionTimeMs > 50 ? "warning" : "info",
              desc: summary.timeRange
            },
          ]);

          // 리소스 사용률 설정
          if (summary.currentCpuUsagePercent !== undefined || 
              summary.currentMemoryUsagePercent !== undefined || 
              summary.currentDiskIoUsagePercent !== undefined) {
            
            setResourceUsage({
              cpu: summary.currentCpuUsagePercent || 0,
              memory: summary.currentMemoryUsagePercent || 0,
              disk: summary.currentDiskIoUsagePercent || 0,
            });
            
            // 애니메이션을 위해 약간의 지연 후 마운트 상태 변경
            setTimeout(() => setIsResourceMounted(true), 100);
          }
        }

        // ===================================================
        // Step 2: 트렌드 데이터 조회 (TPS/QPS 차트용)
        // ===================================================
        const trendResponse = await getQueryTrend(selectedInstance.instanceId, databaseId, 12);

        if (trendResponse.data.success && trendResponse.data.data) {
          const trend: QueryOverviewTrendDto = trendResponse.data.data;
          
          // TPS/QPS 차트 데이터 설정
          let tpsData = trend.trendData.map(d => d.tps);
          let qpsData = trend.trendData.map(d => d.qps);
          
          // 데이터가 12개보다 적으면 앞쪽을 0으로 채움
          while (tpsData.length < 12) {
            tpsData.unshift(0);
            qpsData.unshift(0);
          }
          
          // 데이터가 12개보다 많으면 최근 12개만 사용
          if (tpsData.length > 12) {
            tpsData = tpsData.slice(-12);
            qpsData = qpsData.slice(-12);
          }
          
          setTpsQpsData({ tps: tpsData, qps: qpsData });
        }

        // ===================================================
        // Step 3: Top Query 데이터 로드 (집계 API 사용)
        // ===================================================
        const topQueryResponse = await getTopQueries(instanceId, databaseId, 'memory', 5);
        
        if (topQueryResponse.data.success && topQueryResponse.data.data) {
          const metrics = topQueryResponse.data.data;
          
          // 초기 메모리 Top 5 표시
          const sortedByMemory = metrics.map((item, index) => convertToTopQueryItem(item, index, "메모리"));
          
          setTopQueries(sortedByMemory);
        }

        // ===================================================
        // Step 4: 슬로우 쿼리 조회 (집계 API)
        // ===================================================
        const slowResponse = await getSlowQueryList(instanceId, databaseId, 50);

        if (slowResponse.data.success && slowResponse.data.data) {
          const slowData: SlowQueryListDto[] = slowResponse.data.data;
          
          // SlowQueryListDto를 SlowQueryItem으로 변환
          const transformedSlowQueries = slowData.map((item): SlowQueryItem => {
            const executionTimeSec = (item.executionTimeMs / 1000).toFixed(1);
            
            return {
              id: `#${item.queryMetricId}`,
              query: item.shortQuery || item.queryText?.substring(0, 80) || "Unknown Query",
              fullQuery: item.queryText || "",
              severity: calculateSeverity(item.executionTimeMs),
              suggestion: "인덱스 최적화 권장",
              executionTime: `${executionTimeSec}초`,
              occurredAt: formatDate(item.collectedAt),
            };
          });
          
          setSlowQueries(transformedSlowQueries);
          
          // Top 5 설정
          const top5Fixed = [...transformedSlowQueries]
            .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
            .slice(0, 5);
          setSlowQueriesTop5(top5Fixed);
        }

      } catch (e: any) {
        if (e?.code === "ERR_CANCELED" || e?.name === "CanceledError") return;
        console.error("❌ API 호출 실패:", e);
        setError(e?.response?.data?.message ?? e?.message ?? "데이터를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [databaseId, selectedInstance]);

  // ===================================================
  // 🔄 리소스 타입 변경 시 적절한 API 호출
  // ===================================================
  useEffect(() => {
    if (!databaseId || !selectedInstance?.instanceId) return;

    const fetchTopQueries = async () => {
      try {
        let orderBy: 'cpu' | 'memory' | 'io' | 'execution_time' = 'memory';
        
        switch (resourceType) {
          case "CPU":
            orderBy = 'cpu';
            break;
          case "메모리":
            orderBy = 'memory';
            break;
          case "I/O":
            orderBy = 'io';
            break;
          case "실행시간":
            orderBy = 'execution_time';
            break;
        }

        const response = await getTopQueries(selectedInstance.instanceId, databaseId, orderBy, 5);
        
        if (response.data.success && response.data.data) {
          const metrics = response.data.data;
          
          const top5 = metrics.map((item, index) => convertToTopQueryItem(item, index, resourceType));
          setTopQueries(top5);
        }
      } catch (error) {
        console.error("Top Query 조회 실패:", error);
      }
    };

    fetchTopQueries();
  }, [resourceType, databaseId, selectedInstance]);

  const handleExport = () => {
    console.log("Exporting slow queries...");
  };

  // Top Query 클릭
 
  /**
   * ✅ Top Query 클릭 핸들러 - 실제 EXPLAIN ANALYZE 실행
   */
  const handleTopQueryClick = async (query: TopQueryItem) => {
    if (!databaseId) {
      console.error('❌ Database ID가 없습니다');
      return;
    }

    // 1️⃣ 먼저 로딩 상태의 모달을 표시
    const isModifyingQuery = query.query.toUpperCase().includes("UPDATE") || 
                            query.query.toUpperCase().includes("INSERT") || 
                            query.query.toUpperCase().includes("DELETE");

    const loadingDetail: QueryDetail = {
      queryId: `Query ${query.id}`,
      status: "🔄 실행 계획 분석 중...",
      avgExecutionTime: query.avgTime,
      totalCalls: query.callCount,
      memoryUsage: `${query.value.toFixed(1)}${query.unit}`,
      ioUsage: query.detail || "계산 중...",
      cpuUsagePercent: 0,
      sqlQuery: query.query,
      explainResult: "분석 중입니다...",
      stats: {
        min: "계산 중...",
        avg: query.avgTime,
        max: "계산 중...",
        stdDev: "계산 중...",
        totalTime: "계산 중..."
      },
      isModifyingQuery
    };

    setSelectedQueryDetail(loadingDetail);
    setIsModalOpen(true);

    // 2️⃣ EXPLAIN ANALYZE 실행
    try {
      console.log('🔍 EXPLAIN ANALYZE 요청 시작', { databaseId, query: query.query });

      const { data } = await postExplainAnalyze(databaseId, query.query);

      if (!data?.success || !data?.data) {
        throw new Error(data?.message || "EXPLAIN ANALYZE 실패");
      }

      console.log('✅ EXPLAIN ANALYZE 응답:', data.data);

      const result = data.data;

      // 3️⃣ 결과로 모달 업데이트
      const updatedDetail: QueryDetail = {
        queryId: `Query ${query.id}`,
        status: result.executionMode === "ANALYZE" ? "실제 실행" : "안전 모드",
        avgExecutionTime: query.avgTime,
        totalCalls: query.callCount,
        memoryUsage: `${query.value.toFixed(1)}${query.unit}`,
        ioUsage: query.detail || "N/A",
        cpuUsagePercent: 0, // CPU 정보는 pg_stat_statements에서 가져오기
        sqlQuery: query.query,
        suggestion: result.executionTimeMs && result.executionTimeMs > 1000 ? {
          priority: result.executionTimeMs > 5000 ? "필수" : "권장",
          description: "실행 시간이 느립니다. 인덱스 최적화를 고려하세요.",
          code: "CREATE INDEX idx_example ON table_name(column_name);"
        } : undefined,
        explainResult: result.explainPlan || "실행 계획을 가져올 수 없습니다.",
        stats: {
          min: "N/A",
          avg: query.avgTime,
          max: "N/A",
          stdDev: "N/A",
          totalTime: result.executionTimeMs ? `${result.executionTimeMs.toFixed(2)}ms` : "N/A"
        },
        isModifyingQuery
      };

      setSelectedQueryDetail(updatedDetail);

    } catch (error: any) {
      console.error('❌ EXPLAIN ANALYZE 실패:', error);

      // 4️⃣ 에러 시 에러 메시지 표시
      const errorDetail: QueryDetail = {
        ...loadingDetail,
        status: "⚠️ 분석 실패",
        explainResult: `실행 계획을 가져오지 못했습니다.\n오류: ${error?.response?.data?.message || error?.message || '알 수 없는 오류'}`,
        stats: {
          min: "N/A",
          avg: query.avgTime,
          max: "N/A",
          stdDev: "N/A",
          totalTime: "N/A"
        }
      };

      setSelectedQueryDetail(errorDetail);
    }
  };

  /**
   * ✅ Slow Query 클릭 핸들러 - 실제 EXPLAIN ANALYZE 실행
   */
  const handleSlowQueryClick = async (slowQuery: SlowQueryItem) => {
    if (!databaseId) {
      console.error('❌ Database ID가 없습니다');
      return;
    }

    // 1️⃣ 먼저 로딩 상태의 모달을 표시
    const isModifyingQuery = slowQuery.fullQuery.toUpperCase().includes("UPDATE") || 
                            slowQuery.fullQuery.toUpperCase().includes("INSERT") || 
                            slowQuery.fullQuery.toUpperCase().includes("DELETE");

    const loadingDetail: QueryDetail = {
      queryId: `Query ${slowQuery.id}`,
      status: "🔄 실행 계획 분석 중...",
      avgExecutionTime: slowQuery.executionTime,
      totalCalls: 1,
      memoryUsage: "계산 중...",
      ioUsage: "계산 중...",
      cpuUsagePercent: 0,
      sqlQuery: slowQuery.fullQuery,
      explainResult: "분석 중입니다...",
      stats: {
        min: "계산 중...",
        avg: slowQuery.executionTime,
        max: "계산 중...",
        stdDev: "계산 중...",
        totalTime: slowQuery.executionTime
      },
      isModifyingQuery
    };

    setSelectedQueryDetail(loadingDetail);
    setIsModalOpen(true);

    // 2️⃣ EXPLAIN ANALYZE 실행
    try {
      console.log('🔍 EXPLAIN ANALYZE 요청 시작', { databaseId, query: slowQuery.fullQuery });

      const { data } = await postExplainAnalyze(databaseId, slowQuery.fullQuery);

      if (!data?.success || !data?.data) {
        throw new Error(data?.message || "EXPLAIN ANALYZE 실패");
      }

      console.log('✅ EXPLAIN ANALYZE 응답:', data.data);

      const result = data.data;

      // 3️⃣ 결과로 모달 업데이트
      const updatedDetail: QueryDetail = {
        queryId: `Query ${slowQuery.id}`,
        status: result.executionMode === "ANALYZE" ? "실제 실행" : "안전 모드",
        avgExecutionTime: slowQuery.executionTime,
        totalCalls: 1,
        memoryUsage: "N/A",
        ioUsage: "N/A",
        cpuUsagePercent: 0,
        sqlQuery: slowQuery.fullQuery,
        suggestion: {
          priority: slowQuery.severity === "HIGH" ? "필수" : "권장",
          description: slowQuery.suggestion,
          code: "CREATE INDEX idx_example ON table_name(column_name);"
        },
        explainResult: result.explainPlan || "실행 계획을 가져올 수 없습니다.",
        stats: {
          min: "N/A",
          avg: slowQuery.executionTime,
          max: "N/A",
          stdDev: "N/A",
          totalTime: result.executionTimeMs ? `${result.executionTimeMs.toFixed(2)}ms` : slowQuery.executionTime
        },
        isModifyingQuery
      };

      setSelectedQueryDetail(updatedDetail);

    } catch (error: any) {
      console.error('❌ EXPLAIN ANALYZE 실패:', error);

      // 4️⃣ 에러 시 에러 메시지 표시
      const errorDetail: QueryDetail = {
        ...loadingDetail,
        status: "⚠️ 분석 실패",
        explainResult: `실행 계획을 가져오지 못했습니다.\n오류: ${error?.response?.data?.message || error?.message || '알 수 없는 오류'}`,
        stats: {
          min: "N/A",
          avg: slowQuery.executionTime,
          max: "N/A",
          stdDev: "N/A",
          totalTime: "N/A"
        }
      };

      setSelectedQueryDetail(errorDetail);
    }
  };

  // 정렬
  const sortedSlowQueries = useMemo(() => {
    let sorted = [...slowQueries];
    
    switch (sortOption) {
      case "최근 발생순":
        sorted.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
        break;
      case "실행시간 느린순":
        sorted.sort((a, b) => parseFloat(b.executionTime) - parseFloat(a.executionTime));
        break;
      case "실행시간 빠른순":
        sorted.sort((a, b) => parseFloat(a.executionTime) - parseFloat(b.executionTime));
        break;
    }
    
    return sorted;
  }, [slowQueries, sortOption]);

  // 페이지네이션
  const paginatedFullSlowQueries = useMemo(() => {
    const startIdx = (currentFullSlowPage - 1) * fullSlowItemsPerPage;
    const endIdx = startIdx + fullSlowItemsPerPage;
    return sortedSlowQueries.slice(startIdx, endIdx);
  }, [sortedSlowQueries, currentFullSlowPage]);

  const totalFullSlowPages = Math.ceil(slowQueries.length / fullSlowItemsPerPage);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "HIGH": return "#FF928A";
      case "MEDIUM": return "#FFD66B";
      case "LOW": return "#51DAA8";
      default: return "#7B61FF";
    }
  };

  return (
    <div className="qo-root">
      {loading && topQueries.length === 0 && (
        <div className="il-banner il-banner--muted">로딩 중…</div>
      )}
      {error && (
        <div className="il-banner il-banner--error">{error}</div>
      )}

      {!loading && !error && !databaseId && (
        <div className="il-empty">데이터베이스를 선택해주세요.</div>
      )}

      <section className="qo-metrics">
        {summaryMetrics.map((metric, idx) => (
          <SummaryCard
            key={idx}
            label={metric.label}
            value={metric.value}
            status={metric.status}
            desc={metric.desc}
          />
        ))}
      </section>

      <ChartGridLayout>
        <WidgetCard title="TPS/QPS 실시간 그래프" span={9}>
          <div style={{ width: '100%', height: '100%', paddingBottom: '1rem' }}>
            <div className="qo-legend" style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'flex-end', gap: '1.25rem' }}>
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
              type="line"
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
                  animations: {
                    enabled: true,
                    easing: 'linear',
                    dynamicAnimation: {
                      enabled: true,
                      speed: 1000
                    }
                  }
                },
                stroke: { curve: "smooth", width: 3 },
                markers: {
                  size: 4,
                  colors: ["#7B61FF", "#FF928A"],
                  strokeColors: "#fff",
                  strokeWidth: 2,
                  hover: { size: 6 }
                },
                dataLabels: { enabled: false },
                xaxis: {
                  type: 'category',
                  categories: timeCategories,
                  labels: {
                    show: true,
                    style: { fontSize: "11px", colors: "#999", fontWeight: 500 },
                    rotate: 0,
                  },
                  axisBorder: { show: true, color: "#e0e0e0" },
                  axisTicks: { show: true, color: "#e0e0e0" },
                },
                yaxis: {
                  min: 0,
                  forceNiceScale: true,
                  labels: {
                    show: true,
                    style: { fontSize: "11px", colors: "#999" },
                    formatter: (val: number) => `${Math.round(val)}`,
                  },
                },
                tooltip: {
                  enabled: true,
                  shared: true,
                  intersect: false,
                  x: { show: true },
                  y: { formatter: (val: number) => `${Math.round(val)}` },
                },
                grid: {
                  borderColor: "#f0f0f0",
                  strokeDashArray: 3,
                  xaxis: { lines: { show: true } },
                  yaxis: { lines: { show: true } },
                  padding: { top: 0, right: 10, bottom: 10, left: 10 }
                },
              }}
            />
          </div>
        </WidgetCard>

        <WidgetCard title="리소스 사용률" span={3}>
          {!databaseId ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999', fontSize: '14px' }}>
              데이터베이스를 선택해주세요
            </div>
          ) : (
            <div className="qo-resource-wrapper">
              <div className="qo-resource-item">
                <div className="qo-resource-label">CPU</div>
                <div className="qo-resource-bar-container">
                  <div 
                    className="qo-resource-bar"
                    style={{ 
                      width: isResourceMounted ? `${resourceUsage.cpu}%` : '0%',
                      backgroundColor: getResourceColor("CPU", resourceUsage.cpu)
                    }}
                  ></div>
                </div>
                <div className="qo-resource-value">{resourceUsage.cpu.toFixed(1)}%</div>
              </div>

              <div className="qo-resource-item">
                <div className="qo-resource-label">Memory</div>
                <div className="qo-resource-bar-container">
                  <div 
                    className="qo-resource-bar"
                    style={{ 
                      width: isResourceMounted ? `${resourceUsage.memory}%` : '0%',
                      backgroundColor: getResourceColor("Memory", resourceUsage.memory)
                    }}
                  ></div>
                </div>
                <div className="qo-resource-value">{resourceUsage.memory.toFixed(1)}%</div>
              </div>

              <div className="qo-resource-item">
                <div className="qo-resource-label">Disk I/O</div>
                <div className="qo-resource-bar-container">
                  <div 
                    className="qo-resource-bar"
                    style={{ 
                      width: isResourceMounted ? `${resourceUsage.disk}%` : '0%',
                      backgroundColor: getResourceColor("Disk I/O", resourceUsage.disk)
                    }}
                  ></div>
                </div>
               <div className="qo-resource-value">{resourceUsage.disk.toFixed(1)}%</div>
              </div>
            </div>
          )}
        </WidgetCard>
      </ChartGridLayout>

      <div className="qo-bottom-cards">
        <div className="qo-top-query-card">
          <div className="qo-widget-header">
            <div className="qo-card__title">{resourceType} 사용량 Top 5</div>
            <div className="qo-tabs">
              {(["메모리", "CPU", "I/O", "실행시간"] as ResourceType[]).map((type) => (
                <ResourceTab key={type} active={resourceType === type} label={type} onClick={() => setResourceType(type)} />
              ))}
            </div>
          </div>

          <h4 className="qo-section-title">아이콘을 클릭하면 SQL 상세 내용을 볼 수 있습니다.</h4>

          <div className="qo-query-bar-list">
            {topQueries.length === 0 && !loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>데이터가 없습니다</div>
            ) : (
              topQueries.map((query) => {
                const maxValue = Math.max(...topQueries.map(q => q.value), 1);
                const barWidth = (query.value / maxValue) * 100;

                return (
                  <div key={query.id} className="qo-query-item-wrapper" onClick={() => handleTopQueryClick(query)}>
                    <div className="qo-query-bar-item">
                      <div className="qo-query-id-info">
                        <div className="qo-query-id">{query.id}</div>
                        <div className="qo-query-desc">{query.query}</div>
                      </div>
                      <div className="qo-query-bar-container">
                        <div className="qo-query-bar" style={{ width: `${barWidth}%` }}>
                          <span className="qo-query-bar-label">{query.value.toFixed(1)}{query.unit}</span>
                        </div>
                      </div>
                      <div className="qo-query-arrow"><ChevronRightIcon /></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="qo-slow-top5-card">
          <div className="qo-widget-header">
            <div className="qo-card__title">슬로우 쿼리 TOP 5</div>
            <CsvButton onClick={handleExport} />
          </div>

          <div className="qo-query-list-wrapper-top5">
            <div className="qo-query-list">
              {slowQueriesTop5.length === 0 && !loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>슬로우 쿼리가 없습니다</div>
              ) : (
                slowQueriesTop5.map((sq) => (
                  <div key={sq.id} className="qo-query-item" onClick={() => handleSlowQueryClick(sq)}>
                    <div className="qo-query-item-header">
                      <div className="qo-query-content">
                        <div className="qo-query-text">{sq.query}</div>
                      </div>
                      <div className="qo-query-time" style={{ backgroundColor: "#FF928A" }}>{sq.executionTime}</div>
                    </div>
                    <div className="qo-query-timestamp">발생: {sq.occurredAt}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="qo-slow-list-card">
          <div className="qo-widget-header">
            <div className="qo-card__title">슬로우 쿼리</div>
            <div className="qo-header-right">
              <div className="qo-sort-options">
                {(["최근 발생순", "실행시간 느린순", "실행시간 빠른순"] as SortOption[]).map((opt) => (
                  <SortButton
                    key={opt}
                    active={sortOption === opt}
                    label={opt}
                    onClick={() => { setSortOption(opt); setCurrentFullSlowPage(1); }}
                  />
                ))}
              </div>
              <CsvButton onClick={handleExport} />
            </div>
          </div>

          <div className="qo-slow-list-wrapper-tall">
            <div className="qo-slow-list-content">
              {paginatedFullSlowQueries.length === 0 && !loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>슬로우 쿼리가 없습니다</div>
              ) : (
                paginatedFullSlowQueries.map((sq) => (
                  <div key={sq.id} className="qo-slow-card-fixed" onClick={() => handleSlowQueryClick(sq)}>
                    <div className="qo-slow-card-header">
                      <div className="qo-slow-card-left">
                        <div className="qo-slow-card-query">{sq.query}</div>
                      </div>
                      <div className="qo-slow-card-severity" style={{ backgroundColor: getSeverityColor(sq.severity) }}>
                        {sq.severity}
                      </div>
                    </div>
                    <div className="qo-slow-card-suggestion">{sq.suggestion}</div>
                    <div className="qo-slow-card-footer">
                      <span className="qo-slow-card-time">실행: {sq.executionTime}</span>
                      <span className="qo-slow-card-occurred">발생: {sq.occurredAt}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {totalFullSlowPages > 1 && (
              <div className="qo-pagination-fixed">
                <Pagination currentPage={currentFullSlowPage} totalPages={totalFullSlowPages} onPageChange={setCurrentFullSlowPage} />
              </div>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && selectedQueryDetail && (
        <QueryModal open={isModalOpen} onClose={() => setIsModalOpen(false)} detail={selectedQueryDetail} />
      )}
    </div>
  );
}