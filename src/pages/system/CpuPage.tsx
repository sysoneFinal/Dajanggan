import { useState } from "react";
import Chart from "../../components/chart/ChartComponent";
import GaugeChart from "../../components/chart/GaugeChart";
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
};

// Gauge 색상 결정
const getGaugeColor = (value: number): string => {
    if (value < 70) return "#10B981"; // 녹색 (정상)
    if (value < 90) return "#F59E0B"; // 주황색 (주의)
    return "#EF4444"; // 빨간색 (위험)
};

// Gauge 상태 텍스트
const getStatusText = (value: number): string => {
    if (value < 70) return "정상";
    if (value < 90) return "주의";
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

// 메인 페이지
export default function CPUPage() {
    const [data] = useState<CPUData>(dummyData);

    const gaugeColor = getGaugeColor(data.cpuUsage.value);
    const status = getStatusText(data.cpuUsage.value);

    return (
        <div className="cpu-page">
            <div className="cpu-grid">
                <div className="cpu-row">
                    <ChartCard
                        title="CPU 사용률"
                        statusBadge={status}
                    >
                        <GaugeChart
                            value={data.cpuUsage.value}
                            type="semi-circle"
                            color={gaugeColor}
                            label={data.cpuUsage.description}
                        />
                    </ChartCard>

                    <ChartCard
                        title="CPU 사용률 추이"
                    >
                        <Chart
                            type="line"
                            series={[{ name: "CPU 사용률 (%)", data: data.cpuUsageTrend.data }]}
                            categories={data.cpuUsageTrend.categories}
                            height={250}
                            colors={["#3B82F6"]}
                            showGrid={true}
                            showLegend={false}
                            xaxisOptions={{
                                title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                            }}
                            yaxisOptions={{
                                title: { text: "사용률 (%)", style: { fontSize: "12px", color: "#6B7280" } },
                                labels: { formatter: (val: number) => `${val}%` },
                                min: 0,
                                max: 100,
                            }}
                            tooltipFormatter={(value: number) => `${value}%`}
                        />
                    </ChartCard>

                    <ChartCard
                        title="CPU 부하 유형별 분석"
                    >
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
                            colors={["#3B82F6", "#10B981", "#F59E0B", "#A855F7"]}
                            showGrid={true}
                            showLegend={true}
                            xaxisOptions={{
                                title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                            }}
                            yaxisOptions={{
                                title: { text: "CPU (%)", style: { fontSize: "12px", color: "#6B7280" } },
                                labels: { formatter: (val: number) => `${val}%` },
                            }}
                            tooltipFormatter={(value: number) => `${value}%`}
                        />
                    </ChartCard>
                </div>

                <div className="cpu-row">
                    <ChartCard
                        title="I/O Wait vs 디스크 Latency 상관관계"
                        footer={
                            <>
                                <StatItem label="● 높은 상관관계 (I/O Wait > 30%)" value="" color="#EF4444" />
                                <StatItem label="● 주의 상관관계 (I/O Wait 20-30%)" value="" color="#F59E0B" />
                                <StatItem label="● 정상 상태" value="" color="#10B981" />
                            </>
                        }
                    >
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
                            colors={["#10B981", "#F59E0B", "#EF4444"]}
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
                    </ChartCard>

                    <ChartCard
                        title="사용자별 CPU 사용량"
                        footer={
                            <>
                                <StatItem
                                    label="최대 사용자"
                                    value={`${data.cpuByUser.users[0]} (${(data.cpuByUser.cpuTime[0] / 1000).toFixed(1)}초)`}
                                />
                            </>
                        }
                    >
                        <Chart
                            type="bar"
                            series={[
                                { name: "CPU Time (ms)", data: data.cpuByUser.cpuTime }
                            ]}
                            categories={data.cpuByUser.users}
                            height={250}
                            colors={["#A855F7"]}
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
                    </ChartCard>

                    <ChartCard
                        title="대기 유형별 비중 변화 (100%)"
                    >
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
                            colors={["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#6B7280"]}
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
                    </ChartCard>
                </div>
            </div>
        </div>
    );
}