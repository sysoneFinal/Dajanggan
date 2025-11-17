import { useState, useEffect } from "react";
import Chart from "../../components/chart/ChartComponent";
import SummaryCard from "../../components/util/SummaryCard";
import WidgetCard from "../../components/util/WidgetCard";
import ChartGridLayout from "../../components/layout/ChartGridLayout";
import "../../styles/system/cpu.css";
import apiClient from "../../api/apiClient";
import { useQuery } from "@tanstack/react-query";
import { useInstanceContext } from "../../context/InstanceContext";

// ===== PDF 기반 백엔드 API 응답 구조 =====
interface CpuDashboardData {
    widgets: {
        osCpuUsage: {
            current: number;
            trend: number;
            status: "정상" | "주의" | "위험";
        };
        postgresqlTps: {
            current: number;
            trend: number;
            status: "정상" | "주의" | "위험";
        };
        errorRate: {
            rollbackTps: number;
            errorRate: number;
            status: "정상" | "주의" | "위험";
        };
        backendProcesses: {
            clientBackend: number;
            autovacuum: number;
            parallelWorker: number;
        };
        loadAverage: {
            load1m: number;
            load5m: number;
            load15m: number;
            cpuCoreCount: number;
        };
    };
    charts: {
        osCpuUsageTrend1h: {
            categories: string[];
            data: number[];
        };
        postgresqlTpsTrend1h: {
            categories: string[];
            commitTps: number[];
            rollbackTps: number[];
        };
        osCpuVsActiveConnections24h: {
            categories: string[];
            osCpuUsage: number[];
            activeConnections: number[];
        };
        loadAverageTrend24h: {
            categories: string[];
            load1m: number[];
            load5m: number[];
            load15m: number[];
            cpuCoreCount: number;
        };
        connectionStatus24h: {
            categories: string[];
            active: number[];
            idle: number[];
            idleInTx: number[];
        };
        tpsDailyTrend24h: {
            categories: string[];
            commitTps: number[];
            rollbackTps: number[];
        };
        waitEventDistribution24h: {
            categories: string[];
            lock: number[];
            io: number[];
            client: number[];
            activity: number[];
            lwlock: number[];
            other: number[];
        };
        backendTypeTrend24h: {
            categories: string[];
            client: number[];
            autovacuum: number[];
            parallel: number[];
            background: number[];
        };
        errorRateTrend24h: {
            categories: string[];
            data: number[];
        };
    };
}

// SSE 실시간 데이터 타입
interface RealtimeMetrics {
    timestamp: number;
    cpu: number;
    memory: number;
    diskUsage: number;
    diskRead: number;
    diskWrite: number;
    loadAverage?: number[];
}

/** API 요청 */
async function fetchCPUDashboard(instanceId: number) {
    const response = await apiClient.get<CpuDashboardData>("/system/cpu", {
        params: { instanceId }
    });
    return response.data;
}

