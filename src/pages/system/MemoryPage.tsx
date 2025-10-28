import { useState } from "react";
import Chart from "../../components/chart/ChartComponent";
import GaugeChart from "../../components/chart/GaugeChart";
import "../../styles/system/memory.css";

// API 응답 전체 구조
interface MemoryData {
    memoryUtilization: {
        value: number;
        usedBuffers: number;
        totalBuffers: number;
    };
    bufferHitRatio: {
        value: number;
        hitCount: number;
        totalCount: number;
    };
    sharedBufferUsage: {
        value: number;
        activeBuffers: number;
        totalBuffers: number;
    };
    evictionRate: {
        categories: string[];
        data: number[];
        average: number;
        max: number;
        min: number;
    };
    fsyncRate: {
        categories: string[];
        data: number[];
        average: number;
        max: number;
        backendFsync: number;
    };
    evictionFlushRatio: {
        categories: string[];
        evictions: number[];
        fsyncs: number[];
    };
    sharedBuffersHitRatio: {
        categories: string[];
        data: number[];
        average: number;
    };
    topBufferObjects: {
        labels: string[];
        data: number[];
    };
}

// 더미 데이터
const dummyData: MemoryData = {
    memoryUtilization: {
        value: 35.7,
        usedBuffers: 45000,
        totalBuffers: 126000,
    },
    bufferHitRatio: {
        value: 92.8,
        hitCount: 8500000,
        totalCount: 9160000,
    },
    sharedBufferUsage: {
        value: 78.5,
        activeBuffers: 98910,
        totalBuffers: 126000,
    },
    evictionRate: {
        categories: [
            "0:00", "2:00", "4:00", "6:00", "8:00", "10:00",
            "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"
        ],
        data: [160, 145, 130, 180, 155, 135, 165, 120, 140, 110, 125, 150],
        average: 143,
        max: 180,
        min: 110,
    },
    fsyncRate: {
        categories: [
            "0:00", "2:00", "4:00", "6:00", "8:00", "10:00",
            "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"
        ],
        data: [30, 45, 55, 28, 35, 48, 52, 38, 42, 31, 40, 50],
        average: 41,
        max: 55,
        backendFsync: 0,
    },
    evictionFlushRatio: {
        categories: [
            "0:00", "2:00", "4:00", "6:00", "8:00", "10:00",
            "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"
        ],
        evictions: [160, 145, 130, 180, 155, 135, 165, 120, 140, 110, 125, 150],
        fsyncs: [30, 45, 55, 28, 35, 48, 52, 38, 42, 31, 40, 50],
    },
    sharedBuffersHitRatio: {
        categories: [
            "0:00", "2:00", "4:00", "6:00", "8:00", "10:00",
            "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"
        ],
        data: [95, 93, 94, 92, 96, 95, 93, 94, 95, 96, 94, 93],
        average: 94.2,
    },
    topBufferObjects: {
        labels: ["orders", "users", "products", "payments", "inventory", "audit_log"],
        data: [18.5, 15.2, 12.8, 10.3, 8.7, 6.2],
    },
};

// Gauge 색상 결정 (Memory Utilization)
const getMemoryUtilizationColor = (value: number): string => {
    if (value >= 80 && value <= 95) return "#10B981"; // 녹색 (적정)
    if (value < 80) return "#3B82F6"; // 파란색 (여유)
    return "#EF4444"; // 빨간색 (위험)
};

// Gauge 색상 결정 (Buffer Hit Ratio)
const getHitRatioColor = (value: number): string => {
    if (value >= 95) return "#10B981"; // 녹색 (우수)
    if (value >= 90) return "#F59E0B"; // 주황색 (개선 가능)
    return "#EF4444"; // 빨간색 (낮음)
};

// Gauge 상태 텍스트
const getMemoryStatus = (value: number): string => {
    if (value >= 80 && value <= 95) return "정상";
    if (value < 80) return "여유";
    return "주의";
};

