import Chart from "../../components/chart/ChartComponent";
import SummaryCard from "../../components/util/SummaryCard";
import WidgetCard from "../../components/util/WidgetCard";
import ChartGridLayout from "../../components/layout/ChartGridLayout";
import "../../styles/system/disk.css";
import apiClient from "../../api/apiClient";
import { useQuery } from "@tanstack/react-query";
import { useInstanceContext } from "../../context/InstanceContext";
import { useOsMetricSse, type RealtimeOsMetrics, useRealtimeDiskIoHistory, useRealtimeDiskUsageHistory } from "../../context/OsMetricSseContext";
import { useEffect, useState } from "react";

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

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["diskioDashboard", selectedInstance?.instanceId],
        queryFn: () => fetchDiskIOData(selectedInstance!.instanceId),
        retry: 1,
        refetchInterval: 60000,
        enabled: !!selectedInstance,
    });

    // 전역 SSE 연결 구독
    const { subscribe } = useOsMetricSse();
    
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
                setRealtimeDiskTotalGB(metrics.diskTotalGB);
            }
            if (metrics.diskUsedGB !== null && metrics.diskUsedGB !== undefined) {
                setRealtimeDiskUsedGB(metrics.diskUsedGB);
            }
            if (metrics.diskAvailableGB !== null && metrics.diskAvailableGB !== undefined) {
                setRealtimeDiskAvailableGB(metrics.diskAvailableGB);
            }
            if (metrics.diskRead !== null && metrics.diskRead !== undefined) {
                setRealtimeDiskRead(metrics.diskRead);
            }
            if (metrics.diskWrite !== null && metrics.diskWrite !== undefined) {
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

    // 백엔드 데이터가 없을 때 기본값 설정 (실시간 차트는 항상 표시하기 위해)
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
    const displayRead = realtimeDiskRead ?? dashboard.diskIoThroughput.readMBps;
    const displayWrite = realtimeDiskWrite ?? dashboard.diskIoThroughput.writeMBps;

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
                    desc={dashboard.backendFsync.message}
                    status={dashboard.backendFsync.status === "warning" ? "warning" : "info"}
                />

                <SummaryCard
                    label="평균 Latency"
                    value={`${dashboard.diskLatency.maxLatency.toFixed(2)} ms`}
                    desc={`읽기 ${dashboard.diskLatency.avgReadLatency} / 쓰기 ${dashboard.diskLatency.avgWriteLatency}`}
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
                                data: realtimeDiskUsageHistory.length > 0
                                    ? (() => {
                                        const sampled = sampleLast60Seconds(realtimeDiskUsageHistory);
                                        return sampled.map(item => item.usagePercent);
                                    })()
                                    : recent1h(dashboard.diskUsageChart24h.usagePercent)
                            },
                        ]}
                        categories={
                            realtimeDiskUsageHistory.length > 0
                                ? (() => {
                                    const sampled = sampleLast60Seconds(realtimeDiskUsageHistory);
                                    return sampled.map(item => {
                                        // HH:MM 형식으로 시간 표시 (최근 1분, 5초 간격 12개 데이터 포인트)
                                        return item.time.substring(0, 5);
                                    });
                                })()
                                : recent1h(dashboard.diskUsageChart24h.categories)
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
                                        if (realtimeDiskUsageHistory.length > 0 && opts.seriesIndex === 0) {
                                            const sampled = sampleLast60Seconds(realtimeDiskUsageHistory);
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
                                data: realtimeDiskIoHistory.length > 0 
                                    ? (() => {
                                        const sampled = sampleLast60Seconds(realtimeDiskIoHistory);
                                        return sampled.map(item => item.readMBps);
                                    })()
                                    : recent10m(dashboard.osDiskIoChart1h.readMBps).slice(-5)
                            },
                            { 
                                name: "쓰기 (MB/s)", 
                                data: realtimeDiskIoHistory.length > 0
                                    ? (() => {
                                        const sampled = sampleLast60Seconds(realtimeDiskIoHistory);
                                        return sampled.map(item => item.writeMBps);
                                    })()
                                    : recent10m(dashboard.osDiskIoChart1h.writeMBps).slice(-5)
                            },
                        ]}
                        categories={
                            realtimeDiskIoHistory.length > 0
                                ? (() => {
                                    const sampled = sampleLast60Seconds(realtimeDiskIoHistory);
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
                                        if (realtimeDiskIoHistory.length > 0 && opts.seriesIndex !== undefined) {
                                            const sampled = sampleLast60Seconds(realtimeDiskIoHistory);
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


                {/* ===== 차트 3: IO Latency (최근 15분) ===== */}
                <WidgetCard title="I/O Latency 추이 (최근 15분)" span={4}>
                    <Chart
                        type="line"
                        series={[
                            { name: "읽기(ms)", data: recent15m(dashboard.ioLatencyChart6h.readLatency) },
                            { name: "쓰기(ms)", data: recent15m(dashboard.ioLatencyChart6h.writeLatency) },
                        ]}
                        categories={recent15m(dashboard.ioLatencyChart6h.categories)}
                        height={250}
                        colors={["#8E79FF", "#6FCF97"]}
                        showLegend
                        showGrid
                    />
                </WidgetCard>
            </ChartGridLayout>

            {/* ===== 차트 4: Disk 사용률 (최근 5분) - SSE 실시간 데이터 ===== */}
            <ChartGridLayout>


                {/* ===== 차트 5: Backend Fsync (최근 1시간) ===== */}
                <WidgetCard title="Backend Fsync Rate (최근 1시간)" span={4}>
                    <Chart
                        type="line"
                        series={[{ name: "Fsync/s", data: recent1h(dashboard.backendFsyncChart24h.fsyncRate) }]}
                        categories={recent1h(dashboard.backendFsyncChart24h.categories)}
                        height={250}
                        colors={["#FEA29B"]}
                        showGrid
                    />
                </WidgetCard>

                {/* ===== 차트 6: Checkpoint vs Backend Write ===== */}
                <WidgetCard title="Checkpoint vs Backend Write (최근 24시간)" span={4}>
                    <Chart
                        type="line"
                        series={[
                            { name: "Checkpoint", data: recent1h(dashboard.checkpointChart24h.checkpointBuffers) },
                            { name: "Clean", data: recent1h(dashboard.checkpointChart24h.cleanBuffers) },
                            { name: "Backend", data: recent1h(dashboard.checkpointChart24h.backendBuffers) },
                        ]}
                        categories={recent1h(dashboard.checkpointChart24h.categories)}
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
                </WidgetCard>

                {/* ===== 차트 8: Disk I/O Throughput ===== */}
                <WidgetCard title="Disk I/O Throughput (최근 1시간)" span={4}>
                    <Chart
                        type="line"
                        series={[
                            { name: "읽기(MB/s)", data: recent1h(dashboard.throughputChart24h.readMBps) },
                            { name: "쓰기(MB/s)", data: recent1h(dashboard.throughputChart24h.writeMBps) },
                        ]}
                        categories={recent1h(dashboard.throughputChart24h.categories)}
                        height={250}
                        colors={["#8E79FF", "#6FCF97"]}
                        showLegend
                        showGrid
                    />
                </WidgetCard>
            </ChartGridLayout>

            {/* ===== 마지막 행 ===== */}
            <ChartGridLayout>
                {/* ===== 차트 7: Physical vs Cache Read ===== */}
                <WidgetCard title="Physical vs Cache Read (최근 24시간)" span={8}>
                    <Chart
                        type="line"
                        series={[
                            { name: "물리 읽기", data: recent1h(dashboard.physicalCacheChart24h.physicalReads) },
                            { name: "캐시 히트", data: recent1h(dashboard.physicalCacheChart24h.cacheHits) },
                        ]}
                        categories={recent1h(dashboard.physicalCacheChart24h.categories)}
                        height={250}
                        colors={["#FEA29B", "#8E79FF"]}
                        showLegend
                        showGrid
                    />
                </WidgetCard>


            </ChartGridLayout>
        </div>
    );
}
