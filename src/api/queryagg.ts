import apiClient from './apiClient';
import type { AxiosResponse } from 'axios';

/**
 * Query Aggregation API 클라이언트
 * - 1분/5분 집계 데이터 조회
 * 
 * @author 이해든
 */

/* ---------- 타입 정의 ---------- */

export interface QuerySummaryDto {
  instanceId: number;
  databaseId: number;
  totalQueries: number;
  avgExecutionTimeMs: number;
  slowQueryCount: number;
  currentTps: number;
  currentQps: number;
  activeSessions: number;
  selectCount: number;
  insertCount: number;
  updateCount: number;
  deleteCount: number;
  currentCpuUsagePercent?: number;
  currentMemoryUsagePercent?: number;
  currentDiskIoUsagePercent?: number;
  createdAt: string;
  timeRange: string;
}

export interface TrendDataPoint {
  collectedAt: string;
  tps: number;
  qps: number;
  avgExecutionTimeMs: number;
}

export interface QueryOverviewTrendDto {
  instanceId: number;
  databaseId: number;
  trendData: TrendDataPoint[];
  totalDataPoints: number;
  avgTps: number;
  avgQps: number;
  avgExecutionTimeMs: number;
}

/**
 * 🆕 Top Query DTO (리소스별)
 */
export interface QueryAgg1mDto {
  instanceId: number;
  databaseId: number;
  collectedAt: string;
  totalQueries: number;
  selectQueries: number;
  insertQueries: number;
  updateQueries: number;
  deleteQueries: number;
  otherQueries: number;
  avgExecutionTimeMs: number;
  maxExecutionTimeMs: number;
  avgPlanningTimeMs: number;
  totalIoBlocks: number;
  avgIoBlocks: number;
  slowQueryCount: number;
  avgCpuUsagePercent?: number;
  avgMemoryUsageMb?: number;
  maxCpuUsagePercent?: number;
  maxMemoryUsageMb?: number;
  createdAt: string;
  queryMetricId?: number;
  queryText?: string;
  shortQuery?: string;
  queryType?: string;
  executionCount?: number;
}

// 🆕 5분 집계 타입
export interface TopSlowQueryDto {
  instanceId: number;
  databaseId: number;
  topSlowQuery1?: string;
  topSlowQuery1Time?: number;
  topSlowQuery2?: string;
  topSlowQuery2Time?: number;
  topSlowQuery3?: string;
  topSlowQuery3Time?: number;
  topSlowQuery4?: string;
  topSlowQuery4Time?: number;
  topSlowQuery5?: string;
  topSlowQuery5Time?: number;
  createdAt?: string;
}

export interface SlowQueryListDto {
  queryMetricId: number;
  collectedAt: string;
  queryText: string;
  shortQuery: string;
  executionTimeMs: number;
  username: string;
  queryType: string;
  cpuUsagePercent?: number;
  memoryUsageMb?: number;
  ioBlocks?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

/* ---------- API 함수들 ---------- */

/**
 * 1분 집계 헬스 체크
 * GET /api/query-agg-1m/health
 */
export const checkAggHealth = async (): Promise<AxiosResponse<{
  status: string;
  message: string;
  timestamp: number;
}>> => {
  return apiClient.get('/query-agg-1m/health');
};

/**
 * 요약 데이터 조회 (최근 5분 집계)
 * GET /api/query-agg-1m/summary
 */
export const getQuerySummary = async (
  instanceId: number,
  databaseId: number
): Promise<AxiosResponse<ApiResponse<QuerySummaryDto>>> => {
  return apiClient.get('/query-agg-1m/summary', {
    params: { instanceId, databaseId }
  });
};

/**
 * 트렌드 데이터 조회 (최근 N시간)
 * GET /api/query-agg-1m/trend
 */
export const getQueryTrend = async (
  instanceId: number,
  databaseId: number,
  hours: number = 12
): Promise<AxiosResponse<ApiResponse<QueryOverviewTrendDto>>> => {
  return apiClient.get('/query-agg-1m/trend', {
    params: { instanceId, databaseId, hours }
  });
};

/**
 * 🆕 Top Query 조회 (리소스별)
 * GET /api/query-agg-1m/top-queries
 * 
 * @param instanceId - 인스턴스 ID
 * @param databaseId - 데이터베이스 ID
 * @param orderBy - 정렬 기준 ('cpu' | 'memory' | 'io' | 'execution_time')
 * @param limit - 조회 개수 (기본 5개)
 */
export const getTopQueries = async (
  instanceId: number,
  databaseId: number,
  orderBy: 'cpu' | 'memory' | 'io' | 'execution_time',
  limit: number = 5
): Promise<AxiosResponse<ApiResponse<QueryAgg1mDto[]>>> => {
  return apiClient.get('/query-agg-1m/top-queries', {
    params: { instanceId, databaseId, orderBy, limit }
  });
};

/**
 * CPU 사용량 기준 Top Query 조회
 */
export const getTopQueriesByCpu = async (
  instanceId: number,
  databaseId: number,
  limit: number = 5
): Promise<AxiosResponse<ApiResponse<QueryAgg1mDto[]>>> => {
  return getTopQueries(instanceId, databaseId, 'cpu', limit);
};

/**
 * 메모리 사용량 기준 Top Query 조회
 */
export const getTopQueriesByMemory = async (
  instanceId: number,
  databaseId: number,
  limit: number = 5
): Promise<AxiosResponse<ApiResponse<QueryAgg1mDto[]>>> => {
  return getTopQueries(instanceId, databaseId, 'memory', limit);
};

/**
 * I/O 사용량 기준 Top Query 조회
 */
export const getTopQueriesByIo = async (
  instanceId: number,
  databaseId: number,
  limit: number = 5
): Promise<AxiosResponse<ApiResponse<QueryAgg1mDto[]>>> => {
  return getTopQueries(instanceId, databaseId, 'io', limit);
};

/**
 * 실행시간 기준 Top Query 조회
 */
export const getTopQueriesByExecutionTime = async (
  instanceId: number,
  databaseId: number,
  limit: number = 5
): Promise<AxiosResponse<ApiResponse<QueryAgg1mDto[]>>> => {
  return getTopQueries(instanceId, databaseId, 'execution_time', limit);
};

/* ---------- 🆕 5분 집계 API ---------- */

/**
 * 5분 집계 헬스 체크
 * GET /api/query-agg-5m/health
 */
export const checkAgg5mHealth = async (): Promise<AxiosResponse<{
  status: string;
  message: string;
}>> => {
  return apiClient.get('/query-agg-5m/health');
};

/**
 * Top 슬로우 쿼리 조회 (Top 5)
 * GET /api/query-agg-5m/top-slow
 */
export const getTopSlowQueries = async (
  instanceId: number,
  databaseId: number
): Promise<AxiosResponse<ApiResponse<TopSlowQueryDto>>> => {
  return apiClient.get('/query-agg-5m/top-slow', {
    params: { instanceId, databaseId }
  });
};

/**
 * 슬로우 쿼리 리스트 조회
 * GET /api/query-agg-5m/slow-list
 */
export const getSlowQueryList = async (
  instanceId: number,
  databaseId: number,
  limit: number = 20
): Promise<AxiosResponse<ApiResponse<SlowQueryListDto[]>>> => {
  return apiClient.get('/query-agg-5m/slow-list', {
    params: { instanceId, databaseId, limit }
  });
};