import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import "../../styles/layout/header.css";
import { createPortal } from "react-dom";
import { useDashboard } from "../../context/DashboardContext";
import { useInstanceContext } from "../../context/InstanceContext";
import AlertDetailModal, { type AlertDetailData } from "../../pages/alarm/AlarmFeedModal";
import type { Instance } from "../../types/instance";
import type { Database } from "../../types/database";


interface HeaderProps {
  breadcrumb: string[];
}

const Header = ({ breadcrumb }: HeaderProps) => {
  const location = useLocation();

  /** === Contexts === */
  const { isEditing, setIsEditing, handleSaveEdit, handleCancelEdit } = useDashboard();
  const {
    instances,
    selectedInstance,
    setSelectedInstance,
    databases,
    selectedDatabase,
    setSelectedDatabase,
    refreshInterval,     
    setRefreshInterval    
  } = useInstanceContext();

  /** === Local state === */
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<AlertDetailData | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  /** === handleSelect: 선택 시 context 업데이트 === */
  const handleSelect = (target: string, value: any) => {
    if (target === "instance") {
      const instance = instances.find(i => i.instanceName === value);
      setSelectedInstance(instance ?? null);
    }

    if (target === "database") {
      const db = databases.find(d => d.databaseName === value);
      setSelectedDatabase(db ?? null);
    }

    if (target === "interval") {
      setRefreshInterval(value); // Context의 setter 사용
    }
    
    setOpenDropdown(null);
  };

  /** === 드롭다운 외부 클릭 감지 === */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /** === 공통 드롭다운 렌더링 === */
  const renderDropdown = (
    list: string[] | Instance[] | Database[] | null | undefined,
    selectedValue: string | null,
    target: string,
    disabled?: boolean
  ) => {
    const safeList = Array.isArray(list) ? list : [];

    const dropdown = (
      <div
        className="dropdown-menu"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          top: dropdownPos.top,
          left: dropdownPos.left,
          minWidth: dropdownPos.width,
          maxWidth: "300px",
          width: "auto",
          zIndex: 9999,
        }}
      >
        {safeList.map((item: any, index) => {
          let name = "";
          let id = "";

          if (typeof item === "string") {
            name = item;
            id = item;
          } else if ("instanceName" in item) {
            name = item.instanceName ?? "";
            id = item.instanceId?.toString() ?? `instance-${index}`;
          } else if ("databaseName" in item) {
            name = item.databaseName ?? "";
            id = item.databaseId?.toString() ?? `db-${index}`;
          }

          return (
            <button
              key={id}
              className={`dropdown-item ${
                (target === "instance" && selectedInstance?.instanceName === name) ||
                (target === "database" && selectedDatabase?.databaseName === name) ||
                (target === "interval" && refreshInterval === name)
                  ? "active"
                  : ""
              }`}
              onClick={() => handleSelect(target, name)}
            >
              {name || "(no name)"}
            </button>
          );
        })}
      </div>
    );

    return (
      <div className="dropdown-wrapper" ref={dropdownRef}>
        <button
          className={`header-btn ${disabled ? "disabled" : ""}`}
          onClick={(e) => {
            if (disabled) return;
            const rect = e.currentTarget.getBoundingClientRect();
            setDropdownPos({
              top: rect.bottom + window.scrollY + 8,
              left: rect.left + window.scrollX,
              width: rect.width,
            });
            setOpenDropdown((prev) => (prev === target ? null : target));
          }}
          disabled={disabled}
        >
          <span className="header-btn-text">
            {target === "instance"
              ? selectedInstance?.instanceName ?? `Select ${target}`
              : target === "database"
              ? selectedDatabase?.databaseName ?? `Select ${target}`
              : refreshInterval}
          </span>
          <span className="dropdown-arrow">▼</span>
        </button>
        {openDropdown === target && createPortal(dropdown, document.body)}
      </div>
    );
  };

  /** === 예시 알림 데이터 === */
  const demoAlert: AlertDetailData = {
    id: "alert-123",
    title: "Autovacuum Backlog — prod-a",
    severity: "CRITICAL",
    occurredAt: "2025-10-12 14:22",
    description:
      "자동 청소가 중단되었습니다. 지연 18.6시간, 미처리 Dead Tuples ≈ 120만.",
    latency: {
      data: [300, 400, 280, 600, 320, 290, 410],
      labels: ["00", "01", "02", "03", "04", "05", "06"],
    },
    summary: { current: 18.6, threshold: 6, duration: "15m" },
    related: [{ type: "table", name: "orders", metric: "Dead 780K", level: "경고" }],
  };

  return (
    <header className="header">
      <div className="header-title-wrapper">
        <div className="breadcrumb">
          {breadcrumb.length > 0
            ? breadcrumb.map((b, i) => (
                <span
                  key={i}
                  className={`breadcrumb-item ${i === breadcrumb.length - 1 ? "active" : ""}`}
                >
                  {b}
                  {i < breadcrumb.length - 1 && (
                    <span className="breadcrumb-separator">›</span>
                  )}
                </span>
              ))
            : "Loading..."}
        </div>
      </div>

      <div className="header-controls">
        {renderDropdown(instances, selectedInstance?.instanceName ?? null, "instance")}
        {renderDropdown(
          databases,
          selectedDatabase?.databaseName ?? null,
          "database",
          !selectedInstance
        )}
        {renderDropdown(["1m", "5m", "10m", "30m"], refreshInterval, "interval")}

        <div className="header-controls">
          {isEditing ? (
            <>
              <button className="header-btn header-btn-save" onClick={handleSaveEdit}>
                Save
              </button>
              <button className="header-btn header-btn-cancel" onClick={handleCancelEdit}>
                Cancel
              </button>
            </>
          ) : (
            <button className="header-btn header-btn-edit" onClick={() => setIsEditing(true)}>
              <span className="header-btn-text">Edit Dashboard</span>
            </button>
          )}
        </div>

        <button className="header-notification-btn" onClick={() => setSelectedAlert(demoAlert)}>
          🔔
        </button>
      </div>

      {selectedAlert && (
        <AlertDetailModal
          open={true}
          data={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onAcknowledge={(id) => {
            console.log("ack:", id);
            setSelectedAlert(null);
          }}
        />
      )}
    </header>
  );
};

export default Header;