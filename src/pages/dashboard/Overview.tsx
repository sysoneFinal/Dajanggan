import React, { useEffect, useState } from "react";
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

const ResponsiveGridLayout = WidthProvider(Responsive);

export default function OverviewPage() {
  /**  전역 DashboardContext 상태 */
  const { isEditing, layout, setLayout, themeId, setThemeId } = useDashboard();

  const [isDragOver, setIsDragOver] = useState(false);

  /** 인스턴스 정보 (테스트용) */
  const { data: instance } = useQuery({
    queryKey: ["activeInstance"],
    queryFn: async () => ({ id: 1, name: "local_test" }),
    enabled: false,
  });

  /** 대시보드 조회 */
  const { data: dashboard, isError, isSuccess } = useQuery({
    queryKey: ["dashboard", instance?.id],
    queryFn: async () => {
      if (!instance?.id) return null;
      const res = await apiClient.get(`/overview/${instance.id}`);
      return res.data;
    },
    enabled: !!instance?.id,
    retry: false,
  });

  /** 초기 로드 및 복원 */
  useEffect(() => {
    const saved = localStorage.getItem("tempDashboardLayout");
    if (saved) {
      const parsed = JSON.parse(saved);
      setLayout(parsed.layout ?? defaultThemes.default.layout);
      setThemeId(parsed.themeId ?? "default");
      return;
    }

    if (isSuccess && dashboard?.layout?.length > 0) {
      setLayout(dashboard.layout);
    } else {
      setLayout(defaultThemes.default.layout);
    }
  }, [dashboard, isSuccess, isError]);

  /** 테마 변경 */
  const handleThemeChange = (id: string) => {
    let selectedLayout: DashboardLayout[] = [];
    const theme = defaultThemes.themes.find((t) => t.id === id);

    if (id === "custom") {
      selectedLayout = [];
    } else if (id === "card_7_layout" || id === "card_9_layout") {
      selectedLayout = (theme?.layout as DashboardLayout[]) ?? [];
    } else {
      selectedLayout = defaultThemes.default.layout ?? [];
    }

    setThemeId(id);
    setLayout(selectedLayout);

    localStorage.setItem(
      "tempDashboardLayout",
      JSON.stringify({ themeId: id, layout: selectedLayout })
    );
  };

  /** 편집 중 레이아웃 변경 시 임시 저장 */
  const handleLayoutChange = (currentLayout: Layout[]) => {
    if (isEditing) {
      localStorage.setItem(
        "tempDashboardLayout",
        JSON.stringify({ themeId, layout: currentLayout })
      );
      setLayout(currentLayout as DashboardLayout[]);
    }
  };

  /** 위젯 삭제 */
  const handleDeleteWidget = (id: string) => {
    setLayout((prev: DashboardLayout[]) => {
      const updated = prev.filter((item) => item.i !== id);
      localStorage.setItem(
        "tempDashboardLayout",
        JSON.stringify({ themeId, layout: updated })
      );
      return [...updated];
    });
  };

  /** 드롭 이벤트 (새 위젯 추가 / 교체) */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const data = e.dataTransfer.getData("application/json");
    if (!data) return;

    try {
      const { metricKey, chartType } = JSON.parse(data);
      if (!metricKey || !chartType) return;

      const dropTarget = document.elementFromPoint(e.clientX, e.clientY);
      const targetItem = dropTarget?.closest(".grid-item") as HTMLElement | null;

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
        };

        setLayout((prev: DashboardLayout[]) => [...prev, newItem]);
      } else if (themeId.startsWith("card_") && targetItem) {
        const targetId = targetItem.getAttribute("data-grid-id");
        if (!targetId) return;

        setLayout((prev: DashboardLayout[]) =>
          prev.map((item) =>
            item.i === targetId
              ? { ...item, metricType: metricKey, type: chartType }
              : item
          )
        );
      }
    } catch (err) {
      console.error("Drop parse error:", err);
    }
  };

  /** 렌더링 */
  return (
    <div className="dashboard-container">
      <div className={`dashboard-grid-area ${isEditing ? "with-editor" : "full-width"}`}>
        <div
          className={`dashboard-wrapper ${isEditing ? "editing" : ""} ${
            isDragOver ? "drag-over" : ""
          }`}
          onDragOver={(e) => {
            if (!isEditing) return;
            e.preventDefault();
            e.stopPropagation();
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
              {layout.map((item: DashboardLayout) => (
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

      {/* 오른쪽 패널 */}
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
