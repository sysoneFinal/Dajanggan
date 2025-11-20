import { createContext, useContext, useEffect, useCallback, useState } from "react";
import { useInstanceContext } from "./InstanceContext";
import { useQueryClient, useQuery } from "@tanstack/react-query";

// SSE 실시간 메트릭 데이터 타입
export interface RealtimeOsMetrics {
    instanceId: number;
    cpu: number | null;
    memory: number | null;
    memoryTotalGB: number | null; // 메모리 총량 (GB)
    memoryUsedGB: number | null; // 메모리 사용량 (GB)
    memoryAvailableGB: number | null; // 메모리 사용 가능량 (GB)
    memoryCacheGB: number | null; // 메모리 캐시 (GB)
    diskUsage: number | null;
    diskTotalGB: number | null; // 디스크 총량 (GB)
    diskUsedGB: number | null; // 디스크 사용량 (GB)
    diskAvailableGB: number | null; // 디스크 사용 가능량 (GB)
    diskRead: number | null;
    diskWrite: number | null;
    loadAverage: number[] | null; // [1m, 5m, 15m]
    swapUsage: number | null; // Swap 사용률 (%)
    swapTotalGB: number | null; // Swap 총량 (GB)
    swapUsedGB: number | null; // Swap 사용량 (GB)
    swapInPerSec: number | null; // Swap In Rate
    swapOutPerSec: number | null; // Swap Out Rate
    collectedAt: string;
}

// 히스토리 데이터 타입 정의
export interface CpuHistoryItem {
    time: string;
    value: number;
}

export interface LoadAverageHistoryItem {
    time: string;
    load1m: number;
    load5m: number;
    load15m: number;
}

export interface MemoryHistoryItem {
    time: string;
    usedGB: number;
}

export interface MemoryTrendHistoryItem {
    time: string;
    usagePercent: number;
}

export interface SwapTrendHistoryItem {
    time: string;
    swapUsagePercent: number;
    swapInPerSec: number;
    swapOutPerSec: number;
}

export interface DiskIoHistoryItem {
    time: string;
    readMBps: number;
    writeMBps: number;
}

export interface DiskUsageHistoryItem {
    time: string;
    usagePercent: number;
}

// 구독 콜백 타입
type MetricsCallback = (metrics: RealtimeOsMetrics) => void;

// Context 타입
interface OsMetricSseContextType {
    // 현재 인스턴스의 실시간 메트릭 데이터
    metrics: RealtimeOsMetrics | null;
    // 구독 등록 (컴포넌트가 메트릭 업데이트를 받을 수 있도록)
    subscribe: (callback: MetricsCallback) => () => void;
    // 연결 상태
    isConnected: boolean;
}

const OsMetricSseContext = createContext<OsMetricSseContextType | undefined>(undefined);

// 전역 SSE 연결 관리
class SseConnectionManager {
    private connections: Map<number, EventSource> = new Map();
    private subscribers: Map<number, Set<MetricsCallback>> = new Map();
    private latestMetrics: Map<number, RealtimeOsMetrics> = new Map();
    private connectionStates: Map<number, boolean> = new Map();
    private reconnectTimers: Map<number, number> = new Map();
    private lastActivity: Map<number, number> = new Map();
    private queryClient: any = null; // QueryClient 참조
    
    private readonly RECONNECT_DELAY = 3000; // 3초
    private readonly CLEANUP_INTERVAL = 60000; // 1분
    private readonly INACTIVE_TIMEOUT = 5 * 60 * 1000; // 5분

    constructor() {
        // 주기적으로 사용하지 않는 연결 정리
        setInterval(() => {
            this.cleanupInactiveConnections();
        }, this.CLEANUP_INTERVAL);
    }

    /**
     * QueryClient 설정 (SSE 데이터를 캐시에 저장하기 위해)
     */
    setQueryClient(queryClient: any): void {
        this.queryClient = queryClient;
    }

