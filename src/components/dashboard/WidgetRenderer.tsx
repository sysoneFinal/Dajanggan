import WidgetCard from "../../components/util/WidgetCard";
import Chart from "../../components/chart/ChartComponent";
import type { ChartType } from "../../components/chart/ChartComponent";
import { useDashboard } from "../../context/DashboardContext";

interface WidgetRendererProps {
  metric?: string | string[] | null;
  isEditable?: boolean;
  onDelete?: () => void;
}

function normalizeChartType(s?: string): ChartType {
  if (!s) return "line";
  const v = s.toLowerCase();
  if (v === "stacked-bar") return "bar";
  if (["line", "area", "bar", "column", "pie", "donut", "scatter", "radialbar"].includes(v))
    return v as ChartType;
  return "line";
}

function generateDummySeries(metricKey: string, len: number): number[] {
  const seed = metricKey.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return Array.from({ length: len }, (_, i) =>
    Math.max(1, Math.round((Math.sin(i + seed) + 1) * 10 + (seed % 5)))
  );
}

export default function WidgetRenderer({ metric, isEditable, onDelete }: WidgetRendererProps) {
  const { metricMap } = useDashboard(); // Context에서 metricMap 받기

  const renderDeleteButton = () =>
    isEditable && onDelete && (
      <button
        className="widget-delete-btn"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        ✕
      </button>
    );

  if (!metric) {
    return (
      <WidgetCard title="Empty">
        {renderDeleteButton()}
        <div style={{ textAlign: "center", color: "#9CA3AF" }}>No metric assigned.</div>
      </WidgetCard>
    );
  }

  const metricList = Array.isArray(metric) ? metric : [metric];
  const validMetrics = metricList.filter((m) => !!metricMap[m]);

  if (validMetrics.length === 0) {
    return (
      <WidgetCard title="Empty">
        {renderDeleteButton()}
        <div style={{ textAlign: "center", color: "#9CA3AF" }}>Unknown metric.</div>
      </WidgetCard>
    );
  }

  const categories = ["10:00", "10:05", "10:10", "10:15", "10:20", "10:25"];
  const dataLen = categories.length;
  const first = metricMap[validMetrics[0]];
  const preferred = first.default_chart ?? first.available_charts?.[0] ?? "line";
  const chartType: ChartType = validMetrics.length > 1 ? "line" : normalizeChartType(preferred);
  const isStacked = (first.default_chart ?? first.available_charts?.[0]) === "stacked-bar";

  const chartSeries = validMetrics.map((m) => ({
    name: metricMap[m]?.title ?? m,
    data: generateDummySeries(m, dataLen),
  }));

  const chartTitle =
    validMetrics.length > 1
      ? validMetrics.map((m) => metricMap[m]?.title ?? m).join(" / ")
      : first.title ?? validMetrics[0];

  return (
    <WidgetCard title={chartTitle}>
      {renderDeleteButton()}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <Chart
          type={chartType}
          series={chartSeries}
          categories={categories}
          showLegend={validMetrics.length > 1}
          isStacked={isStacked}
        />
      </div>
    </WidgetCard>
  );
}
