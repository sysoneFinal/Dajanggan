import { Fragment, useMemo, useState } from "react";
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
import "/src/styles/vacuum/VacuumHistory-list.css";

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

const baseRows: VacuumHistoryRow[] = [
  {
    executedAt: "2024-04-23 15:26",
    table: "orders",
    type: "Vacuum",
    trigger: "Autovacuum",
    status: "완료",
    tuples: "127K",
    duration: "5m 30s",
    bloatBefore: "9.4%",
    bloatAfter: "6.1%",
  },
  {
    executedAt: "2024-04-23 08:30",
    table: "orders",
    type: "Analyze",
    trigger: "Schedule",
    status: "완료",
    tuples: "81K",
    duration: "2m 15s",
    bloatBefore: "12.7%",
    bloatAfter: "9.4%",
  },
  {
    executedAt: "2024-04-22 13:15",
    table: "sessions",
    type: "Autovacuum",
    trigger: "Autovacuum",
    status: "완료",
    tuples: "55K",
    duration: "3m 45s",
    bloatBefore: "4.5%",
    bloatAfter: "1.2%",
  },
  {
    executedAt: "2024-04-21 19:40",
    table: "sessions",
    type: "Vacuum",
    trigger: "Manual",
    status: "완료",
    tuples: "22K",
    duration: "1m 50s",
    bloatBefore: "7.8%",
    bloatAfter: "4.5%",
  },
  {
    executedAt: "2024-04-21 14:22",
    table: "products",
    type: "Vacuum",
    trigger: "Schedule",
    status: "실패",
    tuples: "0",
    duration: "0m 45s",
    bloatBefore: "15.2%",
    bloatAfter: "15.2%",
  },
  {
    executedAt: "2024-04-20 22:10",
    table: "users",
    type: "Autovacuum",
    trigger: "Autovacuum",
    status: "완료",
    tuples: "89K",
    duration: "4m 20s",
    bloatBefore: "11.3%",
    bloatAfter: "7.8%",
  },
];

// 총 48개 생성 (다양한 시간대로)
const historyDemo: VacuumHistoryRow[] = Array.from({ length: 48 }, (_, i) => {
  const baseRow = baseRows[i % baseRows.length];
  const hoursAgo = i * 2;
  const date = new Date();
  date.setHours(date.getHours() - hoursAgo);
  
  return {
    ...baseRow,
    executedAt: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
    table: i % 3 === 0 ? baseRow.table : `${baseRow.table}_${Math.floor(i / 6)}`,
  };
});

export default function VacuumHistoryTable({ rows = historyDemo }: { rows?: VacuumHistoryRow[] }) {
  const [data] = useState<VacuumHistoryRow[]>(rows);
  const [sorting, setSorting] = useState<SortingState>([{ id: "executedAt", desc: true }]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 14;
  const navigate = useNavigate();

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
          
          return (
            <span >
              {value}
            </span>
          );
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