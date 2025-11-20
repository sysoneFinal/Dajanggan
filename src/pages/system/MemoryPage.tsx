import Chart from "../../components/chart/ChartComponent";
import SummaryCard from "../../components/util/SummaryCard";
import WidgetCard from "../../components/util/WidgetCard";
import ChartGridLayout from "../../components/layout/ChartGridLayout";
import "../../styles/system/memory.css";
import apiClient from "../../api/apiClient";
import { useQuery } from "@tanstack/react-query";
import { useInstanceContext } from "../../context/InstanceContext";
import { useOsMetricSse, type RealtimeOsMetrics, useRealtimeMemoryHistory, useRealtimeMemoryTrendHistory, useRealtimeSwapTrendHistory } from "../../context/OsMetricSseContext";
import { useEffect, useState, useRef } from "react";

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
// 백엔드 API 응답 구조 (DashboardResponse)
// ========================================
interface MemoryData {
    // 실시간 위젯 (4개)
    osMemoryUsage: {
        usagePercent: number;
        trend: string; // 'up' | 'down' | 'stable'
        status: string; // 'normal' | 'warning' | 'danger'
        totalGB: number;
        usedGB: number;
        availableGB: number;
        cacheGB: number;
    };
    swapUsage: {
        swapUsagePercent: number;
        status: string;
        totalSwapGB: number;
        usedSwapGB: number;
        swapInPerSec: number;
        swapOutPerSec: number;
    };
    sharedBufferHit: {
        hitRatio: number;
        status: string;
        cacheHits: number;
        physicalReads: number;
    };
    tempFileUsage: {
        tempFileRate: number;
        status: string;
        totalTempFiles: number;
        totalTempMB: number;
        message: string;
    };

    // 1시간 차트 (2개)
    osMemoryChart1h: {
        categories: string[];
        usedGB: number[];
        cacheGB: number[];
        bufferGB: number[];
    };
    bufferCacheChart1h: {
        categories: string[];
        hitRatio: number[];
        warningThreshold: number;
        normalThreshold: number;
    };

    // 6시간 차트 (2개)
    tempFileChart6h: {
        categories: string[];
        tempFileCount: number[];
        tempFileSizeMB: number[];
    };
    ioWaitTimeChart6h: {
        categories: string[];
        readWaitMs: number[];
        writeWaitMs: number[];
    };

    // 24시간 차트 (2개)
    osMemoryTrend24h: {
        categories: string[];
        usagePercent: number[];
        warningThreshold: number;
        dangerThreshold: number;
    };
    swapTrend24h: {
        categories: string[];
        swapUsagePercent: number[];
        swapInRate: number[];
        swapOutRate: number[];
    };
}


// ========================================
// API 요청 함수
// ========================================
async function fetchMemoryData(instanceId: number) {
    const response = await apiClient.get<MemoryData>("/system/memory", {
        params: { instanceId }
    });
    return response.data;
}

