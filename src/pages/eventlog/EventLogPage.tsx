import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { useLoader } from "../../context/LoaderContext";

import "../../styles/event/event-log.css";
import Pagination from "../../components/util/Pagination";
import CsvButton from "../../components/util/CsvButton";
import MultiSelectDropdown from "../../components/util/MultiSelectDropdown";
import SummaryCard from "../../components/util/SummaryCard";
import { formatDateTime } from "../../utils/formatDateTime";
import { intervalToMs } from "../../utils/time";
import { formatRuntime } from "../../utils/formatRunTime";

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
  const { selectedInstance, refreshInterval } = useInstanceContext();
  const { showLoader, hideLoader } = useLoader();

  /** 상태 관리 */
  const [selectedDBs, setSelectedDBs] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>("최근 15분");
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([]);

  const pageSize = 14;

  /** 필터 옵션 조회 - React Query */
  const { data: filterOptions } = useQuery({
    queryKey: ["eventFilterOptions", selectedInstance?.instanceId],
    queryFn: async () => {
      const res = await apiClient.get("/event/filter-options", {
        params: { instanceId: selectedInstance?.instanceId },
      });
      return {
        databases: res.data.databases || [],
        categories: res.data.categories || [],
        levels: res.data.levels || [],
      };
    },
    enabled: !!selectedInstance?.instanceId,
    staleTime: 3 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  /** 이벤트 로그 조회 - React Query */
  const {
    data: eventLogsData, isLoading: isEventLogsLoading,} = useQuery({
    queryKey: [
      "eventLogs",
      selectedInstance?.instanceId,
      page,
      selectedDBs.join(","),
      selectedCategories.join(","),
      selectedLevels.join(","),
      selectedTime,
    ],
    queryFn: async () => {
      const params: any = {
        instanceId: selectedInstance?.instanceId,
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

      return {
        data: mapped,
        totalCount: res.data.totalCount ?? mapped.length,
      };
    },
    enabled: !!selectedInstance?.instanceId,
    staleTime: 20 * 1000,
    gcTime: 3 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: intervalToMs(refreshInterval)
  });

  /** 요약 카드 데이터 조회 - React Query */
  const { data: summaryData } = useQuery({
    queryKey: ["eventSummary", selectedInstance?.instanceId],
    queryFn: async () => {
      const res = await apiClient.get("/event/summary", {
        params: { instanceId: selectedInstance?.instanceId },
      });
      console.log('event summary', res.data);
      return {
        infoCount: res.data.infocount ?? 0,
        warnCount: res.data.warncount ?? 0,
        errorCount: res.data.errorcount ?? 0,
        totalCount: res.data.totalcount ?? 0,
      };
    },
    enabled: !!selectedInstance?.instanceId,
    staleTime: 10 * 1000,
    gcTime: 60 * 1000,
    refetchInterval: intervalToMs(refreshInterval),
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  /** === 로딩 상태 관리 === */
  useEffect(() => {
    if (isEventLogsLoading) {
      showLoader('이벤트 로그를 불러오는 중...');
    } else {
      hideLoader();
    }
  }, [isEventLogsLoading, showLoader, hideLoader]);

  // 선택한 인스턴스 변경 시 필터 초기화
  useEffect(() => {
    setSelectedDBs([]);
    setSelectedCategories([]);
    setSelectedLevels([]);
    setSelectedTime("최근 15분");
    setPage(1);
  }, [selectedInstance?.instanceId]);

  const eventLogs = eventLogsData?.data || [];
  const totalCount = eventLogsData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const dbOptions = filterOptions?.databases || []; 
  const categoryOptions = filterOptions?.categories || [];
  const levelOptions = filterOptions?.levels || [];

  const summary = summaryData || {
    infoCount: 0,
    warnCount: 0,
    errorCount: 0,
    totalCount: 0,
  };

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
        header: "레벨",
        cell: (info) => {
          const level = String(info.getValue() || "").toUpperCase();
          return <span className={level.toLowerCase()}>{level}</span>;
        },
      },
      {
        accessorKey: "duration",
        header: "지속시간",
        cell: (info) => {
          const value = info.getValue<number>();
          return value !== null && value !== undefined ? formatRuntime(value) : "-";
        },
      },
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