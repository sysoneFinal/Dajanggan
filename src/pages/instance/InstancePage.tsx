// 작성자: 김민서
// 인스턴스 관리 페이지 컴포넌트
// 역할: 인스턴스 목록 조회, 등록, 수정, 삭제, 데이터베이스 확장/축소 표시

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "/src/styles/instance/instance-register.css";
import instanceDots from "/src/assets/icon/instance-dots.svg";
import apiClient from "../../api/apiClient";
import NewInstanceModal from "./InstanceRegister";
import type { NewInstance } from "./InstanceRegister";

// ============= Types =============
export interface DatabaseSummary {
  databaseName: string;
  isEnabled: boolean;
  connections: number | null;
  sizeBytes: number | null;
  cacheHitRate: number | null;
  updatedAt: string;
}

export interface InstanceRow {
  instanceId: number;
  instanceName: string;
  host: string;
  port: number;
  status: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  uptimeMs: number;
  userName?: string;
  databases?: DatabaseSummary[];
}

type InstanceDto = {
  id: number | string;
  instanceName?: string;
  host: string;
  port: number;
  status?: "active" | "inactive";
  version?: string;
  updatedAt?: string;
  createdAt: string;
  userName?: string;
  databases?: Array<{
    name: string;
    isEnabled: boolean;
    status?: "active" | "inactive";
    connections: number | null;
    sizeBytes: number | null;
    cacheHitRate: number | null;
    updatedAt: string;
  }>;
};

type InstanceUpdatePayload = {
  host: string;
  instanceName: string;
  port: number;
  userName: string;
  isEnabled: boolean;
  secretRef?: string;
};

// ============= Constants =============
const ERROR_MESSAGES = {
  FETCH_FAILED: "목록 조회 실패",
  DELETE_FAILED: "삭제 중 오류가 발생했습니다.",
  DATABASE_FETCH_FAILED: "DB 목록 조회 실패",
  DUPLICATE_INSTANCE: "동일한 Host와 Port를 가진 인스턴스가 이미 존재합니다.",
} as const;

const SUCCESS_MESSAGES = {
  CREATE: "등록 성공!",
  UPDATE: "수정 완료!",
  DELETE: "삭제되었습니다.",
} as const;

const CONFIRM_MESSAGES = {
  DELETE: (name: string) =>
    `${name}을(를) 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`,
} as const;

// ============= Utilities =============
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value % 1 === 0 ? value : value.toFixed(1)}${sizes[i]}`;
};

const formatMs = (ms: number): string => 
  new Intl.NumberFormat().format(ms) + "/ms";

const formatDateTime = (iso: string): string => {
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${y}.${mm}.${dd} ${hh}:${mi}:${ss}`;
  } catch {
    return iso;
  }
};

export const toBooleanStatus = (s?: string | boolean): boolean => {
  if (typeof s === "boolean") return s;
  if (!s) return false;
  return s.toLowerCase() === "active";
};

export const toStatusLabel = (b: boolean): string => 
  b ? "active" : "inactive";

const pickId = (i: any): number | string =>
  i?.id ?? i?.instanceId ?? i?.instance_id ?? i?.instance_id_pk;

const pickDbName = (d: any): string =>
  d?.name ?? d?.databaseName ?? d?.database_name;


// ============= Data Mapping =============
const mapDatabaseSummary = (d: any): DatabaseSummary => ({
  databaseName: String(pickDbName(d) ?? ""),
  isEnabled: toBooleanStatus(d.isEnabled ?? d.status),
  connections: Number(d.connections ?? 0),
  sizeBytes:
    typeof d.sizeBytes === "number"
      ? d.sizeBytes
      : Number(d.sizeBytes ?? 0),
  cacheHitRate:
    typeof d.cacheHitRate === "number"
      ? d.cacheHitRate
      : Number(d.cacheHitRate ?? 0),
  updatedAt: d.updatedAt ?? d.updated_at ?? "",
});

export const mapInstance = (i: InstanceDto): InstanceRow => {
  const id = pickId(i);
  const dbs = Array.isArray(i.databases)
    ? i.databases
        .map(mapDatabaseSummary)
        .filter((d) => !!d.databaseName)
    : undefined;

  return {
    instanceId: Number(id ?? ""),
    instanceName: i.instanceName ?? i.host ?? String(id ?? "-"),
    host: i.host,
    port: Number(i.port),
    version: i.version ?? "-",
    status: i.status ?? "inactive",
    uptimeMs: Date.now() - Date.parse(i.createdAt),
    updatedAt: i.updatedAt ?? i.createdAt ?? new Date().toISOString(),
    createdAt: i.createdAt,
    userName: i.userName,
    databases: dbs,
  };
};

