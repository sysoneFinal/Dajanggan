import { useQuery } from "@tanstack/react-query";
import Chart from "../../components/chart/ChartComponent";
import SummaryCard from "../../components/util/SummaryCard";
import "../../styles/engine/hotindex.css";
import WidgetCard from "../../components/util/WidgetCard";
import ChartGridLayout from "../../components/layout/ChartGridLayout";
import apiClient from "../../api/apiClient";
import { useInstanceContext } from "../../context/InstanceContext";

/** Hot Index API 응답 타입 - 백엔드 응답 구조에 맞게 수정 */
interface HotIndexData {
    usageDistribution: {
        categories: string[];
        data: number[];
    };
    topUsage: {
        categories: string[];
        data: number[];
        total: number;
    };
    inefficientIndexes: {
        categories: string[];
        data: number[];
        total: number;
    };
    cacheHitRatio: {
        categories: string[];
        data: number[];
        average: number;
        min: number;
        max: number;
    };
    efficiency: {
        categories: string[];  // 백엔드 응답에 포함됨
        indexes: Array<{
            x: number;
            y: number;
            name: string;
        }>;
    };
    accessTrend: {
        categories: string[];
        reads: number[];
        writes: number[];
        totalReads: number;
        totalWrites: number;
    };
    scanSpeed: {
        categories: string[];
        data: number[];
        average: number;
        max: number;
        min: number;
    };
    recentStats: {
        cacheHitRatio: number;
        avgScanSpeed: number;
        totalReads: number;
        totalWrites: number;
        inefficientCount: number;
    };
}

/** API 요청 - instanceId와 databaseId를 쿼리 파라미터로 전달 */
async function fetchHotIndexData(instanceId: number, databaseId?: number) {
    try {
        const params: any = { instanceId };
        if (databaseId) {
            params.databaseId = databaseId;
        }
        const response = await apiClient.get<HotIndexData>("/engine/hotindex", { params });
        console.log("HotIndex API Response:", response.data); // 디버깅용 로그
        return response.data;
    } catch (error) {
        console.error("HotIndex API Error:", error);
        // 에러가 발생해도 빈 데이터 반환
        return null;
    }
}

