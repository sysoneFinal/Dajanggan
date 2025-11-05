import React from "react";
import WidgetCard from "../../components/util/WidgetCard";
import Chart from "../../components/chart/ChartComponent";
import rawMetrics from "../../components/chart/Metrics.json";
import type { ChartType } from "../../components/chart/ChartComponent";

/** Metrics.json 항목의 실 구조에 맞춘 타입(핵심 필드만) */
type MetricFromJson = {
  title: string;
  unit?: string;
  source?: string;
  column?: string;
  category?: string;
  level?: string;
  available_charts?: string[];
  default_chart?: string;
};

type FlatMeta = Record<string, MetricFromJson>;

/** Array 형태의 Metrics.json을 평탄화 */
function flattenMetrics(json: any): FlatMeta {
  const arr = Array.isArray(json) ? json : [json];
  const out: FlatMeta = {};

  for (const group of arr) {
    Object.keys(group).forEach((category) => {
      const metricsInCategory = group[category];
      if (!metricsInCategory || typeof metricsInCategory !== "object") return;

      Object.entries(metricsInCategory).forEach(([metricKey, meta]) => {
        if (!meta || typeof meta !== "object") return;
        out[metricKey] = {
          ...(meta as MetricFromJson),
          category,
        };
      });
    });
  }
  return out;
}

const meta: FlatMeta = flattenMetrics(rawMetrics);

interface WidgetRendererProps {
  metric?: string | string[] | null;
  /** 커스텀 모드에서만 삭제버튼 활성화 */
  isEditable?: boolean;
  onDelete?: () => void;
}

/** Metrics의 default_chart/available_charts를 ChartComponent 타입으로 정규화 */
function normalizeChartType(s?: string): ChartType {
  if (!s) return "line";
  const v = s.toLowerCase();
  if (v === "stacked-bar") return "bar";
  if (["line", "area", "bar", "column", "pie", "donut", "scatter", "radialbar"].includes(v)) {
    return v as ChartType;
  }
  return "line";
}

/** 더미 데이터(테스트용): metricKey에 따라 결정되는 일관된 값 */
function generateDummySeries(metricKey: string, len: number): number[] {
  const seed = metricKey.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return Array.from({ length: len }, (_, i) =>
    Math.max(1, Math.round((Math.sin(i + seed) + 1) * 10 + (seed % 5)))
  );
}

export default function WidgetRenderer({ metric, isEditable, onDelete }: WidgetRendererProps) {
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

  // metric이 없을 때 (Empty 카드)
  if (!metric) {
    return (
      <WidgetCard title="Empty">
        {renderDeleteButton()}
        <div style={{ textAlign: "center", color: "#9CA3AF" }}>No metric assigned.</div>
      </WidgetCard>
    );
  }

  const metricList = Array.isArray(metric) ? metric : [metric];
  const validMetrics = metricList.filter((m) => !!meta[m]);

  // 매핑 실패 시
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

  const first = meta[validMetrics[0]];
  const preferred = first.default_chart ?? first.available_charts?.[0] ?? "line";
  const chartType: ChartType = validMetrics.length > 1 ? "line" : normalizeChartType(preferred);
  const isStacked = (first.default_chart ?? first.available_charts?.[0]) === "stacked-bar";

  const chartSeries = validMetrics.map((m) => ({
    name: meta[m]?.title ?? m,
    data: generateDummySeries(m, dataLen),
  }));

  const chartTitle =
    validMetrics.length > 1
      ? validMetrics.map((m) => meta[m]?.title ?? m).join(" / ")
      : first.title ?? validMetrics[0];

  return (
    <WidgetCard title={chartTitle}>
      {renderDeleteButton()}
      <Chart
        type={chartType}
        series={chartSeries}
        categories={categories}
        height={220}
        showLegend={validMetrics.length > 1}
        isStacked={isStacked}
      />
    </WidgetCard>
  );
}
