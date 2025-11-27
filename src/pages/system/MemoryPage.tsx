// 작성자 : 김동현
import Chart from "../../components/chart/ChartComponent";
import SummaryCard from "../../components/util/SummaryCard";
import WidgetCard from "../../components/util/WidgetCard";
import ChartGridLayout from "../../components/layout/ChartGridLayout";
import "../../styles/system/memory.css";
import apiClient from "../../api/apiClient";
import { useQuery } from "@tanstack/react-query";
import { useInstanceContext } from "../../context/InstanceContext";
import { useOsMetricSse, type RealtimeOsMetrics, useRealtimeMemoryHistory, useRealtimeMemoryTrendHistory, useRealtimeSwapTrendHistory } from "../../context/OsMetricSseContext";
import { useEffect, useState, useRef, useMemo } from "react";

/**
 * 시간 문자열(HH:MM:SS)을 초 단위로 변환
 */
function timeToSeconds(timeStr: string): number {
    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds;
}

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

    // 1시간 차트 (3개)
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

    // 24시간 차트 (4개)
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
    topTablesChart24h: {
        tableNames: string[];
        bufferCounts: number[];
        usagePercent: number[];
    };
}


// ========================================
// API 요청 함수
// ========================================
async function fetchMemoryData(instanceId: number) {
    try {
        console.log("[MemoryPage] API 요청 시작 - instanceId:", instanceId);
        const response = await apiClient.get<MemoryData>("/system/memory", {
            params: { instanceId }
        });
        console.log("[MemoryPage] API 응답 수신:", response.data);
        console.log("[MemoryPage] 응답 필드 확인:", {
            hasTopTablesChart24h: !!response.data.topTablesChart24h
        });
        return response.data;
    } catch (error) {
        console.error("[MemoryPage] API 요청 실패:", error);
        throw error;
    }
}

