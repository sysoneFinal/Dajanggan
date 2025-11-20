import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useInstanceContext } from "../../context/InstanceContext";
import { useLoader } from "../../context/LoaderContext";
import { intervalToMs } from "../../utils/time";
import Chart from "../../components/chart/ChartComponent";
import Pagination from "../../components/util/Pagination";
import CsvButton from "../../components/util/CsvButton";
import QueryModal from "../query/QueryModal";
import type { QueryDetail } from "../query/QueryModal";
import {
  getExecutionStats,
  type QueryExecutionStatDto,
  getQueryMetricsByDatabaseId,
  type QueryMetricsRawDto,
  postExplainAnalyze,
  getHourlyDistribution
} from "../../api/query";
import "/src/styles/query/execution-status.css";

/**
 * 쿼리 실행 상태 페이지
 * - 실행 통계 테이블 및 차트 시각화
 * - 최근 1시간 데이터 자동 조회
 * 
 * @author 이해든
 */

type QueryStat = {
  id: string;
  queryMetricId: number;
  shortQuery: string;
  fullQuery: string;
  executionCount: number;
  avgTime: string;
  totalTime: string;
  callCount: number;
};

type DashboardData = {
  queryTypeDistribution: { labels: string[]; data: number[] };
  stats: QueryStat[];
};

type SortKey = "executionCount" | "avgTime" | "totalTime" | "callCount";
type SortDir = "asc" | "desc" | null;

const parseTimeMs = (timeStr: string): number => {
  const m = timeStr.match(/^([\d.]+)(ms|s)$/);
  if (!m) return 0;
  const v = parseFloat(m[1]);
  return m[2] === "s" ? v * 1000 : v;
};

/**
 * ✅ 쿼리 텍스트에서 타입 추출 (queryType이 없을 경우 대비)
 */
const extractQueryType = (queryText: string): string => {
  if (!queryText) return "UNKNOWN";
  
  const upperQuery = queryText.trim().toUpperCase();
  
  if (upperQuery.startsWith('SELECT')) return 'SELECT';
  if (upperQuery.startsWith('INSERT')) return 'INSERT';
  if (upperQuery.startsWith('UPDATE')) return 'UPDATE';
  if (upperQuery.startsWith('DELETE')) return 'DELETE';
  if (upperQuery.startsWith('CREATE')) return 'CREATE';
  if (upperQuery.startsWith('DROP')) return 'DROP';
  if (upperQuery.startsWith('ALTER')) return 'ALTER';
  if (upperQuery.startsWith('TRUNCATE')) return 'TRUNCATE';
  
  return 'OTHER';
};

