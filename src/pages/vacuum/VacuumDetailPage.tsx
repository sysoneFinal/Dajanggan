import { useMemo, useEffect, useState } from "react";
import Chart from "../../components/chart/ChartComponent";
import apiClient from "../../api/apiClient";
import { useInstanceContext } from "../../context/InstanceContext";
import "/src/styles/vacuum/VacuumPage.css";

/* ---------- 타입 정의 ---------- */
type VacuumDetail = {
  tableName: string;
  schema: string;
  startTime: string;
  endTime?: string; // 진행 중이면 null
  duration?: string; // 진행 중이면 null
  autovacuum: boolean;
  role: string;
  heapBlocksTotal: string;
  deadTuplesPerPhase: string;
  progress: {
    scanned: number[];
    vacuumed: number[];
    deadRows: number[];
    labels: string[];
  };
  summary: Record<string, string>;
};

// 백엔드 API 응답 타입
type ApiVacuumDetailResponse = {
  tableName: string;
  schema: string;
  startTime: string;
  endTime?: string;
  duration?: string;
  autovacuum: boolean;
  role: string;
  heapBlocksTotal: string;
  deadTuplesPerPhase: string;
  progress: {
    scanned: number[];
    vacuumed: number[];
    deadRows: number[];
    labels: string[];
  };
  summary: Record<string, string>;
};

/* ---------- Props 타입 ---------- */
type Props = {
  tableName?: string; // 직접 전달받는 경우 (예: 모달)
};

