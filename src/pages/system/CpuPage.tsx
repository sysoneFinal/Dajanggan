import Chart from "../../components/chart/ChartComponent";
import GaugeChart from "../../components/chart/GaugeChart";
import SummaryCard from "../../components/util/SummaryCard";
import WidgetCard from "../../components/util/WidgetCard";
import ChartGridLayout from "../../components/layout/ChartGridLayout";
import "../../styles/system/cpu.css";
import apiClient from "../../api/apiClient";
import {useQuery} from "@tanstack/react-query";
import { useInstanceContext } from "../../context/InstanceContext";

// API 응답 전체 구조
interface CPUData {
    cpuUsage: {
        value: number;
        description: string;
        runningQueries: number;
        waitingQueries: number;
        idleConnections: number;
    };
    cpuUsageTrend: {
        categories: string[];
        data: number[];
    };
    cpuLoadTypes: {
        categories: string[];
        autoVacuum: number[];
        bgWriter: number[];
        checkpoint: number[];
        postgresqlBackend: number[];
    };
    ioWaitVsLatency: {
        normal: Array<{ x: number; y: number }>;
        warning: Array<{ x: number; y: number }>;
        danger: Array<{ x: number; y: number }>;
    };
    backendProcessStats: {
        types: string[];
        activeCount: number[];
        idleCount: number[];
        totalCount: number[];
        colors: string[];
    };
    waitEventDistribution: {
        categories: string[];
        cpu: number[];
        client: number[];
        io: number[];
        lock: number[];
        other: number[];
    };
    recentStats: {
        loadAverage: {
            one: number;
            five: number;
            fifteen: number;
        };
        ioWait: number;
        connections: {
            active: number;
            idle: number;
            total: number;
        };
        idleCpu: number;
        contextSwitches: number;
        postgresqlBackendCpu: number;
    };
}

// Gauge 색상 결정
const getGaugeColor = (value: number): string => {
    if (value < 70) return "#8E79FF";
    if (value < 90) return "#FFD66B";
    return "#FEA29B";
};

interface SummaryCardWithLinkProps {
    label: string;
    value: string | number;
    diff?: number;
    desc?: string;
    status?: "info" | "warning" | "critical";
    link?: string;
}

function SummaryCardWithLink({ link, status = "info", ...props }: SummaryCardWithLinkProps) {
    const statusColors: Record<string, string> = {
        info: "#555555",
        warning: "#F59E0B",
        critical: "#EF4444",
    };

    return (
        <div style={{ position: "relative", flex: 1 }}>
            <SummaryCard {...props} status={status} />

            {link && (
                <a
                    href={link}
                    style={{
                        position: "absolute",
                        top: "1rem",
                        right: "1rem",
                        width: "20px",
                        height: "20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        opacity: 0.6,
                        zIndex: 10,
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = "1";
                        e.currentTarget.style.transform = "scale(1.15)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = "0.6";
                        e.currentTarget.style.transform = "scale(1)";
                    }}
                >
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={statusColors[status]}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                </a>
            )}
        </div>
    );
}

/** API 요청 - instanceId를 쿼리 파라미터로 전달 */
async function fetchCPUData(instanceId: number) {
    const response = await apiClient.get<CPUData>("/system/cpu", {
        params: { instanceId }
    });
    return response.data;
}

