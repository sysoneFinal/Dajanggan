import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "/src/styles/instance-register.css";
import apiClient from "../../api/apiClient"; // ✅ 공통 axios 인스턴스 사용


// ------------------ Types ------------------
export type DbStatus = "active" | "idle" | "down";

export interface DatabaseSummary {
  name: string;
  status: DbStatus;
  connections: number;
  sizeBytes: number; // bytes
  cacheHitRate: number; // 0~1
  lastUpdatedAt: string; // ISO string
}

export interface InstanceRow {
  id: string;
  name: string;
  ip: string;
  port: number;
  status: "up" | "down" | "warning";
  version: string;
  uptimeMs: number; // ms
  updatedAt: string; // ISO string
  databases?: DatabaseSummary[];
}

// ------------------ Utils ------------------
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

// ------------------ Mock Data ------------------
const MOCK: InstanceRow[] = [
  {
    id: "newPost1",
    name: "newPost1",
    ip: "120.155.234.1",
    port: 1541,
    status: "down",
    version: "10.2.1",
    uptimeMs: 1223141,
    updatedAt: "2025-10-11T10:11:23",
    databases: [
      {
        name: "DBNAME",
        status: "active",
        connections: 3,
        sizeBytes: 5.3 * 1024 ** 3,
        cacheHitRate: 0.942,
        lastUpdatedAt: "2025-10-11T10:11:23",
      },
    ],
  },
  {
    id: "postgres",
    name: "postgres",
    ip: "10.10.10",
    port: 101010, // 렌더링시 표시만 "10.10.10"
    status: "up",
    version: "PostgreSQL 10",
    uptimeMs:
      150 * 24 * 60 * 60 * 1000 +
      20 * 60 * 60 * 1000 +
      57 * 60 * 1000 +
      54 * 1000,
    updatedAt: "2025-10-10T10:10:10",
  },
];

// ------------------ Component ------------------
const InstancePage: React.FC = () => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const navigate = useNavigate(); // ✅ 추가
  const rows = useMemo(() => MOCK, []);
  const handleAddClick = () => {
    navigate("/instance-resister"); // 이동할 경로 지정
  };

  return (
    <div className="il-root">
      <div className="il-topbar">
        <button className="il-add-btn" onClick={handleAddClick}>
          + 인스턴스 등록
        </button>      </div>

      <div className="il-card">
        <div className="il-header-row">
          <div>Instance</div>
          <div>IP</div>
          <div>Port</div>
          <div>Status</div>
          <div>Version</div>
          <div>가동시간</div>
          <div>업데이트시간</div>
        </div>

        {rows.map((r) => (
          <div key={r.id} className="il-row-wrap">
            <div
              className="il-row"
              role="button"
              onClick={() => setExpanded((e) => ({ ...e, [r.id]: !e[r.id] }))}
            >
              <div className="il-cell il-strong">{r.name}</div>
              <div className="il-cell">{r.ip}</div>
              <div className="il-cell">{r.port === 101010 ? "10.10.10" : r.port}</div>
              <div className="il-cell">
                {r.status === "up" && <span className="il-dot il-dot--indigo" />}
                {r.status === "down" && <span className="il-dot il-dot--red" />}
                {r.status === "warning" && <span className="il-dot il-dot--amber" />}
              </div>
              <div className="il-cell">{r.version}</div>
              <div className="il-cell">{formatMs(r.uptimeMs)}</div>
              <div className="il-cell">{formatDateTime(r.updatedAt)}</div>
            </div>

            {r.databases && r.databases.length > 0 && expanded[r.id] && (
              <div className="il-db">
                <div className="il-db-title">Database</div>
                <div className="il-db-header">
                  <div>DB</div>
                  <div className="center">Status</div>
                  <div className="center">연결수</div>
                  <div className="right">크기</div>
                  <div className="center">캐시 히트율</div>
                  <div className="center">마지막 업데이트</div>
                </div>
                {r.databases.map((db) => (
                  <div key={db.name} className="il-db-row">
                    <div className="il-cell">{db.name}</div>
                    <div className="il-cell center">
                      <span className="il-badge il-badge--indigo">{db.status}</span>
                    </div>
                    <div className="il-cell center">{db.connections}</div>
                    <div className="il-cell right">{formatBytes(db.sizeBytes)}</div>
                    <div className="il-cell center">{(db.cacheHitRate * 100).toFixed(1)}%</div>
                    <div className="il-cell center">{formatDateTime(db.lastUpdatedAt)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default InstancePage;