// 작성자 : 김동현
import Chart from "../../components/chart/ChartComponent";
import SummaryCard from "../../components/util/SummaryCard";
import WidgetCard from "../../components/util/WidgetCard";
import ChartGridLayout from "../../components/layout/ChartGridLayout";
import "../../styles/system/disk.css";
import apiClient from "../../api/apiClient";
import { useQuery } from "@tanstack/react-query";
import { useInstanceContext } from "../../context/InstanceContext";
import { useOsMetricSse, type RealtimeOsMetrics, useRealtimeDiskIoHistory, useRealtimeDiskUsageHistory } from "../../context/OsMetricSseContext";
import { useEffect, useState, useMemo } from "react";

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

// ========================================
// 백엔드 API 응답 타입 정의
// ========================================

interface DiskIODashboardResponse {
    osDiskUsage: {
        usagePercent: number;
        trend: string;
        status: string;
        totalGB: number;
        usedGB: number;
        availableGB: number;
    };
    diskIoThroughput: {
        readMBps: number;
        writeMBps: number;
        totalMBps: number;
        readTrend: string;
        writeTrend: string;
        readChangePct: number;
        writeChangePct: number;
    };
    bufferCacheHit: {
        hitRatio: number;
        status: string;
        cacheHits: number;
        physicalReads: number;
    };
    backendFsync: {
        fsyncRate: number;
        status: string;
        totalFsyncs: number;
        message: string;
    };
    diskLatency: {
        avgReadLatency: number;
        avgWriteLatency: number;
        status: string;
        maxLatency: number;
    };

    // 차트 데이터
    osDiskIoChart1h: { categories: string[]; readMBps: number[]; writeMBps: number[] };
    bufferCacheChart1h: { categories: string[]; hitRatio: number[]; warningThreshold: number; normalThreshold: number };
    ioLatencyChart6h: { categories: string[]; readLatency: number[]; writeLatency: number[] };

    diskUsageChart24h: { categories: string[]; usagePercent: number[]; warningThreshold: number; dangerThreshold: number };
    checkpointChart24h: { categories: string[]; checkpointBuffers: number[]; cleanBuffers: number[]; backendBuffers: number[] };
    backendFsyncChart24h: { categories: string[]; fsyncRate: number[]; warningThreshold: number };
    physicalCacheChart24h: { categories: string[]; physicalReads: number[]; cacheHits: number[] };
    throughputChart24h: { categories: string[]; readMBps: number[]; writeMBps: number[] };
}

// API 요청
async function fetchDiskIOData(instanceId: number) {
    const response = await apiClient.get<DiskIODashboardResponse>("/system/diskio", { params: { instanceId } });
    return response.data;
}