    /**
     * TanStack Query 캐시에 히스토리 데이터 업데이트
     * notifyOnChangeProps: 'tracked'로 불필요한 리렌더링 방지
     */
    private updateHistoryCache(instanceId: number, metrics: RealtimeOsMetrics): void {
        if (!this.queryClient) return;

        const now = new Date();
        const realtimeTimeLabel = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

        // CPU 히스토리 업데이트 (최대 60개, 5분간)
        if (metrics.cpu !== null) {
            const cpuQueryKey = ["realtimeCpuHistory", instanceId];
            const currentCpuHistory = (this.queryClient.getQueryData(cpuQueryKey) as CpuHistoryItem[]) || [];
            const newCpuHistory = [...currentCpuHistory, { time: realtimeTimeLabel, value: metrics.cpu }].slice(-60);
            this.queryClient.setQueryData(cpuQueryKey, newCpuHistory);
        }

        // Load Average 히스토리 업데이트
        if (metrics.loadAverage && metrics.loadAverage.length >= 3) {
            const loadAvgQueryKey = ["realtimeLoadAverageHistory", instanceId];
            const currentLoadAvgHistory = (this.queryClient.getQueryData(loadAvgQueryKey) as LoadAverageHistoryItem[]) || [];
            const newLoadAvgHistory = [...currentLoadAvgHistory, {
                time: realtimeTimeLabel,
                load1m: metrics.loadAverage[0],
                load5m: metrics.loadAverage[1],
                load15m: metrics.loadAverage[2],
            }].slice(-60);
            this.queryClient.setQueryData(loadAvgQueryKey, newLoadAvgHistory);
        }

        // Memory 히스토리 업데이트
        if (metrics.memoryUsedGB !== null) {
            const memoryQueryKey = ["realtimeMemoryHistory", instanceId];
            const currentMemoryHistory = (this.queryClient.getQueryData(memoryQueryKey) as MemoryHistoryItem[]) || [];
            const newMemoryHistory = [...currentMemoryHistory, { time: realtimeTimeLabel, usedGB: metrics.memoryUsedGB }].slice(-60);
            this.queryClient.setQueryData(memoryQueryKey, newMemoryHistory);
        }

        // Memory Trend 히스토리 업데이트
        if (metrics.memory !== null) {
            const memoryTrendQueryKey = ["realtimeMemoryTrendHistory", instanceId];
            const currentMemoryTrendHistory = (this.queryClient.getQueryData(memoryTrendQueryKey) as MemoryTrendHistoryItem[]) || [];
            const newMemoryTrendHistory = [...currentMemoryTrendHistory, { time: realtimeTimeLabel, usagePercent: metrics.memory }].slice(-60);
            this.queryClient.setQueryData(memoryTrendQueryKey, newMemoryTrendHistory);
        }

        // Swap Trend 히스토리 업데이트
        if (metrics.swapUsage !== null) {
            const swapTrendQueryKey = ["realtimeSwapTrendHistory", instanceId];
            const currentSwapTrendHistory = (this.queryClient.getQueryData(swapTrendQueryKey) as SwapTrendHistoryItem[]) || [];
            const newSwapTrendHistory = [...currentSwapTrendHistory, {
                time: realtimeTimeLabel,
                swapUsagePercent: metrics.swapUsage,
                swapInPerSec: metrics.swapInPerSec || 0,
                swapOutPerSec: metrics.swapOutPerSec || 0,
            }].slice(-60);
            this.queryClient.setQueryData(swapTrendQueryKey, newSwapTrendHistory);
        }

        // Disk I/O 히스토리 업데이트
        if (metrics.diskRead !== null && metrics.diskWrite !== null) {
            const diskIoQueryKey = ["realtimeDiskIoHistory", instanceId];
            const currentDiskIoHistory = (this.queryClient.getQueryData(diskIoQueryKey) as DiskIoHistoryItem[]) || [];
            const newDiskIoHistory = [...currentDiskIoHistory, {
                time: realtimeTimeLabel,
                readMBps: metrics.diskRead,
                writeMBps: metrics.diskWrite,
            }].slice(-60);
            this.queryClient.setQueryData(diskIoQueryKey, newDiskIoHistory);
        }

        // Disk Usage 히스토리 업데이트
        if (metrics.diskUsage !== null) {
            const diskUsageQueryKey = ["realtimeDiskUsageHistory", instanceId];
            const currentDiskUsageHistory = (this.queryClient.getQueryData(diskUsageQueryKey) as DiskUsageHistoryItem[]) || [];
            const newDiskUsageHistory = [...currentDiskUsageHistory, { time: realtimeTimeLabel, usagePercent: metrics.diskUsage }].slice(-60);
            this.queryClient.setQueryData(diskUsageQueryKey, newDiskUsageHistory);
        }
    }

