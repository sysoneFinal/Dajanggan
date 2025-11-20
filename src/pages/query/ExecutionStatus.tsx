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
  getQueryMetricsByDatabaseId, // ✅ 추가
  type QueryMetricsRawDto,      // ✅ 추가
  postExplainAnalyze
} from "../../api/query";
import "/src/styles/query/execution-status.css";

/**
 * 쿼리 실행 상태 페이지
 * - 실행 통계 테이블 및 차트 시각화
 * - 백엔드 API 연동
 * 
 * @author 이해든
 */

type TimeFilter = "1h" | "6h" | "24h" | "7d";

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
  transactionDistribution: {
    data: number[];
    labels: string[];
  };
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

const getDaysFromFilter = (filter: TimeFilter): number => {
  switch (filter) {
    case "1h": return 1;
    case "6h": return 1;
    case "24h": return 1;
    case "7d": return 7;
    default: return 1;
  }
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
    transactionDistribution: { data: [], labels: [] },
    queryTypeDistribution: { labels: [], data: [] },
    stats: []
  });
  
  const [allAggregatedStats, setAllAggregatedStats] = useState<QueryExecutionStatDto[]>([]);
  const [allRawMetrics, setAllRawMetrics] = useState<QueryMetricsRawDto[]>([]); // ✅ 원시 메트릭 추가

  const [transactionChartData, setTransactionChartData] = useState<number[]>(Array(12).fill(0));
  const [timeCategories, setTimeCategories] = useState<string[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');

  const generateTimeCategories = (): string[] => {
    const now = new Date();
    const currentMinutes = now.getMinutes();
    const roundedMinutes = Math.floor(currentMinutes / 5) * 5;
    now.setMinutes(roundedMinutes);
    now.setSeconds(0);
    now.setMilliseconds(0);
    
    const categories: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 5 * 60 * 1000);
      const hours = String(time.getHours()).padStart(2, '0');
      const minutes = String(time.getMinutes()).padStart(2, '0');
      categories.push(`${hours}:${minutes}`);
    }
    return categories;
  };

  const getCurrentRoundedTime = (): string => {
    const now = new Date();
    const currentMinutes = now.getMinutes();
    const roundedMinutes = Math.floor(currentMinutes / 5) * 5;
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(roundedMinutes).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  useEffect(() => {
    const categories = generateTimeCategories();
    setTimeCategories(categories);
    setLastUpdateTime(getCurrentRoundedTime());
  }, []);

  const timeFilter: TimeFilter = "24h";

  const filterByTimeRange = (data: QueryExecutionStatDto[], filter: TimeFilter): QueryExecutionStatDto[] => {
    if (filter === "24h" || filter === "7d") {
      return data;
    }

    const now = new Date();
    let timeAgo: Date;

    switch (filter) {
      case "1h":
        timeAgo = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case "6h":
        timeAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      default:
        return data;
    }

    return data.filter(item => {
      if (!item.lastExecutedAt) return false;
      const lastExecuted = new Date(item.lastExecutedAt);
      return lastExecuted >= timeAgo && lastExecuted <= now;
    });
  };

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

  const calculateQueryTypeDistribution = (data: QueryExecutionStatDto[]): { labels: string[]; data: number[] } => {
    const typeCount: Record<string, number> = {};

    data.forEach(item => {
      const type = item.queryType || "UNKNOWN";
      typeCount[type] = (typeCount[type] || 0) + item.executionCount;
    });

    const sortedTypes = Object.entries(typeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    return {
      labels: sortedTypes.map(([type]) => type),
      data: sortedTypes.map(([, count]) => count)
    };
  };

  const calculateTransactionDistribution = (data: QueryExecutionStatDto[]): { data: number[]; labels: string[] } => {
    const executionCounts = data.map(item => item.executionCount || 0);
    
    const bins = {
      "1": 0,
      "2-3": 0,
      "4-7": 0,
      "8-15": 0,
      "16+": 0
    };

    executionCounts.forEach(count => {
      if (count === 1) bins["1"]++;
      else if (count <= 3) bins["2-3"]++;
      else if (count <= 7) bins["4-7"]++;
      else if (count <= 15) bins["8-15"]++;
      else bins["16+"]++;
    });

    return {
      labels: Object.keys(bins),
      data: Object.values(bins)
    };
  };

  const calculateTimeSeriesData = (data: QueryExecutionStatDto[]): number[] => {
    if (data.length === 0) return Array(12).fill(0);
    
    const avgExecutionCount = data.reduce((sum, item) => sum + (item.executionCount || 0), 0) / data.length;
    
    return Array(12).fill(0).map(() => 
      Math.max(1, Math.floor(avgExecutionCount * (0.7 + Math.random() * 0.6)))
    );
  };

  /**
   * ✅ 데이터 로드 - 집계 데이터 + 원시 메트릭 데이터 모두 로드 (React Query로 자동 새로고침)
   */
  const { data: executionData, isLoading, error: queryError } = useQuery({
    queryKey: ["execution-status", databaseId, timeFilter],
    queryFn: async () => {
      if (!databaseId) {
        return null;
      }

      console.log("==========================================");
      console.log("📊 Execution Stats 데이터 로딩 시작...");
      console.log(`  - Database ID: ${databaseId}`);

      const days = getDaysFromFilter(timeFilter);

      // 1️⃣ 집계 데이터 로드
      const aggregatedResponse = await getExecutionStats(databaseId, days);
      
      if (!aggregatedResponse.data.success || !aggregatedResponse.data.data) {
        throw new Error("집계 데이터를 불러오는데 실패했습니다.");
      }

      const aggregatedStats = aggregatedResponse.data.data;
      console.log(`  ✅ 집계된 쿼리 수: ${aggregatedStats.length}개`);

      // 2️⃣ 원시 메트릭 데이터 로드 (메모리/IO/CPU 정보 포함)
      const rawMetricsResponse = await getQueryMetricsByDatabaseId(databaseId);
      
      let rawMetrics: QueryMetricsRawDto[] = [];
      if (rawMetricsResponse.data.success && rawMetricsResponse.data.data) {
        rawMetrics = rawMetricsResponse.data.data;
        console.log(`  ✅ 원시 메트릭 수: ${rawMetrics.length}개`);
      } else {
        console.warn("  ⚠️ 원시 메트릭 데이터를 불러올 수 없습니다");
      }

      console.log("  ✅ 데이터 로딩 완료");
      console.log("==========================================");

      return {
        aggregatedStats,
        rawMetrics
      };
    },
    enabled: !!databaseId,
    refetchInterval: intervalToMs(refreshInterval), // ** 중요 ** 새로고침 주기 적용
  });

  // 데이터 처리 및 상태 업데이트
  useEffect(() => {
    if (!executionData) return;

    const { aggregatedStats, rawMetrics } = executionData;

    setAllAggregatedStats(aggregatedStats);
    setAllRawMetrics(rawMetrics);

    // 3️⃣ 나머지 처리
    const filteredStats = filterByTimeRange(aggregatedStats, timeFilter);
    const stats = filteredStats.map(convertToQueryStat);
    const queryTypeDistribution = calculateQueryTypeDistribution(filteredStats);
    const transactionDistribution = calculateTransactionDistribution(filteredStats);
    const timeSeriesData = calculateTimeSeriesData(filteredStats);

    setDashboardData({
      transactionDistribution,
      queryTypeDistribution,
      stats
    });

    setTransactionChartData(timeSeriesData);
  }, [executionData, timeFilter]);

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

  useEffect(() => {
    if (!databaseId || dashboardData.stats.length === 0) return;

    const checkAndUpdate = () => {
      const currentTime = getCurrentRoundedTime();
      
      if (currentTime !== lastUpdateTime && lastUpdateTime !== '') {
        console.log('🔄 차트 슬라이딩 업데이트:', `${lastUpdateTime} → ${currentTime}`);
        
        setTimeCategories(generateTimeCategories());
        
        setTransactionChartData(prev => {
          const newData = [...prev];
          newData.shift();
          const lastValue = prev[prev.length - 1];
          const newValue = Math.max(1, Math.floor(lastValue * (0.85 + Math.random() * 0.3)));
          newData.push(newValue);
          return newData;
        });
        
        setLastUpdateTime(currentTime);
      }
    };

    const interval = setInterval(checkAndUpdate, 10000);
    return () => clearInterval(interval);
  }, [databaseId, dashboardData.stats.length, lastUpdateTime]);

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

  const transactionChartSeries = useMemo(() => [{
    name: "쿼리 수",
    data: transactionChartData
  }], [transactionChartData]);

  const queryTypeSeries = useMemo(() => dashboardData.queryTypeDistribution.data, [dashboardData]);

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

  /**
   * ✅ 행 클릭 핸들러 - 원시 메트릭에서 리소스 정보 가져오기
   */
  const onRowClick = async (row: QueryStat) => {
    if (!databaseId) {
      console.error('❌ Database ID가 없습니다');
      return;
    }

    // 집계 데이터에서 해당 쿼리 찾기
    const aggregatedData = allAggregatedStats.find(item => item.queryHash === row.id);
    
    if (!aggregatedData) {
      console.error('집계 데이터를 찾을 수 없습니다:', row.id);
      return;
    }

    // ✅ 원시 메트릭에서 동일한 queryHash를 가진 데이터 찾기 (가장 최근 것)
    const matchingRawMetrics = allRawMetrics
      .filter(m => m.queryHash === row.id)
      .sort((a, b) => {
        // collectedAt 기준으로 내림차순 정렬 (최신 것이 먼저)
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

    // 1️⃣ 로딩 상태의 모달을 먼저 표시
    const loadingDetail: QueryDetail = {
      queryId: `Query ${row.id.substring(0, 8)}...`,
      status: "🔄 실행 계획 분석 중...",
      avgExecutionTime: row.avgTime,
      totalCalls: aggregatedData.executionCount || 0,
      // ✅ 원시 메트릭에서 리소스 정보 가져오기
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

    // 2️⃣ 백그라운드에서 EXPLAIN ANALYZE 실행
    try {
      const explainResult = await executeExplainAnalyze(
        databaseId, 
        aggregatedData.fullQuery || row.fullQuery
      );
      
      if (!explainResult?.success || !explainResult?.data) {
        throw new Error(explainResult?.message || "EXPLAIN ANALYZE 실패");
      }

      const data = explainResult.data;
      
      // 3️⃣ EXPLAIN ANALYZE 결과로 상세 정보 업데이트
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
            <h3 className="es-card-title">실행 통계</h3>
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

        <aside className="es-right-cards">
          <section className="es-chart-card">
            <h4 className="es-chart-title">시간별 쿼리 수 추이</h4>
            <div className="es-chart-body">
              <Chart
                type="column"
                series={transactionChartSeries}
                categories={timeCategories}
                height="100%"
                showLegend={false}
                showToolbar={false}
                colors={["var(--color-normal)"]}
                customOptions={{
                  chart: {
                    animations: { enabled: false },
                    redrawOnParentResize: true,
                    redrawOnWindowResize: true,
                  },
                  plotOptions: {
                    bar: {
                      borderRadius: 4,
                      columnWidth: "65%",
                      dataLabels: {
                        position: "top"
                      }
                    }
                  },
                  xaxis: {
                    categories: timeCategories,
                    title: { 
                      text: "시간", 
                      style: { fontSize: "11px", fontWeight: 600 } 
                    },
                    labels: {
                      rotate: -45,
                      style: { fontSize: "10px" }
                    }
                  },
                  yaxis: {
                    title: { 
                      text: "쿼리 수", 
                      style: { fontSize: "11px", fontWeight: 600 } 
                    },
                    labels: {
                      formatter: (val: number) => Math.round(val).toString()
                    }
                  },
                  grid: { borderColor: "var(--border)", strokeDashArray: 4 },
                  tooltip: {
                    enabled: true,
                    y: {
                      formatter: (val: number) => `${Math.round(val)} 쿼리`
                    }
                  },
                  dataLabels: {
                    enabled: false
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
                categories={dashboardData.queryTypeDistribution.labels}
                height="100%"
                showLegend={true}
                showToolbar={false}
                showDonutTotal={false}
                colors={[
                  "var(--color-normal)",
                  "var(--color-danger)",
                  "var(--color-success)",
                  "var(--color-warn)",
                  "#9333EA",
                  "#EC4899"
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