const extractInstanceList = (data: any): InstanceDto[] => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.records)) return data.records;
  return [];
};

// Main components
const InstancePage: React.FC = () => {
  const navigate = useNavigate();

  // 상태 관리
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [rows, setRows] = useState<InstanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [openNewInstance, setOpenNewInstance] = useState(false);
  const [editTarget, setEditTarget] = useState<InstanceRow | null>(null);
  const [openEditInstance, setOpenEditInstance] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);

  
// ============= API =============
  const fetchInstances = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get("/instances");
      const list: InstanceDto[] = extractInstanceList(res.data);
      const mapped = (Array.isArray(list) ? list : [])
        .map(mapInstance)
        .filter((r) => !!r.instanceId);
      setRows(mapped);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? ERROR_MESSAGES.FETCH_FAILED);
    } finally {
      setLoading(false);
    }
  };

  const fetchDatabases = async (instanceId: number): Promise<DatabaseSummary[]> => {
    try {
      const res = await apiClient.get(`/instances/${instanceId}/databases`);
      const arr = Array.isArray(res.data) ? res.data : [res.data];

      return arr
        .filter(Boolean)
        .map((d: any) => ({
          databaseName: String(d.databaseName ?? d.name ?? d.database_name ?? ""),
          isEnabled: toBooleanStatus(d.isEnabled ?? d.status),
          connections: Number(d.connections ?? 0),
          sizeBytes: Number(d.sizeBytes ?? d.size_bytes ?? 0),
          cacheHitRate:
            typeof d.cacheHitRate === "number"
              ? d.cacheHitRate
              : Number(d.cacheHitRate ?? d.cache_hit_rate ?? 0) / 100,
          updatedAt: d.updatedAt ?? d.updated_at ?? "",
        }))
        .filter((d) => d.databaseName);
    } catch (e) {
      console.error(ERROR_MESSAGES.DATABASE_FETCH_FAILED, e);
      return [];
    }
  };

  
// ============= Event handler =============
    const fetchAndToggle = async (row: InstanceRow) => {
    const key = row.instanceId;
    const isOpen = !!expanded[key];

    if (isOpen) {
      setExpanded((p) => ({ ...p, [key]: false }));
      return;
    }

    if (row.databases && row.databases.length > 0) {
      setExpanded((p) => ({ ...p, [key]: true }));
      return;
    }

    const mappedDbs = await fetchDatabases(key);
    setRows((prev) =>
      prev.map((r) => (r.instanceId === key ? { ...r, databases: mappedDbs } : r))
    );
    setExpanded((p) => ({ ...p, [key]: true }));
  };

  const handleAddClick = () => {
    setOpenNewInstance(true);
  };

  const checkDuplicateInstance = (host: string, port: number): boolean => {
    return rows.some((row) => {
      return (
        row.host.toLowerCase().trim() === host.toLowerCase().trim() &&
        row.port === port
      );
    });
  };

  const handleNewInstanceSubmit = async (form: NewInstance) => {
    if (checkDuplicateInstance(form.host, Number(form.port))) {
      alert(ERROR_MESSAGES.DUPLICATE_INSTANCE);
      return;
    }

    const payload = {
      host: form.host,
      instanceName: form.instance,
      port: Number(form.port),
      userName: form.userName,
      secretRef: form.password,
    };

    try {
      const res = await apiClient.post("/instances", payload);
      alert(`${SUCCESS_MESSAGES.CREATE} ID: ${res.data?.instanceId ?? "unknown"}`);
      await fetchInstances();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || "등록에 실패했습니다";
      alert(errorMessage);
    }
  };

  const handleEdit = (row: InstanceRow) => {
    setMenuOpenId(null);
    setEditTarget(row);
    setOpenEditInstance(true);
  };

  const handleDelete = async (row: InstanceRow) => {
    setMenuOpenId(null);

    const confirmed = window.confirm(CONFIRM_MESSAGES.DELETE(row.instanceName));
    if (!confirmed) return;

    try {
      await apiClient.delete(`/instances/${row.instanceId}`);
      alert(SUCCESS_MESSAGES.DELETE);
      setRows((prev) => prev.filter((r) => r.instanceId !== row.instanceId));
    } catch (error: any) {
      console.error(error);
      const errorMessage = error?.response?.data?.message || ERROR_MESSAGES.DELETE_FAILED;
      alert(errorMessage);
    }
  };

  const handleEditSubmit = async (form: NewInstance) => {
    if (!editTarget) return;

    const payload: InstanceUpdatePayload = {
      host: form.host,
      instanceName: form.instance,
      port: Number(form.port),
      userName: form.userName,
      isEnabled: true,
    };

    if (form.password?.trim()) {
      payload.secretRef = form.password;
    }

    try {
      await apiClient.put(`/instances/${editTarget.instanceId}`, payload);
      alert(SUCCESS_MESSAGES.UPDATE);
      await fetchInstances();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || "수정에 실패했습니다";
      alert(errorMessage);
    }
  };

  const openMenu = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setMenuOpenId((prev) => (prev === id ? null : id));
  };

 
