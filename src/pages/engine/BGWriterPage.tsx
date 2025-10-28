import { useState } from "react";
import Chart from "../../components/chart/ChartComponent";
import GaugeChart from "../../components/chart/GaugeChart.tsx";
import "../../styles/engine/bgwriter.css";

// API 응답 전체 구조
interface BGWriterData {
    backendFlushRatio: {
        value: number; // 35.7 (%)
        buffersClean: number; // BGWriter가 플러시한 버퍼 수
        buffersBackend: number; // Backend가 플러시한 버퍼 수
    };
    cleanRate: {
        categories: string[]; // ["0:00", "2:00", ...]
        data: number[]; // Buffers Clean/sec
        average: number;
        max: number;
        min: number;
    };
    bufferFlushRatio: {
        categories: string[];
        backend: number[]; // Backend 데이터
        clean: number[]; // Clean 데이터
        backendTotal: number;
        cleanTotal: number;
    };
    maxwrittenClean: {
        categories: string[];
        data: number[]; // Maxwritten Clean 도달 횟수
        average: number;
        total: number;
    };
    backendFsync: {
        categories: string[];
        data: number[]; // fsync 횟수
        total: number;
    };
    bgwriterVsCheckpoint: {
        categories: string[];
        bgwriter: number[]; // BGWriter 데이터
        checkpoint: number[]; // Checkpoint 데이터
        bgwriterTotal: number;
        checkpointTotal: number;
    };
}

// 더미데이터
const dummyData: BGWriterData = {
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

// Gauge 색상 결정
const getGaugeColor = (value: number): string => {
    if (value < 15) return "#10B981"; // 녹색 (정상)
    if (value < 30) return "#F59E0B"; // 주황색 (주의)
    return "#EF4444"; // 빨간색 (위험)
};

// Gauge 상태 텍스트
const getStatusText = (value: number): string => {
    if (value < 15) return "정상";
    if (value < 30) return "주의";
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

            {/* 컨텐츠 */}
            <div className="chart-content">{children}</div>

            {/* 푸터 */}
            {footer && <div className="chart-footer">{footer}</div>}
        </div>
    );
}

// Stat Item 컴포넌트
interface StatItemProps {
    label: string;
    value: string;
    color?: string;
}

function StatItem({ label, value, color }: StatItemProps) {
    return (
        <div className="stat-item">
            <span className="stat-label" style={color ? { color } : undefined}>
                {label}
            </span>
            <span className="stat-value">{value}</span>
        </div>
    );
}

