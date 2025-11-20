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
import SlackSettingsModal from "./SlackSetting";
import AlarmRuleModal from "./AlarmRuleModal";
import AlarmRuleEditModal from "./AlarmRuleEditModal";
import AlarmRuleDetailModal from "../alarm/AlarmRuleDetailModal";
import type { Metric, Aggregation, MetricCategory, AlarmRulePayload } from "./AlarmRuleModal";
import { CATEGORY_LABELS } from "./AlarmRuleModal";
import "/src/styles/alarm/alarm-list.css";
import apiClient from "../../api/apiClient";
import { useInstanceContext } from "../../context/InstanceContext";

/* ============================== */
/*  서버 전송용 타입 & 매핑 함수   */
/* ============================== */

type RuleThreshold = {
  threshold: number | null;
  minDurationMin: number | null;
  occurCount: number | null;
  windowMin: number | null;
};

type ServerCreatePayload = {
  instanceId: number | null;
  databaseId: number | null;
  metricType: Metric;
  aggregationType: Aggregation;
  operator: "gt" | "gte" | "lt" | "lte" | "eq";
  enabled: boolean;
  levels: {
    notice: RuleThreshold;
    warning: RuleThreshold;
    critical: RuleThreshold;
  };
};

type ServerUpdatePayload = {
  alarmRuleId?: number; // 서버가 path param으로 받으면 생략 가능
  metricCategory?: MetricCategory;
  metricType?: Metric;
  aggregationType: Aggregation;
  operator?: "gt" | "gte" | "lt" | "lte" | "eq";
  enabled: boolean;
  levels: {
    notice: RuleThreshold;
    warning: RuleThreshold;
    critical: RuleThreshold;
  };
};

/** FE 생성 페이로드(내부 키: warn/danger) -> 서버 JSONB 페이로드(키: warning/critical) */
function toServerCreateJSONB(p: AlarmRulePayload): ServerCreatePayload {
  return {
    instanceId: p.instanceId,
    databaseId: p.databaseId,
    metricType: p.metricType,
    aggregationType: p.aggregationType,
    operator: p.operator || "gt",
    enabled: p.enabled,
    levels: {
      notice: p.levels.notice,
      warning: p.levels.warn,      // warn -> warning
      critical: p.levels.danger,   // danger -> critical
    },
  };
}

/** 편집 페이로드를 유연하게 서버 JSONB로 정규화
 *  - EditModal에서 이미 서버형을 줄 수도 있고( warning/critical ),
 *  - 프론트형(warn/danger)일 수도 있어서 둘 다 처리
 */
function toServerUpdateJSONB(p: any): ServerUpdatePayload {
  const lv = p.levels || {};
  const hasServerKeys = lv.warning && lv.critical;
  const hasClientKeys = lv.warn && lv.danger;

  return {
    alarmRuleId: p.alarmRuleId,
    metricCategory: p.metricCategory,
    metricType: p.metricType,
    aggregationType: p.aggregationType,
    operator: p.operator,
    enabled: p.enabled,
    levels: hasServerKeys
      ? {
          notice: lv.notice,
          warning: lv.warning,
          critical: lv.critical,
        }
      : hasClientKeys
      ? {
          notice: lv.notice,
          warning: lv.warn,
          critical: lv.danger,
        }
      : lv, // 마지막 fallback (이미 서버 포맷이라고 가정)
  };
}

/* ============================== */

type AlarmRuleRow = {
  id: number;
  instanceId: number;
  databaseId: number;
  instanceName: string;
  databaseName: string;
  section: string;
  metricType: string;
  enabled: boolean;
};

