import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import "../../styles/layout/header.css";
import { createPortal } from "react-dom";
import apiClient from "../../api/apiClient";
import { findBreadcrumbPath } from "./FindBreadcrumb";
import { SIDEBAR_MENU } from "../layout/SidebarMenu";
import { useDashboard } from "../../context/DashboardContext"; // ✅ 추가
import AlertDetailModal, { type AlertDetailData } from "../../pages/alarm/AlarmDetailModal";

interface Instance {
  id: number;
  name: string;
}

interface Database {
  id: number;
  name: string;
}

interface HeaderProps {
  breadcrumb: string[];
}

const Header = ({ breadcrumb }: HeaderProps) => {
  const location = useLocation();

  /** DashboardContext에서 전역 상태 가져오기 */
  const {
    isEditing,
    setIsEditing,
    handleSaveEdit,
    handleCancelEdit,
  } = useDashboard();

  /** 인스턴스/DB 선택 관련 상태 */
  const [instances, setInstances] = useState<Instance[]>([]);
  const [databases, setDatabases] = useState<Database[]>([]);
  const [selectedInstance, setSelectedInstance] = useState("Select Instance");
  const [selectedDatabase, setSelectedDatabase] = useState("Select Database");
  const [refreshInterval, setRefreshInterval] = useState("5m");

  /** 드롭다운/알림 관련 상태 */
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<AlertDetailData | null>(null);

  const notifRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  });

  /** 드롭다운 외부 클릭 시 닫기 */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /** 드롭다운 토글 */
  const toggleDropdown = (target: string, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();

    setDropdownPos({
      top: rect.bottom + window.scrollY + 8,
      left: rect.left + window.scrollX,
      width: rect.width,
    });

    setOpenDropdown((prev) => (prev === target ? null : target));
  };

  /** 드롭다운 선택 */
  const handleSelect = (target: string, value: string) => {
    if (target === "instance") {
      setSelectedInstance(value);
      setSelectedDatabase("Select Database");
    }
    if (target === "database") setSelectedDatabase(value);
    if (target === "interval") setRefreshInterval(value);
    setOpenDropdown(null);
  };

  /** 커스텀 드롭다운 렌더링 */
  const renderDropdown = (
    list: string[] | Instance[] | Database[],
    selectedValue: string,
    target: string,
    disabled?: boolean
  ) => {
    const dropdown = (
      <div
        className="dropdown-menu"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          top: dropdownPos.top,
          left: dropdownPos.left,
          minWidth: dropdownPos.width,
          zIndex: 9999,
        }}
      >
        {(list as any[]).map((item) => {
          const name = typeof item === "string" ? item : item.name;
          const id = typeof item === "string" ? name : item.id;
          return (
            <button
              key={id}
              className={`dropdown-item ${name === selectedValue ? "active" : ""}`}
              onClick={() => handleSelect(target, name)}
            >
              {name}
            </button>
          );
        })}
      </div>
    );

    return (
      <div className="dropdown-wrapper" ref={dropdownRef}>
        <button
          className={`header-btn ${disabled ? "disabled" : ""}`}
          onClick={(e) => !disabled && toggleDropdown(target, e)}
          disabled={disabled}
        >
          <span className="header-btn-text">{selectedValue}</span>
          <span className="dropdown-arrow">▼</span>
        </button>
        {openDropdown === target && createPortal(dropdown, document.body)}
      </div>
    );
  };

  /* ---------------- 데모 알림 데이터 ---------------- */
  const demoAlert: AlertDetailData = {
    id: "alert-123",
    title: "Autovacuum Backlog — prod-a",
    severity: "CRITICAL",
    occurredAt: "2025-10-12 14:22",
    description: "자동 청소가 중단되었습니다. 지연 18.6시간, 미처리 Dead Tuples ≈ 120만.",
    latency: {
      data: [300, 400, 280, 600, 320, 290, 410, 370, 350, 450],
      labels: ["00:00", "01:00", "02:00", "03:00", "04:00", "05:00", "06:00", "07:00", "08:00", "09:00"],
    },
    summary: { current: 18.6, threshold: 6, duration: "15m" },
    related: [
      { type: "table", name: "orders", metric: "Dead 780K", level: "경고" },
      { type: "table", name: "sessions", metric: "Dead 1.2M", level: "위험" },
      { type: "table", name: "logs", metric: "Dead 450K", level: "주의" },
    ],
  };

  return (
    <header className="header">
      {/* 브레드크럼 */}
      <div className="header-title-wrapper">
        <div className="breadcrumb">
          {breadcrumb.length > 0 ? (
            breadcrumb.map((item, idx) => (
              <span
                key={idx}
                className={`breadcrumb-item ${idx === breadcrumb.length - 1 ? "active" : ""}`}
              >
                {item}
                {idx < breadcrumb.length - 1 && <span className="breadcrumb-separator">›</span>}
              </span>
            ))
          ) : (
            <span className="breadcrumb-item">Loading...</span>
          )}
        </div>
      </div>

      {/* 컨트롤 영역 */}
      <div className="header-controls">
        {renderDropdown(instances, selectedInstance, "instance")}
        {renderDropdown(databases, selectedDatabase, "database", selectedInstance === "Select Instance")}
        {renderDropdown(["1m", "5m", "10m", "30m"], refreshInterval, "interval")}

        {/* === Edit / Save / Cancel === */}
        <div className="header-controls">
          {isEditing ? (
            <>
              <button className="header-btn header-btn-save" onClick={handleSaveEdit}>
                <span className="header-btn-text">Save</span>
              </button>

              <button className="header-btn header-btn-cancel" onClick={handleCancelEdit}>
                <span className="header-btn-text">Cancel</span>
              </button>
            </>
          ) : (
            <button
              className="header-btn header-btn-edit"
              onClick={() => setIsEditing(true)}
            >
              <svg className="header-edit-icon" viewBox="0 0 24 24" fill="currentColor">
                <g transform="translate(3, 3) scale(0.75)">
                  <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" />
                </g>
              </svg>
              <span className="header-btn-text">Edit Dashboard</span>
            </button>
          )}
        </div>

        {/* 알림 */}
        <div className="notification-wrapper" ref={notifRef}>
          <button
            className="header-notification-btn"
            onClick={() => setSelectedAlert(demoAlert)}
          >
            <span className="header-notification-icon">🔔</span>
          </button>
        </div>
      </div>

      {/* 알림 상세 모달 */}
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
