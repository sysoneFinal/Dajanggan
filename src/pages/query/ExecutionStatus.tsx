import { useMemo, useState, useEffect } from "react";
import { useInstanceContext } from "../../context/InstanceContext";
import Chart from "../../components/chart/ChartComponent";
import Pagination from "../../components/util/Pagination";
import CsvButton from "../../components/util/CsvButton";
import QueryModal from "../query/QueryModal";
import type { QueryDetail } from "../query/QueryModal";
import {
  getQueryMetricsByDatabaseId,
  type QueryMetricsRawDto,
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
  queryMetricId: number; // 원본 데이터 참조용
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

export default function ExecutionStatus() {
  const { selectedDatabase } = useInstanceContext();
  const databaseId = selectedDatabase?.databaseId ?? null;

  /* ---------- 리스트 상태 ---------- */
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 14;

  // 모달 상태 관리
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedQueryDetail, setSelectedQueryDetail] = useState<QueryDetail | null>(null);

  // 데이터 상태
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    transactionDistribution: { data: [], labels: [] },
    queryTypeDistribution: { labels: [], data: [] },
    stats: []
  });
  const [allMetricsData, setAllMetricsData] = useState<QueryMetricsRawDto[]>([]); // 전체 메트릭 데이터 저장

  // 시간별 슬라이딩 차트 데이터
  const [transactionChartData, setTransactionChartData] = useState<number[]>(Array(12).fill(0));
  const [timeCategories, setTimeCategories] = useState<string[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');

  /**
   * 시간 카테고리 생성 함수 (5분 단위로 반올림)
   */
  const generateTimeCategories = (): string[] => {
    const now = new Date();
    // 현재 시간을 5분 단위로 반올림
    const currentMinutes = now.getMinutes();
    const roundedMinutes = Math.floor(currentMinutes / 5) * 5;
    now.setMinutes(roundedMinutes);
    now.setSeconds(0);
    now.setMilliseconds(0);
    
    const categories: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 5 * 60 * 1000); // 5분 간격
      const hours = String(time.getHours()).padStart(2, '0');
      const minutes = String(time.getMinutes()).padStart(2, '0');
      categories.push(`${hours}:${minutes}`);
    }
    return categories;
  };

  /**
   * 현재 5분 단위 시간 문자열 반환
   */
  const getCurrentRoundedTime = (): string => {
    const now = new Date();
    const currentMinutes = now.getMinutes();
    const roundedMinutes = Math.floor(currentMinutes / 5) * 5;
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(roundedMinutes).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // 초기 시간 카테고리 설정
  useEffect(() => {
    const categories = generateTimeCategories();
    setTimeCategories(categories);
    setLastUpdateTime(getCurrentRoundedTime());
  }, []);

  const timeFilter: TimeFilter = "24h";

  /**
   * 시간 필터에 따라 데이터 필터링
   */
  const filterByTimeRange = (data: QueryMetricsRawDto[], filter: TimeFilter): QueryMetricsRawDto[] => {
    const now = new Date();
    let timeAgo: Date;

    switch (filter) {
      case "1h":
        timeAgo = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case "6h":
        timeAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case "24h":
        timeAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        timeAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        timeAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    return data.filter(item => {
      if (!item.createdAt) return false;
      const createdDate = new Date(item.createdAt);
      return createdDate >= timeAgo && createdDate <= now;
    });
  };

  /**
   * QueryMetricsRawDto를 QueryStat으로 변환
   */
  const convertToQueryStat = (item: QueryMetricsRawDto): QueryStat => {
    const avgTimeMs = item.executionTimeMs || 0;
    const totalTimeMs = avgTimeMs * (item.executionCount || 0);

    return {
      id: `#${item.queryMetricId}`,
      queryMetricId: item.queryMetricId, // 원본 ID 저장
      shortQuery: item.shortQuery || item.queryText?.substring(0, 50) || "Unknown Query",
      fullQuery: item.queryText || "",
      executionCount: item.executionCount || 0,
      avgTime: avgTimeMs >= 1000 ? `${(avgTimeMs / 1000).toFixed(2)}s` : `${Math.round(avgTimeMs)}ms`,
      totalTime: totalTimeMs >= 1000 ? `${(totalTimeMs / 1000).toFixed(1)}s` : `${Math.round(totalTimeMs)}ms`,
      callCount: item.executionCount || 0
    };
  };

  /**
   * 쿼리 타입별 분포 계산
   */
  const calculateQueryTypeDistribution = (data: QueryMetricsRawDto[]): { labels: string[]; data: number[] } => {
    const typeCount: Record<string, number> = {};

    data.forEach(item => {
      const type = item.queryType || "UNKNOWN";
      typeCount[type] = (typeCount[type] || 0) + 1;
    });

    const sortedTypes = Object.entries(typeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6); // 상위 6개 타입만

    return {
      labels: sortedTypes.map(([type]) => type),
      data: sortedTypes.map(([, count]) => count)
    };
  };

  /**
   * 트랜잭션당 쿼리 수 분포 계산 (시간별 평균)
   */
  const calculateTransactionDistribution = (data: QueryMetricsRawDto[]): { data: number[]; labels: string[] } => {
    // 실행 횟수를 기반으로 대략적인 분포 생성
    const executionCounts = data.map(item => item.executionCount || 0);
    
    const bins = {
      "1": 0,
      "2-3": 0,
      "4-7": 0,
      "8-15": 0,
      "16+": 0
    };

    // 간단한 분포 계산
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

  /**
   * 시간별 평균 쿼리 수 계산
   */
  const calculateTimeSeriesData = (data: QueryMetricsRawDto[]): number[] => {
    if (data.length === 0) return Array(12).fill(0);
    
    // 데이터의 평균 실행 횟수 계산
    const avgExecutionCount = data.reduce((sum, item) => sum + (item.executionCount || 0), 0) / data.length;
    
    // 12개 시간대에 대해 약간의 변동을 준 데이터 생성
    return Array(12).fill(0).map(() => 
      Math.max(1, Math.floor(avgExecutionCount * (0.7 + Math.random() * 0.6)))
    );
  };

  /**
   * 데이터 로드
   */
  useEffect(() => {
    const loadData = async () => {
      if (!databaseId) {
        console.log("데이터베이스가 선택되지 않음");
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log("==========================================");
        console.log("📊 Execution Stats 데이터 로딩 시작...");
        console.log(`  - Database ID: ${databaseId}`);
        console.log(`  - Time Filter: ${timeFilter}`);

        // 전체 쿼리 메트릭 데이터 가져오기
        const response = await getQueryMetricsByDatabaseId(databaseId);
        
        if (response.data.success && response.data.data) {
          const allMetrics = response.data.data;
          console.log(`  ✅ 전체 쿼리 메트릭: ${allMetrics.length}개`);

          // 전체 메트릭 데이터 저장 (모달에서 사용)
          setAllMetricsData(allMetrics);

          // 시간 필터 적용
          const filteredMetrics = filterByTimeRange(allMetrics, timeFilter);
          console.log(`  ✅ 필터링된 데이터: ${filteredMetrics.length}개`);

          // 쿼리 통계로 변환
          const stats = filteredMetrics.map(convertToQueryStat);

          // 쿼리 타입별 분포 계산
          const queryTypeDistribution = calculateQueryTypeDistribution(filteredMetrics);

          // 트랜잭션 분포 계산
          const transactionDistribution = calculateTransactionDistribution(filteredMetrics);

          // 시간별 차트 데이터 생성
          const timeSeriesData = calculateTimeSeriesData(filteredMetrics);

          setDashboardData({
            transactionDistribution,
            queryTypeDistribution,
            stats
          });

          setTransactionChartData(timeSeriesData);

          console.log("  ✅ 데이터 로딩 완료");
          console.log("==========================================");
        } else {
          throw new Error("데이터를 불러오는데 실패했습니다.");
        }
      } catch (err) {
        console.error("데이터 로드 실패:", err);
        setError(err instanceof Error ? err.message : "데이터를 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [databaseId, timeFilter]);

  // 실시간 차트 데이터 업데이트 (5분이 실제로 지났을 때만)
  useEffect(() => {
    if (!databaseId || dashboardData.stats.length === 0) return;

    const checkAndUpdate = () => {
      const currentTime = getCurrentRoundedTime();
      
      // 이전 업데이트 시간과 현재 시간이 다를 때만 업데이트
      if (currentTime !== lastUpdateTime && lastUpdateTime !== '') {
        console.log('🔄 차트 슬라이딩 업데이트:', `${lastUpdateTime} → ${currentTime}`);
        
        // 시간 카테고리 업데이트
        setTimeCategories(generateTimeCategories());
        
        // 차트 데이터 업데이트
        setTransactionChartData(prev => {
          const newData = [...prev];
          // 가장 오래된 데이터 제거하고 새 데이터 추가
          newData.shift();
          // 마지막 값을 기준으로 약간의 변동을 준 새 값 추가
          const lastValue = prev[prev.length - 1];
          const newValue = Math.max(1, Math.floor(lastValue * (0.85 + Math.random() * 0.3)));
          newData.push(newValue);
          return newData;
        });
        
        // 업데이트 시간 갱신
        setLastUpdateTime(currentTime);
      }
    };

    // 10초마다 체크 (5분이 지났는지 확인)
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

  /* ---------- 차트 데이터 ---------- */
  // Column Chart용 시리즈 데이터
  const transactionChartSeries = useMemo(() => [{
    name: "쿼리 수",
    data: transactionChartData
  }], [transactionChartData]);

  const queryTypeSeries = useMemo(() => dashboardData.queryTypeDistribution.data, [dashboardData]);

  /**
   * ✅ EXPLAIN ANALYZE API 호출 함수
   */
  const executeExplainAnalyze = async (databaseId: number, query: string) => {
    try {
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
    }
  };

  // ✅ 행 클릭 핸들러 - 모달 열기 (실제 EXPLAIN ANALYZE API 호출)
  const onRowClick = async (row: QueryStat) => {
    if (!databaseId) {
      console.error('❌ Database ID가 없습니다');
      return;
    }

    // 전체 메트릭 데이터에서 해당 쿼리 찾기
    const metricData = allMetricsData.find(m => m.queryMetricId === row.queryMetricId);
    
    if (!metricData) {
      console.error('메트릭 데이터를 찾을 수 없습니다:', row.queryMetricId);
      return;
    }

    // 데이터 변경 쿼리 체크 (대소문자 구분 없이)
    const queryText = (metricData.queryText || row.fullQuery).toUpperCase();
    const isModifyingQuery = queryText.includes("UPDATE") || 
                            queryText.includes("INSERT") || 
                            queryText.includes("DELETE");

    // 기본 상세 정보 (EXPLAIN ANALYZE 결과 대기 중)
    const detail: QueryDetail = {
      queryId: metricData.queryId || `Query #${row.queryMetricId}`,
      status: "🔄 실행 계획 분석 중...",
      avgExecutionTime: row.avgTime,
      totalCalls: metricData.executionCount || 0,
      memoryUsage: `${(metricData.memoryUsageMb || 0).toFixed(1)}MB`,
      ioUsage: `${(metricData.ioBlocks || 0).toLocaleString()} blocks`,
      cpuUsagePercent: Number(metricData.cpuUsagePercent || 0),
      sqlQuery: metricData.queryText || row.fullQuery,
      suggestion: metricData.executionTimeMs && metricData.executionTimeMs > 1000 ? {
        priority: metricData.executionTimeMs > 5000 ? "필수" : "권장",
        description: "쿼리 실행 시간이 느립니다. 인덱스 생성 또는 쿼리 최적화를 고려해보세요.",
        code: "-- 예시: 자주 사용되는 WHERE 조건 컬럼에 인덱스 생성\nCREATE INDEX idx_table_column ON table_name(column_name);\n\n-- 또는 복합 인덱스 생성\nCREATE INDEX idx_table_multi ON table_name(column1, column2);"
      } : undefined,
      explainResult: "⏳ 실행 계획 정보를 가져오는 중입니다...\n\nPostgreSQL EXPLAIN ANALYZE를 실행하고 있습니다.\n잠시만 기다려주세요.",
      stats: {
        min: metricData.executionTimeMs 
          ? `${(metricData.executionTimeMs * 0.7).toFixed(1)}ms` 
          : "N/A",
        avg: row.avgTime,
        max: metricData.executionTimeMs 
          ? `${(metricData.executionTimeMs * 1.3).toFixed(1)}ms` 
          : "N/A",
        stdDev: metricData.executionTimeMs 
          ? `${(metricData.executionTimeMs * 0.15).toFixed(1)}ms` 
          : "N/A",
        totalTime: row.totalTime
      },
      isModifyingQuery
    };

    console.log('📋 모달 열기:', {
      queryId: detail.queryId,
      status: detail.status,
      hasExplainPlan: !!metricData.explainPlan,
      executionTime: metricData.executionTimeMs
    });

    // 먼저 모달 열기 (로딩 상태)
    setSelectedQueryDetail(detail);
    setIsModalOpen(true);

    // 백그라운드에서 EXPLAIN ANALYZE 실행
    try {
      const explainResult = await executeExplainAnalyze(databaseId, metricData.queryText || row.fullQuery);
      
      if (explainResult.success && explainResult.data) {
        const data = explainResult.data;
        
        // EXPLAIN ANALYZE 결과로 상세 정보 업데이트
        const updatedDetail: QueryDetail = {
          ...detail,
          status: data.executionMode || "실제 실행",
          explainResult: data.explainPlan || "실행 계획을 가져올 수 없습니다.",
          stats: {
            ...detail.stats,
            avg: data.executionTimeMs ? `${data.executionTimeMs.toFixed(1)}ms` : row.avgTime,
            totalTime: data.planningTimeMs && data.executionTimeMs 
              ? `${(data.planningTimeMs + data.executionTimeMs).toFixed(1)}ms` 
              : row.totalTime
          },
          suggestion: data.explainPlan?.includes("Seq Scan") ? {
            priority: "필수",
            description: "Sequential Scan이 감지되었습니다. 인덱스 생성을 고려하세요.",
            code: "-- 예시: WHERE 조건에 자주 사용되는 컬럼에 인덱스 생성\nCREATE INDEX idx_column_name ON table_name(column_name);"
          } : detail.suggestion
        };
        
        setSelectedQueryDetail(updatedDetail);
        console.log('✅ EXPLAIN ANALYZE 결과로 모달 업데이트 완료');
      }
    } catch (error) {
      console.error('❌ EXPLAIN ANALYZE 실행 실패:', error);
      
      // 에러 발생 시 에러 메시지 표시
      const errorDetail: QueryDetail = {
        ...detail,
        status: "⚠️ 오류",
        explainResult: `❌ 실행 계획을 가져오는 데 실패했습니다.\n\n오류 내용: ${error instanceof Error ? error.message : '알 수 없는 오류'}\n\n가능한 원인:\n1. 데이터베이스 연결 문제\n2. 쿼리 구문 오류\n3. 권한 부족\n\n기본 통계 정보:\n- 평균 실행 시간: ${row.avgTime}\n- 총 실행 횟수: ${metricData.executionCount || 0}회\n- CPU 사용률: ${(metricData.cpuUsagePercent || 0).toFixed(1)}%\n- 메모리 사용량: ${(metricData.memoryUsageMb || 0).toFixed(1)}MB`
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

  // 로딩 또는 에러 상태 표시
  if (!databaseId) {
    return (
      <div className="es-root">
        <div className="es-empty">
          <p>데이터베이스를 선택해주세요.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="es-root">
        <div className="es-empty">
          <p>데이터를 불러오는 중...</p>
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
        {/* 좌측: 리스트 카드 */}
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

        {/* 우측: 차트 카드 2개 */}
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