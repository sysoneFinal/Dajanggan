import { useState } from "react";
import Chart from "../../components/chart/ChartComponent";
import GaugeChart from "../../components/chart/GaugeChart";
import SummaryCard from "../../components/util/SummaryCard";
import WidgetCard from "../../components/util/WidgetCard";
import ChartGridLayout from "../../components/layout/ChartGridLayout";
import "../../styles/system/disk.css";

// API 응답 전체 구조
interface DiskIOData {
    diskUsage: {
        value: number;
        iopsRead: number;
        iopsWrite: number;
    };
    processIO: {
        categories: string[];
        series: Array<{
            name: string;
            data: number[];
        }>;
    };
    queueDepth: {
        categories: string[];
        queueLength: number[];
        average: number;
    };
    ioLatency: {
        categories: string[];
        readLatency: number[];
        writeLatency: number[];
        avgRead: number;
        avgWrite: number;
    };
    throughput: {
        categories: string[];
        iops: number[];
        throughputMB: number[];
    };
    evictions: {
        categories: string[];
        evictionRate: number[];
        average: number;
    };
    walBytes: {
        categories: string[];
        walBytes: number[];
        average: number;
    };
    recentStats?: {
        diskQueueLength: number;
        iopsSaturation: number;
        avgLatency: number;
        walBottleneck: number;
        bufferEvictionRate: number;
    };
}

// 더미 데이터
const dummyData: DiskIOData = {
    diskUsage: {
        value: 35.7,
        iopsRead: 4250,
        iopsWrite: 2780,
    },
    processIO: {
        categories: ["0:00", "2:00", "4:00", "6:00", "8:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"],
        series: [
            { name: "Autovacuum", data: [2000, 2500, 2200, 2800, 3000, 2700, 2900, 2400, 2600, 2800, 3100, 2500] },
            { name: "BGWriter", data: [3000, 3500, 3200, 3800, 4000, 3700, 3900, 3400, 3600, 3800, 4100, 3500] },
            { name: "Backend", data: [4000, 5000, 4500, 5500, 6000, 5200, 5800, 4800, 5200, 5600, 6200, 5000] },
            { name: "Checkpointer", data: [3500, 3000, 3800, 2500, 2800, 3200, 3000, 3500, 3300, 2900, 2600, 3400] },
        ],
    },
    queueDepth: {
        categories: ["0:00", "2:00", "4:00", "6:00", "8:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"],
        queueLength: [1.2, 1.8, 2.5, 4.2, 5.8, 3.5, 2.8, 4.5, 3.2, 2.1, 1.5, 1.0],
        average: 2.8,
    },
    ioLatency: {
        categories: ["0:00", "2:00", "4:00", "6:00", "8:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"],
        readLatency: [8, 7, 12, 15, 18, 10, 9, 14, 11, 8, 13, 7],
        writeLatency: [5, 4, 7, 9, 11, 6, 5, 8, 7, 5, 8, 4],
        avgRead: 10.2,
        avgWrite: 6.6,
    },
    throughput: {
        categories: ["0:00", "4:00", "8:00", "12:00", "16:00", "20:00", "24:00"],
        iops: [5000, 8000, 12000, 10000, 8000, 6000, 5000],
        throughputMB: [120, 180, 320, 280, 200, 150, 120],
    },
    evictions: {
        categories: ["0:00", "2:00", "4:00", "6:00", "8:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"],
        evictionRate: [65, 120, 180, 150, 95, 110, 140, 160, 130, 100, 85, 70],
        average: 117,
    },
    walBytes: {
        categories: ["0:00", "2:00", "4:00", "6:00", "8:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"],
        walBytes: [2500000, 4500000, 5200000, 4800000, 3200000, 3800000, 4200000, 3500000, 3000000, 5800000, 5200000, 2800000],
        average: 4125000,
    },
    recentStats: {
        diskQueueLength: 3.2,
        iopsSaturation: 82,
        avgLatency: 4.8,
        walBottleneck: 8,
        bufferEvictionRate: 117,
    },
};

const getDiskUtilizationColor = (value: number): string => {
    // 0~70%: 정상, 70~85%: 주의, 85% 이상: 경고
    if (value < 70) return "#8E79FF";   // normal
    if (value < 85) return "#FFD66B";   // warning
    return "#FEA29B";                   // critical
};

