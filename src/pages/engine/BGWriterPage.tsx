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
    backendFsync: {
        categories: string[];
        data: number[];
        total: number;
    };
    bgwriterVsCheckpoint: {
        categories: string[];
        bgwriter: number[];
        checkpoint: number[];
        bgwriterTotal: number;
        checkpointTotal: number;
    };
    recentStats?: {
        cleanBufferReuseRate: number;
        avgCleanRate: number;
        backendDirectWriteRate: number;
        bgwriterVsCheckpointRatio: number;
        maxwrittenReachRate: number;
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
        cleanBufferReuseRate: 78,
        avgCleanRate: 118,
        backendDirectWriteRate: 2.8,
        bgwriterVsCheckpointRatio: 38.5,
        maxwrittenReachRate: 6.7,
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
    backendFsync: {
        categories: [
            "0:00", "2:00", "4:00", "6:00", "8:00", "10:00",
            "12:00", "14:00", "16:00", "18:00", "20:00", "23:00"
        ],
        data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        total: 0,
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
};

/** API 요청 */
async function fetchBGWriterData() {
    const res = await fetch("/api/dashboard/bgwriter");
    if (!res.ok) throw new Error("Failed to fetch BGWriter data");
    return res.json();
}

const getBackendFlushGaugeStatus = (
    value: number
): "normal" | "warning" | "critical" => {
    // 0~50%: 정상, 50~70%: 주의, 70% 이상: 경고
    if (value < 50) return "normal";
    if (value < 70) return "warning";
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
        cleanBufferReuseRate: 78,
        avgCleanRate: 118,
        backendDirectWriteRate: 2.8,
        bgwriterVsCheckpointRatio: 38.5,
        maxwrittenReachRate: 6.7,
    };

    const summaryCards = [
        {
            label: "Clean 버퍼 재활용률",
            value: `${recentStats.cleanBufferReuseRate}%`,
            diff: 2.5,
            desc: "최근 5분 평균",
            status: recentStats.cleanBufferReuseRate < 60 ? ("warning" as const) : ("info" as const),
        },
        {
            label: "평균 Clean Rate",
            value: `${recentStats.avgCleanRate}/s`,
            diff: 3,
            desc: "최근 5분 평균",
            status: "info" as const,
        },
        {
            label: "Backend 직접 쓰기 비율",
            value: `${recentStats.backendDirectWriteRate}%`,
            diff: -0.5,
            desc: "최근 5분 평균",
            status: recentStats.backendDirectWriteRate > 10 ? ("warning" as const) : ("info" as const),
        },
        {
            label: "BGWriter/Checkpoint 비율",
            value: `${recentStats.bgwriterVsCheckpointRatio}%`,
            diff: 1.5,
            desc: "최근 5분 평균",
            status: recentStats.bgwriterVsCheckpointRatio < 30 ? ("warning" as const) : ("info" as const),
        },
        {
            label: "BGWriter 제한 도달률",
            value: `${recentStats.maxwrittenReachRate}%`,
            diff: -1.2,
            desc: "최근 5분 평균",
            status: recentStats.maxwrittenReachRate > 10 ? ("warning" as const) : ("info" as const),
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

                {/* 버퍼 플러시 주체별 비율 */}
                <WidgetCard title="버퍼 플러시 주체별 비율 (Last 24 Hours)" span={5}>
                    <Chart
                        type="area"
                        series={[
                            { name: "Backend", data: dashboard.bufferFlushRatio.backend },
                            { name: "Clean", data: dashboard.bufferFlushRatio.clean },
                        ]}
                        categories={dashboard.bufferFlushRatio.categories}
                        colors={["#8E79FF", "#FEA29B"]}
                        height={250}
                    />
                </WidgetCard>

                {/* BGWriter vs Checkpoint 쓰기 비중 */}
                <WidgetCard title="BGWriter vs Checkpoint 쓰기 비중 (Last 24 Hours)" span={5}>
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
                </WidgetCard>

            </ChartGridLayout>

            {/* 두 번째 행: 3개 카드 */}
            <ChartGridLayout>
                {/* BGWriter 활동량 추세 - 임계치 적용 */}
                <WidgetCard title="BGWriter 활동량 추세 (Last 24 Hours)" span={4}>
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
                                        y: 100,
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
                                            text: "정상: 100/s",
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
                                            text: "주의: 50/s",
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
                </WidgetCard>

                {/* Clean 스캔 상한 도달 추이 */}
                <WidgetCard title="Clean 스캔 상한 도달 추이 (Last 24 Hours)" span={4}>
                    <Chart
                        type="line"
                        series={[{ name: "Maxwritten Clean", data: dashboard.maxwrittenClean.data }]}
                        categories={dashboard.maxwrittenClean.categories}
                        colors={["#8E79FF"]}
                        height={250}
                    />
                </WidgetCard>

                {/* buffers_backend_fsync 추이 */}
                <WidgetCard title="Buffers Backend Fsync 추이 (Last 24 Hours)" span={4}>
                    <Chart
                        type="line"
                        series={[{ name: "Fsync Count", data: dashboard.backendFsync.data }]}
                        categories={dashboard.backendFsync.categories}
                        colors={["#8E79FF"]}
                        height={250}
                    />
                </WidgetCard>

            </ChartGridLayout>
        </div>
    );
}