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

import "../../styles/event/event-log.css";
import Pagination from "../../components/util/Pagination";
import CsvButton from "../../components/util/CsvButton";
import MultiSelectDropdown from "../../components/util/MultiSelectDropdown";
import SummaryCard from "../../components/util/SummaryCard";

interface EventLog {
  time: string;
  instance: string;
  db: string;
  category: string;
  eventType: string;
  resource: string;
  user: string;
  level: string;
  duration: string;
  message: string;
}

const EventLogPage = () => {
  /** ===== 더미 데이터 ===== */
  const [eventLogs] = useState<EventLog[]>([
    {
      time: "2025-10-16 13:21:05",
      instance: "inst-01",
      db: "orders_db",
      category: "Session",
      eventType: "Deadlock",
      resource: "Lock",
      user: "sammy",
      level: "WARN",
      duration: "10.3s",
      message: "트랜잭션 간 교착 발생",
    },
    {
      time: "2025-10-16 13:22:11",
      instance: "inst-02",
      db: "sales",
      category: "Query",
      eventType: "SlowQuery",
      resource: "I/O",
      user: "db_user",
      level: "INFO",
      duration: "8.5s",
      message: "쿼리 실행 지연 감지",
    },
    {
      time: "2025-10-16 13:23:27",
      instance: "inst-03",
      db: "inventory",
      category: "System",
      eventType: "BufferIO",
      resource: "Memory",
      user: "system",
      level: "ERROR",
      duration: "20.9s",
      message: "버퍼 캐시 과부하 탐지",
    },
  ]);

  /**  요약 카드 데이터  */
  const summaryData = [
    { label: "전체 이벤트", value: 10, diff: 3, desc: "최근 15분 기준", status: "info" },
    { label: "정상 이벤트", value: 5, diff: 3, desc: "최근 15분 평균 기준", status: "info" },
    { label: "경고 발생", value: 2, diff: 0, desc: "최근 15분 평균 기준", status: "warning" },
    { label: "위험 발생", value: 3, diff: 1, desc: "최근 15분 평균 기준", status: "critical" },
  ];

  /**  필터 상태  */
  const [selectedDBs, setSelectedDBs] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [filtered, setFiltered] = useState<EventLog[]>(eventLogs);

  useEffect(() => {
    let filteredData = [...eventLogs];
    if (selectedDBs.length > 0) filteredData = filteredData.filter((e) => selectedDBs.includes(e.db));
    if (selectedLevels.length > 0) filteredData = filteredData.filter((e) => selectedLevels.includes(e.level));
    if (selectedCategories.length > 0)
      filteredData = filteredData.filter((e) => selectedCategories.includes(e.category));
    setFiltered(filteredData);
  }, [selectedDBs, selectedLevels, selectedCategories, eventLogs]);

  /**  테이블 컬럼 정의  */
  const columns = useMemo<ColumnDef<EventLog>[]>(
    () => [
      { accessorKey: "time", header: "발생시각" },
      { accessorKey: "instance", header: "인스턴스" },
      { accessorKey: "db", header: "DB명" },
      { accessorKey: "category", header: "구분" },
      { accessorKey: "eventType", header: "이벤트 유형" },
      { accessorKey: "resource", header: "자원유형" },
      { accessorKey: "user", header: "User" },
      {
        accessorKey: "level",
        header: "Level",
        cell: (info) => (
          <span className={String(info.getValue()).toLowerCase()}>
            {String(info.getValue())}
          </span>
        ),
      },
      { accessorKey: "duration", header: "지속시간" },
      { accessorKey: "message", header: "내용" },
    ],
    []
  );

  /** ===== react-table 구성 ===== */
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
    enableMultiSort: false, 
  });

  /**  CSV 내보내기  */
  const handleExportCSV = () => {
    const headers = table.getAllColumns().map((col) => col.columnDef.header);
    const rows = table.getRowModel().rows.map((r) =>
      r.getVisibleCells().map((c) => c.getValue()).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "event_log.csv";
    link.click();
  };

  return (
    <main className="event-log">
      {/*  상단 요약 카드  */}
      <section className="event-log__summary">
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

      {/*  필터 영역  */}
      <section className="event-log__filters">
        <MultiSelectDropdown
          label="Database 선택"
          options={[...new Set(eventLogs.map((e) => e.db))]}
          onChange={setSelectedDBs}
        />
        <MultiSelectDropdown
          label="구분"
          options={[...new Set(eventLogs.map((e) => e.category))]}
          onChange={setSelectedCategories}
        />
        <MultiSelectDropdown
          label="레벨"
          options={[...new Set(eventLogs.map((e) => e.level))]}
          onChange={setSelectedLevels}
        />
        <MultiSelectDropdown
          label="시간 선택"
          options={[
            "최근 1시간 이내",
            "최근 3시간 이내",
            "최근 6시간 이내",
            "최근 12시간 이내",
            "오늘",
          ]}
          onChange={() => {}}
        />
        <CsvButton tooltip="CSV 파일 저장" onClick={handleExportCSV} />
      </section>

      {/*  테이블  */}
      <section className="event-log__table">
        {/* 헤더 */}
        <div className="e-table-header">
          {table.getHeaderGroups().map((headerGroup) => (
            <React.Fragment key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <div
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler?.()}
                  style={{
                    cursor: header.column.getCanSort() ? "pointer" : "default",
                  }}
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

        {/* 행 */}
        {table.getRowModel().rows.length > 0 ? (
          table.getRowModel().rows.map((row) => (
            <div key={row.id} className="e-table-row">
              {row.getVisibleCells().map((cell) => (
                <div key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </div>
              ))}
            </div>
          ))
        ) : (
          <div className="e-table-empty">데이터가 없습니다.</div>
        )}
      </section>

      {/*  페이지네이션  */}
      {table.getPageCount() > 1 && (
        <Pagination
          currentPage={table.getState().pagination.pageIndex + 1}
          totalPages={table.getPageCount()}
          onPageChange={(page) => table.setPageIndex(page - 1)}
        />
      )}
    </main>
  );
};

export default EventLogPage;
