import { useState } from "react";
import Chart from "../../components/chart/ChartComponent";
import GaugeChart from "../../components/chart/GaugeChart";
import SummaryCard from "../../components/util/SummaryCard";
import WidgetCard from "../../components/util/WidgetCard";
import ChartGridLayout from "../../components/layout/ChartGridLayout";
import "../../styles/system/cpu.css";

// API 응답 전체 구조
interface CPUData {
    cpuUsage: {
        value: number;
        description: string;
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
    cpuByUser: {
        users: string[];
        cpuTime: number[];
    };
    waitEventDistribution: {
        categories: string[];
        cpu: number[];
        client: number[];
        io: number[];
        lock: number[];
        other: number[];
    };
    recentStats?: {
        systemUserCpuRatio: string;
        ioWait: number;
        cpuQueueLength: number;
        contextSwitches: number;
        postgresqlBackendCpu: number;
    };
}

// 더미 데이터
const dummyData: CPUData = {
    cpuUsage: {
        value: 35.7,
        description: "CPU utilization rate",
    },
    cpuUsageTrend: {
        categories: [
            "00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "24:00"
        ],
        data: [23, 15, 60, 78, 70, 43, 27],
    },
    cpuLoadTypes: {
        categories: [
            "02:38", "07:26", "12:14", "오전", "05:02", "09:50"
        ],
        autoVacuum: [8, 6, 7, 9, 8, 7],
        bgWriter: [10, 9, 8, 10, 11, 9],
        checkpoint: [5, 6, 4, 5, 6, 5],
        postgresqlBackend: [40, 42, 45, 38, 42, 40],
    },
    ioWaitVsLatency: {
        normal: [
            { x: 5, y: 15 },
            { x: 10, y: 18 },
            { x: 15, y: 22 },
            { x: 8, y: 16 },
            { x: 12, y: 20 },
        ],
        warning: [
            { x: 20, y: 28 },
            { x: 25, y: 32 },
            { x: 22, y: 30 },
            { x: 28, y: 38 },
        ],
        danger: [
            { x: 30, y: 35 },
            { x: 35, y: 42 },
            { x: 32, y: 38 },
        ],
    },
    cpuByUser: {
        users: ["app_user", "analytics_user", "report_user", "batch_user", "admin"],
        cpuTime: [45000, 32000, 28000, 21000, 8000],
    },
    waitEventDistribution: {
        categories: ["0:00", "2:00", "4:00", "6:00", "8:00", "10:00", "14:00", "16:00", "18:00", "20:00", "22:00"],
        cpu: [60, 65, 55, 50, 45, 58, 62, 68, 55, 52, 48],
        client: [5, 6, 8, 7, 10, 8, 5, 6, 9, 8, 7],
        io: [20, 18, 22, 28, 30, 22, 20, 15, 22, 25, 30],
        lock: [10, 8, 12, 10, 10, 8, 10, 8, 10, 12, 10],
        other: [5, 3, 3, 5, 5, 4, 3, 3, 4, 3, 5],
    },
    // 최근 5분 평균 통계
    recentStats: {
        systemUserCpuRatio: "18.5/23.8",
        ioWait: 18.5,
        cpuQueueLength: 2.3,
        contextSwitches: 12450,
        postgresqlBackendCpu: 41.2,
    },
};

// Gauge 색상 결정
const getGaugeColor = (value: number): string => {
    if (value < 70) return "#8E79FF"; // 녹색 (정상)
    if (value < 90) return "#FFD66B"; // 주황색 (주의)
    return "#FEA29B"; // 빨간색 (위험)
};

// 메인 페이지
export default function CPUPage() {
    const [data] = useState<CPUData>(dummyData);

    const gaugeColor = getGaugeColor(data.cpuUsage.value);

    // 최근 5분 평균 통계
    const recentStats = data.recentStats || {
        systemUserCpuRatio: "18.5/23.8",
        ioWait: 18.5,
        cpuQueueLength: 2.3,
        contextSwitches: 12450,
        postgresqlBackendCpu: 41.2,
    };

    // 요약 카드 데이터 계산 (최근 5분 평균 기준)
    const summaryCards = [
        {
            label: "System/User CPU 비율",
            value: recentStats.systemUserCpuRatio,
            diff: 1.2,
            desc: "최근 5분 평균",
            status: "info" as const,
        },
        {
            label: "I/O Wait",
            value: `${recentStats.ioWait}%`,
            diff: 2.3,
            desc: "최근 5분 평균",
            status: "info" as const,
        },
        {
            label: "CPU 대기열 길이",
            value: recentStats.cpuQueueLength.toString(),
            diff: 0.5,
            desc: "최근 5분 평균",
            status: "info" as const,
        },
        {
            label: "컨텍스트 전환",
            value: `${recentStats.contextSwitches.toLocaleString()}/s`,
            diff: 850,
            desc: "최근 5분 평균",
            status: "info" as const,
        },
        {
            label: "PostgreSQL Backend CPU",
            value: `${recentStats.postgresqlBackendCpu}%`,
            diff: 3.2,
            desc: "최근 5분 평균",
            status: "info" as const,
        },
    ];

    return (
        <div className="cpu-page">
            {/* 상단 요약 카드 */}
            <div className="cpu-summary-cards">
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

            {/* 첫 번째 행: 게이지 + 2개 차트 */}
            <ChartGridLayout>
                <WidgetCard title="CPU 사용률" span={2}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        width: '100%'
                    }}>
                        <GaugeChart
                            value={data.cpuUsage.value}
                            type="semi-circle"
                            color={gaugeColor}
                            radius={100}
                            strokeWidth={20}
                            height={200}
                            flattenRatio={0.89}
                        />
                    </div>
                </WidgetCard>