// 메인 컴포넌트
export default function DiskPage() {
    const [data] = useState<DiskIOData>(dummyData);

    const DiskUtilizationColor = getDiskUtilizationColor(data.diskUsage.value);

    const recentStats = data.recentStats || {
        diskQueueLength: 3.2,
        iopsSaturation: 82,
        avgLatency: 4.8,
        walBottleneck: 8,
        bufferEvictionRate: 117,
    };

    const summaryCards = [
        {
            label: "디스크 대기열 길이",
            value: recentStats.diskQueueLength.toString(),
            diff: 0.8,
            desc: "최근 5분 평균",
            status: recentStats.diskQueueLength > 2 ? ("warning" as const) : ("info" as const),
        },
        {
            label: "IOPS 포화도",
            value: `${recentStats.iopsSaturation}%`,
            diff: 5,
            desc: "최근 5분 평균",
            status: recentStats.iopsSaturation > 90 ? ("warning" as const) : ("info" as const),
        },
        {
            label: "평균 응답 시간",
            value: `${recentStats.avgLatency}ms`,
            diff: -0.5,
            desc: "최근 5분 평균",
            status: recentStats.avgLatency > 10 ? ("warning" as const) : ("info" as const),
        },
        {
            label: "WAL 병목 여부",
            value: `${recentStats.walBottleneck}%`,
            diff: -2,
            desc: "최근 5분 평균",
            status: recentStats.walBottleneck > 15 ? ("warning" as const) : ("info" as const),
        },
        {
            label: "버퍼 교체 빈도",
            value: `${recentStats.bufferEvictionRate}/sec`,
            diff: 8,
            desc: "최근 5분 평균",
            status: recentStats.bufferEvictionRate > 100 ? ("warning" as const) : ("info" as const),
        },
    ];

    return (
        <div className="checkpoint-page">
            {/* 상단 요약 카드 */}
            <div className="disk-summary-cards">
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

            {/* 첫 번째 행: 3개 차트 */}
            <ChartGridLayout>
                <WidgetCard title="DISK 사용률" span={2}>
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
                            value={data.diskUsage.value}
                            color={DiskUtilizationColor}
                            type="semi-circle"
                            radius={100}
                            strokeWidth={20}
                            height={200}
                            flattenRatio={0.89}
                        />
                        <div className="cpu-gauge-details">
                            <div className="cpu-detail-item">
                                <span className="cpu-detail-label">IOPS Read</span>
                                <span className="cpu-detail-value">{(data.diskUsage.iopsRead / 1000).toFixed(1)}K</span>
                            </div>
                            <div className="cpu-detail-divider"></div>
                            <div className="cpu-detail-item">
                                <span className="cpu-detail-label">IOPS Write</span>
                                <span className="cpu-detail-value">{(data.diskUsage.iopsWrite / 1000).toFixed(1)}K</span>
                            </div>
                        </div>
                    </div>
                </WidgetCard>

                <WidgetCard title="Process별 I/O 활동" span={5}>
                    <Chart
                        type="line"
                        series={data.processIO.series}
                        categories={data.processIO.categories}
                        height={250}
                        colors={["#8E79FF", "#60A5FA", "#FEA29B", "#FFD66B"]}
                        showLegend={true}
                        showGrid={true}
                        isStacked={true}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        yaxisOptions={{
                            title: { text: "I/O Operations", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: {
                                formatter: (val: number) => `${(val / 1000).toFixed(1)}K`,
                            },
                        }}
                    />
                </WidgetCard>

                <WidgetCard title="I/O Latency (Read/Write)" span={5}>
                    <Chart
                        type="line"
                        series={[
                            { name: "Read Latency", data: data.ioLatency.readLatency },
                            { name: "Write Latency", data: data.ioLatency.writeLatency },
                        ]}
                        categories={data.ioLatency.categories}
                        height={250}
                        colors={["#8E79FF", "#FEA29B"]}
                        showLegend={true}
                        showGrid={true}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                        }}
                        yaxisOptions={{
                            title: { text: "지연시간 (ms)", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: { formatter: (val: number) => `${val}ms` },
                        }}
                        tooltipFormatter={(value: number) => `${value}ms`}
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
                                        opacity: 0.7,
                                        label: {
                                            borderColor: "#FEA29B",
                                            style: {
                                                color: "#fff",
                                                background: "#FEA29B",
                                                fontSize: "11px",
                                                fontWeight: 500,
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
                                    formatter: (val: number) => `${val}ms`,
                                },
                                min: 0,
                                max: 25,
                            },
                        }}
                    />
                </WidgetCard>
            </ChartGridLayout>

            {/* 두 번째 행: 3개 차트 */}
            <ChartGridLayout>
                <WidgetCard title="Disk 처리 효율 (IOPS vs MB/s)" span={4}>
                    <Chart
                        type="line"
                        series={[
                            { name: "IOPS", data: data.throughput.iops },
                            { name: "처리량 (MB/s)", data: data.throughput.throughputMB },
                        ]}
                        categories={data.throughput.categories}
                        height={250}
                        colors={["#8E79FF", "#FEA29B"]}
                        showLegend={true}
                        showGrid={true}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                        }}
                        yaxisOptions={[
                            {
                                title: {
                                    text: "IOPS",
                                    style: { fontSize: "12px", color: "#6B7280" },
                                },
                                labels: {
                                    formatter: (val: number) => `${(val / 1000).toFixed(0)}K`,
                                },
                            },
                            {
                                opposite: true,
                                title: {
                                    text: "MB/s",
                                    style: { fontSize: "12px", color: "#6B7280" },
                                },
                                labels: {
                                    formatter: (val: number) => `${val}MB`,
                                },
                            },
                        ]}
                    />
                </WidgetCard>

                <WidgetCard title="WAL 쓰기량 변화" span={4}>
                    <Chart
                        type="line"
                        series={[{ name: "WAL Bytes/sec", data: data.walBytes.walBytes }]}
                        categories={data.walBytes.categories}
                        height={250}
                        colors={["#8E79FF"]}
                        showLegend={false}
                        showGrid={true}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                        }}
                        yaxisOptions={{
                            title: { text: "WAL Bytes", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: {
                                formatter: (val: number) => `${(val / 1000000).toFixed(1)}M`,
                            },
                        }}
                        tooltipFormatter={(value: number) => `${(value / 1000000).toFixed(2)}MB/s`}
                        customOptions={{
                            annotations: {
                                yaxis: [
                                    {
                                        y: 4000000,
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
                                            text: "정상: 4MB/s",
                                            position: "right",
                                        },
                                    },
                                    {
                                        y: 7000000,
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
                                            text: "주의: 7MB/s",
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
                                    formatter: (val: number) => `${(val / 1000000).toFixed(1)}M`,
                                },
                                min: 0,
                                max: 8000000,
                            },
                        }}
                    />
                </WidgetCard>

                <WidgetCard title="Disk Queue Depth 추이" span={4}>
                    <Chart
                        type="line"
                        series={[
                            { name: "Queue Length", data: data.queueDepth.queueLength },
                        ]}
                        categories={data.queueDepth.categories}
                        height={250}
                        colors={["#8E79FF"]}
                        showLegend={false}
                        showGrid={true}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                        }}
                        yaxisOptions={{
                            title: { text: "대기열 길이", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: { formatter: (val: number) => `${val.toFixed(1)}` },
                        }}
                        tooltipFormatter={(value: number) => `${value.toFixed(2)}`}
                        customOptions={{
                            annotations: {
                                yaxis: [
                                    {
                                        y: 2,
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
                                            text: "정상: 2",
                                            position: "right",
                                        },
                                    },
                                    {
                                        y: 5,
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
                                            text: "주의: 5",
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
                                    formatter: (val: number) => `${val.toFixed(1)}`,
                                },
                                min: 0,
                                max: 8,
                            },
                        }}
                    />
                </WidgetCard>
            </ChartGridLayout>

            {/* 세 번째 행: 1개 차트 */}
            <ChartGridLayout>
                <WidgetCard title="버퍼 교체(Evictions) 추이" span={12}>
                    <Chart
                        type="line"
                        series={[{ name: "Evictions/sec", data: data.evictions.evictionRate }]}
                        categories={data.evictions.categories}
                        height={250}
                        colors={["#8E79FF"]}
                        showLegend={false}
                        showGrid={true}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                        }}
                        yaxisOptions={{
                            title: { text: "Evictions/sec", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: { formatter: (val: number) => `${val}` },
                        }}
                        tooltipFormatter={(value: number) => `${value}/sec`}
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
                                            text: "정상: 100/sec",
                                            position: "right",
                                        },
                                    },
                                    {
                                        y: 200,
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
                                            text: "주의: 200/sec",
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
                                    formatter: (val: number) => `${val}`,
                                },
                                min: 0,
                                max: 250,
                            },
                        }}
                    />
                </WidgetCard>
            </ChartGridLayout>
        </div>
    );
}