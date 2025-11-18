import {
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

interface DashboardProviderProps {
  children: ReactNode;
}

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
  metricMap: Record<string, any>;
  setMetricMap: Dispatch<SetStateAction<Record<string, any>>>;
  saveDefaultLayout: () => Promise<void>; 
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export const DashboardProvider = ({ children }: DashboardProviderProps) => {
  const { selectedInstance, selectedDatabase } = useInstanceContext();

  /**  metricMap 초기화  */
  const [metricMap, setMetricMap] = useState<Record<string, any>>({});

  const getStorageKey = () =>
    selectedInstance
      ? `dashboardState_${selectedInstance.instanceId}`
      : "dashboardState_default";

  const [layout, setLayout] = useState<DashboardLayout[]>([]);
  const [themeId, setThemeId] = useState("default");
  const [isEditing, setIsEditing] = useState(false);
  const [backupLayout, setBackupLayout] = useState<DashboardLayout[] | null>(null);

  /** metricMap 로드 (인스턴스 변경 시마다) */
  useEffect(() => {
    if (!selectedInstance?.instanceId) return;

    const cacheKey = `metricMapCache_${selectedInstance.instanceId}`;
    const cached = localStorage.getItem(cacheKey);

    // 캐시가 있으면 즉시 로드 (하지만 API도 호출하여 최신 데이터로 업데이트)
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        console.log("💾 캐시에서 metricMap 로드:", parsed);
        // 캐시된 데이터의 available_charts 확인
        const firstKey = Object.keys(parsed)[0];
        if (firstKey) {
          console.log(`📊 캐시된 첫 번째 지표 (${firstKey}):`, parsed[firstKey]);
          console.log(`📈 캐시된 available_charts:`, parsed[firstKey]?.available_charts);
        }
        setMetricMap(parsed);
        // 캐시가 있어도 API를 호출하여 최신 데이터로 업데이트
        console.log("🔄 캐시가 있지만 API를 호출하여 최신 데이터로 업데이트합니다.");
      } catch (err) {
        console.warn("metricMap 캐시 파싱 실패:", err);
      }
    }

    // API 호출 (캐시가 있어도 최신 데이터로 업데이트)
    const fetchMetricMap = async () => {
      try {
        console.log("📡 API 호출 시작 - /metric/list");
        const res = await apiClient.get(`/metric/list`, {
          params: { instanceId: selectedInstance.instanceId },
        });

        console.log("📡 API 응답 전체:", res.data);
        console.log("📡 첫 번째 항목 예시:", res.data[0]);

        const parsed = res.data.reduce((acc: Record<string, any>, item: any) => {
          const key = `${item.category}.${item.name}`;
          
          // availableChart 필드 확인
          console.log(`🔍 ${key} - availableChart:`, item.availableChart);
          console.log(`🔍 ${key} - availableChart 타입:`, typeof item.availableChart);
          console.log(`🔍 ${key} - availableChart 배열 여부:`, Array.isArray(item.availableChart));
          
          const availableCharts = Array.isArray(item.availableChart) 
            ? item.availableChart.map((c: string) => c.toLowerCase())
            : [];
          
          console.log(`✅ ${key} - 변환된 available_charts:`, availableCharts);
          
          acc[key] = {
            title: item.description,
            unit: item.unit,
            source: item.tableName,
            column: item.columnName,
            category: item.category,
            level: item.level,
            available_charts: availableCharts,
            default_chart: item.defaultChartType?.toLowerCase(),
            description: item.description,
          };
          return acc;
        }, {});

        setMetricMap(parsed);
        localStorage.setItem(cacheKey, JSON.stringify(parsed));
        console.log(`✅ metricMap API 로드 및 캐시 저장 완료 (${Object.keys(parsed).length}개)`);
        
        // 저장된 metricMap 확인
        const firstKey = Object.keys(parsed)[0];
        if (firstKey) {
          console.log(`📊 저장된 첫 번째 지표 예시 (${firstKey}):`, parsed[firstKey]);
          console.log(`📈 저장된 available_charts:`, parsed[firstKey]?.available_charts);
        }
      } catch (err) {
        console.error("❌ metricMap 로드 실패:", err);
      }
    };

    // 항상 API 호출 (캐시가 있어도 최신 데이터로 업데이트)
    fetchMetricMap();
  }, [selectedInstance?.instanceId]);

  /**  로컬 대시보드 복원  */
  useEffect(() => {
    const key = getStorageKey();

    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.layout)) {
          setLayout(parsed.layout);
          setThemeId(parsed.themeId ?? "default");
          console.log(`[Dashboard] ${key} 로드 완료`);
          return;
        }
      }
    } catch (err) {
      console.warn("대시보드 복원 실패:", err);
    }

    const defaultLayout = (defaultThemes.default.layout ?? []).map((item: any) => ({
      ...item,
      title: item.title ?? "Untitled Widget",
      databases: item.databases ?? [],
    }));
    setLayout(defaultLayout);
    setThemeId("default");
    console.log(`[Dashboard] ${key} 기본 테마로 초기화`);
  }, [selectedInstance?.instanceId]);


  const handleStartEdit = () => {
    setBackupLayout(layout);
    setIsEditing(true);
  };

