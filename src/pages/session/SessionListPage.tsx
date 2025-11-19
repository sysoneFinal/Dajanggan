import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../api/apiClient";
import { useInstanceContext } from "../../context/InstanceContext";

import "../../styles/session/sessionActivityList.css";
import Pagination from "../../components/util/Pagination";
import CsvButton from "../../components/util/CsvButton";
import MultiSelectDropdown from "../../components/util/MultiSelectDropdown";
import SummaryCard from "../../components/util/SummaryCard";
import SessionDetailModal from "../../components/session/SessionDetailModal";
import type { SessionDetail } from "../../components/session/SessionDetailModal";
import { formatRuntime } from "../../utils/formatRunTime";
import { intervalToMs } from "../../utils/time";
import { useLoader } from "../../context/LoaderContext";

interface Session {
  databaseId: number;
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

const pageSize = 14;

const SessionActivityList = () => {
  const { selectedInstance, refreshInterval } = useInstanceContext();

  /** 상태 관리 */
  const [selectedDBs, setSelectedDBs] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedWaitTypes, setSelectedWaitTypes] = useState<string[]>([]);
  const [selectedQueryTypes, setSelectedQueryTypes] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const { showLoader, hideLoader } = useLoader();
  

  /** 인스턴스 변경 시 필터 초기화 */
  useEffect(() => {
    setSelectedDBs([]);
    setSelectedStates([]);
    setSelectedWaitTypes([]);
    setSelectedQueryTypes([]);
    setPage(1);
  }, [selectedInstance?.instanceId]);

  /** 필터 옵션 조회 */
  const { data: filterOptions } = useQuery({
    queryKey: ["session-filters", selectedInstance?.instanceId],
    queryFn: async () => {
      const res = await apiClient.get("/session/active/filter-options", {
        params: { instanceId: selectedInstance!.instanceId },
      });
      return res.data;
    },
    enabled: !!selectedInstance?.instanceId,
    refetchInterval : intervalToMs(refreshInterval)
  });

  /** 세션 리스트 조회 */
  const { data: sessionData, isLoading: isSessionsLoading } = useQuery({
    queryKey: [
      "session-list",
      selectedInstance?.instanceId,
      selectedDBs.join(","),
      selectedStates.join(","),
      selectedWaitTypes.join(","),
      selectedQueryTypes.join(","),
      page,
    ],
    queryFn: async () => {
      const params: any = { instanceId: selectedInstance!.instanceId, page, size: pageSize };
      if (selectedDBs.length) params.dbNames = selectedDBs.join(",");
      if (selectedStates.length) params.states = selectedStates.join(",");
      if (selectedWaitTypes.length) params.waitEventTypes = selectedWaitTypes.join(",");
      if (selectedQueryTypes.length) params.queryTypes = selectedQueryTypes.join(",");

      const res = await apiClient.get("/session/active/list", { params });
      return res.data;
    },
    enabled: !!selectedInstance?.instanceId,
    refetchInterval : intervalToMs(refreshInterval)

  });


  /** 요약 카드 조회 */
  const { data: summaryData, isLoading } = useQuery({
    queryKey: ["session-summary", selectedInstance?.instanceId],
    queryFn: async () => {
      const res = await apiClient.get("/session/active/summary", {
        params: { instanceId: selectedInstance!.instanceId },
      });

      console.log('리스트 요약카드 ',res.data);
      return res.data;
    },
    enabled: !!selectedInstance?.instanceId,
    refetchInterval : intervalToMs(refreshInterval)

  });

      /** === 로딩 상태 관리 === */
    useEffect(() => {
      if (isLoading) {
        showLoader('대시보드 데이터를 불러오는 중...');
      } else {
        hideLoader();
      }
    }, [isLoading, showLoader, hideLoader]);

  /** 세션 매핑 */
  const sessions: Session[] = useMemo(
    () =>
      sessionData?.data.map((s: any) => ({
        databaseId: s.databaseId,
        pid: s.pid,
        user: s.username,
        db: s.databasename,
        type: s.queryType,
        state: s.state,
        waitType: s.waitEventType,
        waitEvent: s.waitEvent,
        runtime: s.queryAgeSec,
        query: s.query,
      })) || [],
    [sessionData]
  );