// ============= Effects =============
  useEffect(() => {
    fetchInstances();
  }, []);

  useEffect(() => {
    const closeOnOutside = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest(".il-menu") || t.closest(".il-dots-btn")) return;
      setMenuOpenId(null);
    };
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, []);

  // ============================================================================
  // 계산된 값
  // ============================================================================

  const visibleRows = useMemo(() => rows, [rows]);

  const editInitialValue: Partial<NewInstance> | undefined = editTarget
    ? {
        host: editTarget.host,
        instance: editTarget.instanceName,
        port: editTarget.port,
        userName: editTarget.userName,
        password: "",
      }
    : undefined;

 
// ============= randering =============
  return (
    <div className="il-root">
      <div className="il-topbar">
        <button className="il-add-btn" onClick={handleAddClick}>
          + 인스턴스 등록
        </button>
      </div>

      {loading && <div className="il-banner il-banner--muted">로딩 중…</div>}
      {error && <div className="il-banner il-banner--error">{error}</div>}

      <div className="il-card">
        <div className="il-header-row">
          <div>Instance</div>
          <div>Host</div>
          <div>Port</div>
          <div>User Name</div>
          <div>Status</div>
          <div>Version</div>
          <div>가동시간</div>
          <div>업데이트시간</div>
        </div>

        {visibleRows.map((r) => (
          <div key={r.instanceId} className="il-row-wrap">
            <div
              className="il-row"
              role="button"
              onClick={() => fetchAndToggle(r)}
            >
              <div className="il-cell il-strong">{r.instanceName}</div>
              <div className="il-cell">{r.host}</div>
              <div className="il-cell">{r.port}</div>
              <div className="il-cell">{r.userName}</div>
              <div className="il-cell">{r.status}</div>
              <div className="il-cell">{r.version}</div>
              <div className="il-cell">{formatMs(r.uptimeMs)}</div>
              <div className="il-cell">{formatDateTime(r.updatedAt)}</div>
              <div className="il-cell il-actions">
                <button
                  className="il-dots-btn"
                  onClick={(e) => openMenu(e, r.instanceId)}
                >
                  <img
                    src={instanceDots}
                    alt="options"
                    width={20}
                    height={20}
                  />
                </button>

                {menuOpenId === r.instanceId && (
                  <div className="il-menu" ref={menuRef}>
                    <button onClick={() => handleEdit(r)}>수정</button>
                    <button className="danger" onClick={() => handleDelete(r)}>
                      삭제
                    </button>
                  </div>
                )}
              </div>
            </div>

            {r.databases &&
              r.databases.length > 0 &&
              expanded[r.instanceId] && (
                <div className="il-db">
                  <div className="il-db-title">Database</div>
                  <div className="il-db-header">
                    <div>DB</div>
                    <div>Status</div>
                    <div>마지막 업데이트</div>
                  </div>
                  {r.databases.map((db) => (
                    <div key={db.databaseName} className="il-db-row">
                      <div className="il-cell">{db.databaseName}</div>
                      <span
                        className={`il-badge ${
                          db.isEnabled ? "il-badge--indigo" : "il-badge--red"
                        }`}
                      >
                        {db.isEnabled ? "active" : "inactive"}
                      </span>
                      <div className="il-cell">
                        {formatDateTime(db.updatedAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        ))}

        {!loading && !error && visibleRows.length === 0 && (
          <div className="il-empty">등록된 인스턴스가 없습니다.</div>
        )}
      </div>

      {/* 인스턴스 등록 모달 */}
      <NewInstanceModal
        open={openNewInstance}
        onClose={() => {
          setOpenNewInstance(false);
        }}
        onSubmit={handleNewInstanceSubmit}
        mode="create"
      />

      {/* 인스턴스 편집 모달 */}
      <NewInstanceModal
        open={openEditInstance}
        onClose={() => {
          setOpenEditInstance(false);
          setEditTarget(null);
        }}
        initialValue={editInitialValue}
        onSubmit={handleEditSubmit}
        mode="edit"
        instanceId={editTarget?.instanceId}
      />
    </div>
  );
};

export default InstancePage;