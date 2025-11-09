import { useMemo, useState, useEffect } from "react";
import Chart from "../../components/chart/ChartComponent";
import ChartGridLayout from "../../components/layout/ChartGridLayout";
import WidgetCard from "../../components/util/WidgetCard";
import SummaryCard from "../../components/util/SummaryCard";
import VacuumTableMenu from "./VacuumTableMenu";
import apiClient from "../../api/apiClient";
import { useInstanceContext } from "../../context/InstanceContext";
import "/src/styles/vacuum/VacuumPage.css";

type Props = {
  expanded?: boolean;
  onToggle?: () => void;
};

/* ---------- 타입 정의 ---------- */
type BloatDetailData = {
  kpi: { bloatPct: string; tableSize: string; wastedSpace: string };
  bloatTrend: { data: number[]; labels: string[] };
  deadTuplesTrend: { data: number[]; labels: string[] };
  indexBloatTrend: { data: number[][]; labels: string[]; names: string[] };
};

// 백엔드 API 응답 타입
type ApiKpiResponse = {
  bloatPct: string;
  tableSize: string;
  wastedSpace: string;
};

type ApiBloatTrendResponse = {
  data: number[];
  labels: string[];
};

type ApiDeadTuplesTrendResponse = {
  data: number[];
  labels: string[];
};

type ApiIndexBloatTrendResponse = {
  data: number[][];
  labels: string[];
  names: string[];
};

type ApiDashboardResponse = {
  kpi: ApiKpiResponse;
  bloatTrend: ApiBloatTrendResponse;
  deadTuplesTrend: ApiDeadTuplesTrendResponse;
  indexBloatTrend: ApiIndexBloatTrendResponse;
};

/* ---------- 페이지 컴포넌트 ---------- */
export default function BloatDetailPage({ onToggle, expanded = true }: Props) {
  const { selectedInstance, selectedDatabase } = useInstanceContext();
  const [data, setData] = useState<BloatDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [tableList, setTableList] = useState<string[]>([]);

  // 테이블 목록 조회
  useEffect(() => {
    if (!selectedDatabase) {
      setTableList([]);
      setSelectedTable("");
      return;
    }

    const fetchTableList = async () => {
      try {
        const databaseId = selectedDatabase.databaseId;
        console.log('Fetching table list for database:', databaseId);
        
        const response = await apiClient.get<string[]>('/vacuum/bloat/detail/tables', {
          params: { databaseId: Number(databaseId) }
        });
        
        console.log('Table list response:', response.data);
        
        if (response.data && response.data.length > 0) {
          setTableList(response.data);
          setSelectedTable(response.data[0]);
        } else {
          // 응답이 비어있으면 기본값 사용
          const defaultTables = ["users"];
          setTableList(defaultTables);
          setSelectedTable(defaultTables[0]);
        }
      } catch (err: any) {
        console.error('Failed to fetch table list:', err);
        // API 실패 시 기본 테이블 목록 사용
        const defaultTables = ["users"];
        setTableList(defaultTables);
        setSelectedTable(defaultTables[0]);
      }
    };

    fetchTableList();
  }, [selectedDatabase]);

  // 대시보드 데이터 조회
  useEffect(() => {
    if (!selectedInstance || !selectedDatabase || !selectedTable) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const databaseId = selectedDatabase.databaseId;
        
        console.log('Fetching bloat detail dashboard...', {
          instanceId: selectedInstance.instanceId,
          databaseId,
          tableName: selectedTable
        });
        
        const response = await apiClient.get<ApiDashboardResponse>(
          '/vacuum/bloat/detail/dashboard',
          {
            params: {
              databaseId: Number(databaseId),
              tableName: selectedTable
            }
          }
        );
        
        console.log('API Response:', response.data);
        
        setData(response.data);
      } catch (err: any) {
        console.error('Failed to fetch bloat detail:', err);
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

    fetchDashboardData();
  }, [selectedInstance, selectedDatabase, selectedTable]);

  // 차트 데이터 변환
  const bloatTrendSeries = useMemo(
    () => data ? [{ name: "Bloat %", data: data.bloatTrend.data }] : [],
    [data]
  );
  
  const deadTuplesSeries = useMemo(
    () => data ? [{ name: "Dead Tuples", data: data.deadTuplesTrend.data }] : [],
    [data]
  );
  
  const indexBloatSeries = useMemo(
    () => data
      ? data.indexBloatTrend.names.map((name, i) => ({
          name,
          data: data.indexBloatTrend.data[i]
        }))
      : [],
    [data]
  );

  // Instance나 Database가 선택되지 않은 경우 아무것도 렌더링하지 않음
  if (!selectedInstance || !selectedDatabase) {
    return null;
  }

  return (
    <div className="vd-root">
      <div className="vd-grid4">
        <VacuumTableMenu
          tables={tableList}
          selectedTable={selectedTable}
          onChange={(t: string) => {
            setSelectedTable(t);
          }}
          onToggle={onToggle}
          expanded={expanded}
        />
      </div>

      {/* 로딩 상태 */}
      {loading && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
          Loading bloat detail data for <strong>{selectedTable}</strong>...
        </div>
      )}

      {/* 에러 상태 */}
      {error && !loading && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
          <p style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>
            Failed to load bloat detail
          </p>
          <p style={{ fontSize: '14px', marginTop: '8px' }}>{error}</p>
          <p style={{ fontSize: '12px', marginTop: '16px', color: '#6B7280' }}>
            Instance: {selectedInstance.instanceName} / Database: {selectedDatabase.databaseName}
          </p>
        </div>
      )}

      {/* 데이터 표시 */}
      {data && !loading && (
        <div
          className={`vd-collapse ${expanded ? "is-open" : ""}`}
          aria-hidden={!expanded}
          style={{ display: expanded ? "block" : "none" }}
        >
          <div className="vd-grid">
            <SummaryCard
              label="Bloat %"
              value={data.kpi.bloatPct}
              diff={3}
            />
            <SummaryCard
              label="Table Size"
              value={data.kpi.tableSize}
              diff={3}
            />
            <SummaryCard
              label="Wasted Space"
              value={data.kpi.wastedSpace}
              diff={3}
            />
          </div>

          {/* ---------- 차트 ---------- */}
          <ChartGridLayout>
            <WidgetCard title="Bloat % Trend(Last 30 Days)" span={4}>
              <Chart
                type="line"
                series={bloatTrendSeries}
                categories={data.bloatTrend.labels}
                width="100%"
                showLegend={false}
                colors={["#6366F1"]}
                customOptions={{
                  stroke: { width: 2, curve: "smooth" },
                  grid: { borderColor: "#E5E7EB", strokeDashArray: 4 },
                  yaxis: { min: 0, title: { text: "Bloat %" } },
                }}
              />
            </WidgetCard>
            <WidgetCard title="Dead Tuples Trend (Last 30 Days)" span={4}>
              <Chart
                type="line"
                series={deadTuplesSeries}
                categories={data.deadTuplesTrend.labels}
                width="100%"
              />
            </WidgetCard>

            <WidgetCard title="Index Bloat Trend (Last 30 Days)" span={4}>
              <Chart
                type="line"
                series={indexBloatSeries}
                categories={data.indexBloatTrend.labels}
                width="100%"
              />
            </WidgetCard>
          </ChartGridLayout>
        </div>
      )}

      {/* 데이터 없음 (초기 상태) */}
      {!data && !loading && !error && selectedTable && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
          <p>테이블 데이터를 불러오는 중...</p>
        </div>
      )}
    </div>
  );
}