export default function ExecutionStatus() {
  const { selectedDatabase, refreshInterval } = useInstanceContext();
  const { showLoader, hideLoader } = useLoader();
  const databaseId = selectedDatabase?.databaseId ?? null;

  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 14;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedQueryDetail, setSelectedQueryDetail] = useState<QueryDetail | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    queryTypeDistribution: { labels: [], data: [] },
    stats: []
  });
  
  const [allAggregatedStats, setAllAggregatedStats] = useState<QueryExecutionStatDto[]>([]);
  const [allRawMetrics, setAllRawMetrics] = useState<QueryMetricsRawDto[]>([]);

  /**
   * ✅ 시간대별 쿼리 수 분포 조회 (최근 5시간)
   */
  const { data: hourlyDistributionData } = useQuery({
    queryKey: ["hourly-distribution", databaseId],
    queryFn: async () => {
      if (!databaseId) return null;

      console.log("📊 시간대별 분포 데이터 로딩 시작...");
      const response = await getHourlyDistribution(databaseId, 5);
      
      if (response.data.success && response.data.data) {
        console.log(`✅ 시간대별 데이터: ${response.data.data.length}개`);
        return response.data.data;
      }
      
      return [];
    },
    enabled: !!databaseId,
    refetchInterval: intervalToMs(refreshInterval),
  });

  /**
   * ✅ 시간대별 차트 데이터 변환
   */
  const hourlyChartData = useMemo(() => {
    if (!hourlyDistributionData || hourlyDistributionData.length === 0) {
      return {
        categories: [],
        series: [{ name: "쿼리 수", data: [] }]
      };
    }

    return {
      categories: hourlyDistributionData.map((d: any) => d.timeSlot),
      series: [{ name: "쿼리 수", data: hourlyDistributionData.map((d: any) => d.queryCount) }]
    };
  }, [hourlyDistributionData]);

  const convertToQueryStat = (item: QueryExecutionStatDto): QueryStat => {
    return {
      id: item.queryHash,
      queryMetricId: 0,
      shortQuery: item.shortQuery || item.fullQuery?.substring(0, 50) || "Unknown Query",
      fullQuery: item.fullQuery || "",
      executionCount: item.executionCount || 0,
      avgTime: item.avgTimeMs >= 1000 
        ? `${(item.avgTimeMs / 1000).toFixed(2)}s` 
        : `${Math.round(item.avgTimeMs)}ms`,
      totalTime: item.totalTimeMs >= 1000 
        ? `${(item.totalTimeMs / 1000).toFixed(1)}s` 
        : `${Math.round(item.totalTimeMs)}ms`,
      callCount: item.callCount || 0
    };
  };

  /**
   * ✅ 쿼리 타입별 분포 계산 (개선)
   * - queryType이 없으면 fullQuery에서 직접 추출
   * - 데이터가 없으면 빈 배열 반환
   */
  const calculateQueryTypeDistribution = (data: QueryExecutionStatDto[]): { labels: string[]; data: number[] } => {
    console.log('📊 쿼리 타입 분포 계산 시작:', {
      dataLength: data.length,
      sampleData: data.slice(0, 3)
    });

    if (!data || data.length === 0) {
      console.warn('⚠️ 집계 데이터가 비어있습니다');
      return { labels: [], data: [] };
    }

    const typeCount: Record<string, number> = {};

    data.forEach(item => {
      // queryType이 있으면 사용, 없으면 쿼리 텍스트에서 추출
      let type = item.queryType;
      
      if (!type || type === 'UNKNOWN' || type === '') {
        type = extractQueryType(item.fullQuery || '');
      }
      
      const normalizedType = type.toUpperCase();
      const count = item.executionCount || 0;
      
      typeCount[normalizedType] = (typeCount[normalizedType] || 0) + count;
    });

    console.log('📊 집계된 타입별 개수:', typeCount);

    // 상위 6개만 선택
    const sortedTypes = Object.entries(typeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    const result = {
      labels: sortedTypes.map(([type]) => type),
      data: sortedTypes.map(([, count]) => count)
    };

    console.log('✅ 차트 데이터 생성 완료:', result);

    return result;
  };

  const calculateTimeSeriesData = (data: QueryExecutionStatDto[]): number[] => {
    if (data.length === 0) return Array(12).fill(0);
    
    const avgExecutionCount = data.reduce((sum, item) => sum + (item.executionCount || 0), 0) / data.length;
    
    return Array(12).fill(0).map(() => 
      Math.max(1, Math.floor(avgExecutionCount * (0.7 + Math.random() * 0.6)))
    );
  };

  /**
   * ✅ 집계 데이터만 먼저 로드 (최근 1시간)
   */
  const { data: executionData, isLoading, error: queryError } = useQuery({
    queryKey: ["execution-status", databaseId],
    queryFn: async () => {
      if (!databaseId) {
        return null;
      }

      console.log("==========================================");
      console.log("📊 Execution Stats 데이터 로딩 시작...");
      console.log(`  - Database ID: ${databaseId}`);
      console.log(`  - 조회 기간: 최근 1시간`);

      // 1시간 데이터 요청
      const aggregatedResponse = await getExecutionStats(databaseId, 1);
      
      if (!aggregatedResponse.data.success || !aggregatedResponse.data.data) {
        throw new Error("집계 데이터를 불러오는데 실패했습니다.");
      }

      const aggregatedStats = aggregatedResponse.data.data;
      console.log(`  ✅ 집계된 쿼리 수: ${aggregatedStats.length}개`);
      
      // 🔍 디버깅: queryType 확인
      const typeCounts = aggregatedStats.reduce((acc: any, stat: any) => {
        const type = stat.queryType || 'NULL';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});
      console.log('  📊 queryType 분포:', typeCounts);
      
      console.log("  ✅ 데이터 로딩 완료");
      console.log("==========================================");

      return {
        aggregatedStats,
        rawMetrics: []
      };
    },
    enabled: !!databaseId,
    refetchInterval: intervalToMs(refreshInterval),
  });

  /**
   * ✅ 원시 메트릭은 백그라운드에서 별도로 로드
   */
  const { data: rawMetricsData } = useQuery({
    queryKey: ["raw-metrics", databaseId],
    queryFn: async () => {
      if (!databaseId) return [];

      console.log("📦 원시 메트릭 백그라운드 로드 시작...");
      
      const rawMetricsResponse = await getQueryMetricsByDatabaseId(databaseId);
      
      if (rawMetricsResponse.data.success && rawMetricsResponse.data.data) {
        console.log(`  ✅ 원시 메트릭 수: ${rawMetricsResponse.data.data.length}개`);
        return rawMetricsResponse.data.data;
      }
      
      return [];
    },
    enabled: !!databaseId,
    staleTime: 5 * 60 * 1000,
  });

  // 데이터 처리 및 상태 업데이트
  useEffect(() => {
    if (!executionData) return;

    const { aggregatedStats } = executionData;

    console.log('🔄 데이터 처리 시작:', {
      aggregatedStatsLength: aggregatedStats.length,
      rawMetricsLength: rawMetricsData?.length || 0
    });

    setAllAggregatedStats(aggregatedStats);

    if (rawMetricsData) {
      setAllRawMetrics(rawMetricsData);
    }

    const stats = aggregatedStats.map(convertToQueryStat);
    const queryTypeDistribution = calculateQueryTypeDistribution(aggregatedStats);

    console.log('📊 최종 대시보드 데이터:', {
      statsCount: stats.length,
      queryTypeLabels: queryTypeDistribution.labels,
      queryTypeData: queryTypeDistribution.data,
      hasData: queryTypeDistribution.labels.length > 0
    });

    setDashboardData({
      queryTypeDistribution,
      stats
    });
  }, [executionData, rawMetricsData]);

  // 로딩 상태 관리
  useEffect(() => {
    if (isLoading) {
      showLoader("데이터를 불러오는 중...");
    } else {
      hideLoader();
    }
  }, [isLoading, showLoader, hideLoader]);

  // 에러 상태 관리
  useEffect(() => {
    if (queryError) {
      setError(queryError instanceof Error ? queryError.message : "데이터를 불러오는데 실패했습니다.");
    } else {
      setError(null);
    }
  }, [queryError]);

  const sortedStats = useMemo(() => {
    if (!sortKey || !sortDir) return dashboardData.stats;

    const arr = [...dashboardData.stats];
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
  }, [dashboardData.stats, sortKey, sortDir]);

  const totalPages = Math.ceil(sortedStats.length / itemsPerPage);
  const currentStats = sortedStats.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const queryTypeSeries = useMemo(() => {
    return dashboardData.queryTypeDistribution.data;
  }, [dashboardData]);

  const executeExplainAnalyze = async (databaseId: number, query: string) => {
    try {
      showLoader("실행 계획 분석 중...");
      console.log('🔍 EXPLAIN ANALYZE 요청 시작', { databaseId, query });

      const { data } = await postExplainAnalyze(databaseId, query);

      if (!data?.success) {
        throw new Error(data?.message || "EXPLAIN ANALYZE 실패");
      }

      console.log('✅ EXPLAIN ANALYZE 응답:', data);
      return data;
    } catch (error) {
      console.error('❌ EXPLAIN ANALYZE 실패:', error);
      throw error;
    } finally {
      hideLoader();
    }
  };

  const onRowClick = async (row: QueryStat) => {
    if (!databaseId) {
      console.error('❌ Database ID가 없습니다');
      return;
    }

    const aggregatedData = allAggregatedStats.find(item => item.queryHash === row.id);
    
    if (!aggregatedData) {
      console.error('집계 데이터를 찾을 수 없습니다:', row.id);
      return;
    }

    const matchingRawMetrics = allRawMetrics
      .filter(m => m.queryHash === row.id)
      .sort((a, b) => {
        const dateA = a.collectedAt ? new Date(a.collectedAt).getTime() : 0;
        const dateB = b.collectedAt ? new Date(b.collectedAt).getTime() : 0;
        return dateB - dateA;
      });

    const rawMetricData = matchingRawMetrics.length > 0 ? matchingRawMetrics[0] : null;

    console.log('🔍 매칭된 원시 메트릭:', {
      queryHash: row.id,
      found: !!rawMetricData,
      count: matchingRawMetrics.length,
      hasMemory: rawMetricData?.memoryUsageMb != null,
      hasCpu: rawMetricData?.cpuUsagePercent != null,
      hasIo: rawMetricData?.ioBlocks != null
    });

    const queryText = (aggregatedData.fullQuery || row.fullQuery).toUpperCase();
    const isModifyingQuery = queryText.includes("UPDATE") || 
                            queryText.includes("INSERT") || 
                            queryText.includes("DELETE");

    const loadingDetail: QueryDetail = {
      queryId: `Query ${row.id.substring(0, 8)}...`,
      status: "🔄 실행 계획 분석 중...",
      avgExecutionTime: row.avgTime,
      totalCalls: aggregatedData.executionCount || 0,
      memoryUsage: rawMetricData?.memoryUsageMb 
        ? `${Number(rawMetricData.memoryUsageMb).toFixed(1)}MB`
        : "N/A",
      ioUsage: rawMetricData?.ioBlocks 
        ? `${Number(rawMetricData.ioBlocks).toLocaleString()} blocks`
        : "N/A",
      cpuUsagePercent: rawMetricData?.cpuUsagePercent 
        ? Number(rawMetricData.cpuUsagePercent)
        : 0,
      sqlQuery: aggregatedData.fullQuery || row.fullQuery,
      suggestion: aggregatedData.avgTimeMs && aggregatedData.avgTimeMs > 1000 ? {
        priority: aggregatedData.avgTimeMs > 5000 ? "필수" : "권장",
        description: "쿼리 실행 시간이 느립니다. 인덱스 생성 또는 쿼리 최적화를 고려해보세요.",
        code: "-- 예시: 자주 사용되는 WHERE 조건 컬럼에 인덱스 생성\nCREATE INDEX idx_table_column ON table_name(column_name);\n\n-- 또는 복합 인덱스 생성\nCREATE INDEX idx_table_multi ON table_name(column1, column2);"
      } : undefined,
      explainResult: "분석 중입니다...",
      stats: {
        min: rawMetricData?.executionTimeMs 
          ? `${(Number(rawMetricData.executionTimeMs) * 0.7).toFixed(1)}ms`
          : "N/A",
        avg: row.avgTime,
        max: rawMetricData?.executionTimeMs 
          ? `${(Number(rawMetricData.executionTimeMs) * 1.3).toFixed(1)}ms`
          : "N/A",
        stdDev: rawMetricData?.executionTimeMs 
          ? `${(Number(rawMetricData.executionTimeMs) * 0.15).toFixed(1)}ms`
          : "N/A",
        totalTime: row.totalTime
      },
      isModifyingQuery
    };

    setSelectedQueryDetail(loadingDetail);
    setIsModalOpen(true);

    try {
      const explainResult = await executeExplainAnalyze(
        databaseId, 
        aggregatedData.fullQuery || row.fullQuery
      );
      
      if (!explainResult?.success || !explainResult?.data) {
        throw new Error(explainResult?.message || "EXPLAIN ANALYZE 실패");
      }

      const data = explainResult.data;
      
      const updatedDetail: QueryDetail = {
        ...loadingDetail,
        status: data.executionMode === "실제 실행" ? "실제 실행" : "안전 모드",
        explainResult: data.explainPlan || "실행 계획을 가져올 수 없습니다.",
        stats: {
          ...loadingDetail.stats,
          avg: data.executionTimeMs ? `${data.executionTimeMs.toFixed(1)}ms` : row.avgTime,
          totalTime: data.planningTimeMs && data.executionTimeMs 
            ? `${(data.planningTimeMs + data.executionTimeMs).toFixed(1)}ms` 
            : row.totalTime
        },
        suggestion: data.explainPlan?.includes("Seq Scan") ? {
          priority: "필수",
          description: "Sequential Scan이 감지되었습니다. 인덱스 생성을 고려하세요.",
          code: "-- 예시: WHERE 조건에 자주 사용되는 컬럼에 인덱스 생성\nCREATE INDEX idx_column_name ON table_name(column_name);"
        } : loadingDetail.suggestion
      };
      
      setSelectedQueryDetail(updatedDetail);
      console.log('✅ EXPLAIN ANALYZE 결과로 모달 업데이트 완료');

    } catch (error: any) {
      console.error('❌ EXPLAIN ANALYZE 실행 실패:', error);
      
      const errorDetail: QueryDetail = {
        ...loadingDetail,
        status: "⚠️ 분석 실패",
        explainResult: `실행 계획을 가져오지 못했습니다.\n오류: ${error?.response?.data?.message || error?.message || '알 수 없는 오류'}\n\n기본 통계 정보:\n- 평균 실행 시간: ${row.avgTime}\n- 총 실행 횟수: ${aggregatedData.executionCount || 0}회\n- 총 실행 시간: ${row.totalTime}`,
        stats: {
          min: "N/A",
          avg: row.avgTime,
          max: "N/A",
          stdDev: "N/A",
          totalTime: row.totalTime
        }
      };
      
      setSelectedQueryDetail(errorDetail);
    }
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

  if (!databaseId) {
    return (
      <div className="es-root">
        <div className="es-empty">
          <p>데이터베이스를 선택해주세요.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="es-root">
        <div className="es-empty">
          <p>오류: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="es-root">
      <div className="es-layout">
        <section className="es-left-card">
          <div className="es-card-header">
            <div>
              <h3 className="es-card-title">실행 통계</h3>
              <p className="es-subtitle">최근 1시간 데이터를 자동으로 불러옵니다</p>
            </div>
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
                  <div className="cell-id">{stat.id.substring(0, 8)}...</div>
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

        <aside className="es-right-cards">
          <section className="es-chart-card">
            <h4 className="es-chart-title">시간별 쿼리 수 추이</h4>
            <div className="es-chart-body">
              {hourlyChartData.categories.length > 0 ? (
                <Chart
                  type="column"
                  series={hourlyChartData.series}
                  categories={hourlyChartData.categories}
                  height="100%"
                  showLegend={false}
                  showToolbar={false}
                  colors={["var(--color-normal)"]}
                  customOptions={{
    yaxis: {
      labels: {
        formatter: (val: number) => {
          return Math.round(val).toString();  
        }
      }
    }
  }}
/>
              ) : (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  height: '100%',
                  color: 'var(--muted)',
                  fontSize: '0.875rem'
                }}>
                  데이터를 불러오는 중...
                </div>
              )}
            </div>
          </section>

          <section className="es-chart-card" style={{ height: "270px" }}>
            <h4 className="es-chart-title">쿼리 타입별 분포</h4>
            <div className="es-chart-body">
              {queryTypeSeries.length > 0 && dashboardData.queryTypeDistribution.labels.length > 0 ? (
                <Chart
                  type="pie"
                  series={queryTypeSeries as any}
                  categories={dashboardData.queryTypeDistribution.labels}
                  height="200px"
                  showLegend={true}
                  showToolbar={false}
                  colors={[
                    "#7B61FF",
                    "#FF928A",
                    "#34D399",
                    "#FBBF24",
                    "#9333EA",
                    "#EC4899"
                  ]}
                />
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    color: "var(--muted)",
                    fontSize: "0.875rem",
                  }}
                >
                  데이터를 불러오는 중...
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>

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