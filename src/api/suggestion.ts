/**
 * AI 쿼리 제안 관련 타입 정의
 * 
 * @author 이해든
 */

export type SuggestionLevel = "높음" | "경고" | "정보";

/**
 * 쿼리 제안 Entity (백엔드 응답)
 */
export interface QuerySuggestion {
  suggestionId: number;
  databaseId: number;
  queryHash: string;
  hasTuningSuggestion: boolean;
  suggestionLevel: SuggestionLevel;
  suggestionType: string;
  suggestionTitle: string;
  suggestionDescription: string;
  suggestionSql?: string;
  expectedImprovementPercent?: number;
  queriesPerTransaction?: number;
  transactionId?: number;
  createdAt: string;
  
  // AI 캐싱 관련 필드
  aiModel?: string;           // 사용된 AI 모델 (예: gpt-4)
  tokenUsed?: number;         // 사용된 토큰 수
  isFromCache?: boolean;      // 캐시에서 가져온 제안인지 여부
}

/**
 * AI 분석 요청
 */
export interface QueryAnalysisRequest {
  databaseId: number;
  query: string;
}

/**
 * AI 분석 응답
 */
export interface QueryAnalysisResponse {
  explainResult: {
    executionMode: string;
    explainPlan: string;
    executionTimeMs: number | null;
    planningTimeMs: number | null;
    rowsReturned?: number | null;
  };
  suggestions: QuerySuggestion[];
}

/**
 * Before/After 성능 비교
 */
export interface PerformanceComparison {
  beforeMs: number;
  afterMs: number;
  improvementPercent: number;
}