// ========================================
// 메인 Memory 페이지
// ========================================
export default function MemoryPage() {
    const { selectedInstance } = useInstanceContext();
    const { subscribe } = useOsMetricSse();

    // 실시간 메모리 사용률 (SSE)
    const [realtimeMemoryUsage, setRealtimeMemoryUsage] = useState<number | null>(null);
    
    // 실시간 메모리 상세 정보 (SSE)
    const [realtimeMemoryDetails, setRealtimeMemoryDetails] = useState<{
        totalGB: number;
        usedGB: number;
        availableGB: number;
    } | null>(null);
    
    // 실시간 Swap 사용률 (SSE)
    const [realtimeSwapUsage, setRealtimeSwapUsage] = useState<{
        swapUsagePercent: number;
        totalSwapGB: number;
        usedSwapGB: number;
        swapInPerSec: number;
        swapOutPerSec: number;
    } | null>(null);
    
    // TanStack Query 캐시에서 히스토리 데이터 읽기 (페이지 이동해도 유지됨)
    const realtimeMemoryHistory = useRealtimeMemoryHistory(selectedInstance?.instanceId);
    const realtimeMemoryTrendHistory = useRealtimeMemoryTrendHistory(selectedInstance?.instanceId);
    const realtimeSwapTrendHistory = useRealtimeSwapTrendHistory(selectedInstance?.instanceId);

    // data를 ref로 저장하여 SSE 콜백에서 최신 값 참조
    const dataRef = useRef<MemoryData | null>(null);
    
    const { data, error } = useQuery({
        queryKey: ["memoryDashboard", selectedInstance?.instanceId],
        queryFn: () => {
            console.log("[MemoryPage] API 호출 시작:", selectedInstance?.instanceId);
            return fetchMemoryData(selectedInstance!.instanceId);
        },
        retry: 1,
        refetchInterval: 60000, // 1분마다 자동 갱신
        enabled: !!selectedInstance,
    });
    
    // data가 변경될 때마다 ref 업데이트
    useEffect(() => {
        if (data) {
            dataRef.current = data;
            console.log("[MemoryPage] API 호출 성공:", data);
        }
    }, [data]);
    
    useEffect(() => {
        if (error) {
            console.error("[MemoryPage] API 호출 실패:", error);
        }
    }, [error]);

    // 전역 SSE 연결 구독 (히스토리는 Context에서 자동으로 캐시에 저장됨)
    useEffect(() => {
        if (!selectedInstance) {
            setRealtimeMemoryUsage(null);
            setRealtimeMemoryDetails(null);
            setRealtimeSwapUsage(null);
            return;
        }

        console.log('Memory SSE 구독 시작:', selectedInstance.instanceId);

        // 전역 SSE 구독 (히스토리는 Context에서 TanStack Query 캐시에 자동 저장됨)
        const unsubscribe = subscribe((metrics: RealtimeOsMetrics) => {
            // 위젯용 실시간 값만 업데이트 (히스토리는 Context에서 자동 처리)
            if (metrics.memory !== undefined && metrics.memory !== null) {
                console.log('Memory SSE 데이터 수신:', metrics.memory);
                setRealtimeMemoryUsage(metrics.memory);
                
                // Memory 상세 정보 저장 (위젯에서 사용)
                if (metrics.memoryTotalGB !== null && metrics.memoryTotalGB !== undefined) {
                    setRealtimeMemoryDetails({
                        totalGB: metrics.memoryTotalGB,
                        usedGB: metrics.memoryUsedGB || 0,
                        availableGB: metrics.memoryAvailableGB || 0,
                    });
                }
            }
            
            // Swap 메트릭 데이터 수신
            if (metrics.swapUsage !== undefined && metrics.swapUsage !== null) {
                console.log('Swap SSE 데이터 수신:', metrics);
                setRealtimeSwapUsage({
                    swapUsagePercent: metrics.swapUsage,
                    totalSwapGB: metrics.swapTotalGB || 0,
                    usedSwapGB: metrics.swapUsedGB || 0,
                    swapInPerSec: metrics.swapInPerSec || 0,
                    swapOutPerSec: metrics.swapOutPerSec || 0,
                });
            }
        });

        return () => {
            console.log('Memory SSE 구독 해제');
            unsubscribe();
        };
    }, [selectedInstance?.instanceId, subscribe]);

    // 데이터 구조 확인용 디버깅 (조건부 return 이전에 위치)
    useEffect(() => {
        if (data) {
            console.log("[MemoryPage] 데이터 구조 확인:", {
                osMemoryUsage: memoryData.osMemoryUsage,
                osMemoryChart1h: {
                    categoriesCount: memoryData.osMemoryChart1h?.categories?.length || 0,
                    usedGBCount: memoryData.osMemoryChart1h?.usedGB?.length || 0,
                },
                bufferCacheChart1h: {
                    categoriesCount: memoryData.bufferCacheChart1h?.categories?.length || 0,
                    hitRatioCount: memoryData.bufferCacheChart1h?.hitRatio?.length || 0,
                },
            });
        }
    }, [data]);

    // 인스턴스가 선택되지 않은 경우
    if (!selectedInstance) {
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
                    인스턴스를 선택해주세요
                </div>
            </div>
        );
    }

    // 백엔드 데이터가 없을 때 기본값 설정 (실시간 차트는 항상 표시하기 위해)
    const memoryData: MemoryData = data || {
        osMemoryUsage: {
            usagePercent: 0,
            trend: "stable",
            status: "normal",
            totalGB: 0,
            usedGB: 0,
            availableGB: 0,
            cacheGB: 0,
        },
        swapUsage: {
            swapUsagePercent: 0,
            status: "normal",
            totalSwapGB: 0,
            usedSwapGB: 0,
            swapInPerSec: 0,
            swapOutPerSec: 0,
        },
        sharedBufferHit: {
            hitRatio: 0,
            status: "normal",
            cacheHits: 0,
            physicalReads: 0,
        },
        tempFileUsage: {
            tempFileRate: 0,
            status: "normal",
            totalTempFiles: 0,
            totalTempMB: 0,
            message: "",
        },
        osMemoryChart1h: {
            categories: [],
            usedGB: [],
            cacheGB: [],
            bufferGB: [],
        },
        bufferCacheChart1h: {
            categories: [],
            hitRatio: [],
            warningThreshold: 85,
            normalThreshold: 95,
        },
        tempFileChart6h: {
            categories: [],
            tempFileCount: [],
            tempFileSizeMB: [],
        },
        ioWaitTimeChart6h: {
            categories: [],
            readWaitMs: [],
            writeWaitMs: [],
        },
        osMemoryTrend24h: {
            categories: [],
            usagePercent: [],
            warningThreshold: 80,
            dangerThreshold: 90,
        },
        swapTrend24h: {
            categories: [],
            swapUsagePercent: [],
            swapInRate: [],
            swapOutRate: [],
        },
    };

    return (
        <div className="memory-page">
            {/* ========================================
                1번째 행: 실시간 위젯 4개
                ======================================== */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "1rem",
                marginBottom: "1.5rem"
            }}>
                <SummaryCard
                    label="Memory 사용률"
                    value={`${(realtimeMemoryUsage ?? memoryData.osMemoryUsage.usagePercent).toFixed(1)}%`}
                    desc={`사용: ${(realtimeMemoryDetails?.usedGB ?? ((realtimeMemoryUsage ?? memoryData.osMemoryUsage.usagePercent) / 100 * memoryData.osMemoryUsage.totalGB)).toFixed(1)}GB / ${(realtimeMemoryDetails?.totalGB ?? memoryData.osMemoryUsage.totalGB).toFixed(1)}GB`}
                    status={memoryData.osMemoryUsage.status === "danger" ? "warning" as const : "info" as const}
                />

                <SummaryCard
                    label="Swap 사용률"
                    value={`${(realtimeSwapUsage?.swapUsagePercent ?? memoryData.swapUsage.swapUsagePercent).toFixed(1)} %`}
                    desc={`사용: ${(realtimeSwapUsage?.usedSwapGB ?? memoryData.swapUsage.usedSwapGB).toFixed(1)}GB /  ${(realtimeSwapUsage?.totalSwapGB ?? memoryData.swapUsage.totalSwapGB)}GB`}
                    status={(realtimeSwapUsage?.swapInPerSec && realtimeSwapUsage.swapInPerSec > 0) || 
                            (realtimeSwapUsage?.swapOutPerSec && realtimeSwapUsage.swapOutPerSec > 0) ||
                            (realtimeSwapUsage?.swapUsagePercent && realtimeSwapUsage.swapUsagePercent > 10) ||
                            (!realtimeSwapUsage && memoryData.swapUsage.status === "danger")
                            ? "warning" as const : "info" as const}
                />

                <SummaryCard
                    label={"버퍼 캐시 히트율"}
                    value={`${memoryData.sharedBufferHit.hitRatio}%`}
                    desc={"최근 1시간"}
                    status={memoryData.sharedBufferHit.status === "danger" ? "warning" as const : "info" as const}
                />

                <SummaryCard
                    label={"임시 파일 사용량"}
                    value={`${memoryData.tempFileUsage.tempFileRate.toFixed(1)}/s`}
                    desc={`Total Size: ${memoryData.tempFileUsage.totalTempMB.toLocaleString()}MB`}
                    status={memoryData.tempFileUsage.status === "danger" ? "warning" as const : "info" as const}
                />
            </div>

            {/* ========================================
                2번째 행: 1시간 차트 2개
                ======================================== */}
            <ChartGridLayout>
                {/* 차트 1: OS Memory Usage (최근 5분) - SSE 실시간 데이터만 사용 */}
                <WidgetCard title="OS 메모리 사용량 (실시간)" span={4}>
                    <Chart
                        type="line"
                        series={[
                            { 
                                name: "Used GB", 
                                data: (() => {
                                    const sampled = sampleLast60Seconds(realtimeMemoryHistory);
                                    return sampled.map(item => item.usedGB);
                                })()
                            },
                        ]}
                        categories={(() => {
                            const sampled = sampleLast60Seconds(realtimeMemoryHistory);
                            return sampled.map(item => {
                                // HH:MM 형식으로 시간 표시 (최근 1분, 5초 간격 12개 데이터 포인트)
                                return item.time.substring(0, 5);
                            });
                        })()}
                        height={250}
                        colors={["#8B5CF6", "#06B6D4", "#10B981"]}
                        showGrid={true}
                        showLegend={true}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: {
                                rotate: 0, // 라벨을 수평으로 표시
                                style: {
                                    fontSize: "11px",
                                    colors: "#6B7280"
                                }
                            }
                        }}
                        yaxisOptions={{
                            title: { text: "Memory (GB)", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: { formatter: (val: number) => `${val.toFixed(1)} GB` },
                        }}
                        tooltipFormatter={(value: number) => `${value.toFixed(2)} GB`}
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
                        }}
                    />
                </WidgetCard>
                {/* 차트 6: OS Memory Trend (최근 5분) - SSE 실시간 데이터만 사용 */}
                <WidgetCard title="OS 메모리 사용률 (실시간)" span={4}>
                    <Chart
                        type="line"
                        series={[{
                            name: "Usage %",
                            data: (() => {
                                const sampled = sampleLast60Seconds(realtimeMemoryTrendHistory);
                                return sampled.map(item => item.usagePercent);
                            })()
                        }]}
                        categories={(() => {
                            const sampled = sampleLast60Seconds(realtimeMemoryTrendHistory);
                            return sampled.map(item => {
                                // HH:MM 형식으로 시간 표시 (최근 1분, 5초 간격 12개 데이터 포인트)
                                return item.time.substring(0, 5);
                            });
                        })()}
                        height={250}
                        colors={["#8B5CF6"]}
                        showGrid={true}
                        showLegend={false}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: {
                                rotate: 0, // 라벨을 수평으로 표시
                                style: {
                                    fontSize: "11px",
                                    colors: "#6B7280"
                                }
                            }
                        }}
                        yaxisOptions={{
                            title: { text: "Usage (%)", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: { formatter: (val: number) => `${val.toFixed(1)}%` },
                            min: 0,
                            max: 100,
                        }}
                        tooltipFormatter={(value: number) => `${value.toFixed(1)}%`}
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
                                        y: 80,
                                        borderColor: "#FBBF24",
                                        strokeDashArray: 4,
                                        label: {
                                            text: `주의: 80%`,
                                            style: { color: "#fff", background: "#FBBF24", fontSize: "11px" }
                                        }
                                    },
                                    {
                                        y: 90,
                                        borderColor: "#EF4444",
                                        strokeDashArray: 4,
                                        label: {
                                            text: `위험: 90%`,
                                            style: { color: "#fff", background: "#EF4444", fontSize: "11px" }
                                        }
                                    }
                                ]
                            }
                        }}
                    />
                </WidgetCard>
                {/* 차트 7: Swap Usage Trend (최근 5분) - SSE 실시간 데이터만 사용 */}
                <WidgetCard title="Swap 사용률 추이 (실시간)" span={4}>
                    <Chart
                        type="line"
                        series={[
                            { 
                                name: "Swap Usage %", 
                                data: (() => {
                                    const sampled = sampleLast60Seconds(realtimeSwapTrendHistory);
                                    return sampled.map(item => item.swapUsagePercent);
                                })()
                            },
                            { 
                                name: "Swap In Rate", 
                                data: (() => {
                                    const sampled = sampleLast60Seconds(realtimeSwapTrendHistory);
                                    return sampled.map(item => item.swapInPerSec);
                                })()
                            },
                            { 
                                name: "Swap Out Rate", 
                                data: (() => {
                                    const sampled = sampleLast60Seconds(realtimeSwapTrendHistory);
                                    return sampled.map(item => item.swapOutPerSec);
                                })()
                            }
                        ]}
                        categories={(() => {
                            const sampled = sampleLast60Seconds(realtimeSwapTrendHistory);
                            return sampled.map(item => {
                                // HH:MM 형식으로 시간 표시 (최근 1분, 5초 간격 12개 데이터 포인트)
                                return item.time.substring(0, 5);
                            });
                        })()}
                        height={250}
                        colors={["#EF4444", "#06B6D4", "#F59E0B"]}
                        showGrid={true}
                        showLegend={true}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: {
                                rotate: 0, // 라벨을 수평으로 표시
                                style: {
                                    fontSize: "11px",
                                    colors: "#6B7280"
                                }
                            }
                        }}
                        yaxisOptions={{
                            title: { text: "Usage % / Rate", style: { fontSize: "12px", color: "#6B7280" } },
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
                            }
                        }}
                    />
                </WidgetCard>

            </ChartGridLayout>

            {/* ========================================
                3번째 행: 6시간 차트 2개
                ======================================== */}
            <ChartGridLayout>
                {/* 차트 2: Buffer Cache Hit Ratio (1시간) */}
                <WidgetCard title="버퍼 캐시 히트율 (최근 1시간)" span={4}>
                    <Chart
                        type="line"
                        series={[{ name: "Hit Ratio %", data: memoryData?.bufferCacheChart1h?.hitRatio || [] }]}
                        categories={memoryData?.bufferCacheChart1h?.categories || []}
                        height={250}
                        colors={["#7B61FF"]}
                        showGrid={true}
                        showLegend={false}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: {
                                rotate: 0, // 라벨을 수평으로 표시
                                style: {
                                    fontSize: "11px",
                                    colors: "#6B7280"
                                }
                            }
                        }}
                        yaxisOptions={{
                            title: { text: "Hit Ratio (%)", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: { formatter: (val: number) => `${val.toFixed(1)}%` },
                            min: 80,
                            max: 100,
                        }}
                        tooltipFormatter={(value: number) => `${value.toFixed(2)}%`}
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
                                        y: memoryData?.bufferCacheChart1h?.normalThreshold || 95,
                                        borderColor: "#10B981",
                                        strokeDashArray: 4,
                                        label: {
                                            text: `정상: ${memoryData?.bufferCacheChart1h?.normalThreshold || 95}%`,
                                            style: { color: "#fff", background: "#10B981", fontSize: "11px" }
                                        }
                                    },
                                    {
                                        y: memoryData?.bufferCacheChart1h?.warningThreshold || 90,
                                        borderColor: "#FBBF24",
                                        strokeDashArray: 4,
                                        label: {
                                            text: `주의: ${memoryData?.bufferCacheChart1h?.warningThreshold || 90}%`,
                                            style: { color: "#fff", background: "#FBBF24", fontSize: "11px" }
                                        }
                                    }
                                ]
                            }
                        }}
                    />
                </WidgetCard>
                {/* 차트 4: Temp File Generation (24시간) */}
                <WidgetCard title="임시 파일 생성 (최근 24시간)" span={4}>
                    <Chart
                        type="line"
                        series={[
                            { name: "File Count", data: memoryData?.tempFileChart6h?.tempFileCount || [] },
                            { name: "Size (MB)", data: memoryData?.tempFileChart6h?.tempFileSizeMB || [] }
                        ]}
                        categories={memoryData?.tempFileChart6h?.categories || []}
                        height={250}
                        colors={["#8B5CF6", "#EC4899"]}
                        showGrid={true}
                        showLegend={true}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                        }}
                        yaxisOptions={{
                            title: { text: "Count / MB", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: { 
                                formatter: (val: number) => {
                                    // File Count는 정수, Size (MB)는 소수점 1자리로 표시
                                    // 값이 정수에 가까우면 정수로, 아니면 소수점 1자리로
                                    return val % 1 === 0 ? val.toString() : val.toFixed(1);
                                }
                            },
                        }}
                        tooltipFormatter={(value: number) => {
                            // 툴팁에서는 File Count는 정수, Size (MB)는 소수점 2자리
                            return value % 1 === 0 ? value.toString() : value.toFixed(2);
                        }}
                    />
                </WidgetCard>

                {/* 차트 5: I/O Wait Time (6시간) */}
                <WidgetCard title="I/O 대기 시간 (최근 6시간)" span={4}>
                    <Chart
                        type="line"
                        series={[
                            { name: "Read Wait (ms)", data: memoryData?.ioWaitTimeChart6h?.readWaitMs || [] },
                            { name: "Write Wait (ms)", data: memoryData?.ioWaitTimeChart6h?.writeWaitMs || [] }
                        ]}
                        categories={memoryData?.ioWaitTimeChart6h?.categories || []}
                        height={250}
                        colors={["#3B82F6", "#F59E0B"]}
                        showGrid={true}
                        showLegend={true}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: {
                                rotate: 0, // 라벨을 수평으로 표시
                                style: {
                                    fontSize: "11px",
                                    colors: "#6B7280"
                                }
                            }
                        }}
                        yaxisOptions={{
                            title: { text: "Wait Time (ms)", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: { formatter: (val: number) => `${val.toFixed(1)} ms` },
                        }}
                        tooltipFormatter={(value: number) => `${value.toFixed(2)} ms`}
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
                            }
                        }}
                    />
                </WidgetCard>

            </ChartGridLayout>
        </div>
    );
}