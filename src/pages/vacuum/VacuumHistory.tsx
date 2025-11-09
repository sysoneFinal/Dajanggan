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
import { useInstanceContext } from "../../context/InstanceContext";
import "/src/styles/vacuum/VacuumHistory-list.css";

/* ---------- 타입 정의 ---------- */
type VacuumHistoryRow = {
  executedAt: string;
  table: string;
  type: "Vacuum" | "Autovacuum" | "Analyze";
  trigger: "Manual" | "Autovacuum" | "Schedule";
  status: "완료" | "실패" | "취소" | "정상" | "주의";
  tuples: string;
  duration: string;
  bloatBefore: string;
  bloatAfter: string;
};

type ApiHistoryRow = {
  table: string;
  lastVacuum: string;
  lastAutovacuum: string;
  deadTuples: string;
  modSinceAnalyze: string;
  bloatPct: string;
  frequency: string;
  status: string;
};

/* ---------- 유틸리티 ---------- */
function transformApiResponse(apiData: ApiHistoryRow[]): VacuumHistoryRow[] {
  if (!apiData || !Array.isArray(apiData)) {
    console.warn("Invalid API response:", apiData);
    return [];
  }

  const rows = apiData.flatMap((row) => {
    const results: VacuumHistoryRow[] = [];

    if (row.lastVacuum && row.lastVacuum !== "-") {
      results.push({
        executedAt: row.lastVacuum,
        table: row.table,
        type: "Vacuum",
        trigger: "Manual",
        status: row.status === "주의" ? "주의" : "정상",
        tuples: row.deadTuples,
        duration: "-",
        bloatBefore: row.bloatPct,
        bloatAfter: "-",
      });
    }

    if (row.lastAutovacuum && row.lastAutovacuum !== "-") {
      results.push({
        executedAt: row.lastAutovacuum,
        table: row.table,
        type: "Autovacuum",
        trigger: "Autovacuum",
        status: row.status === "주의" ? "주의" : "정상",
        tuples: row.deadTuples,
        duration: "-",
        bloatBefore: row.bloatPct,
        bloatAfter: "-",
      });
    }

    return results;
  });

  rows.sort(
    (a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime()
  );
  return rows;
}

/* ---------- 메인 컴포넌트 ---------- */
export default function VacuumHistoryTable() {
  const { selectedInstance, selectedDatabase } = useInstanceContext();
  const [data, setData] = useState<VacuumHistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 정렬/페이지
  const [sorting, setSorting] = useState<SortingState>([
    { id: "executedAt", desc: true },
  ]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 14;

  // 필터 상태
  const [selectedPeriod, setSelectedPeriod] = useState<string>("최근 7일");
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const navigate = useNavigate();

  /* ---------- API 호출 (Instance/Database 변경시만) ---------- */
  useEffect(() => {
    if (!selectedInstance) {
      setData([]);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 최대 범위(30일)로 한번만 조회
        const params: any = { hours: 720 }; // 30일
        const databaseId = selectedDatabase?.databaseId;
        if (databaseId) params.databaseId = Number(databaseId);

        console.log('Fetching vacuum history...', params);

        const response = await apiClient.get<ApiHistoryRow[]>("/vacuum/history", {
          params,
        });

        console.log('API Response:', response.data);

        const transformed = transformApiResponse(response.data);
        setData(transformed);
        setCurrentPage(1);
      } catch (err: any) {
        console.error("Failed to fetch vacuum history:", err);
        setError(
          err.response?.data?.message || err.message || "Failed to load data"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedInstance, selectedDatabase]); // 필터 변경 시 재호출 안함

  /* ---------- 클라이언트 필터링 ---------- */
  const filteredData = useMemo(() => {
    console.log('Filtering data...', {
      totalRows: data.length,
      selectedPeriod,
      selectedStatus
    });

    // 기간 필터
    const periodMapping: Record<string, number> = {
      "오늘": 24,
      "최근 7일": 168,
      "최근 30일": 720,
    };
    const hoursWindow = periodMapping[selectedPeriod] || 720;
    const cutoffTime = Date.now() - (hoursWindow * 60 * 60 * 1000);

    let filtered = data.filter((row) => {
      const rowTime = new Date(row.executedAt).getTime();
      return !isNaN(rowTime) && rowTime >= cutoffTime;
    });

    // 상태 필터
    if (selectedStatus) {
      filtered = filtered.filter((row) => row.status === selectedStatus);
    }

    console.log('Filtered result:', {
      originalCount: data.length,
      filteredCount: filtered.length,
      period: selectedPeriod,
      status: selectedStatus
    });

    return filtered;
  }, [data, selectedPeriod, selectedStatus]);

  /* ---------- 컬럼 ---------- */
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
        cell: (info) => (
          <div style={{ fontWeight: 500 }}>{info.getValue() as string}</div>
        )
      },
      {
        accessorKey: "type",
        header: "작업 유형",
        cell: (info) => <span>{info.getValue() as string}</span>,
      },
      { 
        accessorKey: "trigger", 
        header: "트리거", 
        cell: (info) => info.getValue() 
      },
      {
        accessorKey: "status",
        header: "상태",
        cell: (info) => {
          const value = info.getValue() as string;
          const statusClass =
            value === "정상"
              ? "vd-badge--ok"
              : value === "주의"
              ? "vd-badge--warn"
              : "vd-badge--error";
          return <span className={`vd-badge ${statusClass}`}>{value}</span>;
        },
      },
      { 
        accessorKey: "tuples", 
        header: "처리량", 
        cell: (info) => info.getValue() 
      },
      { 
        accessorKey: "duration", 
        header: "소요 시간", 
        cell: (info) => info.getValue() 
      },
      { 
        accessorKey: "bloatBefore", 
        header: "Bloat", 
        cell: (info) => (
          <span style={{ color: "#DC2626", fontWeight: 500 }}>
            {info.getValue() as string}
          </span>
        )
      },
    ],
    []
  );

  /* ---------- 테이블 인스턴스 ---------- */
  const table = useReactTable({
    data: filteredData,
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

  const totalPages = Math.ceil(filteredData.length / pageSize);

  /* ---------- 이벤트 핸들러 ---------- */
  const handlePageChange = (page: number) => setCurrentPage(page);

  const handleRowClick = (row: VacuumHistoryRow) => {
    navigate("/database/vacuum/history-detail", { state: { historyData: row } });
  };

  const handleExportCSV = () => {
    const headers = [
      "실행 시각",
      "테이블",
      "작업 유형",
      "트리거",
      "상태",
      "처리량",
      "소요 시간",
      "Bloat",
    ];
    const csvData = filteredData.map((row) => [
      row.executedAt,
      row.table,
      row.type,
      row.trigger,
      row.status,
      row.tuples,
      row.duration,
      row.bloatBefore,
    ]);

    const csvContent = [headers.join(","), ...csvData.map((r) => r.join(","))].join(
      "\n"
    );
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const fileName = `vacuum_history_${now.getFullYear()}${String(
      now.getMonth() + 1
    ).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(
      now.getHours()
    ).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /* ---------- 상태별 렌더 ---------- */
  if (!selectedInstance) {
    return (
      <main className="vacuum-page">
        <div style={{ padding: "40px", textAlign: "center", color: "#6B7280" }}>
          <p style={{ fontSize: "18px", fontWeight: "500", marginBottom: "8px" }}>
            Instance를 선택해주세요
          </p>
          <p style={{ fontSize: "14px", color: "#9CA3AF" }}>
            상단 헤더에서 Instance를 선택하면 History 데이터가 표시됩니다.
          </p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="vacuum-page">
        <div style={{ 
          padding: "40px", 
          textAlign: "center", 
          color: "#6B7280",
          backgroundColor: "#F9FAFB",
          borderRadius: "8px",
          margin: "16px"
        }}>
          <div style={{ fontSize: "16px", marginBottom: "8px" }}>
            Loading history data for <strong>{selectedInstance.instanceName}</strong>
            {selectedDatabase && (
              <span> / <strong>{selectedDatabase.databaseName}</strong></span>
            )}
          </div>
          <div style={{ fontSize: "14px", color: "#9CA3AF" }}>
            Please wait...
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="vacuum-page">
        <div style={{ 
          padding: "24px", 
          backgroundColor: "#FEE2E2",
          color: "#991B1B",
          borderRadius: "8px",
          margin: "16px"
        }}>
          <p style={{ fontSize: "18px", fontWeight: "500", marginBottom: "8px" }}>
            ⚠️ Failed to load vacuum history
          </p>
          <p style={{ fontSize: "14px", marginTop: "8px" }}>{error}</p>
          <p style={{ fontSize: "12px", marginTop: "16px", color: "#7F1D1D" }}>
            Instance: {selectedInstance.instanceName}
            {selectedDatabase && ` / Database: ${selectedDatabase.databaseName}`}
          </p>
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
          options={["오늘", "최근 7일", "최근 30일"]}
          values={[selectedPeriod]}
          onChange={(values: string[]) => {
            const newPeriod = values[0] || "최근 7일";
            console.log('Period changed:', newPeriod);
            setSelectedPeriod(newPeriod);
            setCurrentPage(1);
          }}
        />
        <MultiSelectDropdown
          label="상태"
          options={["정상", "주의"]}
          values={selectedStatus ? [selectedStatus] : []}
          onChange={(values: string[]) => {
            const newStatus = values.length > 0 ? values[0] : null;
            console.log('Status changed:', newStatus);
            setSelectedStatus(newStatus);
            setCurrentPage(1);
          }}
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
                  {flexRender(header.column.columnDef.header, header.getContext())}
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
          <div className="vacuum-table-empty">
            {selectedDatabase
              ? `${selectedDatabase.databaseName}에 "${selectedPeriod}" 기간의 ${selectedStatus ? `"${selectedStatus}"` : ''} 데이터가 없습니다.`
              : `"${selectedPeriod}" 기간의 ${selectedStatus ? `"${selectedStatus}"` : ''} 데이터가 없습니다.`}
          </div>
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