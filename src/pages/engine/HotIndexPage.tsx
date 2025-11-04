import { useQuery } from "@tanstack/react-query";
import Chart from "../../components/chart/ChartComponent";
import SummaryCard from "../../components/util/SummaryCard";
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
    recentStats?: {
        cacheHitRatio: number;
        avgScanSpeed: number;
        totalReads: number;
        totalWrites: number;
        inefficientCount: number;
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
    },
    // 최근 5분 평균 통계
    recentStats: {
        cacheHitRatio: 91.5,
        avgScanSpeed: 3.2,
        totalReads: 520,
        totalWrites: 145,
        inefficientCount: 5,
    },
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

    // 요약 카드 데이터 계산 (최근 5분 평균 기준)
    const summaryCards = [
        {
            label: "인덱스 스캔 효율",
            value: "89.3%",
            diff: 1.2,
            desc: "Index / (Index + Seq) 비율",
            status: "warning" as const, // 90% 미만
        },
        {
            label: "인덱스/테이블 비율",
            value: "28%",
            diff: -0.5,
            desc: "전체 인덱스 크기 비중",
            status: "info" as const, // 30% 미만
        },
        {
            label: "미사용 인덱스",
            value: "3",
            diff: 0,
            desc: "삭제 검토 필요",
            status: "warning" as const,
        },
        {
            label: "Bloat 인덱스",
            value: "3개",
            diff: 1,
            desc: "REINDEX 필요 인덱스",
            status: "warning" as const,
        },
        {
            label: "대형 테이블 Seq Scan",
            value: "6.2%",
            diff: -1.3,
            desc: "1만 row 이상 테이블",
            status: "info" as const, // 5-15% 범위
        },
    ];

    return (
        <div className="hotindex-page">
            {/* 상단 요약 카드 */}
            <div className="hotindex-summary-cards">
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
                {/* 인덱스 스캔 속도 추이 - 실무 임계치 적용 */}
                <WidgetCard title="인덱스 스캔 속도 추이 (Last 24 Hours)" span={3}>
                    <Chart
                        type="line"
                        series={[
                            {
                                name: "Index 스캔 속도 (ms)",
                                data: dashboard.scanSpeed.data
                            }
                        ]}
                        categories={dashboard.scanSpeed.categories}
                        height={250}
                        colors={["#8E79FF"]}
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
                                        opacity: 0.8,
                                        label: {
                                            borderColor: "#FEA29B",
                                            style: {
                                                color: "#fff",
                                                background: "#FEA29B",
                                                fontSize: "11px",
                                                fontWeight: 600,
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
                                    formatter: (val: number) => `${val.toFixed(1)}ms`,
                                },
                                min: 0,
                                max: 25,
                            },
                        }}
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