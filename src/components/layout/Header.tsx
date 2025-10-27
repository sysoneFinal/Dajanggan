import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import "../../styles/layout/header.css";
import apiClient from "../../api/apiClient";
import { findBreadcrumbPath } from "./FindBreadcrumb";
import { SIDEBAR_MENU } from "../layout/SidebarMenu"; 

interface Instance {
  id: number;
  name: string;
}

interface Database {
  id: number;
  name: string;
}

interface HeaderProps {
  isEditing: boolean;
  onToggleEdit: () => void;
}

const Header = ({ isEditing, onToggleEdit }: HeaderProps) => {
  const location = useLocation();
  const [breadcrumb, setBreadcrumb] = useState<string[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [databases, setDatabases] = useState<Database[]>([]);
  const [selectedInstance, setSelectedInstance] = useState("Select Instance");
  const [selectedDatabase, setSelectedDatabase] = useState("Select Database");
  const [refreshInterval, setRefreshInterval] = useState("5m");

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 현재 페이지 경로에 따라 breadcrumb 자동 갱신
  useEffect(() => {
    const path = location.pathname;
    const foundPath = findBreadcrumbPath(SIDEBAR_MENU, path);
    if (foundPath) setBreadcrumb(foundPath);
  }, [location.pathname]);

  // 인스턴스 목록 불러오기
  // useEffect(() => {
  //   const fetchInstances = async () => {
  //     try {
  //       const res = await apiClient.get("/api/instances");
  //       setInstances(res.data);
  //     } catch (err) {
  //       console.error("인스턴스 불러오기에 실패했습니다.", err);
  //     }
  //   };
  //   fetchInstances();
  // }, []);

  // 인스턴스 선택 시 DB 목록 불러오기
  // useEffect(() => {
  //   if (selectedInstance === "Select Instance") return;
  //   const fetchDatabases = async () => {
  //     try {
  //       const res = await apiClient.get(`/api/instances/${selectedInstance}/databases`);
  //       setDatabases(res.data);
  //     } catch (err) {
  //       console.error("데이터베이스 불러오기에 실패했습니다.", err);
  //     }
  //   };
  //   fetchDatabases();
  // }, [selectedInstance]);

  //  드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = (target: string) =>
    setOpenDropdown((prev) => (prev === target ? null : target));

  const handleSelect = (target: string, value: string) => {
    if (target === "instance") {
      setSelectedInstance(value);
      setSelectedDatabase("Select Database"); // 인스턴스 바뀌면 DB 초기화
    }
    if (target === "database") setSelectedDatabase(value);
    if (target === "interval") setRefreshInterval(value);
    setOpenDropdown(null);
  };

  const renderDropdown = (
    list: string[] | Instance[] | Database[],
    selectedValue: string,
    target: string,
    disabled?: boolean
  ) => (
    <div className="dropdown-wrapper" ref={dropdownRef}>
      <button
        className={`header-btn ${disabled ? "disabled" : ""}`}
        onClick={() => !disabled && toggleDropdown(target)}
        disabled={disabled}
      >
        <span className="header-btn-text">{selectedValue}</span>
        <span className="dropdown-arrow">▼</span>
      </button>
      {openDropdown === target && (
        <div className="dropdown-menu">
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
      )}
    </div>
  );

  return (
    <header className="header">
      {/* 브레드크럼 */}
      <div className="header-title-wrapper">
        <div className="breadcrumb">
          {breadcrumb.length > 0 ? (
            breadcrumb.map((item, idx) => (
              <span
                key={idx}
                className={`breadcrumb-item ${
                  idx === breadcrumb.length - 1 ? "active" : ""
                }`}
              >
                {item}
                {idx < breadcrumb.length - 1 && (
                  <span className="breadcrumb-separator">›</span>
                )}
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
        {renderDropdown(
          databases,
          selectedDatabase,
          "database",
          selectedInstance === "Select Instance"
        )}
        {renderDropdown(["1m", "5m", "10m", "30m"], refreshInterval, "interval")}

        {/* Edit Dashboard */}
        <button
          className={`header-btn header-btn-edit ${isEditing ? "active" : ""}`}
          onClick={onToggleEdit}
        >
          <svg className="header-edit-icon" viewBox="0 0 24 24" fill="currentColor">
            <g transform="translate(3, 3) scale(0.75)">
              <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" />
            </g>
          </svg>
          <span className="header-btn-text">
            {isEditing ? "Save" : "Edit Dashboard"}
          </span>
        </button>

        {/* 알림 */}
        <div className="notification-wrapper" ref={dropdownRef}>
          <button
            className="header-notification-btn"
            onClick={() => setIsNotificationOpen((prev) => !prev)}
          >
            <span className="header-notification-icon">🔔</span>
          </button>
          {isNotificationOpen && (
            <div className="notification-popup">
              <h4>Notifications</h4>
              <ul>
                <li>No new alerts</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
