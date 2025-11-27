// 작성자: 김민서

import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import Chart from "../../components/chart/ChartComponent";
import ChartGridLayout from "../../components/layout/ChartGridLayout"
import WidgetCard from "../../components/util/WidgetCard"
import SummaryCard from "../../components/util/SummaryCard";
import apiClient from "../../api/apiClient";
import { useInstanceContext } from "../../context/InstanceContext";
import { useLoader } from "../../context/LoaderContext";
import { intervalToMs } from "../../utils/time";

import "/src/styles/vacuum/VacuumPage.css";

/* ---------- 타입 정의 ---------- */
type VacuumHistoryRow = {
  executedAt: string;
  table: string;
  type: "Vacuum" | "Autovacuum";
  status: "정상" | "주의";
  tuples: string;
  bloat: string;
};

type ApiHistoryRow = {
  table: string;
  executedAt: string;
  vacuumType: string;
  durationSeconds: number | null;
  deadTuples: string;
  bloatRatio: string;
  status: string;
};

type DashboardData = {
  deadtuple: { data: number[][]; labels: string[] };
  autovacuum: { data: number[][]; labels: string[] };
  latency: { data: number[][]; labels: string[] };
  kpi: { 
    blockedSessions: number; 
    avgRunningTime: number; 
    totalDeadTuples: number; 
    activeWorkers: string; 
  };
};

// 백엔드 API 응답 타입
type ApiResponse = {
  deadtuple: {
    data: number[][];
    labels: string[];
  };
  autovacuum: {
    data: number[][];
    labels: string[];
  };
  latency: {
    data: number[][];
    labels: string[];
  };
  sessions: Array<{
    tableName: string;
    phase: string;
    deadTuples: string;
    trigger: string;
    elapsed: string;
  }>;
  kpi: {
    blockedSessions: number;
    avgRunningTime: number;
    totalDeadTuples: number;
    activeWorkers: string;
  };
};

/* ---------- 초기 빈 데이터 ---------- */
const emptyData: DashboardData = {
  deadtuple: { data: [[], []], labels: [] },
  autovacuum: { data: [[], []], labels: [] },
  latency: { data: [[]], labels: [] },
  kpi: {
    blockedSessions: 0,
    avgRunningTime: 0,
    totalDeadTuples: 0,
    activeWorkers: "0/3",
  }
};

