import { useState, useEffect } from "react";
import Chart from "../../components/chart/ChartComponent";
import SummaryCard from "../../components/util/SummaryCard";
import WidgetCard from "../../components/util/WidgetCard";
import ChartGridLayout from "../../components/layout/ChartGridLayout";
import "../../styles/system/cpu.css";
import apiClient from "../../api/apiClient";
import { useQuery } from "@tanstack/react-query";
import { useInstanceContext } from "../../context/InstanceContext";
import { useOsMetricSse, type RealtimeOsMetrics, useRealtimeCpuHistory, useRealtimeLoadAverageHistory } from "../../context/OsMetricSseContext";

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

/**
 * 시간 문자열(HH:MM:SS)을 초 단위로 변환
 */
function timeToSeconds(timeStr: string): number {
    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds;
}

/**
 * 최근 1분 동안 5초 간격으로 12개 데이터 포인트를 샘플링
 * @param history 히스토리 데이터 배열 (time 속성을 가진 객체)
 * @returns 5초 간격으로 샘플링된 최대 12개 데이터 (오래된 순서부터)
 */
function sampleLast60Seconds<T extends { time: string }>(history: T[]): T[] {
    if (history.length === 0) return [];

    const sampled: T[] = [];
    let lastSelectedSeconds: number | null = null;

    // 마지막 데이터부터 역순으로 순회
    for (let i = history.length - 1; i >= 0; i--) {
        const item = history[i];
        const itemSeconds = timeToSeconds(item.time);

        // 첫 번째 데이터는 무조건 선택 (가장 최근 데이터)
        if (lastSelectedSeconds === null) {
            sampled.push(item);
            lastSelectedSeconds = itemSeconds;
            continue;
        }

        // 이전에 선택한 데이터와의 시간 차이 계산
        let timeDiff = lastSelectedSeconds - itemSeconds;

        // 하루 경계 처리 (23:59:59 -> 00:00:00)
        if (timeDiff < 0) {
            timeDiff = lastSelectedSeconds - itemSeconds + 86400;
        }

        // 5초 이상 차이나는 데이터만 선택
        if (timeDiff >= 5) {
            sampled.push(item);
            lastSelectedSeconds = itemSeconds;

            // 12개를 모으면 중단 (1분 = 12개 포인트)
            if (sampled.length >= 12) {
                break;
            }
        }
    }

    // 역순으로 정렬 (오래된 순서부터)
    return sampled.reverse();
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
        idleCpu: number;
        contextSwitches: number;
        postgresqlBackendCpu: number;
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
    const { subscribe } = useOsMetricSse();

    // 실시간 데이터 상태 (위젯용)
    const [realtimeCpu, setRealtimeCpu] = useState<number | null>(null);
    const [realtimeLoadAverage, setRealtimeLoadAverage] = useState<number[] | null>(null);

    // TanStack Query 캐시에서 히스토리 데이터 읽기 (페이지 이동해도 유지됨)
    const realtimeCpuHistory = useRealtimeCpuHistory(selectedInstance?.instanceId);
    const realtimeLoadAverageHistory = useRealtimeLoadAverageHistory(selectedInstance?.instanceId);

    // 대시보드 데이터 조회
    const { data } = useQuery({
        queryKey: ["cpuDashboard", selectedInstance?.instanceId],
        queryFn: () => fetchCPUDashboard(selectedInstance!.instanceId),
        retry: 1,
        enabled: !!selectedInstance,
        refetchInterval: 60000, // 1분마다 갱신
    });

    // 전역 SSE 연결 구독 - OS 메트릭 실시간 수신 (히스토리는 Context에서 자동으로 캐시에 저장됨)
    useEffect(() => {
        if (!selectedInstance) {
            setRealtimeCpu(null);
            setRealtimeLoadAverage(null);
            return;
        }

        // 전역 SSE 구독 (히스토리는 Context에서 TanStack Query 캐시에 자동 저장됨)
        const unsubscribe = subscribe((metrics: RealtimeOsMetrics) => {
            // 위젯용 실시간 값만 업데이트 (히스토리는 Context에서 자동 처리)
            setRealtimeCpu(metrics.cpu);
            setRealtimeLoadAverage(metrics.loadAverage);
        });

        // 구독 해제
        return () => {
            unsubscribe();
        };
    }, [selectedInstance?.instanceId, subscribe]);

    // 디버깅: Backend 프로세스 위젯 데이터 확인 (조건부 return 이전에 위치)
    useEffect(() => {
        if (data?.widgets?.backendProcesses) {
            console.log("Backend 프로세스 위젯 데이터:", {
                clientBackend: data.widgets.backendProcesses.clientBackend,
                autovacuum: data.widgets.backendProcesses.autovacuum,
                parallelWorker: data.widgets.backendProcesses.parallelWorker,
            });
        }

        // Backend 유형별 추이 차트 데이터 확인
        if (data?.charts?.backendTypeTrend24h) {
            const chartData = data.charts.backendTypeTrend24h;
            console.log("Backend 유형별 추이 (24h) 차트 데이터:", {
                categories: chartData.categories.length,
                client: {
                    length: chartData.client.length,
                    first5: chartData.client.slice(0, 5),
                    hasNonZero: chartData.client.some(v => v > 0),
                },
                autovacuum: {
                    length: chartData.autovacuum.length,
                    first5: chartData.autovacuum.slice(0, 5),
                    hasNonZero: chartData.autovacuum.some(v => v > 0),
                },
                parallel: {
                    length: chartData.parallel.length,
                    first5: chartData.parallel.slice(0, 5),
                    hasNonZero: chartData.parallel.some(v => v > 0),
                },
                background: {
                    length: chartData.background.length,
                    first5: chartData.background.slice(0, 5),
                    hasNonZero: chartData.background.some(v => v > 0),
                },
            });
        }
    }, [data]);

    if (!selectedInstance) {
        return (
            <div className="cpu-page">
                <div style={{ padding: "2rem", textAlign: "center" }}>
                    인스턴스를 선택해주세요.
                </div>
            </div>
        );
    }

    // 백엔드 데이터가 없을 때 기본값 설정 (실시간 차트는 항상 표시하기 위해)
    const { widgets, charts } = data || {
        widgets: {
            osCpuUsage: { current: 0, trend: 0, status: "정상" as const },
            postgresqlTps: { current: 0, trend: 0, status: "정상" as const },
            errorRate: { rollbackTps: 0, errorRate: 0, status: "정상" as const },
            backendProcesses: { clientBackend: 0, autovacuum: 0, parallelWorker: 0 },
            loadAverage: { load1m: 0, load5m: 0, load15m: 0, cpuCoreCount: 1 },
        },
        charts: {
            osCpuUsageTrend10m: { categories: [], data: [] },
            postgresqlTpsTrend10m: { categories: [], commitTps: [], rollbackTps: [] },
            loadAverageTrend15m: { categories: [], load1m: [], load5m: [], load15m: [], cpuCoreCount: 1 },
            connectionStatus1h: { categories: [], active: [], idle: [], idleInTx: [] },
            waitEventDistribution15m: { categories: [], lock: [], io: [], client: [], activity: [], lwlock: [], other: [] },
            backendTypeTrend24h: { categories: [], client: [], autovacuum: [], parallel: [], background: [] },
            errorRateTrend15m: { categories: [], data: [] },
        },
    };

    // 실시간 CPU 값 (SSE 우선, 없으면 위젯 값 사용)
    const displayCpuValue = realtimeCpu !== null ? realtimeCpu : (widgets?.osCpuUsage?.current ?? 0);

    // 실시간 Load Average 값 (SSE 우선, 없으면 위젯 값 사용)
    const displayLoadAverage =
        realtimeLoadAverage || [
            widgets?.loadAverage?.load1m ?? 0,
            widgets?.loadAverage?.load5m ?? 0,
            widgets?.loadAverage?.load15m ?? 0,
        ];

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
                        widgets?.osCpuUsage?.status === "정상"
                            ? "info"
                            : widgets?.osCpuUsage?.status === "주의"
                                ? "warning"
                                : "critical"
                    }
                />

                <SummaryCard
                    label="PostgreSQL TPS"
                    value={(widgets?.postgresqlTps?.current ?? 0).toLocaleString()}
                    desc=" "
                    status={
                        widgets?.postgresqlTps?.status === "정상"
                            ? "info"
                            : widgets?.postgresqlTps?.status === "주의"
                                ? "warning"
                                : "critical"
                    }
                />

                <SummaryCard
                    label="에러율"
                    value={`${(widgets?.errorRate?.errorRate ?? 0).toFixed(2)}%`}
                    desc={`롤백 TPS: ${widgets?.errorRate?.rollbackTps ?? 0}`}
                    status={
                        widgets?.errorRate?.status === "정상"
                            ? "info"
                            : widgets?.errorRate?.status === "주의"
                                ? "warning"
                                : "critical"
                    }
                />

                <SummaryCard
                    label="Backend 프로세스"
                    value={widgets?.backendProcesses?.clientBackend ?? 0}
                    desc={`Auto: ${widgets?.backendProcesses?.autovacuum ?? 0} | Parallel: ${widgets?.backendProcesses?.parallelWorker ?? 0}`}
                />

                <SummaryCard
                    label="Load Average (1m)"
                    value={displayLoadAverage[0].toFixed(2)}
                    desc={`5m: ${displayLoadAverage[1].toFixed(2)} | 15m: ${displayLoadAverage[2].toFixed(2)}`}
                    status={
                        displayLoadAverage[0] > (widgets?.loadAverage?.cpuCoreCount ?? 1)
                            ? "warning"
                            : "info"
                    }
                />
            </div>

            {/* ===== 아래 차트 영역 전체 ===== */}
            {/* 네가 보내준 차트들 그대로 유지 */}
            {/* 너무 길기 때문에 차트 부분은 축약 없이 그대로 전체 출력 */}

            <ChartGridLayout>
                {/* OS CPU 사용률 추이: SSE 실시간 데이터만 사용 (HH:MM:SS) */}
                <WidgetCard title="OS CPU 사용률 추이 (실시간)" span={4}>
                    <Chart
                        type="line"
                        series={[{
                            name: "CPU 사용률",
                            data: (() => {
                                const sampled = sampleLast60Seconds(realtimeCpuHistory);
                                return sampled.map((item: { time: string; value: number }) => item.value);
                            })()
                        }]}
                        categories={(() => {
                            const sampled = sampleLast60Seconds(realtimeCpuHistory);
                            return sampled.map((item: { time: string; value: number }) => {
                                // HH:MM 형식으로 시간 표시 (최근 1분, 5초 간격 12개 데이터 포인트)
                                return item.time.substring(0, 5);
                            });
                        })()}
                        height={250}
                        colors={["#60A5FA"]}
                        showGrid={true}
                        showLegend={false}
                        xaxisOptions={{
                            title: {
                                text: "시간",
                                style: { fontSize: "12px", color: "#6B7280" },
                            },
                            labels: {
                                rotate: 0, // 라벨을 수평으로 표시
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
                                tickAmount: 7, // X축에 7개의 시간만 표시
                                labels: {
                                    showDuplicates: false, // 중복 라벨 제거
                                    rotate: 0, // 라벨을 수평으로 표시
                                    style: {
                                        fontSize: "11px",
                                        colors: "#6B7280"
                                    }
                                }
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
                            tooltip: {
                                x: {
                                    formatter: (val: any, opts: any) => {
                                        // 히스토리 데이터에서 time 속성 사용 (전체 HH:MM:SS 표시, 최근 1분)
                                        if (realtimeCpuHistory.length > 0 && opts.seriesIndex === 0) {
                                            const sampled = sampleLast60Seconds(realtimeCpuHistory);
                                            const dataPoint = sampled[opts.dataPointIndex];
                                            return dataPoint ? dataPoint.time : val;
                                        }
                                        return val;
                                    },
                                },
                            },
                        }}
                        tooltipFormatter={(value: number) => `${value.toFixed(1)}%`}
                    />
                </WidgetCard>

                {/* Load Average Trend: SSE 실시간 데이터만 사용 (HH:MM 형식) */}
                <WidgetCard title="Load Average Trend (실시간)" span={4}>
                    <Chart
                        type="line"
                        series={[
                            {
                                name: "Load 1m",
                                data: (() => {
                                    const sampled = sampleLast60Seconds(realtimeLoadAverageHistory);
                                    return sampled.map((item: { time: string; load1m: number; load5m: number; load15m: number }) => item.load1m);
                                })()
                            },
                            {
                                name: "Load 5m",
                                data: (() => {
                                    const sampled = sampleLast60Seconds(realtimeLoadAverageHistory);
                                    return sampled.map((item: { time: string; load1m: number; load5m: number; load15m: number }) => item.load5m);
                                })()
                            },
                            {
                                name: "Load 15m",
                                data: (() => {
                                    const sampled = sampleLast60Seconds(realtimeLoadAverageHistory);
                                    return sampled.map((item: { time: string; load1m: number; load5m: number; load15m: number }) => item.load15m);
                                })()
                            },
                        ]}
                        categories={(() => {
                            const sampled = sampleLast60Seconds(realtimeLoadAverageHistory);
                            return sampled.map((item: { time: string; load1m: number; load5m: number; load15m: number }) => {
                                // HH:MM 형식으로 시간 표시 (최근 1분, 5초 간격 12개 데이터 포인트)
                                return item.time.substring(0, 5);
                            });
                        })()}
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
                                rotate: 0, // 라벨을 수평으로 표시
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
                                tickAmount: 6, // X축에 6개의 시간만 표시
                                labels: {
                                    showDuplicates: false, // 중복 라벨 제거
                                    rotate: 0, // 라벨을 수평으로 표시
                                    style: {
                                        fontSize: "11px",
                                        colors: "#6B7280"
                                    }
                                }
                            },
                            annotations: {
                                yaxis: [
                                    {
                                        y: charts?.loadAverageTrend15m?.cpuCoreCount ?? 1,
                                        borderColor: "#10B981",
                                        strokeDashArray: 4,
                                        label: {
                                            text: `CPU 코어 수 (${charts?.loadAverageTrend15m?.cpuCoreCount ?? 1})`,
                                            style: { color: "#10B981", fontSize: "10px" },
                                        },
                                    },
                                ],
                            },
                            tooltip: {
                                x: {
                                    formatter: (val: any, opts: any) => {
                                        // 히스토리 데이터에서 time 속성 사용 (전체 HH:MM:SS 표시, 최근 1분)
                                        if (realtimeLoadAverageHistory.length > 0 && opts.seriesIndex !== undefined) {
                                            const sampled = sampleLast60Seconds(realtimeLoadAverageHistory);
                                            const dataPoint = sampled[opts.dataPointIndex];
                                            return dataPoint ? dataPoint.time : val;
                                        }
                                        return val;
                                    },
                                },
                            },
                        }}
                        tooltipFormatter={(value: number) => value.toLocaleString()}
                    />
                </WidgetCard>

                {/* PostgreSQL TPS 추이: 백엔드 데이터 (HH:MM 형식) */}
                <WidgetCard title="PostgreSQL TPS 추이 (최근 10분)" span={4}>
                    <Chart
                        type="line"
                        series={[
                            {
                                name: "Commit TPS",
                                data: charts?.postgresqlTpsTrend10m?.commitTps ?? [],
                            },
                            {
                                name: "Rollback TPS",
                                data: charts?.postgresqlTpsTrend10m?.rollbackTps ?? [],
                            },
                        ]}
                        categories={charts?.postgresqlTpsTrend10m?.categories ?? []}
                        height={250}
                        colors={["#60A5FA", "#FEA29B"]}
                        showGrid={true}
                        showLegend={true}
                        xaxisOptions={{
                            title: {
                                text: "시간",
                                style: { fontSize: "12px", color: "#6B7280" },
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
                </WidgetCard>


            </ChartGridLayout>

            {/* 아래 차트 영역 그대로 출력 */}
            <ChartGridLayout>
                {/* 에러율 추이: 백엔드 데이터 (HH:MM 형식) */}
                <WidgetCard title="에러율 추이 (최근 15분)" span={4}>
                    <Chart
                        type="line"
                        series={[{ name: "에러율", data: charts?.errorRateTrend15m?.data ?? [] }]}
                        categories={charts?.errorRateTrend15m?.categories ?? []}
                        height={250}
                        colors={["#FEA29B"]}
                        showGrid={true}
                        showLegend={false}
                        xaxisOptions={{
                            title: {
                                text: "시간",
                                style: { fontSize: "12px", color: "#6B7280" },
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
                {/* Wait Event 유형별 분포: 백엔드 데이터 (MM-dd HH:MM 형식) */}
                <WidgetCard title="Wait Event 유형별 분포 (최근 15분)" span={4}>
                    <Chart
                        type="line"
                        series={[
                            { name: "Lock", data: charts?.waitEventDistribution15m?.lock ?? [] },
                            { name: "I/O", data: charts?.waitEventDistribution15m?.io ?? [] },
                            { name: "Client", data: charts?.waitEventDistribution15m?.client ?? [] },
                            { name: "Activity", data: charts?.waitEventDistribution15m?.activity ?? [] },
                            { name: "LWLock", data: charts?.waitEventDistribution15m?.lwlock ?? [] },
                            { name: "기타", data: charts?.waitEventDistribution15m?.other ?? [] },
                        ]}
                        categories={charts?.waitEventDistribution15m?.categories ?? []}
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
                {/* 연결 상태 분포: 백엔드 데이터 (HH:MM 형식) */}
                <WidgetCard title="연결 상태 분포 (1시간)" span={4}>
                    <Chart
                        type="line"
                        series={[
                            { name: "Active", data: charts?.connectionStatus1h?.active ?? [] },
                            { name: "Idle", data: charts?.connectionStatus1h?.idle ?? [] },
                            { name: "Idle in Tx", data: charts?.connectionStatus1h?.idleInTx ?? [] },
                        ]}
                        categories={charts?.connectionStatus1h?.categories ?? []}
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
            </ChartGridLayout>

            <ChartGridLayout>

                {/* Backend 유형별 추이: 백엔드 데이터 (HH:MM 형식으로 변환) */}
                <WidgetCard title="Backend 유형별 추이 (24시간)" span={8}>
                    <Chart
                        type="line"
                        series={[
                            { name: "Client", data: charts?.backendTypeTrend24h?.client ?? [] },
                            { name: "Autovacuum", data: charts?.backendTypeTrend24h?.autovacuum ?? [] },
                            { name: "Parallel", data: charts?.backendTypeTrend24h?.parallel ?? [] },
                            { name: "Background", data: charts?.backendTypeTrend24h?.background ?? [] },
                        ]}
                        categories={
                            (charts?.backendTypeTrend24h?.categories ?? []).map((category: string) => {
                                // "MM-dd HH:MM" 형식에서 "HH:MM"만 추출
                                // 예: "11-19 16:00" -> "16:00"
                                const parts = category.split(" ");
                                if (parts.length >= 2) {
                                    return parts[1]; // "HH:MM" 부분만 반환
                                }
                                // 이미 "HH:MM" 형식이거나 다른 형식인 경우 그대로 반환
                                return category;
                            })
                        }
                        height={250}
                        colors={["#60A5FA", "#FBBF24", "#FEA29B", "#6B7280"]}
                        showGrid={true}
                        showLegend={true}
                        isStacked={false}
                        xaxisOptions={{
                            title: {
                                text: "시간",
                                style: { fontSize: "12px", color: "#6B7280" },
                            },
                            labels: {
                                rotate: 0, // 라벨을 수평으로 표시
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
                            xaxis: {
                                labels: {
                                    rotate: 0, // 라벨을 수평으로 표시
                                    showDuplicates: false, // 중복 라벨 제거
                                    style: {
                                        fontSize: "11px",
                                        colors: "#6B7280"
                                    }
                                }
                            }
                        }}
                        tooltipFormatter={(value: number) => value.toLocaleString()}
                    />
                </WidgetCard>


            </ChartGridLayout>
        </div>
    );
}
