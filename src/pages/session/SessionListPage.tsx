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

import "../../styles/session/sessionActivityList.css";
import Pagination from "../../components/util/Pagination";
import CsvButton from "../../components/util/CsvButton";
import MultiSelectDropdown from "../../components/util/MultiSelectDropdown";
import SummaryCard from "../../components/util/SummaryCard";
import SessionDetailModal from "../../components/session/SessionDetailModal";
import type { SessionDetail } from "../../components/session/SessionDetailModal";
import { formatRuntime } from "../../utils/formatRunTime";

interface Session {
  databaseId : number;
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
  const { selectedInstance } = useInstanceContext();

  /** 상태 관리 */
  const [selectedDBs, setSelectedDBs] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedWaitTypes, setSelectedWaitTypes] = useState<string[]>([]);
  const [selectedQueryTypes, setSelectedQueryTypes] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // 요약카드 상태
  const [summary, setSummary] = useState({
    activeCount: 0,
    waitingCount: 0,
    idleCount: 0,
    totalCount: 0,
  });

  // 필터 옵션 상태
  const [dbOptions, setDbOptions] = useState<string[]>([]);
  const [stateOptions, setStateOptions] = useState<string[]>([]);
  const [waitEventTypeOptions, setWaitEventTypeOptions] = useState<string[]>([]);
  const [queryTypeOptions, setQueryTypeOptions] = useState<string[]>([]);

  const pageSize = 14;
  const totalPages = Math.ceil(totalCount / pageSize);

  /** 필터 옵션 조회 */
  useEffect(() => {
    if (!selectedInstance?.instanceId) return;

    const fetchFilterOptions = async () => {
      try {
        const res = await apiClient.get("/session/active/filter-options", {
          params: { instanceId: selectedInstance.instanceId },
        });
        setDbOptions(res.data.databases || []);
        setStateOptions(res.data.states || []);
        setWaitEventTypeOptions(res.data.waitEventTypes || []);
        setQueryTypeOptions(res.data.queryTypes || []);
      } catch (err) {
        console.error("필터 옵션 조회 실패:", err);
      }
    };

    fetchFilterOptions();
  }, [selectedInstance?.instanceId]);

  /** 세션 리스트 조회 */
  useEffect(() => {
    if (!selectedInstance?.instanceId) return;

    const fetchSessions = async () => {
      setIsLoading(true);
      try {
        const params: any = {
          instanceId: selectedInstance.instanceId,
          page,
          size: pageSize,
        };

        if (selectedDBs.length) params.dbNames = selectedDBs.join(",");
        if (selectedStates.length) params.states = selectedStates.join(",");
        if (selectedWaitTypes.length) params.waitEventTypes = selectedWaitTypes.join(",");
        if (selectedQueryTypes.length) params.queryTypes = selectedQueryTypes.join(",");

        const res = await apiClient.get("/session/active/list", { params });

        console.log('세션 리스트 데이터 ',res.data);

        const mapped = res.data.data.map((s: any) => ({
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
        }));

        setSessions(mapped);
        setTotalCount(res.data.totalCount ?? mapped.length);
      } catch (err) {
        console.error("세션 리스트 조회 실패:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, [
    selectedInstance?.instanceId,
    selectedDBs.join(","),
    selectedStates.join(","),
    selectedWaitTypes.join(","),
    selectedQueryTypes.join(","),
    page,
  ]);

  /** 요약 카드 데이터 조회 */
  useEffect(() => {
    if (!selectedInstance?.instanceId) return;

    const fetchSummary = async () => {
      try {
        const res = await apiClient.get("/session/active/summary", {
          params: { instanceId: selectedInstance.instanceId },
        });
        setSummary({
          activeCount: res.data.activeCount ?? 0,
          waitingCount: res.data.waitingCount ?? 0,
          idleCount: res.data.idleCount ?? 0,
          totalCount: res.data.totalCount ?? 0,
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
      { accessorKey: "runtime", header: "실행시간",
        cell: (info) => formatRuntime(Number(info.getValue()))
      },
      {
        accessorKey: "query",
        header: "쿼리",
        cell: (info) => {
          const query = String(info.getValue() ?? "");
          const shortQuery =
            query.length > 120
              ? query.substring(0, 120).trimEnd() + "..."
              : query;

          return (
            <div
              className="query-text"
              style={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "600px",
              }}
            >
              {shortQuery}
            </div>
          );
        },
      }
    ],
    []
  );

  /** 테이블 구성 */
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
      // 세션 상세 정보 조회 API 호출
      const res = await apiClient.get("/session/active/detail", {
        params: {
          databaseId: session.databaseId, // 또는 적절한 databaseId
          pid: session.pid,
        },
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
  const handleDBChange = useCallback((v: string[] | string) => {
    setSelectedDBs(Array.isArray(v) ? v : [v]);
    setPage(1);
  }, []);

  const handleStateChange = useCallback((v: string[] | string) => {
    setSelectedStates(Array.isArray(v) ? v : [v]);
    setPage(1);
  }, []);

  const handleWaitTypeChange = useCallback((v: string[] | string) => {
    setSelectedWaitTypes(Array.isArray(v) ? v : [v]);
    setPage(1);
  }, []);

  const handleQueryTypeChange = useCallback((v: string[] | string) => {
    setSelectedQueryTypes(Array.isArray(v) ? v : [v]);
    setPage(1);
  }, []);

  /** 로딩 상태 */
  if (isLoading) return <div className="loading">세션 정보 불러오는 중...</div>;

  return (
    <main className="session-section">
      {/* 상단 요약 카드 */}
      <section className="session-summary">
        <SummaryCard
          label="Active Sessions"
          value={summary.activeCount}
          desc="현재 활성 세션 수"
          status="info"
        />
        <SummaryCard
          label="Waiting Sessions"
          value={summary.waitingCount}
          desc="대기 상태 세션 수"
          status="warning"
        />
        <SummaryCard
          label="Idle Sessions"
          value={summary.idleCount}
          desc="대기 중인 유휴 세션 수"
          status="info"
        />
        <SummaryCard
          label="Total Sessions"
          value={summary.totalCount}
          desc="전체 세션 수"
          status="critical"
        />
      </section>

      {/* 필터 영역 */}
      <section className="session-filters">
        <MultiSelectDropdown
          label="DB 선택"
          options={dbOptions}
          value={selectedDBs}
          onChange={handleDBChange}
        />
        <MultiSelectDropdown
          label="상태 선택"
          options={stateOptions}
          value={selectedStates}
          onChange={handleStateChange}
        />
        <MultiSelectDropdown
          label="대기 유형"
          options={waitEventTypeOptions}
          value={selectedWaitTypes}
          onChange={handleWaitTypeChange}
        />
        <MultiSelectDropdown
          label="쿼리 유형"
          options={queryTypeOptions}
          value={selectedQueryTypes}
          onChange={handleQueryTypeChange}
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

        {sessions.length > 0 ? (
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
      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={(newPage) => setPage(newPage)}
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