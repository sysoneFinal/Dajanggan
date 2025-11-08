import { useQuery } from "@tanstack/react-query";
import Chart from "../../components/chart/ChartComponent";
import GaugeChart from "../../components/chart/GaugeChart";
import SummaryCard from "../../components/util/SummaryCard";
import "../../styles/engine/bgwriter.css";
import WidgetCard from "../../components/util/WidgetCard";
import ChartGridLayout from "../../components/layout/ChartGridLayout";

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

/** 더미 데이터 */
const mockData: BGWriterData = {
    backendFlushRatio: {
        value: 35.7,
        buffersClean: 28420,
        buffersBackend: 15680,
    },
    cleanRate: {
        categories: [
            "0:00", "2:00", "4:00", "6:00", "8:00", "10:00",
            "12:00", "14:00", "16:00", "18:00", "20:00", "23:00"
        ],
        data: [110, 95, 180, 195, 170, 115, 110, 95, 100, 120, 105, 115],
        average: 126,
        max: 195,
        min: 95,
    },
    recentStats: {
        bgwriterActivityRate: 65,
        cleanBufferReuseRate: 78,
        backendFsyncCount: 0,
        bufferPoolUsageRate: 87.2,
        checkpointInterruptionCount: 12,
        dirtyBufferAccumulationRate: 23.5,
    },
    bufferFlushRatio: {
        categories: [
            "0:00", "2:00", "4:00", "6:00", "8:00", "10:00",
            "12:00", "14:00", "16:00", "18:00", "20:00", "23:00"
        ],
        backend: [1500, 2000, 3500, 4000, 3800, 2500, 1800, 2200, 2800, 3200, 3500, 3300],
        clean: [3500, 3000, 2500, 2000, 2200, 3500, 4200, 3800, 3200, 2800, 2500, 2700],
        backendTotal: 34100,
        cleanTotal: 36000,
    },
    maxwrittenClean: {
        categories: [
            "0:00", "2:00", "4:00", "6:00", "8:00", "10:00",
            "12:00", "14:00", "16:00", "18:00", "20:00", "23:00"
        ],
        data: [45, 30, 65, 90, 65, 50, 95, 100, 70, 55, 50, 45],
        average: 63,
        total: 760,
    },
    bgwriterVsCheckpoint: {
        categories: [
            "0:00", "2:00", "4:00", "6:00", "8:00", "10:00",
            "12:00", "14:00", "16:00", "18:00", "20:00", "23:00"
        ],
        bgwriter: [1000, 1500, 2000, 1800, 1200, 1000, 2500, 2200, 1800, 1500, 1300, 1700],
        checkpoint: [4000, 3500, 2800, 3000, 2500, 2200, 1000, 1500, 2000, 2500, 3000, 3200],
        bgwriterTotal: 19500,
        checkpointTotal: 31200,
    },
    bufferReuseRate: {
        categories: [
            "0:00", "2:00", "4:00", "6:00", "8:00", "10:00",
            "12:00", "14:00", "16:00", "18:00", "20:00", "23:00"
        ],
        data: [92, 89, 85, 83, 78, 82, 88, 91, 94, 93, 90, 87],
        average: 87.7,
        max: 94,
        min: 78,
    },
};

