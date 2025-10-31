import { useQuery } from "@tanstack/react-query";
import Chart from "../../components/chart/ChartComponent";
import SummaryCard from "../../components/layout/SummaryCard";
import "../../styles/engine/checkpoint.css";
import GaugeChart from "../../components/chart/GaugeChart";
import WidgetCard from "../../components/util/WidgetCard";
import ChartGridLayout from "../../components/layout/ChartGridLayout";

/** Checkpoint API 응답 타입 */
interface CheckpointData {
    requestRatio: {
        value: number;
        requestedCount: number;
        timedCount: number;
    };
    avgWriteTime: {
        categories: string[];
        data: number[];
        average: number;
        max: number;
        min: number;
    };
    occurrence: {
        categories: string[];
        requested: number[];
        timed: number[];
        requestedTotal: number;
        timedTotal: number;
        ratio: number;
    };
    walGeneration: {
        categories: string[];
        data: number[];
        total: number;
        average: number;
        max: number;
    };
    processTime: {
        categories: string[];
        syncTime: number[];
        writeTime: number[];
        avgSync: number;
        avgWrite: number;
        avgTotal: number;
    };
    buffer: {
        categories: string[];
        data: number[];
        average: number;
        max: number;
        min: number;
    };
    recentStats?: {
        buffersWritten: number;
        avgTotalProcessTime: number;
        checkpointDistance: number;
        checkpointInterval: number;  // 변경: requestTimedRatio → checkpointInterval (분 단위)
        avgWalGenerationSpeed: number;
    };
}

/** 더미 데이터 */
const mockData: CheckpointData = {
    requestRatio: {
        value: 28.5,
        requestedCount: 50,
        timedCount: 125,
    },
    avgWriteTime: {
        categories: [
            "0:00", "2:00", "4:00", "6:00", "8:00", "10:00",
            "12:00", "14:00", "16:00", "18:00", "20:00", "23:00"
        ],
        data: [3, 2.5, 4, 6.5, 7, 8.5, 8, 7, 5, 4, 3.5, 10],
        average: 5.7,
        max: 10.0,
        min: 2.5,
    },
    occurrence: {
        categories: [
            "0:00", "2:00", "4:00", "6:00", "8:00", "10:00",
            "12:00", "14:00", "16:00", "18:00", "20:00", "23:00"
        ],
        requested: [20, 15, 25, 30, 20, 10, 35, 25, 20, 15, 30, 28],
        timed: [60, 55, 50, 45, 50, 55, 40, 48, 52, 58, 35, 62],
        requestedTotal: 271,
        timedTotal: 608,
        ratio: 30.8,
    },
    walGeneration: {
        categories: [
            "0:00", "2:00", "4:00", "6:00", "8:00", "10:00",
            "12:00", "14:00", "16:00", "18:00", "20:00", "23:00"
        ],
        data: [
            8000000000, 6500000000, 10000000000, 12000000000,
            13000000000, 11000000000, 9500000000, 8000000000,
            7000000000, 6000000000, 9000000000, 10500000000,
        ],
        total: 110500000000,
        average: 9208333333,
        max: 13000000000,
    },
    processTime: {
        categories: [
            "0:00", "2:00", "4:00", "6:00", "8:00", "10:00",
            "12:00", "14:00", "16:00", "18:00", "20:00", "23:00"
        ],
        syncTime: [400, 520, 680, 450, 520, 600, 720, 650, 580, 460, 520, 620],
        writeTime: [800, 1200, 1600, 1000, 1100, 1300, 1450, 1350, 1200, 950, 1100, 1500],
        avgSync: 565,
        avgWrite: 1213,
        avgTotal: 1778,
    },
    buffer: {
        categories: [
            "0:00", "2:00", "4:00", "6:00", "8:00", "10:00",
            "12:00", "14:00", "16:00", "18:00", "20:00", "23:00"
        ],
        data: [3500, 3200, 4200, 4800, 5200, 4600, 3800, 3000, 2400, 4500, 5500, 4800],
        average: 4133,
        max: 5500,
        min: 2400,
    },
    // 최근 5분 평균 통계
    recentStats: {
        buffersWritten: 4280,
        avgTotalProcessTime: 1.78,
        checkpointDistance: 85,
        checkpointInterval: 4.8,  // 변경: 평균 Checkpoint 간격 (분)
        avgWalGenerationSpeed: 9.2,
    },
};

/** API 요청 */
async function fetchCheckpointData() {
    const res = await fetch("/api/dashboard/checkpoint");
    if (!res.ok) throw new Error("Failed to fetch checkpoint data");
    return res.json();
}

/** 유틸리티 함수 */
const getGaugeStatus = (value: number): "normal" | "warning" | "critical" => {
    if (value < 20) return "normal";
    if (value < 30) return "warning";
    return "critical";
};

