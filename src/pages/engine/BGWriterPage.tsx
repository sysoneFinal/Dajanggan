import { useQuery } from "@tanstack/react-query";
import Chart from "../../components/chart/ChartComponent";
import GaugeChart from "../../components/chart/GaugeChart";
import SummaryCard from "../../components/util/SummaryCard";
import "../../styles/engine/bgwriter.css";
import WidgetCard from "../../components/util/WidgetCard";
import ChartGridLayout from "../../components/layout/ChartGridLayout";
import apiClient from "../../api/apiClient";

/** BGWriter API 응답 타입 */
interface BGWriterData {
    backendFlushRatio: {
        value: number;
        buffersClean: number;
        buffersBackend: number;
    };
    cleanRate: {
        categories: string[];
        data: number[];
        average: number;
        max: number;
        min: number;
    };
    bufferFlushRatio: {
        categories: string[];
        backend: number[];
        clean: number[];
        backendTotal: number;
        cleanTotal: number;
    };
    maxwrittenClean: {
        categories: string[];
        data: number[];
        average: number;
        total: number;
    };
    bgwriterVsCheckpoint: {
        categories: string[];
        bgwriter: number[];
        checkpoint: number[];
        bgwriterTotal: number;
        checkpointTotal: number;
    };
    bufferReuseRate: {
        categories: string[];
        data: number[];
        average: number;
        max: number;
        min: number;
    };
    recentStats?: {
        bgwriterActivityRate?: number;
        cleanBufferReuseRate: number;
        backendFsyncCount?: number;
        bufferPoolUsageRate: number;
        checkpointInterruptionCount: number;
        dirtyBufferAccumulationRate: number;
    };
}

/** API 요청 - apiClient 사용 */
async function fetchBGWriterData() {
    const response = await apiClient.get<BGWriterData>("/engine/bgwriter");
    return response.data;
}

/**
 * Backend Flush 비율 게이지 상태 판단
 * - 0~30%: 정상 (BGWriter가 충분히 동작)
 * - 30~50%: 주의 (Backend 직접 쓰기 증가)
 * - 50% 이상: 경고 (BGWriter 튜닝 필요)
 */
const getBackendFlushGaugeStatus = (
    value: number
): "normal" | "warning" | "critical" => {
    if (value < 30) return "normal";
    if (value < 50) return "warning";
    return "critical";
};