    /**
     * SSE 연결 생성 또는 기존 연결 반환
     */
    connect(instanceId: number): EventSource {
        // 이미 연결이 있으면 재사용
        if (this.connections.has(instanceId)) {
            const existing = this.connections.get(instanceId)!;
            if (existing.readyState === EventSource.OPEN) {
                this.updateActivity(instanceId);
                return existing;
            } else {
                // 연결이 끊어진 상태면 제거하고 새로 생성
                this.disconnect(instanceId);
            }
        }

        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
        const eventSource = new EventSource(`${apiBaseUrl}/osmetric/stream/${instanceId}`);

        this.connections.set(instanceId, eventSource);
        this.connectionStates.set(instanceId, false);
        this.updateActivity(instanceId);

        // 연결 성공 이벤트
        eventSource.addEventListener("connected", () => {
            console.log(`[SSE] 연결 성공: instanceId=${instanceId}`);
            this.connectionStates.set(instanceId, true);
            this.clearReconnectTimer(instanceId);
        });

        // 메트릭 데이터 수신
        eventSource.addEventListener("metrics", (event) => {
            try {
                const data = JSON.parse(event.data);
                const metrics: RealtimeOsMetrics = {
                    instanceId: data.instanceId || instanceId,
                    cpu: data.cpu ?? null,
                    memory: data.memory ?? null,
                    memoryTotalGB: data.memoryTotalGB ?? null,
                    memoryUsedGB: data.memoryUsedGB ?? null,
                    memoryAvailableGB: data.memoryAvailableGB ?? null,
                    memoryCacheGB: data.memoryCacheGB ?? null,
                    diskUsage: data.diskUsage ?? null,
                    diskTotalGB: data.diskTotalGB ?? null,
                    diskUsedGB: data.diskUsedGB ?? null,
                    diskAvailableGB: data.diskAvailableGB ?? null,
                    diskRead: data.diskRead ?? null,
                    diskWrite: data.diskWrite ?? null,
                    loadAverage: data.loadAverage ?? null,
                    swapUsage: data.swapUsage ?? null,
                    swapTotalGB: data.swapTotalGB ?? null,
                    swapUsedGB: data.swapUsedGB ?? null,
                    swapInPerSec: data.swapInPerSec ?? null,
                    swapOutPerSec: data.swapOutPerSec ?? null,
                    collectedAt: data.collectedAt || new Date().toISOString(),
                };

                // 최신 데이터 저장
                this.latestMetrics.set(instanceId, metrics);
                this.updateActivity(instanceId);

                // TanStack Query 캐시에 히스토리 업데이트
                this.updateHistoryCache(instanceId, metrics);

                // 모든 구독자에게 알림
                const callbacks = this.subscribers.get(instanceId);
                if (callbacks) {
                    callbacks.forEach((callback) => {
                        try {
                            callback(metrics);
                        } catch (error) {
                            console.error("[SSE] 구독자 콜백 실행 오류:", error);
                        }
                    });
                }
            } catch (error) {
                console.error(`[SSE] 데이터 파싱 오류 (instanceId=${instanceId}):`, error);
            }
        });

        // 에러 처리 및 자동 재연결
        eventSource.onerror = (error) => {
            console.error(`[SSE] 연결 오류 (instanceId=${instanceId}):`, error);
            this.connectionStates.set(instanceId, false);

            // 연결이 끊어진 경우 자동 재연결 시도
            if (eventSource.readyState === EventSource.CLOSED) {
                this.scheduleReconnect(instanceId);
            }
        };

        return eventSource;
    }

    /**
     * 구독 등록
     */
    subscribe(instanceId: number, callback: MetricsCallback): () => void {
        if (!this.subscribers.has(instanceId)) {
            this.subscribers.set(instanceId, new Set());
        }

        this.subscribers.get(instanceId)!.add(callback);

        // 연결이 없으면 생성
        if (!this.connections.has(instanceId)) {
            this.connect(instanceId);
        }

        // 최신 데이터가 있으면 즉시 전달
        const latest = this.latestMetrics.get(instanceId);
        if (latest) {
            try {
                callback(latest);
            } catch (error) {
                console.error("[SSE] 초기 데이터 전달 오류:", error);
            }
        }

        // 구독 해제 함수 반환
        return () => {
            const callbacks = this.subscribers.get(instanceId);
            if (callbacks) {
                callbacks.delete(callback);
                
                // 구독자가 없으면 연결 정리 고려
                if (callbacks.size === 0) {
                    // 즉시 정리하지 않고 일정 시간 후 정리 (빠른 페이지 이동 대비)
                    setTimeout(() => {
                        const stillNoSubscribers = !this.subscribers.get(instanceId) || 
                                                  this.subscribers.get(instanceId)!.size === 0;
                        if (stillNoSubscribers) {
                            this.disconnect(instanceId);
                        }
                    }, 10000); // 10초 후 정리
                }
            }
        };
    }

