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
        backendDirectWriteRate: number;   // 변경: bgwriterExecutions → backendDirectWriteRate (%)
        bgwriterVsCheckpointRatio: number;
        maxwrittenReachRate: number;      // 변경: maxwrittenCleanCount → maxwrittenReachRate (%)
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
    // 최근 5분 평균 통계
    recentStats: {
        cleanBufferReuseRate: 78,
        avgCleanRate: 118,
        backendDirectWriteRate: 2.8,    // 변경: Backend가 직접 쓴 비율 (%)
        bgwriterVsCheckpointRatio: 38.5,
        maxwrittenReachRate: 6.7,       // 변경: 제한 도달률 (%)
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

/** 유틸리티 함수 */
const getGaugeStatus = (value: number): "normal" | "warning" | "critical" => {
    if (value < 15) return "normal";
    if (value < 30) return "warning";
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

    const gaugeStatus = getGaugeStatus(dashboard.backendFlushRatio.value);

    // 최근 5분 평균 통계 (API에서 받아오거나 더미 데이터 사용)
    const recentStats = dashboard.recentStats || {
        cleanBufferReuseRate: 78,
        avgCleanRate: 118,
        backendDirectWriteRate: 2.8,
        bgwriterVsCheckpointRatio: 38.5,
        maxwrittenReachRate: 6.7,
    };

    // 요약 카드 데이터 계산 (최근 5분 평균 기준)
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
            label: "Backend 직접 쓰기 비율",  // 변경
            value: `${recentStats.backendDirectWriteRate}%`,  // 변경
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
            label: "BGWriter 제한 도달률",  // 변경
            value: `${recentStats.maxwrittenReachRate}%`,  // 변경
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

            {/* 첫 번째 행: 3개 카드 (4+4+4=12) */}
            <ChartGridLayout>
                {/* Backend Flush 비율 */}
                <WidgetCard title="Backend Flush 비율" span={2}>
                    <div className="bgwriter-gauge-container">
                        <GaugeChart
                            value={dashboard.backendFlushRatio.value}
                            status={gaugeStatus}
                            type="semi-circle"
                        />
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

            {/* 두 번째 행: 3개 카드 (4+4+4=12) */}
            <ChartGridLayout>
                {/* BGWriter 활동량 추세 */}
                <WidgetCard title="BGWriter 활동량 추세 (Last 24 Hours)" span={4}>
                    <Chart
                        type="line"
                        series={[{ name: "Buffers Clean/sec", data: dashboard.cleanRate.data }]}
                        categories={dashboard.cleanRate.categories}
                        colors={["#8E79FF"]}
                        height={250}
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