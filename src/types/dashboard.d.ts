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

    /** 실제 메트릭 데이터 */
  data?: Array<Record<string, any>>;

  /** 에러 메시지 */
  error?: string | null;
}