    /**
     * 연결 해제
     */
    disconnect(instanceId: number): void {
        const eventSource = this.connections.get(instanceId);
        if (eventSource) {
            eventSource.close();
            this.connections.delete(instanceId);
            this.connectionStates.delete(instanceId);
            this.clearReconnectTimer(instanceId);
            console.log(`[SSE] 연결 해제: instanceId=${instanceId}`);
        }
    }

    /**
     * 재연결 스케줄링
     */
    private scheduleReconnect(instanceId: number): void {
        // 이미 재연결 타이머가 있으면 취소
        this.clearReconnectTimer(instanceId);

        const timer = setTimeout(() => {
            console.log(`[SSE] 재연결 시도: instanceId=${instanceId}`);
            this.disconnect(instanceId);
            
            // 구독자가 있으면 재연결
            const callbacks = this.subscribers.get(instanceId);
            if (callbacks && callbacks.size > 0) {
                this.connect(instanceId);
            }
        }, this.RECONNECT_DELAY);

        this.reconnectTimers.set(instanceId, timer);
    }

    /**
     * 재연결 타이머 취소
     */
    private clearReconnectTimer(instanceId: number): void {
        const timer = this.reconnectTimers.get(instanceId);
        if (timer) {
            clearTimeout(timer);
            this.reconnectTimers.delete(instanceId);
        }
    }

    /**
     * 활동 시간 업데이트
     */
    private updateActivity(instanceId: number): void {
        this.lastActivity.set(instanceId, Date.now());
    }

    /**
     * 사용하지 않는 연결 정리
     */
    private cleanupInactiveConnections(): void {
        const now = Date.now();
        
        for (const [instanceId, lastActive] of this.lastActivity.entries()) {
            const inactiveTime = now - lastActive;
            const subscribers = this.subscribers.get(instanceId);
            const hasSubscribers = subscribers ? subscribers.size > 0 : false;

            // 구독자가 없고 5분 이상 비활성 상태면 정리
            if (!hasSubscribers && inactiveTime > this.INACTIVE_TIMEOUT) {
                console.log(`[SSE] 비활성 연결 정리: instanceId=${instanceId}`);
                this.disconnect(instanceId);
                this.latestMetrics.delete(instanceId);
                this.lastActivity.delete(instanceId);
            }
        }
    }

    /**
     * 연결 상태 조회
     */
    isConnected(instanceId: number): boolean {
        return this.connectionStates.get(instanceId) ?? false;
    }

    /**
     * 최신 메트릭 조회
     */
    getLatestMetrics(instanceId: number): RealtimeOsMetrics | null {
        return this.latestMetrics.get(instanceId) ?? null;
    }

    /**
     * 모든 연결 정리 (앱 종료 시)
     */
    disconnectAll(): void {
        for (const instanceId of this.connections.keys()) {
            this.disconnect(instanceId);
        }
        this.subscribers.clear();
        this.latestMetrics.clear();
        this.connectionStates.clear();
        this.lastActivity.clear();
    }
}

// 전역 인스턴스
const sseManager = new SseConnectionManager();

// Provider 컴포넌트
export const OsMetricSseProvider = ({ children }: { children: React.ReactNode }) => {
    const { selectedInstance } = useInstanceContext();
    const queryClient = useQueryClient();
    const [metrics, setMetrics] = useState<RealtimeOsMetrics | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    // QueryClient를 SSE Manager에 설정
    useEffect(() => {
        sseManager.setQueryClient(queryClient);
    }, [queryClient]);

    // 인스턴스 변경 시 연결 관리
    useEffect(() => {
        if (!selectedInstance) {
            setMetrics(null);
            setIsConnected(false);
            return;
        }

        const instanceId = selectedInstance.instanceId;

        // 구독 콜백
        const callback: MetricsCallback = (newMetrics: RealtimeOsMetrics) => {
            setMetrics(newMetrics);
        };

        // 구독 등록
        const unsubscribe = sseManager.subscribe(instanceId, callback);

        // 연결 상태 확인
        const checkConnection = () => {
            setIsConnected(sseManager.isConnected(instanceId));
        };
        
        // 초기 연결 상태 확인
        checkConnection();
        
        // 주기적으로 연결 상태 확인 (1초마다)
        const interval = setInterval(checkConnection, 1000);

        // 컴포넌트 언마운트 시 구독 해제
        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    }, [selectedInstance?.instanceId]);

    // 앱 종료 시 모든 연결 정리
    useEffect(() => {
        return () => {
            sseManager.disconnectAll();
        };
    }, []);

    // 구독 함수
    const subscribe = useCallback((callback: MetricsCallback) => {
        if (!selectedInstance) {
            return () => {}; // 빈 해제 함수
        }
        return sseManager.subscribe(selectedInstance.instanceId, callback);
    }, [selectedInstance?.instanceId]);

    const value: OsMetricSseContextType = {
        metrics,
        subscribe,
        isConnected,
    };

    return (
        <OsMetricSseContext.Provider value={value}>
            {children}
        </OsMetricSseContext.Provider>
    );
};

