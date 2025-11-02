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
  table: string;
  lastVacuum: string;
  lastAutovacuum: string;
  deadTuples: string;
  modSinceAnalyze: string;
  bloatPct: string;
  tableSize: string;
  frequency: string;
  status: "주의" | "정상";
};

const baseRows: VacuumHistoryRow[] = [
  {
    table: "orders",
    lastVacuum: "2024-04-23 08:30",
    lastAutovacuum: "2024-04-23 15:26",
    deadTuples: "81K",
    modSinceAnalyze: "127K",
    bloatPct: "9.4%",
    tableSize: "16 GB",
    frequency: "4회/일",
    status: "주의",
  },
  {
    table: "sessions",
    lastVacuum: "2024-04-21 19:40",
    lastAutovacuum: "2024-04-22 13:15",
    deadTuples: "22K",
    modSinceAnalyze: "55K",
    bloatPct: "1.2%",
    tableSize: "7 GB",
    frequency: "3회/일",
    status: "정상",
  },
];

// 총 48개 생성
const historyDemo: VacuumHistoryRow[] = Array.from({ length: 48 }, (_, i) => ({
  ...baseRows[i % baseRows.length],
  table: `${baseRows[i % baseRows.length].table}_${i}`,
}));

export default function VacuumHistoryTable({ rows = historyDemo }: { rows?: VacuumHistoryRow[] }) {
  const [data] = useState<VacuumHistoryRow[]>(rows);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 14;
  const navigate = useNavigate();

  // 컬럼 정의
  const columns = useMemo<ColumnDef<VacuumHistoryRow>[]>(
    () => [
      {
        accessorKey: "table",
        header: "TABLE",
        cell: (info) => (
          <div>
            <div className="vd-td-strong">{info.getValue() as string}</div>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "STATUS",
        cell: (info) => {
          const value = info.getValue() as string;
          return (
            <span className={`vd-badge ${value === "주의" ? "vd-badge--warn" : "vd-badge--ok"}`}>
              {value}
            </span>
          );
        },
      },
      {
        accessorKey: "lastVacuum",
        header: "LAST VACUUM",
        cell: (info) => info.getValue(),
      },
      {
        accessorKey: "lastAutovacuum",
        header: "LAST AUTOVACUUM",
        cell: (info) => info.getValue(),
      },
      {
        accessorKey: "deadTuples",
        header: "DEAD TUPLES",
        cell: (info) => info.getValue(),
      },
      {
        accessorKey: "modSinceAnalyze",
        header: "MOD SINCE ANALYZE",
        cell: (info) => info.getValue(),
      },
      {
        accessorKey: "bloatPct",
        header: "BLOAT %",
        cell: (info) => info.getValue(),
      },
      {
        accessorKey: "tableSize",
        header: "TABLE SIZE",
        cell: (info) => info.getValue(),
      },
      {
        accessorKey: "frequency",
        header: "실행빈도",
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

  const handleRowClick = (tableName: string) => {
    navigate("/database/vacuum/sessionDetail", {
      state: { table: tableName },
    });
  };

  // CSV 내보내기 함수
  const handleExportCSV = () => {
    const headers = ["TABLE", "LAST VACUUM", "LAST AUTOVACUUM", "DEAD TUPLES", "MOD SINCE ANALYZE", "BLOAT %", "TABLE SIZE", "실행빈도", "STATUS"];
    const csvData = data.map((row) => [
      row.table,
      row.lastVacuum,
      row.lastAutovacuum,
      row.deadTuples,
      row.modSinceAnalyze,
      row.bloatPct,
      row.tableSize,
      row.frequency,
      row.status,
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
          label="시간 선택"
          options={[
            "최근 1시간",
            "최근 6시간",
            "최근 24시간",
            "최근 7일",
          ]}
          onChange={(values) => console.log("선택된 시간:", values)}
        />
        <MultiSelectDropdown
          label="상태"
          options={["정상", "주의"]}
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
              onClick={() => handleRowClick(row.original.table)}
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