/** 메인 컴포넌트 */
export default function BGWriterPage() {
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["bgwriterDashboard"],
        queryFn: fetchBGWriterData,
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
    const gaugeStatus = getBackendFlushGaugeStatus(dashboard.backendFlushRatio.value);

    const recentStats = dashboard.recentStats || {
        bgwriterActivityRate: 0,
        cleanBufferReuseRate: 0,
        backendFsyncCount: 0,
        bufferPoolUsageRate: 0,
        checkpointInterruptionCount: 0,
        dirtyBufferAccumulationRate: 0,
    };

    const summaryCards = [
        {
            label: "BGWriter 활동률",
            value: `${recentStats.bgwriterActivityRate}%`,
            desc: "최근 5분 평균",
            status: (recentStats.bgwriterActivityRate || 0) < 50
                ? "warning"
                : "info"
        },
        {
            label: "Buffer Pool 사용률",
            value: `${recentStats.bufferPoolUsageRate}%`,
            desc: "최근 5분 평균",
            status: recentStats.bufferPoolUsageRate < 85
                ? ("warning" as const)
                : ("info" as const),
        },
        {
            label: "Checkpoint에 의한 BGWriter 중단",
            value: `${recentStats.checkpointInterruptionCount}회`,
            desc: "최근 1시간",
            status: recentStats.checkpointInterruptionCount > 20
                ? ("warning" as const)
                : ("info" as const),
        },
        {
            label: "Clean Buffer 재사용률",
            value: `${recentStats.cleanBufferReuseRate}%`,
            desc: "최근 5분 평균",
            status: recentStats.cleanBufferReuseRate > 70
                ? ("info" as const)
                : ("warning" as const),
        },
        {
            label: "Dirty Buffer 누적률",
            value: `${recentStats.dirtyBufferAccumulationRate}%`,
            desc: "최근 5분 평균",
            status: recentStats.dirtyBufferAccumulationRate > 30
                ? ("warning" as const)
                : ("info" as const),
        },
        {
            label: "Backend Fsync 발생",
            value: `${recentStats.backendFsyncCount}회`,
            desc: "최근 1시간",
            status: (recentStats.backendFsyncCount || 0) > 10
                ? ("warning" as const)
                : ("info" as const),
        },
    ];

    return (
        <div className="bgwriter-page">
            {/* Summary Cards */}
            <div className="bgwriter-summary-cards">
                {summaryCards.map((card, index) => (
                    <SummaryCard
                        key={index}
                        label={card.label}
                        value={card.value}
                        desc={card.desc}
                        status={card.status}
                    />
                ))}
            </div>

            {/* Charts */}
            <ChartGridLayout>
                {/* Backend Flush 비율 게이지 */}
                <WidgetCard title="Backend Flush 비율" span={2}>
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
                            value={dashboard.backendFlushRatio.value}
                            status={gaugeStatus}
                            type="semi-circle"
                            radius={100}
                            strokeWidth={20}
                            height={200}
                            flattenRatio={0.89}
                        />
                        <div className="cpu-gauge-details">
                            <div className="cpu-detail-item">
                                <span className="cpu-detail-label">Clean</span>
                                <span className="cpu-detail-value">{dashboard.backendFlushRatio.buffersClean.toLocaleString()}</span>
                            </div>
                            <div className="cpu-detail-divider"></div>
                            <div className="cpu-detail-item">
                                <span className="cpu-detail-label">Backend</span>
                                <span className="cpu-detail-value">{dashboard.backendFlushRatio.buffersBackend.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </WidgetCard>



                {/* Buffer Flush 비율 비교 */}
                <WidgetCard title="Buffer Flush 비율 (Backend vs Clean)" span={5}>
                    <Chart
                        type="line"
                        series={[
                            { name: "Backend", data: dashboard.bufferFlushRatio.backend },
                            { name: "Clean", data: dashboard.bufferFlushRatio.clean }
                        ]}
                        categories={dashboard.bufferFlushRatio.categories}
                        colors={["#8E79FF", "#FEA29B"]}
                        height={250}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        yaxisOptions={{
                            title: { text: "Buffer 수", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        customOptions={{
                            annotations: {
                                yaxis: [
                                    {
                                        y: 3000,
                                        borderColor: "#60A5FA",
                                        strokeDashArray: 4,
                                        opacity: 0.6,
                                        label: {
                                            borderColor: "#60A5FA",
                                            style: {
                                                color: "#fff",
                                                background: "#60a5fa",
                                                fontSize: "11px",
                                                fontWeight: 500,
                                            },
                                            text: "정상: 3000",
                                            position: "right",
                                        },
                                    },
                                    {
                                        y: 2000,
                                        borderColor: "#fbbf24",
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
                                            text: "주의: 2000",
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
                                },
                                min: 0,
                            },
                        }}
                    />
                </WidgetCard>

                {/* BGWriter vs Checkpoint - 24시간 유지 */}
                <WidgetCard title="BGWriter vs Checkpoint (최근 24시간)" span={5}>
                    <Chart
                        type="line"
                        series={[
                            { name: "BGWriter", data: dashboard.bgwriterVsCheckpoint.bgwriter },
                            { name: "Checkpoint", data: dashboard.bgwriterVsCheckpoint.checkpoint }
                        ]}
                        categories={dashboard.bgwriterVsCheckpoint.categories}
                        colors={["#8E79FF", "#FEA29B"]}
                        height={250}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        yaxisOptions={{
                            title: { text: "Buffer 수", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                    />
                </WidgetCard>

            </ChartGridLayout>
            <ChartGridLayout>
                {/* Clean Rate - 24시간 유지 */}
                <WidgetCard title="Clean Rate (최근 24시간)" span={4}>
                    <Chart
                        type="line"
                        series={[{ name: "Clean Rate", data: dashboard.cleanRate.data }]}
                        categories={dashboard.cleanRate.categories}
                        colors={["#8E79FF", "#FEA29B"]}
                        height={250}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        yaxisOptions={{
                            title: { text: "Clean Rate", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: {
                                formatter: (val) => Math.round(val),
                            },
                        }}
                    />
                </WidgetCard>

                {/* Maxwritten Clean 발생 횟수 - 24시간 유지 */}
                <WidgetCard title="Clean 스캔 상한 도달 추이 (최근 24시간)" span={4}>
                    <Chart
                        type="line"
                        series={[{ name: "Maxwritten Clean", data: dashboard.maxwrittenClean.data }]}
                        categories={dashboard.maxwrittenClean.categories}
                        colors={["#8E79FF"]}
                        height={250}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        yaxisOptions={{
                            title: { text: "Maxwritten Clean (회)", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: {
                                formatter: (val) => Math.round(val),
                            },
                        }}
                        customOptions={{
                            annotations: {
                                yaxis: [
                                    {
                                        y: 100,
                                        borderColor: "#FEA29B",
                                        strokeDashArray: 4,
                                        opacity: 0.7,
                                        label: {
                                            borderColor: "#FEA29B",
                                            style: {
                                                color: "#fff",
                                                background: "#FEA29B",
                                                fontSize: "11px",
                                                fontWeight: 500,
                                            },
                                            text: "경고: 100회",
                                            position: "right",
                                        },
                                    },
                                    {
                                        y: 50,
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
                                            text: "주의: 50회",
                                            position: "right",
                                        },
                                    },
                                    {
                                        y: 20,
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
                                            text: "정상: 20회",
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
                                },
                                min: 0,
                            },
                        }}
                    />
                </WidgetCard>

                {/* Buffer 재사용률 - 24시간 유지 */}
                <WidgetCard title="Buffer 재사용률 (최근 24시간)" span={4}>
                    <Chart
                        type="line"
                        series={[{ name: "Buffer Reuse Rate", data: dashboard.bufferReuseRate.data }]}
                        categories={dashboard.bufferReuseRate.categories}
                        colors={["#8E79FF"]}
                        height={250}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        yaxisOptions={{
                            title: { text: "재사용률 (%)", style: { fontSize: "12px", color: "#6B7280" } }
                        }}

                        customOptions={{
                            annotations: {
                                yaxis: [
                                    {
                                        y: 90,
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
                                            text: "양호: 90%",
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
                                        y: 70,
                                        borderColor: "#FEA29B",
                                        strokeDashArray: 4,
                                        opacity: 0.7,
                                        label: {
                                            borderColor: "#FEA29B",
                                            style: {
                                                color: "#fff",
                                                background: "#FEA29B",
                                                fontSize: "11px",
                                                fontWeight: 500,
                                            },
                                            text: "경고: 70%",
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
                                    formatter: (val: number) => `${val}%`,
                                },
                                min: 0,
                                max: 100,
                            },
                        }}
                    />
                </WidgetCard>
            </ChartGridLayout>
        </div>
    );
}