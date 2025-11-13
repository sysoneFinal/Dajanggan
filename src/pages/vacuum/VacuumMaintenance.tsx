import { useMemo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Chart from "../../components/chart/ChartComponent";
import ChartGridLayout from "../../components/layout/ChartGridLayout"
import WidgetCard from "../../components/util/WidgetCard"
import SummaryCard from "../../components/util/SummaryCard";
import apiClient from "../../api/apiClient";
import { useInstanceContext } from "../../context/InstanceContext";

import "/src/styles/vacuum/VacuumPage.css";

/* ---------- 타입 정의 ---------- */
type VacuumSession = {
  tableName: string;
  phase: "initializing" | "scanning" | "vacuuming" | "index_cleanup" | "truncating";
  deadTuples: string;
  trigger: "autovacuum" | "manual";
  elapsed: string;
  progressSeries: number[];
  // Detail에서 가져올 데이터
  progressDetail?: {
    scanned: number[];
    vacuumed: number[];
    deadRows: number[];
    labels: string[];
  };
};

type DashboardData = {
  deadtuple: { data: number[][]; labels: string[] };
  autovacuum: { data: number[][]; labels: string[] };
  latency: { data: number[]; labels: string[] };
  sessions: VacuumSession[];
  Kpi: { 
    avgDelay: number; 
    avgDuration: number; 
    totalDeadTuple: number; 
    autovacuumWorker: number; 
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
    progressSeries: number[];
  }>;
  kpi: {
    avgDelay: number;
    avgDuration: number;
    deadTupleTotal: number;
    autovacuumWorker: number;
  };
};

// VacuumDetail API 응답 타입
type VacuumDetailResponse = {
  progress: {
    scanned: number[];
    vacuumed: number[];
    deadRows: number[];
    labels: string[];
  };
};

/* ---------- 초기 빈 데이터 ---------- */
const emptyData: DashboardData = {
  deadtuple: { data: [[], []], labels: [] },
  autovacuum: { data: [[], []], labels: [] },
  latency: { data: [], labels: [] },
  sessions: [],
  Kpi: {
    avgDelay: 0,
    avgDuration: 0,
    totalDeadTuple: 0,
    autovacuumWorker: 0,
  }
};

/* ---------- 유틸리티 함수 ---------- */
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatElapsed(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function transformApiResponse(apiData: ApiResponse): DashboardData {
  if (!apiData) {
    console.warn('API response is null or undefined');
    return emptyData;
  }

  return {
    deadtuple: {
      data: apiData.deadtuple?.data || [[], []],
      labels: apiData.deadtuple?.labels || [],
    },
    autovacuum: {
      data: apiData.autovacuum?.data || [[], []],
      labels: apiData.autovacuum?.labels || [],
    },
    latency: {
      data: Array.isArray(apiData.latency?.data?.[0]) 
        ? apiData.latency.data[0] 
        : (apiData.latency?.data || []),
      labels: apiData.latency?.labels || [],
    },
    sessions: (apiData.sessions || []).map(s => ({
      tableName: s.tableName,
      phase: s.phase as any,
      deadTuples: s.deadTuples,
      trigger: s.trigger as any,
      elapsed: s.elapsed,
      progressSeries: s.progressSeries || [0],
    })),
    Kpi: {
      avgDelay: apiData.kpi?.avgDelay || 0,
      avgDuration: apiData.kpi?.avgDuration || 0,
      totalDeadTuple: apiData.kpi?.deadTupleTotal || 0,
      autovacuumWorker: apiData.kpi?.autovacuumWorker || 0,
    },
  };
}

/* ---------- Progress 미니 차트 ---------- */
function ProgressMini({ 
  scanned, 
  vacuumed, 
  deadRows, 
  labels 
}: { 
  scanned: number[]; 
  vacuumed: number[]; 
  deadRows: number[];
  labels: string[];
}) {
  return (
    <div className="vd-progress">
      <div className="vd-progress__spark">
        <Chart
          type="line"
          series={[
            { name: "Heap Bytes Scanned", data: scanned },
            { name: "Heap Bytes Vacuumed", data: vacuumed },
            { name: "Dead Rows", data: deadRows },
          ]}
          categories={labels}
          height={100}
          width="360px"
          showGrid={false}
          showLegend={false}
          showToolbar={false}
          colors={["#6366F1", "#10B981", "#FBBF24"]}
          customOptions={{
            chart: { redrawOnParentResize: true, redrawOnWindowResize: true },
            stroke: { curve: "smooth", width: 2 },
            yaxis: { min: 0, labels: { show: false } },
            xaxis: { labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
            tooltip: { enabled: true },
          }}
        />
      </div>
    </div>
  );
}

/* ---------- 메인 페이지 ---------- */
export default function VacuumPage() {
  const navigate = useNavigate();
  const { selectedInstance, selectedDatabase } = useInstanceContext();
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // API 호출 - Instance/Database 변경 시마다 다시 호출
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedInstance) {
        setData(emptyData);
        setLoading(false);
        setError(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const instanceId = selectedInstance.instanceId;
        const databaseId = selectedDatabase?.databaseId;

        console.log('Fetching vacuum dashboard data...', { instanceId, databaseId });
        
        const params: any = { 
          hours: 100,
          databaseId: databaseId
        };

        const response = await apiClient.get<ApiResponse>('/vacuum/dashboard', { params });
        
        console.log('API Response:', response.data);
        
        const transformedData = transformApiResponse(response.data);
        console.log('Transformed Data:', transformedData);
        
        setData(transformedData);

        // 각 세션의 Detail 데이터를 비동기로 가져오기
        if (transformedData.sessions.length > 0 && databaseId) {
          fetchSessionDetails(transformedData.sessions, databaseId);
        }
      } catch (err: any) {
        console.error('Failed to fetch vacuum dashboard:', err);
        setError(err.response?.data?.message || err.message || 'Failed to load data');
        setData(emptyData);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
  }, [selectedInstance, selectedDatabase]);

  // 각 세션의 Detail Progress 데이터 가져오기
  const fetchSessionDetails = async (sessions: VacuumSession[], databaseId: number) => {
    try {
      const detailPromises = sessions.map(async (session) => {
        try {
          const response = await apiClient.get<VacuumDetailResponse>('/vacuum/detail', {
            params: {
              databaseId: databaseId,
              tableName: session.tableName
            }
          });
          
          return {
            tableName: session.tableName,
            progressDetail: response.data.progress
          };
        } catch (err) {
          console.warn(`Failed to fetch detail for ${session.tableName}:`, err);
          return {
            tableName: session.tableName,
            progressDetail: undefined
          };
        }
      });

      const details = await Promise.all(detailPromises);

      // 기존 sessions 데이터에 progressDetail 추가
      setData(prevData => ({
        ...prevData,
        sessions: prevData.sessions.map(session => {
          const detail = details.find(d => d.tableName === session.tableName);
          return {
            ...session,
            progressDetail: detail?.progressDetail
          };
        })
      }));
    } catch (err) {
      console.error('Failed to fetch session details:', err);
    }
  };

  const handleRowClick = (tableName: string) => {
    navigate("/database/vacuum/detail", {
      state: { tableName },
    });
  };

  const deadtupleSeries = useMemo(
    () => [
      { name: "Dead Tuple 증가 속도", data: data.deadtuple.data[0] || [] },
      { name: "Vacuum 처리 속도", data: data.deadtuple.data[1] || [] },
    ],
    [data.deadtuple.data]
  );

  const autovacuumSeries = useMemo(
    () => [
      { name: "Autovacuum Cost Delay", data: data.autovacuum.data[0] || [] },
      { name: "Active Workers", data: data.autovacuum.data[1] || [] },
    ],
    [data.autovacuum.data]
  );

  const latencySeries = useMemo(
    () => [{ name: "latency", data: data.latency.data }],
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
          <p style={{ fontSize: '12px', marginTop: '16px', color: '#6B7280' }}>
            Instance: {selectedInstance.instanceName}
            {selectedDatabase && ` / Database: ${selectedDatabase.databaseName}`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="vd-root">
      <div className="vd-grid2">
        <SummaryCard
          label="평균 지연시간"
          value={Number(data.Kpi.avgDelay.toFixed(2))}
          diff={3}
          desc="seconds • 24h"
        />

        <SummaryCard
          label="Average Duration"
          value={Number(data.Kpi.avgDuration.toFixed(2))}
          diff={3}
          desc="seconds • 24h"
        />

        <SummaryCard
          label="Total Dead Tuples Processed"
          value={Number(data.Kpi.totalDeadTuple.toFixed(2))}
          diff={3}
          desc="M • 24h"
        />

        <SummaryCard
          label="Auto Vacuum Worker 활동률"
          value={Math.round(data.Kpi.autovacuumWorker)}
          diff={3}
          desc="%"
        />
      </div>

      <ChartGridLayout>
        <WidgetCard title="Vacuum deadtuple (rows/sec • 24h)" span={4}>
          <Chart
            type="line"
            series={deadtupleSeries}
            categories={data.deadtuple.labels}
            width="100%"
            customOptions={{
              chart: { redrawOnParentResize: true, redrawOnWindowResize: true },
              stroke: { curve: "smooth", width: 2 },
              legend: { show: true, position: "bottom" },
              xaxis: {
                labels: { style: { colors: "#9CA3AF" } },
                axisBorder: { show: false },
                axisTicks: { show: false },
                categories: data.deadtuple.labels,
              },
              yaxis: { title: { text: "rows/sec" },
              labels: {
                    formatter: (value: number) => value.toFixed(2)
                  } },
            }}
          />
        </WidgetCard>

        <WidgetCard title="Vacuum autovacuum(rows/sec • 24h)" span={4}>
          <Chart
            type="line"
            series={autovacuumSeries}
            categories={data.autovacuum.labels}
            width="100%"
            customOptions={{
              chart: { redrawOnParentResize: true, redrawOnWindowResize: true },
              stroke: { width: 2, curve: "smooth" },
              grid: { borderColor: "#E5E7EB", strokeDashArray: 4 },
              markers: { size: 0 },
              yaxis: [
                { title: { text: "Cost Delay (ms)" }, 
                  labels: {
                    formatter: (value: number) => value.toFixed(2)
                  }
                },
                { title: { text: "Active Workers" }, opposite: true, decimalsInFloat: 0 },
              ],
            }}
            tooltipFormatter={(v) => `${Math.round(v).toLocaleString()}`}
          />
        </WidgetCard>

        <WidgetCard title="Latency Trend(24h)" span={4}>
          <Chart
            type="line"
            series={latencySeries}
            categories={data.latency.labels}
            width="100%"
            customOptions={{
              chart: { redrawOnParentResize: true, redrawOnWindowResize: true },
              stroke: { width: 2, curve: "smooth" },
              grid: { borderColor: "#E5E7EB", strokeDashArray: 4 },
              markers: { size: 4 },
              yaxis: { min: 0,
                labels: {
                  formatter: (value: number) => value.toFixed(2)
                }
               },
            }}
            tooltipFormatter={(v) => `${Math.round(v).toLocaleString()}`}
          />
        </WidgetCard>
      </ChartGridLayout>

      {/* 현재 실행 중인 VACUUM 세션 */}
      <section className="vd-card">
        <header className="vd-card__header">
          <h3>Current VACUUM Sessions</h3>
          {loading && <span style={{ fontSize: '12px', color: '#6B7280' }}>Loading...</span>}
        </header>
        <div className="vd-tablewrap" style={{ height: "500px" }}>
          <table className="vd-table">
            <thead>
              <tr>
                <th>TABLE</th>
                <th>PROGRESS</th>
                <th>PHASE</th>
                <th>DEAD TUPLES</th>
                <th>TRIGGER</th>
                <th>ELAPSED</th>
              </tr>
            </thead>
            <tbody>
              {data.sessions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                    No active vacuum sessions
                  </td>
                </tr>
              ) : (
                data.sessions.map((s, idx) => (
                  <tr key={`${s.tableName}-${idx}`} onClick={() => handleRowClick(s.tableName)}>
                    <td className="vd-td-strong">{s.tableName}</td>
                    <td>
                      {s.progressDetail ? (
                        <ProgressMini 
                          scanned={s.progressDetail.scanned}
                          vacuumed={s.progressDetail.vacuumed}
                          deadRows={s.progressDetail.deadRows}
                          labels={s.progressDetail.labels}
                        />
                      ) : (
                        <div style={{ fontSize: '12px', color: '#9CA3AF' }}>Loading...</div>
                      )}
                    </td>
                    <td>{s.phase}</td>
                    <td>{s.deadTuples}</td>
                    <td>{s.trigger}</td>
                    <td>{s.elapsed}</td>
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