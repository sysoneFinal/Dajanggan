import React, { useEffect, useMemo, useState, useRef } from "react";
import Chart from "../../components/chart/ChartComponent";
import WidgetCard from "../../components/util/WidgetCard";
import SummaryCard from "../../components/util/SummaryCard";
import BloatDetailPage from "./VacuumBloatDetail"; // 임포트 추가
import "/src/styles/vacuum/VacuumPage.css";
import apiClient from "../../api/apiClient";
import { useInstanceContext } from "../../context/InstanceContext";

// ====== 서버 DTO 타입 ======
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

// ====== 상수 ======
const WARN_H = 4;
const ALERT_H = 6;

const VacuumBloatPage: React.FC = () => {
  const { selectedInstance, selectedDatabase } = useInstanceContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resp, setResp] = useState<DashboardResponse | null>(null);
  
  // 드릴다운 상태 추가
  const [expanded, setExpanded] = useState(true);
  const detailRef = useRef<HTMLDivElement>(null);

  const toggle = () => {
    setExpanded((prev) => {
      const next = !prev;
      if (next) setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth" }), 0);
      return next;
    });
  };

  useEffect(() => {
    // Instance가 선택되지 않으면 초기화
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

        console.log('Fetching bloat dashboard...', {
          instanceId: selectedInstance.instanceId,
          instanceName: selectedInstance.instanceName,
          databaseId,
          databaseName: selectedDatabase?.databaseName
        });

        // API 호출 - databaseId가 있으면 파라미터로 전달
        const params: any = {};
        if (databaseId) {
          params.databaseId = databaseId;
        }

        const res = await apiClient.get<DashboardResponse>("/vacuum/bloat/dashboard", {
          params,
          signal: ac.signal,
        });

        console.log('Bloat API Response:', res.data);

        // 데이터 검증 및 기본값 설정
        if (!res.data) {
          throw new Error("응답 데이터가 없습니다.");
        }

        const validated: DashboardResponse = {
          xminHorizonMonitor: {
            data: res.data.xminHorizonMonitor?.data || [[], []],
            labels: res.data.xminHorizonMonitor?.labels || []
          },
          bloatTrend: {
            data: res.data.bloatTrend?.data || [],
            labels: res.data.bloatTrend?.labels || []
          },
          bloatDistribution: {
            data: res.data.bloatDistribution?.data || [],
            labels: res.data.bloatDistribution?.labels || []
          },
          kpi: {
            tableBloat: res.data.kpi?.tableBloat || "0B",
            criticalTable: res.data.kpi?.criticalTable || 0,
            bloatGrowth: res.data.kpi?.bloatGrowth || "+0B"
          }
        };

        console.log('Validated Bloat Data:', {
          xminDataLength: validated.xminHorizonMonitor.data?.[0]?.length || 0,
          xminLabelsLength: validated.xminHorizonMonitor.labels.length,
          bloatTrendLength: validated.bloatTrend.data.length,
          bloatDistLength: validated.bloatDistribution.data.length,
          kpi: validated.kpi
        });

        setResp(validated);
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
  }, [selectedInstance, selectedDatabase]); // Instance 또는 Database 변경 시 재조회

  // ====== 차트 시리즈 ======
  const xminSeries = useMemo(() => {
    if (!resp?.xminHorizonMonitor?.data?.length) {
      return [];
    }

    const [ageHours = []] = resp.xminHorizonMonitor.data;

    console.log('원본 ageHours 데이터:', ageHours.slice(0, 5));
    
    const ageHoursConverted = ageHours.map(seconds => seconds / 3600);
    
    console.log('변환된 데이터:', ageHoursConverted.slice(0, 5));
    
    if (ageHoursConverted.length === 0) {
      return [];
    }

    const warn = Array(ageHoursConverted.length).fill(WARN_H);
    const alert = Array(ageHoursConverted.length).fill(ALERT_H);

    return [
      { name: "Xmin Horizon Age", data: ageHoursConverted },
      { name: `Warning Threshold (${WARN_H}h)`, data: warn },
      { name: `Alert Threshold (${ALERT_H}h)`, data: alert },
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

  // ====== 렌더링 ======
  
  // Instance나 Database가 선택되지 않은 경우
  if (!selectedInstance || !selectedDatabase) {
    return (
      <div className="vd-root">
        <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
          <p style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>
            Instance와 Database를 선택해주세요
          </p>
        </div>
      </div>
    );
  }

  // 로딩 중
  if (loading) {
    return (
      <div className="vd-root">
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: '#6B7280',
          backgroundColor: '#F9FAFB',
          borderRadius: '8px',
          margin: '16px'
        }}>
          <div style={{ fontSize: '16px', marginBottom: '8px' }}>
            Loading bloat dashboard for{' '}
            <strong>{selectedInstance.instanceName}</strong>
            {selectedDatabase && (
              <span> / <strong>{selectedDatabase.databaseName}</strong></span>
            )}
          </div>
          <div style={{ fontSize: '14px', color: '#9CA3AF' }}>
            Please wait...
          </div>
        </div>
      </div>
    );
  }

  // 에러 발생
  if (error) {
    return (
      <div className="vd-root">
        <div style={{
          padding: '24px',
          backgroundColor: '#FEE2E2',
          color: '#991B1B',
          borderRadius: '8px',
          margin: '16px'
        }}>
          <p style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>
            ⚠️ Failed to load bloat dashboard
          </p>
          <p style={{ fontSize: '14px', marginTop: '8px' }}>{error}</p>
          <p style={{ fontSize: '12px', marginTop: '16px', color: '#7F1D1D' }}>
            Instance: {selectedInstance.instanceName}
            {selectedDatabase && ` / Database: ${selectedDatabase.databaseName}`}
          </p>
        </div>
      </div>
    );
  }

  // 데이터 없음
  if (!resp) {
    return (
      <div className="vd-root">
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: '#6B7280',
          backgroundColor: '#F9FAFB',
          borderRadius: '8px',
          margin: '16px'
        }}>
          표시할 데이터가 없습니다.
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
          <WidgetCard title="Xmin Horizon 모니터링 (last 7d)" height="clamp(320px, 38.8vh, 520px)">
            {xminSeries.length > 0 ? (
              <Chart
                type="line"
                series={xminSeries}
                categories={resp.xminHorizonMonitor.labels}
                width="100%"
                height="350px"
                showToolbar={false}
                customOptions={{
                  chart: {
                    redrawOnParentResize: true,
                    redrawOnWindowResize: true,
                    toolbar: { show: false }
                  },
                  dataLabels: { enabled: false },
                  stroke: {
                    curve: "smooth",
                    width: [2, 2, 2],
                    dashArray: [0, 8, 8]
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
                    labels: { formatter: (v: number) => `${v}h` },
                  },
                  annotations: {
                    yaxis: [
                      {
                        y: WARN_H,
                        borderColor: "#F59E0B",
                        strokeDashArray: 8,
                        label: {
                          text: `Warn (${WARN_H}h)`,
                          position: "right",
                          style: {
                            background: "transparent",
                            color: "#F59E0B",
                            fontWeight: 700
                          }
                        },
                      },
                      {
                        y: ALERT_H,
                        borderColor: "#EF4444",
                        strokeDashArray: 8,
                        label: {
                          text: `Alert (${ALERT_H}h)`,
                          position: "right",
                          style: {
                            background: "transparent",
                            color: "#EF4444",
                            fontWeight: 700
                          }
                        },
                      },
                    ],
                  },
                  tooltip: {
                    shared: true,
                    y: { formatter: (val: number) => `${val.toFixed(2)}h` }
                  },
                }}
              />
            ) : (
              <div style={{
                textAlign: 'center',
                color: '#9CA3AF'
              }}>
                <div style={{ fontSize: '16px', marginBottom: '8px' }}>
                  최근 7일간 Xmin Horizon 데이터가 없습니다.
                </div>
                <div style={{ fontSize: '14px' }}>
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
            />
            <SummaryCard
              label="Critical Tables"
              value={resp.kpi.criticalTable}
            />
            <SummaryCard
              label="Bloat 증가량"
              value={resp.kpi.bloatGrowth}
              desc="30d"
            />
          </div>

          {/* 차트 행 */}
          <div className="vd-chart-row">
            {/* Bloat Trend */}
            <WidgetCard title="전체 Bloat 추이  (Last 30 Days)">
              {bloatTrendSeries.length > 0 && resp.bloatTrend.labels.length > 0 ? (
                <Chart
                  type="line"
                  series={bloatTrendSeries}
                  categories={resp.bloatTrend.labels}
                  width="100%"
                  customOptions={{
                    chart: {
                      toolbar: { show: false },
                      redrawOnParentResize: true,
                      redrawOnWindowResize: true
                    },
                    stroke: {
                      curve: "smooth",
                      width: 2
                    },
                    markers: {
                      size: 4
                    },
                    grid: {
                      borderColor: "#E5E7EB",
                      strokeDashArray: 4
                    },
                    xaxis: {
                      labels: {
                        style: { colors: "#9CA3AF" }
                      }
                    },
                    yaxis: {
                      title: { text: "Bloat (GB)" },
                      labels: {
                        formatter: (val: number) => `${val.toFixed(1)}GB`
                      }
                    },
                    tooltip: {
                      y: {
                        formatter: (val: number) => `${val.toFixed(2)} GB`
                      }
                    }
                  }}
                />
              ) : (
                <div style={{
                  textAlign: 'center',
                  color: '#9CA3AF'
                }}>
                  최근 30일간 Bloat 트렌드 데이터가 없습니다.
                </div>
              )}
            </WidgetCard>

            {/* Bloat Distribution */}
            <WidgetCard title="Bloat 비율별 분포 (24h)">
              {bloatDistSeries.length > 0 && resp.bloatDistribution.labels.length > 0 ? (
                <Chart
                  type="bar"
                  series={bloatDistSeries}
                  categories={resp.bloatDistribution.labels}
                  width="100%"
                  customOptions={{
                    chart: {
                      toolbar: { show: false },
                      redrawOnParentResize: true,
                      redrawOnWindowResize: true
                    },
                    plotOptions: {
                      bar: {
                        borderRadius: 4,
                        dataLabels: {
                          position: "top"
                        }
                      }
                    },
                    dataLabels: {
                      enabled: true,
                      formatter: (val: number) => val.toString(),
                      offsetY: -20,
                      style: {
                        fontSize: "12px",
                        colors: ["#304758"]
                      }
                    },
                    xaxis: {
                      labels: {
                        style: { colors: "#9CA3AF" }
                      }
                    },
                    yaxis: {
                      title: { text: "Table Count" }
                    },
                    grid: {
                      borderColor: "#E5E7EB",
                      strokeDashArray: 4
                    }
                  }}
                />
              ) : (
                <div style={{
                  textAlign: 'center',
                  color: '#9CA3AF'
                }}>
                  최근 24시간 내 Bloat 분포 데이터가 없습니다.
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