                <WidgetCard title="CPU 사용률 추이 (Last 24 Hours)" span={5}>
                    <Chart
                        type="line"
                        series={[{ name: "CPU 사용률 (%)", data: data.cpuUsageTrend.data }]}
                        categories={data.cpuUsageTrend.categories}
                        height={250}
                        colors={["#8E79FF"]}
                        showGrid={true}
                        showLegend={false}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                        }}
                        yaxisOptions={{
                            title: { text: "CPU 사용률 (%)", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: { formatter: (val: number) => `${val}%` },
                            min: 0,
                            max: 100,
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

                <WidgetCard title="CPU 부하 유형별 분석" span={5}>
                    <Chart
                        type="line"
                        series={[
                            { name: "PostgreSQL Backend", data: data.cpuLoadTypes.postgresqlBackend },
                            { name: "BGWriter", data: data.cpuLoadTypes.bgWriter },
                            { name: "Auto Vacuum", data: data.cpuLoadTypes.autoVacuum },
                            { name: "Checkpoint", data: data.cpuLoadTypes.checkpoint },
                        ]}
                        categories={data.cpuLoadTypes.categories}
                        height={250}
                        colors={["#8E79FF", "#77B2FB", "#51DAA8", "#FEA29B"]}
                        showGrid={true}
                        showLegend={true}
                        tooltipFormatter={(value: number) => `${value}%`}
                    />
                </WidgetCard>
            </ChartGridLayout>

            {/* 두 번째 행: 3개 차트 */}
            <ChartGridLayout>
                <WidgetCard title="I/O Wait vs 디스크 Latency 상관관계" span={4}>
                    <Chart
                        type="scatter"
                        series={[
                            {
                                name: "정상 상태",
                                data: data.ioWaitVsLatency.normal
                            },
                            {
                                name: "주의 상관관계",
                                data: data.ioWaitVsLatency.warning
                            },
                            {
                                name: "높은 상관관계",
                                data: data.ioWaitVsLatency.danger
                            },
                        ]}
                        height={250}
                        colors={["#8E79FF", "#FFD66B", "#FEA29B"]}
                        showGrid={true}
                        showLegend={false}
                        xaxisOptions={{
                            title: { text: "I/O Wait (%)", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: { formatter: (val: String) => `${val}%` },
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

                <WidgetCard title="사용자별 CPU 사용량 Top 5" span={4}>
                    <Chart
                        type="bar"
                        series={[
                            { name: "CPU Time (ms)", data: data.cpuByUser.cpuTime }
                        ]}
                        categories={data.cpuByUser.users}
                        height={250}
                        colors={["#8E79FF"]}
                        showGrid={true}
                        showLegend={false}
                        xaxisOptions={{
                            title: { text: "CPU Time (ms)", style: { fontSize: "12px", color: "#6B7280" } },
                        }}
                        yaxisOptions={{
                            title: { text: "사용자", style: { fontSize: "12px", color: "#6B7280" } },
                        }}
                        tooltipFormatter={(value: number) => `${value.toLocaleString()} ms`}
                    />
                </WidgetCard>

                <WidgetCard title="대기 유형별 비중 변화 (100%)" span={4}>
                    <Chart
                        type="column"
                        series={[
                            { name: "CPU", data: data.waitEventDistribution.cpu },
                            { name: "Client", data: data.waitEventDistribution.client },
                            { name: "I/O", data: data.waitEventDistribution.io },
                            { name: "Lock", data: data.waitEventDistribution.lock },
                            { name: "Other", data: data.waitEventDistribution.other },
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