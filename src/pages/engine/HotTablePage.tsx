import { useQuery } from "@tanstack/react-query";
import Chart from "../../components/chart/ChartComponent";
import GaugeChart from "../../components/chart/GaugeChart";
import SummaryCard from "../../components/util/SummaryCard";
import "../../styles/engine/hottable.css";
import WidgetCard from "../../components/util/WidgetCard";
import ChartGridLayout from "../../components/layout/ChartGridLayout";
import apiClient from "../../api/apiClient";
import { useInstanceContext } from "../../context/InstanceContext";

/** 백엔드 API 응답 타입 - 실제 응답 구조에 맞춤 */
interface HotTableData {
    topTables: {
        topBySize: Array<{
            schemaName: string;
            tableName: string;
            value: number;
            percentage: number;
            status: string;
        }>;
        topByScan: Array<{
            schemaName: string;
            tableName: string;
            value: number;
            percentage: number;
            status: string;
        }>;
        topByBloat: Array<{
            schemaName: string;
            tableName: string;
            value: number;
            percentage: number;
            status: string;
        }>;
    };
    tableActivity: {
        categories: string[];
        seqScans: number[];
        idxScans: number[];
        inserts: number[];
        updates: number[];
        deletes: number[];
    };
    cacheHitRatio: {
        categories: string[];
        data: number[];
        average: number;
        max: number;
        min: number;
    };
    bloatStatus: {
        categories: string[];
        data: number[];
        normalCount: number;
        warningCount: number;
        criticalCount: number;
    };
    vacuumStatus: {
        categories: string[];
        delaySeconds: number[];
        avgDelaySeconds: number;
        maxDelaySeconds: number;
    };
    recentStats: {
        totalTables: number;
        activeTables: number;
        avgCacheHitRatio: number;
        totalSeqScans: number;
        totalIdxScans: number;
        highBloatTables: number;
    };
}

/** API 요청 - instanceId와 databaseId를 쿼리 파라미터로 전달 */
async function fetchHotTableData(instanceId: number, databaseId?: number) {
    try {
        const params: any = { instanceId };
        if (databaseId) {
            params.databaseId = databaseId;
        }
        const response = await apiClient.get<HotTableData>("/engine/hottable", { params });
        return response.data;
    } catch (error) {
        console.error("HotTable API Error:", error);
        // 에러가 발생해도 빈 데이터 반환
        return null;
    }
}

