// 작성자: 김민서
// 알람 상세 모달 - 메인 컨테이너
// 역할: 모달 제어, 데이터 페칭, 좌우 레이아웃 구성

import { useEffect, useReducer, useCallback } from "react";
import { createPortal } from "react-dom";
import "/src/styles/alarm/alarm-modal.css";
import apiClient from "../../api/apiClient";
import { useInstanceContext } from "../../context/InstanceContext";
import AlarmList from "./AlarmFeedList";
import AlarmDetail from "./AlarmFeedDetail";
import type { MetricCategory } from "./AlarmRuleModal";
import { METRIC_BY_CATEGORY } from "./AlarmRuleModal";

export type AlarmSeverity = "CRITICAL" | "WARNING" | "INFO";

export type AlarmListItem = {
  id: number;
  title: string;
  severity: AlarmSeverity;
  occurredAt: string;
  description: string;
  isRead: boolean;
};

export type AlarmDetailData = {
  id: number;
  title: string;
  severity: AlarmSeverity;
  occurredAt: string;
  description: string;
  latency: {
    data: number[];
    labels: string[];
  };
  summary: {
    current: number | string;
    threshold: number | string;
    duration: string;
  };
  related: Array<{
    type: "table" | "index" | "schema";
    name: string;
    metric: string;
    level: "위험" | "경고" | "주의" | "정상";
  }>;
  category?: MetricCategory;
  metricType?: string;
  isGenerating?: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

// ============= State Management =============
type State = {
  alarms: AlarmListItem[];
  currentData: AlarmDetailData | null;
  loading: boolean;
  error: string | null;
};

type Action =
  | { type: "SET_ALARMS"; payload: AlarmListItem[] }
  | { type: "SET_CURRENT_DATA"; payload: AlarmDetailData | null }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "UPDATE_ALARM_READ"; payload: number }
  | { type: "DELETE_ALARM"; payload: number };

const initialState: State = {
  alarms: [],
  currentData: null,
  loading: false,
  error: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_ALARMS":
      return { ...state, alarms: action.payload };
    case "SET_CURRENT_DATA":
      return { ...state, currentData: action.payload };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "UPDATE_ALARM_READ":
      return {
        ...state,
        alarms: state.alarms.map((a) =>
          a.id === action.payload ? { ...a, isRead: true } : a
        ),
      };
    case "DELETE_ALARM":
      return {
        ...state,
        alarms: state.alarms.filter((a) => a.id !== action.payload),
        currentData: state.currentData?.id === action.payload ? null : state.currentData,
      };
    default:
      return state;
  }
}

// ============= Utilities =============
const findCategoryByMetric = (metricType: string): MetricCategory | undefined => {
  for (const [cat, metrics] of Object.entries(METRIC_BY_CATEGORY)) {
    if (metrics.some((m) => m.value === metricType)) {
      return cat as MetricCategory;
    }
  }
  return undefined;
};

const parseAlarmDetail = (detail: any): AlarmDetailData => ({
  id: detail.id,
  title: detail.title,
  severity: (detail.severity || "INFO") as AlarmSeverity,
  occurredAt: detail.occurredAt,
  description: detail.description,
  latency: {
    data: (detail.latency?.data ?? []).map((v: any) => Number(v)),
    labels: detail.latency?.labels ?? [],
  },
  summary: {
    current: detail.summary?.current ?? 0,
    threshold: detail.summary?.threshold ?? 0,
    duration: detail.summary?.duration ?? "N/A",
  },
  related: (detail.related ?? []).map((obj: any) => ({
    type: (obj.type ?? "table") as "table" | "index" | "schema",
    name: obj.name,
    metric: String(obj.metric ?? "N/A"),
    level: (obj.level ?? "정상") as "위험" | "경고" | "주의" | "정상",
  })),
  category: detail.metricCategory
    ? (detail.metricCategory as MetricCategory)
    : detail.metricType
    ? findCategoryByMetric(detail.metricType)
    : undefined,
  metricType: detail.metricType,
  isGenerating: detail.isGenerating ?? false,
});

