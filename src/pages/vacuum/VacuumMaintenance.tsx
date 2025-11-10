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
  table: string;
  phase: "initializing" | "scanning" | "vacuuming" | "index_cleanup" | "truncating";
  deadTuples: string;
  trigger: "autovacuum" | "manual";
  elapsed: string;
  progressSeries: number[];
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
    table: string;
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
  // null/undefined 체크
  if (!apiData) {
    console.warn('API response is null or undefined');
    return emptyData;
  }

  console.log('Transform input:', apiData);

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
      // latency.data는 number[][] 형태로 올 수 있으므로 첫 번째 배열만 사용
      data: Array.isArray(apiData.latency?.data?.[0]) 
        ? apiData.latency.data[0] 
        : (apiData.latency?.data || []),
      labels: apiData.latency?.labels || [],
    },
    sessions: (apiData.sessions || []).map(s => ({
      table: s.table,
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
function ProgressMini({ series }: { series: number[] }) {
  return (
    <div className="vd-progress">
      <div className="vd-progress__spark">
        <Chart
          type="area"
          series={[{ name: "progress", data: series }]}
          categories={series.map((_, i) => `${i}`)}
          height={100}
          width="360px"
          showGrid={false}
          showLegend={false}
          showToolbar={false}
          colors={["#6366F1"]}
          customOptions={{
            chart: { redrawOnParentResize: true, redrawOnWindowResize: true },
            yaxis: { min: 0, max: 100, labels: { show: false } },
            xaxis: { labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
            tooltip: { enabled: false },
            stroke: { curve: "smooth", width: 2 },
            fill: {
              type: "gradient",
              gradient: { shadeIntensity: 0.4, opacityFrom: 0.45, opacityTo: 0.05, stops: [0, 90, 100] },
            },
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
      // Instance가 선택되지 않았으면 빈 데이터 표시
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
        
        // Query Parameters 구성
        const params: any = { 
          hours: 100,
          databaseId: databaseId
        };

        const response = await apiClient.get<ApiResponse>('/vacuum/dashboard', { params });
        
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
    
  }, [selectedInstance, selectedDatabase]); // Instance나 Database 변경 시 재호출

  const handleRowClick = (tableName: string) => {
    navigate("/database/vacuum/session-detail", {
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

  // Instance 선택 안됨
  if (!selectedInstance) {
    return (
      <div className="vd-root">
        <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
          <p style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>
            Instance를 선택해주세요
          </p>
          <p style={{ fontSize: '14px', color: '#9CA3AF' }}>
            상단 헤더에서 Instance를 선택하면 대시보드 데이터가 표시됩니다.
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
      {/* 현재 선택된 Instance/Database 정보 표시 */}
   
      <div className="vd-grid2">
        <SummaryCard
          label="평균 지연시간"
          value={data.Kpi.avgDelay}
          diff={3}
          desc="seconds • 24h"
        />

        <SummaryCard
          label="Average Duration"
          value={data.Kpi.avgDuration}
          diff={3}
          desc="seconds • 24h"
        />

        <SummaryCard
          label="Total Dead Tuples Processed"
          value={data.Kpi.totalDeadTuple}
          diff={3}
          desc="M • 24h"
        />

        <SummaryCard
          label="Auto Vacuum Worker 활동률"
          value={data.Kpi.autovacuumWorker}
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
              yaxis: { title: { text: "rows/sec" } },
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
                { title: { text: "Cost Delay (ms)" }, decimalsInFloat: 0 },
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
              yaxis: { min: 0 },
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
                  <tr key={`${s.table}-${idx}`} onClick={() => handleRowClick(s.table)}>
                    <td className="vd-td-strong">{s.table}</td>
                    <td><ProgressMini series={s.progressSeries} /></td>
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