// Hook
export const useOsMetricSse = () => {
    const context = useContext(OsMetricSseContext);
    if (!context) {
        throw new Error("useOsMetricSse must be used within OsMetricSseProvider");
    }
    return context;
};

// TanStack Query로 히스토리 데이터를 읽는 Hook들 (성능 최적화 적용)
export const useRealtimeCpuHistory = (instanceId: number | undefined) => {
    const { data = [] } = useQuery<CpuHistoryItem[]>({
        queryKey: ["realtimeCpuHistory", instanceId],
        queryFn: () => [],
        enabled: !!instanceId,
        staleTime: Infinity, // SSE로 업데이트되므로 staleTime 무한대
        gcTime: 10 * 60 * 1000, // 10분간 캐시 유지
        notifyOnChangeProps: ['data'], // data만 변경 시에만 리렌더링하여 불필요한 리렌더링 방지
        structuralSharing: false, // 배열의 경우 구조적 공유 비활성화로 성능 개선
    });
    return data;
};

export const useRealtimeLoadAverageHistory = (instanceId: number | undefined) => {
    const { data = [] } = useQuery<LoadAverageHistoryItem[]>({
        queryKey: ["realtimeLoadAverageHistory", instanceId],
        queryFn: () => [],
        enabled: !!instanceId,
        staleTime: Infinity,
        gcTime: 10 * 60 * 1000,
        notifyOnChangeProps: ['data'], // data만 변경 시에만 리렌더링
        structuralSharing: false, // 배열의 경우 구조적 공유 비활성화
    });
    return data;
};

export const useRealtimeMemoryHistory = (instanceId: number | undefined) => {
    const { data = [] } = useQuery<MemoryHistoryItem[]>({
        queryKey: ["realtimeMemoryHistory", instanceId],
        queryFn: () => [],
        enabled: !!instanceId,
        staleTime: Infinity,
        gcTime: 10 * 60 * 1000,
        notifyOnChangeProps: ['data'], // data만 변경 시에만 리렌더링
        structuralSharing: false, // 배열의 경우 구조적 공유 비활성화
    });
    return data;
};

export const useRealtimeMemoryTrendHistory = (instanceId: number | undefined) => {
    const { data = [] } = useQuery<MemoryTrendHistoryItem[]>({
        queryKey: ["realtimeMemoryTrendHistory", instanceId],
        queryFn: () => [],
        enabled: !!instanceId,
        staleTime: Infinity,
        gcTime: 10 * 60 * 1000,
        notifyOnChangeProps: ['data'], // data만 변경 시에만 리렌더링
        structuralSharing: false, // 배열의 경우 구조적 공유 비활성화
    });
    return data;
};

export const useRealtimeSwapTrendHistory = (instanceId: number | undefined) => {
    const { data = [] } = useQuery<SwapTrendHistoryItem[]>({
        queryKey: ["realtimeSwapTrendHistory", instanceId],
        queryFn: () => [],
        enabled: !!instanceId,
        staleTime: Infinity,
        gcTime: 10 * 60 * 1000,
        notifyOnChangeProps: ['data'], // data만 변경 시에만 리렌더링
        structuralSharing: false, // 배열의 경우 구조적 공유 비활성화
    });
    return data;
};

export const useRealtimeDiskIoHistory = (instanceId: number | undefined) => {
    const { data = [] } = useQuery<DiskIoHistoryItem[]>({
        queryKey: ["realtimeDiskIoHistory", instanceId],
        queryFn: () => [],
        enabled: !!instanceId,
        staleTime: Infinity,
        gcTime: 10 * 60 * 1000,
        notifyOnChangeProps: ['data'], // data만 변경 시에만 리렌더링
        structuralSharing: false, // 배열의 경우 구조적 공유 비활성화
    });
    return data;
};

export const useRealtimeDiskUsageHistory = (instanceId: number | undefined) => {
    const { data = [] } = useQuery<DiskUsageHistoryItem[]>({
        queryKey: ["realtimeDiskUsageHistory", instanceId],
        queryFn: () => [],
        enabled: !!instanceId,
        staleTime: Infinity,
        gcTime: 10 * 60 * 1000,
        notifyOnChangeProps: ['data'], // data만 변경 시에만 리렌더링
        structuralSharing: false, // 배열의 경우 구조적 공유 비활성화
    });
    return data;
};