const getCacheGaugeStatus = (value: number): "info" | "warning" | "critical" => {
    if (value >= 95) return "info";
    if (value >= 85) return "warning";
    return "critical";
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

/** 메인 컴포넌트 */
export default function HotTablePage() {
    const { selectedInstance, selectedDatabase } = useInstanceContext();
    
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["hottableDashboard", selectedInstance?.instanceId, selectedDatabase?.databaseId],
        queryFn: () => fetchHotTableData(selectedInstance!.instanceId, selectedDatabase?.databaseId),
        retry: false, // 재시도 비활성화
        enabled: !!selectedInstance && !!selectedDatabase, // 인스턴스와 데이터베이스가 모두 선택되었을 때만 실행
    });

    // 인스턴스가 선택되지 않은 경우
    if (!selectedInstance) {
        return (
            <div className="hottable-page">
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
            <div className="hottable-page">
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

    if (isLoading) {
        return (
            <div className="hottable-page">
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

    if (isError) {
        return (
            <div className="hottable-page">
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
        topTables: {
            topBySize: [],
            topByScan: [],
            topByBloat: []
        },
        tableActivity: {
            categories: [],
            seqScans: [],
            idxScans: [],
            inserts: [],
            updates: [],
            deletes: []
        },
        cacheHitRatio: {
            categories: [],
            data: [],
            average: 0,
            max: 0,
            min: 0
        },
        bloatStatus: {
            categories: [],
            data: [],
            normalCount: 0,
            warningCount: 0,
            criticalCount: 0
        },
        vacuumStatus: {
            categories: [],
            delaySeconds: [],
            avgDelaySeconds: 0,
            maxDelaySeconds: 0
        },
        recentStats: {
            totalTables: 0,
            activeTables: 0,
            avgCacheHitRatio: 0,
            totalSeqScans: 0,
            totalIdxScans: 0,
            highBloatTables: 0
        }
    };
    const cacheGaugeStatus = getCacheGaugeStatus(dashboard.cacheHitRatio.average);

    // Summary Cards 데이터
    const summaryCards: Array<{
        label: string;
        value: string | number;
        desc?: string;
        status?: "info" | "warning" | "critical";
        link?: string;
    }> = [
        {
            label: "전체 테이블",
            value: dashboard.recentStats.totalTables,
            desc: "Total Tables",
            status: "info",
        },
        {
            label: "활성 테이블",
            value: dashboard.recentStats.activeTables,
            desc: "Active Tables",
            status: "info",
        },
        {
            label: "평균 캐시 히트율",
            value: `${dashboard.recentStats.avgCacheHitRatio.toFixed(1)}%`,
            desc: "Average Cache Hit Ratio",
            status: dashboard.recentStats.avgCacheHitRatio >= 90 ? "info" : "warning",
        },
        {
            label: "총 Sequential Scan",
            value: dashboard.recentStats.totalSeqScans.toLocaleString(),
            desc: "Total Seq Scans",
            status: "info",
        },
        {
            label: "총 Index Scan",
            value: dashboard.recentStats.totalIdxScans.toLocaleString(),
            desc: "Total Index Scans",
            status: "info",
        },
        {
            label: "High Bloat 테이블",
            value: dashboard.recentStats.highBloatTables,
            desc: "Tables with ≥15% Bloat",
            status: dashboard.recentStats.highBloatTables > 0 ? "warning" : "info",
            link: "/engine/hottable/list",
        },
    ];

    return (
        <div className="hottable-page">
            {/* 상단 요약 카드 */}
            <div className="hottable-summary-cards">
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

            {/* 첫 번째 행 */}
            <ChartGridLayout>
                {/* Cache Hit Ratio Gauge */}
                <WidgetCard title="평균 Cache Hit Ratio" span={3}>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        width: '100%',
                        paddingTop: '20px',
                    }}>
                        <GaugeChart
                            value={dashboard.cacheHitRatio.average}
                            status={cacheGaugeStatus}
                            type="semi-circle"
                            radius={100}
                            strokeWidth={20}
                            height={200}
                            flattenRatio={0.89}
                        />
                        <div style={{
                            display: 'flex',
                            gap: '2rem',
                            marginTop: '1rem',
                            fontSize: '14px',
                            color: '#6B7280'
                        }}>
                            <div>
                                <span>최대: </span>
                                <span style={{ fontWeight: 'bold' }}>{dashboard.cacheHitRatio.max.toFixed(1)}%</span>
                            </div>
                            <div>
                                <span>최소: </span>
                                <span style={{ fontWeight: 'bold' }}>{dashboard.cacheHitRatio.min.toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>
                </WidgetCard>

                {/* Table Activity */}
                <WidgetCard title="테이블 활동 추이 (Last 24 Hours)" span={9}>
                    <Chart
                        type="line"
                        series={[
                            { name: "Seq Scan", data: dashboard.tableActivity.seqScans },
                            { name: "Index Scan", data: dashboard.tableActivity.idxScans },
                            { name: "Insert", data: dashboard.tableActivity.inserts },
                            { name: "Update", data: dashboard.tableActivity.updates },
                            { name: "Delete", data: dashboard.tableActivity.deletes },
                        ]}
                        categories={dashboard.tableActivity.categories}
                        colors={["#FEA29B", "#8E79FF", "#77B2FB", "#FBBF24", "#EF4444"]}
                        height={250}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        yaxisOptions={{
                            title: { text: "작업 횟수", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                    />
                </WidgetCard>
            </ChartGridLayout>

            {/* 두 번째 행 */}
            <ChartGridLayout>
                {/* Cache Hit Ratio 추이 */}
                <WidgetCard title="캐시 히트율 추이 (Last 24 Hours)" span={4}>
                    <Chart
                        type="line"
                        series={[{ name: "Cache Hit Ratio", data: dashboard.cacheHitRatio.data }]}
                        categories={dashboard.cacheHitRatio.categories}
                        colors={["#8E79FF"]}
                        height={250}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        yaxisOptions={{
                            title: { text: "Cache Hit (%)", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        customOptions={{
                            yaxis: {
                                min: 0,
                                max: 100,
                                labels: {
                                    formatter: (val: number) => `${val.toFixed(0)}%`,
                                },
                            },
                            annotations: {
                                yaxis: [
                                    {
                                        y: 90,
                                        borderColor: "#60A5FA",
                                        strokeDashArray: 4,
                                        label: {
                                            text: "목표: 90%",
                                            style: {
                                                color: "#fff",
                                                background: "#60A5FA",
                                            },
                                        },
                                    },
                                ],
                            },
                        }}
                    />
                </WidgetCard>

                {/* Bloat Status */}
                <WidgetCard title="테이블 Bloat 상태" span={4}>
                    <Chart
                        type="bar"
                        series={[{ name: "Bloat (%)", data: dashboard.bloatStatus.data }]}
                        categories={dashboard.bloatStatus.categories}
                        colors={["#EF4444"]}
                        height={250}
                        xaxisOptions={{
                            title: { text: "테이블명", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        yaxisOptions={{
                            title: { text: "Bloat (%)", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        customOptions={{
                            plotOptions: {
                                bar: {
                                    distributed: true,
                                    horizontal: false,
                                },
                            },
                            annotations: {
                                yaxis: [
                                    {
                                        y: 15,
                                        borderColor: "#FBBF24",
                                        strokeDashArray: 4,
                                        label: {
                                            text: "주의: 15%",
                                            style: {
                                                color: "#fff",
                                                background: "#FBBF24",
                                            },
                                        },
                                    },
                                    {
                                        y: 30,
                                        borderColor: "#EF4444",
                                        strokeDashArray: 4,
                                        label: {
                                            text: "위험: 30%",
                                            style: {
                                                color: "#fff",
                                                background: "#EF4444",
                                            },
                                        },
                                    },
                                ],
                            },
                        }}
                    />
                </WidgetCard>

                {/* Vacuum Status */}
                <WidgetCard title="Vacuum 지연 시간" span={4}>
                    <Chart
                        type="bar"
                        series={[{ name: "지연 시간 (초)", data: dashboard.vacuumStatus.delaySeconds }]}
                        categories={dashboard.vacuumStatus.categories}
                        colors={["#F59E0B"]}
                        height={250}
                        xaxisOptions={{
                            title: { text: "테이블명", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        yaxisOptions={{
                            title: { text: "지연 시간 (시간)", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        customOptions={{
                            plotOptions: {
                                bar: {
                                    distributed: true,
                                    horizontal: false,
                                },
                            },
                            yaxis: {
                                labels: {
                                    formatter: (val: number) => `${(val / 3600).toFixed(1)}h`,
                                },
                            },
                        }}
                    />
                </WidgetCard>
            </ChartGridLayout>

            {/* 세 번째 행 */}
            <ChartGridLayout>
                {/* Top Tables by Size */}
                <WidgetCard title="Top-5 테이블 (크기)" span={4}>
                    <Chart
                        type="bar"
                        series={[{
                            name: "크기",
                            data: dashboard.topTables.topBySize.map(t => t.value)
                        }]}
                        categories={dashboard.topTables.topBySize.map(t => t.tableName)}
                        colors={["#8E79FF"]}
                        height={250}
                        xaxisOptions={{
                            title: { text: "테이블명", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        yaxisOptions={{
                            title: { text: "크기", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        customOptions={{
                            plotOptions: {
                                bar: {
                                    distributed: true,
                                    horizontal: false,
                                },
                            },
                            yaxis: {
                                labels: {
                                    formatter: (val: number) => {
                                        if (val >= 1024 * 1024 * 1024) {
                                            return `${(val / (1024 * 1024 * 1024)).toFixed(1)}GB`;
                                        } else if (val >= 1024 * 1024) {
                                            return `${(val / (1024 * 1024)).toFixed(0)}MB`;
                                        } else {
                                            return `${(val / 1024).toFixed(0)}KB`;
                                        }
                                    },
                                },
                            },
                        }}
                    />
                </WidgetCard>

                {/* Top Tables by Scan */}
                <WidgetCard title="Top-5 테이블 (스캔)" span={4}>
                    <Chart
                        type="bar"
                        series={[{
                            name: "스캔 횟수",
                            data: dashboard.topTables.topByScan.map(t => t.value)
                        }]}
                        categories={dashboard.topTables.topByScan.map(t => t.tableName)}
                        colors={["#77B2FB"]}
                        height={250}
                        xaxisOptions={{
                            title: { text: "테이블명", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        yaxisOptions={{
                            title: { text: "스캔 횟수", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        customOptions={{
                            plotOptions: {
                                bar: {
                                    distributed: true,
                                    horizontal: false,
                                },
                            },
                        }}
                    />
                </WidgetCard>

                {/* Top Tables by Bloat */}
                <WidgetCard title="Top-5 테이블 (Bloat)" span={4}>
                    <Chart
                        type="bar"
                        series={[{
                            name: "Bloat (%)",
                            data: dashboard.topTables.topByBloat.map(t => t.value)
                        }]}
                        categories={dashboard.topTables.topByBloat.map(t => t.tableName)}
                        colors={["#FEA29B"]}
                        height={250}
                        xaxisOptions={{
                            title: { text: "테이블명", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        yaxisOptions={{
                            title: { text: "Bloat (%)", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        customOptions={{
                            plotOptions: {
                                bar: {
                                    distributed: true,
                                    horizontal: false,
                                },
                            },
                        }}
                    />
                </WidgetCard>
            </ChartGridLayout>
        </div>
    );
}