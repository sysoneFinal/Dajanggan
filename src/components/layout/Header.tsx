/** 작성자 : 서샘이  */

import { useEffect, useState, useRef } from "react";
import {  useMatch } from "react-router-dom";
import "../../styles/layout/header.css";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { useDashboard } from "../../context/DashboardContext";
import { useInstanceContext } from "../../context/InstanceContext";
import AlarmDetailModal from "../../pages/alarm/AlarmFeedModal";
import type { Instance } from "../../types/instance";
import type { Database } from "../../types/database";
import apiClient from "../../api/apiClient";
import { intervalToMs } from "../../utils/time";


interface HeaderProps {
  breadcrumb: string[];
}

const Header = ({ breadcrumb }: HeaderProps) => {
  const isOverviewPage = useMatch("/overview");

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
  const [openAlarmModal, setOpenAlarmModal] = useState(false);
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

  /** === 안읽은 알람 개수 조회 (React Query로 자동 새로고침) === */
  const { data: unreadCount = 0 } = useQuery<number>({
    queryKey: ["unread-alarm-count", selectedInstance?.instanceId, selectedDatabase?.databaseId],
    queryFn: async () => {
      if (!selectedInstance) return 0;

      try {
        const params: any = { instanceId: selectedInstance.instanceId };
        if (selectedDatabase) params.databaseId = selectedDatabase.databaseId;

        const res = await apiClient.get("/alarms/feeds", { params });
        const alarms = res.data?.alarms || [];
        const unread = alarms.filter((alarm: any) => !alarm.isRead).length;
        return unread;
      } catch (e: any) {
        console.error("Failed to fetch unread alarm count:", e);
        return 0;
      }
    },
    enabled: !!selectedInstance,
    refetchInterval: intervalToMs(refreshInterval), // ** 중요 ** 새로고침 주기 적용
  });

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
        {/*  overview 페이지에서만 보이게끔   */}
        {isOverviewPage && (
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
        )}


        <div className="notification-wrapper">
          <button className="header-notification-btn" onClick={() => setOpenAlarmModal(true)}>
            🔔
          </button>
          {unreadCount > 0 && (
            <span className="notification-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
          )}
        </div>
      </div>

      <AlarmDetailModal
        open={openAlarmModal}
        onClose={() => setOpenAlarmModal(false)}
      />
    </header>
  );
};

export default Header;