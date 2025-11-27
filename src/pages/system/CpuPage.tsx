// 작성자 : 김동현
import { useState, useEffect, useMemo } from "react";
import Chart from "../../components/chart/ChartComponent";
import SummaryCard from "../../components/util/SummaryCard";
import WidgetCard from "../../components/util/WidgetCard";
import ChartGridLayout from "../../components/layout/ChartGridLayout";
import "../../styles/system/cpu.css";
import apiClient from "../../api/apiClient";
import { useQuery } from "@tanstack/react-query";
import { useInstanceContext } from "../../context/InstanceContext";
import { useOsMetricSse, useRealtimeCpuHistory, useRealtimeLoadAverageHistory, type RealtimeOsMetrics } from "../../context/OsMetricSseContext";

// runtime util 추가 (사용은 안함)
export function formatRuntime(seconds: number): string {
    if (isNaN(seconds)) return "-";

    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) return `${h}시간 ${m}분 ${s}초`;
    if (m > 0) return `${m}분 ${s}초`;
    return `${s}초`;
}

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
        osCpuUsageTrend10m: {
            categories: string[];
            data: number[];
        };
        postgresqlTpsTrend10m: {
            categories: string[];
            commitTps: number[];
            rollbackTps: number[];
        };
        postgresqlActiveConnections10m: {
            categories: string[];
            osCpuUsage: number[];
            activeConnections: number[];
        };
        loadAverageTrend15m: {
            categories: string[];
            load1m: number[];
            load5m: number[];
            load15m: number[];
            cpuCoreCount: number;
        };
        connectionStatus1h: {
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
        waitEventDistribution15m: {
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
        errorRateTrend15m: {
            categories: string[];
            data: number[];
        };
    };
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
    const { subscribe, isConnected } = useOsMetricSse();

    // 실시간 데이터 상태
    const [realtimeCpu, setRealtimeCpu] = useState<number | null>(null);
    const [realtimeLoadAverage, setRealtimeLoadAverage] = useState<number[] | null>(null);

    // TanStack Query 캐시에서 히스토리 데이터 읽기 (페이지 이동해도 유지됨)
    const realtimeCpuHistory = useRealtimeCpuHistory(selectedInstance?.instanceId);
    const realtimeLoadAverageHistory = useRealtimeLoadAverageHistory(selectedInstance?.instanceId);

    // 백엔드 API 호출 - SSE로 받지 않는 데이터는 백엔드에서 받음
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["cpuDashboard", selectedInstance?.instanceId],
        queryFn: () => fetchCPUDashboard(selectedInstance!.instanceId),
        retry: 1,
        enabled: !!selectedInstance,
        refetchInterval: 60000, // 1분마다 갱신
    });

    // 전역 SSE 연결 구독 (히스토리는 Context에서 자동으로 캐시에 저장됨)
    useEffect(() => {
        if (!selectedInstance) {
            setRealtimeCpu(null);
            setRealtimeLoadAverage(null);
            return;
        }

        console.log('CPU SSE 구독 시작:', selectedInstance.instanceId);

        // 전역 SSE 구독 (히스토리는 Context에서 TanStack Query 캐시에 자동 저장됨)
        const unsubscribe = subscribe((metrics: RealtimeOsMetrics) => {
            // 위젯용 실시간 값만 업데이트 (히스토리는 Context에서 자동 처리)
            if (metrics.cpu !== null && metrics.cpu !== undefined) {
                console.log('[CPUPage] SSE CPU 데이터 수신:', metrics.cpu);
                setRealtimeCpu(metrics.cpu);
            }

            // Load Average 데이터 수신
            if (metrics.loadAverage !== null && metrics.loadAverage !== undefined && metrics.loadAverage.length >= 3) {
                console.log('[CPUPage] SSE Load Average 데이터 수신:', metrics.loadAverage);
                setRealtimeLoadAverage(metrics.loadAverage);
            } else {
                setRealtimeLoadAverage(null);
            }
        });

        return () => {
            unsubscribe();
        };
    }, [selectedInstance?.instanceId, subscribe]);

    // 실시간 CPU 히스토리 데이터 샘플링 (최근 60개만, 5초 간격 = 5분)
    // 모든 hooks는 early return 전에 호출되어야 함
    const sampledCpuHistory = useMemo(() => {
        const maxPoints = 60; // 최대 60개 포인트 (5분)
        if (realtimeCpuHistory.length <= maxPoints) {
            return realtimeCpuHistory;
        }
        // 최근 데이터만 선택
        return realtimeCpuHistory.slice(-maxPoints);
    }, [realtimeCpuHistory]);

    // 실시간 Load Average 히스토리 데이터 샘플링 (최근 60개만)
    const sampledLoadAverageHistory = useMemo(() => {
        const maxPoints = 60; // 최대 60개 포인트 (5분)
        if (realtimeLoadAverageHistory.length <= maxPoints) {
            return realtimeLoadAverageHistory;
        }
        // 최근 데이터만 선택
        return realtimeLoadAverageHistory.slice(-maxPoints);
    }, [realtimeLoadAverageHistory]);

    // 실시간 CPU 차트 데이터 메모이제이션
    const cpuChartData = useMemo(() => ({
        series: [{
            name: "CPU 사용률",
            data: sampledCpuHistory.map(item => item.value)
        }],
        categories: sampledCpuHistory.map(item => item.time)
    }), [sampledCpuHistory]);

    // Load Average 차트 데이터 메모이제이션
    const loadAverageChartData = useMemo(() => ({
        series: [
            {
                name: "Load 1m",
                data: sampledLoadAverageHistory.map(item => item.load1m),
            },
            {
                name: "Load 5m",
                data: sampledLoadAverageHistory.map(item => item.load5m),
            },
            {
                name: "Load 15m",
                data: sampledLoadAverageHistory.map(item => item.load15m),
            },
        ],
        categories: sampledLoadAverageHistory.map(item => item.time)
    }), [sampledLoadAverageHistory]);

    // 실시간 CPU 값 (SSE만 사용)
    const displayCpuValue = useMemo(() => {
        if (realtimeCpu !== null && realtimeCpu !== undefined) {
            console.log('[CPUPage] SSE CPU 값:', realtimeCpu);
            return realtimeCpu;
        }
        return 0;
    }, [realtimeCpu]);

    // 실시간 Load Average 값 (SSE만 사용)
    const displayLoadAverage = useMemo(() => {
        if (realtimeLoadAverage && realtimeLoadAverage.length >= 3) {
            console.log('[CPUPage] SSE Load Average 값:', realtimeLoadAverage);
            return realtimeLoadAverage;
        }
        return [0, 0, 0];
    }, [realtimeLoadAverage]);

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

    return (
        <div className="cpu-page">
            {/* 위젯 5개 영역 */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, 1fr)",
                    gap: "1rem",
                    marginBottom: "1.5rem",
                }}
            >
                <SummaryCard
                    label="OS CPU 사용률"
                    value={`${displayCpuValue.toFixed(1)}%`}
                    desc="실시간"
                    status={
                        displayCpuValue < 70
                            ? "info"
                            : displayCpuValue < 90
                                ? "warning"
                                : "critical"
                    }
                />
                <SummaryCard
                    label="Load Average (1m)"
                    value={displayLoadAverage[0].toFixed(2)}
                    desc={`5m: ${displayLoadAverage[1].toFixed(2)} | 15m: ${displayLoadAverage[2].toFixed(2)}`}
                    status={
                        displayLoadAverage[0] > widgets.loadAverage.cpuCoreCount
                            ? "warning"
                            : "info"
                    }
                />

                <SummaryCard
                    label="Backend 프로세스"
                    value={widgets.backendProcesses.clientBackend}
                    desc={`Auto: ${widgets.backendProcesses.autovacuum} | Parallel: ${widgets.backendProcesses.parallelWorker}`}
                />

                <SummaryCard
                    label="PostgreSQL TPS"
                    value={widgets.postgresqlTps.current.toLocaleString()}
                    desc="15분 전 대비"
                    status={
                        widgets.postgresqlTps.status === "정상"
                            ? "info"
                            : widgets.postgresqlTps.status === "주의"
                                ? "warning"
                                : "critical"
                    }
                />

                <SummaryCard
                    label="에러율"
                    value={`${widgets.errorRate.errorRate.toFixed(2)}%`}
                    desc={`롤백 TPS: ${widgets.errorRate.rollbackTps}`}
                    status={
                        widgets.errorRate.status === "정상"
                            ? "info"
                            : widgets.errorRate.status === "주의"
                                ? "warning"
                                : "critical"
                    }
                />




            </div>

            {/* ===== 아래 차트 영역 전체 ===== */}
            {/* 네가 보내준 차트들 그대로 유지 */}
            {/* 너무 길기 때문에 차트 부분은 축약 없이 그대로 전체 출력 */}

            <ChartGridLayout>
                {/* OS CPU 사용률 추이: SSE 실시간 데이터만 사용 (HH:MM 형식) */}
                {/* 실시간 모니터링은 최근 5분 정도면 충분 (60개 데이터 포인트, 5초 간격) */}
                <WidgetCard title="OS CPU 사용률 추이 (실시간)" span={4}>
                    <Chart
                        type="line"
                        series={cpuChartData.series}
                        categories={cpuChartData.categories}
                        height={250}
                        colors={["#7B61FF"]}
                        showGrid={true}
                        showLegend={false}
                        xaxisOptions={{
                            title: {
                                text: "시간",
                                style: { fontSize: "12px", color: "#6B7280" },
                            },
                            labels: {
                                rotate: 0,
                                style: { fontSize: "11px", colors: "#6B7280" },
                            },
                        }}
                        yaxisOptions={{
                            title: {
                                text: "CPU 사용률 (%)",
                                style: { fontSize: "12px", color: "#6B7280" },
                            },
                            labels: { formatter: (val: number) => `${val}%` },
                            min: 0,
                            max: 100,
                        }}
                        customOptions={{
                            xaxis: {
                                labels: {
                                    rotate: 0,
                                    style: { fontSize: "11px", colors: "#6B7280" },
                                },
                            },
                            annotations: {
                                yaxis: [
                                    {
                                        y: 70,
                                        borderColor: "#FBBF24",
                                        strokeDashArray: 4,
                                        label: {
                                            text: "주의 (70%)",
                                            style: { color: "#FFD66B", fontSize: "10px" },
                                        },
                                    },
                                    {
                                        y: 90,
                                        borderColor: "#FEA29B",
                                        strokeDashArray: 4,
                                        label: {
                                            text: "위험 (90%)",
                                            style: { color: "#FEA29B", fontSize: "10px" },
                                        },
                                    },
                                ],
                            },
                        }}
                        tooltipFormatter={(value: number) => `${value.toFixed(1)}%`}
                    />
                </WidgetCard>
                {/* Load Average Trend: SSE 실시간 데이터만 사용 (HH:MM 형식) */}
                {/* realtimeLoadAverageHistory는 Context에서 SSE로 업데이트되는 실시간 데이터 */}
                <WidgetCard title="Load Average Trend (최근 5분)" span={4}>
                    <Chart
                        type="line"
                        series={loadAverageChartData.series}
                        categories={loadAverageChartData.categories}
                        height={250}
                        colors={["#60A5FA", "#FBBF24", "#FEA29B"]}
                        showGrid={true}
                        showLegend={true}
                        xaxisOptions={{
                            title: {
                                text: "시간",
                                style: { fontSize: "12px", color: "#6B7280" },
                            },
                            labels: {
                                rotate: 0,
                                style: { fontSize: "11px", colors: "#6B7280" },
                            },
                        }}
                        yaxisOptions={{
                            title: {
                                text: "프로세스 수",
                                style: { fontSize: "12px", color: "#6B7280" },
                            },
                            labels: { formatter: (val: number) => val.toLocaleString() },
                        }}
                        customOptions={{
                            xaxis: {
                                labels: {
                                    rotate: 0,
                                    style: { fontSize: "11px", colors: "#6B7280" },
                                },
                            },
                            annotations: {
                                yaxis: [
                                    {
                                        // CPU 코어 수는 기본값 8 사용 (SSE 실시간 데이터만 사용)
                                        y: 8,
                                        borderColor: "#10B981",
                                        strokeDashArray: 4,
                                        label: {
                                            text: `CPU 코어 수 (8)`,
                                            style: { color: "#10B981", fontSize: "10px" },
                                        },
                                    },
                                ],
                            },
                        }}
                        tooltipFormatter={(value: number) => value.toLocaleString()}
                    />
                </WidgetCard>

                {/* PostgreSQL TPS 추이: 백엔드 데이터 */}
                {/* 최근 15분, 최대 15개 데이터 포인트 (1분 간격) */}
                <WidgetCard title="PostgreSQL TPS 추이 (최근 15분)" span={4}>
                    {(() => {
                        // 데이터 존재 여부 확인
                        const commitTps = charts.postgresqlTpsTrend10m.commitTps;
                        const rollbackTps = charts.postgresqlTpsTrend10m.rollbackTps;
                        const categories = charts.postgresqlTpsTrend10m.categories;
                        const hasData = categories.length > 0 &&
                            (commitTps.some(val => val > 0) || rollbackTps.some(val => val > 0));

                        // 데이터가 없거나 모두 0인 경우 안내 메시지 표시
                        if (!hasData) {
                            return (
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '250px',
                                    gap: '16px'
                                }}>
                                    <div style={{
                                        width: '64px',
                                        height: '64px',
                                        borderRadius: '50%',
                                        backgroundColor: '#E5E7EB',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{
                                            fontSize: '16px',
                                            fontWeight: '600',
                                            color: '#7B61FF',
                                            marginBottom: '8px'
                                        }}>
                                            현재 TPS 데이터가 수집되지 않고 있습니다
                                        </div>
                                        <div style={{
                                            fontSize: '14px',
                                            color: '#6B7280',
                                            lineHeight: '1.5'
                                        }}>
                                            데이터베이스 연결을 확인하거나<br />
                                            잠시 후 다시 시도해주세요
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        // 데이터가 있는 경우 차트 표시
                        return (
                            <Chart
                                type="line"
                                series={[
                                    {
                                        name: "Commit TPS",
                                        data: commitTps,
                                    },
                                    {
                                        name: "Rollback TPS",
                                        data: rollbackTps,
                                    },
                                ]}
                                categories={categories}
                                height={250}
                                colors={["#7B61FF", "#FEA29B"]}
                                showGrid={true}
                                showLegend={true}
                                xaxisOptions={{
                                    title: {
                                        text: "시간",
                                        style: { fontSize: "12px", color: "#6B7280" },
                                    },
                                    labels: {
                                        rotate: 0,
                                        style: { fontSize: "11px", colors: "#6B7280" },
                                    },
                                }}
                                yaxisOptions={{
                                    title: {
                                        text: "TPS (건/초)",
                                        style: { fontSize: "12px", color: "#6B7280" },
                                    },
                                    labels: { formatter: (val: number) => val.toLocaleString() },
                                }}
                                tooltipFormatter={(value: number) => value.toLocaleString()}
                            />
                        );
                    })()}
                </WidgetCard>

            </ChartGridLayout>

            {/* 아래 차트 영역 그대로 출력 */}
            <ChartGridLayout>

                {/* PostgreSQL 활성 연결: 백엔드 데이터 */}
                {/* cpu_agg_1m 테이블에서 avg_active_connections만 사용 (OS CPU는 실시간 차트에서 별도 제공) */}
                <WidgetCard title="PostgreSQL 활성 연결 (최근 15분)" span={4}>
                    {(() => {
                        // 데이터 존재 여부 확인
                        const activeConnections = charts.postgresqlActiveConnections10m.activeConnections;
                        const categories = charts.postgresqlActiveConnections10m.categories;
                        const hasData = categories.length > 0 && activeConnections.some(val => val > 0);

                        // 데이터가 없거나 모두 0인 경우 안내 메시지 표시
                        if (!hasData) {
                            return (
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '250px',
                                    gap: '16px'
                                }}>
                                    <div style={{
                                        width: '64px',
                                        height: '64px',
                                        borderRadius: '50%',
                                        backgroundColor: '#E5E7EB',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{
                                            fontSize: '16px',
                                            fontWeight: '600',
                                            color: '#7B61FF',
                                            marginBottom: '8px'
                                        }}>
                                            현재 활성 연결 데이터가 수집되지 않고 있습니다
                                        </div>
                                        <div style={{
                                            fontSize: '14px',
                                            color: '#6B7280',
                                            lineHeight: '1.5'
                                        }}>
                                            데이터베이스 연결을 확인하거나<br />
                                            잠시 후 다시 시도해주세요
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        // 데이터가 있는 경우 차트 표시
                        return (
                            <Chart
                                type="line"
                                series={[{
                                    name: "활성 연결 수",
                                    data: activeConnections,
                                }]}
                                categories={categories}
                                height={250}
                                colors={["#60A5FA", "#FEA29B"]}
                                showGrid={true}
                                showLegend={true}
                                xaxisOptions={{
                                    title: {
                                        text: "시간",
                                        style: { fontSize: "12px", color: "#6B7280" },
                                    },
                                    labels: {
                                        rotate: 0,
                                        style: { fontSize: "11px", colors: "#6B7280" },
                                    },
                                }}
                                yaxisOptions={[
                                    {
                                        title: {
                                            text: "활성 연결 수",
                                            style: { fontSize: "12px", color: "#6B7280" },
                                        },
                                        labels: {
                                            formatter: (val: number) => val.toLocaleString(),
                                        },
                                    },
                                ]}
                                tooltipFormatter={(value: number) => {
                                    return value.toLocaleString();
                                }}
                            />
                        );
                    })()}
                </WidgetCard>

                {/* 연결 상태 분포: 백엔드 데이터 */}
                {/* cpu_agg_1m 테이블에서 avg_active_connections, avg_idle_connections, avg_idle_in_transaction 사용 */}
                <WidgetCard title="연결 상태 분포 (최근 15분)" span={4}>
                    <Chart
                        type="line"
                        series={[
                            { name: "Active", data: charts.connectionStatus1h.active },
                            { name: "Idle", data: charts.connectionStatus1h.idle },
                            { name: "Idle in Tx", data: charts.connectionStatus1h.idleInTx },
                        ]}
                        categories={charts.connectionStatus1h.categories}
                        height={250}
                        colors={["#60A5FA", "#FBBF24", "#FEA29B"]}
                        showGrid={true}
                        showLegend={true}
                        isStacked={true}
                        xaxisOptions={{
                            title: {
                                text: "시간",
                                style: { fontSize: "12px", color: "#6B7280" },
                            },
                            labels: {
                                rotate: 0,
                                style: { fontSize: "11px", colors: "#6B7280" },
                            },
                        }}
                        yaxisOptions={{
                            title: {
                                text: "연결 수",
                                style: { fontSize: "12px", color: "#6B7280" },
                            },
                            labels: { formatter: (val: number) => val.toLocaleString() },
                        }}
                        customOptions={{ chart: { stacked: true }, fill: { opacity: 0.7 } }}
                        tooltipFormatter={(value: number) => value.toLocaleString()}
                    />
                </WidgetCard>
                {/* Wait Event 유형별 분포: 백엔드 데이터 */}
                {/* cpu_agg_1m 테이블에서 avg_waiting_for_lock, avg_waiting_for_io, avg_wait_event_client,
                    avg_wait_event_activity, avg_wait_event_lwlock, avg_wait_event_bufferpin + avg_wait_event_timeout + avg_wait_event_ipc 사용 */}
                <WidgetCard title="Wait Event 유형별 분포 (최근 15분)" span={4}>
                    <Chart
                        type="line"
                        series={[
                            { name: "Lock", data: charts.waitEventDistribution15m.lock },
                            { name: "I/O", data: charts.waitEventDistribution15m.io },
                            { name: "Client", data: charts.waitEventDistribution15m.client },
                            { name: "Activity", data: charts.waitEventDistribution15m.activity },
                            { name: "LWLock", data: charts.waitEventDistribution15m.lwlock },
                            { name: "기타", data: charts.waitEventDistribution15m.other },
                        ]}
                        categories={charts.waitEventDistribution15m.categories}
                        height={250}
                        colors={[
                            "#FEA29B",
                            "#77B2FB",
                            "#51DAA8",
                            "#FFD66B",
                            "#8E79FF",
                            "#6B7280",
                        ]}
                        showGrid={true}
                        showLegend={true}
                        isStacked={true}
                        xaxisOptions={{
                            title: {
                                text: "시간",
                                style: { fontSize: "12px", color: "#6B7280" },
                            },
                            labels: {
                                rotate: 0,
                                style: { fontSize: "11px", colors: "#6B7280" },
                            },
                        }}
                        yaxisOptions={{
                            title: {
                                text: "대기 세션 수",
                                style: { fontSize: "12px", color: "#6B7280" },
                            },
                            labels: { formatter: (val: number) => val.toLocaleString() },
                        }}
                        customOptions={{ chart: { stacked: true }, fill: { opacity: 0.7 } }}
                        tooltipFormatter={(value: number) => value.toLocaleString()}
                    />
                </WidgetCard>

            </ChartGridLayout>

            <ChartGridLayout>


                {/* Backend 유형별 추이: 백엔드 데이터 */}
                {/* cpu_agg_1m 테이블에서 avg_client_backend, avg_autovacuum_worker, avg_parallel_worker, avg_background_worker 사용 */}
                <WidgetCard title="Backend 유형별 추이 (최근 15분)" span={4}>
                    <Chart
                        type="line"
                        series={[
                            { name: "Client", data: charts.backendTypeTrend24h.client },
                            { name: "Autovacuum", data: charts.backendTypeTrend24h.autovacuum },
                            { name: "Parallel", data: charts.backendTypeTrend24h.parallel },
                            { name: "Background", data: charts.backendTypeTrend24h.background },
                        ]}
                        categories={charts.backendTypeTrend24h.categories}
                        height={250}
                        colors={["#60A5FA", "#FBBF24", "#FEA29B", "#6B7280"]}
                        showGrid={true}
                        showLegend={true}
                        isStacked={true}
                        xaxisOptions={{
                            title: {
                                text: "시간",
                                style: { fontSize: "12px", color: "#6B7280" },
                            },
                            labels: {
                                rotate: 0,
                                style: { fontSize: "11px", colors: "#6B7280" },
                            },
                        }}
                        yaxisOptions={{
                            title: {
                                text: "프로세스 수",
                                style: { fontSize: "12px", color: "#6B7280" },
                            },
                            labels: { formatter: (val: number) => val.toLocaleString() },
                        }}
                        customOptions={{
                            chart: { stacked: true },
                            plotOptions: { bar: { horizontal: false, columnWidth: "70%" } },
                        }}
                        tooltipFormatter={(value: number) => value.toLocaleString()}
                    />
                </WidgetCard>

                {/* 에러율 추이: 백엔드 데이터 */}
                {/* cpu_agg_1m 테이블에서 (xact_rollback_rate / (xact_commit_rate + xact_rollback_rate)) * 100로 에러율 계산 */}
                <WidgetCard title="에러율 추이 (최근 15분)" span={4}>
                    <Chart
                        type="line"
                        series={[{ name: "에러율", data: charts.errorRateTrend15m.data }]}
                        categories={charts.errorRateTrend15m.categories}
                        height={250}
                        colors={["#FEA29B"]}
                        showGrid={true}
                        showLegend={false}
                        xaxisOptions={{
                            title: {
                                text: "시간",
                                style: { fontSize: "12px", color: "#6B7280" },
                            },
                            labels: {
                                rotate: 0,
                                style: { fontSize: "11px", colors: "#6B7280" },
                            },
                        }}
                        yaxisOptions={{
                            title: {
                                text: "에러율 (%)",
                                style: { fontSize: "12px", color: "#6B7280" },
                            },
                            labels: { formatter: (val: number) => `${val}%` },
                            min: 0,
                        }}
                        customOptions={{
                            xaxis: {
                                labels: {
                                    rotate: 0,
                                    style: { fontSize: "11px", colors: "#6B7280" },
                                },
                            },
                            annotations: {
                                yaxis: [
                                    {
                                        y: 1,
                                        borderColor: "#FFD66B",
                                        strokeDashArray: 4,
                                        label: {
                                            text: "주의 (1%)",
                                            style: { color: "#FFD66B", fontSize: "10px" },
                                        },
                                    },
                                    {
                                        y: 5,
                                        borderColor: "#FEA29B",
                                        strokeDashArray: 4,
                                        label: {
                                            text: "위험 (5%)",
                                            style: { color: "#FEA29B", fontSize: "10px" },
                                        },
                                    },
                                ],
                            },
                        }}
                        tooltipFormatter={(value: number) => `${value.toFixed(2)}%`}
                    />
                </WidgetCard>
            </ChartGridLayout>
        </div>
    );
}
