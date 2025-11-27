// 작성자: 김민서
// Vacuum Bloat 대시보드 페이지 컴포넌트
// 역할: Xmin Horizon 모니터링, Bloat 트렌드/분포 차트 표시, KPI 지표 제공

import React, { useMemo, useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Chart from "../../components/chart/ChartComponent";
import WidgetCard from "../../components/util/WidgetCard";
import SummaryCard from "../../components/util/SummaryCard";
import BloatDetailPage from "./VacuumBloatDetail";
import "/src/styles/vacuum/VacuumPage.css";
import apiClient from "../../api/apiClient";
import { intervalToMs } from "../../utils/time";
import { useLoader } from "../../context/LoaderContext";
import { useInstanceContext } from "../../context/InstanceContext";

// ============= Types =============
type XminHorizonMonitor = {
  data: number[][];
  labels: string[];
};

type BloatTrend = {
  data: number[];
  labels: string[];
};

type BloatDistribution = {
  data: number[];
  labels: string[];
};

type Kpi = {
  tableBloat: string;
  criticalTable: number;
  bloatGrowth: string;
  tableBloatSeverity: "NORMAL" | "WARNING" | "CRITICAL";
  criticalTableSeverity: "NORMAL" | "WARNING" | "CRITICAL";
  bloatGrowthSeverity: "NORMAL" | "WARNING" | "CRITICAL";
  totalDatabaseSizeBytes?: number;
  totalTableCount?: number;
};

type DashboardResponse = {
  xminHorizonMonitor: XminHorizonMonitor;
  bloatTrend: BloatTrend;
  bloatDistribution: BloatDistribution;
  kpi: Kpi;
};

// ============= Constants =============
const THRESHOLDS = {
  WARNING: 4,
  ALERT: 6,
} as const;

const CHART_COLORS = {
  PRIMARY: "#6366F1",
  WARNING: "#F59E0B",
  CRITICAL: "#EF4444",
} as const;

const MESSAGES = {
  NO_SELECTION: "Instance와 Database를 선택해주세요",
  NO_DATA: "표시할 데이터가 없습니다.",
  NO_XMIN_DATA: "최근 7일간 Xmin Horizon 데이터가 없습니다.",
  NO_BLOAT_TREND: "최근 30일간 Bloat 트렌드 데이터가 없습니다.",
  NO_BLOAT_DIST: "최근 24시간 내 Bloat 분포 데이터가 없습니다.",
  LOADING: "Loading bloat dashboard for",
  LOADING_WAIT: "Please wait...",
  LOAD_FAILED: "⚠️ Failed to load bloat dashboard",
} as const;

// ============= Utilities =============
const severityToStatus = (
  severity: "NORMAL" | "WARNING" | "CRITICAL"
): "info" | "warning" | "critical" => {
  switch (severity) {
    case "CRITICAL":
      return "critical";
    case "WARNING":
      return "warning";
    case "NORMAL":
      return "info";
    default:
      return "info";
  }
};

const convertSecondsToHours = (seconds: number): number => seconds / 3600;

const validateDashboardData = (data: any): DashboardResponse => {
  if (!data) {
    throw new Error("응답 데이터가 없습니다.");
  }

  return {
    xminHorizonMonitor: {
      data: data.xminHorizonMonitor?.data || [[], []],
      labels: data.xminHorizonMonitor?.labels || [],
    },
    bloatTrend: {
      data: data.bloatTrend?.data || [],
      labels: data.bloatTrend?.labels || [],
    },
    bloatDistribution: {
      data: data.bloatDistribution?.data || [],
      labels: data.bloatDistribution?.labels || [],
    },
    kpi: {
      tableBloat: data.kpi?.tableBloat || "0B",
      criticalTable: data.kpi?.criticalTable || 0,
      bloatGrowth: data.kpi?.bloatGrowth || "+0B",
      tableBloatSeverity: data.kpi?.tableBloatSeverity || "NORMAL",
      criticalTableSeverity: data.kpi?.criticalTableSeverity || "NORMAL",
      bloatGrowthSeverity: data.kpi?.bloatGrowthSeverity || "NORMAL",
      totalDatabaseSizeBytes: data.kpi?.totalDatabaseSizeBytes,
      totalTableCount: data.kpi?.totalTableCount,
    },
  };
};

// ============= Main Component =============
const VacuumBloatPage: React.FC = () => {
  const { selectedInstance, selectedDatabase, refreshInterval } =
    useInstanceContext();
  const { showLoader, hideLoader } = useLoader();

  const [expanded, setExpanded] = useState(true);
  const detailRef = useRef<HTMLDivElement>(null);

  const toggle = () => {
    setExpanded((prev) => {
      const next = !prev;
      if (next)
        setTimeout(
          () => detailRef.current?.scrollIntoView({ behavior: "smooth" }),
          0
        );
      return next;
    });
  };

  // API 호출: Dashboard 데이터 조회
  const {
    data: resp,
    isLoading: loading,
    error: queryError,
  } = useQuery<DashboardResponse>({
    queryKey: [
      "vacuum-bloat-dashboard",
      selectedInstance?.instanceId,
      selectedDatabase?.databaseId,
    ],
    queryFn: async () => {
      if (!selectedInstance) return null;

      const databaseId = selectedDatabase?.databaseId;
      const instanceId = selectedInstance?.instanceId;

      console.log("Fetching bloat dashboard...", {
        instanceId: selectedInstance.instanceId,
        instanceName: selectedInstance.instanceName,
        databaseId,
        databaseName: selectedDatabase?.databaseName,
      });

      const res = await apiClient.get<DashboardResponse>(
        "/vacuum/bloat/dashboard",
        {
          params: {
            databaseId: databaseId,
            instanceId: instanceId,
          },
        }
      );

      console.log("Bloat API Response:", res.data);

      const validated = validateDashboardData(res.data);

      console.log("Validated Bloat Data:", {
        xminDataLength: validated.xminHorizonMonitor.data?.[0]?.length || 0,
        xminLabelsLength: validated.xminHorizonMonitor.labels.length,
        bloatTrendLength: validated.bloatTrend.data.length,
        bloatDistLength: validated.bloatDistribution.data.length,
        kpi: validated.kpi,
      });

      return validated;
    },
    enabled: !!selectedInstance && !!selectedDatabase,
    refetchInterval: intervalToMs(refreshInterval),
  });

  // 로딩 상태 관리
  useEffect(() => {
    if (loading) {
      showLoader("Vacuum Bloat 데이터를 불러오는 중...");
    } else {
      hideLoader();
    }
  }, [loading, showLoader, hideLoader]);

  const error = queryError
    ? queryError instanceof Error
      ? queryError.message
      : "대시보드 로딩 실패"
    : null;

  // 차트 시리즈 생성
  const xminSeries = useMemo(() => {
    if (!resp?.xminHorizonMonitor?.data?.length) {
      return [];
    }

    const [ageHours = []] = resp.xminHorizonMonitor.data;

    console.log("원본 ageHours 데이터:", ageHours.slice(0, 5));

    const ageHoursConverted = ageHours.map(convertSecondsToHours);

    console.log("변환된 데이터:", ageHoursConverted.slice(0, 5));

    if (ageHoursConverted.length === 0) {
      return [];
    }

    const warn = Array(ageHoursConverted.length).fill(THRESHOLDS.WARNING);
    const alert = Array(ageHoursConverted.length).fill(THRESHOLDS.ALERT);

    return [
      { name: "Xmin Horizon Age", data: ageHoursConverted },
      { name: `Warning Threshold (${THRESHOLDS.WARNING}m)`, data: warn },
      { name: `Alert Threshold (${THRESHOLDS.ALERT}m)`, data: alert },
    ];
  }, [resp?.xminHorizonMonitor]);

  const bloatTrendSeries = useMemo(() => {
    if (!resp?.bloatTrend?.data?.length) {
      return [];
    }
    return [{ name: "Total Bloat (GB)", data: resp.bloatTrend.data }];
  }, [resp?.bloatTrend]);

  const bloatDistSeries = useMemo(() => {
    if (!resp?.bloatDistribution?.data?.length) {
      return [];
    }
    return [{ name: "Tables", data: resp.bloatDistribution.data }];
  }, [resp?.bloatDistribution]);

  // ============= Rendering =============

  // Instance나 Database가 선택되지 않은 경우
  if (!selectedInstance || !selectedDatabase) {
    return (
      <div className="vd-root">
        <div
          style={{
            padding: "40px",
            textAlign: "center",
            color: "#6B7280",
          }}
        >
          <p
            style={{
              fontSize: "18px",
              fontWeight: "500",
              marginBottom: "8px",
            }}
          >
            {MESSAGES.NO_SELECTION}
          </p>
        </div>
      </div>
    );
  }

  // 로딩 중
  if (loading) {
    return (
      <div className="vd-root">
        <div
          style={{
            padding: "40px",
            textAlign: "center",
            color: "#6B7280",
            backgroundColor: "#F9FAFB",
            borderRadius: "8px",
            margin: "16px",
          }}
        >
          <div style={{ fontSize: "16px", marginBottom: "8px" }}>
            {MESSAGES.LOADING} <strong>{selectedInstance.instanceName}</strong>
            {selectedDatabase && (
              <span>
                {" "}
                / <strong>{selectedDatabase.databaseName}</strong>
              </span>
            )}
          </div>
          <div style={{ fontSize: "14px", color: "#9CA3AF" }}>
            {MESSAGES.LOADING_WAIT}
          </div>
        </div>
      </div>
    );
  }

  // 에러 발생
  if (error) {
    return (
      <div className="vd-root">
        <div
          style={{
            padding: "24px",
            backgroundColor: "#FEE2E2",
            color: "#991B1B",
            borderRadius: "8px",
            margin: "16px",
          }}
        >
          <p
            style={{
              fontSize: "18px",
              fontWeight: "500",
              marginBottom: "8px",
            }}
          >
            {MESSAGES.LOAD_FAILED}
          </p>
          <p style={{ fontSize: "14px", marginTop: "8px" }}>{error}</p>
          <p
            style={{
              fontSize: "12px",
              marginTop: "16px",
              color: "#7F1D1D",
            }}
          >
            Instance: {selectedInstance.instanceName}
            {selectedDatabase &&
              ` / Database: ${selectedDatabase.databaseName}`}
          </p>
        </div>
      </div>
    );
  }

  // 데이터 없음
  if (!resp) {
    return (
      <div className="vd-root">
        <div
          style={{
            padding: "40px",
            textAlign: "center",
            color: "#6B7280",
            backgroundColor: "#F9FAFB",
            borderRadius: "8px",
            margin: "16px",
          }}
        >
          {MESSAGES.NO_DATA}
        </div>
      </div>
    );
  }

  // 메인 대시보드
  return (
    <div className="vd-root">
      <div className="vd-main-layout">
        {/* 좌측: Xmin Horizon Monitor */}
        <div className="vd-left-large">
          <WidgetCard title="Xmin Horizon 모니터링 (최근 24시간 내)">
            {xminSeries.length > 0 ? (
              <Chart
                type="line"
                series={xminSeries}
                categories={resp.xminHorizonMonitor.labels}
                width="100%"
                height="400px"
                showToolbar={false}
                colors={[
                  CHART_COLORS.PRIMARY,
                  CHART_COLORS.WARNING,
                  CHART_COLORS.CRITICAL,
                ]}
                customOptions={{
                  chart: {
                    redrawOnParentResize: true,
                    redrawOnWindowResize: true,
                    toolbar: { show: false },
                  },
                  dataLabels: { enabled: false },
                  stroke: {
                    curve: "smooth",
                    width: [2, 2, 2],
                    dashArray: [0, 8, 8],
                    colors: [
                      CHART_COLORS.PRIMARY,
                      CHART_COLORS.WARNING,
                      CHART_COLORS.CRITICAL,
                    ],
                  },
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
                    tickAmount: 4,
                    labels: { formatter: (v: number) => `${v}m` },
                  },
                  annotations: {
                    yaxis: [
                      {
                        y: THRESHOLDS.WARNING,
                        borderColor: CHART_COLORS.WARNING,
                        borderWidth: 2,
                        strokeDashArray: 8,
                        label: {
                          text: `Warn (${THRESHOLDS.WARNING}m)`,
                          position: "right",
                          style: {
                            background: "transparent",
                            color: CHART_COLORS.WARNING,
                            fontWeight: 700,
                          },
                        },
                      },
                      {
                        y: THRESHOLDS.ALERT,
                        borderColor: CHART_COLORS.CRITICAL,
                        borderWidth: 2,
                        strokeDashArray: 8,
                        label: {
                          text: `Alert (${THRESHOLDS.ALERT}m)`,
                          position: "right",
                          style: {
                            background: "transparent",
                            color: CHART_COLORS.CRITICAL,
                            fontWeight: 700,
                          },
                        },
                      },
                    ],
                  },
                  tooltip: {
                    shared: true,
                    y: { formatter: (val: number) => `${val.toFixed(2)}m` },
                  },
                }}
              />
            ) : (
              <div
                style={{
                  textAlign: "center",
                  color: "#9CA3AF",
                }}
              >
                <div style={{ fontSize: "16px", marginBottom: "8px" }}>
                  {MESSAGES.NO_XMIN_DATA}
                </div>
                <div style={{ fontSize: "14px" }}>
                  {selectedDatabase
                    ? `Database "${selectedDatabase.databaseName}"에 데이터가 없습니다.`
                    : "Instance 전체에 데이터가 없습니다."}
                </div>
              </div>
            )}
          </WidgetCard>
        </div>

        {/* 우측: KPI + 차트 */}
        <div className="vd-right-stack">
          {/* KPI 카드 */}
          <div className="vd-kpi-row">
            <SummaryCard
              label="Table Bloat 예상치"
              value={resp.kpi.tableBloat}
              status={severityToStatus(resp.kpi.tableBloatSeverity)}
            />
            <SummaryCard
              label="Critical Tables"
              value={resp.kpi.criticalTable}
              status={severityToStatus(resp.kpi.criticalTableSeverity)}
            />
            <SummaryCard
              label="Bloat 증가량"
              value={resp.kpi.bloatGrowth}
              desc="7일 전 기준"
              status={severityToStatus(resp.kpi.bloatGrowthSeverity)}
            />
          </div>

          {/* 차트 행 */}
          <div className="vd-chart-row">
            {/* Bloat Trend */}
            <WidgetCard title="전체 Bloat 추이 (최근 30일 내)">
              {bloatTrendSeries.length > 0 &&
              resp.bloatTrend.labels.length > 0 ? (
                <Chart
                  type="line"
                  series={bloatTrendSeries}
                  categories={resp.bloatTrend.labels}
                  width="100%"
                  customOptions={{
                    chart: {
                      toolbar: { show: false },
                      redrawOnParentResize: true,
                      redrawOnWindowResize: true,
                    },
                    stroke: {
                      curve: "smooth",
                      width: 2,
                    },
                    markers: {
                      size: 4,
                    },
                    grid: {
                      borderColor: "#E5E7EB",
                      strokeDashArray: 4,
                    },
                    xaxis: {
                      labels: {
                        style: { colors: "#9CA3AF" },
                      },
                    },
                    yaxis: {
                      title: { text: "Bloat (GB)" },
                      labels: {
                        formatter: (val: number) => `${val.toFixed(2)}GB`,
                      },
                    },
                    tooltip: {
                      y: {
                        formatter: (val: number) => `${val.toFixed(2)} GB`,
                      },
                    },
                  }}
                />
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    color: "#9CA3AF",
                  }}
                >
                  {MESSAGES.NO_BLOAT_TREND}
                </div>
              )}
            </WidgetCard>

            {/* Bloat Distribution */}
            <WidgetCard title="Bloat 비율별 분포 (최근 24시간 내)">
              {bloatDistSeries.length > 0 &&
              resp.bloatDistribution.labels.length > 0 ? (
                <Chart
                  type="bar"
                  series={bloatDistSeries}
                  categories={resp.bloatDistribution.labels}
                  width="100%"
                  customOptions={{
                    chart: {
                      toolbar: { show: false },
                      redrawOnParentResize: true,
                      redrawOnWindowResize: true,
                    },
                    plotOptions: {
                      bar: {
                        borderRadius: 4,
                        dataLabels: {
                          position: "top",
                        },
                      },
                    },
                    dataLabels: {
                      enabled: true,
                      formatter: (val: number) => val.toString(),
                      offsetY: -20,
                      style: {
                        fontSize: "12px",
                        colors: ["#304758"],
                      },
                    },
                    xaxis: {
                      labels: {
                        style: { colors: "#9CA3AF" },
                      },
                    },
                    yaxis: {
                      title: { text: "Table Count" },
                    },
                    grid: {
                      borderColor: "#E5E7EB",
                      strokeDashArray: 4,
                    },
                  }}
                />
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    color: "#9CA3AF",
                  }}
                >
                  {MESSAGES.NO_BLOAT_DIST}
                </div>
              )}
            </WidgetCard>
          </div>
        </div>
      </div>

      {/* 드릴다운 섹션 */}
      <div ref={detailRef} className="mt-8" />
      <BloatDetailPage onToggle={toggle} expanded={expanded} />
    </div>
  );
};

export default VacuumBloatPage;