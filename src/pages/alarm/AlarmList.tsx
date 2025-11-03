// src/pages/alarms/AlarmRuleList.tsx
import { Fragment, useMemo, useState } from "react";
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
import SlackSettingsModal from "./SlackSetting";
import AlarmRuleModal from "./AlarmRuleModal";
import AlarmRuleEditModal from "./AlarmRuleEditModal";
import AlarmRuleDetailModal from "../alarm/AlarmRuleDetailModal";
import type { Metric, Aggregation, RuleThreshold, AlarmRulePayload } from "./AlarmRuleModal";
import "/src/styles/alarm/alarm-list.css";

type AlarmRuleRow = {
  id: number;
  instance: string;
  database: string;
  section: string;
  metric: "vacuum" | "Long Transactions / Blockers" | "Dead tuple";
  enabled: boolean;
};

const base: AlarmRuleRow[] = [
  { id: 1, instance: "orders",   database: "page",    section: "vacuum", metric: "vacuum", enabled: false },
  { id: 2, instance: "sessions", database: "orders",  section: "vacuum", metric: "vacuum", enabled: true  },
  { id: 3, instance: "orders",   database: "sessions", section: "vacuum", metric: "vacuum", enabled: true  },
  { id: 4, instance: "sessions", database: "orders",  section: "Hot index", metric: "Long Transactions / Blockers", enabled: true },
  { id: 5, instance: "orders",   database: "sessions", section: "Hot index", metric: "Long Transactions / Blockers", enabled: true },
  { id: 6, instance: "sessions", database: "page",    section: "Hot index", metric: "Long Transactions / Blockers", enabled: true },
  { id: 7, instance: "orders",   database: "orders", section: "Hot table",  metric: "Dead tuple", enabled: true },
  { id: 8, instance: "sessions", database: "sessions", section: "Session", metric: "Dead tuple", enabled: true },
  { id: 9, instance: "orders",   database: "sessions", section: "Session", metric: "Dead tuple", enabled: true },
  { id:10, instance: "sessions", database: "page",     section: "Session", metric: "Dead tuple", enabled: true },
];

const demoRows: AlarmRuleRow[] = Array.from({ length: 33 }, (_, i) => {
  const b = base[i % base.length];
  return { ...b, id: i + 1 };
});

// 기본 레벨 정의
const defaultLevels: AlarmRulePayload["levels"] = {
  notice: { threshold: 100_000, minDurationMin: 1, occurCount: 2, windowMin: 15 },
  warn: { threshold: 500_000, minDurationMin: 5, occurCount: 2, windowMin: 15 },
  danger: { threshold: 1_000_000, minDurationMin: 10, occurCount: 1, windowMin: 10 },
};

