import React, { useEffect, useState } from "react";
import { Responsive, WidthProvider, type Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "../../styles/dashboard/Layout.css";
import { useQuery, useMutation } from "@tanstack/react-query";
import apiClient from "../../api/apiClient";
import WidgetRenderer from "../../components/dashboard/WidgetRenderer";
import defaultThemes from "../../theme/Theme.json";
import type { DashboardLayout } from "../../types/dashboard";
import DashboardEditorPanel from "../../components/dashboard/DashboardEditor";

interface OverviewPageProps {
  isEditing: boolean;
}

const ResponsiveGridLayout = WidthProvider(Responsive);

export default function OverviewPage({ isEditing }: OverviewPageProps) {
  /** 현재 테마와 레이아웃 상태 */
  const [themeId, setThemeId] = useState<string>("default");
  const [layout, setLayout] = useState<DashboardLayout[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  /**  인스턴스 ID 조회 (로컬 테스트용) */
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

  /** 저장 mutation */
  const { mutate: saveLayout } = useMutation({
    mutationFn: (newLayout: DashboardLayout[]) =>
      apiClient.put(`/overview/${instance?.id}`, { layout: newLayout }),
    onSuccess: () => {
      alert("대시보드 레이아웃이 저장되었습니다!");
      localStorage.removeItem("tempDashboardLayout");
    },
  });

  /** 대시보드 초기 로드 / fallback / 복원 */
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

  /** 테마 선택 */
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

  /** 편집 중일 때만 임시 저장 */
  const handleLayoutChange = (currentLayout: Layout[]) => {
    if (isEditing) {
      localStorage.setItem(
        "tempDashboardLayout",
        JSON.stringify({ themeId, layout: currentLayout })
      );
      setLayout(currentLayout as DashboardLayout[]);
    }
  };

  /** 드롭 이벤트 처리 */
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

      /** custom 모드: 새 카드 추가 */
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
        setLayout((prev) => [...prev, newItem]);
      }

      /** 테마 모드: 기존 카드 교체 */
      else if (themeId.startsWith("card_") && targetItem) {
        const targetId = targetItem.getAttribute("data-grid-id");
        if (!targetId) return;

        setLayout((prev) =>
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

  /** 위젯 삭제 핸들러 */
const handleDeleteWidget = (id: string) => {
  setLayout((prev) => {
    const updated = prev.filter((item) => item.i !== id);

    // 완전히 비워졌다면 저장된 레이아웃도 제거
    if (updated.length === 0) {
      localStorage.removeItem("tempDashboardLayout");
    } else {
      localStorage.setItem(
        "tempDashboardLayout",
        JSON.stringify({ themeId, layout: updated })
      );
    }

    // 새로운 배열로 반환 (불변성 유지)
    return [...updated];
  });
};


  /** 저장 */
  const handleSave = () => {
    if (!instance?.id) {
      alert("인스턴스가 선택되지 않았습니다.");
      return;
    }
    saveLayout(layout);
  };

  /** 렌더 */
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
                <div
                  key={item.i}
                  className="grid-item"
                  data-grid-id={item.i}
                >
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
