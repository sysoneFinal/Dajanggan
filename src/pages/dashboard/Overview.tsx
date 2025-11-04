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

  /**  인스턴스 ID 조회 */
  const { data: instance } = useQuery({
    queryKey: ["activeInstance"],
    queryFn: async () => {
      const res = await apiClient.get("/instances/active");
      return res.data; // { id, name }
    },
    retry: false,
  });

  /** 해당 인스턴스의 대시보드 조회 */
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

  /** 테마 선택 핸들러 */
  const handleThemeChange = (id: string) => {
    let selectedLayout: DashboardLayout[] = [];

    if (id === "custom") {
      selectedLayout = []; // 빈 상태
    } else if (id === "card_7_layout" || id === "card_9_layout") {
      const theme = defaultThemes.themes.find((t) => t.id === id);
      selectedLayout = theme?.layout ?? [];
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

  /** 저장 버튼 처리 */
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
      <div className={`dashboard-wrapper ${isEditing ? "editing" : ""}`}>
          {themeId === "custom" && layout.length === 0 ? (
            <div className="empty-dashboard">
              <p className="empty-message">
                ✨ 지표를 추가해주세요.<br />
                <span>왼쪽 위젯 패널에서 위젯을 선택해 추가할 수 있습니다.</span>
              </p>
            </div>
          ) : (
            <ResponsiveGridLayout
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
                <div key={item.i} className="grid-item">
                  <WidgetRenderer metric={item.metricType} />
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
            onSave={handleSave}
          />
        </div>
      )}
    </div>
  );
}
