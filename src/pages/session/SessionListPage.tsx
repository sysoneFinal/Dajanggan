import React, { useState, useEffect, useMemo } from "react";
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

import "../../styles/session/sessionActivityList.css";
import Pagination from "../../components/util/Pagination";
import CsvButton from "../../components/util/CsvButton";
import MultiSelectDropdown from "../../components/util/MultiSelectDropdown";
import SummaryCard from "../../components/util/SummaryCard";
import SessionDetailModal from "../../components/session/SessionDetailModal";
import type { SessionDetail } from "../../components/session/SessionDetailModal";

interface Session {
  pid: number;
  user: string;
  db: string;
  type: string;
  state: string;
  waitType: string;
  waitEvent: string;
  runtime: string;
  query: string;
}

const SessionActivityList = () => {
  /** ===== 더미 세션 데이터 ===== */
  const [sessions] = useState<Session[]>(
    Array.from({ length: 22 }).map((_, i) => ({
      pid: 1300 + i,
      user: i % 2 === 0 ? "sammy" : "doyoung",
      db: i % 2 === 0 ? "post1_db" : "analytics_db",
      type: i % 2 === 0 ? "vacuum" : "select",
      state: i % 3 === 0 ? "waiting" : i % 4 === 0 ? "idle" : "active",
      waitType: i % 2 === 0 ? "Lock" : "IO",
      waitEvent: i % 2 === 0 ? "transactionid" : "buffer_io",
      runtime: `${5 + i}m ${i * 2}s`,
      query:
        i % 2 === 0
          ? "SELECT user_id, username, address, status FROM users WHERE id = 10;"
          : "DELETE FROM orders WHERE id = 5;",
    }))
  );

  /** ===== 필터 상태 ===== */
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedDBs, setSelectedDBs] = useState<string[]>([]);
  const [filtered, setFiltered] = useState<Session[]>(sessions);

  /** ===== 필터링 ===== */
  useEffect(() => {
    let filteredData = [...sessions];
    if (selectedUsers.length > 0)
      filteredData = filteredData.filter((s) => selectedUsers.includes(s.user));
    if (selectedStates.length > 0)
      filteredData = filteredData.filter((s) => selectedStates.includes(s.state));
    if (selectedDBs.length > 0)
      filteredData = filteredData.filter((s) => selectedDBs.includes(s.db));
    setFiltered(filteredData);
  }, [selectedUsers, selectedStates, selectedDBs, sessions]);

  /** ===== 요약 카드 계산 ===== */
  const summaryData = useMemo(() => {
    const active = filtered.filter((s) => s.state === "active").length;
    const waiting = filtered.filter((s) => s.state === "waiting").length;
    const idle = filtered.filter((s) => s.state === "idle").length;
    const total = filtered.length;
    return [
      { label: "Active Sessions", value: active, diff: 0, desc: "현재 활성 세션 수", status: "info" },
      { label: "Waiting Sessions", value: waiting, diff: 0, desc: "대기 상태 세션 수", status: "warning" },
      { label: "Idle Sessions", value: idle, diff: 0, desc: "대기 중인 유휴 세션 수", status: "info" },
      { label: "Total Sessions", value: total, diff: 0, desc: "전체 세션 수", status: "critical" },
    ];
  }, [filtered]);

  /** ===== React Table 컬럼 정의 ===== */
  const columns = useMemo<ColumnDef<Session>[]>(
    () => [
      { accessorKey: "pid", header: "PID" },
      { accessorKey: "user", header: "사용자" },
      { accessorKey: "db", header: "DB명" },
      { accessorKey: "type", header: "작업 유형" },
      {
        accessorKey: "state",
        header: "상태",
        cell: (info) => (
          <div className="state-wrapper">
            <span className={`state ${info.getValue()}`}>{String(info.getValue())}</span>
          </div>
        ),
      },
      { accessorKey: "waitType", header: "대기유형" },
      { accessorKey: "waitEvent", header: "대기이벤트" },
      { accessorKey: "runtime", header: "실행시간" },
      {
        accessorKey: "query",
        header: "쿼리",
        cell: (info) => (
          <div className="query-text">{String(info.getValue())}</div>
        ),
      },
    ],
    []
  );

  /** ===== React Table 세팅 ===== */
  const [sorting, setSorting] = useState<SortingState>([]);
  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  /** ===== 모달 ===== */
  const [selectedSession, setSelectedSession] = useState<SessionDetail | null>(null);
  const handleRowClick = (session: Session) => {
    const detail: SessionDetail = {
      pid: session.pid,
      user: session.user,
      db: session.db,
      waitType: session.waitType,
      waitEvent: session.waitEvent,
      duration: session.runtime,
      state: session.state,
      cpu: "34%",
      memory: "12MB",
      query: session.query,
      startTime: "2025-10-24 11:03:12",
    };
    setSelectedSession(detail);
  };

  /** ===== CSV 내보내기 ===== */
  const handleExportCSV = () => {
    const headers = table.getAllColumns().map((col) => col.columnDef.header);
    const rows = table.getRowModel().rows.map((r) =>
      r.getVisibleCells().map((c) => c.getValue()).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "session_activity.csv";
    link.click();
  };

  return (
    <main className="session-section">
      {/* 상단 요약 카드 */}
      <section className="session-summary">
        {summaryData.map((card, idx) => (
          <SummaryCard
            key={idx}
            label={card.label}
            value={card.value}
            diff={card.diff}
            desc={card.desc}
            status={card.status}
          />
        ))}
      </section>

      {/* 필터 영역 */}
      <section className="session-filters">
        <MultiSelectDropdown
          label="DB 선택"
          options={[...new Set(sessions.map((s) => s.db))]}
          onChange={setSelectedDBs}
        />
        <MultiSelectDropdown
          label="상태 선택"
          options={[...new Set(sessions.map((s) => s.state))]}
          onChange={setSelectedStates}
        />
        <MultiSelectDropdown
          label="대기 유형"
          options={[...new Set(sessions.map((s) => s.waitType))]}
          onChange={setSelectedUsers}
        />
        <CsvButton tooltip="CSV 파일 저장" onClick={handleExportCSV} />
      </section>

      {/* 테이블 */}
      <section className="session-table-container">
        <div className="session-table-header">
          {table.getHeaderGroups().map((headerGroup) => (
            <React.Fragment key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <div
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler?.()}
                  style={{ cursor: header.column.getCanSort() ? "pointer" : "default" }}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {{
                    asc: " ▲",
                    desc: " ▼",
                  }[header.column.getIsSorted() as string] ?? null}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>

        {table.getRowModel().rows.length > 0 ? (
          table.getRowModel().rows.map((row) => (
            <div
              key={row.id}
              className="session-table-row"
              onClick={() => handleRowClick(row.original)}
            >
              {row.getVisibleCells().map((cell) => (
                <div key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </div>
              ))}
            </div>
          ))
        ) : (
          <div className="session-empty">데이터가 없습니다.</div>
        )}
      </section>

      {/* 페이지네이션 */}
      {table.getPageCount() > 1 && (
        <Pagination
          currentPage={table.getState().pagination.pageIndex + 1}
          totalPages={table.getPageCount()}
          onPageChange={(page) => table.setPageIndex(page - 1)}
        />
      )}

      {/* 세션 상세 모달 */}
      {selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </main>
  );
};

export default SessionActivityList;