// 메인 페이지
export default function CPUPage() {
    const { selectedInstance } = useInstanceContext();

    // 실시간 데이터 상태
    const [realtimeCpu, setRealtimeCpu] = useState<number | null>(null);
    const [realtimeLoadAverage, setRealtimeLoadAverage] = useState<number[] | null>(null);

    // 대시보드 데이터 조회
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["cpuDashboard", selectedInstance?.instanceId],
        queryFn: () => fetchCPUDashboard(selectedInstance!.instanceId),
        retry: 1,
        enabled: !!selectedInstance,
        refetchInterval: 60000, // 1분마다 갱신
    });

    // SSE 연결 - OS 메트릭 실시간 수신
    useEffect(() => {
        if (!selectedInstance) return;

        const instanceId = selectedInstance.instanceId;
        const eventSource = new EventSource(
            `${import.meta.env.VITE_API_BASE_URL}/osmetric/stream/${instanceId}`
        );

        eventSource.addEventListener('metrics', (event) => {
            try {
                const metrics: RealtimeMetrics = JSON.parse(event.data);
                setRealtimeCpu(metrics.cpu);
                setRealtimeLoadAverage(metrics.loadAverage || null);
            } catch (error) {
                console.error('SSE 데이터 파싱 오류:', error);
            }
        });

        eventSource.onerror = (error) => {
            console.error('SSE 연결 오류:', error);
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, [selectedInstance]);

    if (!selectedInstance) {
        return (
            <div className="cpu-page">
                <div style={{ padding: "2rem", textAlign: "center" }}>
                    인스턴스를 선택해주세요.
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="cpu-page">
                <div style={{ padding: "2rem", textAlign: "center" }}>
                    CPU 데이터를 불러오는 중...
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="cpu-page">
                <div style={{ padding: "2rem", textAlign: "center", color: "#EF4444" }}>
                    데이터 로드 실패: {error?.message || "알 수 없는 오류"}
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="cpu-page">
                <div style={{ padding: "2rem", textAlign: "center" }}>
                    데이터가 없습니다.
                </div>
            </div>
        );
    }

    const { widgets, charts } = data;

    // 실시간 CPU 값 (SSE 우선, 없으면 위젯 값 사용)
    const displayCpuValue = realtimeCpu !== null ? realtimeCpu : widgets.osCpuUsage.current;

    // 실시간 Load Average 값 (SSE 우선, 없으면 위젯 값 사용)
    const displayLoadAverage = realtimeLoadAverage || [
        widgets.loadAverage.load1m,
        widgets.loadAverage.load5m,
        widgets.loadAverage.load15m,
    ];

    return (
        <div className="cpu-page">
            {/* ===== 위젯 영역 (5개) ===== */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: "1rem",
                marginBottom: "1.5rem"
            }}>
                <SummaryCard
                    label="OS CPU 사용률"
                    value={`${displayCpuValue.toFixed(1)}%`}
                    diff={widgets.osCpuUsage.trend}
                    desc="1분 전 대비"
                    status={widgets.osCpuUsage.status === "정상" ? "info" : widgets.osCpuUsage.status === "주의" ? "warning" : "critical"}
                />

                <SummaryCard
                    label="PostgreSQL TPS"
                    value={widgets.postgresqlTps.current.toLocaleString()}
                    diff={widgets.postgresqlTps.trend}
                    desc="1분 전 대비"
                    status={widgets.postgresqlTps.status === "정상" ? "info" : widgets.postgresqlTps.status === "주의" ? "warning" : "critical"}
                />

                <SummaryCard
                    label="에러율"
                    value={`${widgets.errorRate.errorRate.toFixed(2)}%`}
                    desc={`롤백 TPS: ${widgets.errorRate.rollbackTps}`}
                    status={widgets.errorRate.status === "정상" ? "info" : widgets.errorRate.status === "주의" ? "warning" : "critical"}
                />

                <SummaryCard
                    label="Backend 프로세스"
                    value={widgets.backendProcesses.clientBackend}
                    desc={`Auto: ${widgets.backendProcesses.autovacuum} | Parallel: ${widgets.backendProcesses.parallelWorker}`}
                />

                <SummaryCard
                    label="Load Average (1m)"
                    value={displayLoadAverage[0].toFixed(2)}
                    desc={`5m: ${displayLoadAverage[1].toFixed(2)} | 15m: ${displayLoadAverage[2].toFixed(2)}`}
                    status={displayLoadAverage[0] > widgets.loadAverage.cpuCoreCount ? "warning" : "info"}
                />
            </div>

            {/* ===== 차트 영역 (9개) ===== */}

            {/* 차트 1-2: 1시간 추이 */}
            <ChartGridLayout>
                <WidgetCard title="OS CPU 사용률 추이 (최근 1시간)" span={4}>
                    <Chart
                        type="line"
                        series={[{ name: "CPU 사용률", data: charts.osCpuUsageTrend1h.data }]}
                        categories={charts.osCpuUsageTrend1h.categories}
                        height={250}
                        colors={["#60A5FA"]}
                        showGrid={true}
                        showLegend={false}
                        xaxisOptions={{
                            title: {
                                text: "시간",
                                style: { fontSize: "12px", color: "#6B7280" }
                            }
                        }}
                        yaxisOptions={{
                            title: { text: "CPU 사용률 (%)", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: { formatter: (val: number) => `${val}%` },
                            min: 0,
                            max: 100
                        }}
                        customOptions={{
                            annotations: {
                                yaxis: [
                                    { y: 70, borderColor: "#FBBF24", strokeDashArray: 4, label: { text: "주의 (70%)", style: { color: "#FFD66B", fontSize: "10px" } } },
                                    { y: 90, borderColor: "#FEA29B", strokeDashArray: 4, label: { text: "위험 (90%)", style: { color: "#FEA29B", fontSize: "10px" } } }
                                ]
                            }
                        }}
                        tooltipFormatter={(value: number) => `${value.toFixed(1)}%`}
                    />
                </WidgetCard>

                <WidgetCard title="PostgreSQL TPS 추이 (최근 1시간)" span={4}>
                    <Chart
                        type="line"
                        series={[
                            { name: "Commit TPS", data: charts.postgresqlTpsTrend1h.commitTps },
                            { name: "Rollback TPS", data: charts.postgresqlTpsTrend1h.rollbackTps }
                        ]}
                        categories={charts.postgresqlTpsTrend1h.categories}
                        height={250}
                        colors={["#60A5FA", "#FEA29B"]}
                        showGrid={true}
                        showLegend={true}
                        xaxisOptions={{ title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } } }}
                        yaxisOptions={{
                            title: { text: "TPS (건/초)", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: { formatter: (val: number) => val.toLocaleString() }
                        }}
                        tooltipFormatter={(value: number) => value.toLocaleString()}
                    />
                </WidgetCard>
                <WidgetCard title="OS CPU vs PostgreSQL 활성 연결 (24시간)" span={4}>
                    <Chart
                        type="line"
                        series={[
                            { name: "OS CPU 사용률", data: charts.osCpuVsActiveConnections24h.osCpuUsage },
                            { name: "활성 연결 수", data: charts.osCpuVsActiveConnections24h.activeConnections }
                        ]}
                        categories={charts.osCpuVsActiveConnections24h.categories}
                        height={250}
                        colors={["#60A5FA", "#FEA29B"]}
                        showGrid={true}
                        showLegend={true}
                        xaxisOptions={{ title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } } }}
                        yaxisOptions={[
                            {
                                title: { text: "OS CPU 사용률 (%)", style: { fontSize: "12px", color: "#6B7280" } },
                                labels: { formatter: (val: number) => `${val}%` },
                                min: 0,
                                max: 100
                            },
                            {
                                opposite: true,
                                title: { text: "활성 연결 수", style: { fontSize: "12px", color: "#6B7280" } },
                                labels: { formatter: (val: number) => val.toLocaleString() }
                            }
                        ]}
                        tooltipFormatter={(value: number, opts: any) => {
                            return opts.seriesIndex === 0 ? `${value.toFixed(1)}%` : value.toLocaleString();
                        }}
                    />
                </WidgetCard>
            </ChartGridLayout>

            {/* 차트 3-5: 24시간 추이 (첫 번째 행) */}
            <ChartGridLayout>
                <WidgetCard title="Load Average 추이 (24시간)" span={4}>
                    <Chart
                        type="line"
                        series={[
                            { name: "1분 Load", data: charts.loadAverageTrend24h.load1m },
                            { name: "5분 Load", data: charts.loadAverageTrend24h.load5m },
                            { name: "15분 Load", data: charts.loadAverageTrend24h.load15m }
                        ]}
                        categories={charts.loadAverageTrend24h.categories}
                        height={250}
                        colors={["#60A5FA", "#FBBF24", "#FEA29B"]}
                        showGrid={true}
                        showLegend={true}
                        xaxisOptions={{ title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } } }}
                        yaxisOptions={{
                            title: { text: "Load Average", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: { formatter: (val: number) => val.toFixed(2) }
                        }}
                        customOptions={{
                            annotations: {
                                yaxis: [{
                                    y: charts.loadAverageTrend24h.cpuCoreCount,
                                    borderColor: "#EF4444",
                                    strokeDashArray: 4,
                                    label: { text: `CPU 코어 수 (${charts.loadAverageTrend24h.cpuCoreCount})`, style: { color: "#EF4444", fontSize: "10px" } }
                                }]
                            }
                        }}
                        tooltipFormatter={(value: number) => value.toFixed(2)}
                    />
                </WidgetCard>

                <WidgetCard title="연결 상태 분포 (24시간)" span={4}>
                    <Chart
                        type="line"
                        series={[
                            { name: "Active", data: charts.connectionStatus24h.active },
                            { name: "Idle", data: charts.connectionStatus24h.idle },
                            { name: "Idle in Tx", data: charts.connectionStatus24h.idleInTx }
                        ]}
                        categories={charts.connectionStatus24h.categories}
                        height={250}
                        colors={["#60A5FA", "#FBBF24", "#FEA29B"]}
                        showGrid={true}
                        showLegend={true}
                        isStacked={true}
                        xaxisOptions={{ title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } } }}
                        yaxisOptions={{
                            title: { text: "연결 수", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: { formatter: (val: number) => val.toLocaleString() }
                        }}
                        customOptions={{ chart: { stacked: true }, fill: { opacity: 0.7 } }}
                        tooltipFormatter={(value: number) => value.toLocaleString()}
                    />
                </WidgetCard>
                <WidgetCard title="TPS 일일 추이 (24시간)" span={4}>
                    <Chart
                        type="line"
                        series={[
                            { name: "Commit TPS", data: charts.tpsDailyTrend24h.commitTps },
                            { name: "Rollback TPS", data: charts.tpsDailyTrend24h.rollbackTps }
                        ]}
                        categories={charts.tpsDailyTrend24h.categories}
                        height={250}
                        colors={["#60A5FA", "#FEA29B"]}
                        showGrid={true}
                        showLegend={true}
                        isStacked={true}
                        xaxisOptions={{ title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } } }}
                        yaxisOptions={{
                            title: { text: "TPS (건/초)", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: { formatter: (val: number) => val.toLocaleString() }
                        }}
                        customOptions={{ chart: { stacked: true }, plotOptions: { bar: { horizontal: false, columnWidth: "70%" } } }}
                        tooltipFormatter={(value: number) => value.toLocaleString()}
                    />
                </WidgetCard>
            </ChartGridLayout>

            {/* 차트 6-8: 24시간 추이 (두 번째 행) */}
            <ChartGridLayout>
                <WidgetCard title="Wait Event 유형별 분포 (24시간)" span={4}>
                    <Chart
                        type="line"
                        series={[
                            { name: "Lock", data: charts.waitEventDistribution24h.lock },
                            { name: "I/O", data: charts.waitEventDistribution24h.io },
                            { name: "Client", data: charts.waitEventDistribution24h.client },
                            { name: "Activity", data: charts.waitEventDistribution24h.activity },
                            { name: "LWLock", data: charts.waitEventDistribution24h.lwlock },
                            { name: "기타", data: charts.waitEventDistribution24h.other }
                        ]}
                        categories={charts.waitEventDistribution24h.categories}
                        height={250}
                        colors={["#FEA29B", "#77B2FB", "#51DAA8", "#FFD66B", "#8E79FF", "#6B7280"]}
                        showGrid={true}
                        showLegend={true}
                        isStacked={true}
                        xaxisOptions={{ title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } } }}
                        yaxisOptions={{
                            title: { text: "대기 세션 수", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: { formatter: (val: number) => val.toLocaleString() }
                        }}
                        customOptions={{ chart: { stacked: true }, fill: { opacity: 0.7 } }}
                        tooltipFormatter={(value: number) => value.toLocaleString()}
                    />
                </WidgetCard>

                <WidgetCard title="Backend 유형별 추이 (24시간)" span={4}>
                    <Chart
                        type="line"
                        series={[
                            { name: "Client", data: charts.backendTypeTrend24h.client },
                            { name: "Autovacuum", data: charts.backendTypeTrend24h.autovacuum },
                            { name: "Parallel", data: charts.backendTypeTrend24h.parallel },
                            { name: "Background", data: charts.backendTypeTrend24h.background }
                        ]}
                        categories={charts.backendTypeTrend24h.categories}
                        height={250}
                        colors={["#60A5FA", "#FBBF24", "#FEA29B", "#6B7280"]}
                        showGrid={true}
                        showLegend={true}
                        isStacked={true}
                        xaxisOptions={{ title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } } }}
                        yaxisOptions={{
                            title: { text: "프로세스 수", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: { formatter: (val: number) => val.toLocaleString() }
                        }}
                        customOptions={{ chart: { stacked: true }, plotOptions: { bar: { horizontal: false, columnWidth: "70%" } } }}
                        tooltipFormatter={(value: number) => value.toLocaleString()}
                    />
                </WidgetCard>
                {/* 차트 9: 에러율 추이 */}
                <WidgetCard title="에러율 추이 (24시간)" span={4}>
                    <Chart
                        type="line"
                        series={[{ name: "에러율", data: charts.errorRateTrend24h.data }]}
                        categories={charts.errorRateTrend24h.categories}
                        height={250}
                        colors={["#FEA29B"]}
                        showGrid={true}
                        showLegend={false}
                        xaxisOptions={{ title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } } }}
                        yaxisOptions={{
                            title: { text: "에러율 (%)", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: { formatter: (val: number) => `${val}%` },
                            min: 0
                        }}
                        customOptions={{
                            annotations: {
                                yaxis: [
                                    { y: 1, borderColor: "#FFD66B", strokeDashArray: 4, label: { text: "주의 (1%)", style: { color: "#FFD66B", fontSize: "10px" } } },
                                    { y: 5, borderColor: "#FEA29B", strokeDashArray: 4, label: { text: "위험 (5%)", style: { color: "#FEA29B", fontSize: "10px" } } }
                                ]
                            }
                        }}
                        tooltipFormatter={(value: number) => `${value.toFixed(2)}%`}
                    />
                </WidgetCard>
            </ChartGridLayout>
        </div>
    );
}