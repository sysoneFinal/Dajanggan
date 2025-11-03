import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "/src/styles/instance/instance-register.css";
import instanceDots from "/src/assets/icon/instance-dots.svg";
import apiClient from "../../api/apiClient";
import NewInstanceModal from "./InstanceRegister";
import type { NewInstance } from "./InstanceRegister";

export interface DatabaseSummary {
  databaseName: string;
  isEnabled: boolean;
  connections: number;
  sizeBytes: number;
  cacheHitRate: number;
  updatedAt: string;
}

export interface InstanceRow {
  instanceId: number;
  instanceName: string;
  host: string;
  port: number;
  isEnabled: boolean;
  version: string;
  createdAt: string;
  updatedAt: string;
  uptimeMs: number;    
  dbname?: string;      // 추가
  username?: string;    // 추가
  databases?: DatabaseSummary[];
}

type InstanceDto = {
    id: number | string;
    instanceName?: string;
    host: string;
    port: number;
    isEnabled?: boolean;
    status?: "active" | "inactive";  
    version?: string;
    updatedAt?: string;
    createdAt: string;
    dbname?: string;      // 추가
    username?: string;    // 추가
    databases?: Array<{
        name: string;
        isEnabled: boolean;
        status?: "active" | "inactive";  
        connections: number;
        sizeBytes: number;
        cacheHitRate: number;
        updatedAt: string;
  }>;
};

