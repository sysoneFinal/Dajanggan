import { useState } from "react";
import Chart from "../../components/chart/ChartComponent";
import "../../styles/engine/checkpoint.css";
import GaugeChart from "../../components/chart/GaugeChart";

// API 응답 전체 구조
interface CheckpointData {
    requestRatio: {
        value: number; // 28.5 (%)
        requestedCount: number; // 50회
        timedCount: number; // 125회
    };
    avgWriteTime: {
        categories: string[]; // ["0:00", "2:00", ...]
        data: number[]; // [3, 2.5, 4, ...]
        average: number; // 5.7
        max: number; // 10.0
        min: number; // 2.5
    };
    occurrence: {
        categories: string[];
        requested: number[]; // Requested 데이터
        timed: number[]; // Timed 데이터
        requestedTotal: number; // 271
        timedTotal: number; // 608
        ratio: number; // 30.8%
    };
    walGeneration: {
        categories: string[];
        data: number[]; // bytes 단위
        total: number; // 총 생성량 (bytes)
        average: number; // 평균 (bytes)
        max: number; // 최대 (bytes)
    };
    processTime: {
        categories: string[];
        syncTime: number[]; // Sync Time 데이터
        writeTime: number[]; // Write Time 데이터
        avgSync: number; // 평균 Sync Time
        avgWrite: number; // 평균 Write Time
        avgTotal: number; // 평균 총 시간
    };
    buffer: {
        categories: string[];
        data: number[]; // buffers/sec
        average: number;
        max: number;
        min: number;
    };
}

// 데미 데이터
const dummyData: CheckpointData = {
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
};

// Gauge 색상 결정
const getGaugeColor = (value: number): string => {
    if (value < 20) return "#10B981"; // 녹색 (정상)
    if (value < 30) return "#F59E0B"; // 주황색 (주의)
    return "#EF4444"; // 빨간색 (위험)
};

// Gauge 상태 텍스트
const getStatusText = (value: number): string => {
    if (value < 20) return "정상";
    if (value < 30) return "주의";
    return "위험";
};

