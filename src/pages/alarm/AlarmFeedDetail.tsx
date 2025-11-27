// 작성자: 김민서
// 우측 알람 상세 정보 컴포넌트 (차트 + 요약 + 관련 객체)

import { useEffect, useRef, useMemo } from "react";
import Chart from "../../components/chart/ChartComponent";
import apiClient from "../../api/apiClient";
import { CATEGORY_LABELS, METRIC_BY_CATEGORY } from "./AlarmRuleModal";
import type { AlarmDetailData } from "./AlarmFeedModal";

type Props = {
  data: AlarmDetailData;
  onUpdateData: (data: AlarmDetailData) => void;
};

const MAX_POLLING_COUNT = 6;
const POLLING_INTERVAL_MS = 1000;

// 폴링 로직
function useAlarmPolling(
  alarmId: number,
  isGenerating: boolean,
  onUpdate: (data: AlarmDetailData) => void
) {
  const intervalRef = useRef<number | null>(null);
  const countRef = useRef(0);

  useEffect(() => {
    // 생성 중이 아니면 폴링 안 함
    if (!isGenerating) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      countRef.current = 0;
      return;
    }

    // 폴링 시작
    countRef.current = 0;
    intervalRef.current = window.setInterval(async () => {
      countRef.current += 1;

      // 타임아웃
      if (countRef.current > MAX_POLLING_COUNT) {
        console.warn(`⏰ 폴링 타임아웃: alarmFeedId=${alarmId}`);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        countRef.current = 0;
        return;
      }

      try {
        const res = await apiClient.get(`/alarms/feeds/${alarmId}`);
        const detail = res.data;

        const updatedDetail: AlarmDetailData = {
          id: detail.id,
          title: detail.title,
          severity: detail.severity || "INFO",
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
            type: obj.type ?? "table",
            name: obj.name,
            metric: String(obj.metric ?? "N/A"),
            level: obj.level ?? "정상",
          })),
          category: detail.metricCategory,
          metricType: detail.metricType,
          isGenerating: detail.isGenerating ?? false,
        };

        onUpdate(updatedDetail);

        // 생성 완료 시 폴링 중지
        if (!updatedDetail.isGenerating || updatedDetail.related.length > 0) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          countRef.current = 0;
        }
      } catch (error: any) {
        if (error?.name !== "CanceledError" && error?.code !== "ERR_CANCELED") {
          console.error("폴링 실패:", error);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          countRef.current = 0;
        }
      }
    }, POLLING_INTERVAL_MS);

    // 클린업
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      countRef.current = 0;
    };
  }, [alarmId, isGenerating, onUpdate]);
}

export default function AlarmDetail({ data, onUpdateData }: Props) {
  // 폴링 훅 사용
  useAlarmPolling(data.id, data.isGenerating ?? false, onUpdateData);

  // 차트 데이터
  const latencySeries = useMemo(
    () => [{ name: "Latency (ms)", data: data.latency.data }],
    [data.latency.data]
  );

  return (
    <div className="am-modal__content">
      <div className="am-modal__grid">
        {/* 차트 */}
        <section className="am-card am-chart" style={{ maxHeight: "420px", overflow: "hidden" }}>
          <header className="am-card__header">
            <h3>
              Latency Trend <span className="am-dim">(24h)</span>
            </h3>
          </header>
          {data.latency.data.length > 0 ? (
            <Chart
              type="line"
              series={latencySeries}
              categories={data.latency.labels}
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

        {/* 요약 정보 */}
        <aside className="am-side">
          <div className="am-summary">
            <h4>규칙 정보</h4>
            <dl>
              {data.category && (
                <>
                  <dt>카테고리</dt>
                  <dd>{CATEGORY_LABELS[data.category]}</dd>
                </>
              )}
              {data.metricType && (
                <>
                  <dt>지표</dt>
                  <dd>
                    {Object.values(METRIC_BY_CATEGORY)
                      .flat()
                      .find((m) => m.value === data.metricType)?.label ?? data.metricType}
                  </dd>
                </>
              )}
            </dl>
            <h4 style={{ marginTop: "24px" }}>요약</h4>
            <dl>
              <dt>현재값</dt>
              <dd>{String(data.summary.current)}</dd>
              <dt>임계치</dt>
              <dd>{String(data.summary.threshold)}</dd>
              <dt>지속시간</dt>
              <dd>{data.summary.duration}</dd>
            </dl>
          </div>
        </aside>
      </div>

      {/* 관련 객체 테이블 */}
      {data.related.length > 0 && (
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
                {data.related.map((r, idx) => (
                  <tr key={`${r.type}:${r.name}:${idx}`}>
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
                            ? "info"
                            : "ok"
                        }`}
                      >
                        {r.level}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 관련 객체 생성 중 */}
      {data.isGenerating && data.related.length === 0 && (
        <section className="am-card">
          <header className="am-card__header">
            <h3>관련 객체</h3>
          </header>
          <div style={{ textAlign: "center", color: "#6366F1", padding: "40px" }}>
            관련 객체를 생성하는 중입니다...
          </div>
        </section>
      )}

      {/* 관련 객체 없음 */}
      {!data.isGenerating && data.related.length === 0 && (
        <section className="am-card">
          <header className="am-card__header">
            <h3>관련 객체</h3>
          </header>
          <div style={{ textAlign: "center", color: "#9CA3AF", padding: "40px" }}>
            관련 객체가 없습니다.
          </div>
        </section>
      )}
    </div>
  );
}