export default function AlarmRuleList({ rows = demoRows }: { rows?: AlarmRuleRow[] }) {
  const [data] = useState<AlarmRuleRow[]>(rows);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;
  const [openSlack, setOpenSlack] = useState(false);
  const [openAlarmRule, setOpenAlarmRule] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [editingRule, setEditingRule] = useState<AlarmRuleRow | null>(null);
  const [detailRuleId, setDetailRuleId] = useState<number | null>(null);

  // 수정 버튼 클릭
  const onEdit = (id: number) => {
    const rule = data.find(r => r.id === id);
    if (rule) {
      setEditingRule(rule);
      setOpenEdit(true);
    }
  };

  // 삭제 버튼 클릭
  const onDelete = (id: number) => {
    if (confirm("이 규칙을 삭제하시겠습니까?")) {
      console.log("delete id:", id);
    }
  };

  // 컬럼 정의
  const columns = useMemo<ColumnDef<AlarmRuleRow>[]>(
    () => [
      {
        accessorKey: "instance",
        header: "인스턴스",
        cell: (info) => <span className="al-td-strong">{info.getValue() as string}</span>,
      },
      {
        accessorKey: "database",
        header: "데이터베이스",
        cell: (info) => info.getValue(),
      },
      {
        accessorKey: "section",
        header: "구분",
        cell: (info) => info.getValue(),
      },
      {
        accessorKey: "metric",
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
    [data]
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

  const handleRowClick = (id: number) => {
    setDetailRuleId(id);
    setOpenDetail(true);
  };


  const handleEditFromDetail = (rule: any) => {
    // 상세 모달에서 수정 버튼 클릭 시
    setOpenDetail(false);
    
    // AlarmRuleRow를 찾아서 editingRule로 설정
    const alarmRule = data.find(r => r.id === rule.id);
    if (alarmRule) {
      setEditingRule(alarmRule);
      setOpenEdit(true);
    }
  };

  // CSV 내보내기 함수
  const handleExportCSV = () => {
    const headers = ["인스턴스", "데이터베이스", "구분", "지표", "활성화 상태"];
    const csvData = data.map((row) => [
      row.instance,
      row.database,
      row.section,
      row.metric,
      row.enabled ? "활성화" : "비활성화",
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
    const fileName = `alarm_rules_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
        <div className="alarm-page__filters">
          <MultiSelectDropdown
            label="인스턴스"
            options={["orders", "sessions"]}
            onChange={(values) => console.log("선택된 인스턴스:", values)}
          />
          <MultiSelectDropdown
            label="데이터베이스"
            options={["orders", "sessions"]}
            onChange={(values) => console.log("선택된 데이터베이스:", values)}
          />
          <MultiSelectDropdown
            label="구분"
            options={["page", "sessions"]}
            onChange={(values) => console.log("선택된 구분:", values)}
          />
          <MultiSelectDropdown
            label="지표"
            options={["vacuum", "Hot table", "Hot index"]}
            onChange={(values) => console.log("선택된 지표:", values)}
          />
          <MultiSelectDropdown
            label="상태"
            options={["활성화", "비활성화"]}
            onChange={(values) => console.log("선택된 상태:", values)}
          />
          <CsvButton onClick={handleExportCSV} tooltip="CSV 파일 저장" />
        </div>
      </section>

      {/* 알림 규칙 테이블 */}
      <section className="alarm-page__table">
        <div className="alarm-table-header">
          {table.getHeaderGroups().map((headerGroup) => (
            <Fragment key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <div
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  style={{ cursor: header.column.getCanSort() ? "pointer" : "default" }}
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
      </section>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}

      {/* Slack 설정 모달 */}
      <SlackSettingsModal
        open={openSlack}
        onClose={() => setOpenSlack(false)}
        onSave={(v) => console.log("Slack 설정 저장:", v)}
        initialValue={{ instance: "postgres", enabled: true }}
      />

      {/* 알림 규칙 생성 모달 */}
      <AlarmRuleModal
        open={openAlarmRule}
        onClose={() => setOpenAlarmRule(false)}
        mode="create"
        onSubmit={(payload) => {
          console.log("생성:", payload);
          // API 호출 후 목록 갱신
        }}
      />

      {/* 알림 규칙 수정 모달 */}
      <AlarmRuleEditModal
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        initialData={editingRule ? {
          enabled: editingRule.enabled,
          targetInstance: editingRule.instance,
          targetDatabase: editingRule.database,
          metric: "dead_tuples" as Metric,
          aggregation: "latest_avg" as Aggregation,
          levels: defaultLevels,
        } : undefined}
        onSubmit={(payload) => {
          console.log("수정:", payload);
          // API 호출 후 목록 갱신
        }}
        onDelete={() => {
          console.log("삭제:", editingRule?.id);
          // API 호출 후 목록 갱신
        }}
      />

      {/* 알림 규칙 상세 모달 */}
      <AlarmRuleDetailModal
        open={openDetail}
        onClose={() => setOpenDetail(false)}
        ruleId={detailRuleId ?? undefined}
        onEdit={handleEditFromDetail}
      />
    </main>
  );
}