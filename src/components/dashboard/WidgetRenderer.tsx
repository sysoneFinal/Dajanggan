import WidgetCard from "../../components/util/WidgetCard";
import Chart from "../../components/chart/ChartComponent";
import type { ChartType } from "../../components/chart/ChartComponent";
import { useDashboard } from "../../context/DashboardContext";

interface WidgetRendererProps {
  metric?: string | string[] | null;
  data?: Array<Record<string, any>>;  // 실제 메트릭 데이터
  error?: string | null;  // 에러 메시지
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

function formatTimestamp(ts: string): string {
  // "2025-11-15T00:10:00" -> "00:10"
  try {
    const date = new Date(ts);
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return ts;
  }
}

export default function WidgetRenderer({ 
  metric, 
  data = [], 
  error = null, 
  isEditable, 
  onDelete 
}: WidgetRendererProps) {
  const { metricMap } = useDashboard();

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

  // 에러가 있는 경우
  if (error) {
    return (
      <WidgetCard title="Error">
        {renderDeleteButton()}
        <div style={{ textAlign: "center", color: "#EF4444" }}>
          <p>⚠️ 데이터 조회 실패</p>
          <p style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>{error}</p>
        </div>
      </WidgetCard>
    );
  }

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

  // 실제 데이터가 없는 경우
  if (!data || data.length === 0) {
    const first = metricMap[validMetrics[0]];
    return (
      <WidgetCard title={first?.title ?? validMetrics[0]}>
        {renderDeleteButton()}
        <div style={{ textAlign: "center", color: "#9CA3AF", paddingTop: "2rem" }}>
          <p>📊 데이터 없음</p>
          <p style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>
            최근 15분간 수집된 데이터가 없습니다.
          </p>
        </div>
      </WidgetCard>
    );
  }

  // 실제 데이터로 차트 렌더링
  const first = metricMap[validMetrics[0]];
  const preferred = first.default_chart ?? first.available_charts?.[0] ?? "line";
  const chartType: ChartType = validMetrics.length > 1 ? "line" : normalizeChartType(preferred);
  const isStacked = (first.default_chart ?? first.available_charts?.[0]) === "stacked-bar";

  // timestamp를 카테고리로 변환
  const categories = data.map((row) => formatTimestamp(row.timestamp));

  // 각 메트릭별로 시리즈 생성
  const chartSeries = validMetrics.map((m) => {
    const metricInfo = metricMap[m];
    // 메트릭명에서 실제 컬럼명 추출 (SESSION.total_sessions -> total_sessions)
    const columnName = m.includes('.') ? m.split('.').pop() : m;
    
    return {
      name: metricInfo?.title ?? m,
      data: data.map((row) => {
        const value = row[columnName!];
        return value != null ? Number(value) : 0;
      }),
    };
  });

  const chartTitle =
    validMetrics.length > 1
      ? validMetrics.map((m) => metricMap[m]?.title ?? m).join(" / ")
      : first.title ?? validMetrics[0];

  return (
    <WidgetCard title={chartTitle}>
      {renderDeleteButton()}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <Chart
          type={chartType}
          series={chartSeries}
          categories={categories}
          showLegend={validMetrics.length > 1}
          isStacked={isStacked}
          height="100%"
        />
      </div>
    </WidgetCard>
  );
}