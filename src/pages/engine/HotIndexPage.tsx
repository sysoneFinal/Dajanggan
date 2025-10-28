import { useState } from "react";
import Chart from "../../components/chart/ChartComponent";
import "../../styles/engine/checkpoint.css";

// API 응답 전체 구조
interface HotIndexData {
    usageDistribution: {
        categories: string[];
        data: number[];
    };
    topUsage: {
        categories: string[];
        data: number[];
        total: number;
    };
    inefficientIndexes: {
        categories: string[];
        data: number[];
        total: number;
    };
    cacheHitRatio: {
        categories: string[];
        data: number[];
        average: number;
        min: number;
        max: number;
    };
    efficiency: {
        categories: string[];
        indexes: number[];
    };
    accessTrend: {
        categories: string[];
        reads: number[];
        writes: number[];
        totalReads: number;
        totalWrites: number;
    };
    scanSpeed: {
        categories: string[];
        data: number[];
        average: number;
        max: number;
        min: number;
    };
}

// 더미 데이터
const dummyData: HotIndexData = {
    usageDistribution: {
        categories: [
            "idx_products_category: 15%",
            "idx_payments_order_id: 14%",
            "idx_orders_user_id: 18%",
            "idx_users_email: 19%",
            "Others: 35%"
        ],
        data: [15, 14, 18, 19, 34]
    },
    topUsage: {
        categories: [
            "idx_users_email",
            "idx_orders_user_id",
            "idx_products_category",
            "idx_payments_order_id",
            "idx_inventory_product_id"
        ],
        data: [50000, 45000, 40000, 35000, 32000],
        total: 202000
    },
    inefficientIndexes: {
        categories: [
            "idx_old_created_date",
            "idx_legacy_status",
            "idx_temp_field_old",
            "idx_unused_column",
            "idx_duplicate_index_old"
        ],
        data: [2.3, 1.8, 1.5, 0.8, 0.5],
        total: 40
    },
    cacheHitRatio: {
        categories: [
            "0:00", "2:00", "4:00", "6:00", "8:00", "10:00",
            "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"
        ],
        data: [92, 91, 90, 85, 86, 92, 95, 93, 90, 87, 88, 90],
        average: 90,
        min: 85,
        max: 95
    },
    efficiency: {
        categories: [
            "52000", "48000", "41000", "38000", "35000",
            "32000", "8000", "5000", "25000"
        ],
        indexes: [490, 450, 420, 350, 470, 280, 380, 500, 120]
    },
    accessTrend: {
        categories: [
            "00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "24:00"
        ],
        reads: [800, 1500, 2800, 3000, 2200, 1200, 1000],
        writes: [200, 400, 600, 1000, 800, 400, 200],
        totalReads: 12500,
        totalWrites: 3600
    },
    scanSpeed: {
        categories: [
            "00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "24:00"
        ],
        data: [2.2, 2.0, 4.8, 6.0, 5.2, 3.5, 2.5],
        average: 3.7,
        max: 6.0,
        min: 2.0
    }
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
export default function HotIndexPage() {
    const [data] = useState<HotIndexData>(dummyData);

    return (
        <div className="checkpoint-page">
            <div className="checkpoint-grid">
                <div className="checkpoint-row">
                    <ChartCard title="인덱스 사용 비중">
                        <Chart
                            type="pie"
                            series={data.usageDistribution.data}
                            categories={data.usageDistribution.categories}
                            height={300}
                            colors={["#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", "#6B7280"]}
                            showLegend={true}
                        />
                    </ChartCard>

                    <ChartCard
                        title="Top-N 인덱스 사용량"
                        footer={
                            <>
                                <StatItem label="총 스캔" value={`${data.topUsage.total.toLocaleString()}회`} />
                            </>
                        }
                    >
                        <Chart
                            type="bar"
                            series={[{ name: "Index Scans", data: data.topUsage.data }]}
                            categories={data.topUsage.categories}
                            height={250}
                            colors={["#5B5CF6"]}
                            showGrid={true}
                            showLegend={false}
                            xaxisOptions={{
                                title: { text: "스캔 횟수", style: { fontSize: "12px", color: "#6B7280" } },
                            }}
                            tooltipFormatter={(value: number) => `${value.toLocaleString()}회`}
                        />
                    </ChartCard>

                    <ChartCard
                        title="비효율 인덱스 Top-N"
                        footer={
                            <>
                                <StatItem label="비효율 인덱스" value={`${data.inefficientIndexes.total.toLocaleString()}개`} />
                            </>
                        }>
                        <Chart
                            type="bar"
                            series={[{ name: "Efficiency (%)", data: data.inefficientIndexes.data }]}
                            categories={data.inefficientIndexes.categories}
                            height={250}
                            colors={["#EF4444"]}
                            showGrid={true}
                            showLegend={false}
                            xaxisOptions={{
                                title: { text: "효율성 (%)", style: { fontSize: "12px", color: "#6B7280" } },
                            }}
                            tooltipFormatter={(value: number) => `${value.toFixed(1)}%`}
                        />
                    </ChartCard>
                </div>

                <div className="checkpoint-row">
                    <ChartCard
                        title="인덱스 캐시 적중률 추세"
                        footer={
                            <>
                                <StatItem label="평균" value={`${data.cacheHitRatio.average}%`} />
                                <StatItem label="최대" value={`${data.cacheHitRatio.max}%`} />
                                <StatItem label="최소" value={`${data.cacheHitRatio.min}%`} />
                            </>
                        }
                    >
                        <Chart
                            type="line"
                            series={[{ name: "Index Hit Ratio (%)", data: data.cacheHitRatio.data }]}
                            categories={data.cacheHitRatio.categories}
                            height={250}
                            colors={["#A855F7"]}
                            showGrid={true}
                            showLegend={false}
                            xaxisOptions={{
                                title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                            }}
                            yaxisOptions={{
                                title: { text: "적중률 (%)", style: { fontSize: "12px", color: "#6B7280" } },
                                labels: { formatter: (val: number) => `${val}%` },
                            }}
                            tooltipFormatter={(value: number) => `${value}%`}
                        />
                    </ChartCard>

                    <ChartCard title="인덱스 효율성">
                        <Chart
                            type="scatter"
                            series={[{ name: "Indexes", data: data.efficiency.indexes }]}
                            categories={data.efficiency.categories}
                            height={250}
                            colors={["#10B981"]}
                            showGrid={true}
                            showLegend={false}
                            xaxisOptions={{
                                title: { text: "", style: { fontSize: "12px", color: "#6B7280" } },
                            }}
                            yaxisOptions={{
                                title: { text: "", style: { fontSize: "12px", color: "#6B7280" } },
                            }}
                        />
                    </ChartCard>

                    <ChartCard
                        title="인덱스 액세스 추이"
                        footer={
                            <>
                                <StatItem
                                    label="● Reads"
                                    value={`${data.accessTrend.totalReads.toLocaleString()}`}
                                    color="#3B82F6"
                                />
                                <StatItem
                                    label="● Writes"
                                    value={`${data.accessTrend.totalWrites.toLocaleString()}`}
                                    color="#EF4444"
                                />
                            </>
                        }
                    >
                        <Chart
                            type="line"
                            series={[
                                { name: "Reads", data: data.accessTrend.reads },
                                { name: "Writes", data: data.accessTrend.writes },
                            ]}
                            categories={data.accessTrend.categories}
                            height={250}
                            colors={["#3B82F6", "#EF4444"]}
                            showGrid={true}
                            showLegend={true}
                            xaxisOptions={{
                                title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                            }}
                            yaxisOptions={{
                                title: { text: "액세스", style: { fontSize: "12px", color: "#6B7280" } },
                                labels: { formatter: (val: number) => `${(val / 1000).toFixed(1)}K` },
                            }}
                            tooltipFormatter={(value: number) => `${value.toLocaleString()}`}
                        />
                    </ChartCard>
                </div>

                <div className="checkpoint-row">
                    <ChartCard
                        title="인덱스 스캔 속도 추이"
                        footer={
                            <>
                                <StatItem label="평균" value={`${data.scanSpeed.average.toFixed(1)}ms`} />
                                <StatItem label="최대" value={`${data.scanSpeed.max}ms`} />
                                <StatItem label="최소" value={`${data.scanSpeed.min}ms`} />
                            </>
                        }
                    >
                        <Chart
                            type="line"
                            series={[{ name: "Index 스캔 속도 (ms)", data: data.scanSpeed.data }]}
                            categories={data.scanSpeed.categories}
                            height={250}
                            colors={["#8B5CF6"]}
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
                </div>
            </div>
        </div>
    );
}