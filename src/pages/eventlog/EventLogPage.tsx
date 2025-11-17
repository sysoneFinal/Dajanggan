import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import apiClient from "../../api/apiClient";
import { useInstanceContext } from "../../context/InstanceContext";

import "../../styles/event/event-log.css";
import Pagination from "../../components/util/Pagination";
import CsvButton from "../../components/util/CsvButton";
import MultiSelectDropdown from "../../components/util/MultiSelectDropdown";
import SummaryCard from "../../components/util/SummaryCard";
import { formatDateTime } from "../../utils/formatDateTime";

interface EventLog {
  eventId: number;
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
  const { selectedInstance } = useInstanceContext();

  /** 상태 관리 */
  const [selectedDBs, setSelectedDBs] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>("오늘");
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [eventLogs, setEventLogs] = useState<EventLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // 요약카드 상태
  const [summary, setSummary] = useState({
    infoCount: 0,
    warnCount: 0,
    errorCount: 0,
    totalCount: 0,
  });

  // 필터 옵션 상태
  const [dbOptions, setDbOptions] = useState<string[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [levelOptions, setLevelOptions] = useState<string[]>([]);

  const pageSize = 14;
  const totalPages = Math.ceil(totalCount / pageSize);

  /** 필터 옵션 조회 */
  useEffect(() => {
    if (!selectedInstance?.instanceId) return;

    const fetchFilterOptions = async () => {
      try {
        const res = await apiClient.get("/event/filter-options", {
          params: { instanceId: selectedInstance.instanceId },
        });
        setDbOptions(res.data.databases || []);
        setCategoryOptions(res.data.categories || []);
        setLevelOptions(res.data.levels || []);
      } catch (err) {
        console.error("필터 옵션 조회 실패:", err);
      }
    };

    fetchFilterOptions();
  }, [selectedInstance?.instanceId]);

  /** 이벤트 로그 조회 */
  useEffect(() => {
    if (!selectedInstance?.instanceId) return;

    const fetchEventLogs = async () => {
      setIsLoading(true);
      try {
        const params: any = {
          instanceId: selectedInstance.instanceId,
          page,
          size: pageSize,
          selectedTime,
        };

        if (selectedDBs.length) params.dbNames = selectedDBs.join(",");
        if (selectedCategories.length) params.category = selectedCategories.join(",");
        if (selectedLevels.length) params.level = selectedLevels.join(",");

        const res = await apiClient.get("/event/list", { params });

        const mapped = res.data.data.map((e: any) => ({
          eventId: e.eventId,
          time: formatDateTime(e.detectedAt),
          instance: e.instanceName,
          db: e.databaseName,
          category: e.category,
          eventType: e.eventType,
          resource: e.resourceType,
          user: e.userName,
          level: e.level,
          duration: e.duration,
          message: e.description,
        }));

        setEventLogs(mapped);
        setTotalCount(res.data.totalCount ?? mapped.length);
      } catch (err) {
        console.error("이벤트 로그 조회 실패:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEventLogs();
  }, [
    selectedInstance?.instanceId,
    selectedDBs.join(","),
    selectedLevels.join(","),
    selectedCategories.join(","),
    selectedTime,
    page,
  ]);

  /** 요약 카드 데이터 조회 */
  useEffect(() => {
    if (!selectedInstance?.instanceId) return;

    const fetchSummary = async () => {
      try {
        const res = await apiClient.get("/event/summary", {
          params: { instanceId: selectedInstance.instanceId },
        });
        setSummary({
          infoCount: res.data.infoCount ?? 0,
          warnCount: res.data.warnCount ?? 0,
          errorCount: res.data.errorCount ?? 0,
          totalCount: res.data.total_count ?? 0,
        });
      } catch (err) {
        console.error("요약 카드 조회 실패:", err);
      }
    };

    fetchSummary();
    const interval = setInterval(fetchSummary, 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedInstance?.instanceId]);

  /** 테이블 컬럼 정의 */
  const columns = useMemo<ColumnDef<EventLog>[]>(
    () => [
      { accessorKey: "time", header: "발생시각" },
      { accessorKey: "instance", header: "인스턴스" },
      { accessorKey: "db", header: "DB명" },
      { accessorKey: "category", header: "구분" },
      { accessorKey: "eventType", header: "이벤트 유형" },
      { accessorKey: "resource", header: "자원유형" },
      { accessorKey: "user", header: "사용자명" },
      {
        accessorKey: "level",
        header: "Level",
        cell: (info) => {
          const level = String(info.getValue() || "").toUpperCase();
          return <span className={level.toLowerCase()}>{level}</span>;
        },
      },
          // 초단위 추가 
      {
        accessorKey: "duration",
        header: "지속시간",
        cell: (info) => {
          const value = info.getValue();
          return value !== null && value !== undefined ? `${value}s` : "-";
        },
      },
        // 메세지는 툴팁 적용 
      {
        accessorKey: "message",
        header: "내용",
        cell: (info) => {
          const msg = String(info.getValue() ?? "");
          const shortMsg =
            msg.length > 120
              ? msg.substring(0, 120).replace(/\s+$/, "") + "..."
              : msg;
          return (
            <div className="tooltip-container">
              <span className="message-cell">{shortMsg}</span>
              <span className="tooltip-box">{msg}</span>
            </div>
          );
        },
      },
    ],
    []
  );

  /** 테이블 구성 */
  const table = useReactTable({
    data: eventLogs,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  /** CSV 내보내기 */
  const handleExportCSV = () => {
    const headers = table.getAllColumns().map((col) => col.columnDef.header);
    const rows = eventLogs.map((row) => Object.values(row).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "event_log.csv";
    link.click();
  };

  /** 필터 핸들러 */
  const handleDBChange = useCallback((v: string[] | string) => {
    setSelectedDBs(Array.isArray(v) ? v : [v]);
    setPage(1);
  }, []);

  const handleCategoryChange = useCallback((v: string[] | string) => {
    setSelectedCategories(Array.isArray(v) ? v : [v]);
    setPage(1);
  }, []);

  const handleLevelChange = useCallback((v: string[] | string) => {
    setSelectedLevels(Array.isArray(v) ? v : [v]);
    setPage(1);
  }, []);

  const handleTimeChange = useCallback((v: string[] | string) => {
    setSelectedTime(Array.isArray(v) ? v[0] : v);
    setPage(1);
  }, []);

  /** 로딩 상태 */
  if (isLoading) return <div className="loading">이벤트 로그 불러오는 중...</div>;

  return (
    <main className="event-log">
      {/* 요약 카드 */}
      <section className="event-log__summary">
        <SummaryCard label="전체 이벤트" value={summary.totalCount} desc="최근 15분 내" status="info" />
        <SummaryCard label="정상" value={summary.infoCount} desc="최근 15분 내" status="info" />
        <SummaryCard label="경고 발생" value={summary.warnCount} desc="최근 15분 내" status="warning" />
        <SummaryCard label="위험 발생" value={summary.errorCount} desc="최근 15분 내" status="critical" />
      </section>

      {/* 필터 */}
      <section className="event-log__filters">
        <MultiSelectDropdown label="Database 선택" options={dbOptions} value={selectedDBs} onChange={handleDBChange} />
        <MultiSelectDropdown label="구분" options={categoryOptions} value={selectedCategories} onChange={handleCategoryChange} />
        <MultiSelectDropdown label="레벨" options={levelOptions} value={selectedLevels} onChange={handleLevelChange} />
        <MultiSelectDropdown
          label="시간 선택"
          options={["최근 15분", "최근 30분", "최근 1시간", "최근 3시간", "최근 6시간", "최근 12시간", "오늘"]}
          value={selectedTime}
          onChange={handleTimeChange}
          multi={false}
        />
        <CsvButton tooltip="CSV 파일 저장" onClick={handleExportCSV} />
      </section>

      {/* 테이블 */}
      <section className="event-log__table">
        <div className="e-table-header">
          {table.getHeaderGroups().map((headerGroup) => (
            <React.Fragment key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <div key={header.id} onClick={header.column.getToggleSortingHandler?.()}>
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

        {eventLogs.length > 0 ? (
          table.getRowModel().rows.map((row) => (
            <div key={row.id} className="e-table-row">
              {row.getVisibleCells().map((cell) => (
                <div key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>
              ))}
            </div>
          ))
        ) : (
          <div className="e-table-empty">데이터가 없습니다.</div>
        )}
      </section>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={(newPage) => setPage(newPage)} />
      )}
    </main>
  );
};

export default EventLogPage;