// Bytes를 GB로 변환
const formatBytes = (bytes: number): string => {
    return `${(bytes / 1_000_000_000).toFixed(1)}GB`;
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
// 메인 차트
export default function CheckPointPage() {

    const [data] = useState<CheckpointData>(dummyData);

    const gaugeColor = getGaugeColor(data.requestRatio.value);
    const status = getStatusText(data.requestRatio.value);

    return (
        <div className="checkpoint-page">
            <div className="checkpoint-grid">
                <div className="checkpoint-row">
                    <ChartCard
                        title="Checkpoint 요청 비율"
                        statusBadge={status}
                        footer={
                            <>
                                <StatItem label="Requested" value={`${data.requestRatio.requestedCount}회`} />
                                <StatItem label="Timed" value={`${data.requestRatio.timedCount}회`} />
                            </>
                        }
                    >
                        <GaugeChart
                            value={data.requestRatio.value}
                            type="semi-circle"
                            color={gaugeColor}
                            label="Request Ratio"
                        />
                    </ChartCard>

                    <ChartCard
                        title="평균 블록 쓰기 시간"
                        footer={
                            <>
                                <StatItem label="평균" value={`${data.avgWriteTime.average}ms`} />
                                <StatItem label="최대" value={`${data.avgWriteTime.max}ms`} />
                                <StatItem label="최소" value={`${data.avgWriteTime.min}ms`} />
                            </>
                        }
                    >
                        <Chart
                            type="line"
                            series={[{ name: "Avg Write Time (ms)", data: data.avgWriteTime.data }]}
                            categories={data.avgWriteTime.categories}
                            height={250}
                            colors={["#10B981"]}
                            showGrid={true}
                            showLegend={false}
                            xaxisOptions={{
                                title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                            }}
                            yaxisOptions={{
                                title: { text: "시간 (ms)", style: { fontSize: "12px", color: "#6B7280" } },
                                labels: { formatter: (val: number) => `${val.toFixed(1)}ms` },
                            }}
                            tooltipFormatter={(value: number) => `${value.toFixed(2)}ms`}
                        />
                    </ChartCard>

                    <ChartCard
                        title="Checkpoint 발생 추이"
                        footer={
                            <>
                                <StatItem
                                    label="● Requested"
                                    value={`${data.occurrence.requestedTotal}회`}
                                    color="#10B981"
                                />
                                <StatItem
                                    label="● Timed"
                                    value={`${data.occurrence.timedTotal}회`}
                                    color="#3B82F6"
                                />
                                <StatItem label="비율" value={`${data.occurrence.ratio}%`} />
                            </>
                        }
                    >
                        <Chart
                            type="line"
                            series={[
                                { name: "Requested", data: data.occurrence.requested },
                                { name: "Timed", data: data.occurrence.timed },
                            ]}
                            categories={data.occurrence.categories}
                            height={250}
                            colors={["#10B981", "#3B82F6"]}
                            showGrid={true}
                            showLegend={true}
                            xaxisOptions={{
                                title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                            }}
                            yaxisOptions={{
                                title: { text: "발생 횟수", style: { fontSize: "12px", color: "#6B7280" } },
                                labels: { formatter: (val: number) => `${val}회` },
                            }}
                            tooltipFormatter={(value: number) => `${value}회`}
                        />
                    </ChartCard>
                </div>

                {/* 두 번째 행 */}
                <div className="checkpoint-row">
                    <ChartCard
                        title="WAL 생성량 추이"
                        footer={
                            <>
                                <StatItem label="총 생성량" value={formatBytes(data.walGeneration.total)} />
                                <StatItem label="평균" value={`${formatBytes(data.walGeneration.average)}/시간`} />
                                <StatItem label="최대" value={formatBytes(data.walGeneration.max)} />
                            </>
                        }
                    >
                        <Chart
                            type="line"
                            series={[{ name: "WAL Bytes", data: data.walGeneration.data }]}
                            categories={data.walGeneration.categories}
                            height={250}
                            colors={["#8B5CF6"]}
                            showGrid={true}
                            showLegend={false}
                            xaxisOptions={{
                                title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                            }}
                            yaxisOptions={{
                                title: { text: "WAL 생성량", style: { fontSize: "12px", color: "#6B7280" } },
                                labels: { formatter: (val: number) => formatBytes(val) },
                            }}
                            tooltipFormatter={(value: number) => formatBytes(value)}
                        />
                    </ChartCard>

                    <ChartCard
                        title="Checkpoint 처리 시간 추세"
                        footer={
                            <>
                                <StatItem
                                    label="● Sync Time"
                                    value={`평균 ${data.processTime.avgSync}ms`}
                                    color="#F59E0B"
                                />
                                <StatItem
                                    label="● Write Time"
                                    value={`평균 ${data.processTime.avgWrite}ms`}
                                    color="#EF4444"
                                />
                                <StatItem
                                    label="총 시간"
                                    value={`평균 ${(data.processTime.avgTotal / 1000).toFixed(2)}초`}
                                />
                            </>
                        }
                    >
                        <Chart
                            type="line"
                            series={[
                                { name: "Sync Time (ms)", data: data.processTime.syncTime },
                                { name: "Write Time (ms)", data: data.processTime.writeTime },
                            ]}
                            categories={data.processTime.categories}
                            height={250}
                            colors={["#F59E0B", "#EF4444"]}
                            showGrid={true}
                            showLegend={true}
                            xaxisOptions={{
                                title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                            }}
                            yaxisOptions={{
                                title: { text: "처리 시간 (ms)", style: { fontSize: "12px", color: "#6B7280" } },
                                labels: { formatter: (val: number) => `${val}ms` },
                            }}
                            tooltipFormatter={(value: number) => `${value}ms`}
                        />
                    </ChartCard>

                    <ChartCard
                        title="Checkpoint buffer 처리량"
                        footer={
                            <>
                                <StatItem label="평균" value={`${data.buffer.average.toLocaleString()} buffers/sec`} />
                                <StatItem label="최대" value={`${data.buffer.max.toLocaleString()} buffers/sec`} />
                                <StatItem label="최소" value={`${data.buffer.min.toLocaleString()} buffers/sec`} />
                            </>
                        }
                    >
                        <Chart
                            type="line"
                            series={[{ name: "Buffers/sec", data: data.buffer.data }]}
                            categories={data.buffer.categories}
                            height={250}
                            colors={["#8B5CF6"]}
                            showGrid={true}
                            showLegend={false}
                            xaxisOptions={{
                                title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                            }}
                            yaxisOptions={{
                                title: { text: "Buffers/sec", style: { fontSize: "12px", color: "#6B7280" } },
                                labels: { formatter: (val: number) => `${val.toLocaleString()}` },
                            }}
                            tooltipFormatter={(value: number) => `${value.toLocaleString()} buffers/sec`}
                        />
                    </ChartCard>
                </div>
            </div>
        </div>
    );
}