/** API 요청 */
async function fetchBGWriterData() {
    const res = await fetch("/api/dashboard/bgwriter");
    if (!res.ok) throw new Error("Failed to fetch BGWriter data");
    return res.json();
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
    const { data } = useQuery({
        queryKey: ["bgwriterDashboard"],
        queryFn: fetchBGWriterData,
        retry: 1,
    });

    const dashboard = data || mockData;

    const gaugeStatus = getBackendFlushGaugeStatus(dashboard.backendFlushRatio.value);

    const recentStats = dashboard.recentStats || {
        bgwriterActivityRate: 65,
        cleanBufferReuseRate: 78,
        backendFsyncCount: 0,
        bufferPoolUsageRate: 87.2,
        checkpointInterruptionCount: 12,
        dirtyBufferAccumulationRate: 23.5,
    };

    const summaryCards = [
        {
            label: "BGWriter 활동률",
            value: `${recentStats.bgwriterActivityRate}%`,
            diff: 2.5,
            desc: "최근 5분 평균",
            status: (recentStats.bgwriterActivityRate || 0) < 50
                ? "warning"
                : "info"
        },
        {
            label: "Buffer Pool 사용률",
            value: `${recentStats.bufferPoolUsageRate}%`,
            diff: 1.2,
            desc: "최근 5분 평균",
            status: recentStats.bufferPoolUsageRate < 85
                ? ("warning" as const)
                : ("info" as const),
        },
        {
            label: "Checkpoint에 의한 BGWriter 중단",
            value: `${recentStats.checkpointInterruptionCount}회`,
            diff: -2,
            desc: "최근 24시간",
            status: recentStats.checkpointInterruptionCount > 10
                ? ("warning" as const)
                : ("info" as const),
        },
        {
            label: "Dirty Buffer 누적률",
            value: `${recentStats.dirtyBufferAccumulationRate}%`,
            diff: 3.5,
            desc: "현재",
            status: recentStats.dirtyBufferAccumulationRate > 30
                ? ("warning" as const)
                : ("info" as const),
        },
        {
            label: "Backend Fsync 발생",
            value: recentStats.backendFsyncCount || 0,
            diff: 0,
            desc: "최근 5분 누적",
            status: (recentStats.backendFsyncCount || 0) > 0
                ? "critical"
                : "info"
        },
    ];

    return (
        <div className="bgwriter-page">
            {/* 상단 요약 카드 */}
            <div className="bgwriter-summary-cards">
                {summaryCards.map((card, idx) => (
                    <SummaryCard
                        key={idx}
                        label={card.label}
                        value={card.value}
                        diff={card.diff}
                        desc={card.desc}
                        status={card.status}
                    />
                ))}
            </div>

            {/* 첫 번째 행: 3개 카드 */}
            <ChartGridLayout>
                {/* Backend Flush 비율 */}
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
                                <span className="cpu-detail-value">{(dashboard.backendFlushRatio.buffersClean / 1000).toFixed(1)}K</span>
                            </div>
                            <div className="cpu-detail-divider"></div>
                            <div className="cpu-detail-item">
                                <span className="cpu-detail-label">Backend</span>
                                <span className="cpu-detail-value">{(dashboard.backendFlushRatio.buffersBackend / 1000).toFixed(1)}K</span>
                            </div>
                        </div>
                    </div>
                </WidgetCard>

                {/* 버퍼 플러시 주체별 비율 - 최근 1시간으로 변경 */}
                <WidgetCard title="버퍼 플러시 주체별 비율 (최근 1시간)" span={5}>
                    <Chart
                        type="line"
                        series={[
                            { name: "Backend", data: dashboard.bufferFlushRatio.backend },
                            { name: "Clean", data: dashboard.bufferFlushRatio.clean },
                        ]}
                        categories={dashboard.bufferFlushRatio.categories}
                        colors={["#8E79FF", "#FEA29B"]}
                        height={250}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        yaxisOptions={{
                            title: { text: "Buffers/sec", style: { fontSize: "12px", color: "#6B7280" } }
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

                {/* BGWriter vs Checkpoint 쓰기 비중 - 24시간 유지 */}
                <WidgetCard title="BGWriter vs Checkpoint 쓰기 비중 (최근 24시간)" span={5}>
                    <Chart
                        type="line"
                        series={[
                            { name: "BGWriter", data: dashboard.bgwriterVsCheckpoint.bgwriter },
                            { name: "Checkpoint", data: dashboard.bgwriterVsCheckpoint.checkpoint },
                        ]}
                        categories={dashboard.bgwriterVsCheckpoint.categories}
                        colors={["#8E79FF", "#FEA29B"]}
                        height={250}
                    />
                    <div className="bgwriter-chart-footer">
                        <div className="bgwriter-stat-item">
                            <span className="bgwriter-stat-label">BGWriter</span>
                            <span className="bgwriter-stat-value">{(dashboard.bgwriterVsCheckpoint.bgwriterTotal / 1000).toFixed(1)}K</span>
                        </div>
                        <div className="bgwriter-stat-item">
                            <span className="bgwriter-stat-label">Checkpoint</span>
                            <span className="bgwriter-stat-value">{(dashboard.bgwriterVsCheckpoint.checkpointTotal / 1000).toFixed(1)}K</span>
                        </div>
                    </div>
                </WidgetCard>
            </ChartGridLayout>

            {/* 두 번째 행: 3개 카드 */}
            <ChartGridLayout>
                {/* BGWriter 활동량 추세 - 최근 6시간으로 변경 */}
                <WidgetCard title="BGWriter 활동량 추세 (최근 6시간)" span={4}>
                    <Chart
                        type="line"
                        series={[{ name: "Buffers Clean/sec", data: dashboard.cleanRate.data }]}
                        categories={dashboard.cleanRate.categories}
                        colors={["#8E79FF"]}
                        height={250}
                        customOptions={{
                            annotations: {
                                yaxis: [
                                    {
                                        y: 150,
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
                                            text: "정상: 150/s",
                                            position: "right",
                                        },
                                    },
                                    {
                                        y: 100,
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
                                            text: "주의: 100/s",
                                            position: "right",
                                        },
                                    },
                                    {
                                        y: 50,
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
                                            text: "경고: 50/s",
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
                                    formatter: (val: number) => `${val}/s`,
                                },
                                min: 0,
                                max: 220,
                            },
                        }}
                    />
                    <div className="bgwriter-chart-footer">
                        <div className="bgwriter-stat-item">
                            <span className="bgwriter-stat-label">평균</span>
                            <span className="bgwriter-stat-value">{dashboard.cleanRate.average}/s</span>
                        </div>
                        <div className="bgwriter-stat-item">
                            <span className="bgwriter-stat-label">최대</span>
                            <span className="bgwriter-stat-value">{dashboard.cleanRate.max}/s</span>
                        </div>
                        <div className="bgwriter-stat-item">
                            <span className="bgwriter-stat-label">최소</span>
                            <span className="bgwriter-stat-value">{dashboard.cleanRate.min}/s</span>
                        </div>
                    </div>
                </WidgetCard>

                {/* Clean 스캔 상한 도달 추이 - 최근 12시간으로 변경 */}
                <WidgetCard title="Clean 스캔 상한 도달 추이 (최근 12시간)" span={4}>
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
                            title: { text: "Maxwritten Clean (회)", style: { fontSize: "12px", color: "#6B7280" } }
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
                    <div className="bgwriter-chart-footer">
                        <div className="bgwriter-stat-item">
                            <span className="bgwriter-stat-label">평균</span>
                            <span className="bgwriter-stat-value">{dashboard.maxwrittenClean.average}회</span>
                        </div>
                        <div className="bgwriter-stat-item">
                            <span className="bgwriter-stat-label">총 발생</span>
                            <span className="bgwriter-stat-value">{dashboard.maxwrittenClean.total}회</span>
                        </div>
                    </div>
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
                    <div className="bgwriter-chart-footer">
                        <div className="bgwriter-stat-item">
                            <span className="bgwriter-stat-label">평균</span>
                            <span className="bgwriter-stat-value">{dashboard.bufferReuseRate.average}%</span>
                        </div>
                        <div className="bgwriter-stat-item">
                            <span className="bgwriter-stat-label">최대</span>
                            <span className="bgwriter-stat-value">{dashboard.bufferReuseRate.max}%</span>
                        </div>
                        <div className="bgwriter-stat-item">
                            <span className="bgwriter-stat-label">최소</span>
                            <span className="bgwriter-stat-value">{dashboard.bufferReuseRate.min}%</span>
                        </div>
                    </div>
                </WidgetCard>
            </ChartGridLayout>
        </div>
    );
}