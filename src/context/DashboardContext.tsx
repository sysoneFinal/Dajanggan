import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type Dispatch,
  type SetStateAction,
  type ReactNode,
} from "react";
import type { DashboardLayout } from "../types/dashboard";
import defaultThemes from "../theme/Theme.json";
import apiClient from "../api/apiClient";
import { useInstanceContext } from "./InstanceContext";
import { metricDefinition } from "../utils/flattenMetrics";

interface DashboardContextType {
  isEditing: boolean;
  setIsEditing: Dispatch<SetStateAction<boolean>>;
  layout: DashboardLayout[];
  setLayout: Dispatch<SetStateAction<DashboardLayout[]>>;
  themeId: string;
  setThemeId: Dispatch<SetStateAction<string>>;
  handleStartEdit: () => void;
  handleSaveEdit: () => Promise<void>;
  handleCancelEdit: () => void;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [layout, setLayout] = useState<DashboardLayout[]>(() =>
    defaultThemes.default.layout.map((item: any) => ({
      i: item.i,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      type: item.type,
      title: item.title ?? "Untitled Widget",
      metricType: item.metricType,
      databases: [],
    }))
  );
  const [themeId, setThemeId] = useState("default");
  const [backupLayout, setBackupLayout] = useState<DashboardLayout[] | null>(null);
  const { selectedInstance, selectedDatabase } = useInstanceContext();

  /** === 초기화 === */
  useEffect(() => {
    const saved = localStorage.getItem("dashboardState");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setLayout(parsed.layout ?? defaultThemes.default.layout);
        setThemeId(parsed.themeId ?? "default");
        setIsEditing(parsed.isEditing ?? false);
      } catch {
        console.warn("저장된 대시보드 복원 실패. 초기화합니다.");
      }
    }
  }, []);

  /** === 편집 시작 === */
  const handleStartEdit = () => {
    setBackupLayout(layout);
    setIsEditing(true);
    localStorage.setItem("dashboardState", JSON.stringify({ layout, themeId, isEditing: true }));
  };

  /** === 저장 (다중 DB 반영) === */
  const handleSaveEdit = async () => {
    try {
      if (!selectedInstance) {
        alert("인스턴스를 먼저 선택해주세요.");
        return;
      }
      console.log('context: 저장 직전 상태, ', layout);
      const dashboardJson = {
        widgets: layout.map((item) => {
          const keys = Array.isArray(item.metricType) ? item.metricType : [item.metricType];
          const metrics = keys
            .map((key: string) => metricDefinition[key])
            .filter((m): m is NonNullable<typeof m> => !!m);

            // 복수 데이터베이스 
            const dbs = item.databases && item.databases.length > 0
            ? item.databases.map((db) => ({
              id : db.id,
              name : db.name,
            }))
            : selectedDatabase
            ? [{id : selectedDatabase.databaseId, name: selectedDatabase.databaseName}]
            : [];

            console.log('위젯별 db ' , item.i, dbs);

          return {
            id: item.i,
            title: item.title ?? metrics[0]?.title ?? "Untitled Widget",
            databases: dbs,
            metrics: keys,
            chartType: item.type,
            layout: { x: item.x, y: item.y, w: item.w, h: item.h },
            options: {
              unit: metrics.map((m) => m.unit ?? "").join(" / "),
              category: metrics.map((m) => m.category ?? "").join(", "),
              description: metrics.map((m) => m.description ?? "").join(" & "),
            },
          };
        }),
      };

      console.log("저장 전 확인:", {
        instanceId: selectedInstance.instanceId,
        dashboardJson,
      });

      await apiClient.post("/overview/save", {
        instanceId: selectedInstance.instanceId,
        userLayout: JSON.stringify(dashboardJson),
      });

      localStorage.setItem("dashboardState", JSON.stringify({ layout, isEditing: false }));
      setIsEditing(false);
      setBackupLayout(null);
      alert("대시보드가 성공적으로 저장되었습니다!");
    } catch (error) {
      console.error("대시보드 저장 실패:", error);
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  /** === 취소 === */
  const handleCancelEdit = () => {
    if (backupLayout) setLayout(backupLayout);
    localStorage.setItem(
      "dashboardState",
      JSON.stringify({
        layout: backupLayout ?? layout,
        themeId,
        isEditing: false,
      })
    );
    setIsEditing(false);
    setBackupLayout(null);
    alert("변경사항이 취소되었습니다.");
  };

  /** === 상태 동기화 === */
  useEffect(() => {
    localStorage.setItem("dashboardState", JSON.stringify({ layout, themeId, isEditing }));
  }, [isEditing, layout, themeId]);

  return (
    <DashboardContext.Provider
      value={{
        isEditing,
        setIsEditing,
        layout,
        setLayout,
        themeId,
        setThemeId,
        handleStartEdit,
        handleSaveEdit,
        handleCancelEdit,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
};