/** 메인 컴포넌트 */
export default function CheckPointPage() {
    const { data } = useQuery({
        queryKey: ["checkpointDashboard"],
        queryFn: fetchCheckpointData,
        retry: 1,
    });

    const dashboard = data || mockData;

    const gaugeStatus = getGaugeStatus(dashboard.requestRatio.value);

    // 최근 5분 평균 통계 (API에서 받아오거나 더미 데이터 사용)
    const recentStats = dashboard.recentStats || {
        buffersWritten: 4280,
        avgTotalProcessTime: 1.78,
        checkpointDistance: 85,
        checkpointInterval: 4.8,
        avgWalGenerationSpeed: 9.2,
    };

    // 요약 카드 데이터 계산 (최근 5분 평균 기준)
    const summaryCards = [
        {
            label: "기록된 버퍼",
            value: recentStats.buffersWritten.toLocaleString(),
            diff: 180,
            desc: "최근 5분 누적",
            status: "info" as const,
        },
        {
            label: "평균 처리 시간",
            value: `${recentStats.avgTotalProcessTime}s`,
            diff: -0.12,
            desc: "최근 5분 평균 (Sync+Write)",
            status: "info" as const,
        },
        {
            label: "체크포인트 거리",
            value: `${recentStats.checkpointDistance}%`,
            diff: 5,
            desc: "최근 5분 평균",
            status: "info" as const,
        },
        {
            label: "Checkpoint 간격",  // 변경
            value: `${recentStats.checkpointInterval}분`,  // 변경
            diff: 0.3,
            desc: "최근 5분 평균 간격",
            status: "info" as const,
        },
        {
            label: "평균 WAL 생성 속도",
            value: `${recentStats.avgWalGenerationSpeed}GB/h`,
            diff: 0.8,
            desc: "최근 5분 평균",
            status: "info" as const,
        },
    ];

    return (
        <div className="checkpoint-page">
            {/* 상단 요약 카드 */}
            <div className="checkpoint-summary-cards">
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
                {/* Checkpoint 요청 비율 */}
                <WidgetCard title="Checkpoint 요청 비율" span={2}>
                    <div className="checkpoint-gauge-container">
                        <GaugeChart
                            value={dashboard.requestRatio.value}
                            status={gaugeStatus}
                            type="semi-circle"
                        />
                    </div>
                </WidgetCard>

                {/* Checkpoint 발생 추이 */}
                <WidgetCard title="Checkpoint 발생 추이 (Last 24 Hours)" span={5}>
                    <Chart
                        type="line"
                        series={[
                            { name: "Requested", data: dashboard.occurrence.requested },
                            { name: "Timed", data: dashboard.occurrence.timed },
                        ]}
                        categories={dashboard.occurrence.categories}
                        colors={["#8E79FF", "#FEA29B"]}
                        height={250}
                    />
                </WidgetCard>

                {/* Checkpoint 처리 시간 추세 */}
                <WidgetCard title="Checkpoint 처리 시간 추세 (Last 24 Hours)" span={5}>
                    <Chart
                        type="line"
                        series={[
                            { name: "Sync Time", data: dashboard.processTime.syncTime },
                            { name: "Write Time", data: dashboard.processTime.writeTime },
                        ]}
                        categories={dashboard.processTime.categories}
                        colors={["#8E79FF", "#FEA29B"]}
                        height={250}
                    />
                </WidgetCard>
            </ChartGridLayout>

            {/* 두 번째 행: 3개 카드 (4+4+4=12) */}
            <ChartGridLayout>
                {/* WAL 생성량 추이 */}
                <WidgetCard title="WAL 생성량 추이 (Last 24 Hours)" span={4}>
                    <Chart
                        type="line"
                        series={[{ name: "WAL Generation", data: dashboard.walGeneration.data }]}
                        categories={dashboard.walGeneration.categories}
                        colors={["#8E79FF"]}
                        height={250}
                    />
                </WidgetCard>

                {/* Checkpoint buffer 처리량 */}
                <WidgetCard title="Checkpoint Buffer 처리량 (Last 24 Hours)" span={4}>
                    <Chart
                        type="line"
                        series={[{ name: "Buffers/sec", data: dashboard.buffer.data }]}
                        categories={dashboard.buffer.categories}
                        colors={["#8E79FF"]}
                        height={250}
                    />
                </WidgetCard>

                {/* 평균 블록 쓰기 시간 */}
                <WidgetCard title="평균 블록 쓰기 시간 (Last 24 Hours)" span={4}>
                    <Chart
                        type="line"
                        series={[{ name: "Avg Write Time", data: dashboard.avgWriteTime.data }]}
                        categories={dashboard.avgWriteTime.categories}
                        colors={["#8E79FF"]}
                        height={250}
                    />
                </WidgetCard>
            </ChartGridLayout>
        </div>
    );
}