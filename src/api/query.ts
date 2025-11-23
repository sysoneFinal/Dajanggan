import apiClient from './apiClient';
import type { AxiosResponse } from 'axios';
import type { QueryAnalysisRequest, QueryAnalysisResponse, QuerySuggestion } from './suggestion';

/**
 * Query Metrics API 클라이언트
 * - 쿼리 메트릭스 관련 API 호출 함수들
 * 
 * @author 이해든
 */

export const getRecentQueryMetrics = (databaseId: number, minutes: number = 5) => {
  return apiClient.get('/api/query-metrics/recent', {
    params: { databaseId, minutes }
  });
};

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

/**
 * EXPLAIN ANALYZE 요청 DTO
 */
export interface ExplainAnalyzeRequest {
  databaseId: number;
  query: string;
}

/**
 * EXPLAIN ANALYZE 응답 DTO
 */
export interface ExplainAnalyzeResult {
  explainPlan: string;
  executionMode: string;
  executionTimeMs: number | null;
  planningTimeMs: number | null;
  memoryUsageMb?: number | null;      // 메모리 사용량 (MB)
  ioBlocks?: number | null;            // I/O 블록 수
  cpuUsagePercent?: number | null; 
}

/**
 * 🆕 쿼리 실행 통계 DTO
 */
export interface QueryExecutionStatDto {
  queryHash: string;           // 쿼리 고유 ID (MD5)
  shortQuery: string;          // 짧은 쿼리문
  fullQuery: string;           // 전체 쿼리문
  executionCount: number;      // 실행 횟수
  avgTimeMs: number;           // 평균 실행 시간 (ms)
  totalTimeMs: number;         // 총 실행 시간 (ms)
  callCount: number;           // 호출 수
  queryType: string;           // 쿼리 타입
  lastExecutedAt: string;      // 마지막 실행 시간
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

/**
 * 🆕 ExecutionStatus용 쿼리별 집계 통계
 * GET /query-metrics/execution-stats?databaseId={databaseId}&hours={hours}
 */
export const getExecutionStats = async (
  databaseId: number,
  hours: number = 1
): Promise<AxiosResponse<ApiResponse<QueryExecutionStatDto[]>>> => {
  return apiClient.get('/query-metrics/execution-stats', {
    params: { databaseId, hours }
  });
};

/**
 * 🆕 시간대별 쿼리 수 분포 조회
 * GET /api/query-metrics/hourly-distribution?databaseId={databaseId}&hours={hours}
 */
export const getHourlyDistribution = (databaseId: number, hours: number = 5) => {
  return apiClient.get('/query-metrics/hourly-distribution', {
    params: { databaseId, hours }
  });
};

/**
 * EXPLAIN ANALYZE 실행
 * POST /query-metrics/explain-analyze
 */
export const postExplainAnalyze = async (
  databaseId: number, 
  query: string
): Promise<AxiosResponse<ApiResponse<ExplainAnalyzeResult>>> => {
  return apiClient.post('/query-metrics/explain-analyze', {
    databaseId,
    query
  });
};

/* ---------- Helper 함수들 ---------- */

/**
 * 실행 시간을 밀리초에서 초로 변환
 */
export const msToSeconds = (ms: number | string): number => {
  return Number(ms) / 1000;
};

/**
 * 날짜 포맷팅 
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

/* ---------- 집계 API (1분/5분) ---------- */

/**
 * 요약 데이터 조회 (집계 테이블 사용)
 * GET /api/query-agg-1m/summary
 */
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
  timeRange: string;
  createdAt?: string;
}

export const getQuerySummary = async (
  instanceId: number,
  databaseId: number
): Promise<AxiosResponse<ApiResponse<QuerySummaryDto>>> => {
  return apiClient.get(`/query-agg-1m/summary`, {
    params: { instanceId, databaseId }
  });
};

/**
 * 트렌드 데이터 조회 (집계 테이블 사용)
 * GET /api/query-agg-1m/trend
 */
export interface TrendDataPoint {
  timestamp: string;
  tps: number;
  qps: number;
  avgExecutionTimeMs: number;
  totalQueries: number;
  slowQueryCount: number;
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

export const getQueryTrend = async (
  instanceId: number,
  databaseId: number,
  hours: number = 12
): Promise<AxiosResponse<ApiResponse<QueryOverviewTrendDto>>> => {
  return apiClient.get(`/query-agg-1m/trend`, {
    params: { instanceId, databaseId, hours }
  });
};

/* ---------- AI 쿼리 분석 API ---------- */

/**
 * AI 기반 쿼리 분석 실행
 * POST /query-metrics/analyze-with-ai
 * 
 * - EXPLAIN ANALYZE 실행
 * - OpenAI 기반 최적화 제안 생성
 * - query_suggestion 테이블에 저장
 */
export const analyzeQueryWithAI = async (
  databaseId: number,
  query: string
): Promise<AxiosResponse<ApiResponse<QueryAnalysisResponse>>> => {
  return apiClient.post('/query-metrics/analyze-with-ai', {
    databaseId,
    query
  });
};

/**
 * 저장된 제안 조회
 * GET /query-suggestions/recent?databaseId={databaseId}&hours={hours}
 */
export const getRecentSuggestions = async (
  databaseId: number,
  hours: number = 24
): Promise<AxiosResponse<ApiResponse<QuerySuggestion[]>>> => {
  return apiClient.get('/query-suggestions/recent', {
    params: { databaseId, hours }
  });
};

/**
 * 특정 쿼리 해시의 제안 조회
 * GET /query-suggestions/{queryHash}?databaseId={databaseId}
 */
export const getSuggestionsByQueryHash = async (
  queryHash: string,
  databaseId: number
): Promise<AxiosResponse<ApiResponse<QuerySuggestion[]>>> => {
  return apiClient.get(`/query-suggestions/${queryHash}`, {
    params: { databaseId }
  });
};