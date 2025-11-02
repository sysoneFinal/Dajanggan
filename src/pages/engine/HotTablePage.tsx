import { useQuery } from "@tanstack/react-query";
import Chart from "../../components/chart/ChartComponent";
import GaugeChart from "../../components/chart/GaugeChart";
import SummaryCard from "../../components/util/SummaryCard";
import "../../styles/engine/hottable.css";
import WidgetCard from "../../components/util/WidgetCard";
import ChartGridLayout from "../../components/layout/ChartGridLayout";

/** Hot Table API 응답 타입 */
interface HotTableData {
    cacheHitRatio: {
        tableName: string;
        value: number;
    };
    vacuumDelay: {
        tableName: string;
        delayHours: number;
        delaySec: number;
    };
    deadTupleTrend: {
        categories: string[];
        tables: Array<{
            name: string;
            data: number[];
        }>;
    };
    totalDeadTuple: {
        categories: string[];
        data: number[];
        total: number;
        average: number;
        max: number;
    };
    topQueryTables: {
        tableNames: string[];
        scanCounts: number[];
    };
    topDmlTables: {
        tableNames: string[];
        insertCounts: number[];
        updateCounts: number[];
        deleteCounts: number[];
    };
    recentStats?: {
        hotUpdateRatio: number;
        liveDeadTupleRatio: string;
        deadTupleCount: number;
        seqScanRatio: number;           // 변경: totalScans → seqScanRatio (%)
        updateDeleteRatio: number;      // 변경: totalDml → updateDeleteRatio (배율)
    };
}

/** 더미 데이터 */
const mockData: HotTableData = {
    cacheHitRatio: {
        tableName: "orders",
        value: 94.3,
    },
    vacuumDelay: {
        tableName: "orders",
        delayHours: 3.6,
        delaySec: 12960,
    },
    deadTupleTrend: {
        categories: [
            "0:00", "2:00", "4:00", "6:00", "8:00", "10:00",
            "12:00", "14:00", "16:00", "18:00", "20:00", "23:00"
        ],
        tables: [
            { name: "orders", data: [1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6200] },
            { name: "users", data: [500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600] },
            { name: "products", data: [300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400] },
        ],
    },
    totalDeadTuple: {
        categories: [
            "0:00", "2:00", "4:00", "6:00", "8:00", "10:00",
            "12:00", "14:00", "16:00", "18:00", "20:00", "23:00"
        ],
        data: [5000, 8000, 12000, 15000, 18000, 22000, 25000, 28000, 30000, 32000, 35000, 38000],
        total: 268000,
        average: 22333,
        max: 38000,
    },
    topQueryTables: {
        tableNames: ["orders", "users", "products", "payments", "inventory"],
        scanCounts: [1000000, 850000, 720000, 650000, 580000],
    },
    topDmlTables: {
        tableNames: ["orders", "users", "products", "payments", "inventory"],
        insertCounts: [50000, 30000, 25000, 40000, 20000],
        updateCounts: [80000, 60000, 50000, 70000, 40000],
        deleteCounts: [20000, 15000, 10000, 18000, 8000],
    },
    // 최근 5분 평균 통계
    recentStats: {
        hotUpdateRatio: 76,
        liveDeadTupleRatio: "648:1",
        deadTupleCount: 1850,
        seqScanRatio: 18,           // 변경: Sequential Scan 비율 (%)
        updateDeleteRatio: 2.3,     // 변경: (Update+Delete) / Insert 배율
    },
};

/** API 요청 */
async function fetchHotTableData() {
    const res = await fetch("/api/dashboard/hottable");
    if (!res.ok) throw new Error("Failed to fetch hot table data");
    return res.json();
}

const getCacheGaugeStatus = (value: number): "normal" | "warning" | "critical" => {
    if (value >= 95) return "normal";
    if (value >= 85) return "warning";
    return "critical";
};

const getVacuumGaugeStatus = (hours: number): "normal" | "warning" | "critical" => {
    if (hours < 6) return "normal";
    if (hours < 24) return "warning";
    return "critical";
};

const vacuumDelayToPercent = (hours: number): number => {
    const maxHours = 48;
    return Math.min((hours / maxHours) * 100, 100);
};

