import apiClient from './apiClient';
import type { AxiosResponse } from 'axios';

/**
 * Query Metrics API 클라이언트
 * - 쿼리 메트릭스 관련 API 호출 함수들
 * 
 * @author 이해든
 */

/* ---------- 타입 정의 ---------- */
export interface QueryMetricsRawDto {
  queryMetricId: number;
  databaseId: number;
  collectedAt: string;
  queryId: string;
  queryHash: string;
  queryText: string;
  shortQuery: string;
  queryType: string;
  executionCount: number;
  ioBlocks: number;
  explainPlan: string;
  planningTimeMs: number;
  executionTimeMs: number;
  cpuUsagePercent: number;
  memoryUsageMb: number;
  username: string;
  applicationName: string;
  clientAddr: string;
  state: string;
  createdAt: string;
  cpuRank: number | null;
  memoryRank: number | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  count?: number;
  totalCount?: number;
  thresholdMs?: number;
  limit?: number;
}

/* ---------- API 함수들 ---------- */

/**
 * 헬스 체크
 * GET /query-metrics/health
 */
export const checkHealth = async (): Promise<AxiosResponse<{
  status: string;
  message: string;
  timestamp: number;
}>> => {
  return apiClient.get('/query-metrics/health');
};

/**
 * 전체 쿼리 메트릭스 조회
 * GET /query-metrics
 */
export const getAllQueryMetrics = async (): Promise<AxiosResponse<ApiResponse<QueryMetricsRawDto[]>>> => {
  return apiClient.get('/query-metrics');
};

/**
 * ID로 쿼리 메트릭스 상세 조회
 * GET /query-metrics/{queryMetricId}
 */
export const getQueryMetricById = async (queryMetricId: number): Promise<AxiosResponse<ApiResponse<QueryMetricsRawDto>>> => {
  return apiClient.get(`/query-metrics/${queryMetricId}`);
};

/**
 * 데이터베이스별 쿼리 메트릭스 조회
 * GET /query-metrics/database/{databaseId}
 */
export const getQueryMetricsByDatabaseId = async (databaseId: number): Promise<AxiosResponse<ApiResponse<QueryMetricsRawDto[]>>> => {
  return apiClient.get(`/query-metrics/database/${databaseId}`);
};

/**
 * 쿼리 타입별 조회
 * GET /query-metrics/type/{queryType}
 */
export const getQueryMetricsByType = async (queryType: string): Promise<AxiosResponse<ApiResponse<QueryMetricsRawDto[]>>> => {
  return apiClient.get(`/query-metrics/type/${queryType}`);
};

/**
 * 슬로우 쿼리 조회
 * GET /query-metrics/slow?thresholdMs={thresholdMs}
 */
export const getSlowQueries = async (thresholdMs: number = 1000): Promise<AxiosResponse<ApiResponse<QueryMetricsRawDto[]>>> => {
  return apiClient.get('/query-metrics/slow', {
    params: { thresholdMs }
  });
};

/**
 * CPU 사용량 상위 N개 조회
 * GET /query-metrics/top/cpu?limit={limit}
 */
export const getTopByCpuUsage = async (limit: number = 10): Promise<AxiosResponse<ApiResponse<QueryMetricsRawDto[]>>> => {
  return apiClient.get('/query-metrics/top/cpu', {
    params: { limit }
  });
};

/**
 * 메모리 사용량 상위 N개 조회
 * GET /query-metrics/top/memory?limit={limit}
 */
export const getTopByMemoryUsage = async (limit: number = 10): Promise<AxiosResponse<ApiResponse<QueryMetricsRawDto[]>>> => {
  return apiClient.get('/query-metrics/top/memory', {
    params: { limit }
  });
};

/**
 * 전체 쿼리 메트릭스 개수 조회
 * GET /query-metrics/count
 */
export const getTotalCount = async (): Promise<AxiosResponse<ApiResponse<number>>> => {
  return apiClient.get('/query-metrics/count');
};

/* ---------- Helper 함수들 ---------- */

/**
 * 실행 시간을 밀리초에서 초로 변환
 */
export const msToSeconds = (ms: number): string => {
  return (ms / 1000).toFixed(1);
};

/**
 * 날짜 포맷팅 (한국어)
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).replace(/\. /g, '/').replace('.', '');
};

/**
 * Severity 계산 (실행 시간 기준)
 */
export const calculateSeverity = (executionTimeMs: number): 'HIGH' | 'MEDIUM' | 'LOW' => {
  if (executionTimeMs > 3000) return 'HIGH';
  if (executionTimeMs > 1500) return 'MEDIUM';
  return 'LOW';
};

/**
 * 쿼리 타입 추출 (query_text에서)
 */
export const extractQueryType = (queryText: string): string => {
  const upperQuery = queryText.trim().toUpperCase();
  if (upperQuery.startsWith('SELECT')) return 'SELECT';
  if (upperQuery.startsWith('INSERT')) return 'INSERT';
  if (upperQuery.startsWith('UPDATE')) return 'UPDATE';
  if (upperQuery.startsWith('DELETE')) return 'DELETE';
  return 'OTHER';
};

/**
 * 쿼리가 데이터 변경 명령인지 확인
 */
export const isModifyingQuery = (queryText: string): boolean => {
  const upperQuery = queryText.trim().toUpperCase();
  return upperQuery.startsWith('UPDATE') || 
         upperQuery.startsWith('INSERT') || 
         upperQuery.startsWith('DELETE');
};