import React, { useState } from "react";
import { Responsive, WidthProvider, type Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "../../styles/dashboard/Layout.css";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../api/apiClient";
import WidgetRenderer from "../../components/dashboard/WidgetRenderer";
import DashboardEditorPanel from "../../components/dashboard/DashboardEditor";
import defaultThemes from "../../theme/Theme.json";
import type { DashboardLayout } from "../../types/dashboard";
import { useDashboard } from "../../context/DashboardContext";
import { useInstanceContext } from "../../context/InstanceContext";

const ResponsiveGridLayout = WidthProvider(Responsive);

export default function OverviewPage() {
  /** === 전역 상태 === */
  const { isEditing, layout, setLayout, themeId, setThemeId } = useDashboard();
  const { selectedInstance } = useInstanceContext();
  const [isDragOver, setIsDragOver] = useState(false);

  /** === 대시보드 데이터 조회 === */
  // const { data: dashboard } = useQuery({
  //   queryKey: ["dashboard", selectedInstance?.instanceId],
  //   queryFn: async () => {
  //     if (!selectedInstance?.instanceId) return null;
  //     const res = await apiClient.get(`/overview/${selectedInstance.instanceId}`);
  //     return res.data;
  //   },
  //   enabled: !!selectedInstance?.instanceId,
  //   retry: false,
  // });

  /** === 테마 변경 === */
  const handleThemeChange = (id: string) => {
    const theme = defaultThemes.themes.find((t) => t.id === id);
    let selectedLayout: DashboardLayout[] = [];

    if (id === "custom") selectedLayout = [];
    else if (id === "card_7_layout" || id === "card_9_layout")
      selectedLayout = (theme?.layout as DashboardLayout[]) ?? [];
    else selectedLayout = defaultThemes.default.layout ?? [];

    setThemeId(id);
    setLayout(selectedLayout);
  };

  /** === 편집 중 레이아웃 변경 === */
  const handleLayoutChange = (currentLayout: Layout[]) => {
    if (!isEditing) return;
    setLayout(currentLayout as DashboardLayout[]);
  };

  /** === 위젯 삭제 === */
  const handleDeleteWidget = (id: string) => {
    setLayout((prev: DashboardLayout[]) => prev.filter((item) => item.i !== id));
  };


  /** === 드래그 앤 드롭 === */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const data = e.dataTransfer.getData("application/json");
    console.log('전달받은 데이터 ', data);
    if (!data) return;

    try {
      const { metricKey, chartType, databases } = JSON.parse(data);
      if (!metricKey || !chartType) {
        console.warn("잘못된 드롭 데이터:", data);
        return;
      }

      /** === 커스텀 테마: 새 위젯 추가 === */
      if (themeId === "custom") {
        const newItem: DashboardLayout = {
          i: `${metricKey}_${Date.now()}`,
          x: 0,
          y: Infinity,
          w: 8,
          h: 6,
          title: metricKey,
          type: chartType,
          metricType: metricKey,
          databases: databases?.map((db: any) => ({
            id: db.id,
            name: db.name,
          })) ?? [],
          instanceId: selectedInstance?.instanceId ?? null,
        };


        console.log("커스텀 드롭 위젯:", newItem);
        setLayout((prev) => [...prev, newItem]);
      }
      /** === 테마 기반 카드 교체 === */
      else if (themeId.startsWith("card_")) {
        const dropTarget = document.elementFromPoint(e.clientX, e.clientY);
        const targetItem = dropTarget?.closest(".grid-item") as HTMLElement | null;
        const targetId = targetItem?.getAttribute("data-grid-id");
        if (!targetId) return;

        setLayout((prev) =>
          prev.map((item) =>
            item.i === targetId
              ? {
                  ...item,
                  metricType: metricKey,
                  type: chartType,
                  databases: databases ?? [],
                }
              : item
          )
        );
      }
    } catch (err) {
      console.error("위젯 드롭 실패:", err);
    }
  };

  /** === 렌더링 === */
  return (
    <div className="dashboard-container">
      <div
        className={`dashboard-grid-area ${isEditing ? "with-editor" : "full-width"}`}
      >
        <div
          className={`dashboard-wrapper ${isEditing ? "editing" : ""} ${
            isDragOver ? "drag-over" : ""
          }`}
          onDragOver={(e) => {
            if (!isEditing) return;
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={isEditing ? handleDrop : undefined}
        >
          {themeId === "custom" && layout.length === 0 ? (
            <div className="empty-dashboard">
              <p className="empty-message">
                ✨ 지표를 추가해주세요.
                <br />
                <span>왼쪽 위젯 패널에서 위젯을 선택해 추가할 수 있습니다.</span>
              </p>
            </div>
          ) : (
            <ResponsiveGridLayout
              key={layout.length}
              className="layout-inner"
              layouts={{ lg: layout }}
              breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
              cols={{ lg: 24, md: 16, sm: 12, xs: 8, xxs: 4 }}
              rowHeight={40}
              margin={[16, 16]}
              compactType={null}
              isDraggable={isEditing}
              isResizable={isEditing}
              preventCollision={!isEditing}
              onLayoutChange={handleLayoutChange}
            >
              {layout.map((item) => (
                <div key={item.i} className="grid-item" data-grid-id={item.i}>
                  <WidgetRenderer
                    metric={item.metricType}
                    isEditable={themeId === "custom"}
                    onDelete={() => handleDeleteWidget(item.i)}
                  />
                </div>
              ))}
            </ResponsiveGridLayout>
          )}
        </div>
      </div>

      {/* === 오른쪽 편집 패널 === */}
      {isEditing && (
        <div className="dashboard-editor-panel">
          <DashboardEditorPanel
            currentTheme={themeId}
            onThemeChange={handleThemeChange}
          />
        </div>
      )}
    </div>
  );
}
