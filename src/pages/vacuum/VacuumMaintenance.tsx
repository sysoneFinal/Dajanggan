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
  phase: string;
  deadTuples: string;
  trigger: string;
  elapsed: string;
};

type DashboardData = {
  deadtuple: { data: number[][]; labels: string[] };
  autovacuum: { data: number[][]; labels: string[] };
  latency: { data: number[][]; labels: string[] };
  sessions: VacuumSession[];
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
  sessions: [],
  kpi: {
    blockedSessions: 0,
    avgRunningTime: 0,
    totalDeadTuples: 0,
    activeWorkers: "0/3",
  }
};

/* ---------- 데이터 변환 함수 ---------- */
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
      data: apiData.latency?.data || [[]],
      labels: apiData.latency?.labels || [],
    },
    sessions: (apiData.sessions || []).map(s => ({
      tableName: s.tableName,
      phase: s.phase,
      deadTuples: s.deadTuples,
      trigger: s.trigger,
      elapsed: s.elapsed,
    })),
    kpi: {
      blockedSessions: apiData.kpi?.blockedSessions || 0,
      avgRunningTime: apiData.kpi?.avgRunningTime || 0,
      totalDeadTuples: apiData.kpi?.totalDeadTuples || 0,
      activeWorkers: apiData.kpi?.activeWorkers || "0/3",
    },
  };
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

/* ---------- 메인 페이지 ---------- */
export default function VacuumPage() {
  const navigate = useNavigate();
  const { selectedInstance, selectedDatabase } = useInstanceContext();
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // API 호출
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedInstance || !selectedDatabase) {
        setData(emptyData);
        setLoading(false);
        setError(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
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
        
        const transformedData = transformApiResponse(response.data);
        console.log('Transformed Data:', transformedData);
        
        setData(transformedData);

      } catch (err: any) {
        console.error('Failed to fetch vacuum dashboard:', err);
        console.error('Error details:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status
        });
        setError(err.response?.data?.message || err.message || 'Failed to load data');
        setData(emptyData);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
  }, [selectedInstance, selectedDatabase]);

  const handleRowClick = (tableName: string) => {
    navigate("/database/vacuum/detail", {
      state: { 
        tableName,
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
    () => [
      { name: "Autovacuum Cost Delay", data: data.autovacuum.data[0] || [] },
      { name: "Active Workers", data: data.autovacuum.data[1] || [] },
    ],
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
          value={data.kpi.blockedSessions}
          desc="개 • 24h"
        />

        <SummaryCard
          label="Avg Running Time"
          value={Number(data.kpi.avgRunningTime.toFixed(2))}
          desc="seconds • 24h"
        />

        <SummaryCard
          label="Total Dead Tuples"
          value={formatDeadTuples(data.kpi.totalDeadTuples)}
          desc="• 24h"
        />

        <SummaryCard
          label="Active Workers"
          value={data.kpi.activeWorkers}
          desc=""
        />
      </div>

      {/* 차트 섹션 */}
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
                { 
                  title: { text: "Cost Delay (ms)" }, 
                  labels: {
                    formatter: (value: number) => value.toFixed(2)
                  }
                },
                { 
                  title: { text: "Active Workers" }, 
                  opposite: true, 
                  decimalsInFloat: 0 
                },
              ],
            }}
          />
        </WidgetCard>

        <WidgetCard title="지연 시간 추이(24h)" span={4}>
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
              yaxis: { 
                min: 0,
                labels: {
                  formatter: (value: number) => value.toFixed(2)
                }
              },
            }}
          />
        </WidgetCard>
      </ChartGridLayout>

      {/* 현재 실행 중인 VACUUM 세션 */}
      <section className="vd-card">
        <header className="vd-card__header">
          <h3>Current VACUUM Sessions</h3>
        </header>
        <div className="vd-tablewrap" style={{ height: "500px" }}>
          <table className="vd-table">
            <thead>
              <tr>
                <th>TABLE</th>
                <th>작업 단계</th>
                <th>DEAD TUPLES</th>
                <th>TRIGGER</th>
                <th>경과 시간</th>
              </tr>
            </thead>
            <tbody>
              {data.sessions.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                    No active vacuum sessions
                  </td>
                </tr>
              ) : (
                data.sessions.map((s, idx) => (
                  <tr 
                    key={`${s.tableName}-${idx}`} 
                    onClick={() => handleRowClick(s.tableName)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="vd-td-strong">{s.tableName}</td>
                    <td>{s.phase}</td>
                    <td>{s.deadTuples}</td>
                    <td>
                      <span className={`badge badge-${s.trigger === 'autovacuum' ? 'auto' : 'manual'}`}>
                        {s.trigger}
                      </span>
                    </td>
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