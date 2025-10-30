import { useQuery } from "@tanstack/react-query";
import Chart from "../../components/chart/ChartComponent";
import "../../styles/engine/hotindex.css";
import WidgetCard from "../../components/util/WidgetCard";
import ChartGridLayout from "../../components/layout/ChartGridLayout";

/** Hot Index API 응답 타입 */
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

/** 더미 데이터 */
const mockData: HotIndexData = {
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

/** API 요청 */
async function fetchHotIndexData() {
    const res = await fetch("/api/dashboard/hotindex");
    if (!res.ok) throw new Error("Failed to fetch hot index data");
    return res.json();
}


/** 메인 컴포넌트 */
export default function HotIndexPage() {
    const { data } = useQuery({
        queryKey: ["hotIndexDashboard"],
        queryFn: fetchHotIndexData,
        retry: 1,
    });

    const dashboard = data || mockData;

    return (
        <div className="hotindex-page">
            {/* 첫 번째 행: 3개 차트 */}
            <ChartGridLayout>
                {/* 인덱스 사용 비중 */}
                <WidgetCard title="인덱스 사용 비중" span={3}>
                    <Chart
                        type="pie"
                        series={dashboard.usageDistribution.data}
                        categories={dashboard.usageDistribution.categories}
                        height={300}
                        colors={["#8E79FF", "#77B2FB", "#51DAA8", "#FEA29B", "#6B7280"]}
                        showLegend={true}
                    />
                </WidgetCard>

                {/* 인덱스 액세스 추이 */}
                <WidgetCard title="인덱스 액세스 추이 (Last 24 Hours)" span={5}>
                    <Chart
                        type="line"
                        series={[
                            { name: "Reads", data: dashboard.accessTrend.reads },
                            { name: "Writes", data: dashboard.accessTrend.writes },
                        ]}
                        categories={dashboard.accessTrend.categories}
                        height={250}
                        colors={["#8E79FF", "#FEA29B"]}
                    />
                </WidgetCard>
                {/* 인덱스 캐시 적중률 추세 */}
                <WidgetCard title="인덱스 캐시 적중률 추세 (Last 24 Hours)" span={4}>
                    <Chart
                        type="line"
                        series={[{ name: "Index Hit Ratio (%)", data: dashboard.cacheHitRatio.data }]}
                        categories={dashboard.cacheHitRatio.categories}
                        height={250}
                        colors={["#8E79FF"]}
                        xaxisOptions={{
                            labels: { rotate: 0, rotateAlways: false }
                        }}
                    />
                </WidgetCard>
            </ChartGridLayout>

            {/* 두 번째 행: 4개 차트 */}
            <ChartGridLayout>
                {/* 인덱스 스캔 속도 추이 */}
                <WidgetCard title="인덱스 스캔 속도 추이 (Last 24 Hours)" span={3}>
                    <Chart
                        type="line"
                        series={[{ name: "Index 스캔 속도 (ms)", data: dashboard.scanSpeed.data }]}
                        categories={dashboard.scanSpeed.categories}
                        height={250}
                        colors={["#8E79FF"]}
                    />
                </WidgetCard>

                {/* 인덱스 효율성 */}
                <WidgetCard title="인덱스 효율성 (Scatter)" span={3}>
                    <Chart
                        type="scatter"
                        series={[{ name: "Indexes", data: dashboard.efficiency.indexes }]}
                        categories={dashboard.efficiency.categories}
                        height={250}
                        colors={["#8E79FF"]}
                    />
                </WidgetCard>

                {/* Top-N 인덱스 사용량 */}
                <WidgetCard title="Top-N 인덱스 사용량 (Last 24 Hours)" span={3}>
                    <Chart
                        type="bar"
                        series={[{ name: "Index Scans", data: dashboard.topUsage.data }]}
                        categories={dashboard.topUsage.categories}
                        height={250}
                        colors={["#8E79FF"]}
                    />
                </WidgetCard>

                {/* 비효율 인덱스 Top-N */}
                <WidgetCard title="비효율 인덱스 Top-N" span={3}>
                    <Chart
                        type="bar"
                        series={[{ name: "Efficiency (%)", data: dashboard.inefficientIndexes.data }]}
                        categories={dashboard.inefficientIndexes.categories}
                        height={250}
                        colors={["#FEA29B"]}
                    />
                </WidgetCard>
            </ChartGridLayout>
        </div>
    );
}