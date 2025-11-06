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
  const { selectedInstance, selectedDatabase } = useInstanceContext();

  /** 최초 로드: localStorage → 없으면 defaultThemes */
  const [layout, setLayout] = useState<DashboardLayout[]>(() => {
    try {
      const saved = localStorage.getItem("dashboardState");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.layout)) return parsed.layout;
      }
    } catch {
      console.warn("대시보드 로컬 데이터 복원 실패");
    }

    return (defaultThemes.default.layout ?? []).map((item: any) => ({
      ...item,
      title: item.title ?? "Untitled Widget",
      databases: item.databases ?? [],
    }));
  });

  const [themeId, setThemeId] = useState(() => {
    try {
      const saved = localStorage.getItem("dashboardState");
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.themeId ?? "default";
      }
    } catch {}
    return "default";
  });

  const [isEditing, setIsEditing] = useState(false);
  const [backupLayout, setBackupLayout] = useState<DashboardLayout[] | null>(null);

  /** 편집 시작 */
  const handleStartEdit = () => {
    setBackupLayout(layout);
    setIsEditing(true);
  };

  /**  저장 - localStorage도 여기서만 업데이트 */
  const handleSaveEdit = async () => {
  try {
    if (!selectedInstance) {
      alert("인스턴스를 먼저 선택해주세요.");
      return;
    }

    console.log("저장 직전 전체 데이터:", JSON.stringify(layout, null, 2));

    const widgets = layout.map((item) => {
      const keys = Array.isArray(item.metricType)
        ? item.metricType
        : [item.metricType];

      const metrics = keys
        .map((key: string) => metricDefinition[key])
        .filter((m): m is NonNullable<typeof m> => !!m);

      //  databases 처리 
      let dbs = [];
      
      if (item.databases && Array.isArray(item.databases) && item.databases.length > 0) {
        // 이미 databases가 있는 경우
        dbs = item.databases.map((db) => ({
          id: db.id,
          name: db.name,
        }));
        console.log(`Widget ${item.i}: databases 존재 (${dbs.length}개)`);
      } else if (selectedDatabase) {
        // databases가 없지만 selectedDatabase가 있는 경우
        dbs = [{
          id: selectedDatabase.databaseId,
          name: selectedDatabase.databaseName,
        }];
        console.log(`Widget ${item.i}: selectedDatabase 사용`);
      } else {
        // 둘 다 없는 경우
        console.warn(`Widget ${item.i}: databases 정보 없음!`);
      }

      const widget = {
        id: item.i,
        title: item.title ?? metrics[0]?.title ?? "Untitled Widget",
        databases: dbs,
        metrics: keys,
        chartType: item.type || 'line', // 기본값 설정
        layout: {
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h,
        },
        options: {
          unit: metrics.map((m) => m.unit ?? "").join(" / "),
          category: metrics.map((m) => m.category ?? "").join(", "),
          description: metrics.map((m) => m.description ?? "").join(" & "),
        },
      };

      console.log(`Widget ${item.i} 변환 결과:`, widget);
      return widget;
    });

    const dashboardJson = { widgets };

    console.log("서버 전송 데이터:", {
      instanceId: selectedInstance.instanceId,
      dashboardJson: JSON.stringify(dashboardJson, null, 2),
    });

    await apiClient.post("/overview/save", {
      instanceId: selectedInstance.instanceId,
      userLayout: dashboardJson,
    });

    // 저장 성공 후 localStorage 업데이트
    localStorage.setItem(
      "dashboardState",
      JSON.stringify({ layout, themeId, isEditing: false })
    );

    setIsEditing(false);
    setBackupLayout(null);
    alert("대시보드가 성공적으로 저장되었습니다!");
  } catch (error) {
    console.error("대시보드 저장 실패:", error);
    alert("저장 중 오류가 발생했습니다.");
  }
};

  /** 취소 (백업 복원) */
  const handleCancelEdit = () => {
    if (backupLayout) setLayout(backupLayout);
    setIsEditing(false);
    setBackupLayout(null);
  };

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
