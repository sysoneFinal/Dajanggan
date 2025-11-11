import { useQuery } from "@tanstack/react-query";
import Chart from "../../components/chart/ChartComponent";
import GaugeChart from "../../components/chart/GaugeChart";
import SummaryCard from "../../components/util/SummaryCard";
import "../../styles/engine/hottable.css";
import WidgetCard from "../../components/util/WidgetCard";
import ChartGridLayout from "../../components/layout/ChartGridLayout";
import apiClient from "../../api/apiClient";

/** Hot Table API 응답 타입 */
interface HotTableData {
    cacheHitRatio: {
        tableName: string;
        value: number;
        bufferHits: number;
        diskReads: number;
    };
    vacuumDelayTrend: {
        categories: string[];
        tables: Array<{
            name: string;
            data: number[];
        }>;
    };
    deadTupleTrend: {
        categories: string[];
        tables: Array<{
            name: string;
            data: number[];
        }>;
    };
    totalDeadTuple: {
        categories: string[];
        data: number[];
        total: number;
        average: number;
        max: number;
    };
    topQueryTables: {
        tableNames: string[];
        seqScanCounts: number[];
        indexScanCounts: number[];
    };
    topDmlTables: {
        tableNames: string[];
        insertCounts: number[];
        updateCounts: number[];
        deleteCounts: number[];
    };
    recentStats?: {
        hotUpdateRatio: number;
        liveDeadTupleRatio: string;
        deadTupleCount: number;
        seqScanRatio: number;
        updateDeleteRatio: number;
        avgVacuumDelay: number;
        totalBloat: number;
    };
}
/** API 요청 - apiClient 사용 */
async function fetchHotTableData() {
    const response = await apiClient.get<HotTableData>("/dashboard/hotTable");
    return response.data;
}