/** 메인 컴포넌트 */
export default function HotTablePage() {
    const { data } = useQuery({
        queryKey: ["hotTableDashboard"],
        queryFn: fetchHotTableData,
        retry: 1,
    });

    const dashboard = data || mockData;

    const cacheGaugeStatus = getCacheGaugeStatus(dashboard.cacheHitRatio.value);

    const vacuumGaugeStatus = getVacuumGaugeStatus(dashboard.vacuumDelay.delayHours);
    const vacuumPercent = vacuumDelayToPercent(dashboard.vacuumDelay.delayHours);

    // 최근 5분 평균 통계 (API에서 받아오거나 더미 데이터 사용)
    const recentStats = dashboard.recentStats || {
        hotUpdateRatio: 76,
        liveDeadTupleRatio: "648:1",
        deadTupleCount: 1850,
        seqScanRatio: 18,
        updateDeleteRatio: 2.3,
    };

    // 요약 카드 데이터 계산 (최근 5분 평균 기준)
    const summaryCards = [
        {
            label: "HOT 업데이트 비율",
            value: `${recentStats.hotUpdateRatio}%`,
            diff: 2.1,
            desc: "최근 5분 평균",
            status: recentStats.hotUpdateRatio < 60 ? ("warning" as const) : ("info" as const),
        },
        {
            label: "Live/Dead Tuple 비율",
            value: recentStats.liveDeadTupleRatio,
            diff: 15,
            desc: "최근 5분 평균",
            status: "info" as const,
        },
        {
            label: "Dead Tuple 수",
            value: recentStats.deadTupleCount.toLocaleString(),
            diff: 120,
            desc: "최근 5분 평균",
            status: recentStats.deadTupleCount > 3000 ? ("warning" as const) : ("info" as const),
        },
        {
            label: "Seq Scan 비율",  // 변경
            value: `${recentStats.seqScanRatio}%`,  // 변경
            diff: -2,
            desc: "최근 5분 평균",
            status: recentStats.seqScanRatio > 30 ? ("warning" as const) : ("info" as const),
        },
        {
            label: "Update/Delete 비율",  // 변경
            value: `${recentStats.updateDeleteRatio}:1`,  // 변경
            diff: 0.1,
            desc: "최근 5분 평균",
            status: recentStats.updateDeleteRatio > 3 ? ("warning" as const) : ("info" as const),
        },
    ];

    return (
        <div className="hottable-page">
            {/* 상단 요약 카드 */}
            <div className="hottable-summary-cards">
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

            {/* 첫 번째 행: 2개의 게이지 + 1개 차트 */}
            <ChartGridLayout>
                {/* 테이블 캐시 적중률 */}
                <WidgetCard title="테이블 캐시 적중률" span={2}>
                    <div className="hottable-gauge-container">
                        <GaugeChart
                            value={dashboard.cacheHitRatio.value}
                            status={cacheGaugeStatus}
                            type="semi-circle"
                        />
                    </div>
                </WidgetCard>

                {/* Vacuum 지연 시간 */}
                <WidgetCard title="Vacuum 지연 시간" span={2}>
                    <div className="hottable-gauge-container">
                        <GaugeChart
                            value={vacuumPercent}
                            status={vacuumGaugeStatus}
                            type="semi-circle"
                        />
                    </div>
                </WidgetCard>

                {/* 테이블별 Dead Tuple 추이 */}
                <WidgetCard title="테이블별 Dead Tuple 추이 (Last 24 Hours)" span={4}>
                    <Chart
                        type="line"
                        series={dashboard.deadTupleTrend.tables.map((table) => ({
                            name: table.name,
                            data: table.data,
                        }))}
                        categories={dashboard.deadTupleTrend.categories}
                        colors={["#8E79FF", "#77B2FB", "#FEA29B"]}
                        height={250}
                    />
                </WidgetCard>
                {/* DB 전체 Dead Tuple 추이 */}
                <WidgetCard title="DB 전체 Dead Tuple 추이 (Last 24 Hours)" span={4}>
                    <Chart
                        type="area"
                        series={[{ name: "Total Dead Tuples", data: dashboard.totalDeadTuple.data }]}
                        categories={dashboard.totalDeadTuple.categories}
                        colors={["#8E79FF"]}
                        height={250}
                    />
                </WidgetCard>
            </ChartGridLayout>

            {/* 두 번째 행: 3개 차트 */}
            <ChartGridLayout>
                {/* Top-N 테이블 조회량 */}
                <WidgetCard title="Top-N 테이블 조회량 (Last 24 Hours)" span={6}>
                    <Chart
                        type="bar"
                        series={[{ name: "Scan Count", data: dashboard.topQueryTables.scanCounts }]}
                        categories={dashboard.topQueryTables.tableNames}
                        colors={["#8E79FF"]}
                        height={250}
                    />
                </WidgetCard>

                {/* Top-N 테이블 DML량 */}
                <WidgetCard title="Top-N 테이블 DML량 (Last 24 Hours)" span={6}>
                    <Chart
                        type="bar"
                        series={[
                            { name: "Delete", data: dashboard.topDmlTables.deleteCounts },
                            { name: "Insert", data: dashboard.topDmlTables.insertCounts },
                            { name: "Update", data: dashboard.topDmlTables.updateCounts },
                        ]}
                        categories={dashboard.topDmlTables.tableNames}
                        colors={["#FEA29B", "#8E79FF", "#77B2FB"]}
                        height={250}
                        isStacked={true}
                    />

                </WidgetCard>
            </ChartGridLayout>
        </div>
    );
}