import { Layout } from "react-grid-layout";

export interface DashboardLayout extends Layout {
  /** 지표 */
  metricType: string;

  /** 차트 제목 (UI 표시용) */
  title: string;

  /** 차트 렌더링 타입 (line, bar, donut 등) */
  type: string;

  /** DB 목록 */
  databases?: {
    id: number;
    name: string;
  }[];

  instanceId?: number | null;
}
