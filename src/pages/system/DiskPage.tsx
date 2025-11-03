import { useState } from "react";
import Chart from "../../components/chart/ChartComponent";
import GaugeChart from "../../components/chart/GaugeChart";
import SummaryCard from "../../components/util/SummaryCard";
import WidgetCard from "../../components/util/WidgetCard";
import ChartGridLayout from "../../components/layout/ChartGridLayout";
import "../../styles/system/disk.css";

// API 응답 전체 구조
interface DiskIOData {
    diskUsage: number;
    processIO: {
        categories: string[];
        series: Array<{
            name: string;
            data: number[];
        }>;
    };
    readsWrites: {
        categories: string[];
        reads: number[];
        writes: number[];
    };
    latency: {
        categories: string[];
        readLatency: number[];
        writeLatency: number[];
        average: number;
        max: number;
        min: number;
    };
    throughput: {
        categories: string[];
        iops: number[];
        throughputMB: number[];
    };
    blockLatency: {
        categories: string[];
        readLatency: number[];
        writeLatency: number[];
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
        iopsSaturation: number;        // 변경: avgIops → iopsSaturation (%)
        avgLatency: number;
        walBottleneck: number;         // 변경: avgWalWriteSpeed → walBottleneck (%)
        readWriteRatio: string;
    };
}