export default function AlarmRuleList() {
  const { selectedInstance, selectedDatabase } = useInstanceContext();
  const [data, setData] = useState<AlarmRuleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;
  const [openSlack, setOpenSlack] = useState(false);
  const [openAlarmRule, setOpenAlarmRule] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [detailRuleId, setDetailRuleId] = useState<number | null>(null);

  // 알림 규칙 목록 조회
  useEffect(() => {
    if (!selectedInstance) {
      setData([]);
      return;
    }

    const ac = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const params: any = {
          instanceId: selectedInstance.instanceId,
        };
        if (selectedDatabase) params.databaseId = selectedDatabase.databaseId;

        const res = await apiClient.get("/alarms/rules", { params, signal: ac.signal });

        const rules: AlarmRuleRow[] =
          res.data.rules?.map((rule: any) => ({
            id: rule.alarmRuleId,
            instanceId: rule.instanceId,
            databaseId: rule.databaseId,
            instanceName: rule.instanceName || "Unknown",
            databaseName: rule.databaseName || "Unknown",
            section: rule.section || "N/A",
            metricType: rule.metricType,
            enabled: rule.enabled ?? false,
          })) || [];

        setData(rules);
      } catch (e: any) {
        if (e?.name !== "CanceledError") {
          console.error("Failed to fetch alarm rules:", e);
          setError(e?.response?.data?.message ?? "알림 규칙 조회 실패");
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [selectedInstance, selectedDatabase]);

  const onEdit = (id: number) => {
    setEditingRuleId(id);
    setOpenEdit(true);
  };

  const onDelete = async (id: number) => {
    if (!confirm("이 규칙을 삭제하시겠습니까?")) return;

    try {
      await apiClient.delete(`/alarms/rules/${id}`);
      setData((prev) => prev.filter((r) => r.id !== id));
      alert("규칙이 삭제되었습니다.");
    } catch (e: any) {
      console.error("Failed to delete rule:", e);
      alert("규칙 삭제에 실패했습니다.");
    }
  };

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
    []
  );

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

  useEffect(() => {
    setCurrentPage(1);
  }, [globalFilter]);

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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRowClick = (id: number) => {
    setDetailRuleId(id);
    setOpenDetail(true);
  };

  const handleEditFromDetail = (ruleId: number) => {
    setOpenDetail(false);
    setEditingRuleId(ruleId);
    setOpenEdit(true);
  };

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
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const fileName = `alarm_rules_${now.getFullYear()}${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(
      2,
      "0"
    )}${String(now.getMinutes()).padStart(2, "0")}.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /* ====== 여기서부터 JSONB 매핑 적용 ====== */

  // 생성
  const handleCreateRule = async (payload: AlarmRulePayload) => {
    // 중복 체크: 동일한 instance, database, 카테고리, 지표 조합이 이미 존재하는지 확인
    // try 블록 밖에서 먼저 체크
    const categoryLabel = CATEGORY_LABELS[payload.metricCategory];
    
    const isDuplicate = data.some((rule) => {
      const matches = 
        rule.instanceId === payload.instanceId &&
        rule.databaseId === payload.databaseId &&
        rule.section === categoryLabel &&
        rule.metricType === payload.metricType;
      
      // 디버깅용 (나중에 제거 가능)
      if (matches) {
        console.log("중복 발견:", {
          existing: { instanceId: rule.instanceId, databaseId: rule.databaseId, section: rule.section, metricType: rule.metricType },
          new: { instanceId: payload.instanceId, databaseId: payload.databaseId, section: categoryLabel, metricType: payload.metricType }
        });
      }
      
      return matches;
    });

    if (isDuplicate) {
      alert("동일한 인스턴스, 데이터베이스, 카테고리, 지표를 가진 알림 규칙이 이미 존재합니다.");
      return;
    }

    try {
      const serverPayload = toServerCreateJSONB(payload);
    
 
      await apiClient.post("/alarms/rules", serverPayload);

      // 목록 새로고침
      const res = await apiClient.get("/alarms/rules", {
        params: {
          instanceId: selectedInstance?.instanceId,
          databaseId: selectedDatabase?.databaseId,
        },
      });

      const rules: AlarmRuleRow[] =
        res.data.rules?.map((rule: any) => ({
          id: rule.alarmRuleId,
          instanceId: rule.instanceId,
          databaseId: rule.databaseId,
          instanceName: rule.instanceName || "Unknown",
          databaseName: rule.databaseName || "Unknown",
          section: rule.section || "N/A",
          metricType: rule.metricType,
          enabled: rule.enabled ?? false,
        })) || [];

      setData(rules);
      alert("알림 규칙이 생성되었습니다.");
    } catch (e: any) {
      console.error("Failed to create rule:", e);
      
      // 백엔드에서 중복 에러를 반환한 경우
      const errorMessage = e?.response?.data?.message || e?.message || "";
      if (errorMessage.includes("중복") || errorMessage.includes("duplicate") || errorMessage.includes("already exists")) {
        alert("동일한 인스턴스, 데이터베이스, 카테고리, 지표를 가진 알림 규칙이 이미 존재합니다.");
      } else {
        alert(`알림 규칙 생성에 실패했습니다: ${errorMessage || "알 수 없는 오류"}`);
      }
    }
  };

  // 수정
  const handleUpdateRule = async (payload: any) => {
    if (!editingRuleId) return;

    try {
      // payload는 EditModal에서 온 값(프론트형 또는 서버형) → 서버 JSONB로 정규화
      const serverPayload = toServerUpdateJSONB(payload);

      // 서버가 path param + body 조합을 받는다고 가정
      await apiClient.put(`/alarms/rules/${editingRuleId}`, serverPayload);

      // 목록 새로고침
      const res = await apiClient.get("/alarms/rules", {
        params: {
          instanceId: selectedInstance?.instanceId,
          databaseId: selectedDatabase?.databaseId,
        },
      });

      const rules: AlarmRuleRow[] =
        res.data.rules?.map((rule: any) => ({
          id: rule.alarmRuleId,
          instanceId: rule.instanceId,
          databaseId: rule.databaseId,
          instanceName: rule.instanceName || "Unknown",
          databaseName: rule.databaseName || "Unknown",
          section: rule.section || "N/A",
          metricType: rule.metricType,
          enabled: rule.enabled ?? false,
        })) || [];

      setData(rules);
      setOpenEdit(false);
      setEditingRuleId(null);
      alert("알림 규칙이 수정되었습니다.");
    } catch (e: any) {
      console.error("Failed to update rule:", e);
      console.error("Error response:", e?.response?.data);
      alert(`알림 규칙 수정에 실패했습니다: ${e?.response?.data?.message || e.message}`);
    }
  };

  const handleDeleteFromEdit = async () => {
    if (!editingRuleId) return;

    if (!confirm("이 규칙을 삭제하시겠습니까?")) return;

    try {
      await apiClient.delete(`/alarms/rules/${editingRuleId}`);
      setData((prev) => prev.filter((r) => r.id !== editingRuleId));
      alert("규칙이 삭제되었습니다.");
    } catch (e: any) {
      console.error("Failed to delete rule:", e);
      alert("규칙 삭제에 실패했습니다.");
    }
  };

  /* ======================================= */

  if (!selectedInstance) {
    return (
      <main className="alarm-page">
        <div style={{ padding: "40px", textAlign: "center", color: "#6B7280" }}>
          <p style={{ fontSize: "18px", fontWeight: "500", marginBottom: "8px" }}>
            Instance를 선택해주세요
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="alarm-page">
      <section className="alarm-page__filters">
        <div className="filter-left">
          <button className="al-btn" onClick={() => setOpenSlack(true)}>
            Slack 연동 설정
          </button>
          <button className="al-btn" onClick={() => setOpenAlarmRule(true)}>
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

      <section className="alarm-page__table">
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#9CA3AF" }}>
            로딩 중...
          </div>
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
                  onClick={() => handleRowClick(row.original.id)}
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
              <div className="alarm-table-empty">데이터가 없습니다.</div>
            )}
          </>
        )}
      </section>

      {totalPages > 1 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
      )}

      <SlackSettingsModal
        open={openSlack}
        onClose={() => setOpenSlack(false)}
        onSave={(v) => console.log("Slack 설정 저장:", v)}
        initialValue={{ instance: "postgres", enabled: true }}
      />

      <AlarmRuleModal
        open={openAlarmRule}
        onClose={() => setOpenAlarmRule(false)}
        mode="create"
        onSubmit={handleCreateRule}
      />

      <AlarmRuleEditModal
        open={openEdit}
        onClose={() => {
          setOpenEdit(false);
          setEditingRuleId(null);
        }}
        ruleId={editingRuleId ?? undefined}
        onSubmit={handleUpdateRule}
        onDelete={handleDeleteFromEdit}
      />

      <AlarmRuleDetailModal
        open={openDetail}
        onClose={() => setOpenDetail(false)}
        ruleId={detailRuleId ?? undefined}
        onEdit={handleEditFromDetail}
      />
    </main>
  );
}
