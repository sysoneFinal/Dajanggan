import React, { useMemo, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import { useInstanceContext } from "../../context/InstanceContext";

import Chart from "../../components/chart/ChartComponent";
import "@/styles/dashboard/databaseSummary.css";
import WidgetCard from "../../components/util/WidgetCard";
import ChartGridLayout from "../../components/layout/ChartGridLayout";
import rightArrowIcon from "../../assets/icon/right-arrow.svg";
import GaugeChart from "../../components/chart/GaugeChart";

import type { DatabaseMetricsAgg } from "../../types/databaseMetricsAgg";
import apiClient from "../../api/apiClient";

interface MetricData {
  activeSessions: number[];
  tps: number[];
  waitEvent: { name: string; value: number }[];
  diskIO: { read: number; hit: number; time: string }[];
  vacuum: {
    lastVacuum: string | null;
    autoVacuumCount: number;
    trend: { time: string; count: number }[];
  };
  slowQueries: { query: string; time: string; calls?: number }[];
  events: { type: string; time: string; severity: string }[];
  eventSummary: { info: number; warning: number; critical: number };
  deadTuples: { time: string; count: number }[];
  lockWait: { time: string; lockWait: number; ioWait: number }[];
  connectionUsage: {
    maxConnections: number;
    usedConnections: number;
  };
  connectionTrend: { time: string; used: number }[];
}

export default function DatabaseDashboard() {
  const { databases, selectedDatabase, setSelectedDatabase } = useInstanceContext();
  const [isPending, startTransition] = useTransition();

  const selectedDBId = selectedDatabase?.databaseId;

  // === metrics API 호출 ===
  const { data: metricsData, isLoading: metricsLoading, isFetching } = useQuery<DatabaseMetricsAgg[]>({
    queryKey: ["metrics", selectedDBId],
    queryFn: async () => {
      const res = await apiClient.get(`/database/summary`,{
        params : {databaseId : selectedDBId}
      });
      console.log('디비 요약 페이지 받아온 값 , ', res.data);
      return res.data;
    },
    enabled: !!selectedDBId,
    refetchInterval: 60000, // 30초 간격으로 자동 갱신
    staleTime: 0,
    cacheTime: 0,
    retry: 1,
  });

  // === metricsData -> 화면용 포맷 로컬 변환 (useMemo로 계산) ===
  const data = useMemo<MetricData | null>(() => {
    if (!metricsData || metricsData.length === 0) return null;

    // API가 내림차순(최신이 0번)인지 확실치 않으므로 안전하게 뒤집어 최신을 first로
    const reversed = [...metricsData].reverse(); // 오래된 -> 최신
    const latest = reversed[reversed.length - 1] ?? reversed[0]; // 안전 guard
    // 실제 최신값은 reversed[reversed.length-1] (원래 metricsData[0]이 최신이면 reversed[last]다)
    // 하지만 위 보정으로 어떤 순서든 어느정도 안전함.

    // 포맷 변환 (필드 안전 검사)
    const activeSessions = reversed.map(m => m.activeSessions ?? 0);
    const tps = reversed.map(m => m.tpsTotal ?? 0);
    const diskIO = reversed.map(m => ({
      read: m.blksRead ?? 0,
      hit: m.blksHit ?? 0,
      time: new Date(m.collectedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }),
    }));
    const deadTuples = reversed.map(m => ({
      time: new Date(m.collectedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }),
      count: m.deadTupleTotal ?? 0,
    }));
    const lockWait = reversed.map(m => ({
      time: new Date(m.collectedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }),
      lockWait: m.lockWaitCount ?? 0,
      ioWait: m.ioWaitCount ?? 0,
    }));
    const connectionTrend = reversed.map(m => ({
      time: new Date(m.collectedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }),
      used: m.usedConnections ?? 0,
    }));


    // slow queries: topSlowQueryN 필드가 없으면 빈 배열
    const slowQueries = [
      latest.topSlowQuery1 ? { query: latest.topSlowQuery1, time: latest.topSlowQuery1Time ? `${latest.topSlowQuery1Time.toFixed(1)}s` : "-", calls: undefined } : null,
      latest.topSlowQuery2 ? { query: latest.topSlowQuery2, time: latest.topSlowQuery2Time ? `${latest.topSlowQuery2Time.toFixed(1)}s` : "-", calls: undefined } : null,
      latest.topSlowQuery3 ? { query: latest.topSlowQuery3, time: latest.topSlowQuery3Time ? `${latest.topSlowQuery3Time.toFixed(1)}s` : "-", calls: undefined } : null,
    ].filter(Boolean) as { query: string; time: string; calls?: number }[];

    // 이벤트 요약
    const eventSummary = {
      info: latest.infoEventCount ?? 0,
      warning: latest.warningEventCount ?? 0,
      critical: latest.criticalEventCount ?? 0,
    };

    const events = latest.recentEventType
      ? [{ type: latest.recentEventType, time: `${latest.recentEventAgeMin ?? 0}m`, severity: latest.recentEventLevel ?? "info" }]
      : [];

    // vacuum 정보가 API에 없다면 안전한 기본값 사용
    const vacuum = {
      lastVacuum: null,
      autoVacuumCount: 0,
      trend: [] as { time: string; count: number }[],
    };

    const connectionUsage = {
      maxConnections: latest.maxConnections ?? 0,
      usedConnections: latest.usedConnections ?? 0,
    };

    return {
      activeSessions,
      tps,
      waitEvent: [
        { name: "I/O", value: latest.ioWaitCount ?? 0 },
        { name: "Lock", value: latest.lockWaitCount ?? 0 },
      ],
      diskIO,
      vacuum,
      slowQueries,
      events,
      eventSummary,
      deadTuples,
      lockWait,
      connectionUsage,
      connectionTrend,
    };
  }, [metricsData]);

  // DB 선택 (Context에 있는 DB 객체을 넘긴다)
  const handleSelectDB = (db: any) => {
    startTransition(() => {
      setSelectedDatabase(db);
    });
  };

  // 로딩/선택 안내
  const loading = !selectedDBId || metricsLoading || !data || isFetching;

  if (!selectedDBId) return <div className="loading">Database를 선택해주세요.</div>;
  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="database-dashboard">
      {isPending && <div className="transition-overlay" />}

      {/* ---------- 1번째 행 ---------- */}
      <ChartGridLayout>
        <WidgetCard title="Database Activity" span={2}>
          <div className="db-sm-container">
            <div className="db-sm-desc">Database를 선택하여 상태를 확인하세요.</div>

            <div className="db-sm-list">
              {databases.map(db => (
                <button
                  key={db.databaseId}
                  className={`db-sm-item ${selectedDBId === db.databaseId ? "active" : ""}`}
                  onClick={() => handleSelectDB(db)}
                >
                  <span className="db-sm-name">{db.databaseName}</span>
                  <img src={rightArrowIcon} alt="select" />
                </button>
              ))}
            </div>
          </div>
        </WidgetCard>

        <WidgetCard span={5} title="Active Sessions Over Time">
          <Chart
            type="line"
            series={[{ name: "활성 세션 수", data: data!.activeSessions }]}
            categories={data!.diskIO.map(d => d.time)}
          />
        </WidgetCard>

        <WidgetCard span={5} title="Transactions Per Second (TPS)">
          <Chart
            type="line"
            series={[{ name: "TPS", data: data!.tps }]}
            categories={data!.diskIO.map(d => d.time)}
          />
        </WidgetCard>
      </ChartGridLayout>

      {/* ---------- 2번째 행 ---------- */}
      <ChartGridLayout>
        <WidgetCard title="Database Connection Usage" span={4}>
          <div className="session-db-connection-content">
            <div className="session-db-connection-chart">
              <GaugeChart
                value={
                  data!.connectionUsage.maxConnections > 0
                    ? Math.round((data!.connectionUsage.usedConnections / data!.connectionUsage.maxConnections) * 100)
                    : 0
                }
                status={
                  data!.connectionUsage.maxConnections > 0 &&
                  Math.round((data!.connectionUsage.usedConnections / data!.connectionUsage.maxConnections) * 100) >= 90
                    ? "critical"
                    : data!.connectionUsage.maxConnections > 0 &&
                      Math.round((data!.connectionUsage.usedConnections / data!.connectionUsage.maxConnections) * 100) >= 70
                    ? "warning"
                    : "info"
                }
                type="semi-circle"
                radius={45}
                strokeWidth={8}
                height={145}
                flattenRatio={0.78}
              />
              <div className="session-db-connection-info">
                <div className="conn-card">
                  <span className="conn-label">Max</span>
                  <span className="conn-value">{data!.connectionUsage.maxConnections}</span>
                </div>
                <div className="conn-card">
                  <span className="conn-label">Current</span>
                  <span className="conn-value">{data!.connectionUsage.usedConnections}</span>
                </div>
              </div>
            </div>

            <Chart
              type="line"
              series={[{ name: "Usage", data: data!.connectionTrend.map(d => d.used) }]}
              categories={data!.connectionTrend.map(d => d.time)}
              height={130}
            />
          </div>
        </WidgetCard>

        <WidgetCard title="Wait Event Distribution" span={4}>
          <Chart
            type="column"
            series={[
              { name: "I/O Wait", data: data!.lockWait.map(d => d.ioWait) },
              { name: "Lock Wait", data: data!.lockWait.map(d => d.lockWait) },
            ]}
            categories={data!.lockWait.map(d => d.time)}
            isStacked
            tooltipFormatter={v => `${v} events`}
            colors={["#60A5FA", "#7B61FF"]}
          />
        </WidgetCard>

        <WidgetCard title="" span={4} className="no-style">
          <div className="sq-card slow-query">
            <h4 className="section-title">slow query Top 3</h4>
            {data!.slowQueries.length > 0 ? (
              <ul className="slow-query-list">
                {data!.slowQueries.map((q, i) => (
                  <li key={i} className="query-item">
                    <div className="query-text">{q.query.length > 35 ? q.query.slice(0, 35) + " ..." : q.query}</div>
                    <div className="query-meta">
                      <span className="divider" />
                      <span className="query-time">{q.time}</span>
                      <span className="divider" />
                      <span className="query-calls">{q.calls ?? "-"}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="no-data-message">
                <p>No slow queries detected</p>
              </div>
            )}
          </div>
        </WidgetCard>
      </ChartGridLayout>

      {/* ---------- 3번째 행 ---------- */}
      <ChartGridLayout>

        <WidgetCard title="Disk I/O Activity" span={4}>
          <Chart
            type="area"
            series={[
              { name: "blks_hit", data: data!.diskIO.map(d => d.hit) },
              { name: "blks_read", data: data!.diskIO.map(d => d.read) },
            ]}
            categories={data!.diskIO.map(d => d.time)}
          />
        </WidgetCard>
        <WidgetCard title="Dead Tuples Trend" span={4}>
          <Chart
            type="area"
            series={[{ name: "Dead Tuples", data: data!.deadTuples.map(d => d.count) }]}
            categories={data!.deadTuples.map(d => d.time)}
            tooltipFormatter={v => `${v} tuples`}
            colors={["#EF4444"]}
          />
        </WidgetCard>

        <WidgetCard title="System Events" span={4}>
          <div className="event-summary-card">
            <div className="event-stats">
              <div className="stat info">
                <div className="label">Info</div>
                <div className="value">{data!.eventSummary.info}</div>
              </div>
              <div className="stat warning">
                <div className="label">Warning</div>
                <div className="value">{data!.eventSummary.warning}</div>
              </div>
              <div className="stat critical">
                <div className="label">Critical</div>
                <div className="value">{data!.eventSummary.critical}</div>
              </div>
            </div>

            <div className="recent-section">
              <h5 className="recent-title">Recent Event</h5>
              <div className="recent-table">
                <div className="table-header">
                  <span>Type</span>
                  <span>Time</span>
                  <span>Severity</span>
                </div>

                {data!.events.slice(0, 3).map((event, index) => (
                  <div key={index} className="table-row">
                    <span>{event.type}</span>
                    <span>{event.time}</span>
                    <span className={`severity ${event.severity.toLowerCase()}`}>
                      {event.severity.charAt(0).toUpperCase() + event.severity.slice(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </WidgetCard>
      </ChartGridLayout>
    </div>
  );
}