// Utils
const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value % 1 === 0 ? value : value.toFixed(1)}${sizes[i]}`;
};

const formatMs = (ms: number) => new Intl.NumberFormat().format(ms) + "/ms";

const formatDateTime = (iso: string) => {
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

export const toStatusLabel = (b: boolean) => (b ? "active" : "inactive");

const pickId = (i: any) =>
  i?.id ?? i?.instanceId ?? i?.instance_id ?? i?.instance_id_pk;
const pickDbName = (d: any) =>
  d?.name ?? d?.databaseName ?? d?.database_name;

export const mapInstance = (i: InstanceDto): InstanceRow => {
  const id = pickId(i);
  const dbs = Array.isArray(i.databases)
    ? i.databases
        .map((d) => ({
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
          updatedAt: d.updatedAt ?? d.updatedAt ?? "",
        }))
        .filter((d) => !!d.databaseName)
    : undefined;

  return {
    instanceId: Number(id ?? ""),
    instanceName: i.instanceName ?? i.host ?? String(id ?? "-"),
    host: i.host,
    port: Number(i.port),
    isEnabled: toBooleanStatus(i.isEnabled ?? i.status),
    version: i.version ?? "-",
    uptimeMs: Date.now() - Date.parse(i.createdAt),
    updatedAt: i.updatedAt ?? i.createdAt ?? new Date().toISOString(),
    createdAt: i.createdAt,
    dbname: i.dbname,      
    username: i.username,   
    databases: dbs,
  };
};

const InstancePage: React.FC = () => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [rows, setRows] = useState<InstanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InstanceRow | null>(null);
  const [openNewInstance, setOpenNewInstance] = useState(false);
  
  // 편집 모달 상태 추가
  const [editTarget, setEditTarget] = useState<InstanceRow | null>(null);
  const [openEditInstance, setOpenEditInstance] = useState(false);
  
  const menuRef = useRef<HTMLDivElement | null>(null);

  const extractInstanceList = (data: any): InstanceDto[] => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.content)) return data.content;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.records)) return data.records;
    return [];
  };

  const fetchInstances = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get("/api/instances");
      const list: InstanceDto[] = extractInstanceList(res.data);
      const mapped = (Array.isArray(list) ? list : [])
        .map(mapInstance)
        .filter((r) => !!r.instanceId);
      setRows(mapped);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "목록 조회 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstances();
  }, []);

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

    try {
      const res = await apiClient.get(`/api/instances/${key}/databases`);
      const arr = Array.isArray(res.data) ? res.data : [res.data];

      const mappedDbs: DatabaseSummary[] = arr
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

      setRows((prev) =>
        prev.map((r) => (r.instanceId === key ? { ...r, databases: mappedDbs } : r))
      );
      setExpanded((p) => ({ ...p, [key]: true }));
    } catch (e) {
      console.error("DB 목록 조회 실패:", e);
    }
  };

  const handleAddClick = () => {
    setOpenNewInstance(true);
  };

  const visibleRows = useMemo(() => rows, [rows]);

  useEffect(() => {
    const closeOnOutside = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest(".il-menu") || t.closest(".il-dots-btn")) return;
      setMenuOpenId(null);
    };
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, []);

  const openMenu = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setMenuOpenId(prev => (prev === id ? null : id));
  };

  const handleEdit = (row: InstanceRow) => {
    setMenuOpenId(null);
    setEditTarget(row);
    setOpenEditInstance(true);
  };

  const handleDelete = (row: InstanceRow) => {
    setDeleteTarget(row);
    setMenuOpenId(null);
  };

  // 편집 제출 핸들러
  const handleEditSubmit = async (form: NewInstance) => {
    if (!editTarget) return;
    
    const payload: any = {
      host: form.host,
      instanceName: form.instance,
      dbname: form.database,
      port: Number(form.port),
      username: form.username,
      sslmode: "require",
      isEnabled: true,
    };
    
    // 비밀번호가 입력된 경우에만 포함
    if (form.password?.trim()) {
      payload.secretRef = form.password;
    }

    await apiClient.put(`/api/instances/${editTarget.instanceId}`, payload);
    alert("수정 완료!");
    await fetchInstances(); // 목록 새로고침
  };

  // 편집용 initialValue 생성
  const editInitialValue: Partial<NewInstance> | undefined = editTarget ? {
    host: editTarget.host,
    instance: editTarget.instanceName,
    database: editTarget.dbname, // database 정보가 row에 없으므로 빈 값
    port: editTarget.port,
    username: editTarget.username, // username 정보가 row에 없으므로 빈 값
    password: "",
  } : undefined;

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
          <div>Status</div>
          <div>Version</div>
          <div>가동시간</div>
          <div>업데이트시간</div>
        </div>

        {visibleRows.map((r) => (
          <div key={r.instanceId} className="il-row-wrap">
            <div className="il-row" role="button" onClick={() => fetchAndToggle(r)}>
              <div className="il-cell il-strong">{r.instanceName}</div>
              <div className="il-cell">{r.host}</div>
              <div className="il-cell">{r.port}</div>
              <div className="il-cell">
                <span className={`il-dot ${r.isEnabled ? "il-dot--indigo" : "il-dot--red"}`} />
                <span className="il-status-label">
                  {r.isEnabled ? "active" : "inactive"}
                </span>
              </div>
              <div className="il-cell">{r.version}</div>
              <div className="il-cell">{formatMs(r.uptimeMs)}</div>
              <div className="il-cell">{formatDateTime(r.updatedAt)}</div>
              <div className="il-cell il-actions">
                <button className="il-dots-btn" onClick={(e) => openMenu(e, r.instanceId)}>
                  <img src={instanceDots} alt="options" width={20} height={20} />
                </button>

                {menuOpenId === r.instanceId && (
                  <div className="il-menu" ref={menuRef}>
                    <button onClick={() => handleEdit(r)}>수정</button>
                    <button className="danger" onClick={() => handleDelete(r)}>삭제</button>
                  </div>
                )}
              </div>
            </div>

            {deleteTarget && (
              <div className="il-modal">
                <div className="il-modal-card">
                  <div className="il-modal-header">
                    <h3>인스턴스 삭제</h3>
                  </div>
                  <div className="il-modal-body">
                    <p>
                      <b>{deleteTarget.instanceName}</b> 를(을) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                    </p>
                  </div>
                  <div className="il-modal-footer">
                    <button onClick={() => setDeleteTarget(null)}>취소</button>
                    <button
                      className="danger"
                      onClick={async() => {
                        try {
                          await apiClient.delete(`/api/instances/${deleteTarget.instanceId}`);
                          alert("삭제되었습니다.");
                          setDeleteTarget(null);
                          setRows(prev => prev.filter(r => r.instanceId !== deleteTarget.instanceId));
                        } catch (error) {
                          console.error(error);
                          alert("삭제 중 오류가 발생했습니다.");
                        }
                      }}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            )}

            {r.databases && r.databases.length > 0 && expanded[r.instanceId] && (
              <div className="il-db">
                <div className="il-db-title">Database</div>
                <div className="il-db-header">
                  <div>DB</div>
                  <div>Status</div>
                  <div>연결수</div>
                  <div>크기</div>
                  <div>캐시 히트율</div>
                  <div>마지막 업데이트</div>
                </div>
                {r.databases.map((db) => (
                  <div key={db.databaseName} className="il-db-row">
                    <div className="il-cell">{db.databaseName}</div>
                    <span className={`il-badge ${db.isEnabled ? "il-badge--indigo" : "il-badge--red"}`}>
                      {db.isEnabled ? "active" : "inactive"}
                    </span> 
                    <div className="il-cell">{db.connections}</div>
                    <div className="il-cell">{formatBytes(db.sizeBytes)}</div>
                    <div className="il-cell">{(db.cacheHitRate * 100).toFixed(1)}%</div>
                    <div className="il-cell">{formatDateTime(db.updatedAt)}</div>
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
        onClose={() => setOpenNewInstance(false)}
        onSubmit={async (payload) => {
          console.log("새 인스턴스 등록:", payload);
          await fetchInstances();
        }}
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