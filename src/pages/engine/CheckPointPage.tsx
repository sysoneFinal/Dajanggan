import { useQuery } from "@tanstack/react-query";
import Chart from "../../components/chart/ChartComponent";
import SummaryCard from "../../components/util/SummaryCard";
import "../../styles/engine/checkpoint.css";
import GaugeChart from "../../components/chart/GaugeChart";
import WidgetCard from "../../components/util/WidgetCard";
import ChartGridLayout from "../../components/layout/ChartGridLayout";
import {useSearchParams} from "react-router-dom";
import apiClient from "../../../src/api/apiClient";

/** Checkpoint API 응답 타입 */
interface CheckpointData {
    instance?: number;
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
    checkpointInterval: {
        categories: string[];
        data: number[];
        average: number;
        max: number;
        min: number;
    };
    recentStats?: {
        buffersWritten: { current: number; diff: number };
        avgTotalProcessTime: { current: number; diff: number };
        checkpointDistance: { current: number; diff: number };
        checkpointInterval: { current: number; diff: number };
        avgWalGenerationSpeed: { current: number; diff: number };
    };
}
/** 백엔드 API 응답 타입 */
interface CheckpointApiResponse {
    data: CheckpointData;
    timestamp: string;
    success: boolean;
}

/** 더미 데이터 */
const mockData: CheckpointData = {
    requestRatio: {
        value: 60.5,
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
    checkpointInterval: {
        categories: [
            "0:00", "2:00", "4:00", "6:00", "8:00", "10:00",
            "12:00", "14:00", "16:00", "18:00", "20:00", "23:00"
        ],
        data: [8.5, 10.2, 6.5, 4.2, 3.8, 3.5, 2.8, 3.2, 4.5, 5.8, 7.2, 6.8],
        average: 5.6,
        max: 10.2,
        min: 2.8,
    },
    recentStats: {
        buffersWritten: 4280,
        avgTotalProcessTime: 1.78,
        checkpointDistance: 85,
        checkpointInterval: 4.8,
        avgWalGenerationSpeed: 9.2,
    },
};
/** API 요청 함수 - 백엔드 엔드포인트와 연결 */
async function fetchCheckpointData(instanceId: number): Promise<CheckpointData> {
    const response = await apiClient.get<CheckpointApiResponse>(
        `/api/engine/checkpoint/dashboard`,
        {
            params: { instanceId }
        }
    );

    if (!response.data.success) {
        throw new Error("Failed to fetch checkpoint data");
    }

    return response.data.data;
}

const getCheckpointRequestGaugeStatus = (
    value: number
): "normal" | "warning" | "critical" => {
    // 요청형 체크포인트 비율이 높을수록 위험
    // 0~50%: 정상, 50~70%: 주의, 70% 이상: 경고
    if (value < 50) return "normal";
    if (value < 70) return "warning";
    return "critical";
};

/** 메인 컴포넌트 */
export default function CheckPointPage() {
    const [searchParams] = useSearchParams();
    const instanceId = Number(searchParams.get("instanceId")) || 1;

    const { data, isLoading, error } = useQuery({
        queryKey: ["checkpointDashboard", instanceId],
        queryFn: () => fetchCheckpointData(instanceId),
        retry: 1,
        refetchInterval: 30000, // 30초마다 자동 갱신
    });

    if (isLoading) {
        return (
            <div className="loading-container">
                <p>Loading checkpoint data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-container">
                <p>Error loading checkpoint data: {error.message}</p>
            </div>
        );
    }

    const dashboard = data!;
    const gaugeStatus = getCheckpointRequestGaugeStatus(dashboard.requestRatio.value);

    // recentStats가 없을 경우 기본값 설정
    const recentStats = dashboard.recentStats || {
        buffersWritten: { current: 0, diff: 0 },
        avgTotalProcessTime: { current: 0, diff: 0 },
        checkpointDistance: { current: 0, diff: 0 },
        checkpointInterval: { current: 0, diff: 0 },
        avgWalGenerationSpeed: { current: 0, diff: 0 },
    };

    const summaryCards = [
        {
            label: "총 Checkpoint 발생",
            value: `${dashboard.occurrence.requestedTotal + dashboard.occurrence.timedTotal}회`,
            diff: 15,
            desc: "최근 24시간 누적",
            status: "info" as const,
        },
        {
            label: "WAL 총 생성량",
            value: `${(dashboard.walGeneration.total / 1000000000).toFixed(1)}GB`,
            diff: 1.2,
            desc: "최근 24시간 누적",
            status: dashboard.walGeneration.total > 120000000000
                ? ("warning" as const)
                : ("info" as const),
        },
        {
            label: "평균 Checkpoint 간격",
            value: `${recentStats.checkpointInterval.current.toFixed(1)}분`,
            diff: recentStats.checkpointInterval.diff,
            desc: "최근 5분",
            status: recentStats.checkpointInterval.current < 3 ? "warning" : "success" as const,
        },
        {
            label: "평균 Buffer 처리량",
            value: `${dashboard.buffer.average.toLocaleString()}/s`,
            diff: 120,
            desc: "최근 24시간 평균",
            status: dashboard.buffer.average > 5000
                ? ("warning" as const)
                : ("info" as const),
        },
        {
            label: "Checkpoint 거리",
            value: `${recentStats.checkpointDistance.current.toFixed(0)}%`,
            diff: recentStats.checkpointDistance.diff,
            desc: "max_wal_size 기준",
            status:                 recentStats.checkpointDistance.current > 80 ? "warning" :
                recentStats.checkpointDistance.current > 60 ? "normal" : "success" as const,
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

            {/* 첫 번째 행: 3개 카드 */}
            <ChartGridLayout>
                {/* Checkpoint 요청 비율 */}
                <WidgetCard title="Checkpoint 요청 비율" span={2}>
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
                            value={dashboard.requestRatio.value}
                            status={gaugeStatus}
                            type="semi-circle"
                            radius={100}
                            strokeWidth={20}
                            height={200}
                            flattenRatio={0.89}
                        />
                        <div className="cpu-gauge-details">
                            <div className="cpu-detail-item">
                                <span className="cpu-detail-label">Requested</span>
                                <span className="cpu-detail-value">{dashboard.requestRatio.requestedCount}</span>
                            </div>
                            <div className="cpu-detail-divider"></div>
                            <div className="cpu-detail-item">
                                <span className="cpu-detail-label">Timed</span>
                                <span className="cpu-detail-value">{dashboard.requestRatio.timedCount}</span>
                            </div>
                        </div>
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

                {/* Checkpoint 처리 시간 추세 - 임계치 적용 */}
                <WidgetCard title="Checkpoint 처리 시간 추세 (Last 1 Hour)" span={5}>
                    <Chart
                        type="line"
                        series={[
                            { name: "Sync Time", data: dashboard.processTime.syncTime },
                            { name: "Write Time", data: dashboard.processTime.writeTime },
                        ]}
                        categories={dashboard.processTime.categories}
                        colors={["#8E79FF", "#FEA29B"]}
                        height={250}
                        customOptions={{
                            annotations: {
                                yaxis: [
                                    {
                                        y: 1000,
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
                                            text: "정상: 1s",
                                            position: "right",
                                        },
                                    },
                                    {
                                        y: 2000,
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
                                            text: "주의: 2s",
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
                                    formatter: (val: number) => `${(val / 1000).toFixed(1)}s`,
                                },
                                min: 0,
                                max: 2500,
                            },
                        }}
                    />
                </WidgetCard>
            </ChartGridLayout>

            {/* 두 번째 행: 3개 카드 */}
            <ChartGridLayout>
                {/* WAL 생성량 추이 */}
                <WidgetCard title="WAL 생성량 추이 (Last 24 Hours)" span={4}>
                    <Chart
                        type="line"
                        series={[{ name: "WAL Generation", data: dashboard.walGeneration.data }]}
                        categories={dashboard.walGeneration.categories}
                        colors={["#8E79FF"]}
                        height={250}
                        customOptions={{
                            annotations: {
                                yaxis: [
                                    {
                                        y: 10000000000,
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
                                            text: "정상: 10GB",
                                            position: "right",
                                        },
                                    },
                                    {
                                        y: 12000000000,
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
                                            text: "주의: 12GB",
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
                                    formatter: (val: number) => `${(val / 1000000000).toFixed(1)}GB`,
                                },
                                min: 0,
                                max: 14000000000,
                            },
                        }}
                    />
                </WidgetCard>

                {/* Checkpoint buffer 처리량 */}
                <WidgetCard title="Checkpoint Buffer 처리량 (Last 1 Hour)" span={4}>
                    <Chart
                        type="line"
                        series={[{ name: "Buffers/sec", data: dashboard.buffer.data }]}
                        categories={dashboard.buffer.categories}
                        colors={["#8E79FF"]}
                        height={250}
                        customOptions={{
                            annotations: {
                                yaxis: [
                                    {
                                        y: 5000,
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
                                            text: "정상: 5000",
                                            position: "right",
                                        },
                                    },
                                    {
                                        y: 5500,
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
                                            text: "주의: 5500",
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
                                max: 6000,
                            },
                        }}
                    />
                </WidgetCard>

                {/* Checkpoint 간격 추이 */}
                <WidgetCard title="Checkpoint 간격 추이 (Last 24 Hours)" span={4}>
                    <Chart
                        type="line"
                        series={[{ name: "Interval (min)", data: dashboard.checkpointInterval.data }]}
                        categories={dashboard.checkpointInterval.categories}
                        colors={["#8E79FF"]}
                        height={250}
                        customOptions={{
                            annotations: {
                                yaxis: [
                                    {
                                        y: 3,
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
                                            text: "주의: 3분",
                                            position: "right",
                                        },
                                    },
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
                                            text: "정상: 5분",
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
                                    formatter: (val: number) => `${val.toFixed(1)}분`,
                                },
                                min: 0,
                                max: 12,
                            },
                        }}
                    />
                </WidgetCard>
            </ChartGridLayout>
        </div>
    );
}