/** 공통 저장 로직 */
const saveLayoutInternal = async (layoutToSave: DashboardLayout[]) => {
  if (!selectedInstance) {
    throw new Error("인스턴스가 선택되지 않음");
  }

  const widgets = layoutToSave.map((item) => {
  // 1. metricType에서 메트릭 이름들 추출
  const metricNames = Array.isArray(item.metricType)
    ? item.metricType
    : [item.metricType];
  
  // 예: ["total_sessions", "active_sessions"]

  // 2. metricMap에서 메타정보 찾기
  const metricInfos = metricNames
    .map((name: string) => {
      const fullKey = Object.keys(metricMap).find((k) =>
        k.endsWith(`.${name}`)
      );
      // fullKey 예: "SESSION.total_sessions"
      
      return fullKey ? metricMap[fullKey] : null;
    })
    .filter(Boolean);

  // 3. databases 설정
  let dbs = [];
  if (item.databases?.length) {
    dbs = item.databases.map((db) => ({ id: db.id, name: db.name }));
  } else if (selectedDatabase) {
    dbs = [{
      id: selectedDatabase.databaseId,
      name: selectedDatabase.databaseName,
    }];
  }

  // 4. 위젯 객체 생성
  return {
    id: item.i,
    title: item.title ?? metricInfos[0]?.title ?? "Untitled Widget",
    databases: dbs,
    
    // ✅ metrics: 메트릭 이름만 (카테고리 없이)
    metrics: metricNames,  // ["total_sessions"]
    
    chartType: item.type || "line",
    layout: {
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
    },
    options: {
      unit: metricInfos.map((m) => m.unit ?? "").join(" / "),
      category: metricInfos.map((m) => m.category ?? "").join(", "),
      description: metricInfos.map((m) => m.description ?? "").join(" & "),
    },
  };
});

  const dashboardJson = { widgets };

  await apiClient.post("/overview/save", {
    instanceId: selectedInstance.instanceId,
    userLayout: dashboardJson,
  });

  const key = getStorageKey();
  localStorage.setItem(
    key,
    JSON.stringify({ layout: layoutToSave, themeId, isEditing: false })
  );
};

/** 사용자가 수정 후 저장 */
const handleSaveEdit = async () => {
  try {
    if (!selectedInstance) {
      alert("인스턴스를 먼저 선택해주세요.");
      return;
    }

    await saveLayoutInternal(layout);

    setIsEditing(false);
    setBackupLayout(null);
    alert("대시보드가 저장되었습니다!");
  } catch (error) {
    console.error("대시보드 저장 실패:", error);
    alert("저장 중 오류 발생");
  }
};

/** 디폴트 레이아웃 저장 */
const saveDefaultLayout = async () => {
  try {
    if (!selectedInstance) {
      console.warn("인스턴스가 선택되지 않음");
      return;
    }

    const defaultLayout = (defaultThemes.default.layout ?? []).map((item: any) => ({
      i: item.id,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      title: item.title ?? "Untitled Widget",
      type: item.type || "line",
      metricType: item.metricType,
      databases: [],
    }));

    // 공통 저장 로직 재사용
    await saveLayoutInternal(defaultLayout);
    
    // 상태 업데이트
    setLayout(defaultLayout);

    console.log("디폴트 레이아웃 저장 완료");
  } catch (error) {
    console.error("디폴트 레이아웃 저장 실패:", error);
    throw error;
  }
};

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
        metricMap,
        setMetricMap,
        saveDefaultLayout,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard 에러 발생");
  return ctx;
};