/* ---------- 시간 변환 함수 ---------- */
// UTC 시간을 로컬 시간(KST)으로 변환
// labels가 "HH:MM" 형식인데 UTC 시간이면 +9시간 조정
function convertLabelsToLocalTime(labels: string[]): string[] {
  if (!labels || labels.length === 0) return [];
  
  // 첫 번째 label 형식 확인
  const firstLabel = labels[0];
  
  // ISO 형식인 경우
  if (firstLabel.includes('T') || firstLabel.includes('Z') || firstLabel.includes('+')) {
    try {
      return labels.map(label => {
        const date = new Date(label);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
      });
    } catch (e) {
      console.warn('시간 변환 실패, 원본 labels 반환:', e);
      return labels;
    }
  }
  
  // "HH:MM" 형식인 경우 - UTC라면 +9시간 조정 (KST = UTC+9)
  if (/^\d{2}:\d{2}$/.test(firstLabel)) {
    return labels.map(label => {
      const [hours, minutes] = label.split(':').map(Number);
      // UTC 시간에 9시간 추가 (KST)
      let newHours = hours + 9;
      if (newHours >= 24) {
        newHours = newHours - 24;
      }
      return `${String(newHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    });
  }
  
  // 다른 형식이면 그대로 반환
  return labels;
}

/* ---------- 데이터 변환 함수 ---------- */
function transformApiResponse(apiData: ApiResponse): DashboardData {
  if (!apiData) {
    console.warn('API response is null or undefined');
    return emptyData;
  }

  // labels를 로컬 시간으로 변환
  const deadtupleLabels = convertLabelsToLocalTime(apiData.deadtuple?.labels || []);
  const autovacuumLabels = convertLabelsToLocalTime(apiData.autovacuum?.labels || []);
  const latencyLabels = convertLabelsToLocalTime(apiData.latency?.labels || []);

  console.log('🕐 Original labels:', {
    deadtuple: apiData.deadtuple?.labels?.slice(0, 3),
    autovacuum: apiData.autovacuum?.labels?.slice(0, 3),
    latency: apiData.latency?.labels?.slice(0, 3),
  });
  console.log('🕐 Converted labels:', {
    deadtuple: deadtupleLabels.slice(0, 3),
    autovacuum: autovacuumLabels.slice(0, 3),
    latency: latencyLabels.slice(0, 3),
  });

  return {
    deadtuple: {
      data: apiData.deadtuple?.data || [[], []],
      labels: deadtupleLabels,
    },
    autovacuum: {
      data: apiData.autovacuum?.data || [[], []],
      labels: autovacuumLabels,
    },
    latency: {
      data: apiData.latency?.data || [[]],
      labels: latencyLabels,
    },
    kpi: {
      blockedSessions: apiData.kpi?.blockedSessions || 0,
      avgRunningTime: apiData.kpi?.avgRunningTime || 0,
      totalDeadTuples: apiData.kpi?.totalDeadTuples || 0,
      activeWorkers: apiData.kpi?.activeWorkers || "0/3",
    },
  };
}

/* ---------- History 데이터 변환 함수 ---------- */
function transformHistoryResponse(apiData: ApiHistoryRow[]): VacuumHistoryRow[] {
  if (!apiData || !Array.isArray(apiData)) {
    console.warn("Invalid API response:", apiData);
    return [];
  }

  console.log('🔍 Transforming History Data:', {
    firstRow: apiData[0],
    rowFields: apiData[0] ? Object.keys(apiData[0]) : []
  });

  return apiData.map((row, index) => {
    // 필드명이 다를 수 있으므로 다양한 경우를 처리
    const deadTuples = row.deadTuples ?? (row as any).dead_tuples ?? (row as any).deadTuplesCount ?? "-";
    const durationSeconds = row.durationSeconds ?? (row as any).duration_seconds ?? (row as any).duration ?? null;
    const bloatRatio = row.bloatRatio ?? (row as any).bloat_ratio ?? (row as any).bloat ?? "-";
    
    const vacuumTypeStr = row.vacuumType ?? (row as any).vacuum_type ?? "";
    const type: "Vacuum" | "Autovacuum" = (vacuumTypeStr === "autovacuum") ? "Autovacuum" : "Vacuum";
    const status: "정상" | "주의" = (row.status === "주의" || (row as any).status === "주의") ? "주의" : "정상";
    
    const result: VacuumHistoryRow = {
      executedAt: row.executedAt ?? (row as any).executed_at ?? "-",
      table: row.table ?? (row as any).tableName ?? (row as any).table_name ?? "-",
      type,
      status,
      tuples: String(deadTuples),
      bloat: String(bloatRatio),
    };
    
    if (index === 0) {
      console.log('🔍 Transformed first row:', result);
    }
    
    return result;
  });
}

/* ---------- Dead Tuple 포맷팅 함수 ---------- */
function formatDeadTuples(count: number): string {
  if (count >= 1_000_000) {
    return (count / 1_000_000).toFixed(2) + "M";
  } else if (count >= 1_000) {
    return (count / 1_000).toFixed(1) + "K";
  }
  return count.toString();
}

/* ---------- Severity 계산 함수 ---------- */
// Blocked Sessions 임계값
// 0개: 정상 (NORMAL)
// 1-5개: 주의 (WARNING)
// 5+개: 경고 (CRITICAL)
const calculateBlockedSessionsSeverity = (count: number): "NORMAL" | "WARNING" | "CRITICAL" => {
  if (count >= 5) {
    return "CRITICAL";
  } else if (count >= 1) {
    return "WARNING";
  } else {
    return "NORMAL";
  }
};

// Avg Running Time 임계값
// 0-60초: 정상 (NORMAL)
// 60-300초: 주의 (WARNING)
// 300초+: 경고 (CRITICAL)
const calculateAvgRunningTimeSeverity = (seconds: number): "NORMAL" | "WARNING" | "CRITICAL" => {
  if (seconds >= 300) {
    return "CRITICAL";
  } else if (seconds >= 60) {
    return "WARNING";
  } else {
    return "NORMAL";
  }
};

// Severity를 SummaryCard status로 변환
const severityToStatus = (severity: "NORMAL" | "WARNING" | "CRITICAL"): "info" | "warning" | "critical" => {
  switch (severity) {
    case "CRITICAL":
      return "critical";
    case "WARNING":
      return "warning";
    case "NORMAL":
      return "info";
    default:
      return "info";
  }
};

/* ---------- 메인 페이지 ---------- */
export default function VacuumPage() {
  const navigate = useNavigate();
  const { selectedInstance, selectedDatabase, refreshInterval } = useInstanceContext();
  const { showLoader, hideLoader } = useLoader();

  // API 호출 (React Query로 자동 새로고침)
  const { data: rawData, isLoading: loading, error: queryError } = useQuery<ApiResponse>({
    queryKey: ["vacuum-dashboard", selectedInstance?.instanceId, selectedDatabase?.databaseId],
    queryFn: async () => {
      if (!selectedInstance || !selectedDatabase) return null;

      const databaseId = selectedDatabase.databaseId;
      const instanceId = selectedInstance.instanceId;

      console.log('Fetching vacuum dashboard data...', { 
        instanceId, 
        instanceName: selectedInstance.instanceName,
        databaseId,
        databaseName: selectedDatabase.databaseName 
      });
      
      const response = await apiClient.get<ApiResponse>('/vacuum/dashboard', { 
        params: { 
          hours: 24,
          databaseId: databaseId,
          instanceId: instanceId
        }
      });
      
      console.log('API Response:', response.data);
      
      return response.data;
    },
    enabled: !!selectedInstance && !!selectedDatabase,
    refetchInterval: intervalToMs(refreshInterval), // ** 중요 ** 새로고침 주기 적용
  });

  /** === 로딩 상태 관리 === */
  useEffect(() => {
    if (loading) {
      showLoader('Vacuum Maintenance 데이터를 불러오는 중...');
    } else {
      hideLoader();
    }
  }, [loading, showLoader, hideLoader]);

  const data = useMemo(() => {
    if (!rawData) return emptyData;
    return transformApiResponse(rawData);
  }, [rawData]);

  const error = queryError ? (queryError instanceof Error ? queryError.message : "데이터 로딩 실패") : null;

  // History 데이터 조회 (React Query로 자동 새로고침)
  const { data: historyRawData = [] } = useQuery<ApiHistoryRow[]>({
    queryKey: ["vacuum-history-maintenance", selectedInstance?.instanceId, selectedDatabase?.databaseId],
    queryFn: async () => {
      if (!selectedInstance) return [];

      const params: any = { days: 7 }; // 최근 7일
      const databaseId = selectedDatabase?.databaseId;
      if (databaseId) params.databaseId = Number(databaseId);

      const response = await apiClient.get<ApiHistoryRow[]>("/vacuum/history", {
        params,
      });

      console.log('🔍 History API Response:', response.data);
      console.log('🔍 First History Row:', response.data?.[0]);
      
      return response.data;
    },
    enabled: !!selectedInstance && !!selectedDatabase,
    refetchInterval: intervalToMs(refreshInterval), // ** 중요 ** 새로고침 주기 적용
  });

  const historyData = useMemo(() => transformHistoryResponse(historyRawData), [historyRawData]);

  const handleRowClick = (tableName: string, executedAt?: string) => {
    navigate("/database/vacuum/detail", {
      state: { 
        tableName,
        executedAt,
        databaseId: selectedDatabase?.databaseId 
      },
    });
  };

  // 차트 시리즈 데이터
  const deadtupleSeries = useMemo(
    () => [
      { name: "Dead Tuple 증가 속도", data: data.deadtuple.data[0] || [] },
      { name: "Vacuum 처리 속도", data: data.deadtuple.data[1] || [] },
    ],
    [data.deadtuple.data]
  );

  const autovacuumSeries = useMemo(
    () => {
      const costDelayData = Array.isArray(data.autovacuum.data[0]) ? data.autovacuum.data[0] : [];
      const activeWorkersData = Array.isArray(data.autovacuum.data[1]) ? data.autovacuum.data[1] : [];
      
      // 이중 yaxis 차트: ApexCharts는 자동으로 첫 번째 시리즈는 첫 번째 yaxis, 두 번째 시리즈는 두 번째 yaxis를 사용
      return [
        { 
          name: "Autovacuum Cost Delay", 
          data: costDelayData
        },
        { 
          name: "Active Workers", 
          data: activeWorkersData
        },
      ];
    },
    [data.autovacuum.data]
  );

  const latencySeries = useMemo(
    () => [
      { 
        name: "평균 지연 시간", 
        data: data.latency.data[0] || [] 
      }
    ],
    [data.latency.data]
  );
  
  // Instance나 Database가 선택되지 않은 경우
  if (!selectedInstance || !selectedDatabase) {
    return (
      <div className="vd-root">
        <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
          <p style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>
            Instance와 Database를 선택해주세요
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="vd-root">
        <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
          <p style={{ fontSize: '16px' }}>
            Loading dashboard data for <strong>{selectedInstance.instanceName}</strong>
            {selectedDatabase && <span> / <strong>{selectedDatabase.databaseName}</strong></span>}
            ...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="vd-root">
        <div style={{ padding: '40px', color: '#ef4444', textAlign: 'center' }}>
          <p style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>
            Failed to load vacuum dashboard
          </p>
          <p style={{ fontSize: '14px', marginTop: '8px', color: '#9CA3AF' }}>{error}</p>
          <p style={{ fontSize: '12px', marginTop: '16px', color: '#7F1D1D' }}>
            Instance: {selectedInstance.instanceName}
            {' / '}
            Database: {selectedDatabase.databaseName}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="vd-root">
      {/* KPI 카드 */}
      <div className="vd-grid2">
        <SummaryCard
          label="Blocked Sessions"
          value={`${data.kpi.blockedSessions}개`}
          desc="최근 24시간 기준"
          status={severityToStatus(calculateBlockedSessionsSeverity(data.kpi.blockedSessions))}
        />

        <SummaryCard
          label="Avg Running Time"
          value={`${Number(data.kpi.avgRunningTime.toFixed(2))}S`}
          desc="최근 24시간 기준"
          status={severityToStatus(calculateAvgRunningTimeSeverity(data.kpi.avgRunningTime))}
        />

        <SummaryCard
          label="Total Dead Tuples"
          value={formatDeadTuples(data.kpi.totalDeadTuples)}
          desc="최근 24시간 기준"
        />

        <SummaryCard
          label="Active Workers"
          value={data.kpi.activeWorkers}
          desc="최근 24시간 기준"
        />
      </div>

      {/* 차트 섹션 */}
      <ChartGridLayout>
        <WidgetCard title="Vacuum deadtuple (최근 24시간 내)" span={4}>
          <Chart
            type="line"
            series={deadtupleSeries}
            categories={data.deadtuple.labels}
            width="100%"
            height="300px"
            customOptions={{
              chart: { redrawOnParentResize: true, redrawOnWindowResize: true },
              stroke: { curve: "smooth", width: 2 },
              legend: { show: true, position: "bottom" },
              xaxis: {
                categories: data.deadtuple.labels,
                labels: { 
                  style: { colors: "#9CA3AF" },
                  rotate: -45,
                  rotateAlways: false,
                  hideOverlappingLabels: true
                },
                axisBorder: { show: false },
                axisTicks: { show: false },
              },
              yaxis: { 
                title: { text: "rows/sec" },
                labels: {
                  formatter: (value: number) => value.toFixed(2)
                }
              },
            }}
          />
        </WidgetCard>

        <WidgetCard title="Vacuum autovacuum (최근 24시간 내)" span={4}>
          <Chart
            type="line"
            series={autovacuumSeries}
            categories={data.autovacuum.labels}
            width="100%"
            height="300px"
            yaxisOptions={[
              { 
                title: { text: "Cost Delay (ms)" }, 
                min: 0,
                labels: {
                  formatter: (value: number) => value.toFixed(2)
                }
              },
              { 
                title: { text: "Active Workers" }, 
                opposite: true,
                min: 0,
                labels: {
                  formatter: (value: number) => Math.round(value).toString()
                }
              },
            ]}
            customOptions={{
              chart: { redrawOnParentResize: true, redrawOnWindowResize: true },
              stroke: { width: 2, curve: "smooth" },
              grid: { borderColor: "#E5E7EB", strokeDashArray: 4 },
              markers: { size: 4 },
              legend: { show: true, position: "bottom" },
              xaxis: {
                categories: data.autovacuum.labels,
                labels: { 
                  style: { colors: "#9CA3AF" },
                  rotate: -45,
                  rotateAlways: false,
                  hideOverlappingLabels: true
                },
                axisBorder: { show: false },
                axisTicks: { show: false },
              },
            }}
          />
        </WidgetCard>

        <WidgetCard title="지연 시간 추이 (최근 24시간 내)" span={4}>
          <Chart
            type="line"
            series={latencySeries}
            categories={data.latency.labels}
            width="100%"
            height="300px"
            customOptions={{
              chart: { redrawOnParentResize: true, redrawOnWindowResize: true },
              stroke: { width: 2, curve: "smooth" },
              grid: { borderColor: "#E5E7EB", strokeDashArray: 4 },
              markers: { size: 4 },
              xaxis: {
                categories: data.latency.labels,
                labels: { 
                  style: { colors: "#9CA3AF" },
                  rotate: -45,
                  rotateAlways: false,
                  hideOverlappingLabels: true
                },
                axisBorder: { show: false },
                axisTicks: { show: false },
              },
              yaxis: { 
                title: { text: "ms" },
                min: 0,
                labels: {
                  formatter: (value: number) => value.toFixed(2)
                }
              },
            }}
          />
        </WidgetCard>
      </ChartGridLayout>

      {/* VACUUM History (최근 7일) */}
      <section className="vd-card">
        <header className="vd-card__header">
          <h3>VACUUM History (최근 7일 내)</h3>
        </header>
        <div className="vd-tablewrap" style={{ height: "450px", overflowY: "auto" }}>
          <table className="vd-table">
            <thead>
              <tr>
                <th>실행 시각</th>
                <th>TABLE</th>
                <th>작업 유형</th>
                <th>상태</th>
                <th>DEAD TUPLES</th>
                <th>BLOAT</th>
              </tr>
            </thead>
            <tbody>
              {historyData.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                    최근 7일 내 VACUUM 이력이 없습니다
                  </td>
                </tr>
              ) : (
                historyData.slice(0, 20).map((row, idx) => (
                  <tr 
                    key={`${row.table}-${row.executedAt}-${idx}`} 
                    onClick={() => handleRowClick(row.table, row.executedAt)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="vd-td-strong">{row.executedAt}</td>
                    <td>{row.table}</td>
                    <td>{row.type}</td>
                    <td>
                      <span className={`vd-badge ${row.status === "정상" ? "vd-badge--ok" : "vd-badge--warn"}`}>
                        {row.status}
                      </span>
                    </td>
                    <td>{row.tuples}</td>
                    <td>{row.bloat}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}