/* ---------- 페이지 ---------- */
export default function VacuumDetailPage({ tableName: propTableName }: Props) {
  const { selectedInstance, selectedDatabase } = useInstanceContext();
  const [data, setData] = useState<VacuumDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // URL state 또는 props에서 테이블명 가져오기
  const tableName = propTableName || 
    (typeof window !== 'undefined' && window.history.state?.usr?.tableName) || 
    "";

  // 진행 중 여부 판단
  const isOngoing = data?.endTime === null || data?.endTime === undefined || data?.endTime === "N/A";

  // 데이터 조회
  useEffect(() => {
    if (!selectedInstance || !selectedDatabase || !tableName) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchVacuumDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const databaseId = selectedDatabase.databaseId;
        
        console.log('Fetching vacuum detail...', {
          instanceId: selectedInstance.instanceId,
          databaseId,
          tableName
        });
        
        const response = await apiClient.get<ApiVacuumDetailResponse>(
          '/vacuum/detail',
          {
            params: {
              databaseId: Number(databaseId),
              tableName: tableName
            }
          }
        );
        
        console.log('API Response:', response.data);
        
        setData(response.data);
      } catch (err: any) {
        console.error('Failed to fetch vacuum detail:', err);
        console.error('Error details:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status
        });
        setError(err.response?.data?.message || err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchVacuumDetail();
  }, [selectedInstance, selectedDatabase, tableName]);

  const progressSeries = useMemo(
    () => data ? [
      { name: "Heap Bytes Scanned", data: data.progress.scanned },
      { name: "Heap Bytes Vacuumed", data: data.progress.vacuumed },
      { name: "Dead Rows", data: data.progress.deadRows },
    ] : [],
    [data]
  );

  // 데이터 그룹핑
  const performanceMetrics = data ? {
    "Time Elapsed": data.summary["Time Elapsed"],
    "CPU Time": data.summary["CPU Time"],
    "Avg Read Rate": data.summary["Avg Read Rate"],
    "Avg Write Rate": data.summary["Avg Write Rate"],
  } : {};

  const dataIO = data ? {
    "Data Read from Cache": data.summary["Data Read from Cache"],
    "Data Read from Disk": data.summary["Data Read from Disk"],
    "Data Flushed to Disk": data.summary["Data Flushed to Disk"],
  } : {};

  const tuples = data ? {
    "Tuples Deleted": data.summary["Tuples Deleted"],
    "Tuples Remaining": data.summary["Tuples Remaining"],
    "Tuples Dead But Not Removable": data.summary["Tuples Dead But Not Removable"],
    "Max Dead Tuples / Phase": data.summary["Max Dead Tuples / Phase"],
  } : {};

  const pages = data ? {
    "Pages Remaining": data.summary["Pages Remaining"],
    "Pages Skipped Frozen": data.summary["Pages Skipped Frozen"],
    "Pages Removed": data.summary["Pages Removed"],
    "Pages Skipped Due To Pin": data.summary["Pages Skipped Due To Pin"],
  } : {};

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

  // 테이블명이 없는 경우
  if (!tableName) {
    return (
      <div className="vd-root">
        <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
          <p style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>
            테이블을 선택해주세요
          </p>
          <p style={{ fontSize: '14px', color: '#9CA3AF', marginTop: '8px' }}>
            Vacuum 세션 목록 또는 히스토리에서 테이블을 클릭하여 상세 정보를 확인하세요.
          </p>
        </div>
      </div>
    );
  }

  // 로딩 상태
  if (loading) {
    return (
      <div className="vd-root">
        <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
          <p style={{ fontSize: '16px' }}>
            Loading vacuum detail for <strong>{tableName}</strong>...
          </p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="vd-root">
        <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
          <p style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>
            Failed to load vacuum detail
          </p>
          <p style={{ fontSize: '14px', marginTop: '8px' }}>{error}</p>
          <p style={{ fontSize: '12px', marginTop: '16px', color: '#6B7280' }}>
            Instance: {selectedInstance.instanceName} / Database: {selectedDatabase.databaseName} / Table: {tableName}
          </p>
        </div>
      </div>
    );
  }

  // 데이터가 없는 경우
  if (!data) {
    return (
      <div className="vd-root">
        <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
          <p>No data available for table: <strong>{tableName}</strong></p>
        </div>
      </div>
    );
  }

  return (
    <div className="vd-root">
      {/* 상단 메타정보 */}
      <div className="vd-grid4">
        <section className="vd-card">
          <header className="vd-card__header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2>VACUUM - {data.tableName}</h2>
              {isOngoing && (
                <span className="vd-badge vd-badge--info" style={{ fontSize: '14px' }}>
                  진행 중
                </span>
              )}
            </div>
            <div className="vd-kpis">
              <div className="vd-chip">
                <span className="vd-chip__label">Autovacuum</span>
                <span className="vd-chip__value">{data.autovacuum ? "Yes" : "No"}</span>
              </div>
              <div className="vd-chip">
                <span className="vd-chip__label">Start</span>
                <span className="vd-chip__value">{data.startTime}</span>
              </div>
              {isOngoing ? (
                <div className="vd-chip">
                  <span className="vd-chip__label">Elapsed</span>
                  <span className="vd-chip__value">
                    {data.duration || data.summary["Time Elapsed"] || "진행 중"}
                  </span>
                </div>
              ) : (
                <>
                  <div className="vd-chip">
                    <span className="vd-chip__label">End</span>
                    <span className="vd-chip__value">{data.endTime}</span>
                  </div>
                  <div className="vd-chip">
                    <span className="vd-chip__label">Duration</span>
                    <span className="vd-chip__value">{data.duration}</span>
                  </div>
                </>
              )}
            </div>
          </header>
        </section>
      </div>

      {/* Progress 차트 */}
      <div className="vd-grid5">
        <section className="vd-card vd-chart2">
          <header className="vd-card__header">
            <h3>Progress</h3>
          </header>
          <Chart
            type="line"
            series={progressSeries}
            categories={data.progress.labels}
            height="100%"
            width="100%"
            showLegend={true}
            showToolbar={false}
            colors={["#6366F1", "#10B981", "#FBBF24"]}
            customOptions={{
              chart: { redrawOnParentResize: true, redrawOnWindowResize: true },
              stroke: { curve: "smooth", width: 2 },
              grid: { borderColor: "#E5E7EB", strokeDashArray: 4 },
              legend: { position: "bottom" },
              yaxis: { title: { text: "GB" }, min: 0 },
            }}
          />
        </section>

      {/* 성능 및 데이터 I/O */}
      <div className="vd-grid3">
        <section className="vd-card">
          <header className="vd-card__header">
            <h3>성능 지표</h3>
          </header>
          <div className="vd-tablewrap">
            <table className="vd-table2">
              <tbody>
                {Object.entries(performanceMetrics).map(([key, value]) => (
                  <tr key={key}>
                    <td><strong>{key}</strong></td>
                    <td>
                      {value}
                      {isOngoing && key === "Time Elapsed" && (
                        <span style={{ marginLeft: '8px', color: '#6366F1' }}>⏱️</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="vd-card">
          <header className="vd-card__header">
            <h3>데이터 I/O</h3>
          </header>
          <div className="vd-tablewrap">
            <table className="vd-table2">
              <tbody>
                {Object.entries(dataIO).map(([key, value]) => (
                  <tr key={key}>
                    <td><strong>{key}</strong></td>
                    <td>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="vd-card">
          <header className="vd-card__header">
            <h3>튜플</h3>
          </header>
          <div className="vd-tablewrap">
            <table className="vd-table2">
              <tbody>
                {Object.entries(tuples).map(([key, value]) => (
                  <tr key={key}>
                    <td><strong>{key}</strong></td>
                    <td>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="vd-card">
          <header className="vd-card__header">
            <h3>페이지</h3>
          </header>
          <div className="vd-tablewrap">
            <table className="vd-table2">
              <tbody>
                {Object.entries(pages).map(([key, value]) => (
                  <tr key={key}>
                    <td><strong>{key}</strong></td>
                    <td>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
    
    </div>
  );
}