const getCacheGaugeStatus = (value: number): "normal" | "warning" | "critical" => {
    if (value >= 95) return "normal";
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
                    {/* 외부 링크 아이콘 SVG */}
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
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["hottableDashboard"],
        queryFn: fetchHotTableData,
        retry: 1,
    });
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

    const cacheGaugeStatus = getCacheGaugeStatus(dashboard.cacheHitRatio.value);

    const recentStats = dashboard.recentStats || {
        hotUpdateRatio: 0,
        liveDeadTupleRatio: 0,
        deadTupleCount: 0,
        seqScanRatio: 0,
        updateDeleteRatio: 0,
        avgVacuumDelay: 0,
        totalBloat: 0,
    };

    const summaryCards = [
        {
            label: "평균 Vacuum 지연",
            value: `${recentStats.avgVacuumDelay}시간`,
            desc: "최근 5분 평균",
            status: recentStats.avgVacuumDelay > 12 ? "warning" : "info"
        },
        {
            label: "Live/Dead Tuple 비율",
            value: recentStats.liveDeadTupleRatio,
            desc: "최근 5분 평균",
            status: "info" as const,
            link: "/dashboard/hot-table/list",
        },
        {
            label: "Dead Tuple 수",
            value: recentStats.deadTupleCount.toLocaleString(),
            desc: "최근 5분 누적",
            status: recentStats.deadTupleCount > 10000 ? ("warning" as const) : ("info" as const),
            link: "/dashboard/hot-table/list",
        },
        {
            label: "Seq Scan 비율",
            value: `${recentStats.seqScanRatio}%`,
            desc: "최근 5분 평균",
            status: recentStats.seqScanRatio > 30 ? ("warning" as const) : ("info" as const),
            link: "/dashboard/hot-table/list",
        },
        {
            label: "전체 Bloat 크기",
            value: `${recentStats.totalBloat}GB`,
            desc: "최근 5분 누적",
            status: recentStats.totalBloat > 10 ? "warning" : "info"
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
                    />
                ))}
            </div>

            {/* 첫 번째 행: 3개 차트 */}
            <ChartGridLayout>
                <WidgetCard title={`Top Cache Hit Ratio`} span={2}>
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
                            value={dashboard.cacheHitRatio.value}
                            status={cacheGaugeStatus}
                            type="semi-circle"
                            radius={100}
                            strokeWidth={20}
                            height={200}
                            flattenRatio={0.89}
                        />
                        <div className="cpu-gauge-details">
                            <div className="cpu-detail-item">
                                <span className="cpu-detail-label">Top table</span>
                                <span className="cpu-detail-value">{(dashboard.cacheHitRatio.tableName)}</span>
                            </div>
                            <div className="cpu-detail-divider"></div>
                            <div className="cpu-detail-item">
                                <span className="cpu-detail-label">Disk Reads</span>
                                <span className="cpu-detail-value">{(dashboard.cacheHitRatio.diskReads / 1000).toFixed(1)}K</span>
                            </div>
                        </div>
                    </div>
                </WidgetCard>

                {/* Vacuum 지연 시간 추이 - 임계치 적용 */}
                <WidgetCard title="Top-3 Vacuum 지연 테이블 (Last 24 Hours)" span={5}>
                    <Chart
                        type="line"
                        series={dashboard.vacuumDelayTrend.tables.map((table) => ({
                            name: table.name,
                            data: table.data,
                        }))}
                        categories={dashboard.vacuumDelayTrend.categories}
                        colors={["#8E79FF", "#FEA29B", "#77B2FB"]}
                        height={250}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        yaxisOptions={{
                            title: { text: "Vacuum Delay (초)", style: { fontSize: "12px", color: "#6B7280" } }
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
                                            text: "정상: 5초",
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
                                            text: "주의: 10초",
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
                                    formatter: (val: number) => `${val.toFixed(1)}s`,
                                },
                                min: 0,
                                max: 12,
                            },
                        }}
                    />
                </WidgetCard>

                {/* 테이블별 Dead Tuple 추이 - 임계치 적용 */}
                <WidgetCard title="Top-3 Dead Tuple 테이블 (Last 24 Hours)" span={5}>
                    <Chart
                        type="line"
                        series={dashboard.deadTupleTrend.tables.map((table) => ({
                            name: table.name,
                            data: table.data,
                        }))}
                        categories={dashboard.deadTupleTrend.categories}
                        colors={["#8E79FF", "#77B2FB", "#FEA29B"]}
                        height={250}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        yaxisOptions={{
                            title: { text: "Dead Tuples", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        customOptions={{
                            annotations: {
                                yaxis: [
                                    {
                                        y: 1500,
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
                                            text: "정상: 1.5K",
                                            position: "right",
                                        },
                                    },
                                    {
                                        y: 3000,
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
                                            text: "주의: 3K",
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
                                    formatter: (val: number) => `${(val / 1000).toFixed(1)}K`,
                                },
                                min: 0,
                                max: 4000,
                            },
                        }}
                    />
                </WidgetCard>
            </ChartGridLayout>

            {/* 두 번째 행: 3개 차트 */}
            <ChartGridLayout>
                {/* DB 전체 Dead Tuple 추이 - 임계치 적용 */}
                <WidgetCard title="DB 전체 Dead Tuple 추이 (Last 24 Hours)" span={4}>
                    <Chart
                        type="line"
                        series={[{ name: "Total Dead Tuples", data: dashboard.totalDeadTuple.data }]}
                        categories={dashboard.totalDeadTuple.categories}
                        colors={["#8E79FF"]}
                        height={250}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        yaxisOptions={{
                            title: { text: "Total Dead Tuples", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        customOptions={{
                            annotations: {
                                yaxis: [
                                    {
                                        y: 20000,
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
                                            text: "정상: 20K",
                                            position: "right",
                                        },
                                    },
                                    {
                                        y: 35000,
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
                                            text: "주의: 35K",
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
                                    formatter: (val: number) => `${(val / 1000).toFixed(0)}K`,
                                },
                                min: 0,
                                max: 45000,
                            },
                        }}
                    />
                </WidgetCard>
                {/* Top-5 테이블 조회량 - Seq Scan / Index Scan 구분 */}
                <WidgetCard title="Top-5 테이블 조회량 (Last 24 Hours)" span={4}>
                    <Chart
                        type="bar"
                        series={[
                            { name: "Seq Scan", data: dashboard.topQueryTables.seqScanCounts },
                            { name: "Index Scan", data: dashboard.topQueryTables.indexScanCounts },
                        ]}
                        categories={dashboard.topQueryTables.tableNames}
                        colors={["#FEA29B", "#8E79FF"]}
                        height={250}
                        xaxisOptions={{
                            title: { text: "테이블명", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        yaxisOptions={{
                            title: { text: "조회 횟수", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        isStacked={true}
                    />
                </WidgetCard>

                {/* Top-5 테이블 DML량 */}
                <WidgetCard title="Top-5 테이블 DML량 (Last 24 Hours)" span={4}>
                    <Chart
                        type="bar"
                        series={[
                            { name: "Delete", data: dashboard.topDmlTables.deleteCounts },
                            { name: "Insert", data: dashboard.topDmlTables.insertCounts },
                            { name: "Update", data: dashboard.topDmlTables.updateCounts },
                        ]}
                        categories={dashboard.topDmlTables.tableNames}
                        colors={["#FEA29B", "#8E79FF", "#77B2FB"]}
                        height={250}
                        xaxisOptions={{
                            title: { text: "테이블명", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        yaxisOptions={{
                            title: { text: "DML 횟수", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        isStacked={true}
                    />

                </WidgetCard>
            </ChartGridLayout>
        </div>
    );
}