// 메인 페이지
export default function CPUPage() {
    const { selectedInstance } = useInstanceContext();

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["cpuDashboard", selectedInstance?.instanceId],
        queryFn: () => fetchCPUData(selectedInstance!.instanceId),
        retry: 1,
        enabled: !!selectedInstance,
    });

    // 인스턴스가 선택되지 않은 경우
    if (!selectedInstance) {
        return (
            <div className="cpu-page">
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '400px',
                    fontSize: '18px',
                    color: '#6B7280'
                }}>
                    인스턴스를 선택해주세요.
                </div>
            </div>
        );
    }

    // 로딩 중
    if (isLoading) {
        return (
            <div className="bgwriter-page">
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '400px',
                    fontSize: '18px',
                    color: '#6B7280'
                }}>
                    데이터를 불러오는 중...
                </div>
            </div>
        );
    }

    // 에러 발생
    if (isError) {
        return (
            <div className="bgwriter-page">
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '400px',
                    fontSize: '18px',
                    color: '#EF4444'
                }}>
                    <p>데이터를 불러오는데 실패했습니다.</p>
                    <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '8px' }}>
                        {error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: '16px',
                            padding: '8px 16px',
                            backgroundColor: '#3B82F6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        새로고침
                    </button>
                </div>
            </div>
        );
    }

    // 데이터가 없는 경우
    if (!data) {
        return (
            <div className="bgwriter-page">
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '400px',
                    fontSize: '18px',
                    color: '#6B7280'
                }}>
                    데이터가 없습니다.
                </div>
            </div>
        );
    }

    const dashboard = data;
    const gaugeColor = getGaugeColor(dashboard.cpuUsage.value);
    const recentStats = dashboard.recentStats;

    const summaryCards: Array<{
        label: string;
        value: string | number;
        desc: string;
        status: "info" | "warning" | "critical";
        link?: string;
    }> = [
        {
            label: "Load Average (1m/5m/15m)",
            value: `${recentStats.loadAverage.one} / ${recentStats.loadAverage.five} / ${recentStats.loadAverage.fifteen}`,
            desc: "시스템 부하 평균",
            status: recentStats.loadAverage.one > 4 ? "warning" : "info",
            link: "http://localhost:5173/instance/cpu/usage",
        },
        {
            label: "I/O Wait",
            value: `${recentStats.ioWait}%`,
            desc: "디스크 대기 시간",
            status: recentStats.ioWait > 20 ? "warning" : "info",
            link: "http://localhost:5173/instance/cpu/usage",
        },
        {
            label: "Active / Idle Connections",
            value: `${recentStats.connections.active} / ${recentStats.connections.idle}`,
            desc: "활성 / 유휴 연결",
            status: recentStats.connections.active > 80 ? "warning" : "info",
        },
        {
            label: "PostgreSQL Backend CPU",
            value: `${recentStats.postgresqlBackendCpu}%`,
            desc: "PG 프로세스 CPU 사용률",
            status: recentStats.postgresqlBackendCpu > 80 ? "warning" : "info",
        },
        {
            label: "Idle CPU",
            value: `${recentStats.idleCpu}%`,
            desc: "여유 리소스",
            status: recentStats.idleCpu < 20 ? "critical" : "info",
        },
    ];

    return (
        <div className="cpu-page">
            {/* 상단 요약 카드 */}
            <div className="cpu-summary-cards">
                {summaryCards.map((card, idx) => (
                    <SummaryCardWithLink
                        key={idx}
                        label={card.label}
                        value={card.value}
                        desc={card.desc}
                        status={card.status}
                    />
                ))}
            </div>

            {/* 첫 번째 행: 게이지 + 2개 차트 */}
            <ChartGridLayout>
                <WidgetCard title="CPU 사용률" span={2}>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        height: '100%',
                        width: '100%',
                        marginTop: '18px',
                    }}>
                        <GaugeChart
                            value={dashboard.cpuUsage.value}
                            type="semi-circle"
                            color={gaugeColor}
                            radius={100}
                            strokeWidth={20}
                            height={200}
                            flattenRatio={0.89}
                        />
                        <div className="cpu-gauge-details">
                            <div className="cpu-detail-item">
                                <span className="cpu-detail-label">Running</span>
                                <span className="cpu-detail-value">{dashboard.cpuUsage.runningQueries}개</span>
                            </div>
                            <div className="cpu-detail-divider"></div>
                            <div className="cpu-detail-item">
                                <span className="cpu-detail-label">Waiting</span>
                                <span className="cpu-detail-value">{dashboard.cpuUsage.waitingQueries}개</span>
                            </div>
                        </div>
                    </div>
                </WidgetCard>

                <WidgetCard title="CPU 부하 유형별 분석" span={10}>
                    <Chart
                        type="line"
                        series={[
                            { name: "PostgreSQL Backend", data: dashboard.cpuLoadTypes.postgresqlBackend },
                            { name: "BGWriter", data: dashboard.cpuLoadTypes.bgWriter },
                            { name: "Auto Vacuum", data: dashboard.cpuLoadTypes.autoVacuum },
                            { name: "Checkpoint", data: dashboard.cpuLoadTypes.checkpoint },
                        ]}
                        categories={dashboard.cpuLoadTypes.categories}
                        height={250}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        yaxisOptions={{
                            title: { text: "CPU 부하 (%)", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: {
                                formatter: (val) => Math.round(val),
                            },
                        }}
                        colors={["#8E79FF", "#77B2FB", "#51DAA8", "#FEA29B"]}
                        showGrid={true}
                        showLegend={true}
                        tooltipFormatter={(value: number) => `${value}%`}
                    />
                </WidgetCard>
            </ChartGridLayout>

            {/* 나머지 차트들... */}
            <ChartGridLayout>
                <WidgetCard title="CPU 사용률 추이 (Last 24 Hours)" span={6}>
                    <Chart
                        type="line"
                        series={[
                            { name: "CPU 사용률", data: dashboard.cpuUsageTrend.data }
                        ]}
                        categories={dashboard.cpuUsageTrend.categories}
                        height={250}
                        colors={["#8E79FF"]}
                        showGrid={true}
                        showLegend={false}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        yaxisOptions={{
                            title: { text: "CPU 사용률 (%)", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        tooltipFormatter={(value: number) => `${value}%`}
                        customOptions={{
                            annotations: {
                                yaxis: [
                                    {
                                        y: 70,
                                        borderColor: "#60A5FA",
                                        strokeDashArray: 4,
                                        opacity: 0.6,
                                        label: {
                                            borderColor: "#60A5FA",
                                            style: {
                                                color: "#fff",
                                                background: "#60A5FA",
                                                fontSize: "11px",
                                                fontWeight: 500,
                                            },
                                            text: "정상: 70%",
                                            position: "right",
                                        },
                                    },
                                    {
                                        y: 80,
                                        borderColor: "#FBBF24",
                                        strokeDashArray: 4,
                                        opacity: 0.7,
                                        label: {
                                            borderColor: "#FBBF24",
                                            style: {
                                                color: "#fff",
                                                background: "#FBBF24",
                                                fontSize: "11px",
                                                fontWeight: 500,
                                            },
                                            text: "주의: 80%",
                                            position: "right",
                                        },
                                    },
                                    {
                                        y: 90,
                                        borderColor: "#FEA29B",
                                        strokeDashArray: 4,
                                        opacity: 0.8,
                                        label: {
                                            borderColor: "#FEA29B",
                                            style: {
                                                color: "#fff",
                                                background: "#FEA29B",
                                                fontSize: "11px",
                                                fontWeight: 600,
                                            },
                                            text: "경고: 90%",
                                            position: "right",
                                        },
                                    },
                                ],
                            },
                            yaxis: {
                                labels: {
                                    style: {
                                        colors: "#6B7280",
                                        fontFamily: 'var(--font-family, "Pretendard", sans-serif)',
                                    },
                                    formatter: (val: number) => `${val}%`,
                                },
                            },
                        }}
                    />
                </WidgetCard>
                <WidgetCard title="I/O Wait vs 디스크 Latency 상관관계" span={6}>
                    <Chart
                        type="scatter"
                        series={[
                            {
                                name: "정상 상태",
                                data: dashboard.ioWaitVsLatency.normal
                            },
                            {
                                name: "주의 상관관계",
                                data: dashboard.ioWaitVsLatency.warning
                            },
                            {
                                name: "높은 상관관계",
                                data: dashboard.ioWaitVsLatency.danger
                            },
                        ]}
                        height={250}
                        colors={["#8E79FF", "#FFD66B", "#FEA29B"]}
                        showGrid={true}
                        showLegend={false}
                        xaxisOptions={{
                            title: { text: "I/O Wait (%)", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: { formatter: (val: string) => `${val}%` },
                            min: 0,
                            max: 40,
                        }}
                        yaxisOptions={{
                            title: { text: "Disk Latency (ms)", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: { formatter: (val: number) => `${val}ms` },
                            min: 0,
                            max: 50,
                        }}
                        customOptions={{
                            markers: {
                                size: 6,
                                strokeWidth: 0,
                            }
                        }}
                        tooltipFormatter={(value: number) => `${value}`}
                    />
                </WidgetCard>
            </ChartGridLayout>

            <ChartGridLayout>
                <WidgetCard title="Backend 프로세스 타입별 분포" span={6}>
                    <Chart
                        type="bar"
                        series={[
                            {
                                name: "Active",
                                data: dashboard.backendProcessStats.activeCount,
                            },
                            {
                                name: "Idle",
                                data: dashboard.backendProcessStats.idleCount,
                            },
                        ]}
                        categories={dashboard.backendProcessStats.types}
                        height={250}
                        colors={["#8E79FF", "#D1D5DB"]}
                        showGrid={true}
                        showLegend={true}
                        isStacked={true}
                        xaxisOptions={{
                            title: { text: "프로세스 수", style: { fontSize: "12px", color: "#6B7280" } },
                        }}
                        yaxisOptions={{
                            title: { text: "Backend Type", style: { fontSize: "12px", color: "#6B7280" } },
                        }}
                        customOptions={{
                            chart: {
                                stacked: true,
                            },
                            plotOptions: {
                                bar: {
                                    horizontal: true,
                                    barHeight: "70%",
                                },
                            },
                            dataLabels: {
                                enabled: true,
                                formatter: function(val: number, opts: any) {
                                    const seriesIndex = opts.seriesIndex;
                                    const dataPointIndex = opts.dataPointIndex;
                                    const total = data.backendProcessStats.totalCount[dataPointIndex];
                                    const value = val as number;

                                    if (seriesIndex === 0) {
                                        const percentage = ((value / total) * 100).toFixed(0);
                                        return `${value} (${percentage}%)`;
                                    }
                                    return value > 0 ? `${value}` : '';
                                },
                                style: {
                                    fontSize: "11px",
                                    colors: ["#fff"],
                                    fontWeight: 600,
                                },
                            },
                            legend: {
                                position: "top",
                                horizontalAlign: "right",
                                fontSize: "12px",
                                fontFamily: 'var(--font-family, "Pretendard", sans-serif)',
                                markers: {
                                    width: 12,
                                    height: 12,
                                    radius: 3,
                                },
                            },
                        }}
                        tooltipFormatter={(value: number, opts: any) => {
                            const dataPointIndex = opts.dataPointIndex;
                            const total = data.backendProcessStats.totalCount[dataPointIndex];
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${value}개 (${percentage}%)`;
                        }}
                    />
                </WidgetCard>

                <WidgetCard title="대기 유형별 비중 변화 (100%)" span={6}>
                    <Chart
                        type="column"
                        series={[
                            { name: "CPU", data: dashboard.waitEventDistribution.cpu },
                            { name: "Client", data: dashboard.waitEventDistribution.client },
                            { name: "I/O", data: dashboard.waitEventDistribution.io },
                            { name: "Lock", data: dashboard.waitEventDistribution.lock },
                            { name: "Other", data: dashboard.waitEventDistribution.other },
                        ]}
                        categories={data.waitEventDistribution.categories}
                        height={250}
                        colors={["#8E79FF", "#51DAA8", "#77B2FB", "#FEA29B", "#6B7280"]}
                        showGrid={true}
                        showLegend={true}
                        isStacked={true}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                        }}
                        yaxisOptions={{
                            title: { text: "비중 (%)", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: { formatter: (val: number) => `${val}%` },
                            min: 0,
                            max: 100,
                        }}
                        customOptions={{
                            chart: {
                                stacked: true,
                                stackType: "100%"
                            },
                            plotOptions: {
                                bar: {
                                    horizontal: false,
                                    columnWidth: "70%"
                                }
                            }
                        }}
                        tooltipFormatter={(value: number) => `${value}%`}
                    />
                </WidgetCard>
            </ChartGridLayout>
        </div>
    );
}