export default function BGWriterPage() {
    const [data] = useState<BGWriterData>(dummyData);

    const gaugeColor = getGaugeColor(data.backendFlushRatio.value);
    const statusText = getStatusText(data.backendFlushRatio.value);

    return (
        <div className="bgwriter-page">

            <div className="bgwriter-grid">
                <div className="bgwriter-row">
                    <ChartCard
                        title="Backend Flush 비율"
                        statusBadge={statusText}
                        footer={
                            <>
                                <StatItem label="buffersClean" value={`${data.backendFlushRatio.buffersClean}회`} />
                                <StatItem label="buffersBackend" value={`${data.backendFlushRatio.buffersBackend}회`} />
                            </>
                        }
                    >
                        <GaugeChart
                            value={data.backendFlushRatio.value}
                            type="semi-circle"
                            color={gaugeColor}
                            label="Backend Flush"
                        />
                    </ChartCard>

                    <ChartCard
                        title="BGWriter 활동량 추세"
                        footer={
                            <>
                                <StatItem label="평균" value={`${data.cleanRate.average} buffers/sec`} />
                                <StatItem label="최대" value={`${data.cleanRate.max} buffers/sec`} />
                                <StatItem label="최소" value={`${data.cleanRate.min} buffers/sec`} />
                            </>
                        }
                    >
                        <Chart
                            type="line"
                            series={[{ name: "Buffers Clean/sec", data: data.cleanRate.data }]}
                            categories={data.cleanRate.categories}
                            height={250}
                            colors={["#8B5CF6"]}
                            showGrid={true}
                            showLegend={false}
                            xaxisOptions={{
                                title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                            }}
                            yaxisOptions={{
                                title: { text: "Buffers/sec", style: { fontSize: "12px", color: "#6B7280" } },
                            }}
                            tooltipFormatter={(value: number) => `${value} buffers/sec`}
                        />
                    </ChartCard>

                    <ChartCard
                        title="버퍼 플러시 주체별 비율"
                        footer={
                            <>
                                <StatItem
                                    label="● Backend"
                                    value={`${data.bufferFlushRatio.backendTotal.toLocaleString()}개`}
                                    color="#3B82F6"
                                />
                                <StatItem
                                    label="● Clean"
                                    value={`${data.bufferFlushRatio.cleanTotal.toLocaleString()}개`}
                                    color="#10B981"
                                />
                            </>
                        }
                    >
                        <Chart
                            type="area"
                            series={[
                                { name: "Backend", data: data.bufferFlushRatio.backend },
                                { name: "Clean", data: data.bufferFlushRatio.clean },
                            ]}
                            categories={data.bufferFlushRatio.categories}
                            height={250}
                            colors={["#3B82F6", "#10B981"]}
                            showGrid={true}
                            showLegend={true}
                            // stacked={true}
                            xaxisOptions={{
                                title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                            }}
                            yaxisOptions={{
                                title: { text: "Buffers", style: { fontSize: "12px", color: "#6B7280" } },
                            }}
                        />
                    </ChartCard>
                </div>

                <div className="bgwriter-row">
                    <ChartCard
                        title="Clean 스캔 상한 도달 추이"
                        footer={
                            <>
                                <StatItem label="평균" value={`${data.maxwrittenClean.average}회`} />
                                <StatItem label="총 횟수" value={`${data.maxwrittenClean.total}회`} />
                            </>
                        }
                    >
                        <Chart
                            type="line"
                            series={[{ name: "Maxwritten Clean", data: data.maxwrittenClean.data }]}
                            categories={data.maxwrittenClean.categories}
                            height={250}
                            colors={["#F59E0B"]}
                            showGrid={true}
                            showLegend={false}
                            xaxisOptions={{
                                title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                            }}
                            yaxisOptions={{
                                title: { text: "횟수", style: { fontSize: "12px", color: "#6B7280" } },
                            }}
                            tooltipFormatter={(value: number) => `${value}회`}
                        />
                    </ChartCard>

                    <ChartCard
                        title="buffers_backend_fsync 추이"
                        statusBadge={data.backendFsync.total === 0 ? "정상" : "위험"}
                        footer={
                            <>
                                <StatItem
                                    label="총 발생"
                                    value={`${data.backendFsync.total}회`}
                                    color={data.backendFsync.total === 0 ? "#10B981" : "#EF4444"}
                                />
                            </>
                        }
                    >
                        <Chart
                            type="line"
                            series={[{ name: "Fsync Count", data: data.backendFsync.data }]}
                            categories={data.backendFsync.categories}
                            height={250}
                            colors={["#EF4444"]}
                            showGrid={true}
                            showLegend={false}
                            xaxisOptions={{
                                title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                            }}
                            yaxisOptions={{
                                title: { text: "Fsync 횟수", style: { fontSize: "12px", color: "#6B7280" } },
                                min: 0,
                            }}
                            tooltipFormatter={(value: number) => `${value}회`}
                        />
                    </ChartCard>

                    <ChartCard
                        title="BGWriter vs Checkpoint 쓰기 비중"
                        footer={
                            <>
                                <StatItem
                                    label="● BGWriter"
                                    value={`${data.bgwriterVsCheckpoint.bgwriterTotal.toLocaleString()}개`}
                                    color="#8B5CF6"
                                />
                                <StatItem
                                    label="● Checkpoint"
                                    value={`${data.bgwriterVsCheckpoint.checkpointTotal.toLocaleString()}개`}
                                    color="#F59E0B"
                                />
                            </>
                        }
                    >
                        <Chart
                            type="line"
                            series={[
                                { name: "BGWriter", data: data.bgwriterVsCheckpoint.bgwriter },
                                { name: "Checkpoint", data: data.bgwriterVsCheckpoint.checkpoint },
                            ]}
                            categories={data.bgwriterVsCheckpoint.categories}
                            height={250}
                            colors={["#8B5CF6", "#F59E0B"]}
                            showGrid={true}
                            showLegend={true}
                            xaxisOptions={{
                                title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                            }}
                            yaxisOptions={{
                                title: { text: "Buffers", style: { fontSize: "12px", color: "#6B7280" } },
                            }}
                        />
                    </ChartCard>
                </div>
            </div>
        </div>
    );
}