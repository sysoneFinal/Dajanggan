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

/** Context 타입 정의 */
interface DashboardContextType {
  isEditing: boolean;
  setIsEditing: Dispatch<SetStateAction<boolean>>;
  layout: DashboardLayout[];
  setLayout: Dispatch<SetStateAction<DashboardLayout[]>>;
  themeId: string;
  setThemeId: Dispatch<SetStateAction<string>>;
  handleStartEdit: () => void;
  handleSaveEdit: () => void;
  handleCancelEdit: () => void;
}

/** Context 생성 */
const DashboardContext = createContext<DashboardContextType | null>(null);

/** Provider */
export const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [layout, setLayout] = useState<DashboardLayout[]>(
    () => defaultThemes.default.layout
  );
  const [themeId, setThemeId] = useState("default");
  const [backupLayout, setBackupLayout] = useState<DashboardLayout[] | null>(null);

  /** 초기화: localStorage 복원 (편집 상태 포함) */
  useEffect(() => {
    const saved = localStorage.getItem("dashboardState");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setLayout(parsed.layout ?? defaultThemes.default.layout);
        setThemeId(parsed.themeId ?? "default");
        setIsEditing(parsed.isEditing ?? false); // 🔥 편집 상태 복원
      } catch {
        console.warn("저장된 대시보드 레이아웃 복원 실패. 초기값으로 재설정합니다.");
      }
    }
  }, []);

  /** 편집 시작 */
  const handleStartEdit = () => {
    setBackupLayout(layout);
    setIsEditing(true);
    localStorage.setItem(
      "dashboardState",
      JSON.stringify({ layout, themeId, isEditing: true })
    );
  };

  /** 저장 */
  const handleSaveEdit = () => {
    localStorage.setItem(
      "dashboardState",
      JSON.stringify({ layout, themeId, isEditing: false })
    );
    setIsEditing(false);
    setBackupLayout(null);
    alert("레이아웃이 저장되었습니다!");
  };

  /** 취소 */
  const handleCancelEdit = () => {
    if (backupLayout) setLayout(backupLayout);
    localStorage.setItem(
      "dashboardState",
      JSON.stringify({ layout: backupLayout ?? layout, themeId, isEditing: false })
    );
    setIsEditing(false);
    setBackupLayout(null);
    alert("변경사항이 취소되었습니다.");
  };

  /** isEditing이 바뀔 때마다 저장 상태 반영 */
  useEffect(() => {
    localStorage.setItem(
      "dashboardState",
      JSON.stringify({ layout, themeId, isEditing })
    );
  }, [isEditing]);

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

/** Context 훅 */
export const useDashboard = () => {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
};
