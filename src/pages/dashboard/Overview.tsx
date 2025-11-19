import React, { useState, useEffect } from "react";
import { Responsive, WidthProvider, type Layout } from "react-grid-layout";
import { useQuery } from "@tanstack/react-query";
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
import { intervalToMs } from "../../utils/time";
import { useLoader } from "../../context/LoaderContext";



const ResponsiveGridLayout = WidthProvider(Responsive);

const normalizeLayout = (layout: Layout[]) =>
  layout.map((item) => ({
    ...item,
    x: Math.max(0, item.x ?? 0),
    y: Math.max(0, item.y ?? 0),
  }));

export default function OverviewPage() {
  const { isEditing, setIsEditing, layout, setLayout, themeId, setThemeId } = useDashboard();
  const { selectedInstance, refreshInterval } = useInstanceContext();
  const [isDragOver, setIsDragOver] = useState(false);
  const { showLoader, hideLoader } = useLoader();
  

  // 새로고침 주기를 밀리초로 변환
  const refreshMs = intervalToMs(refreshInterval);

  /** === 대시보드 조회 (React Query로 자동 새로고침) === */
  
  const { data: dashboardData, isLoading, error: queryError, dataUpdatedAt } = useQuery({
    queryKey: ['overview-dashboard', selectedInstance?.instanceId],
    queryFn: async () => {
      console.log('API 호출 시작:', new Date().toLocaleTimeString());
      
      if (!selectedInstance?.instanceId) return null;
      
      const res = await apiClient.get("/overview", {
        params: { instanceId: selectedInstance.instanceId },
      });
      
      console.log('API 호출 완료:', new Date().toLocaleTimeString(), res.data);
      return res.data;
    },
    refetchInterval: refreshMs, // 헤더에서 선택한 주기로 자동 갱신
    enabled: !!selectedInstance?.instanceId,
  });

  /** === 로딩 상태 관리 === */
  useEffect(() => {
    if (isLoading) {
      showLoader('대시보드 불러오는 중...');
    } else {
      hideLoader();
    }
  }, [isLoading, showLoader, hideLoader]);

  // 데이터가 업데이트될 때마다 로그
  useEffect(() => {
    if (dataUpdatedAt) {
      console.log('🔁 데이터 갱신됨:', new Date(dataUpdatedAt).toLocaleTimeString());
    }
  }, [dataUpdatedAt]);

  /** === 대시보드 데이터가 로드되면 레이아웃 업데이트 === */
  useEffect(() => {
    if (!dashboardData?.widgets) return;

    console.log('대시보드 데이터 조회 ----->>>', dashboardData);
    
    const normalizedLayout = dashboardData.widgets.map((item: any) => {
      // databases는 item.databases 또는 item.options?.databases에 있을 수 있음
      const databases = item.databases ?? item.options?.databases ?? [];
      
      console.log(`📊 위젯 ${item.id} - databases:`, databases);
      
      return {
        i: item.id,
        x: item.layout.x ?? 0,
        y: item.layout.y ?? 0,
        w: item.layout.w ?? 8,
        h: item.layout.h ?? 6,
        title: item.title,
        type: item.chartType,
        metricType: Array.isArray(item.metrics)
          ? item.metrics[0]
          : item.metrics,
        databases: databases,
        data: item.data ?? [],
        error: item.error ?? null,
      };
    });

    setLayout(normalizedLayout);
  }, [dashboardData, setLayout]);



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
                    data={item.data}
                    error={item.error}
                    databases={item.databases}
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