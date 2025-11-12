// components/alert/AlertDetailModal.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom"; 
import Chart from "../../components/chart/ChartComponent"; 
import "/src/styles/alarm/alarm-modal.css";
import apiClient from "../../api/apiClient";
import { useInstanceContext } from "../../context/InstanceContext";

type RelatedItem = {
  type: "table" | "index" | "schema";
  name: string;
  metric: string;
  level: "위험" | "경고" | "주의" | "정상";
};

type AlertSeverity = "CRITICAL" | "WARNING" | "INFO";

export type LatencyData = {
  data: number[];
  labels: string[];
};

export type AlertDetailData = {
  id: number;
  title: string;
  severity: AlertSeverity;
  occurredAt: string;
  description: string;
  latency: LatencyData;
  summary: {
    current: number | string;
    threshold: number | string;
    duration: string;
  };
  related: RelatedItem[];
};

type AlertListItem = {
  id: number;
  title: string;
  severity: AlertSeverity;
  occurredAt: string;
  description: string;
  isRead: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onAcknowledge?: (id: number) => void;
};

export default function AlertDetailModal({ open, onClose, onAcknowledge }: Props) {
  const { selectedInstance, selectedDatabase } = useInstanceContext();
  const dlgRef = useRef<HTMLDivElement>(null);
  const [alerts, setAlerts] = useState<AlertListItem[]>([]);
  const [currentData, setCurrentData] = useState<AlertDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 알림 목록 조회
  useEffect(() => {
    if (!open || !selectedInstance) return;

    const ac = new AbortController();
    
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const params: any = {
          instanceId: selectedInstance.instanceId
        };
        
        if (selectedDatabase) {
          params.databaseId = selectedDatabase.databaseId;
        }

        const res = await apiClient.get("/alarms/feeds", {
          params,
          signal: ac.signal
        });

        const items: AlertListItem[] = res.data.alarms?.map((item: any) => ({
          id: item.alarmFeedId,
          title: item.alarmTitle,
          severity: item.severityLevel as AlertSeverity,
          occurredAt: item.occurredAt,
          description: item.message,
          isRead: item.isRead ?? false
        })) || [];

        setAlerts(items);
        
        // 첫 번째 알림 자동 선택
        if (items.length > 0 && !currentData) {
          handleSelectAlert(items[0].id);
        }
      } catch (e: any) {
        if (e?.name !== "CanceledError") {
          console.error('Failed to fetch alerts:', e);
          setError(e?.response?.data?.message ?? "알림 목록 조회 실패");
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [open, selectedInstance, selectedDatabase]);

  // Body 스크롤 제어
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // ESC 키 핸들링
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
    () => currentData ? [{ name: "Latency (ms)", data: currentData.latency.data }] : [],
    [currentData]
  );

  const handleDeleteAlert = async (id: number) => {
    try {
      await apiClient.delete(`/alarms/feeds/${id}`);
      setAlerts(prev => prev.filter(a => a.id !== id));
      
      // 현재 선택된 알림이 삭제된 경우
      if (currentData?.id === id) {
        setCurrentData(null);
      }
    } catch (e: any) {
      console.error('Failed to delete alert:', e);
      alert("알림 삭제에 실패했습니다.");
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await apiClient.patch(`/alarms/feeds/${id}/read`);
      setAlerts(prev => prev.map(a => 
        a.id === id ? { ...a, isRead: !a.isRead } : a
      ));
    } catch (e: any) {
      console.error('Failed to mark as read:', e);
    }
  };

  const handleSelectAlert = async (id: number) => {
    try {
      const res = await apiClient.get(`/alarms/feeds/${id}`);
      const detail = res.data;

      const alertDetail: AlertDetailData = {
        id: detail.alarmFeedId,
        title: detail.alarmTitle,
        severity: detail.severityLevel as AlertSeverity,
        occurredAt: detail.occurredAt,
        description: detail.message,
        latency: detail.metricHistory || { data: [], labels: [] },
        summary: {
          current: detail.currentValue ?? 0,
          threshold: detail.thresholdValue ?? 0,
          duration: detail.duration ?? "N/A"
        },
        related: detail.relatedObjects?.map((obj: any) => ({
          type: obj.objectType || "table",
          name: obj.objectName,
          metric: obj.metricValue?.toString() || "N/A",
          level: obj.status as any || "정상"
        })) || []
      };

      setCurrentData(alertDetail);
      
      // 읽음 처리
      setAlerts(prev => prev.map(a => 
        a.id === id ? { ...a, isRead: true } : a
      ));
    } catch (e: any) {
      console.error('Failed to fetch alert detail:', e);
      alert("알림 상세 조회에 실패했습니다.");
    }
  };

  const handleAcknowledge = async (id: number) => {
    try {
      await apiClient.patch(`/alarms/feeds/${id}/acknowledge`);
      onAcknowledge?.(id);
      alert("알림이 확인 처리되었습니다.");
    } catch (e: any) {
      console.error('Failed to acknowledge alert:', e);
      alert("알림 확인 처리에 실패했습니다.");
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-detail-title"
      className="am-modal__backdrop"
      onMouseDown={onBackdropClick}
    >
      <div className={`am-modal ${currentData ? 'am-modal--wide' : 'am-modal--narrow'}`} ref={dlgRef}>
        <header className="am-modal__header">
          <div className="am-modal__titlewrap">
            {currentData && (
              <>
                <span className={`am-badge am-badge--${currentData.severity.toLowerCase()}`}>{currentData.severity}</span>
                <h2 id="alert-detail-title" className="am-modal__title">{currentData.title}</h2>
              </>
            )}
            {!currentData && <h2 id="alert-detail-title" className="am-modal__title">알림 상세</h2>}
          </div>
          <button className="am-iconbtn" aria-label="닫기" onClick={onClose}>×</button>
        </header>

        {currentData && (
          <p className="am-modal__subtitle">{currentData.occurredAt} · {currentData.description}</p>
        )}

        <div className="am-modal__layout">
          {/* 좌측: 알림 리스트 */}
          <aside className="am-alerts-list">
            <header className="am-alerts-list__header">
              <h3>알림 내역</h3>
              <span className="am-alerts-count">{alerts.length}</span>
            </header>
            <div className="am-alerts-list__body">
              {loading ? (
                <div className="am-alerts-empty">로딩 중...</div>
              ) : error ? (
                <div className="am-alerts-empty" style={{ color: '#EF4444' }}>{error}</div>
              ) : alerts.length === 0 ? (
                <div className="am-alerts-empty">알림이 없습니다</div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`am-alert-item ${alert.isRead ? 'am-alert-item--read' : ''} ${currentData && alert.id === currentData.id ? 'am-alert-item--active' : ''}`}
                    onClick={() => handleSelectAlert(alert.id)}
                  >
                    <div className="am-alert-item__header">
                      <span className={`am-badge am-badge--${alert.severity.toLowerCase()}`}>
                        {alert.severity}
                      </span>
                      <div className="am-alert-item__actions">
                        <button
                          className="am-alert-action-btn"
                          title={alert.isRead ? "읽지 않음으로 표시" : "읽음으로 표시"}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(alert.id);
                          }}
                        >
                          {alert.isRead ? '○' : '●'}
                        </button>
                        <button
                          className="am-alert-action-btn am-alert-action-btn--delete"
                          title="삭제"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("이 알림을 삭제하시겠습니까?")) {
                              handleDeleteAlert(alert.id);
                            }
                          }}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <h4 className="am-alert-item__title">{alert.title}</h4>
                    <p className="am-alert-item__desc">{alert.description}</p>
                    <time className="am-alert-item__time">{alert.occurredAt}</time>
                  </div>
                ))
              )}
            </div>
          </aside>

          {/* 우측: 기존 내용 */}
          {currentData && (
            <div className="am-modal__content">
              <div className="am-modal__grid">
                {/* 좌측: 차트 */}
                <section className="am-card am-chart">
                  <header className="am-card__header">
                    <h3>latency Trend <span className="am-dim">(24h)</span></h3>
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
                        chart: { redrawOnParentResize: true, redrawOnWindowResize: true },
                        stroke: { width: 2, curve: "smooth" },
                        grid: { borderColor: "#E5E7EB", strokeDashArray: 4 },
                        markers: { size: 3 },
                        yaxis: { min: 0 },
                        tooltip: { x: { show: true } },
                      }}
                      tooltipFormatter={(v) => `${Math.round(v).toLocaleString()}`}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px' }}>
                      메트릭 데이터가 없습니다.
                    </div>
                  )}
                </section>

                {/* 우측: 요약 & 버튼 */}
                <aside className="am-side">
                  <div className="am-summary">
                    <h4>요약</h4>
                    <dl>
                      <div><dt>현재값</dt><dd>{String(currentData.summary.current)}</dd></div>
                      <div><dt>임계치</dt><dd>{String(currentData.summary.threshold)}</dd></div>
                      <div><dt>지속시간</dt><dd>{currentData.summary.duration}</dd></div>
                    </dl>
                    <button
                      className="am-btn am-btn--primary"
                      onClick={() => handleAcknowledge(currentData.id)}
                    >
                      Acknowledge
                    </button>
                  </div>
                </aside>
              </div>

              {/* 관련 객체 테이블 */}
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
                        {currentData.related.map((r, i) => (
                          <tr key={i}>
                            <td>{r.type}</td>
                            <td>{r.name}</td>
                            <td>{r.metric}</td>
                            <td>
                              <span className={`am-tag am-tag--${(
                                r.level === "위험" ? "critical" :
                                r.level === "경고" ? "warn" :
                                r.level === "주의" ? "caution" : "ok"
                              )}`}>{r.level}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    ,document.body
  );
}