export default function DiskPage() {
    const { selectedInstance } = useInstanceContext();

    const [realtimeDiskUsage, setRealtimeDiskUsage] = useState<number | null>(null);
    const [realtimeDiskTotalGB, setRealtimeDiskTotalGB] = useState<number | null>(null);
    const [realtimeDiskUsedGB, setRealtimeDiskUsedGB] = useState<number | null>(null);
    const [realtimeDiskAvailableGB, setRealtimeDiskAvailableGB] = useState<number | null>(null);
    const [realtimeDiskRead, setRealtimeDiskRead] = useState<number | null>(null);
    const [realtimeDiskWrite, setRealtimeDiskWrite] = useState<number | null>(null);

    // TanStack Query 캐시에서 히스토리 데이터 읽기 (페이지 이동해도 유지됨)
    const realtimeDiskIoHistory = useRealtimeDiskIoHistory(selectedInstance?.instanceId);
    const realtimeDiskUsageHistory = useRealtimeDiskUsageHistory(selectedInstance?.instanceId);

    // 실시간 Disk I/O 히스토리 데이터 샘플링 (최근 60개만, 5초 간격 = 5분)
    const sampledDiskIoHistory = useMemo(() => {
        const maxPoints = 60; // 최대 60개 포인트 (5분)
        if (realtimeDiskIoHistory.length <= maxPoints) {
            return realtimeDiskIoHistory;
        }
        // 최근 데이터만 선택
        return realtimeDiskIoHistory.slice(-maxPoints);
    }, [realtimeDiskIoHistory]);

    // 실시간 Disk Usage 히스토리 데이터 샘플링
    const sampledDiskUsageHistory = useMemo(() => {
        const maxPoints = 60;
        if (realtimeDiskUsageHistory.length <= maxPoints) {
            return realtimeDiskUsageHistory;
        }
        return realtimeDiskUsageHistory.slice(-maxPoints);
    }, [realtimeDiskUsageHistory]);

    // 백엔드 API 호출 - SSE가 아닌 위젯/차트 데이터를 받기 위해 필요
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["diskioDashboard", selectedInstance?.instanceId],
        queryFn: () => fetchDiskIOData(selectedInstance!.instanceId),
        retry: 1,
        refetchInterval: 60000,
        enabled: !!selectedInstance,
    });

    // 전역 SSE 연결 구독
    const { subscribe, isConnected } = useOsMetricSse();

    // 전역 SSE 연결 구독 (히스토리는 Context에서 자동으로 캐시에 저장됨)
    useEffect(() => {
        if (!selectedInstance) {
            setRealtimeDiskUsage(null);
            setRealtimeDiskTotalGB(null);
            setRealtimeDiskUsedGB(null);
            setRealtimeDiskAvailableGB(null);
            setRealtimeDiskRead(null);
            setRealtimeDiskWrite(null);
            return;
        }

        // 전역 SSE 구독 (히스토리는 Context에서 TanStack Query 캐시에 자동 저장됨)
        const unsubscribe = subscribe((metrics: RealtimeOsMetrics) => {
            // 위젯용 실시간 값만 업데이트 (히스토리는 Context에서 자동 처리)
            if (metrics.diskUsage !== null && metrics.diskUsage !== undefined) {
                console.log('[DiskPage] SSE 디스크 사용률 업데이트:', metrics.diskUsage);
                setRealtimeDiskUsage(metrics.diskUsage);
            }
            if (metrics.diskTotalGB !== null && metrics.diskTotalGB !== undefined) {
                console.log('[DiskPage] SSE 디스크 총량:', metrics.diskTotalGB);
                setRealtimeDiskTotalGB(metrics.diskTotalGB);
            }
            if (metrics.diskUsedGB !== null && metrics.diskUsedGB !== undefined) {
                console.log('[DiskPage] SSE 디스크 사용량:', metrics.diskUsedGB);
                setRealtimeDiskUsedGB(metrics.diskUsedGB);
            }
            if (metrics.diskAvailableGB !== null && metrics.diskAvailableGB !== undefined) {
                console.log('[DiskPage] SSE 디스크 사용 가능량:', metrics.diskAvailableGB);
                setRealtimeDiskAvailableGB(metrics.diskAvailableGB);
            }
            if (metrics.diskRead !== null && metrics.diskRead !== undefined) {
                console.log('[DiskPage] SSE 디스크 읽기:', metrics.diskRead);
                setRealtimeDiskRead(metrics.diskRead);
            }
            if (metrics.diskWrite !== null && metrics.diskWrite !== undefined) {
                console.log('[DiskPage] SSE 디스크 쓰기:', metrics.diskWrite);
                setRealtimeDiskWrite(metrics.diskWrite);
            }
        });

        return () => {
            unsubscribe();
        };
    }, [selectedInstance?.instanceId, subscribe]);

    // 인스턴스 선택 안됨
    if (!selectedInstance) {
        return (
            <div className="disk-page">
                <div className="center-text">인스턴스를 선택해주세요.</div>
            </div>
        );
    }

    // 로딩 중
    if (isLoading) {
        return (
            <div className="disk-page">
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '400px',
                    fontSize: '18px',
                    color: '#6B7280'
                }}>
                    데이터를 불러오는 중...
                </div>
            </div>
        );
    }

    // 에러 발생
    if (isError) {
        return (
            <div className="disk-page">
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '400px',
                    fontSize: '18px',
                    color: '#EF4444'
                }}>
                    <p>데이터를 불러오는데 실패했습니다.</p>
                    <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '8px' }}>
                        {error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: '16px',
                            padding: '8px 16px',
                            backgroundColor: '#3B82F6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        새로고침
                    </button>
                </div>
            </div>
        );
    }

    // 데이터가 없는 경우 기본값 사용
    const dashboard: DiskIODashboardResponse = data || {
        osDiskUsage: {
            usagePercent: 0,
            trend: "stable",
            status: "normal",
            totalGB: 0,
            usedGB: 0,
            availableGB: 0,
        },
        diskIoThroughput: {
            readMBps: 0,
            writeMBps: 0,
            totalMBps: 0,
            readTrend: "stable",
            writeTrend: "stable",
            readChangePct: 0,
            writeChangePct: 0,
        },
        bufferCacheHit: {
            hitRatio: 0,
            status: "normal",
            cacheHits: 0,
            physicalReads: 0,
        },
        backendFsync: {
            fsyncRate: 0,
            status: "normal",
            totalFsyncs: 0,
            message: "",
        },
        diskLatency: {
            avgReadLatency: 0,
            avgWriteLatency: 0,
            status: "normal",
            maxLatency: 0,
        },
        osDiskIoChart1h: { categories: [], readMBps: [], writeMBps: [] },
        bufferCacheChart1h: { categories: [], hitRatio: [], warningThreshold: 85, normalThreshold: 95 },
        ioLatencyChart6h: { categories: [], readLatency: [], writeLatency: [] },
        diskUsageChart24h: { categories: [], usagePercent: [], warningThreshold: 80, dangerThreshold: 90 },
        checkpointChart24h: { categories: [], checkpointBuffers: [], cleanBuffers: [], backendBuffers: [] },
        backendFsyncChart24h: { categories: [], fsyncRate: [], warningThreshold: 10 },
        physicalCacheChart24h: { categories: [], physicalReads: [], cacheHits: [] },
        throughputChart24h: { categories: [], readMBps: [], writeMBps: [] },
    };

    // Slice 유틸 (프론트 임시 조정)
    const recent10m = (arr: any[]) => arr.slice(-10);
    const recent15m = (arr: any[]) => arr.slice(-15);
    const recent1h = (arr: any[]) => arr.slice(-60);


    // SSE 우선
    const displayUsage = realtimeDiskUsage ?? dashboard.osDiskUsage.usagePercent;
    const displayTotalGB = realtimeDiskTotalGB ?? dashboard.osDiskUsage.totalGB;
    const displayUsedGB = realtimeDiskUsedGB ?? dashboard.osDiskUsage.usedGB;
    const displayAvailableGB = realtimeDiskAvailableGB ?? dashboard.osDiskUsage.availableGB;
    // I/O 처리량: SSE 데이터 우선 사용 (0도 유효한 값이므로 null/undefined 체크만)
    const displayRead = realtimeDiskRead !== null && realtimeDiskRead !== undefined 
        ? realtimeDiskRead 
        : dashboard.diskIoThroughput.readMBps;
    const displayWrite = realtimeDiskWrite !== null && realtimeDiskWrite !== undefined 
        ? realtimeDiskWrite 
        : dashboard.diskIoThroughput.writeMBps;

    return (
        <div className="disk-page">
            {/* ===== 위젯 5개 ===== */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "1rem",
                marginBottom: "1.5rem"
            }}>
                <SummaryCard
                    label="디스크 사용률"
                    value={`${displayUsage.toFixed(1)}%`}
                    desc={`사용: ${Math.round(displayUsedGB)}GB / ${Math.round(displayTotalGB)}GB`}
                    status={dashboard.osDiskUsage.status === "danger" ? "warning" : "info"}
                />

                <SummaryCard
                    label="I/O 처리량"
                    value={`${(displayRead + displayWrite).toFixed(1)} MB/s`}
                    desc={`읽기 ${displayRead.toFixed(1)} / 쓰기 ${displayWrite.toFixed(1)}`}
                    status="info"
                />

                <SummaryCard
                    label="Backend Fsync"
                    value={`${dashboard.backendFsync.fsyncRate.toFixed(1)}/s`}
                    desc={`최근 15분 평균`}
                    status={dashboard.backendFsync.status === "warning" ? "warning" : "info"}
                />

                <SummaryCard
                    label="평균 Latency"
                    value={`${dashboard.diskLatency.maxLatency.toFixed(2)} ms`}
                    desc={`최근 15분 평균`}
                    status={dashboard.diskLatency.status === "danger" ? "warning" : "info"}
                />
            </div>

            {/* ===== 차트 1: OS Disk IO (최근 5분) - SSE 실시간 데이터 ===== */}
            <ChartGridLayout>

                <WidgetCard title="Disk 사용률 (실시간)" span={4}>
                    <Chart
                        type="line"
                        series={[
                            {
                                name: "사용률 (%)",
                                data: sampledDiskUsageHistory.length > 0
                                    ? (() => {
                                        const sampled = sampleLast60Seconds(sampledDiskUsageHistory);
                                        return sampled.map(item => item.usagePercent);
                                    })()
                                    : recent15m(dashboard.diskUsageChart24h.usagePercent)
                            },
                        ]}
                        categories={
                            sampledDiskUsageHistory.length > 0
                                ? (() => {
                                    const sampled = sampleLast60Seconds(sampledDiskUsageHistory);
                                    return sampled.map(item => {
                                        // HH:MM 형식으로 시간 표시 (최근 1분, 5초 간격 12개 데이터 포인트)
                                        return item.time.substring(0, 5);
                                    });
                                })()
                                : recent15m(dashboard.diskUsageChart24h.categories)
                        }
                        height={250}
                        colors={["#8E79FF"]}
                        showGrid
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
                                text: "사용률 (%)",
                                style: { fontSize: "12px", color: "#6B7280" },
                            },
                            labels: { formatter: (val: number) => `${val.toFixed(1)}%` },
                            min: 0,
                            max: 100,
                        }}
                        customOptions={{
                            xaxis: {
                                tickAmount: 6,
                                labels: {
                                    showDuplicates: false,
                                    rotate: 0, // 라벨을 수평으로 표시
                                    style: {
                                        fontSize: "11px",
                                        colors: "#6B7280"
                                    }
                                },
                            },
                            tooltip: {
                                x: {
                                    formatter: (val: any, opts: any) => {
                                        // 히스토리 데이터에서 time 속성 사용 (최근 1분)
                                        if (sampledDiskUsageHistory.length > 0 && opts.seriesIndex === 0) {
                                            const sampled = sampleLast60Seconds(sampledDiskUsageHistory);
                                            const dataPoint = sampled[opts.dataPointIndex];
                                            return dataPoint ? dataPoint.time : val;
                                        }
                                        return val;
                                    },
                                },
                            },
                        }}
                    />
                </WidgetCard>

                <WidgetCard title="OS Disk I/O 추이 (실시간)" span={4}>
                    <Chart
                        type="line"
                        series={[
                            {
                                name: "읽기 (MB/s)",
                                data: sampledDiskIoHistory.length > 0
                                    ? (() => {
                                        const sampled = sampleLast60Seconds(sampledDiskIoHistory);
                                        return sampled.map(item => item.readMBps);
                                    })()
                                    : recent10m(dashboard.osDiskIoChart1h.readMBps).slice(-5)
                            },
                            {
                                name: "쓰기 (MB/s)",
                                data: sampledDiskIoHistory.length > 0
                                    ? (() => {
                                        const sampled = sampleLast60Seconds(sampledDiskIoHistory);
                                        return sampled.map(item => item.writeMBps);
                                    })()
                                    : recent10m(dashboard.osDiskIoChart1h.writeMBps).slice(-5)
                            },
                        ]}
                        categories={
                            sampledDiskIoHistory.length > 0
                                ? (() => {
                                    const sampled = sampleLast60Seconds(sampledDiskIoHistory);
                                    return sampled.map(item => {
                                        // HH:MM 형식으로 시간 표시 (최근 1분, 5초 간격 12개 데이터 포인트)
                                        return item.time.substring(0, 5);
                                    });
                                })()
                                : recent10m(dashboard.osDiskIoChart1h.categories).slice(-5)
                        }
                        height={250}
                        colors={["#8E79FF", "#6FCF97"]}
                        showLegend
                        showGrid
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
                                text: "I/O 속도 (MB/s)",
                                style: { fontSize: "12px", color: "#6B7280" },
                            },
                            labels: { formatter: (val: number) => `${val.toFixed(2)}` },
                        }}
                        customOptions={{
                            xaxis: {
                                tickAmount: 6,
                                labels: {
                                    showDuplicates: false,
                                    rotate: 0, // 라벨을 수평으로 표시
                                    style: {
                                        fontSize: "11px",
                                        colors: "#6B7280"
                                    }
                                },
                            },
                            tooltip: {
                                x: {
                                    formatter: (val: any, opts: any) => {
                                        // 히스토리 데이터에서 time 속성 사용 (전체 HH:MM:SS 표시, 최근 1분)
                                        if (sampledDiskIoHistory.length > 0 && opts.seriesIndex !== undefined) {
                                            const sampled = sampleLast60Seconds(sampledDiskIoHistory);
                                            const dataPoint = sampled[opts.dataPointIndex];
                                            return dataPoint ? dataPoint.time : val;
                                        }
                                        return val;
                                    },
                                },
                            },
                        }}
                    />
                </WidgetCard>


                {/*/!* ===== 차트 3: IO Latency (최근 15분) ===== *!/*/}
                {/*<WidgetCard title="I/O Latency 추이 (최근 15분)" span={4}>*/}
                {/*    {(() => {*/}
                {/*        // 데이터 존재 여부 확인*/}
                {/*        const readLatency = dashboard?.ioLatencyChart6h?.readLatency || [];*/}
                {/*        const writeLatency = dashboard?.ioLatencyChart6h?.writeLatency || [];*/}
                {/*        const hasData = readLatency.some(val => val > 0) || writeLatency.some(val => val > 0);*/}

                {/*        // 데이터가 없거나 모두 0인 경우 안내 메시지 표시*/}
                {/*        if (!hasData) {*/}
                {/*            return (*/}
                {/*                <div style={{*/}
                {/*                    height: '250px',*/}
                {/*                    display: 'flex',*/}
                {/*                    flexDirection: 'column',*/}
                {/*                    justifyContent: 'center',*/}
                {/*                    alignItems: 'center',*/}
                {/*                    color: '#6B7280',*/}
                {/*                    textAlign: 'center',*/}
                {/*                    padding: '20px'*/}
                {/*                }}>*/}
                {/*                    <svg*/}
                {/*                        style={{ width: '64px', height: '64px', marginBottom: '16px', opacity: 0.5 }}*/}
                {/*                        fill="none"*/}
                {/*                        stroke="currentColor"*/}
                {/*                        viewBox="0 0 24 24"*/}
                {/*                    >*/}
                {/*                        <path*/}
                {/*                            strokeLinecap="round"*/}
                {/*                            strokeLinejoin="round"*/}
                {/*                            strokeWidth={2}*/}
                {/*                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"*/}
                {/*                        />*/}
                {/*                    </svg>*/}
                {/*                    <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px', color: '#7B61FF' }}>*/}
                {/*                        I/O Latency가 측정되지 않고 있습니다*/}
                {/*                    </div>*/}
                {/*                    <div style={{ fontSize: '14px', color: '#9CA3AF' }}>*/}
                {/*                        현재 디스크 읽기/쓰기 지연이 매우 낮거나, <br/>*/}
                {/*                        I/O 활동이 최소화되어 있습니다*/}
                {/*                    </div>*/}
                {/*                </div>*/}
                {/*            );*/}
                {/*        }*/}

                {/*        // 데이터가 있는 경우 차트 표시*/}
                {/*        return (*/}
                {/*            <Chart*/}
                {/*                type="line"*/}
                {/*                series={[*/}
                {/*                    { name: "읽기(ms)", data: recent15m(readLatency) },*/}
                {/*                    { name: "쓰기(ms)", data: recent15m(writeLatency) },*/}
                {/*                ]}*/}
                {/*                categories={recent15m(dashboard.ioLatencyChart6h.categories)}*/}
                {/*                height={250}*/}
                {/*                colors={["#8E79FF", "#6FCF97"]}*/}
                {/*                showLegend*/}
                {/*                showGrid*/}
                {/*                xaxisOptions={{*/}
                {/*                    title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },*/}
                {/*                    labels: {*/}
                {/*                        rotate: 0,*/}
                {/*                        style: { fontSize: "11px", colors: "#6B7280" },*/}
                {/*                    },*/}
                {/*                }}*/}
                {/*            />*/}
                {/*        );*/}
                {/*    })()}*/}
                {/*</WidgetCard>*/}
                {/* ===== 차트 8: Disk I/O Throughput (최근 15분) ===== */}
                <WidgetCard title="Disk I/O Throughput (최근 15분)" span={4}>
                    {(() => {
                        // 데이터 존재 여부 확인
                        const readMBps = dashboard?.throughputChart24h?.readMBps || [];
                        const writeMBps = dashboard?.throughputChart24h?.writeMBps || [];
                        const hasData = readMBps.some(val => val > 0) || writeMBps.some(val => val > 0);

                        // 데이터가 없거나 모두 0인 경우 안내 메시지 표시
                        if (!hasData) {
                            return (
                                <div style={{
                                    height: '250px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    color: '#6B7280',
                                    textAlign: 'center',
                                    padding: '20px'
                                }}>
                                    <svg
                                        style={{ width: '64px', height: '64px', marginBottom: '16px', opacity: 0.5 }}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                    <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px', color: '#7B61FF' }}>
                                        디스크 I/O 처리량이 발생하지 않고 있습니다
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#9CA3AF' }}>
                                        현재 디스크 읽기/쓰기 활동이 매우 낮거나, <br/>
                                        모든 데이터가 메모리 캐시에서 처리되고 있습니다
                                    </div>
                                </div>
                            );
                        }

                        // 데이터가 있는 경우 차트 표시
                        return (
                            <Chart
                                type="line"
                                series={[
                                    { name: "읽기(MB/s)", data: recent15m(readMBps) },
                                    { name: "쓰기(MB/s)", data: recent15m(writeMBps) },
                                ]}
                                categories={recent15m(dashboard.throughputChart24h.categories)}
                                height={250}
                                colors={["#8E79FF", "#6FCF97"]}
                                showLegend
                                showGrid
                                xaxisOptions={{
                                    title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                                    labels: {
                                        rotate: 0,
                                        style: { fontSize: "11px", colors: "#6B7280" },
                                    },
                                }}
                            />
                        );
                    })()}
                </WidgetCard>
            </ChartGridLayout>

            {/* ===== 차트 4: Disk 사용률 (최근 5분) - SSE 실시간 데이터 ===== */}
            <ChartGridLayout>


                {/* ===== 차트 5: Backend Fsync (최근 15분) ===== */}
                <WidgetCard title="Backend Fsync Rate (최근 15분)" span={4}>
                    {(() => {
                        // 데이터 존재 여부 확인
                        const fsyncRate = dashboard?.backendFsyncChart24h?.fsyncRate || [];
                        const hasData = fsyncRate.some(val => val > 0);

                        // 데이터가 없거나 모두 0인 경우 안내 메시지 표시
                        if (!hasData) {
                            return (
                                <div style={{
                                    height: '250px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    color: '#6B7280',
                                    textAlign: 'center',
                                    padding: '20px'
                                }}>
                                    <svg
                                        style={{ width: '64px', height: '64px', marginBottom: '16px', opacity: 0.5 }}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                    <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px', color: '#7B61FF' }}>
                                        Backend Fsync 활동이 발생하지 않고 있습니다
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#9CA3AF' }}>
                                        현재 데이터베이스가 정상적으로 운영되고 있으며, <br/>
                                        백엔드 프로세스의 동기화 작업이 최소화되고 있습니다
                                    </div>
                                </div>
                            );
                        }

                        // 데이터가 있는 경우 차트 표시
                        return (
                            <Chart
                                type="line"
                                series={[{ name: "Fsync/s", data: recent15m(fsyncRate) }]}
                                categories={recent15m(dashboard.backendFsyncChart24h.categories)}
                                height={250}
                                colors={["#FEA29B"]}
                                showGrid
                                xaxisOptions={{
                                    title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                                    labels: {
                                        rotate: 0,
                                        style: { fontSize: "11px", colors: "#6B7280" },
                                    },
                                }}
                            />
                        );
                    })()}
                </WidgetCard>

                {/* ===== 차트 6: Checkpoint vs Backend Write (최근 15분) ===== */}
                <WidgetCard title="Checkpoint vs Backend Write (최근 15분)" span={4}>
                    {(() => {
                        // 데이터 존재 여부 확인
                        const checkpointBuffers = dashboard?.checkpointChart24h?.checkpointBuffers || [];
                        const cleanBuffers = dashboard?.checkpointChart24h?.cleanBuffers || [];
                        const backendBuffers = dashboard?.checkpointChart24h?.backendBuffers || [];
                        const hasData = checkpointBuffers.some(val => val > 0) ||
                            cleanBuffers.some(val => val > 0) ||
                            backendBuffers.some(val => val > 0);

                        // 데이터가 없거나 모두 0인 경우 안내 메시지 표시
                        if (!hasData) {
                            return (
                                <div style={{
                                    height: '250px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    color: '#6B7280',
                                    textAlign: 'center',
                                    padding: '20px'
                                }}>
                                    <svg
                                        style={{ width: '64px', height: '64px', marginBottom: '16px', opacity: 0.5 }}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                    <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px', color: '#7B61FF' }}>
                                        버퍼 쓰기 활동이 발생하지 않고 있습니다
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#9CA3AF' }}>
                                        현재 데이터베이스가 안정적으로 운영되고 있으며, <br/>
                                        Checkpoint와 Backend 버퍼 쓰기가 최소화되고 있습니다
                                    </div>
                                </div>
                            );
                        }

                        // 데이터가 있는 경우 차트 표시
                        return (
                            <Chart
                                type="line"
                                series={[
                                    { name: "Checkpoint", data: recent15m(checkpointBuffers) },
                                    { name: "Clean", data: recent15m(cleanBuffers) },
                                    { name: "Backend", data: recent15m(backendBuffers) },
                                ]}
                                categories={recent15m(dashboard.checkpointChart24h.categories)}
                                height={250}
                                colors={["#8E79FF", "#6FCF97", "#FEA29B"]}
                                showLegend
                                showGrid
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
                                        text: "버퍼 수",
                                        style: { fontSize: "12px", color: "#6B7280" },
                                    },
                                    labels: { formatter: (val: number) => `${val.toLocaleString()}` },
                                }}
                                customOptions={{
                                    xaxis: {
                                        tickAmount: 6,
                                        labels: {
                                            showDuplicates: false,
                                        },
                                    },
                                }}
                            />
                        );
                    })()}
                </WidgetCard>


            </ChartGridLayout>

        </div>
    );
}