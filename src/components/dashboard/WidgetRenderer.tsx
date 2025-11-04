import WidgetCard from "../../components/util/WidgetCard";
import Chart from "../../components/chart/ChartComponent";
import rawMetrics from "../../components/chart/Metrics.json";
import type { ChartType } from "../../components/chart/ChartComponent";

interface MetricMeta {
  title: string;
  type: ChartType;
  unit?: string;
  source?: string;
  column?: string;
  category?: string;
  level?: string;
}

type MetricsCatalog = Record<string, Record<string, MetricMeta | undefined>>;
const meta: Record<string, MetricMeta> = flattenMetrics(
  rawMetrics as unknown as MetricsCatalog
);

/** Metrics.json을 1단계 평탄화 */
function flattenMetrics(catalog: MetricsCatalog): Record<string, MetricMeta> {
  const entries: [string, MetricMeta][] = [];

  Object.values(catalog).forEach((group) => {
    Object.entries(group).forEach(([key, meta]) => {
      if (meta) entries.push([key, meta]); 
    });
  });

  return Object.fromEntries(entries);
}



interface WidgetRendererProps {
  metric?: string | string[] | null;
}

/**
 * 위젯 렌더러
 * Theme.json에서 전달된 metric 키를 Metrics.json 정의에 매핑하여 차트를 렌더링한다.
 */
export default function WidgetRenderer({ metric }: WidgetRendererProps) {
  /** metric이 없거나 비어있으면 placeholder */
  if (!metric) {
    return (
      <WidgetCard title="Empty">
        <div style={{ textAlign: "center", color: "#9CA3AF" }}>
          No metric assigned.
        </div>
      </WidgetCard>
    );
  }

  const metricList = Array.isArray(metric) ? metric : [metric];
  const validMetrics = metricList.filter((m) => meta[m]);

  /** 매핑된 메트릭이 하나도 없을 때 */
  if (validMetrics.length === 0) {
    return (
      <WidgetCard title="Empty">
        <div style={{ textAlign: "center", color: "#9CA3AF" }}>
          Unknown metric.
        </div>
      </WidgetCard>
    );
  }

  /** 여러 metric을 포함할 경우 line chart로 통합 */
  const chartSeries = validMetrics.map((m) => {
    const info = meta[m];
    const dummyData = [5, 9, 7, 10, 8];
    return {
      name: info?.title ?? m,
      data: dummyData,
    };
  });

  const firstInfo = meta[validMetrics[0]];
  const chartType: ChartType = validMetrics.length > 1 ? "line" : firstInfo.type;
  const chartTitle =
    validMetrics.length > 1
      ? validMetrics.map((m) => meta[m]?.title ?? m).join(" / ")
      : firstInfo.title;

  const categories = ["10:00", "10:05", "10:10", "10:15", "10:20"];

  return (
    <WidgetCard title={chartTitle}>
      <Chart
        type={chartType}
        series={chartSeries}
        categories={categories}
        showLegend={validMetrics.length > 1}
      />
    </WidgetCard>
  );
}
