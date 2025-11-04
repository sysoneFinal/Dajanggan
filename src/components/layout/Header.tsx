import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import "../../styles/layout/header.css";
import { createPortal } from "react-dom";
import apiClient from "../../api/apiClient";
import { findBreadcrumbPath } from "./FindBreadcrumb";
import { SIDEBAR_MENU } from "../layout/SidebarMenu"; 

import AlertDetailModal, { type  AlertDetailData } from "../../pages/alarm/AlarmDetailModal";

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
  breadcrumb: string[];
  onToggleEdit: () => void;
}

const Header = ({ isEditing, onToggleEdit, breadcrumb }: HeaderProps) => {
  const location = useLocation();
  const [instances, setInstances] = useState<Instance[]>([]);
  const [databases, setDatabases] = useState<Database[]>([]);
  const [selectedInstance, setSelectedInstance] = useState("Select Instance");
  const [selectedDatabase, setSelectedDatabase] = useState("Select Database");
  const [refreshInterval, setRefreshInterval] = useState("5m");

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const [selectedAlert, setSelectedAlert] = useState<AlertDetailData | null>(null);
  // 바깥 클릭 판단용 ref (컨트롤 전체와 알림 각각)
  const controlsRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number }>({
  top: 0,
  left: 0,
  width: 0,
});


// useEffect(() => {
//   const path = location.pathname;
//   const foundPath = findBreadcrumbPath(SIDEBAR_MENU, path);
//   if (path === "/alarm") {
//     setBreadcrumb(["Alarm Settings"]);
//     return;
//   }
//   if (path === "/instance-management") {
//     setBreadcrumb(["Instance Management"]);
//     return;
//   }
//   // 일반 경로 자동 탐색
//   if (foundPath) {
//     setBreadcrumb(foundPath);
//   }
// }, [location.pathname]);



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

const toggleDropdown = (target: string, e: React.MouseEvent<HTMLButtonElement>) => {
  const rect = e.currentTarget.getBoundingClientRect();

  setDropdownPos({
    top: rect.bottom + window.scrollY + 8, 
    left: rect.left + window.scrollX,     
    width: rect.width,
  });

  setOpenDropdown((prev) => (prev === target ? null : target));
};


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
      data: [300,400,280,600,320,290,410,370,350,450,320,310,330,420,380,360,340,390,410,430,370,350,320,310],
      labels: [
        "00:00","01:00","02:00","03:00","04:00","05:00","06:00","07:00",
        "08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00",
        "16:00","17:00","18:00","19:00","20:00","21:00","22:00","23:00"
      ],
    },
    summary: { current: 18.6, threshold: 6, duration: "15m" },
    related: [
      { type: "table", name: "orders",   metric: "Dead 780K", level: "경고" },
      { type: "table", name: "sessions", metric: "Dead 1.2M", level: "위험" },
      { type: "table", name: "logs",     metric: "Dead 450K", level: "주의" },
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
        <div className="header-controls">
  {/* === Edit / Save / Cancel === */}
  {isEditing ? (
    <>
      <button
        className="header-btn header-btn-save"
        onClick={() => {
          const saved = localStorage.getItem("tempDashboardLayout");
          if (saved) {
            // 저장 요청을 Overview의 save 함수로 넘길 수도 있음 (지금은 단순 안내)
            alert("레이아웃이 저장되었습니다!");
            localStorage.removeItem("tempDashboardLayout");
          }
          onToggleEdit(); // 저장 후 편집모드 종료
        }}
      >
       <span className="header-btn-text">Save</span>
      </button>

      <button
        className="header-btn header-btn-cancel"
        onClick={() => {
          localStorage.removeItem("tempDashboardLayout");
          onToggleEdit(); // 취소 → 편집모드 종료
        }}
      >
       <span className="header-btn-text">Cancel</span>
      </button>
    </>
  ) : (
    <button
      className="header-btn header-btn-edit"
      onClick={onToggleEdit}
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

          {isNotificationOpen && (
            <div className="notification-popup">
              <h4>Notifications</h4>
              <ul>
                {/* 실제로는 alerts.map(...) 으로 대체 */}
                <li
                  className="alert-item alert-critical"
                  onClick={() => {
                    setSelectedAlert(demoAlert);      // ✅ 모달 데이터 주입
                    setIsNotificationOpen(false);      // 팝업 닫기
                  }}
                >
                  
                </li>

                {/* 빈 상태 예시 */}
                {/* <li className="no-alert">No new alerts</li> */}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* ✅ 알림 상세 모달 */}
      {selectedAlert && (
        <AlertDetailModal
          open={true}
          data={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onAcknowledge={(id) => {
            // TODO: ack API 호출
            console.log("ack:", id);
            setSelectedAlert(null);
          }}
        />
      )}
    </header>
  );
};

export default Header;
