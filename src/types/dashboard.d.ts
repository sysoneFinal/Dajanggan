import { Layout } from "react-grid-layout";

/**
 * 확장된 Layout 타입
 * - react-grid-layout의 기본 Layout에 사용자 정의 필드 추가
 */
export interface DashboardLayout extends Layout {
  /** 지표 타입 (예: cpu_usage, tps_total 등) */
  metricType: string | string[];

  /** 차트 제목 (UI 표시용) */
  title: string;

  /** 차트 렌더링 타입 (line, bar, stacked-bar 등) */
  type: string;
}
