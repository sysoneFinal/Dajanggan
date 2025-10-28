import { useState } from "react";
import Chart from "../../components/chart/ChartComponent";
import GaugeChart from "../../components/chart/GaugeChart";
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
};

// 상태 판정 함수
const getStatusText = (usage: number): string => {
    if (usage >= 80) return "위험";
    if (usage >= 60) return "주의";
    return "정상";
};

// 차트 카드 컴포넌트
interface ChartCardProps {
    title: string;
    statusBadge?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
}

function ChartCard({ title, statusBadge, children, footer }: ChartCardProps) {
    return (
        <div className="chart-card">
            {/* 헤더 */}
            <div className="chart-header">
                <div className="chart-title-group">
                    <h3 className="chart-title">{title}</h3>
                </div>
                {statusBadge && (
                    <span
                        className={`status-badge ${
                            statusBadge === "정상"
                                ? "status-normal"
                                : statusBadge === "주의"
                                    ? "status-warning"
                                    : "status-danger"
                        }`}
                    >
                        {statusBadge}
                    </span>
                )}
            </div>

            {/* 내용 */}
            <div className="chart-content">{children}</div>

            {/* 푸터 */}
            {footer && <div className="chart-footer">{footer}</div>}
        </div>
    );
}

// 통계 아이템 컴포넌트
interface StatItemProps {
    label: string;
    value: string;
    color?: string;
}

function StatItem({ label, value, color }: StatItemProps) {
    return (
        <div className="stat-item">
            <span className="stat-label" style={{ color }}>
                {label}
            </span>
            <span className="stat-value">{value}</span>
        </div>
    );
}

// 메인 컴포넌트
export default function DiskPage() {
    const [data] = useState<DiskIOData>(dummyData);

    const statusText = getStatusText(data.diskUsage);

    return (
        <div className="checkpoint-page">
            <div className="checkpoint-grid">
                <div className="checkpoint-row">
                    <ChartCard
                        title="DISK 사용률"
                        statusBadge={statusText}
                        footer={
                            <StatItem label="현재 사용률" value={`${data.diskUsage}%`} />
                        }
                    >
                        <GaugeChart
                            value={data.diskUsage}
                            type="semi-circle"
                            color="#8B5CF6"
                            label="Backend Flush"
                        />
                    </ChartCard>

                    <ChartCard title="프로세스별 디스크 I/O 쓰기량">
                        <Chart
                            type="column"
                            series={data.processIO.series}
                            categories={data.processIO.categories}
                            height={250}
                            colors={["#9333EA", "#10B981", "#3B82F6", "#F59E0B"]}
                            isStacked={true}
                            showLegend={true}
                            showGrid={true}
                            customOptions={{
                                dataLabels: {
                                    enabled: false,
                                    style: {
                                        colors: ['transparent']
                                    }
                                },
                                plotOptions: {
                                    bar: {
                                        dataLabels: {
                                            total: {
                                                enabled: false
                                            }
                                        }
                                    }
                                }
                            }}
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
                    </ChartCard>
                    <ChartCard title="Reads vs Writes (100%)">
                        <Chart
                            type="bar"
                            series={[
                                { name: "Reads (%)", data: data.readsWrites.reads },
                                { name: "Writes (%)", data: data.readsWrites.writes },
                            ]}
                            categories={data.readsWrites.categories}
                            height={250}
                            colors={["#10B981", "#EF4444"]}
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
                    </ChartCard>
                </div>
                <div className="checkpoint-row">
                    <ChartCard
                        title="Disk I/O 지연시간 (ms)"
                        footer={
                            <>
                                <StatItem label="평균" value={`${data.latency.average.toFixed(1)}ms`} />
                                <StatItem label="최대" value={`${data.latency.max}ms`} />
                                <StatItem label="최소" value={`${data.latency.min}ms`} />
                            </>
                        }
                    >
                        <Chart
                            type="line"
                            series={[
                                { name: "지연시간 (ms)", data: data.latency.readLatency },
                            ]}
                            categories={data.latency.categories}
                            height={250}
                            colors={["#EF4444"]}
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
                    </ChartCard>
                    <ChartCard title="Disk 처리 효율 (IOPS vs MB/s)">
                        <Chart
                            type="line"
                            series={[
                                { name: "IOPS", data: data.throughput.iops },
                                { name: "처리량 (MB/s)", data: data.throughput.throughputMB },
                            ]}
                            categories={data.throughput.categories}
                            height={250}
                            colors={["#3B82F6", "#10B981"]}
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
                    </ChartCard>
                    <ChartCard title="평균 블록 I/O 시간 추이">
                        <Chart
                            type="line"
                            series={[
                                { name: "Read Latency (ms)", data: data.blockLatency.readLatency },
                                { name: "Write Latency (ms)", data: data.blockLatency.writeLatency },
                            ]}
                            categories={data.blockLatency.categories}
                            height={250}
                            colors={["#3B82F6", "#EF4444"]}
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
                    </ChartCard>
                </div>
                <div className="checkpoint-row">
                    <ChartCard
                        title="버퍼 교체(Evictions) 추이"
                        footer={
                            <StatItem label="평균 교체율" value={`${data.evictions.average}/sec`} />
                        }
                    >
                        <Chart
                            type="line"
                            series={[{ name: "Evictions/sec", data: data.evictions.evictionRate }]}
                            categories={data.evictions.categories}
                            height={250}
                            colors={["#F59E0B"]}
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
                    </ChartCard>
                    <ChartCard
                        title="WAL 쓰기량 변화"
                        footer={
                            <StatItem
                                label="평균 WAL"
                                value={`${(data.walBytes.average / 1000000).toFixed(1)}MB/s`}
                            />
                        }
                    >
                        <Chart
                            type="area"
                            series={[{ name: "WAL Bytes/sec", data: data.walBytes.walBytes }]}
                            categories={data.walBytes.categories}
                            height={250}
                            colors={["#9333EA"]}
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
                    </ChartCard>
                    <div className="chart-card" style={{ visibility: "hidden" }}></div>
                </div>
            </div>
        </div>
    );
}