// ========================================
// 메인 Memory 페이지
// ========================================
export default function MemoryPage() {
    const { selectedInstance } = useInstanceContext();
    const { subscribe, isConnected } = useOsMetricSse();

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

    // 실시간 메모리 히스토리 데이터 샘플링 (최근 60개만, 5초 간격 = 5분)
    const sampledMemoryHistory = useMemo(() => {
        const maxPoints = 60; // 최대 60개 포인트 (5분)
        if (realtimeMemoryHistory.length <= maxPoints) {
            return realtimeMemoryHistory;
        }
        // 최근 데이터만 선택
        return realtimeMemoryHistory.slice(-maxPoints);
    }, [realtimeMemoryHistory]);

    // 실시간 메모리 트렌드 히스토리 데이터 샘플링
    const sampledMemoryTrendHistory = useMemo(() => {
        const maxPoints = 60;
        if (realtimeMemoryTrendHistory.length <= maxPoints) {
            return realtimeMemoryTrendHistory;
        }
        return realtimeMemoryTrendHistory.slice(-maxPoints);
    }, [realtimeMemoryTrendHistory]);

    // 실시간 Swap 트렌드 히스토리 데이터 샘플링
    const sampledSwapTrendHistory = useMemo(() => {
        const maxPoints = 60;
        if (realtimeSwapTrendHistory.length <= maxPoints) {
            return realtimeSwapTrendHistory;
        }
        return realtimeSwapTrendHistory.slice(-maxPoints);
    }, [realtimeSwapTrendHistory]);

    // 백엔드 API 호출 - SSE가 아닌 위젯/차트 데이터를 받기 위해 필요
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["memoryDashboard", selectedInstance?.instanceId],
        queryFn: () => {
            console.log("[MemoryPage] API 호출 시작:", selectedInstance?.instanceId);
            return fetchMemoryData(selectedInstance!.instanceId);
        },
        retry: 1,
        refetchInterval: 60000, // 1분마다 자동 갱신
        enabled: !!selectedInstance,
    });

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
                console.log('[MemoryPage] SSE 메모리 사용률 수신:', metrics.memory);
                setRealtimeMemoryUsage(metrics.memory);
                
                // Memory 상세 정보 저장 (위젯에서 사용)
                if (metrics.memoryTotalGB !== null && metrics.memoryTotalGB !== undefined) {
                    console.log('[MemoryPage] SSE 메모리 상세 정보 수신:', {
                        totalGB: metrics.memoryTotalGB,
                        usedGB: metrics.memoryUsedGB,
                        availableGB: metrics.memoryAvailableGB
                    });
                    setRealtimeMemoryDetails({
                        totalGB: metrics.memoryTotalGB,
                        usedGB: metrics.memoryUsedGB || 0,
                        availableGB: metrics.memoryAvailableGB || 0,
                    });
                }
            }
            
            // Swap 메트릭 데이터 수신
            if (metrics.swapUsage !== undefined && metrics.swapUsage !== null) {
                console.log('[MemoryPage] SSE Swap 데이터 수신:', {
                    swapUsage: metrics.swapUsage,
                    totalSwapGB: metrics.swapTotalGB,
                    usedSwapGB: metrics.swapUsedGB,
                    swapInPerSec: metrics.swapInPerSec,
                    swapOutPerSec: metrics.swapOutPerSec
                });
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

    // 인스턴스가 선택되지 않은 경우
    if (!selectedInstance) {
        return (
            <div className="memory-page">
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

    // 로딩 중
    if (isLoading) {
        return (
            <div className="memory-page">
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
            <div className="memory-page">
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
        topTablesChart24h: {
            tableNames: [],
            bufferCounts: [],
            usagePercent: [],
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
                    desc={`사용: ${(realtimeMemoryDetails?.usedGB ?? memoryData.osMemoryUsage.usedGB).toFixed(1)}GB / ${(realtimeMemoryDetails?.totalGB ?? memoryData.osMemoryUsage.totalGB).toFixed(1)}GB`}
                    status={memoryData.osMemoryUsage.status === "danger" ? "warning" as const : "info" as const}
                />

                <SummaryCard
                    label="Swap 사용률"
                    value={`${(realtimeSwapUsage?.swapUsagePercent ?? memoryData.swapUsage.swapUsagePercent).toFixed(1)}%`}
                    desc={`사용: ${(realtimeSwapUsage?.usedSwapGB ?? memoryData.swapUsage.usedSwapGB).toFixed(1)}GB / ${(realtimeSwapUsage?.totalSwapGB ?? memoryData.swapUsage.totalSwapGB).toFixed(1)}GB`}
                    status={(() => {
                        if (realtimeSwapUsage) {
                            // SSE 데이터 사용 시: 백엔드 로직과 일치
                            if (realtimeSwapUsage.swapInPerSec > 0 || realtimeSwapUsage.swapOutPerSec > 0) {
                                return "critical" as const; // danger
                            } else if (realtimeSwapUsage.swapUsagePercent > 10) {
                                return "warning" as const;
                            }
                            return "info" as const; // normal
                        }
                        // 백엔드 API 사용 시
                        return memoryData.swapUsage.status === "danger" ? "critical" as const
                             : memoryData.swapUsage.status === "warning" ? "warning" as const
                             : "info" as const;
                    })()}
                />

                <SummaryCard
                    label={"버퍼 캐시 히트율"}
                    value={`${memoryData.sharedBufferHit.hitRatio}%`}
                    desc={"최근 15분"}
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
                                    const sampled = sampleLast60Seconds(sampledMemoryHistory);
                                    return sampled.map(item => item.usedGB);
                                })()
                            },
                        ]}
                        categories={(() => {
                            const sampled = sampleLast60Seconds(sampledMemoryHistory);
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
                                const sampled = sampleLast60Seconds(sampledMemoryTrendHistory);
                                return sampled.map(item => item.usagePercent);
                            })()
                        }]}
                        categories={(() => {
                            const sampled = sampleLast60Seconds(sampledMemoryTrendHistory);
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
                                    const sampled = sampleLast60Seconds(sampledSwapTrendHistory);
                                    return sampled.map(item => item.swapUsagePercent);
                                })()
                            },
                            { 
                                name: "Swap In Rate", 
                                data: (() => {
                                    const sampled = sampleLast60Seconds(sampledSwapTrendHistory);
                                    return sampled.map(item => item.swapInPerSec);
                                })()
                            },
                            { 
                                name: "Swap Out Rate", 
                                data: (() => {
                                    const sampled = sampleLast60Seconds(sampledSwapTrendHistory);
                                    return sampled.map(item => item.swapOutPerSec);
                                })()
                            }
                        ]}
                        categories={(() => {
                            const sampled = sampleLast60Seconds(sampledSwapTrendHistory);
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
                3번째 행: 1시간 차트 2개
                ======================================== */}
            <ChartGridLayout>
                {/* 차트 2: Buffer Cache Hit Ratio (15분) */}
                <WidgetCard title="버퍼 캐시 히트율 (최근 15분)" span={4}>
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
                                        y: memoryData?.bufferCacheChart1h?.warningThreshold || 85,
                                        borderColor: "#FBBF24",
                                        strokeDashArray: 4,
                                        label: {
                                            text: `주의: ${memoryData?.bufferCacheChart1h?.warningThreshold || 85}%`,
                                            style: { color: "#fff", background: "#FBBF24", fontSize: "11px" }
                                        }
                                    }
                                ]
                            }
                        }}
                    />
                </WidgetCard>
                {/* 차트 4: Temp File Generation (15분) */}
                {/* 차트 4: Temp File Generation (15분) */}
                <WidgetCard title="임시 파일 생성 (최근 15분)" span={4}>
                    {(() => {
                        // 데이터 존재 여부 확인
                        const tempFileCount = memoryData?.tempFileChart6h?.tempFileCount || [];
                        const tempFileSizeMB = memoryData?.tempFileChart6h?.tempFileSizeMB || [];
                        const hasData = tempFileCount.some(val => val > 0) || tempFileSizeMB.some(val => val > 0);

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
                                        현재 임시 파일 생성이 발생하지 않고 있습니다
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#9CA3AF' }}>
                                        work_mem 설정이 충분하여 디스크 임시 파일이 생성되지 않고 있습니다
                                    </div>
                                </div>
                            );
                        }

                        // 시간 형식을 HH:MM으로 변환 (초 제거)
                        const formattedCategories = (memoryData?.tempFileChart6h?.categories || []).map(time => {
                            // "HH:MM:SS" 형식이면 "HH:MM"으로 변환
                            if (time && time.includes(':')) {
                                return time.substring(0, 5); // "HH:MM"만 추출
                            }
                            return time;
                        });

                        // 데이터가 있는 경우 차트 표시
                        return (
                            <Chart
                                type="line"
                                series={[
                                    { name: "File Count", data: tempFileCount },
                                    { name: "Size (MB)", data: tempFileSizeMB }
                                ]}
                                categories={formattedCategories}
                                height={250}
                                colors={["#8B5CF6", "#EC4899"]}
                                showGrid={true}
                                showLegend={true}
                                xaxisOptions={{
                                    title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                                    labels: {
                                        rotate: 0,
                                        style: { fontSize: "11px", colors: "#6B7280" },
                                    },
                                }}
                                yaxisOptions={{
                                    title: { text: "Count / MB", style: { fontSize: "12px", color: "#6B7280" } },
                                    labels: {
                                        formatter: (val: number) => {
                                            // File Count는 정수, Size (MB)는 소수점 1자리로 표시
                                            return val % 1 === 0 ? val.toString() : val.toFixed(1);
                                        }
                                    },
                                }}
                                tooltipFormatter={(value: number) => {
                                    // 툴팁에서는 File Count는 정수, Size (MB)는 소수점 2자리
                                    return value % 1 === 0 ? value.toString() : value.toFixed(2);
                                }}
                                customOptions={{
                                    xaxis: {
                                        tickAmount: 6, // X축에 6개의 시간만 표시
                                        labels: {
                                            showDuplicates: false, // 중복 라벨 제거
                                            rotate: 0,
                                            style: {
                                                fontSize: "11px",
                                                colors: "#6B7280"
                                            }
                                        }
                                    }
                                }}
                            />
                        );
                    })()}
                </WidgetCard>

                {/* 차트 5: I/O Wait Time (15분) */}
                <WidgetCard title="I/O 대기 시간 (최근 15분)" span={4}>
                    {(() => {
                        // 데이터 존재 여부 확인
                        const readWaitMs = memoryData?.ioWaitTimeChart6h?.readWaitMs || [];
                        const writeWaitMs = memoryData?.ioWaitTimeChart6h?.writeWaitMs || [];
                        const hasData = readWaitMs.some(val => val > 0) || writeWaitMs.some(val => val > 0);

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
                                        현재 I/O 대기시간이 발생하지 않고 있습니다
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#9CA3AF' }}>
                                        모든 데이터가 메모리 캐시에 있어 디스크 I/O가 최소화되고 있습니다
                                    </div>
                                </div>
                            );
                        }

                        // 데이터가 있는 경우 차트 표시
                        return (
                            <Chart
                                type="line"
                                series={[
                                    { name: "Read Wait (ms)", data: readWaitMs },
                                    { name: "Write Wait (ms)", data: writeWaitMs }
                                ]}
                                categories={memoryData?.ioWaitTimeChart6h?.categories || []}
                                height={250}
                                colors={["#3B82F6", "#F59E0B"]}
                                showGrid={true}
                                showLegend={true}
                                xaxisOptions={{
                                    title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                                    labels: {
                                        rotate: 0,
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
                                        tickAmount: 6,
                                        labels: {
                                            showDuplicates: false,
                                            rotate: 0,
                                            style: {
                                                fontSize: "11px",
                                                colors: "#6B7280"
                                            }
                                        }
                                    }
                                }}
                            />
                        );
                    })()}
                </WidgetCard>
            </ChartGridLayout>

        </div>
    );
}