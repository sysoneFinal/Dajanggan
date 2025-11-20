// components/alarm/AlarmDetailModal.tsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Chart from "../../components/chart/ChartComponent";
import "/src/styles/alarm/alarm-modal.css";
import apiClient from "../../api/apiClient";
import { useInstanceContext } from "../../context/InstanceContext";
import {
  CATEGORY_LABELS,
  METRIC_BY_CATEGORY,
  AGGREGATION_OPTIONS,
  type MetricCategory,
  type Metric,
  type Aggregation,
} from "./AlarmRuleModal";

type RelatedItem = {
  type: "table" | "index" | "schema";
  name: string;
  metric: string;
  level: "위험" | "경고" | "주의" | "정상";
};

type AlarmSeverity = "CRITICAL" | "WARNING" | "INFO";

export type LatencyData = {
  data: number[];
  labels: string[];
};

export type AlarmDetailData = {
  id: number;
  title: string;
  severity: AlarmSeverity;
  occurredAt: string;
  description: string;
  latency: LatencyData;
  summary: {
    current: number | string;
    threshold: number | string;
    duration: string;
  };
  related: RelatedItem[];
  category?: MetricCategory;
  metricType?: Metric;
  aggregationType?: Aggregation;
};

type AlarmListItem = {
  id: number;
  title: string;
  severity: AlarmSeverity;
  occurredAt: string;
  description: string;
  isRead: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function AlarmDetailModal({ open, onClose }: Props) {
  const { selectedInstance, selectedDatabase } = useInstanceContext();
  const dlgRef = useRef<HTMLDivElement>(null);
  const [alarms, setAlarms] = useState<AlarmListItem[]>([]);
  const [currentData, setCurrentData] = useState<AlarmDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstLoadRef = useRef(true);

  /** 상세 선택 */
  const handleSelectAlarm = useCallback(async (id: number) => {
    if (!id) return; // 잘못된 id 클릭 방지

    setLoading(true);
    try {
      const res = await apiClient.get(`/alarms/feeds/${id}`);
      const detail = res.data; // 서버 DetailResponse (id, title, severity, occurredAt, ...)

      // metricType으로부터 카테고리 찾기
      const findCategoryByMetric = (metricType: string): MetricCategory | undefined => {
        for (const [cat, metrics] of Object.entries(METRIC_BY_CATEGORY)) {
          if (metrics.some((m) => m.value === metricType)) {
            return cat as MetricCategory;
          }
        }
        return undefined;
      };

      const alarmDetail: AlarmDetailData = {
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
          type: (obj.type ?? "table") as RelatedItem["type"],
          name: obj.name,
          metric: String(obj.metric ?? "N/A"),
          level: (obj.level ?? "정상") as RelatedItem["level"],
        })),
        category: detail.metricCategory
          ? (detail.metricCategory as MetricCategory)
          : detail.metricType
          ? findCategoryByMetric(detail.metricType)
          : undefined,
        metricType: detail.metricType as Metric | undefined,
        aggregationType: detail.aggregationType as Aggregation | undefined,
      };

      setCurrentData(alarmDetail);

      // 읽음 처리: 서버에 반영하고 클라이언트 상태 업데이트
      const currentAlarm = alarms.find((a) => a.id === id);
      if (currentAlarm && !currentAlarm.isRead) {
        try {
          await apiClient.patch(`/alarms/feeds/${id}/read`);
          setAlarms((prev) => prev.map((a) => (a.id === id ? { ...a, isRead: true } : a)));
        } catch (e: any) {
          console.error("Failed to mark as read:", e);
          // 읽음 처리 실패해도 상세는 표시
        }
      } else {
        // 이미 읽음 상태면 클라이언트 상태만 업데이트
        setAlarms((prev) => prev.map((a) => (a.id === id ? { ...a, isRead: true } : a)));
      }
    } catch (e: any) {
      if (e?.name === "CanceledError" || e?.code === "ERR_CANCELED") {
        // 요청 취소는 정상
      } else {
        console.error("Failed to fetch alarm detail:", e);
      }
    } finally {
      setLoading(false);
    }
  }, [alarms]);

  /** 알림 목록 조회 */
  useEffect(() => {
    if (!open || !selectedInstance) return;
    const ac = new AbortController();
    firstLoadRef.current = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const params: any = { instanceId: selectedInstance.instanceId };
        if (selectedDatabase) params.databaseId = selectedDatabase.databaseId;

        const res = await apiClient.get("/alarms/feeds", { params, signal: ac.signal });

        // 서버 ListResponse.alarms: id, title, severity, occurredAt, description, isRead
        const items: AlarmListItem[] =
          res.data?.alarms?.map((item: any) => ({
            id: item.id,
            title: item.title || "제목 없음",
            severity: (item.severity || "INFO") as AlarmSeverity,
            occurredAt: item.occurredAt || "",
            description: item.description || "",
            isRead: item.isRead ?? false,
          })) ?? [];

        setAlarms(items);
        
        // 첫 번째 자동 선택 제거 - 클릭할 때만 상세 표시
        firstLoadRef.current = false;
      } catch (e: any) {
        if (e?.name === "CanceledError" || e?.code === "ERR_CANCELED") {
          // 무시
        } else {
          console.error("Failed to fetch alarms:", e);
          setError(e?.response?.data?.message ?? "알림 목록 조회 실패");
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [open, selectedInstance, selectedDatabase]);

  /** Body 스크롤 제어 */
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  /** ESC 닫기 */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const onBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const latencySeries = useMemo(
    () => (currentData ? [{ name: "Latency (ms)", data: currentData.latency.data }] : []),
    [currentData]
  );

  const handleDeleteAlarm = async (id: number) => {
    try {
      await apiClient.delete(`/alarms/feeds/${id}`);
      setAlarms((prev) => prev.filter((a) => a.id !== id));
      if (currentData?.id === id) setCurrentData(null);
    } catch (e: any) {
      console.error("Failed to delete alarm:", e);
      const errorMessage = e?.response?.data?.message || e?.message || "알 수 없는 오류";
      alert(`알림 삭제에 실패했습니다: ${errorMessage}`);
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="alarm-detail-title"
      className="am-modal__backdrop"
      onMouseDown={onBackdropClick}
    >
      <div className={`am-modal ${currentData ? "am-modal--wide" : "am-modal--narrow"}`} ref={dlgRef}>
        <header className="am-modal__header">
          <div className="am-modal__titlewrap">
            {currentData ? (
              <>
                <span className={`am-badge am-badge--${currentData.severity.toLowerCase()}`}>
                  {currentData.severity}
                </span>
                <h2 id="alarm-detail-title" className="am-modal__title">
                  {currentData.title}
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

        {currentData && <p className="am-modal__subtitle">{currentData.occurredAt} · {currentData.description}</p>}

        <div className="am-modal__layout">
          {/* 좌: 알림 리스트 */}
          <aside className="am-alarms-list">
            <header className="am-alarms-list__header">
              <h3>알림 내역</h3>
              <span className="am-alarms-count">{alarms.filter((a) => !a.isRead).length}</span>
            </header>

            <div className="am-alarms-list__body">
              {loading && <div className="am-alarms-empty">로딩 중...</div>}
              {!loading && error && <div className="am-alarms-empty" style={{ color: "#EF4444" }}>{error}</div>}
              {!loading && !error && alarms.length === 0 && <div className="am-alarms-empty">알림이 없습니다</div>}
              {!loading && !error && alarms.length > 0 &&
                alarms.map((alarm, i) => (
                  <div
                    key={alarm.id ?? `alarm-fallback-${i}-${alarm.occurredAt}`}
                    className={`am-alarm-item ${alarm.isRead ? "am-alarm-item--read" : ""} ${
                      currentData && alarm.id === currentData.id ? "am-alarm-item--active" : ""
                    }`}
                    onClick={() => alarm.id && handleSelectAlarm(alarm.id)}
                  >
                    <div className="am-alarm-item__header">
                      <span className={`am-badge am-badge--${(alarm.severity || "INFO").toLowerCase()}`}>
                        {alarm.severity || "INFO"}
                      </span>
                      <div className="am-alarm-item__actions">
                        <button
                          className="am-alarm-action-btn am-alarm-action-btn--delete"
                          title="삭제"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("이 알림을 삭제하시겠습니까?")) {
                              handleDeleteAlarm(alarm.id);
                            }
                          }}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <h4 className="am-alarm-item__title">{alarm.title}</h4>
                    <p className="am-alarm-item__desc">{alarm.description}</p>
                    <time className="am-alarm-item__time">{alarm.occurredAt}</time>
                  </div>
                ))}
            </div>
          </aside>

          {/* 우: 상세 */}
          {currentData && (
            <div className="am-modal__content">
              <div className="am-modal__grid">
                {/* 차트 */}
                <section className="am-card am-chart" style={{ maxHeight: "420px", overflow: "hidden" }}>
                  <header className="am-card__header">
                    <h3>
                      latency Trend <span className="am-dim">(24h)</span>
                    </h3>
                  </header>
                  {currentData.latency.data.length > 0 ? (
                    <Chart
                      type="line"
                      series={latencySeries}
                      categories={currentData.latency.labels}
                      height={360}
                      width="100%"
                      showLegend={false}
                      showToolbar={false}
                      colors={["#6366F1"]}
                      customOptions={{
                        chart: { redrawOnParentResize: false, redrawOnWindowResize: false },
                        stroke: { width: 2, curve: "smooth" },
                        grid: { borderColor: "#E5E7EB", strokeDashArray: 4 },
                        markers: { size: 3 },
                        yaxis: { min: 0 },
                        tooltip: { x: { show: true } },
                      }}
                      tooltipFormatter={(v) => `${Math.round(v).toLocaleString()}`}
                    />
                  ) : (
                    <div style={{ textAlign: "center", color: "#9CA3AF", padding: "40px" }}>
                      메트릭 데이터가 없습니다.
                    </div>
                  )}
                </section>

                {/* 요약 & 버튼 */}
                <aside className="am-side">
                  <div className="am-summary">
                    <h4>규칙 정보</h4>
                    <dl>
                      {currentData.category && (
                        <>
                          <dt>카테고리</dt>
                          <dd>{CATEGORY_LABELS[currentData.category]}</dd>
                        </>
                      )}
                      {currentData.metricType && (
                        <>
                          <dt>지표</dt>
                          <dd>
                            {Object.values(METRIC_BY_CATEGORY)
                              .flat()
                              .find((m) => m.value === currentData.metricType)?.label ?? currentData.metricType}
                          </dd>
                        </>
                      )}
                      {currentData.aggregationType && (
                        <>
                          <dt>집계</dt>
                          <dd>
                            {AGGREGATION_OPTIONS.find((opt) => opt.value === currentData.aggregationType)?.label ??
                              currentData.aggregationType}
                          </dd>
                        </>
                      )}
                    </dl>
                    <h4 style={{ marginTop: "24px" }}>요약</h4>
                    <dl>
                      <dt>현재값</dt>
                      <dd>{String(currentData.summary.current)}</dd>
                      <dt>임계치</dt>
                      <dd>{String(currentData.summary.threshold)}</dd>
                      <dt>지속시간</dt>
                      <dd>{currentData.summary.duration}</dd>
                    </dl>
                  </div>
                </aside>
              </div>

              {/* 관련 객체 */}
              {currentData.related.length > 0 && (
                <section className="am-card">
                  <header className="am-card__header">
                    <h3>관련 객체</h3>
                  </header>
                  <div className="am-tablewrap">
                    <table className="am-table">
                      <thead>
                        <tr>
                          <th>유형</th>
                          <th>이름</th>
                          <th>지표값</th>
                          <th>상태</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentData.related.map((r) => {
                          const safeKey = `${r.type}:${r.name}`;
                          return (
                            <tr key={safeKey}>
                              <td>{r.type}</td>
                              <td>{r.name}</td>
                              <td>{r.metric}</td>
                              <td>
                                <span
                                  className={`am-tag am-tag--${
                                    r.level === "위험"
                                      ? "critical"
                                      : r.level === "경고"
                                      ? "warn"
                                      : r.level === "주의"
                                      ? "caution"
                                      : "ok"
                                  }`}
                                >
                                  {r.level}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}