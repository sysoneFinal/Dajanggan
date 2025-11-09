import { Fragment, useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    flexRender,
    type ColumnDef,
    type SortingState,
} from "@tanstack/react-table";
import Pagination from "../../components/util/Pagination";
import CsvButton from "../../components/util/CsvButton";
import MultiSelectDropdown from "../../components/util/MultiSelectDropdown";
import apiClient from "../../api/apiClient";
import "/src/styles/vacuum/VacuumHistory-list.css";

/* ---------- 타입 정의 ---------- */
type VacuumHistoryRow = {
  executedAt: string;
  table: string;
  type: "Vacuum" | "Autovacuum" | "Analyze";
  trigger: "Manual" | "Autovacuum" | "Schedule";
  status: "완료" | "실패" | "취소";
  tuples: string;
  duration: string;
  bloatBefore: string;
  bloatAfter: string;
};

// 백엔드 API 응답 타입
type ApiHistoryRow = {
  databaseId: number;
  lastVacuum: string;
  lastAutovacuum: string;
  deadTuples: number;
  modSinceAnalyze: number;
  bloatBytes: number;
  bloatRatio: number;
  tableSize: number;
  vacuumCount24h: number;
  autovacuumCount24h: number;
};

/* ---------- 유틸리티 함수 ---------- */
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function formatBloatRatio(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

function transformApiResponse(apiData: ApiHistoryRow[]): VacuumHistoryRow[] {
  if (!apiData || !Array.isArray(apiData)) {
    console.warn('Invalid API response:', apiData);
    return [];
  }

  return apiData.flatMap(row => {
    const results: VacuumHistoryRow[] = [];
    
    // Vacuum 이력
    if (row.lastVacuum) {
      results.push({
        executedAt: formatDateTime(row.lastVacuum),
        table: `DB_${row.databaseId}`,
        type: "Vacuum",
        trigger: "Manual",
        status: "완료",
        tuples: formatNumber(row.deadTuples || 0),
        duration: "-", // API에서 duration 정보가 없음
        bloatBefore: formatBloatRatio(row.bloatRatio || 0),
        bloatAfter: "-", // API에서 after 정보가 없음
      });
    }
    
    // Autovacuum 이력
    if (row.lastAutovacuum) {
      results.push({
        executedAt: formatDateTime(row.lastAutovacuum),
        table: `DB_${row.databaseId}`,
        type: "Autovacuum",
        trigger: "Autovacuum",
        status: "완료",
        tuples: formatNumber(row.deadTuples || 0),
        duration: "-",
        bloatBefore: formatBloatRatio(row.bloatRatio || 0),
        bloatAfter: "-",
      });
    }
    
    return results;
  }).sort((a, b) => {
    // 최신 순으로 정렬
    return new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime();
  });
}

/* ---------- 메인 컴포넌트 ---------- */
export default function VacuumHistoryTable() {
  const [data, setData] = useState<VacuumHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([{ id: "executedAt", desc: true }]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedHours, setSelectedHours] = useState<number>(168); // 기본 7일
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const pageSize = 14;
  const navigate = useNavigate();

  // API 호출
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching vacuum history data...', { hours: selectedHours, status: selectedStatus });
        
        const response = await apiClient.get<ApiHistoryRow[]>(
          '/vacuum/history',
          {
            params: {
              hours: selectedHours,
              status: selectedStatus,
            }
          }
        );
        
        console.log('API Response:', response.data);
        
        const transformedData = transformApiResponse(response.data);
        console.log('Transformed Data:', transformedData);
        
        setData(transformedData);
        setCurrentPage(1); // 필터 변경 시 첫 페이지로
      } catch (err: any) {
        console.error('Failed to fetch vacuum history:', err);
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

    fetchData();
  }, [selectedHours, selectedStatus]); // 필터 변경 시 재조회

  // 컬럼 정의
  const columns = useMemo<ColumnDef<VacuumHistoryRow>[]>(
    () => [
      {
        accessorKey: "executedAt",
        header: "실행 시각",
        cell: (info) => (
          <div className="vd-td-strong">{info.getValue() as string}</div>
        ),
      },
      {
        accessorKey: "table",
        header: "테이블",
        cell: (info) => info.getValue(),
      },
      {
        accessorKey: "type",
        header: "작업 유형",
        cell: (info) => {
          const value = info.getValue() as string;
          return <span>{value}</span>;
        },
      },
      {
        accessorKey: "trigger",
        header: "트리거",
        cell: (info) => info.getValue(),
      },
      {
        accessorKey: "status",
        header: "상태",
        cell: (info) => {
          const value = info.getValue() as string;
          const statusClass = 
            value === "완료" ? "vd-badge--ok" :
            value === "실패" ? "vd-badge--error" :
            "vd-badge--warn";
          return (
            <span className={`vd-badge ${statusClass}`}>
              {value}
            </span>
          );
        },
      },
      {
        accessorKey: "tuples",
        header: "처리량",
        cell: (info) => info.getValue(),
      },
      {
        accessorKey: "duration",
        header: "소요 시간",
        cell: (info) => info.getValue(),
      },
      {
        accessorKey: "bloatBefore",
        header: "시작 Bloat",
        cell: (info) => info.getValue(),
      },
      {
        accessorKey: "bloatAfter",
        header: "종료 Bloat",
        cell: (info) => info.getValue(),
      },
    ],
    []
  );

  // 테이블 인스턴스 생성
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      pagination: {
        pageIndex: currentPage - 1,
        pageSize,
      },
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: false,
  });

  const totalPages = Math.ceil(data.length / pageSize);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRowClick = (row: VacuumHistoryRow) => {
    navigate("/database/vacuum/history-detail", {
      state: { historyData: row },
    });
  };

  // CSV 내보내기 함수
  const handleExportCSV = () => {
    const headers = [
      "실행 시각",
      "테이블",
      "작업 유형",
      "트리거",
      "상태",
      "처리량",
      "소요 시간",
      "시작 Bloat",
      "종료 Bloat"
    ];
    const csvData = data.map((row) => [
      row.executedAt,
      row.table,
      row.type,
      row.trigger,
      row.status,
      row.tuples,
      row.duration,
      row.bloatBefore,
      row.bloatAfter
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
    const fileName = `vacuum_history_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 로딩 상태
  if (loading) {
    return (
      <main className="vacuum-page">
        <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
          Loading history data...
        </div>
      </main>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <main className="vacuum-page">
        <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
          <p>Failed to load vacuum history</p>
          <p style={{ fontSize: '14px', marginTop: '8px' }}>{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="vacuum-page">
      {/* 필터 선택 영역 */}
      <section className="vacuum-page__filters">
        <MultiSelectDropdown
          label="기간"
          options={[
            "오늘",
            "최근 7일",
            "최근 30일",
            "사용자 지정",
          ]}
          onChange={(values) => console.log("선택된 기간:", values)}
        />
        <MultiSelectDropdown
          label="작업 유형"
          options={["Vacuum", "Autovacuum", "Analyze"]}
          onChange={(values) => console.log("선택된 작업:", values)}
        />
        <MultiSelectDropdown
          label="상태"
          options={["완료", "실패", "취소"]}
          onChange={(values) => console.log("선택된 상태:", values)}
        />
        <CsvButton onClick={handleExportCSV} tooltip="CSV 파일 저장" />
      </section>

      {/* History 테이블 */}
      <section className="vacuum-page__table">
        <div className="vacuum-table-header">
          {table.getHeaderGroups().map((headerGroup) => (
            <Fragment key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <div
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  style={{ cursor: "pointer" }}
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
                  {header.column.getIsSorted() && (
                    <span className="sort-icon">
                      {header.column.getIsSorted() === "asc" ? " ▲" : " ▼"}
                    </span>
                  )}
                </div>
              ))}
            </Fragment>
          ))}
        </div>

        {table.getRowModel().rows.length > 0 ? (
          table.getRowModel().rows.map((row) => (
            <div
              key={row.id}
              className="vacuum-table-row vacuum-table-row--hover"
              onClick={() => handleRowClick(row.original)}
              style={{ cursor: "pointer" }}
            >
              {row.getVisibleCells().map((cell) => (
                <div key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </div>
              ))}
            </div>
          ))
        ) : (
          <div className="vacuum-table-empty">데이터가 없습니다.</div>
        )}
      </section>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </main>
  );
}