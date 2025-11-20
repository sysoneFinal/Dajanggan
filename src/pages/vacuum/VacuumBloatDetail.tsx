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
  const [tableListLoading, setTableListLoading] = useState(false);

  // ========================================
  // 📌 테이블 목록 조회 (Database 변경 시)
  // ========================================
  useEffect(() => {
    if (!selectedInstance || !selectedDatabase) {
      setTableList([]);
      setSelectedTable("");
      return;
    }

    const fetchTableList = async () => {
      try {
        setTableListLoading(true);
        const databaseId = selectedDatabase.databaseId;
        const instanceId = selectedInstance.instanceId;
        
        console.log('🔍 Fetching table list for database:', {
          instanceId,
          instanceName: selectedInstance.instanceName,
          databaseId,
          databaseName: selectedDatabase.databaseName,
        });
        
        const response = await apiClient.get<string[]>('/vacuum/bloat/detail/tables', {
          params: { 
            databaseId: Number(databaseId),
            instanceId: Number(instanceId)
          }
        });
        
        console.log('✅ Table list response:', response.data);
        
        if (response.data && response.data.length > 0) {
          setTableList(response.data);
          // 첫 번째 테이블을 자동 선택
          setSelectedTable(response.data[0]);
        } else {
          console.warn('⚠️ No tables found in database');
          setTableList([]);
          setSelectedTable("");
        }
      } catch (err: any) {
        console.error('❌ Failed to fetch table list:', err);
        console.error('Error details:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status
        });
        
        // API 실패 시 빈 목록으로 설정
        setTableList([]);
        setSelectedTable("");
        setError(err.response?.data?.message || 'Failed to load table list');
      } finally {
        setTableListLoading(false);
      }
    };

    fetchTableList();
  }, [selectedInstance, selectedDatabase]); // Instance와 Database 변경 시마다 테이블 목록 새로 조회

  // ========================================
  // 📌 대시보드 데이터 조회 (테이블 선택 시)
  // ========================================
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
        const instanceId = selectedInstance.instanceId;
        
        console.log('🔍 Fetching bloat detail dashboard...', {
          instanceId,
          instanceName: selectedInstance.instanceName,
          databaseId,
          databaseName: selectedDatabase.databaseName,
          tableName: selectedTable
        });
        
        const response = await apiClient.get<ApiDashboardResponse>(
          '/vacuum/bloat/detail/dashboard',
          {
            params: {
              databaseId: Number(databaseId),
              instanceId: Number(instanceId),
              tableName: selectedTable
            }
          }
        );
        
        console.log('✅ Bloat detail API response:', response.data);
        
        setData(response.data);
      } catch (err: any) {
        console.error('❌ Failed to fetch bloat detail:', err);
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
  }, [selectedInstance, selectedDatabase, selectedTable]); // 테이블 변경 시마다 데이터 새로 조회

  // ========================================
  // 차트 데이터 변환
  // ========================================
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

  // ========================================
  // Instance나 Database가 선택되지 않은 경우
  // ========================================
  if (!selectedInstance || !selectedDatabase) {
    return null;
  }

  // ========================================
  // 렌더링
  // ========================================
  return (
    <div className="vd-root">
      <div className="vd-grid4">
        <VacuumTableMenu
          tables={tableList || []}
          selectedTable={selectedTable || ""}
          onChange={(t: string) => {
            console.log('📝 Table selected:', t);
            setSelectedTable(t);
          }}
          onToggle={onToggle}
          expanded={expanded}
          loading={tableListLoading}
        />
      </div>

      {/* 테이블 목록 로딩 */}
      {tableListLoading && (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center', 
          color: '#6B7280',
          backgroundColor: '#F9FAFB',
          borderRadius: '8px',
          margin: '16px'
        }}>
          <div style={{ fontSize: '16px', marginBottom: '8px' }}>
            테이블 목록을 불러오는 중...
          </div>
          <div style={{ fontSize: '14px', color: '#9CA3AF' }}>
            Instance: <strong>{selectedInstance.instanceName}</strong>
            {' / '}
            Database: <strong>{selectedDatabase.databaseName}</strong>
          </div>
        </div>
      )}

      {/* 테이블 없음 */}
      {!tableListLoading && tableList.length === 0 && !selectedTable && (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center', 
          color: '#6B7280',
          backgroundColor: '#FEF3C7',
          borderRadius: '8px',
          margin: '16px'
        }}>
          <p style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>
            ⚠️ 테이블이 없습니다
          </p>
          <p style={{ fontSize: '14px', marginTop: '8px' }}>
            Instance "<strong>{selectedInstance.instanceName}</strong>"
            {' / '}
            Database "<strong>{selectedDatabase.databaseName}</strong>"에서 
            최근 30일 내 데이터가 있는 테이블을 찾을 수 없습니다.
          </p>
        </div>
      )}

      {/* 대시보드 데이터 로딩 */}
      {loading && selectedTable && (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center', 
          color: '#6B7280',
          backgroundColor: '#F9FAFB',
          borderRadius: '8px',
          margin: '16px'
        }}>
          <div style={{ fontSize: '16px', marginBottom: '8px' }}>
            Loading bloat detail data for <strong>{selectedTable}</strong>...
          </div>
          <div style={{ fontSize: '14px', color: '#9CA3AF' }}>
            Instance: <strong>{selectedInstance.instanceName}</strong>
            {' / '}
            Database: <strong>{selectedDatabase.databaseName}</strong>
          </div>
        </div>
      )}

      {/* 에러 상태 */}
      {error && !loading && (
        <div style={{ 
          padding: '24px',
          backgroundColor: '#FEE2E2',
          color: '#991B1B',
          borderRadius: '8px',
          margin: '16px'
        }}>
          <p style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>
            ⚠️ Failed to load bloat detail
          </p>
          <p style={{ fontSize: '14px', marginTop: '8px' }}>{error}</p>
          <p style={{ fontSize: '12px', marginTop: '16px', color: '#7F1D1D' }}>
            Instance: {selectedInstance.instanceName} 
            {' / '}
            Database: {selectedDatabase.databaseName}
            {selectedTable && ` / Table: ${selectedTable}`}
          </p>
        </div>
      )}

      {/* 데이터 표시 */}
      {data && !loading && selectedTable && (
        <div
          className={`vd-collapse ${expanded ? "is-open" : ""}`}
          aria-hidden={!expanded}
          style={{ display: expanded ? "block" : "none" }}
        >
          <div className="vd-grid">
            <SummaryCard
              label="Bloat %"
              value={data.kpi.bloatPct}
            />
            <SummaryCard
              label="Table Size"
              value={data.kpi.tableSize}
            />
            <SummaryCard
              label="Wasted Space"
              value={data.kpi.wastedSpace}
            />
          </div>

          {/* ---------- 차트 ---------- */}
          <ChartGridLayout>
            <WidgetCard title="Bloat 추이(Last 30 Days)" span={4}>
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
                  yaxis: { 
                    min: 0, 
                    title: { text: "Bloat %" },
                    labels: {
                      formatter: (value: number) => value.toFixed(2)
                    } 
                  },
                }}
              />
            </WidgetCard>
            <WidgetCard title="Dead Tuples 추이 (Last 30 Days)" span={4}>
              <Chart
                type="line"
                series={deadTuplesSeries}
                categories={data.deadTuplesTrend.labels}
                width="100%"
              />
            </WidgetCard>

            <WidgetCard title="Index Bloat 추이 (Last 30 Days)" span={4}>
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
    </div>
  );
}