import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Chart from "../../components/chart/ChartComponent";
import GaugeChart from "../../components/chart/GaugeChart";
import DeadlockModal from "../../components/session/DeadlockModal";
import type { DeadlockDetail } from "../../components/session/DeadlockModal";
import WidgetCard from "../../components/util/WidgetCard";
import ChartGridLayout from "../../components/layout/ChartGridLayout";
import SummaryCard from "../../components/util/SummaryCard";
import "../../styles/session/session-dashboard.css";
import apiClient from "../../api/apiClient";
import { useInstanceContext } from "../../context/InstanceContext";
import { formatDateTime } from "../../utils/formatDateTime";

/** 시간 포맷 변환 함수 */
const formatTime = (isoString: string) => {
  const date = new Date(isoString);
  const hh = date.getHours().toString().padStart(2, "0");
  const mm = date.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
};

/** API 응답을 데이터 구조로 변환 */
const transformApiData = (apiData: any) => {
  if (!apiData) {
    return {
      summary: [
        { label: "Active Sessions", value: 0, desc: "최근 5분 평균 기준", status: "info" as const },
        { label: "Idle In Transaction", value: 0, desc: "최근 5분 평균 기준", status: "info" as const },
        { label: "Waiting Sessions", value: 0, desc: "최근 5분 평균 기준", status: "info" as const },
        { label: "Avg Transaction Time", value: "0s", desc: "최근 5분 평균 기준", status: "info" as const },
        { label: "DeadLocks", value: 0, desc: "최근 10분 이내 발생", status: "info" as const },
      ],
      charts: {
        sessionTrend: { series: [{ name: "Active", data: [] }, { name: "Idle", data: [] }, { name: "Waiting", data: [] }], categories: [] },
        waitEvent: { series: [], categories: [] },
        txDuration: { data: [] },
        lockWait: { data: [] },
        topUsers: { data: [], categories: [] },
        deadlockTrend: { data: [], categories: [] },
      },
      connection: { usage: 0, max: 0, current: 0 },
      connectionTrend: [],
      recentDeadlocks: [],
    };
  }

  const sessionSummary = apiData.sessionSummary || {};
  const deadlockCounts = apiData.deadlockCounts || {};
  const connectionUsage = apiData.connectionUsage || {}; 
  const topUserSessions = apiData.topUserSessions || {}; 
  const sessionStateTrend = Array.isArray(apiData.sessionStateTrend) ? apiData.sessionStateTrend : [];
  const waitEventTrend = Array.isArray(apiData.waitEventTrend) ? apiData.waitEventTrend : [];
  const avgTxDurationTrend = Array.isArray(apiData.avgTxDurationTrend) ? apiData.avgTxDurationTrend : [];
  const avgLockWaitTrend = Array.isArray(apiData.avgLockWaitTrend) ? apiData.avgLockWaitTrend : [];
  const deadLockTrend = Array.isArray(apiData.deadLockTrend) ? apiData.deadLockTrend : [];
  const connectionUsageTrend = Array.isArray(apiData.connectionUsageTrend) ? apiData.connectionUsageTrend : [];

  const summary = [
    {
      label: "Active Sessions",
      value: sessionSummary.activeSessions || 0,
      desc: "최근 5분 평균 기준",
      status: "info" as const,
    },
    {
      label: "Idle In Transaction",
      value: sessionSummary.idleSessions || 0,
      desc: "최근 5분 평균 기준",
      status: "info" as const,
    },
    {
      label: "Waiting Sessions",
      value: sessionSummary.waitingSessions || 0,
      desc: "최근 5분 평균 기준",
      status: "info" as const,
    },
    {
      label: "Avg Transaction Time",
      value: sessionSummary.avgTransactionTime 
        ? `${(sessionSummary.avgTransactionTime / 1000).toFixed(1)}s`
        : "0s",
      desc: "최근 5분 평균 기준",
      status: (sessionSummary.avgTransactionTime || 0) > 5000 ? "critical" as const : "info" as const,
    },
    {
      label: "DeadLocks",
      value: deadlockCounts.deadlockCount || 0,
      desc: "최근 10분 이내 발생",
      status: (deadlockCounts.deadlockCount || 0) > 0 ? "warning" as const : "info" as const,
    },
  ];

  const sessionTrend = {
    series: [
      {
        name: "Active",
        data: sessionStateTrend.map((item: any) => item.activeSessions || 0),
      },
      {
        name: "Idle",
        data: sessionStateTrend.map((item: any) => item.idleSessions || 0),
      },
      {
        name: "Waiting",
        data: sessionStateTrend.map((item: any) => item.waitingSessions || 0),
      },
    ],
    categories: sessionStateTrend.map((item: any) => 
      item.collectedAt ? formatTime(item.collectedAt) : ""
    ),
  };

  const waitEvent = {
    series: [
      {
        name: "Lock",
        data: waitEventTrend.map((item: any) => item.lockWaitCount || 0),
      },
      {
        name: "I/O",
        data: waitEventTrend.map((item: any) => item.ioWaitCount || 0),
      },
      {
        name: "Client",
        data: waitEventTrend.map((item: any) => item.clientWaitCount || 0),
      },
      {
        name: "LWLock",
        data: waitEventTrend.map((item: any) => item.lwlockWaitCount || 0),
      },
    ],
    categories: waitEventTrend.map((item: any) => 
      item.collectedAt ? formatTime(item.collectedAt) : ""
    ),
  };

  const txDuration = {
    data: avgTxDurationTrend.map((item: any) => 
      (item.avgTxDurationSec || 0) / 1000
    ),
  };

  const lockWait = {
    data: avgLockWaitTrend.map((item: any) => 
      (item.avgLockWaitSec || 0) / 1000
    ),
  };

  const topUsers = {
    data: [
      topUserSessions.topUser1Sessions,
      topUserSessions.topUser2Sessions,
      topUserSessions.topUser3Sessions,
      topUserSessions.topUser4Sessions,
    ].filter((v) => v != null && v > 0),
    categories: [
      topUserSessions.topUser1,
      topUserSessions.topUser2,
      topUserSessions.topUser3,
      topUserSessions.topUser4,
    ].filter((v) => v != null && v !== ""),
  };

  const deadlockTrend = {
    data: deadLockTrend.map((item: any) => item.deadlockCount || 0),
    categories: deadLockTrend.map((item: any) => 
      item.collectedAt ? formatTime(item.collectedAt) : ""
    ),
  };

  const charts = {
    sessionTrend,
    waitEvent,
    txDuration,
    lockWait,
    topUsers,
    deadlockTrend,
  };

  const maxConnections = connectionUsage?.maxConnections || 100;
  const usedConnections = connectionUsage?.usedConnections || 0;
  const usagePercent = maxConnections > 0 
    ? Math.round((usedConnections / maxConnections) * 100) 
    : 0;

  const connection = {
    usage: usagePercent,
    max: maxConnections,
    current: usedConnections,
  };

  const connectionTrend = connectionUsageTrend.map((item: any) => item.usedConnections || 0);

  const recentDeadlocks = apiData.recentDeadlocks || [];

  return {
    summary,
    charts,
    connection,
    connectionTrend,
    recentDeadlocks,
  };
};

