import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Chart from "../../components/chart/ChartComponent";
import ChartGridLayout from "../../components/layout/ChartGridLayout";
import WidgetCard from "../../components/util/WidgetCard";
import SummaryCard from "../../components/util/SummaryCard";
import VacuumTableMenu from "./VacuumTableMenu";
import apiClient from "../../api/apiClient";
import { useInstanceContext } from "../../context/InstanceContext";
import { intervalToMs } from "../../utils/time";
import "/src/styles/vacuum/VacuumPage.css";

type Props = {
  expanded?: boolean;
  onToggle?: () => void;
};

/* ---------- 타입 정의 ---------- */
type BloatDetailData = {
  kpi: { 
    bloatPct: string; 
    tableSize: string; 
    wastedSpace: string;
  };
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

/* ---------- Severity 유틸 함수 ---------- */
// Bloat % 값에서 숫자 추출 (예: "45%" -> 45)
const extractBloatPercentage = (bloatPct: string): number => {
  if (!bloatPct) return 0;
  // "45%" 또는 "45.5%" 같은 형식에서 숫자만 추출
  const match = bloatPct.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
};

// 0-20%: 정상 (NORMAL)
// 20-40%: 주의 (WARNING)
// 40%+: 경고 (CRITICAL)
const calculateBloatSeverity = (bloatPct: string): "NORMAL" | "WARNING" | "CRITICAL" => {
  const percentage = extractBloatPercentage(bloatPct);
  
  if (percentage >= 40) {
    return "CRITICAL";
  } else if (percentage >= 20) {
    return "WARNING";
  } else {
    return "NORMAL";
  }
};

// ✅ Severity를 SummaryCard status로 변환
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

/* ---------- 페이지 컴포넌트 ---------- */
export default function BloatDetailPage({ onToggle, expanded = true }: Props) {
  const { selectedInstance, selectedDatabase, refreshInterval } = useInstanceContext();
  const [selectedTable, setSelectedTable] = useState<string>("");

  // ========================================
  // 📌 테이블 목록 조회 (React Query로 자동 새로고침)
  // ========================================
  const { data: tableList = [], isLoading: tableListLoading } = useQuery<string[]>({
    queryKey: ["vacuum-bloat-tables", selectedInstance?.instanceId, selectedDatabase?.databaseId],
    queryFn: async () => {
      if (!selectedInstance || !selectedDatabase) return [];

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
        // 첫 번째 테이블을 자동 선택
        if (!selectedTable) {
          setSelectedTable(response.data[0]);
        }
        return response.data;
      } else {
        console.warn('⚠️ No tables found in database');
        return [];
      }
    },
    enabled: !!selectedInstance && !!selectedDatabase,
    refetchInterval: intervalToMs(refreshInterval), // ** 중요 ** 새로고침 주기 적용
  });

  // ========================================
  // 📌 대시보드 데이터 조회 (React Query로 자동 새로고침)
  // ========================================
  const { data, isLoading: loading, error: queryError } = useQuery<BloatDetailData>({
    queryKey: ["vacuum-bloat-detail", selectedInstance?.instanceId, selectedDatabase?.databaseId, selectedTable],
    queryFn: async () => {
      if (!selectedInstance || !selectedDatabase || !selectedTable) return null;

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
      
      // ✅ 데이터 검증 및 기본값 설정
      if (!response.data) {
        throw new Error("응답 데이터가 없습니다.");
      }

      const validated: BloatDetailData = {
        kpi: {
          bloatPct: response.data.kpi?.bloatPct || "0%",
          tableSize: response.data.kpi?.tableSize || "0B",
          wastedSpace: response.data.kpi?.wastedSpace || "0B",
        },
        bloatTrend: {
          data: response.data.bloatTrend?.data || [],
          labels: response.data.bloatTrend?.labels || []
        },
        deadTuplesTrend: {
          data: response.data.deadTuplesTrend?.data || [],
          labels: response.data.deadTuplesTrend?.labels || []
        },
        indexBloatTrend: {
          data: response.data.indexBloatTrend?.data || [[]],
          labels: response.data.indexBloatTrend?.labels || [],
          names: response.data.indexBloatTrend?.names || []
        }
      };

      return validated;
    },
    enabled: !!selectedInstance && !!selectedDatabase && !!selectedTable,
    refetchInterval: intervalToMs(refreshInterval), // ** 중요 ** 새로고침 주기 적용
  });

  const error = queryError ? (queryError instanceof Error ? queryError.message : "대시보드 로딩 실패") : null;

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
              status={severityToStatus(calculateBloatSeverity(data.kpi.bloatPct))}
              desc={
                calculateBloatSeverity(data.kpi.bloatPct) === "CRITICAL" 
                  ? ""
                  : undefined
              }
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
            <WidgetCard title="Bloat 추이 (최근 30일 내)" span={4}>
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
                    max: 100,
                    title: { text: "Bloat %" },
                    labels: {
                      formatter: (value: number) => value.toFixed(2)
                    } 
                  },
                  // ✅ Bloat % 임계값 선 추가
                  // 0-20%: 정상 (NORMAL)
                  // 20-40%: 주의 (WARNING)
                  // 40%+: 경고 (CRITICAL)
                  annotations: {
                    yaxis: [
                      {
                        y: 20,
                        borderColor: "#f59e0b", // green (정상)
                        strokeDashArray: 4,
                        label: {
                          text: "정상 (20%)",
                          position: "right",
                          style: {
                            background: "transparent",
                            color: "#f59e0b",
                            fontSize: "11px",
                            fontWeight: 500
                          }
                        },
                      },
                      {
                        y: 40,
                        borderColor: "#ef4444", // amber (주의)
                        strokeDashArray: 8,
                        label: {
                          text: "주의 (40%)",
                          position: "right",
                          style: {
                            background: "transparent",
                            color: "#ef4444",
                            fontSize: "11px",
                            fontWeight: 500
                          }
                        },
                      },
                    ],
                  },
                }}
              />
            </WidgetCard>
            <WidgetCard title="Dead Tuples 추이 (최근 30일 내)" span={4}>
              <Chart
                type="line"
                series={deadTuplesSeries}
                categories={data.deadTuplesTrend.labels}
                width="100%"
              />
            </WidgetCard>

            <WidgetCard title="Index Bloat 추이 (최근 30일 내)" span={4}>
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