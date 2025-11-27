// 작성자: 김민서
// 알람 규칙 테이블 컴포넌트
// 역할: 테이블 렌더링, 검색, 정렬, 페이지네이션, CSV 내보내기

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type FilterFn,
} from "@tanstack/react-table";
import Pagination from "../../components/util/Pagination";
import CsvButton from "../../components/util/CsvButton";
import type { AlarmRuleRow } from "./AlarmRulePage";

type Props = {
  data: AlarmRuleRow[];
  loading: boolean;
  error: string | null;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onRowClick: (id: number) => void;
  onOpenSlack: () => void;
  onOpenCreate: () => void;
};

export default function AlarmRuleTable({
  data,
  loading,
  error,
  onEdit,
  onDelete,
  onRowClick,
  onOpenSlack,
  onOpenCreate,
}: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // 테이블 컬럼 정의
  const columns = useMemo<ColumnDef<AlarmRuleRow>[]>(
    () => [
      {
        accessorKey: "instanceName",
        header: "인스턴스",
        cell: (info) => <span className="al-td-strong">{info.getValue() as string}</span>,
      },
      {
        accessorKey: "databaseName",
        header: "데이터베이스",
        cell: (info) => info.getValue(),
      },
      {
        accessorKey: "section",
        header: "구분",
        cell: (info) => info.getValue(),
      },
      {
        accessorKey: "metricType",
        header: "지표",
        cell: (info) => info.getValue(),
      },
      {
        accessorKey: "enabled",
        header: "활성화 상태",
        cell: (info) => {
          const value = info.getValue() as boolean;
          return (
            <span className={`al-badge ${value ? "al-badge--ok" : "al-badge--warn"}`}>
              {value ? "활성화" : "비활성화"}
            </span>
          );
        },
      },
      {
        id: "edit",
        header: "수정",
        cell: (info) => (
          <button
            className="al-iconbtn"
            title="수정"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(info.row.original.id);
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" />
            </svg>
          </button>
        ),
      },
      {
        id: "delete",
        header: "삭제",
        cell: (info) => (
          <button
            className="al-iconbtn"
            title="삭제"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(info.row.original.id);
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 7h12v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7zm3-4h6l1 1h4v2H4V4h4l1-1z" />
            </svg>
          </button>
        ),
      },
    ],
    [onEdit, onDelete]
  );

  // 전역 검색 필터
  const globalFilterFn = useMemo<FilterFn<AlarmRuleRow>>(
    () => (row, _columnId, filterValue) => {
      const keyword = String(filterValue ?? "").trim().toLowerCase();
      if (!keyword) return true;

      const values = [
        row.original.instanceName,
        row.original.databaseName,
        row.original.section,
        row.original.metricType,
        row.original.enabled ? "활성화" : "비활성화",
      ]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase());

      return values.some((v) => v.includes(keyword));
    },
    []
  );

  // 검색어 변경 시 첫 페이지로
  useEffect(() => {
    setCurrentPage(1);
  }, [globalFilter]);

  // 테이블 인스턴스
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
      pagination: {
        pageIndex: currentPage - 1,
        pageSize,
      },
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn,
    manualPagination: false,
  });

  const totalPages = Math.ceil(table.getFilteredRowModel().rows.length / pageSize);

  // CSV 내보내기
  const handleExportCSV = () => {
    const headers = ["인스턴스", "데이터베이스", "구분", "지표", "활성화 상태"];
    const csvData = data.map((row) => [
      row.instanceName,
      row.databaseName,
      row.section,
      row.metricType,
      row.enabled ? "활성화" : "비활성화",
    ]);

    const csvContent = [headers.join(","), ...csvData.map((row) => row.join(","))].join("\n");
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const fileName = `alarm_rules_${now.getFullYear()}${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(
      2,
      "0"
    )}${String(now.getMinutes()).padStart(2, "0")}.csv`;

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* 필터 영역 */}
      <section className="alarm-page__filters">
        <div className="filter-left">
          <button className="al-btn" onClick={onOpenSlack}>
            Slack 연동 설정
          </button>
          <button className="al-btn" onClick={onOpenCreate}>
            알림 규칙 생성
          </button>
        </div>
        <div className="filter-right" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div className="al-search" style={{ position: "relative" }}>
            <input
              type="text"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="규칙/지표 검색"
              aria-label="알람 규칙 검색"
              style={{
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                padding: "8px 12px",
                fontSize: "0.9rem",
                minWidth: "220px",
              }}
            />
          </div>
          <CsvButton onClick={handleExportCSV} tooltip="CSV 파일 저장" />
        </div>
      </section>

      {/* 테이블 영역 */}
      <section className="alarm-page__table">
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#9CA3AF" }}>로딩 중...</div>
        ) : error ? (
          <div style={{ padding: "24px", backgroundColor: "#FEE2E2", color: "#991B1B", borderRadius: "8px" }}>
            {error}
          </div>
        ) : (
          <>
            <div className="alarm-table-header">
              {table.getHeaderGroups().map((headerGroup) => (
                <Fragment key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <div
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      style={{ cursor: header.column.getCanSort() ? "pointer" : "default" }}
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
                  className="alarm-table-row alarm-table-row--hover"
                  onClick={() => onRowClick(row.original.id)}
                  style={{ cursor: "pointer" }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <div key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>
                  ))}
                </div>
              ))
            ) : (
              <div className="alarm-table-empty">데이터가 없습니다.</div>
            )}
          </>
        )}
      </section>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      )}
    </>
  );
}