export default function SessionDashboard() {
  const { selectedInstance, selectedDatabase } = useInstanceContext();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<DeadlockDetail | null>(null);
  const [isLoadingDeadlock, setIsLoadingDeadlock] = useState(false);
  const maxQueryLen = 40;

  /** API 요청 */
  const fetchSessionDashboard = async() => {
    if (!selectedInstance?.instanceId || !selectedDatabase?.databaseId) {
      console.warn('인스턴스나 데이터베이스 선택이 필요합니다.');
      return null; 
    }
    try {
      const res = await apiClient.get("/session/details", {
        params: {
          instanceId: selectedInstance.instanceId,
          databaseId: selectedDatabase.databaseId
        }
      });
      console.log(res.data);
      return res.data;
    } catch(error) {
      console.error('세션 detail 정보 불러오기 실패 ', error);
      throw error;
    }
  }

  /** 데드락 상세 정보 조회 */
  const handleDeadlockClick = async (deadlock: any) => {
    setIsLoadingDeadlock(true);
      console.log("clicked deadlock:", deadlock);

    try {
      const res = await apiClient.get("/session/details/deadLock", {
        params: {
          databaseId: selectedDatabase?.databaseId,
          pid: deadlock.pid,
        },
      });

      const detail: DeadlockDetail = {
        detectedAt: res.data.collectedAt,
        dbName: res.data.databaseName,
        tableName: res.data.tableName,
        lockType: res.data.lockType,
        durationMs: res.data.duration,
        blocker: {
          pid: res.data.holderPid,
          user: res.data.holderUser,
          query: res.data.holderQuery,
        },
        blocked: {
          pid: res.data.waiterPid,
          user: res.data.waiterUser,
          query: res.data.waiterQuery,
        },
        endedInfo: res.data.waiterPid,
        repeats24h: res.data.recurrenceCount
      };

      setSelected(detail);
      setOpen(true);
    } catch (error) {
      console.error("데드락 상세 정보 조회 실패:", error);
    } finally {
      setIsLoadingDeadlock(false);
    }
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["sessionDashboard", selectedInstance?.instanceId, selectedDatabase?.databaseId],
    queryFn: fetchSessionDashboard,
    enabled: !!selectedInstance?.instanceId && !!selectedDatabase?.databaseId,
    refetchInterval: 60000,
  });

  if (isLoading) {
    return <div className="session-db-dashboard">Loading...</div>;
  }

  if (isError) {  
    return <div className="session-db-dashboard">Error loading data</div>;
  }
  
  const dashboard = transformApiData(data);

  const sessionTrend = dashboard.charts?.sessionTrend || {
    series: [{ name: "Active", data: [] }, { name: "Idle", data: [] }, { name: "Waiting", data: [] }],
    categories: [],
  };

  return (
    <div className="session-db-dashboard">
      {/* --- 상단 요약 카드 --- */}
      <div className="session-db-summary-cards">
         {(dashboard.summary || []).map((card:any, idx : any) => (
          <SummaryCard
            key={idx}
            label={card.label}
            value={card.value}
            desc={card.desc}
            status={card.status}
          />
        ))}
      </div>

      {/* --- 첫 번째 차트 섹션 --- */}
      <ChartGridLayout>
        <WidgetCard title="Session State Trend" span={4}>
          <Chart
            type="line"
            series={Array.isArray(sessionTrend.series) ? sessionTrend.series : []}
            categories={Array.isArray(sessionTrend.categories) ? sessionTrend.categories : []}
          />
        </WidgetCard>

        <WidgetCard title="Wait Event Type Ratio Trend (Last 15 Minutes)" span={4}>
          <Chart
            type="column"
            series={Array.isArray(dashboard.charts?.waitEvent?.series) ? dashboard.charts.waitEvent.series : []}
            categories={Array.isArray(dashboard.charts?.waitEvent?.categories) ? dashboard.charts.waitEvent.categories : []}
            isStacked={true}
          />
        </WidgetCard>

        <WidgetCard title="Database Connection Usage" span={4}>
          <div className="session-db-connection-content">
            <div className="session-db-connection-chart">
                <GaugeChart
                  value={dashboard.connection?.usage || 0}
                  status={
                    (dashboard.connection?.usage || 0) >= 90
                      ? "critical"
                      : (dashboard.connection?.usage || 0) >= 70
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
                <span className="conn-value">{dashboard.connection?.max || 0}</span>
              </div>
              <div className="conn-card">
                <span className="conn-label">Current</span>
                <span className="conn-value">{dashboard.connection?.current || 0}</span>
              </div>
            </div>
            </div>

          <Chart
            type="line"
            series={[{ name: "Usage", data: Array.isArray((dashboard as any).connectionTrend) ? (dashboard as any).connectionTrend : [] }]}
            categories={Array.isArray(dashboard.charts?.sessionTrend?.categories) ? dashboard.charts.sessionTrend.categories : []}
            height={130}
          />
          </div>
        </WidgetCard>
      </ChartGridLayout>

      {/* --- 두 번째 차트 섹션 --- */}
      <ChartGridLayout>
        <WidgetCard title="Avg Transaction Duration Trend (Last 30 Minutes)" span={4}>
          <Chart
            type="line"
            series={[{ name: "Avg Tx Duration", data: Array.isArray(dashboard.charts?.txDuration?.data) ? dashboard.charts.txDuration.data : [] }]}
            categories={Array.isArray(dashboard.charts?.sessionTrend?.categories) ? dashboard.charts.sessionTrend.categories : []}
          />
        </WidgetCard>

        <WidgetCard title="Avg Lock Wait Time (Last 30 Minutes)" span={4}>
          <Chart
            type="line"
            series={[{ name: "Lock Wait", data: Array.isArray(dashboard.charts?.lockWait?.data) ? dashboard.charts.lockWait.data : [] }]}
            categories={Array.isArray(dashboard.charts?.sessionTrend?.categories) ? dashboard.charts.sessionTrend.categories : []}
          />
        </WidgetCard>

        <WidgetCard title="Top Users by Session Count" span={4}>
          <Chart
            type="bar"
            series={[{ name: "Session Count", data: Array.isArray(dashboard.charts?.topUsers?.data) ? dashboard.charts.topUsers.data : [] }]}
            categories={Array.isArray((dashboard.charts?.topUsers as any)?.categories) ? (dashboard.charts.topUsers as any).categories : []}
          />
        </WidgetCard>
      </ChartGridLayout>

      {/* --- Deadlock 섹션 --- */}
      <ChartGridLayout>
        <WidgetCard title="DeadLock Overview (Last 30 Minutes)" span={8}>
          <div className="deadlock-content">
            <div className="deadlock-chart">
              <Chart
                type="line"
                series={[{ name: "Deadlock", data: Array.isArray(dashboard.charts?.deadlockTrend?.data) ? dashboard.charts.deadlockTrend.data : [] }]}
                categories={Array.isArray((dashboard.charts?.deadlockTrend as any)?.categories) 
                  ? (dashboard.charts.deadlockTrend as any).categories 
                  : Array.isArray(dashboard.charts?.sessionTrend?.categories) 
                    ? dashboard.charts.sessionTrend.categories 
                    : []}
                colors={["#FF6363"]}
              />
            </div>

          <div className="recent-deadlocks-mini">
            <h6>Recent DeadLocks</h6>

            {isLoadingDeadlock && (
              <div className="loading-indicator">Loading...</div>
            )}

            {/* 데드락 없을 때 표시 */}
            {!isLoadingDeadlock && (!dashboard.recentDeadlocks || dashboard.recentDeadlocks.length === 0) && (
              <div className="no-data">최근 데드락이 없습니다.</div>
            )}

            <ul>
              {(dashboard.recentDeadlocks || []).map((d, idx) => (
                <li
                  key={idx}
                  onClick={() => handleDeadlockClick(d)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="deadlock-info">
                    <span className="time">{formatDateTime(d.collectedAt)}</span>
                    <div className="tags">
                      <span className="tag user">
                        <i className="ri-user-3-line"></i> {d.username}
                      </span>
                      <span className="tag table">
                        <i className="ri-database-2-line"></i> {d.tableName}
                      </span>
                    </div>
                  </div>

                  <div className="deadlock-body">
                    <span className="msg">
                      {d.query.length > maxQueryLen
                        ? d.query.slice(0, maxQueryLen) + "…"
                        : d.query}
                    </span>
                    <span className="dur">
                      {(d.lockDurationMs / 1000).toFixed(1)}s
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          </div>
        </WidgetCard>
      </ChartGridLayout>

      {/* --- Deadlock 상세 모달 --- */}
      {selected && (
        <DeadlockModal open={open} onClose={() => setOpen(false)} detail={selected} />
      )}
    </div>
  );
}