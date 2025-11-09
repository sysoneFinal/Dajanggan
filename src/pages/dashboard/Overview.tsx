import React, { useState, useEffect } from "react";
import { Responsive, WidthProvider, type Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "../../styles/dashboard/Layout.css";
import apiClient from "../../api/apiClient";
import WidgetRenderer from "../../components/dashboard/WidgetRenderer";
import DashboardEditorPanel from "../../components/dashboard/DashboardEditor";
import defaultThemes from "../../theme/Theme.json";
import type { DashboardLayout } from "../../types/dashboard";
import { useDashboard } from "../../context/DashboardContext";
import { useInstanceContext } from "../../context/InstanceContext";

const ResponsiveGridLayout = WidthProvider(Responsive);

const normalizeLayout = (layout: Layout[]) =>
  layout.map((item) => ({
    ...item,
    x: Math.max(0, item.x ?? 0),
    y: Math.max(0, item.y ?? 0),
  }));

export default function OverviewPage() {
  const { isEditing, setIsEditing, layout, setLayout, themeId, setThemeId } = useDashboard();
  const { selectedInstance } = useInstanceContext();
  const [isDragOver, setIsDragOver] = useState(false);

  /** === 대시보드 조회 === */
  useEffect(() => {
    if (!selectedInstance?.instanceId) return;

    const fetchDashboard = async () => {
      try {
        const res = await apiClient.get("/overview", {
          params: { instanceId: selectedInstance.instanceId },
        });

        const dashboard = res.data;

        console.log('대시보드 레이아읏 데이터 조회 ----->>>', dashboard);
        
        const normalizedLayout = dashboard.userLayout.widgets.map((item: any) => ({
          i: item.id,
          x: item.layout.x ?? 0,
          y: item.layout.y ?? 0,
          w: item.layout.w ?? 8,
          h: item.layout.h ?? 6,
          title: item.title,
          type: item.chartType,
          metricType: Array.isArray(item.metrics)
          ? item.metrics[0]
          : item.metrics, // 하위호환용 안전 처리
          databases: item.databases ?? [],
        }));

        setLayout(normalizedLayout);
      } catch (err) {
        console.error("대시보드 조회 실패:", err);
      }
    };

    fetchDashboard();
  }, [selectedInstance?.instanceId]);

  /** === 테마 변경 === */
  const handleThemeChange = (id: string) => {
    const theme = defaultThemes.themes.find((t) => t.id === id);
    let selectedLayout: DashboardLayout[] = layout;

    if (id === "custom") {
      setIsEditing(true);
    } else if (id === "card_7_layout" || id === "card_9_layout") {
      selectedLayout = (theme?.layout as DashboardLayout[]) ?? [];
      setIsEditing(false);
    } else {
      selectedLayout = defaultThemes.default.layout ?? [];
      setIsEditing(false);
    }

    setThemeId(id);
    setLayout(selectedLayout);
  };

  /** === 레이아웃 변경 === */
  const handleLayoutChange = (currentLayout: Layout[]) => {
    if (!isEditing) return;
    setLayout((prev) =>
      prev.map((item) => {
        const updated = currentLayout.find((cl) => cl.i === item.i);
        return updated
          ? { ...item, x: updated.x, y: updated.y, w: updated.w, h: updated.h }
          : item;
      })
    );
  };

  /** === 위젯 삭제 === */
  const handleDeleteWidget = (id: string) => {
    setLayout((prev: DashboardLayout[]) => prev.filter((item) => item.i !== id));
  };

  /** === 드롭 === */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const data = e.dataTransfer.getData("application/json");
    if (!data) return;

    try {
      const dropData = JSON.parse(data);
      const { metricKey, chartType, databases } = dropData;

      if (!metricKey || !chartType) return;

      if (themeId === "custom") {
        const dbList =
          Array.isArray(databases) && databases.length > 0
            ? databases.map((db: any) => ({
                id: db.id || db.databaseId,
                name: db.name || db.databaseName,
              }))
            : [];

        const newItem: DashboardLayout = {
          i: `${metricKey}_${Date.now()}`,
          x: 0,
          y: 0,
          w: 8,
          h: 6,
          title: metricKey,
          type: chartType,
          metricType: metricKey,
          databases: dbList,
          instanceId: selectedInstance?.instanceId ?? null,
        };

        setLayout((prev) => normalizeLayout([...prev, newItem]) as DashboardLayout[]);
      }
    } catch (err) {
      console.error("위젯 드롭 실패:", err);
    }
  };

  return (
    <div className="dashboard-container">
      <div className={`dashboard-grid-area ${isEditing ? "with-editor" : "full-width"}`}>
        <div
          className={`dashboard-wrapper ${isEditing ? "editing" : ""} ${isDragOver ? "drag-over" : ""}`}
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
              layouts={{ lg: normalizeLayout(layout) }}
              breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
              cols={{ lg: 24, md: 16, sm: 12, xs: 8, xxs: 4 }}
              rowHeight={40}
              margin={[16, 16]}
              compactType="vertical"
              preventCollision={false}              
              isDraggable={isEditing}
              isResizable={isEditing}
              onLayoutChange={(l) => handleLayoutChange(normalizeLayout(l))}
              draggableHandle=".widget-title"
            >
              {layout.map((item) => (
                <div key={item.i} className="grid-item">
                  <WidgetRenderer
                    metric={item.metricType}
                    isEditable={isEditing && themeId === "custom"}
                    onDelete={() => handleDeleteWidget(item.i)}
                  />
                </div>
              ))}
            </ResponsiveGridLayout>
          )}
        </div>
      </div>

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