// 더미 데이터
const dummyData: DiskIOData = {
    diskUsage: 35.7,
    processIO: {
        categories: ["0:00", "2:00", "4:00", "6:00", "8:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"],
        series: [
            { name: "Autovacuum", data: [2000, 2500, 2200, 2800, 3000, 2700, 2900, 2400, 2600, 2800, 3100, 2500] },
            { name: "BGWriter", data: [3000, 3500, 3200, 3800, 4000, 3700, 3900, 3400, 3600, 3800, 4100, 3500] },
            { name: "Backend", data: [4000, 5000, 4500, 5500, 6000, 5200, 5800, 4800, 5200, 5600, 6200, 5000] },
            { name: "Checkpointer", data: [3500, 3000, 3800, 2500, 2800, 3200, 3000, 3500, 3300, 2900, 2600, 3400] },
        ],
    },
    readsWrites: {
        categories: ["0:00", "2:00", "4:00", "6:00", "8:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"],
        reads: [60, 55, 65, 70, 80, 65, 70, 60, 65, 70, 75, 60],
        writes: [40, 45, 35, 30, 20, 35, 30, 40, 35, 30, 25, 40],
    },
    latency: {
        categories: ["0:00", "4:00", "8:00", "12:00", "16:00", "20:00", "24:00"],
        readLatency: [8, 7, 15, 19, 12, 10, 7],
        writeLatency: [5, 5, 8, 10, 7, 6, 5],
        average: 11.14,
        max: 19,
        min: 5,
    },
    throughput: {
        categories: ["0:00", "4:00", "8:00", "12:00", "16:00", "20:00", "24:00"],
        iops: [5000, 8000, 12000, 10000, 8000, 6000, 5000],
        throughputMB: [120, 180, 320, 280, 200, 150, 120],
    },
    blockLatency: {
        categories: ["0:00", "2:00", "4:00", "6:00", "8:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"],
        readLatency: [5, 6, 7, 8, 6, 5, 6, 7, 6, 5, 6, 5],
        writeLatency: [3, 3, 4, 5, 4, 3, 3, 4, 3, 3, 3, 3],
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
    // 최근 5분 평균 통계
    recentStats: {
        diskQueueLength: 3.2,
        iopsSaturation: 82,        // 변경: 현재 IOPS / 최대 IOPS (%)
        avgLatency: 4.8,
        walBottleneck: 8,          // 변경: WAL 병목 비율 (%)
        readWriteRatio: "62/38",
    },
};

const getDiskUtilizationColor = (value: number): string => {
    if (value >= 80 && value <= 95) return "#7B61FF"; // 녹색 (적정)
    if (value < 80) return "#FFD66B"; // 파란색 (여유)
    return "#FF928A"; // 빨간색 (위험)
};

// 메인 컴포넌트
export default function DiskPage() {
    const [data] = useState<DiskIOData>(dummyData);

    const DiskUtilizationColor = getDiskUtilizationColor(data.diskUsage);

    // 최근 5분 평균 통계
    const recentStats = data.recentStats || {
        diskQueueLength: 3.2,
        iopsSaturation: 82,
        avgLatency: 4.8,
        walBottleneck: 8,
        readWriteRatio: "62/38",
    };

    // 요약 카드 데이터 계산 (최근 5분 평균 기준)
    const summaryCards = [
        {
            label: "디스크 대기열 길이",
            value: recentStats.diskQueueLength.toString(),
            diff: 0.8,
            desc: "최근 5분 평균",
            status: recentStats.diskQueueLength > 2 ? ("warning" as const) : ("info" as const),
        },
        {
            label: "IOPS 포화도",  // 변경
            value: `${recentStats.iopsSaturation}%`,  // 변경
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
            label: "WAL 병목 여부",  // 변경
            value: `${recentStats.walBottleneck}%`,  // 변경
            diff: -2,
            desc: "최근 5분 평균",
            status: recentStats.walBottleneck > 15 ? ("warning" as const) : ("info" as const),
        },
        {
            label: "읽기/쓰기 비율",
            value: recentStats.readWriteRatio,
            diff: 2,
            desc: "최근 5분 평균",
            status: "info" as const,
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

            {/* 첫 번째 행: 게이지 + 2개 차트 */}
            <ChartGridLayout>
                <WidgetCard title="DISK 사용률" span={2}>
                    <GaugeChart
                        value={data.diskUsage}
                        type="semi-circle"
                        color={DiskUtilizationColor}
                    />
                </WidgetCard>

                <WidgetCard title="프로세스별 디스크 I/O 쓰기량" span={5}>
                    <Chart
                        type="line"
                        series={data.processIO.series}
                        categories={data.processIO.categories}
                        height={250}
                        colors={["#8E79FF", "#FEA29B", "#77B2FB", "#51DAA8"]}
                        isStacked={true}
                        showLegend={true}
                        showGrid={true}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                        }}
                        yaxisOptions={{
                            title: { text: "I/O 쓰기량", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: {
                                formatter: (val: number) => `${(val / 1000).toFixed(1)}K`,
                            },
                        }}
                    />
                </WidgetCard>
                <WidgetCard title="평균 블록 I/O 시간 추이" span={5}>
                    <Chart
                        type="line"
                        series={[
                            { name: "Read Latency (ms)", data: data.blockLatency.readLatency },
                            { name: "Write Latency (ms)", data: data.blockLatency.writeLatency },
                        ]}
                        categories={data.blockLatency.categories}
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
                    />
                </WidgetCard>

            </ChartGridLayout>

            {/* 두 번째 행: 3개 차트 */}
            <ChartGridLayout>
                <WidgetCard title="Disk I/O 지연시간 (ms)" span={4}>
                    <Chart
                        type="line"
                        series={[
                            { name: "지연시간 (ms)", data: data.latency.readLatency },
                        ]}
                        categories={data.latency.categories}
                        height={250}
                        colors={["#8E79FF"]}
                        showLegend={false}
                        showGrid={true}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                        }}
                        yaxisOptions={{
                            title: { text: "지연시간 (ms)", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: { formatter: (val: number) => `${val}ms` },
                        }}
                        tooltipFormatter={(value: number) => `${value}ms`}
                    />
                </WidgetCard>

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
                                title: { text: "IOPS" },
                                labels: {
                                    formatter: (val: number) => `${(val / 1000).toFixed(0)}K`,
                                },
                            },
                            {
                                opposite: true,
                                title: { text: "MB/s" },
                                labels: {
                                    formatter: (val: number) => `${val}MB`,
                                },
                            },
                        ]}
                    />
                </WidgetCard>
                <WidgetCard title="WAL 쓰기량 변화" span={4}>
                    <Chart
                        type="area"
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
                    />
                </WidgetCard>

            </ChartGridLayout>

            {/* 세 번째 행: 2개 차트 */}
            <ChartGridLayout>
                <WidgetCard title="버퍼 교체(Evictions) 추이" span={6}>
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
                    />
                </WidgetCard>

                <WidgetCard title="Reads vs Writes (100%)" span={6}>
                    <Chart
                        type="bar"
                        series={[
                            { name: "Reads (%)", data: data.readsWrites.reads },
                            { name: "Writes (%)", data: data.readsWrites.writes },
                        ]}
                        categories={data.readsWrites.categories}
                        height={250}
                        colors={["#8E79FF", "#FEA29B"]}
                        isStacked={true}
                        showLegend={true}
                        showGrid={true}
                        customOptions={{
                            plotOptions: {
                                bar: {
                                    horizontal: true,
                                },
                            },
                            yaxis: {
                                max: 100,
                            },
                        }}
                    />
                </WidgetCard>
            </ChartGridLayout>
        </div>
    );
}