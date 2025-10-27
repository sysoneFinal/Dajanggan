import { useState } from "react";
import Chart from "../../components/chart/ChartComponent";
import GaugeChart from "../../components/chart/GaugeChart";
import "../../styles/engine/hottable.css";

// API 응답 전체 구조
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

// 더미 데이터
const dummyData: HotTableData = {
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

// Gauge 색상 결정 (캐시 적중률)
const getCacheGaugeColor = (value: number): string => {
    if (value >= 95) return "#10B981"; // 녹색 (정상)
    if (value >= 85) return "#F59E0B"; // 주황색 (주의)
    return "#EF4444"; // 빨간색 (위험)
};

// Gauge 색상 결정 (Vacuum 지연)
const getVacuumGaugeColor = (hours: number): string => {
    if (hours < 6) return "#10B981"; // 녹색 (정상)
    if (hours < 24) return "#F59E0B"; // 주황색 (주의)
    return "#EF4444"; // 빨간색 (위험)
};

// Gauge 상태 텍스트 (캐시 적중률)
const getCacheStatusText = (value: number): string => {
    if (value >= 95) return "정상";
    if (value >= 85) return "주의";
    return "위험";
};

// Gauge 상태 텍스트 (Vacuum 지연)
const getVacuumStatusText = (hours: number): string => {
    if (hours < 6) return "정상";
    if (hours < 24) return "주의";
    return "위험";
};

// Vacuum 지연 시간을 퍼센트로 변환 (24시간 기준 100%)
const vacuumDelayToPercent = (hours: number): number => {
    const maxHours = 48;
    return Math.min((hours / maxHours) * 100, 100);
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
export default function HotTablePage() {
    const [data] = useState<HotTableData>(dummyData);

    const cacheGaugeColor = getCacheGaugeColor(data.cacheHitRatio.value);
    const cacheStatus = getCacheStatusText(data.cacheHitRatio.value);

    const vacuumGaugeColor = getVacuumGaugeColor(data.vacuumDelay.delayHours);
    const vacuumStatus = getVacuumStatusText(data.vacuumDelay.delayHours);
    const vacuumPercent = vacuumDelayToPercent(data.vacuumDelay.delayHours);

    return (
        <div className="hot-table-page">
            <div className="hot-table-grid">
                <div className="hot-table-row">
                    <ChartCard
                        title="테이블 캐시 적중률"
                        statusBadge={cacheStatus}
                        footer={
                            <>
                                <StatItem label="테이블" value={data.cacheHitRatio.tableName} />
                                <StatItem label="Cache Hit Ratio" value={`${data.cacheHitRatio.value}%`} />
                            </>
                        }
                    >
                        <GaugeChart
                            value={data.cacheHitRatio.value}
                            type="semi-circle"
                            color={cacheGaugeColor}
                            label="Cache Hit Ratio"
                        />
                    </ChartCard>

                    <ChartCard
                        title="Vacuum 지연 시간"
                        statusBadge={vacuumStatus}
                        footer={
                            <>
                                <StatItem label="테이블" value={data.vacuumDelay.tableName} />
                                <StatItem label="지연 시간" value={`${data.vacuumDelay.delayHours.toFixed(1)}시간`} />
                            </>
                        }
                    >
                        <GaugeChart
                            value={vacuumPercent}
                            type="semi-circle"
                            color={vacuumGaugeColor}
                            label="Delay (hours)"
                        />
                    </ChartCard>

                    <ChartCard
                        title="테이블별 Dead Tuple 추이"
                        footer={
                            <>
                                {data.deadTupleTrend.tables.map((table, idx) => (
                                    <StatItem
                                        key={table.name}
                                        label={`● ${table.name}`}
                                        value={`${table.data[table.data.length - 1].toLocaleString()}`}
                                        color={["#8B5CF6", "#10B981", "#F59E0B"][idx]}
                                    />
                                ))}
                            </>
                        }
                    >
                        <Chart
                            type="line"
                            series={data.deadTupleTrend.tables.map(table => ({
                                name: table.name,
                                data: table.data
                            }))}
                            categories={data.deadTupleTrend.categories}
                            height={250}
                            colors={["#8B5CF6", "#10B981", "#F59E0B"]}
                            showGrid={true}
                            showLegend={true}
                            xaxisOptions={{
                                title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                            }}
                            yaxisOptions={{
                                title: { text: "Dead Tuples", style: { fontSize: "12px", color: "#6B7280" } },
                                labels: { formatter: (val: number) => val.toLocaleString() },
                            }}
                            tooltipFormatter={(value: number) => `${value.toLocaleString()} tuples`}
                        />
                    </ChartCard>
                </div>

                <div className="hot-table-row">
                    <ChartCard
                        title="DB 전체 Dead Tuple 추이"
                        footer={
                            <>
                                <StatItem label="총합" value={data.totalDeadTuple.total.toLocaleString()} />
                                <StatItem label="평균" value={data.totalDeadTuple.average.toLocaleString()} />
                                <StatItem label="최대" value={data.totalDeadTuple.max.toLocaleString()} />
                            </>
                        }
                    >
                        <Chart
                            type="area"
                            series={[{ name: "Total Dead Tuples", data: data.totalDeadTuple.data }]}
                            categories={data.totalDeadTuple.categories}
                            height={250}
                            colors={["#EF4444"]}
                            showGrid={true}
                            showLegend={false}
                            xaxisOptions={{
                                title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                            }}
                            yaxisOptions={{
                                title: { text: "Dead Tuples", style: { fontSize: "12px", color: "#6B7280" } },
                                labels: { formatter: (val: number) => val.toLocaleString() },
                            }}
                            tooltipFormatter={(value: number) => `${value.toLocaleString()} tuples`}
                        />
                    </ChartCard>

                    <ChartCard
                        title="Top-N 테이블 조회량"
                        footer={
                            <>
                                <StatItem label="1위" value={data.topQueryTables.tableNames[0]} />
                                <StatItem label="조회수" value={data.topQueryTables.scanCounts[0].toLocaleString()} />
                            </>
                        }
                    >
                        <Chart
                            type="bar"
                            series={[{ name: "Scan Count", data: data.topQueryTables.scanCounts }]}
                            categories={data.topQueryTables.tableNames}
                            height={250}
                            colors={["#3B82F6"]}
                            showGrid={true}
                            showLegend={false}
                            xaxisOptions={{
                                title: { text: "테이블", style: { fontSize: "12px", color: "#6B7280" } },
                            }}
                            yaxisOptions={{
                                title: { text: "Scan Count", style: { fontSize: "12px", color: "#6B7280" } },
                                labels: { formatter: (val: number) => val.toLocaleString() },
                            }}
                            tooltipFormatter={(value: number) => `${value.toLocaleString()} scans`}
                        />
                    </ChartCard>

                    <ChartCard
                        title="Top-N 테이블 DML량"
                        footer={
                            <>
                                <StatItem label="● Delete" value="삭제" color="#EF4444" />
                                <StatItem label="● Insert" value="삽입" color="#3B82F6" />
                                <StatItem label="● Update" value="수정" color="#F59E0B" />
                            </>
                        }
                    >
                        <Chart
                            type="bar"
                            series={[
                                { name: "Delete", data: data.topDmlTables.deleteCounts },
                                { name: "Insert", data: data.topDmlTables.insertCounts },
                                { name: "Update", data: data.topDmlTables.updateCounts },
                            ]}
                            categories={data.topDmlTables.tableNames}
                            height={250}
                            colors={["#EF4444", "#3B82F6", "#F59E0B"]}
                            showGrid={true}
                            showLegend={true}
                            isStacked={true}
                            xaxisOptions={{
                                title: { text: "테이블", style: { fontSize: "12px", color: "#6B7280" } },
                            }}
                            yaxisOptions={{
                                title: { text: "DML Count", style: { fontSize: "12px", color: "#6B7280" } },
                                labels: { formatter: (val: number) => val.toLocaleString() },
                            }}
                            tooltipFormatter={(value: number) => `${value.toLocaleString()} operations`}
                        />
                    </ChartCard>
                </div>
            </div>
        </div>
    );
}