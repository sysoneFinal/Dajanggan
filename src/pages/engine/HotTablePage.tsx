import { useQuery } from "@tanstack/react-query";
import Chart from "../../components/chart/ChartComponent";
import GaugeChart from "../../components/chart/GaugeChart";
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

    return (
        <div className="hottable-page">
            {/* 첫 번째 행: 2개의 게이지 + 1개 차트 */}
            <ChartGridLayout>
                {/* 테이블 캐시 적중률 */}
                <WidgetCard title="테이블 캐시 적중률" span={2}>
                    <div className="session-db-connection-chart">
                        <ul>
                            <li><span className="dot normal"></span>정상</li>
                            <li><span className="dot warn"></span>경고</li>
                            <li><span className="dot danger"></span>위험</li>
                        </ul>

                    <div className="hottable-gauge-container">
                        <GaugeChart
                            value={dashboard.cacheHitRatio.value}
                            status={cacheGaugeStatus}
                            type="semi-circle"
                        />
                    </div>
                </div>
                </WidgetCard>

                {/* Vacuum 지연 시간 */}
                <WidgetCard title="Vacuum 지연 시간" span={2}>
                    <div className="session-db-connection-chart">
                        <ul>
                            <li><span className="dot normal"></span>정상</li>
                            <li><span className="dot warn"></span>경고</li>
                            <li><span className="dot danger"></span>위험</li>
                        </ul>

                        <div className="hottable-gauge-container">
                        <GaugeChart
                            value={vacuumPercent}
                            status={vacuumGaugeStatus}
                            type="semi-circle"
                        />
                    </div>
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