interface SummaryCardWithLinkProps {
    label: string;
    value: string | number;
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

function getWriteExceedsAnnotations(
    categories: string[],
    reads: number[],
    writes: number[]
) {
    const annotations: any[] = [];

    for (let i = 0; i < reads.length; i++) {
        if (writes[i] > reads[i]) {
            annotations.push({
                x: categories[i],
                x2: categories[i],
                fillColor: "#FEA29B",
                opacity: 0.15,
                label: {
                    borderColor: "#FEA29B",
                    style: {
                        fontSize: "10px",
                        color: "#fff",
                        background: "#FEA29B",
                    },
                    text: "W>R",
                    orientation: "horizontal",
                    position: "top",
                },
            });
        }
    }

    return annotations;
}

export default function HotIndexPage() {
    const { selectedInstance, selectedDatabase } = useInstanceContext();
    
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["hotindexDashboard", selectedInstance?.instanceId, selectedDatabase?.databaseId],
        queryFn: () => fetchHotIndexData(selectedInstance!.instanceId, selectedDatabase?.databaseId),
        retry: false, // 재시도 비활성화
        enabled: !!selectedInstance && !!selectedDatabase, // 인스턴스와 데이터베이스가 모두 선택되었을 때만 실행
    });

    // 인스턴스가 선택되지 않은 경우
    if (!selectedInstance) {
        return (
            <div className="hotindex-page">
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

    // 데이터베이스가 선택되지 않은 경우
    if (!selectedDatabase) {
        return (
            <div className="hotindex-page">
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '400px',
                    fontSize: '18px',
                    color: '#6B7280'
                }}>
                    데이터베이스를 선택해주세요.
                </div>
            </div>
        );
    }

    // 로딩 중
    if (isLoading) {
        return (
            <div className="hotindex-page">
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
            <div className="hotindex-page">
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

    // 데이터가 없을 때 기본값 제공
    const dashboard = data || {
        usageDistribution: {
            categories: [],
            data: []
        },
        topUsage: {
            categories: [],
            data: [],
            total: 0
        },
        inefficientIndexes: {
            categories: [],
            data: [],
            total: 0
        },
        cacheHitRatio: {
            categories: [],
            data: [],
            average: 0,
            min: 0,
            max: 0
        },
        efficiency: {
            categories: [],
            indexes: []
        },
        accessTrend: {
            categories: [],
            reads: [],
            writes: [],
            totalReads: 0,
            totalWrites: 0
        },
        scanSpeed: {
            categories: [],
            data: [],
            average: 0,
            max: 0,
            min: 0
        },
        recentStats: {
            cacheHitRatio: 0,
            avgScanSpeed: 0,
            totalReads: 0,
            totalWrites: 0,
            inefficientCount: 0
        }
    };

    // 요약 카드 데이터 계산 (recentStats 활용)
    const summaryCards: Array<{
        label: string;
        value: string | number;
        desc?: string;
        status?: "info" | "warning" | "critical";
        link?: string;
    }> = [
        {
            label: "평균 캐시 히트율",
            value: dashboard.recentStats ? `${dashboard.recentStats.cacheHitRatio.toFixed(1)}%` : "N/A",
            desc: "최근 데이터 기준",
            status: (dashboard.recentStats?.cacheHitRatio || 0) >= 95 ? "info" :
                (dashboard.recentStats?.cacheHitRatio || 0) >= 90 ? "warning" : "critical",
        },
        {
            label: "평균 스캔 속도",
            value: dashboard.recentStats ? `${dashboard.recentStats.avgScanSpeed.toFixed(2)}ms` : "N/A",
            desc: "최근 데이터 기준",
            status: (dashboard.recentStats?.avgScanSpeed || 0) <= 5 ? "info" :
                (dashboard.recentStats?.avgScanSpeed || 0) <= 10 ? "warning" : "critical",
        },
        {
            label: "비효율 인덱스",
            value: dashboard.recentStats ? dashboard.recentStats.inefficientCount : "N/A",
            desc: "최근 데이터 기준",
            status: (dashboard.recentStats?.inefficientCount || 0) === 0 ? "info" :
                (dashboard.recentStats?.inefficientCount || 0) <= 3 ? "warning" : "critical",
            link: "/database/hotindex/detail",
        },
        {
            label: "총 읽기",
            value: dashboard.recentStats ? dashboard.recentStats.totalReads.toLocaleString() : "N/A",
            desc: "최근 데이터 기준",
            status: "info",
        },
        {
            label: "총 쓰기",
            value: dashboard.recentStats ? dashboard.recentStats.totalWrites.toLocaleString() : "N/A",
            desc: "최근 데이터 기준",
            status: "info",
        },
    ];

    return (
        <div className="hotindex-page">
            {/* 상단 요약 카드 */}
            <div className="hotindex-summary-cards">
                {summaryCards.map((card, idx) => (
                    <SummaryCardWithLink
                        key={idx}
                        label={card.label}
                        value={card.value}
                        desc={card.desc}
                        status={card.status}
                        link={card.link}
                    />
                ))}
            </div>

            {/* 첫 번째 행: 3개 차트 */}
            <ChartGridLayout>
                {/* 인덱스 사용 비중 */}
                <WidgetCard title="인덱스 사용 분포" span={3}>
                    <Chart
                        type="pie"
                        series={dashboard.usageDistribution.data}
                        categories={dashboard.usageDistribution.categories}
                        height={200}
                        colors={["#8E79FF", "#FBBF24", "#FEA29B"]}
                        showLegend={true}
                        customOptions={{
                            chart: {
                                offsetY: 25,
                            },
                            legend: {
                                show: true,
                                position: "right",
                                horizontalAlign: "center",
                                offsetY: 40,
                                offsetX: 30,
                                fontSize: "15px",
                            },
                            dataLabels: {
                                enabled: true,
                                formatter: (_val: number, opts: any) => {
                                    const raw = opts.w.globals.series[opts.seriesIndex];
                                    return raw === 0 ? "" : `${raw}`;
                                },
                            },
                            plotOptions: {
                                pie: {
                                    donut: {
                                        labels: {
                                            show: false,
                                        },
                                    },
                                },
                            },
                        }}
                    />
                </WidgetCard>

                {/* 인덱스 액세스 추이 */}
                <WidgetCard title="인덱스 액세스 추이 (Last 24 Hours)" span={5}>
                    <Chart
                        type="line"
                        series={[
                            { name: "Reads", data: dashboard.accessTrend.reads },
                            { name: "Writes", data: dashboard.accessTrend.writes },
                        ]}
                        categories={dashboard.accessTrend.categories}
                        height={250}
                        colors={["#8E79FF", "#FEA29B"]}
                        customOptions={{
                            annotations: {
                                xaxis: getWriteExceedsAnnotations(
                                    dashboard.accessTrend.categories,
                                    dashboard.accessTrend.reads,
                                    dashboard.accessTrend.writes
                                ),
                            },
                            stroke: {
                                width: 3,
                                curve: "smooth",
                            },
                            markers: {
                                size: 4,
                                hover: { size: 6 },
                            },
                            tooltip: {
                                shared: true,
                                intersect: false,
                                custom: ({ series, dataPointIndex, w }: any) => {
                                    const reads = series[0][dataPointIndex];
                                    const writes = series[1][dataPointIndex];
                                    const time = w.globals.labels[dataPointIndex];
                                    const isWriteHigh = writes > reads;

                                    return `
                                        <div style="padding: 8px 12px; background: white; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
                                            <div style="font-weight: 600; margin-bottom: 6px; color: #111827;">${time}</div>
                                            <div style="display: flex; align-items: center; margin-bottom: 4px;">
                                                <span style="width: 10px; height: 10px; border-radius: 50%; background: #8E79FF; margin-right: 6px;"></span>
                                                <span style="font-size: 13px;">Reads: <strong>${reads.toLocaleString()}</strong></span>
                                            </div>
                                            <div style="display: flex; align-items: center;">
                                                <span style="width: 10px; height: 10px; border-radius: 50%; background: #FEA29B; margin-right: 6px;"></span>
                                                <span style="font-size: 13px;">Writes: <strong>${writes.toLocaleString()}</strong></span>
                                            </div>
                                            ${isWriteHigh ? `<div style="margin-top: 8px; padding: 4px 8px; background: #FEF2F2; border-radius: 4px; font-size: 11px; color: #991B1B; font-weight: 500;">Write 부하 구간</div>` : ''}
                                        </div>
                                    `;
                                },
                            },
                        }}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                        }}
                        yaxisOptions={{
                            title: { text: "액세스 수", style: { fontSize: "12px", color: "#6B7280" } },
                        }}
                    />
                </WidgetCard>

                {/* 인덱스 캐시 적중률 추세 */}
                <WidgetCard title="인덱스 캐시 적중률 추세 (Last 24 Hours)" span={4}>
                    <Chart
                        type="line"
                        series={[{ name: "Index Hit Ratio (%)", data: dashboard.cacheHitRatio.data }]}
                        categories={dashboard.cacheHitRatio.categories}
                        height={250}
                        colors={["#8E79FF"]}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                        }}
                        yaxisOptions={{
                            title: { text: "캐시 히트율 (%)", style: { fontSize: "12px", color: "#6B7280" } },
                        }}
                        customOptions={{
                            annotations: {
                                yaxis: [
                                    {
                                        y: 95,
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
                                            text: "정상: 95%",
                                            position: "right",
                                        },
                                    },
                                    {
                                        y: 90,
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
                                            text: "주의: 90%",
                                            position: "right",
                                        },
                                    },
                                    {
                                        y: 85,
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
                                            text: "경고: 85%",
                                            position: "right",
                                        },
                                    },
                                ],
                            },
                            yaxis: {
                                min: 75,
                                max: 100,
                                labels: {
                                    style: {
                                        colors: "#6B7280",
                                        fontFamily: 'var(--font-family, "Pretendard", sans-serif)'
                                    },
                                    formatter: (val: number) => `${val.toFixed(0)}%`,
                                },
                            },
                            stroke: {
                                width: 3,
                                curve: "smooth",
                            },
                            markers: {
                                size: 4,
                                hover: { size: 6 },
                            },
                        }}
                    />
                </WidgetCard>
            </ChartGridLayout>

            {/* 두 번째 행: 4개 차트 */}
            <ChartGridLayout>
                {/* 인덱스 스캔 속도 추이 */}
                <WidgetCard title="인덱스 스캔 속도 추이 (Last 24 Hours)" span={3}>
                    <Chart
                        type="line"
                        series={[
                            {
                                name: "Index 스캔 속도 (ms)",
                                data: dashboard.scanSpeed.data
                            }
                        ]}
                        categories={dashboard.scanSpeed.categories}
                        height={250}
                        colors={["#8E79FF"]}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        yaxisOptions={{
                            title: { text: "스캔 속도 (ms)", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        customOptions={{
                            annotations: {
                                yaxis: [
                                    {
                                        y: 5,
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
                                            text: "정상: 5ms",
                                            position: "right",
                                        },
                                    },
                                    {
                                        y: 10,
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
                                            text: "주의: 10ms",
                                            position: "right",
                                        },
                                    },
                                    {
                                        y: 20,
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
                                            text: "경고: 20ms",
                                            position: "right",
                                        },
                                    },
                                ],
                            },
                            yaxis: {
                                labels: {
                                    style: {
                                        colors: "#6B7280",
                                        fontFamily: 'var(--font-family, "Pretendard", sans-serif)'
                                    },
                                    formatter: (val: number) => `${val.toFixed(1)}ms`,
                                },
                                min: 0,
                            },
                            stroke: {
                                width: 3,
                                curve: "smooth",
                            },
                            markers: {
                                size: 4,
                                hover: { size: 6 },
                            },
                        }}
                    />
                </WidgetCard>

                {/* 인덱스 효율성 */}
                <WidgetCard title="인덱스 효율성 (Scatter)" span={3}>
                    <Chart
                        type="scatter"
                        series={[{ name: "Indexes", data: dashboard.efficiency.indexes }]}
                        categories={[]}
                        height={250}
                        colors={["#8E79FF"]}
                        xaxisOptions={{
                            title: { text: "사용 횟수", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        yaxisOptions={{
                            title: { text: "인덱스 효율성 (%)", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: {
                                formatter: (val) => Math.round(val).toString()
                            }
                        }}
                    />
                </WidgetCard>

                {/* Top-5 인덱스 사용량 */}
                <WidgetCard title="Top-5 인덱스 사용량 (Last 24 Hours)" span={3}>
                    <Chart
                        type="bar"
                        series={[{ name: "Index Scans", data: dashboard.topUsage.data }]}
                        categories={dashboard.topUsage.categories}
                        height={250}
                        colors={["#8E79FF"]}
                        xaxisOptions={{
                            title: { text: "인덱스명", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        yaxisOptions={{
                            title: { text: "Index 스캔", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                    />
                </WidgetCard>

                {/* 비효율 인덱스 Top-5 */}
                <WidgetCard title="Top-5 비효율 인덱스" span={3}>
                    <Chart
                        type="bar"
                        series={[{ name: "Inefficiency Score", data: dashboard.inefficientIndexes.data }]}
                        categories={dashboard.inefficientIndexes.categories}
                        height={250}
                        colors={["#FEA29B"]}
                        xaxisOptions={{
                            title: { text: "인덱스명", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        yaxisOptions={{
                            title: { text: "비효율성 점수", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                    />
                </WidgetCard>
            </ChartGridLayout>
        </div>
    );
}