const getHitRatioStatus = (value: number): string => {
    if (value >= 95) return "정상";
    if (value >= 90) return "주의";
    return "위험";
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
            <div className="chart-content">{children}</div>
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

// 메인 Memory 페이지
export default function MemoryPage() {
    const [data] = useState<MemoryData>(dummyData);

    const memoryUtilizationColor = getMemoryUtilizationColor(data.memoryUtilization.value);
    const memoryStatus = getMemoryStatus(data.memoryUtilization.value);

    const hitRatioColor = getHitRatioColor(data.bufferHitRatio.value);
    const hitRatioStatus = getHitRatioStatus(data.bufferHitRatio.value);

    const sharedBufferColor = getMemoryUtilizationColor(data.sharedBufferUsage.value);
    const sharedBufferStatus = getMemoryStatus(data.sharedBufferUsage.value);

    return (
        <div className="memory-page">
            <div className="memory-grid">
                <div className="memory-row">
                    <ChartCard
                        title="MEMORY 사용률"
                        statusBadge={memoryStatus}
                        footer={
                            <>
                                <StatItem
                                    label="사용 중"
                                    value={data.memoryUtilization.usedBuffers.toLocaleString()}
                                />
                                <StatItem
                                    label="전체"
                                    value={data.memoryUtilization.totalBuffers.toLocaleString()}
                                />
                            </>
                        }
                    >
                        <GaugeChart
                            value={data.memoryUtilization.value}
                            type="semi-circle"
                            color={memoryUtilizationColor}
                            label="MEMORY utilization rate"
                        />
                    </ChartCard>

                    <ChartCard
                        title="Buffer 캐시 적중률"
                        statusBadge={hitRatioStatus}
                        footer={
                            <>
                                <StatItem
                                    label="Hit"
                                    value={`${(data.bufferHitRatio.hitCount / 1000000).toFixed(1)}M`}
                                />
                                <StatItem
                                    label="Total"
                                    value={`${(data.bufferHitRatio.totalCount / 1000000).toFixed(1)}M`}
                                />
                            </>
                        }
                    >
                        <GaugeChart
                            value={data.bufferHitRatio.value}
                            type="semi-circle"
                            color={hitRatioColor}
                            label="Hit Ratio"
                        />
                    </ChartCard>

                    <ChartCard
                        title="Shared Buffer 사용 현황"
                        statusBadge={sharedBufferStatus}
                        footer={
                            <>
                                <StatItem
                                    label="Active"
                                    value={data.sharedBufferUsage.activeBuffers.toLocaleString()}
                                />
                                <StatItem
                                    label="Total"
                                    value={data.sharedBufferUsage.totalBuffers.toLocaleString()}
                                />
                            </>
                        }
                    >
                        <GaugeChart
                            value={data.sharedBufferUsage.value}
                            type="semi-circle"
                            color={sharedBufferColor}
                            label="Buffer Usage"
                        />
                    </ChartCard>
                </div>

                <div className="memory-row">
                    <ChartCard
                        title="버퍼 교체율"
                        footer={
                            <>
                                <StatItem label="평균" value={`${data.evictionRate.average}/s`} />
                                <StatItem label="최대" value={`${data.evictionRate.max}/s`} />
                                <StatItem label="최소" value={`${data.evictionRate.min}/s`} />
                            </>
                        }
                    >
                        <Chart
                            type="line"
                            series={[{ name: "Evictions/sec", data: data.evictionRate.data }]}
                            categories={data.evictionRate.categories}
                            height={250}
                            colors={["#EF4444"]}
                            showGrid={true}
                            showLegend={false}
                            xaxisOptions={{
                                title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                            }}
                            yaxisOptions={{
                                title: { text: "Evictions/sec", style: { fontSize: "12px", color: "#6B7280" } },
                                labels: { formatter: (val: number) => `${val}/s` },
                            }}
                            tooltipFormatter={(value: number) => `${value}/s`}
                        />
                    </ChartCard>

                    <ChartCard
                        title="버퍼 플러시 발생 추세"
                        footer={
                            <>
                                <StatItem label="평균" value={`${data.fsyncRate.average}/s`} />
                                <StatItem label="최대" value={`${data.fsyncRate.max}/s`} />
                                <StatItem
                                    label="Backend Fsync"
                                    value={data.fsyncRate.backendFsync === 0 ? "정상" : `${data.fsyncRate.backendFsync}`}
                                />
                            </>
                        }
                    >
                        <Chart
                            type="line"
                            series={[{ name: "Fsyncs/sec", data: data.fsyncRate.data }]}
                            categories={data.fsyncRate.categories}
                            height={250}
                            colors={["#F59E0B"]}
                            showGrid={true}
                            showLegend={false}
                            xaxisOptions={{
                                title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                            }}
                            yaxisOptions={{
                                title: { text: "Fsyncs/sec", style: { fontSize: "12px", color: "#6B7280" } },
                                labels: { formatter: (val: number) => `${val}/s` },
                            }}
                            tooltipFormatter={(value: number) => `${value}/s`}
                        />
                    </ChartCard>

                    <ChartCard
                        title="Eviction 대비 Flush 비율"
                        footer={
                            <>
                                <StatItem
                                    label="● Evictions"
                                    value={`평균 ${data.evictionRate.average}/s`}
                                    color="#EF4444"
                                />
                                <StatItem
                                    label="● Fsyncs"
                                    value={`평균 ${data.fsyncRate.average}/s`}
                                    color="#F59E0B"
                                />
                            </>
                        }
                    >
                        <Chart
                            type="line"
                            series={[
                                { name: "Evictions/sec", data: data.evictionFlushRatio.evictions },
                                { name: "Fsyncs/sec", data: data.evictionFlushRatio.fsyncs },
                            ]}
                            categories={data.evictionFlushRatio.categories}
                            height={250}
                            colors={["#EF4444", "#F59E0B"]}
                            showGrid={true}
                            showLegend={true}
                            xaxisOptions={{
                                title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                            }}
                            yaxisOptions={{
                                title: { text: "Events/sec", style: { fontSize: "12px", color: "#6B7280" } },
                                labels: { formatter: (val: number) => `${val}/s` },
                            }}
                            tooltipFormatter={(value: number) => `${value}/s`}
                        />
                    </ChartCard>
                </div>

                <div className="memory-row">
                    <ChartCard
                        title="Shared Buffers 히트율"
                        footer={
                            <>
                                <StatItem
                                    label="평균 Hit Ratio"
                                    value={`${data.sharedBuffersHitRatio.average}%`}
                                />
                            </>
                        }
                    >
                        <Chart
                            type="line"
                            series={[{ name: "Hit Ratio (%)", data: data.sharedBuffersHitRatio.data }]}
                            categories={data.sharedBuffersHitRatio.categories}
                            height={250}
                            colors={["#10B981"]}
                            showGrid={true}
                            showLegend={false}
                            xaxisOptions={{
                                title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                            }}
                            yaxisOptions={{
                                title: { text: "Hit Ratio (%)", style: { fontSize: "12px", color: "#6B7280" } },
                                labels: { formatter: (val: number) => `${val}%` },
                                min: 85,
                                max: 100,
                            }}
                            tooltipFormatter={(value: number) => `${value}%`}
                        />
                    </ChartCard>

                    <ChartCard
                        title="Top-N 버퍼 점유 객체"
                        footer={
                            <>
                                <StatItem
                                    label="총 점유율"
                                    value={`${data.topBufferObjects.data.reduce((a, b) => a + b, 0).toFixed(1)}%`}
                                />
                            </>
                        }
                    >
                        <Chart
                            type="bar"
                            series={[{ name: "% of Pool", data: data.topBufferObjects.data }]}
                            categories={data.topBufferObjects.labels}
                            height={250}
                            colors={["#8B5CF6"]}
                            showGrid={true}
                            showLegend={false}
                            xaxisOptions={{
                                title: { text: "객체명", style: { fontSize: "12px", color: "#6B7280" } },
                            }}
                            tooltipFormatter={(value: number) => `${value}%`}
                        />
                    </ChartCard>

                    <div style={{ gridColumn: "span 1" }}></div>
                </div>
            </div>
        </div>
    );
}