  const totalCount = sessionData?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  /** 테이블 컬럼 정의 */
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
      {
        accessorKey: "runtime",
        header: "실행시간",
        cell: (info) => formatRuntime(Number(info.getValue())),
      },
      {
        accessorKey: "query",
        header: "쿼리",
        cell: (info) => {
          const query = String(info.getValue() ?? "");
          const shortQuery =
            query.length > 120 ? query.substring(0, 120).trimEnd() + "..." : query;
          return (
            <div
              className="query-text"
              style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 600 }}
            >
              {shortQuery}
            </div>
          );
        },
      },
    ],
    []
  );

  /** 테이블 구성 */
  const [sorting, setSorting] = useState<SortingState>([]);
  const table = useReactTable({
    data: sessions,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  /** 모달 */
  const [selectedSession, setSelectedSession] = useState<SessionDetail | null>(null);
  const handleRowClick = async (session: Session) => {
    try {
      const res = await apiClient.get("/session/active/detail", {
        params: { databaseId: session.databaseId, pid: session.pid },
      });

      const detail: SessionDetail = {
        pid: res.data.pid,
        user: res.data.username,
        db: res.data.databasename,
        waitType: res.data.waitEventType,
        waitEvent: res.data.waitEvent,
        duration: res.data.queryAgeSec,
        state: res.data.state,
        cpu: res.data.cpuUsage || "-",
        memory: res.data.memoryUsageMb || "-",
        query: res.data.query,
        startTime: res.data.queryStart,
        client: res.data.clientAddr,
        blockingPid: res.data.blockingPid,
        guides: res.data.guides || [],
      };
      setSelectedSession(detail);
    } catch (err) {
      console.error("세션 상세 정보 조회 실패:", err);
    }
  };

  /** CSV 내보내기 */
  const handleExportCSV = () => {
    const headers = table.getAllColumns().map((col) => col.columnDef.header);
    const rows = sessions.map((row) => Object.values(row).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "session_activity.csv";
    link.click();
  };

  /** 필터 핸들러 */
  const handleFilterChange = useCallback(
    (setter: React.Dispatch<React.SetStateAction<string[]>>) => (v: string[] | string) => {
      setter(Array.isArray(v) ? v : [v]);
      setPage(1);
    },
    []
  );

  if (isSessionsLoading) return <div className="loading">세션 정보 불러오는 중...</div>;

  return (
    <main className="session-section">
      {/* 요약 카드 */}
      <section className="session-summary">
        <SummaryCard label="전체 세션" value={summaryData?.totalcount ?? 0} desc="최근 5분 평균 기준" status="info" />
        <SummaryCard label="쿼리 실행 중 세션" value={summaryData?.activecount ?? 0} desc="최근 5분 평균 기준" status="info" />
        <SummaryCard label="대기 세션" value={summaryData?.waitingcount ?? 0} desc="최근 5분 평균 기준" status="warning" />
        <SummaryCard label="유휴 세션" value={summaryData?.idlecount ?? 0} desc="최근 5분 평균 기준" status="info" />
      </section>

      {/* 필터 */}
      <section className="session-filters">
        <MultiSelectDropdown label="DB 선택" options={filterOptions?.databases ?? []} value={selectedDBs} onChange={handleFilterChange(setSelectedDBs)} />
        <MultiSelectDropdown label="상태 선택" options={filterOptions?.states ?? []} value={selectedStates} onChange={handleFilterChange(setSelectedStates)} />
        <MultiSelectDropdown label="대기 유형" options={filterOptions?.waitEventTypes ?? []} value={selectedWaitTypes} onChange={handleFilterChange(setSelectedWaitTypes)} />
        <MultiSelectDropdown label="쿼리 유형" options={filterOptions?.queryTypes ?? []} value={selectedQueryTypes} onChange={handleFilterChange(setSelectedQueryTypes)} />
        <CsvButton tooltip="CSV 파일 저장" onClick={handleExportCSV} />
      </section>

      {/* 테이블 */}
      <section className="session-table-container">
        <div className="session-table-header">
          {table.getHeaderGroups().map((headerGroup) => (
            <React.Fragment key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <div key={header.id} onClick={header.column.getToggleSortingHandler?.()} style={{ cursor: header.column.getCanSort() ? "pointer" : "default" }}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {{ asc: " ▲", desc: " ▼" }[header.column.getIsSorted() as string] ?? null}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>

        {sessions.length > 0 ? (
          table.getRowModel().rows.map((row) => (
            <div key={row.id} className="session-table-row" onClick={() => handleRowClick(row.original)}>
              {row.getVisibleCells().map((cell) => (
                <div key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>
              ))}
            </div>
          ))
        ) : (
          <div className="session-empty">데이터가 없습니다.</div>
        )}
      </section>

      {/* 페이지네이션 */}
      {totalPages > 1 && <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />}

      {/* 세션 상세 모달 */}
      {selectedSession && <SessionDetailModal session={selectedSession} onClose={() => setSelectedSession(null)} />}
    </main>
  );
};

export default SessionActivityList;