// ============= Main Component =============
export default function AlarmDetailModal({ open, onClose }: Props) {
  const { selectedInstance, selectedDatabase } = useInstanceContext();
  const [state, dispatch] = useReducer(reducer, initialState);

  // 알람 선택
  const handleSelectAlarm = useCallback(
    async (id: number) => {
      if (!id) return;

      dispatch({ type: "SET_LOADING", payload: true });

      try {
        const res = await apiClient.get(`/alarms/feeds/${id}`);
        const detail = parseAlarmDetail(res.data);
        dispatch({ type: "SET_CURRENT_DATA", payload: detail });

        // 읽음 처리
        const currentAlarm = state.alarms.find((a) => a.id === id);
        if (currentAlarm && !currentAlarm.isRead) {
          try {
            await apiClient.patch(`/alarms/feeds/${id}/read`);
            dispatch({ type: "UPDATE_ALARM_READ", payload: id });
          } catch (error) {
            console.error("읽음 처리 실패:", error);
          }
        }
      } catch (error: any) {
        if (error?.name !== "CanceledError" && error?.code !== "ERR_CANCELED") {
          console.error("알람 상세 조회 실패:", error);
        }
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [state.alarms]
  );

  // 알람 삭제
  const handleDeleteAlarm = useCallback(async (id: number) => {
    try {
      await apiClient.delete(`/alarms/feeds/${id}`);
      dispatch({ type: "DELETE_ALARM", payload: id });
    } catch (error: any) {
      console.error("알람 삭제 실패:", error);
      alert(`알림 삭제에 실패했습니다: ${error?.response?.data?.message || "알 수 없는 오류"}`);
    }
  }, []);

  // 상세 데이터 업데이트 (폴링용)
  const updateCurrentData = useCallback((data: AlarmDetailData) => {
    dispatch({ type: "SET_CURRENT_DATA", payload: data });
  }, []);

  // 알람 목록 조회
  useEffect(() => {
    if (!open || !selectedInstance) return;

    const ac = new AbortController();

    (async () => {
      try {
        dispatch({ type: "SET_LOADING", payload: true });
        dispatch({ type: "SET_ERROR", payload: null });

        const params: any = { instanceId: selectedInstance.instanceId };
        if (selectedDatabase) params.databaseId = selectedDatabase.databaseId;

        const res = await apiClient.get("/alarms/feeds", { params, signal: ac.signal });

        const items: AlarmListItem[] =
          res.data?.alarms?.map((item: any) => ({
            id: item.id,
            title: item.title || "제목 없음",
            severity: (item.severity || "INFO") as AlarmSeverity,
            occurredAt: item.occurredAt || "",
            description: item.description || "",
            isRead: item.isRead ?? false,
          })) ?? [];

        dispatch({ type: "SET_ALARMS", payload: items });
      } catch (error: any) {
        if (error?.name !== "CanceledError" && error?.code !== "ERR_CANCELED") {
          console.error("알람 목록 조회 실패:", error);
          dispatch({ type: "SET_ERROR", payload: error?.response?.data?.message ?? "조회 실패" });
        }
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    })();

    return () => ac.abort();
  }, [open, selectedInstance, selectedDatabase]);

  // Body 스크롤 제어
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ESC 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const onBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="alarm-detail-title"
      className="am-modal__backdrop"
      onMouseDown={onBackdropClick}
    >
      <div className={`am-modal ${state.currentData ? "am-modal--wide" : "am-modal--narrow"}`}>
        {/* 헤더 */}
        <header className="am-modal__header">
          <div className="am-modal__titlewrap">
            {state.currentData ? (
              <>
                <span className={`am-badge am-badge--${state.currentData.severity.toLowerCase()}`}>
                  {state.currentData.severity}
                </span>
                <h2 id="alarm-detail-title" className="am-modal__title">
                  {state.currentData.title}
                </h2>
              </>
            ) : (
              <h2 id="alarm-detail-title" className="am-modal__title">
                알림 상세
              </h2>
            )}
          </div>
          <button className="am-iconbtn" aria-label="닫기" onClick={onClose}>
            ×
          </button>
        </header>

        {/* 서브타이틀 */}
        {state.currentData && (
          <p className="am-modal__subtitle">
            {state.currentData.occurredAt} · {state.currentData.description}
            {state.currentData.isGenerating && (
              <span style={{ marginLeft: "12px", color: "#6366F1", fontSize: "0.875rem" }}>
                관련 객체 생성 중...
              </span>
            )}
          </p>
        )}

        <div className="am-modal__layout">
          {/* 좌측: 알림 목록 */}
          <AlarmList
            alarms={state.alarms}
            currentAlarmId={state.currentData?.id}
            loading={state.loading}
            error={state.error}
            onSelectAlarm={handleSelectAlarm}
            onDeleteAlarm={handleDeleteAlarm}
          />

          {/* 우측: 상세 정보 */}
          {state.currentData && (
            <AlarmDetail
              data={state.currentData}
              onUpdateData={updateCurrentData}
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}