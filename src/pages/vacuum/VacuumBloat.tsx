import React, { useEffect, useMemo, useRef, useState } from "react";
import Chart from "../../components/chart/ChartComponent";
import WidgetCard from "../../components/util/WidgetCard";
import SummaryCard from "../../components/util/SummaryCard";
import "/src/styles/vacuum/VacuumPage.css";
import apiClient from "../../api/apiClient";
import { useInstanceContext } from "../../context/InstanceContext";

// ====== 서버 DTO와 1:1 매칭 ======
type XminHorizonMonitor = {
  data: number[][];     
  labels: string[];   
};
type BloatTrend = { data: number[]; labels: string[] };
type BloatDistribution = { data: number[]; labels: string[] };
type Kpi = { tableBloat: string; criticalTable: number; bloatGrowth: string };
type DashboardResponse = {
  xminHorizonMonitor: XminHorizonMonitor;
  bloatTrend: BloatTrend;
  bloatDistribution: BloatDistribution;
  kpi: Kpi;
};

// ====== 상수/유틸 ======
const WARN_H = 4;
const ALERT_H = 6;

// ====== 페이지 ======
const VacuumBloatPage: React.FC = () => {
  const { selectedInstance, selectedDatabase } = useInstanceContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resp, setResp] = useState<DashboardResponse | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);

  const toggleDetail = () => {
    setExpanded((p) => {
      const n = !p;
      if (n) setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth" }), 0);
      return n;
    });
  };

  useEffect(() => {
    // Instance가 선택되지 않았으면 빈 데이터 표시
    if (!selectedInstance) {
      setResp(null);
      setLoading(false);
      setError(null);
      return;
    }

    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const databaseId = selectedDatabase?.databaseId;
        
        console.log('Fetching bloat dashboard data...', { 
          instanceId: selectedInstance.instanceId, 
          databaseId 
        });

        const res = await apiClient.get<DashboardResponse>("/vacuum/bloat/dashboard", {
          params: databaseId ? { databaseId } : undefined,
          signal: ac.signal,
        });

        console.log('Bloat API Response:', res.data);

        // 최소 유효성
        if (!res.data?.xminHorizonMonitor?.labels?.length || !res.data?.xminHorizonMonitor?.data?.length) {
          throw new Error("Xmin Horizon 데이터가 비었습니다.");
        }
        setResp(res.data);
      } catch (e: any) {
        if (e?.name !== "CanceledError") {
          console.error('Failed to fetch bloat dashboard:', e);
          setError(e?.response?.data?.message ?? e?.message ?? "대시보드 로딩 실패");
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [selectedInstance, selectedDatabase]);

  // ====== 시리즈 구성 ======
  const xminSeries = useMemo(() => {
    if (!resp?.xminHorizonMonitor) return [];
    const [ageHours = []] = resp.xminHorizonMonitor.data; // 첫 시리즈는 Age
    const warn = Array(ageHours.length).fill(WARN_H);
    const alert = Array(ageHours.length).fill(ALERT_H);
    return [
      { name: "Xmin Horizon Age", data: ageHours },
      { name: `Warning Threshold (${WARN_H}h)`, data: warn },
      { name: `Alert Threshold (${ALERT_H}h)`, data: alert },
    ];
  }, [resp?.xminHorizonMonitor]);

  const bloatTrendSeries = useMemo(() => {
    if (!resp?.bloatTrend) return [];
    return [{ name: "Total Bloat", data: resp.bloatTrend.data ?? [] }];
  }, [resp?.bloatTrend]);

  const bloatDistSeries = useMemo(() => {
    if (!resp?.bloatDistribution) return [];
    return [{ name: "Tables", data: resp.bloatDistribution.data ?? [] }];
  }, [resp?.bloatDistribution]);

  // Instance 선택 안됨
  if (!selectedInstance) {
    return (
      <div className="vd-root">
        <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
          <p style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>
            Instance를 선택해주세요
          </p>
          <p style={{ fontSize: '14px', color: '#9CA3AF' }}>
            상단 헤더에서 Instance를 선택하면 대시보드 데이터가 표시됩니다.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="vd-root">
        <div className="il-banner il-banner--muted">
          Loading dashboard data for <strong>{selectedInstance.instanceName}</strong>
          {selectedDatabase && <span> / <strong>{selectedDatabase.databaseName}</strong></span>}
          ...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="vd-root">
        <div className="il-banner il-banner--error">
          <p style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>
            Failed to load bloat dashboard
          </p>
          <p style={{ fontSize: '14px', marginTop: '8px' }}>{error}</p>
          <p style={{ fontSize: '12px', marginTop: '16px', color: '#6B7280' }}>
            Instance: {selectedInstance.instanceName}
            {selectedDatabase && ` / Database: ${selectedDatabase.databaseName}`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="vd-root">
      {!resp ? (
        <div className="il-empty">표시할 데이터가 없습니다.</div>
      ) : (
        <>
          <div className="vd-main-layout">
            {/* 좌측 대형: Xmin Horizon */}
            <div className="vd-left-large">
              <WidgetCard title="Xmin Horizon Monitor (last 7d)" height="clamp(320px, 43vh, 520px)">
                <Chart
                  type="area"
                  series={xminSeries}
                  categories={resp.xminHorizonMonitor.labels}
                  width="100%"
                  height="350px"
                  showToolbar={false}
                  customOptions={{
                    chart: { redrawOnParentResize: true, redrawOnWindowResize: true, toolbar: { show: false } },
                    dataLabels: { enabled: false },
                    stroke: { curve: "smooth", width: [2, 2, 2], dashArray: [0, 8, 8] },
                    fill: { type: "gradient", gradient: { shadeIntensity: 0.2, opacityFrom: 0.25, opacityTo: 0.05, stops: [0, 100] } },
                    markers: { size: 0 },
                    grid: { borderColor: "#E5E7EB", strokeDashArray: 4 },
                    legend: { show: true, position: "bottom" },
                    xaxis: {
                      categories: resp.xminHorizonMonitor.labels,
                      labels: { style: { colors: "#9CA3AF" } },
                      axisBorder: { show: false },
                      axisTicks: { show: false },
                    },
                    yaxis: {
                      min: 0,
                      max: 8,
                      tickAmount: 4,
                      labels: { formatter: (v: number) => `${v}h` },
                    },
                    annotations: {
                      yaxis: [
                        {
                          y: WARN_H,
                          borderColor: "#F59E0B",
                          strokeDashArray: 8,
                          label: { text: `Warn (${WARN_H}h)`, position: "right", style: { background: "transparent", color: "#F59E0B", fontWeight: 700 } },
                        },
                        {
                          y: ALERT_H,
                          borderColor: "#EF4444",
                          strokeDashArray: 8,
                          label: { text: `Alert (${ALERT_H}h)`, position: "right", style: { background: "transparent", color: "#EF4444", fontWeight: 700 } },
                        },
                      ],
                    },
                    tooltip: { shared: true, y: { formatter: (val: number) => `${val.toFixed(2)}h` } },
                  }}
                />
              </WidgetCard>
            </div>

            {/* 우측 스택: KPI + 2차트 */}
            <div className="vd-right-stack">
              {/* KPI */}
              <div className="vd-kpi-row">
                <SummaryCard label="Est. Table Bloat" value={resp.kpi.tableBloat} diff={3} />
                <SummaryCard label="Critical Tables" value={resp.kpi.criticalTable} diff={3} />
                <SummaryCard label="Bloat Growth" value={resp.kpi.bloatGrowth} diff={3} desc="30d" />
              </div>

              <div className="vd-chart-row">
                {/* Total Bloat Trend */}
                <WidgetCard title="Total Bloat Trend (Last 30 Days)">
                  <Chart
                    type="line"
                    series={bloatTrendSeries}
                    categories={resp.bloatTrend.labels}
                    width="100%"
                  />
                </WidgetCard>

                {/* Bloat Distribution */}
                <WidgetCard title="Bloat Distribution by Percentage (24h)">
                  <Chart
                    type="bar"
                    series={bloatDistSeries}
                    categories={resp.bloatDistribution.labels}
                    width="100%"
                  />
                </WidgetCard>
              </div>
            </div>
          </div>

          {/* (옵션) 상세 섹션 훅업 자리 */}
          <div ref={detailRef} className="mt-8" />
          {/* <BloatDetailPage onToggle={toggleDetail} expanded={expanded} /> */}
        </>
      )}
    </div>
  );
};

export default VacuumBloatPage;