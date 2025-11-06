import { Layout } from "react-grid-layout";

/**
 * react-grid-layout 기반 위젯 Layout 확장 타입
 */
export interface DashboardLayout extends Layout {
  /** 지표 */
  metricType: string | string[];

  /** 차트 제목 (UI 표시용) */
  title: string;

  /** 차트 렌더링 타입 (line, bar, donut 등) */
  type: string;

  /** DB  */
  databases?: {
    id: number;
    name: string;
  }[];

  instanceId?: number | null;
}

