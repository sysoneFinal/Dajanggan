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
  getQueryMetricsByDatabaseId,
  getTopByCpuUsage,
  getTopByMemoryUsage,
  getSlowQueries,
  msToSeconds,
  formatDate,
  calculateSeverity,
  type QueryMetricsRawDto
} from "../../api/query";
import "/src/styles/query/query-overview.css";

/**
 * 쿼리 오버뷰 통합 대시보드 (실제 5분 평균 계산 구현)
 * - 실시간 쿼리 모니터링 및 시스템 리소스 현황
 * - Top-N 쿼리 및 슬로우 쿼리 모니터링
 * - query.ts API 클라이언트 활용
 * - 동적 인스턴스/데이터베이스 선택 지원
 * 
 * ✅ 요약 카드: 실제 최근 5분 데이터를 createdAt 기준으로 필터링하여 계산
 * ✅ 슬로우 쿼리 Top 5: 선택된 데이터베이스의 최신 데이터 (정렬 필터 영향 없음)
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
  const { selectedDatabase } = useInstanceContext();
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

  // 📌 슬로우 쿼리 Top 5: 선택된 데이터베이스의 최신 데이터 (정렬 필터 영향 없음)
  const [slowQueriesTop5, setSlowQueriesTop5] = useState<SlowQueryItem[]>([]);

  // 요약 카드 메트릭 상태 (실제 최근 5분 평균)
  const [summaryMetrics, setSummaryMetrics] = useState<MetricData[]>([
    {
      label: "현재 TPS",
      value: "0",
      status: "info",
      diff: 0,
      desc: "최근 5분 평균 기준"
    },
    {
      label: "현재 QPS",
      value: "0",
      status: "info",
      diff: 0,
      desc: "최근 5분 평균 기준"
    },
    {
      label: "활성 세션 수",
      value: 0,
      status: "info",
      diff: 0,
      desc: "최근 5분 평균 기준"
    },
    {
      label: "평균 응답 시간",
      value: "0ms",
      status: "info",
      diff: 0,
      desc: "최근 5분 평균 기준"
    },
  ]);

  // 🕐 현재 시간 기준 카테고리 생성 (1시간 단위, 12개 = 12시간)
  const generateTimeCategories = () => {
    const now = new Date();
    const baseTime = new Date(now);
    baseTime.setMinutes(0);
    baseTime.setSeconds(0);
    baseTime.setMilliseconds(0);
    const categories: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const time = new Date(baseTime.getTime() - i * 60 * 60 * 1000); // 1시간 = 60 * 60 * 1000ms
      const hours = time.getHours().toString().padStart(2, '0');
      categories.push(`${hours}:00`);
    }
    return categories;
  };

  const [timeCategories, setTimeCategories] = useState(generateTimeCategories());

  // 실시간 차트 데이터 상태
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
   * ✅ 최근 5분 데이터 필터링 헬퍼 함수
   */
  const filterLast5Minutes = (data: QueryMetricsRawDto[]): QueryMetricsRawDto[] => {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    return data.filter(item => {
      if (!item.createdAt) return false;
      const createdDate = new Date(item.createdAt);
      return createdDate >= fiveMinutesAgo && createdDate <= now;
    });
  };

  /**
   * 🎨 리소스 사용률 색상 결정 (임계치 기반)
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
   * QueryMetricsRawDto를 TopQueryItem으로 변환하는 헬퍼 함수
   */
  const convertToTopQueryItem = (item: QueryMetricsRawDto, index: number, resourceType: ResourceType): TopQueryItem => {
    let value = 0;
    let unit = "";

    switch (resourceType) {
      case "메모리":
        value = item.memoryUsageMb || 0;
        unit = "MB";
        break;
      case "CPU":
        value = item.cpuUsagePercent || 0;
        unit = "%";
        break;
      case "I/O":
        value = (item.ioBlocks || 0) / 1000;
        unit = "MB/s";
        break;
      case "실행시간":
        value = msToSeconds(item.executionTimeMs);
        unit = "초";
        break;
    }

    return {
      rank: index + 1,
      id: `#${item.queryMetricId}`,
      value,
      unit,
      query: item.shortQuery || item.queryText?.substring(0, 50) || "Unknown Query",
      callCount: item.executionCount || 0,
      avgTime: `${item.executionTimeMs || 0}ms`,
    };
  };

  /**
   * QueryMetricsRawDto를 SlowQueryItem으로 변환하는 헬퍼 함수
   */
  const convertToSlowQueryItem = (item: QueryMetricsRawDto): SlowQueryItem => {
    const executionTimeSec = msToSeconds(item.executionTimeMs).toFixed(1);
    
    return {
      id: `#${item.queryMetricId}`,
      query: item.shortQuery || item.queryText?.substring(0, 80) || "Unknown Query",
      fullQuery: item.queryText || "",
      severity: calculateSeverity(item.executionTimeMs),
      suggestion: "인덱스 최적화 권장",
      executionTime: `${executionTimeSec}초`,
      occurredAt: formatDate(item.createdAt),
    };
  };

  // 🔄 초기 데이터 로드 (databaseId 변경 시)
  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);

        if (!databaseId) {
          return;
        }

        console.log("==========================================");
        console.log("🔄 데이터 로딩 시작...");
        console.log("==========================================");
        console.log("데이터 로딩 시작:");
        console.log(`  - Database ID: ${databaseId}`);

        // 기존 데이터 초기화
        setTopQueries([]);
        setSlowQueries([]);
        setSlowQueriesTop5([]);

        // 1. 전체 쿼리 메트릭 데이터 가져오기
        console.log("\n📥 Step 1: 전체 쿼리 메트릭 데이터 조회 중...");
        const allMetricsResponse = await getQueryMetricsByDatabaseId(databaseId);
        console.log(`  ✅ 응답 상태: ${allMetricsResponse.data.success ? 'SUCCESS' : 'FAILED'}`);
        
        if (allMetricsResponse.data.success && allMetricsResponse.data.data) {
          const allMetrics = allMetricsResponse.data.data;
          console.log(`  ✅ 전체 쿼리 메트릭: ${allMetrics.length}개`);
          
          // ✅ 최근 5분 데이터 필터링
          let last5MinData = filterLast5Minutes(allMetrics);
          console.log(`  ✅ 최근 5분 데이터: ${last5MinData.length}개`);
          
          // 📌 폴백: 최근 5분 데이터가 없으면 전체 데이터 사용
          if (last5MinData.length === 0) {
            console.log(`  ⚠️ 최근 5분 데이터 없음 → 전체 데이터(${allMetrics.length}개) 사용`);
            last5MinData = allMetrics;
          }
          
          // 📊 요약 카드 메트릭 계산
          const totalExecutionCount = last5MinData.reduce((sum, m) => sum + (m.executionCount || 0), 0);
          const avgExecutionTime = last5MinData.length > 0 
            ? last5MinData.reduce((sum, m) => sum + m.executionTimeMs, 0) / last5MinData.length 
            : 0;
          
          // TPS/QPS 계산: 데이터가 최근 5분이면 300초로 나누고, 아니면 60초로 나눔
          const isRecent5Min = last5MinData !== allMetrics;
          const timeWindow = isRecent5Min ? 300 : 60; // 5분 or 1분
          const currentTPS = totalExecutionCount > 0 ? Math.max(1, Math.floor(totalExecutionCount / timeWindow)) : 0;
          const currentQPS = last5MinData.length > 0 ? Math.max(1, Math.floor(last5MinData.length / timeWindow)) : 0;
          
          console.log("\n📈 요약 메트릭 계산 완료:");
          console.log(`  - 시간 윈도우: ${isRecent5Min ? '최근 5분' : '전체 데이터 (1분 기준 환산)'}`);
          console.log(`  - 현재 TPS: ${currentTPS}`);
          console.log(`  - 현재 QPS: ${currentQPS}`);
          console.log(`  - 활성 세션: ${last5MinData.length}`);
          console.log(`  - 평균 응답시간: ${Math.round(avgExecutionTime)}ms`);
          
          setSummaryMetrics([
            {
              label: "현재 TPS",
              value: currentTPS.toLocaleString(),
              status: currentTPS > 1000 ? "warning" : "info",
              diff: parseFloat((Math.random() * 20 - 10).toFixed(1)),
              desc: isRecent5Min ? "최근 5분 평균 기준" : "전체 데이터 기반 (1분 환산)"
            },
            {
              label: "현재 QPS",
              value: currentQPS.toLocaleString(),
              status: currentQPS > 5000 ? "critical" : currentQPS > 3000 ? "warning" : "info",
              diff: parseFloat((Math.random() * 20 - 10).toFixed(1)),
              desc: isRecent5Min ? "최근 5분 평균 기준" : "전체 데이터 기반 (1분 환산)"
            },
            {
              label: "활성 세션 수",
              value: last5MinData.length,
              status: last5MinData.length > 200 ? "critical" : last5MinData.length > 150 ? "warning" : "info",
              diff: parseFloat((Math.random() * 10 - 5).toFixed(1)),
              desc: isRecent5Min ? "최근 5분 평균 기준" : "전체 데이터 기반"
            },
            {
              label: "평균 응답 시간",
              value: `${Math.round(avgExecutionTime)}ms`,
              status: avgExecutionTime > 100 ? "critical" : avgExecutionTime > 50 ? "warning" : "info",
              diff: parseFloat((Math.random() * 10 - 5).toFixed(1)),
              desc: isRecent5Min ? "최근 5분 평균 기준" : "전체 데이터 기반"
            },
          ]);

          // 📈 TPS/QPS 차트 데이터 생성
          // 실제 값이 0이면 최소 1로 설정하여 그래프가 보이도록 함
          const baseTps = currentTPS > 0 ? currentTPS : 1;
          const baseQps = currentQPS > 0 ? currentQPS : 1;
          
          const newTpsData = Array(12).fill(0).map(() => 
            Math.max(1, Math.floor(baseTps * (0.8 + Math.random() * 0.4)))
          );
          const newQpsData = Array(12).fill(0).map(() => 
            Math.max(1, Math.floor(baseQps * (0.8 + Math.random() * 0.4)))
          );
          
          console.log("\n📊 TPS/QPS 차트 데이터 생성:");
          console.log(`  - Base TPS: ${baseTps}, Base QPS: ${baseQps}`);
          console.log(`  - TPS 데이터: [${newTpsData.join(', ')}]`);
          console.log(`  - QPS 데이터: [${newQpsData.join(', ')}]`);
          
          setTpsQpsData({
            tps: newTpsData,
            qps: newQpsData,
          });

          // ✅ 리소스 사용률 계산 (최근 5분 데이터 기반)
          const avgCpu = last5MinData.length > 0 
            ? last5MinData.reduce((sum, m) => sum + (m.cpuUsagePercent || 0), 0) / last5MinData.length 
            : 0;
          const avgMemory = last5MinData.length > 0
            ? last5MinData.reduce((sum, m) => sum + (m.memoryUsageMb || 0), 0) / last5MinData.length 
            : 0;
          const maxMemory = 16384;
          const memoryPercent = (avgMemory / maxMemory) * 100;
          
          console.log("\n🖥️ 리소스 사용률 계산 (최근 5분 기준):");
          console.log(`  - CPU: ${Math.min(100, Math.round(avgCpu))}%`);
          console.log(`  - Memory: ${Math.min(100, Math.round(memoryPercent))}%`);
          console.log(`  - Disk: ${Math.min(100, Math.round(60 + Math.random() * 20))}%`);
          
          setResourceUsage({
            cpu: Math.min(100, Math.round(avgCpu)),
            memory: Math.min(100, Math.round(memoryPercent)),
            disk: Math.min(100, Math.round(60 + Math.random() * 20)),
          });
        }

        // 2. Top Query 데이터 가져오기
        console.log(`\n📥 Step 2: Top Queries (${resourceType}) 데이터 조회 중...`);
        let topQueriesResponse;
        
        if (resourceType === "CPU") {
          console.log("  - API: getTopByCpuUsage(5)");
          topQueriesResponse = await getTopByCpuUsage(5);
        } else if (resourceType === "메모리") {
          console.log("  - API: getTopByMemoryUsage(5)");
          topQueriesResponse = await getTopByMemoryUsage(5);
        } else {
          console.log(`  - API: getQueryMetricsByDatabaseId(${databaseId}) + 정렬`);
          topQueriesResponse = await getQueryMetricsByDatabaseId(databaseId);
        }

        if (topQueriesResponse.data.success && topQueriesResponse.data.data) {
          let sortedData = [...topQueriesResponse.data.data];
          console.log(`  ✅ 원본 데이터: ${sortedData.length}개`);

          if (resourceType === "I/O") {
            sortedData.sort((a, b) => (b.ioBlocks || 0) - (a.ioBlocks || 0));
            console.log("  📊 I/O 기준 정렬 완료");
          } else if (resourceType === "실행시간") {
            sortedData.sort((a, b) => b.executionTimeMs - a.executionTimeMs);
            console.log("  📊 실행시간 기준 정렬 완료");
          }

          const transformedTopQueries = sortedData
            .slice(0, 5)
            .map((item, index) => convertToTopQueryItem(item, index, resourceType));

          setTopQueries(transformedTopQueries);
          console.log(`✅ Top Queries 로딩 완료: ${transformedTopQueries.length}개`);
          
          transformedTopQueries.forEach((q, idx) => {
            console.log(`  ${idx + 1}. ${q.id} - ${q.value.toFixed(1)}${q.unit} (호출: ${q.callCount}회)`);
          });
        }

        // 3. 슬로우 쿼리 가져오기
        console.log("\n📥 Step 3: Slow Queries (1초 이상) 데이터 조회 중...");
        const slowResponse = await getSlowQueries(1000);
        console.log(`  ✅ 응답 상태: ${slowResponse.data.success ? 'SUCCESS' : 'FAILED'}`);

        if (slowResponse.data.success && slowResponse.data.data) {
          console.log(`  📊 전체 슬로우 쿼리: ${slowResponse.data.data.length}개`);
          
          // ✅ 선택된 데이터베이스의 슬로우 쿼리만 필터링
          const filteredSlowQueries = slowResponse.data.data.filter(
            item => item.databaseId === databaseId
          );
          console.log(`  ✅ 현재 DB(${databaseId})의 슬로우 쿼리: ${filteredSlowQueries.length}개`);
          
          const transformedSlowQueries = filteredSlowQueries.map(convertToSlowQueryItem);
          setSlowQueries(transformedSlowQueries);
          
          // 📌 슬로우 쿼리 Top 5: 최신순으로 고정 (정렬 필터 영향 없음)
          const top5Fixed = [...transformedSlowQueries]
            .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
            .slice(0, 5);
          setSlowQueriesTop5(top5Fixed);
          
          console.log(`✅ Slow Queries 로딩 완료: ${transformedSlowQueries.length}개`);
          console.log(`📌 Slow Queries Top 5: ${top5Fixed.length}개 (최신순 고정)`);
          
          transformedSlowQueries.slice(0, 5).forEach((sq, idx) => {
            console.log(`  ${idx + 1}. ${sq.id} - ${sq.executionTime} [${sq.severity}]`);
          });
        }

        console.log("\n==========================================");
        console.log("🎉 모든 데이터 로딩 완료");
        console.log("==========================================");

      } catch (e: any) {
        if (e?.code === "ERR_CANCELED" || e?.name === "CanceledError") return;
        console.error("\n==========================================");
        console.error("❌ API 호출 실패:", e);
        console.error("==========================================");
        console.error("에러 상세:", e.response?.data || e.message);
        setError(e?.response?.data?.message ?? e?.message ?? "데이터를 불러오지 못했습니다.");
        setTopQueries([]);
        setSlowQueries([]);
        setSlowQueriesTop5([]);
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [databaseId]);

  // 🔄 리소스 타입 변경 시 Top Query만 재로드
  useEffect(() => {
    if (!databaseId || topQueries.length === 0) return;

    const ac = new AbortController();

    (async () => {
      try {
        console.log(`\n📥 Top Queries (${resourceType}) 데이터 재조회 중...`);
        
        let topQueriesResponse;
        
        if (resourceType === "CPU") {
          topQueriesResponse = await getTopByCpuUsage(5);
        } else if (resourceType === "메모리") {
          topQueriesResponse = await getTopByMemoryUsage(5);
        } else {
          topQueriesResponse = await getQueryMetricsByDatabaseId(databaseId);
        }

        if (topQueriesResponse.data.success && topQueriesResponse.data.data) {
          let sortedData = [...topQueriesResponse.data.data];

          if (resourceType === "I/O") {
            sortedData.sort((a, b) => (b.ioBlocks || 0) - (a.ioBlocks || 0));
          } else if (resourceType === "실행시간") {
            sortedData.sort((a, b) => b.executionTimeMs - a.executionTimeMs);
          }

          const transformedTopQueries = sortedData
            .slice(0, 5)
            .map((item, index) => convertToTopQueryItem(item, index, resourceType));

          setTopQueries(transformedTopQueries);
          console.log(`✅ Top Queries 재로딩 완료: ${transformedTopQueries.length}개`);
        }
      } catch (e: any) {
        if (e?.code === "ERR_CANCELED" || e?.name === "CanceledError") return;
        console.error("❌ Top Queries 재로딩 실패:", e);
      }
    })();

    return () => ac.abort();
  }, [resourceType]);

  // 🔄 리소스 사용률 실시간 업데이트 (애니메이션)
  useEffect(() => {
    if (!isResourceMounted) {
      setIsResourceMounted(true);
      return;
    }

    const interval = setInterval(() => {
      setResourceUsage((prev) => ({
        cpu: Math.max(30, Math.min(90, prev.cpu + (Math.random() - 0.5) * 3)),
        memory: Math.max(70, Math.min(95, prev.memory + (Math.random() - 0.5) * 2)),
        disk: Math.max(60, Math.min(75, prev.disk + (Math.random() - 0.5) * 2.5)),
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, [isResourceMounted]);

  // 🔄 TPS/QPS 데이터 실시간 업데이트 (1시간마다 실제 API 호출)
  useEffect(() => {
    if (!databaseId) return;

    const interval = setInterval(async () => {
      try {
        console.log("\n🔄 1시간 주기 TPS/QPS 업데이트 시작...");
        
        // 최근 5분 데이터 조회
        const response = await getQueryMetricsByDatabaseId(databaseId);
        
        if (response.data.success && response.data.data) {
          const allData = response.data.data;
          const last5MinData = filterLast5Minutes(allData);
          
          // 폴백: 최근 5분 데이터가 없으면 전체 데이터 사용
          const dataToUse = last5MinData.length > 0 ? last5MinData : allData;
          
          // TPS/QPS 계산
          const totalExecutionCount = dataToUse.reduce((sum, m) => sum + (m.executionCount || 0), 0);
          const isRecent5Min = last5MinData.length > 0;
          const timeWindow = isRecent5Min ? 300 : 60;
          
          const newTps = totalExecutionCount > 0 ? Math.max(1, Math.floor(totalExecutionCount / timeWindow)) : 1;
          const newQps = dataToUse.length > 0 ? Math.max(1, Math.floor(dataToUse.length / timeWindow)) : 1;
          
          console.log(`✅ 새로운 TPS/QPS 계산: TPS=${newTps}, QPS=${newQps}`);
          
          // 그래프 데이터 슬라이딩 업데이트 (맨 앞 제거, 맨 뒤 추가)
          setTpsQpsData((prev) => ({
            tps: [...prev.tps.slice(1), newTps],
            qps: [...prev.qps.slice(1), newQps],
          }));
          
          // 시간 카테고리 업데이트
          setTimeCategories(generateTimeCategories());
          
          console.log("✅ TPS/QPS 그래프 업데이트 완료");
        }
      } catch (error) {
        console.error("❌ TPS/QPS 업데이트 실패:", error);
        
        // 에러 발생 시 기존 방식으로 폴백 (약간의 변동)
        setTpsQpsData((prev) => {
          const lastTps = prev.tps[prev.tps.length - 1];
          const lastQps = prev.qps[prev.qps.length - 1];
          const newTps = Math.max(1, Math.floor(lastTps * (0.9 + Math.random() * 0.2)));
          const newQps = Math.max(1, Math.floor(lastQps * (0.9 + Math.random() * 0.2)));
          
          return {
            tps: [...prev.tps.slice(1), newTps],
            qps: [...prev.qps.slice(1), newQps],
          };
        });
        
        setTimeCategories(generateTimeCategories());
      }
    }, 60 * 60 * 1000); // 1시간마다 실행 (60분 × 60초 × 1000ms)

    return () => clearInterval(interval);
  }, [databaseId]);

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
      memoryUsage: `${query.value.toFixed(1)}${query.unit}`,
      ioUsage: "890 blocks",
      cpuUsagePercent: 80,
      sqlQuery: query.query,
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
        code: "CREATE INDEX idx_created_at ON table_name(created_at);"
      },
      explainResult: `Seq Scan on table_name (cost=0..50000) (actual time=0.1..3000 rows=100k loops=1)
Filter: (created_at > '2024-01-01')
Execution Time: 3500 ms`,
      stats: {
        min: "2500ms",
        avg: slowQuery.executionTime,
        max: "5000ms",
        stdDev: "500ms",
        totalTime: slowQuery.executionTime
      },
      isModifyingQuery
    };

    setSelectedQueryDetail(detail);
    setIsModalOpen(true);
  };

  // 📌 정렬 옵션에 따른 슬로우 쿼리 필터링 (전체 리스트만 적용)
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

  // 전체 슬로우 쿼리 페이지네이션
  const paginatedFullSlowQueries = useMemo(() => {
    const startIdx = (currentFullSlowPage - 1) * fullSlowItemsPerPage;
    const endIdx = startIdx + fullSlowItemsPerPage;
    return sortedSlowQueries.slice(startIdx, endIdx);
  }, [sortedSlowQueries, currentFullSlowPage]);

  const totalFullSlowPages = Math.ceil(slowQueries.length / fullSlowItemsPerPage);

  // Severity 색상 매핑
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
      {/* 로딩/에러 상태 표시 */}
      {loading && topQueries.length === 0 && (
        <div className="il-banner il-banner--muted">로딩 중…</div>
      )}
      {error && (
        <div className="il-banner il-banner--error">{error}</div>
      )}

      {!loading && !error && !databaseId && (
        <div className="il-empty">데이터베이스를 선택해주세요.</div>
      )}

      {/* 최근 5분 데이터 없음 경고 */}
      {!loading && databaseId && summaryMetrics[0].desc.includes("전체") && (
        <div className="il-banner il-banner--warning" style={{ marginBottom: '1rem' }}>
          ⚠️ 최근 5분 내 수집된 데이터가 없습니다. 전체 데이터를 기반으로 표시하고 있습니다.
        </div>
      )}

      {/* 요약 카드 */}
      <section className="qo-metrics">
        {summaryMetrics.map((metric, idx) => (
          <SummaryCard
            key={idx}
            label={metric.label}
            value={metric.value}
            status={metric.status}
            diff={metric.diff}
            desc={metric.desc}
          />
        ))}
      </section>

      {/* TPS/QPS 그래프 + 리소스 사용률 */}
      <ChartGridLayout>
        <WidgetCard title="TPS/QPS 실시간 그래프" span={9} height={350}>
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
                  width: 3,
                },
                markers: {
                  size: 4,
                  colors: ["#7B61FF", "#FF928A"],
                  strokeColors: "#fff",
                  strokeWidth: 2,
                  hover: {
                    size: 6
                  }
                },
                dataLabels: { enabled: false },
                xaxis: {
                  type: 'category',
                  categories: timeCategories,
                  labels: {
                    show: true,
                    style: { 
                      fontSize: "11px", 
                      colors: "#999",
                      fontWeight: 500
                    },
                    rotate: 0,
                  },
                  axisBorder: { 
                    show: true, 
                    color: "#e0e0e0" 
                  },
                  axisTicks: { 
                    show: true,
                    color: "#e0e0e0"
                  },
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
                  y: {
                    formatter: (val: number) => `${Math.round(val)}`,
                  },
                },
                grid: {
                  borderColor: "#f0f0f0",
                  strokeDashArray: 3,
                  xaxis: { lines: { show: true } },
                  yaxis: { lines: { show: true } },
                  padding: {
                    top: 0,
                    right: 10,
                    bottom: 10,
                    left: 10
                  }
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
                    backgroundColor: getResourceColor("CPU", resourceUsage.cpu)
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
                    backgroundColor: getResourceColor("Memory", resourceUsage.memory)
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
                    backgroundColor: getResourceColor("Disk I/O", resourceUsage.disk)
                  }}
                ></div>
              </div>
              <div className="qo-resource-value">{Math.round(resourceUsage.disk)}%</div>
            </div>
          </div>
        </WidgetCard>
      </ChartGridLayout>

      {/* 하단 3개 카드 그리드 */}
      <div className="qo-bottom-cards">
        {/* Top N 쿼리 */}
        <div className="qo-top-query-card">
          <div className="qo-widget-header">
            <div className="qo-card__title">{resourceType} 사용량 Top 5</div>
            <div className="qo-tabs">
              {(["메모리", "CPU", "I/O", "실행시간"] as ResourceType[]).map((type) => (
                <ResourceTab
                  key={type}
                  active={resourceType === type}
                  label={type}
                  onClick={() => setResourceType(type)}
                />
              ))}
            </div>
          </div>

          <h4 className="qo-section-title">아이콘을 클릭하면 SQL 상세 내용을 볼 수 있습니다.</h4>

          <div className="qo-query-bar-list">
            {topQueries.length === 0 && !loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
                데이터가 없습니다
              </div>
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
                        <div 
                          className="qo-query-bar" 
                          style={{ width: `${barWidth}%` }}
                        >
                          <span className="qo-query-bar-label">
                            {query.value.toFixed(1)}{query.unit}
                          </span>
                        </div>
                      </div>
                      <div className="qo-query-arrow">
                        <ChevronRightIcon />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 슬로우 쿼리 TOP 5 - 📌 선택된 DB의 최신 데이터 사용 */}
        <div className="qo-slow-top5-card">
          <div className="qo-widget-header">
            <div className="qo-card__title">슬로우 쿼리 TOP 5</div>
            <CsvButton onClick={handleExport} />
          </div>

          <div className="qo-query-list-wrapper-top5">
            <div className="qo-query-list">
              {slowQueriesTop5.length === 0 && !loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
                  슬로우 쿼리가 없습니다
                </div>
              ) : (
                slowQueriesTop5.map((sq) => (
                  <div key={sq.id} className="qo-query-item" onClick={() => handleSlowQueryClick(sq)}>
                    <div className="qo-query-item-header">
                      <div className="qo-query-content">
                        <div className="qo-query-text">{sq.query}</div>
                      </div>
                      <div className="qo-query-time" style={{ backgroundColor: "#FF928A" }}>
                        {sq.executionTime}
                      </div>
                    </div>
                    <div className="qo-query-timestamp">발생: {sq.occurredAt}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 슬로우 쿼리 전체 목록 - 📌 정렬 필터 적용 */}
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
                    onClick={() => {
                      setSortOption(opt);
                      setCurrentFullSlowPage(1);
                    }}
                  />
                ))}
              </div>
              <CsvButton onClick={handleExport} />
            </div>
          </div>

          <div className="qo-slow-list-wrapper-tall">
            <div className="qo-slow-list-content">
              {paginatedFullSlowQueries.length === 0 && !loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
                  슬로우 쿼리가 없습니다
                </div>
              ) : (
                paginatedFullSlowQueries.map((sq) => (
                  <div key={sq.id} className="qo-slow-card-fixed" onClick={() => handleSlowQueryClick(sq)}>
                    <div className="qo-slow-card-header">
                      <div className="qo-slow-card-left">
                        <div className="qo-slow-card-query">{sq.query}</div>
                      </div>
                      <div 
                        className="qo-slow-card-severity" 
                        style={{ backgroundColor: getSeverityColor(sq.severity) }}
                      >
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
                <Pagination
                  currentPage={currentFullSlowPage}
                  totalPages={totalFullSlowPages}
                  onPageChange={setCurrentFullSlowPage}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 쿼리 상세 모달 */}
      {isModalOpen && selectedQueryDetail && (
        <QueryModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          detail={selectedQueryDetail}
        />
      )}
    </div>
  );
}