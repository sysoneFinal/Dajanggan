import type { ApexYAxis } from "apexcharts";
import WidgetCard from "../../components/util/WidgetCard";
import Chart from "../../components/chart/ChartComponent";
import type { ChartType } from "../../components/chart/ChartComponent";
import { useDashboard } from "../../context/DashboardContext";

interface WidgetRendererProps {
  metric?: string | string[] | null;
  data?: Array<Record<string, any>>;  // 실제 메트릭 데이터
  error?: string | null;  // 에러 메시지
  unit?: string | null;
  databases?: Array<{ id?: number; name?: string; databaseName?: string }>;
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
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return ts;
  }
}

export default function WidgetRenderer({ 
  metric, 
  data = [], 
  error = null, 
  unit = null,
  databases = [],
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

  const databaseLabel = databases
    .map((db) => db?.name ?? db?.databaseName)
    .filter(Boolean)
    .join(", ");
  const cardSubtitle = databaseLabel || undefined;
  

  // 에러가 있는 경우
  if (error) {
    return (
      <WidgetCard title="Error" subtitle={cardSubtitle}>
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
      <WidgetCard title="Empty" subtitle={cardSubtitle}>
        {renderDeleteButton()}
        <div style={{ textAlign: "center", color: "#9CA3AF" }}>No metric assigned.</div>
      </WidgetCard>
    );
  }

  const metricList = Array.isArray(metric) ? metric : [metric];
  const validMetrics = metricList.filter((m) => !!metricMap[m]);

  if (validMetrics.length === 0) {
    return (
      <WidgetCard title="Empty" subtitle={cardSubtitle}>
        {renderDeleteButton()}
        <div style={{ textAlign: "center", color: "#9CA3AF" }}>Unknown metric.</div>
      </WidgetCard>
    );
  }

  // 실제 데이터가 없는 경우
  if (!data || data.length === 0) {
    const first = metricMap[validMetrics[0]];
    return (
      <WidgetCard title={first?.title ?? validMetrics[0]} subtitle={cardSubtitle}>
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
  const resolvedUnit = unit ?? first.unit ?? "";

  const formatAxisValue = (val?: number) => {
    if (typeof val !== "number" || Number.isNaN(val)) return "0";
    const absVal = Math.abs(val);
    if (absVal >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
    if (absVal >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
    return val.toLocaleString();
  };

  const yAxisOptions: ApexYAxis | undefined = resolvedUnit
    ? {
        title: {
          text: resolvedUnit,
          style: { color: "#9CA3AF", fontSize: "12px", fontWeight: 500 },
        },
        labels: {
          style: { colors: "#6B7280", fontFamily: 'var(--font-family, "Pretendard", sans-serif)' },
          formatter: (val: number) => formatAxisValue(val),
        },
      }
    : undefined;

  const tooltipFormatter = (value: number) => {
    const numeric = typeof value === "number" ? value : 0;
    const formatted = numeric.toLocaleString();
    return resolvedUnit ? `${formatted} ${resolvedUnit}` : formatted;
  };

  const extractDbName = (row: Record<string, any>): string | null => {
    return (
      row.database ??
      row.databaseName ??
      row.database_name ??
      row.db ??
      row.db_name ??
      row.dbname ??
      row.datname ??
      null
    );
  };

  const hasDatabaseColumn = data.some((row) => !!extractDbName(row));
  const uniqueDbNames = hasDatabaseColumn
    ? Array.from(
        new Set(
          data
            .map((row) => extractDbName(row))
            .filter((name): name is string => !!name)
        )
      )
    : [];
  const shouldSplitByDatabase =
    uniqueDbNames.length > 1 || (databases?.length ?? 0) > 1;

  const timestampOrder: string[] = [];
  const timestampSeen = new Set<string>();
  data.forEach((row) => {
    if (!row.timestamp) return;
    if (!timestampSeen.has(row.timestamp)) {
      timestampSeen.add(row.timestamp);
      timestampOrder.push(row.timestamp);
    }
  });

  let categories = data.map((row) => {
    const d = new Date(row.timestamp);
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${min}`;
  });
  let chartSeries: { name: string; data: number[] }[] = [];

  if (shouldSplitByDatabase && validMetrics.length === 1) {
    const metricKey = validMetrics[0];
    const columnName = metricKey.includes(".")
      ? metricKey.split(".").pop()
      : metricKey;
    const dbSeriesMap = new Map<string, Record<string, number>>();

    data.forEach((row) => {
      const dbName = extractDbName(row) ?? "Unknown DB";
      const ts = row.timestamp;
      if (!ts) return;
      const rawValue = columnName ? row[columnName] : undefined;
      const numericValue =
        rawValue != null && !Number.isNaN(Number(rawValue))
          ? Number(rawValue)
          : 0;

      if (!dbSeriesMap.has(dbName)) {
        dbSeriesMap.set(dbName, {});
      }
      dbSeriesMap.get(dbName)![ts] = numericValue;
    });

    chartSeries = Array.from(dbSeriesMap.entries()).map(([dbName, valueMap]) => ({
      name: dbName,
      data: timestampOrder.map((ts) => valueMap[ts] ?? 0),
    }));
  } else {
    // timestamp를 카테고리로 변환 (원본 순서 유지)
    categories = data.map((row) => formatTimestamp(row.timestamp));

    // 각 메트릭별로 시리즈 생성
    chartSeries = validMetrics.map((m) => {
      const metricInfo = metricMap[m];
      // 메트릭명에서 실제 컬럼명 추출 (SESSION.total_sessions -> total_sessions)
      const columnName = m.includes(".") ? m.split(".").pop() : m;

      return {
        name: metricInfo?.title ?? m,
        data: data.map((row) => {
          const value = columnName ? row[columnName] : undefined;
          return value != null ? Number(value) : 0;
        }),
      };
    });
  }

  const chartTitle =
    validMetrics.length > 1
      ? validMetrics.map((m) => metricMap[m]?.title ?? m).join(" / ")
      : first.title ?? validMetrics[0];

  return (
    <WidgetCard title={chartTitle} subtitle={cardSubtitle}>
      {renderDeleteButton()}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <Chart
          type={chartType}
          series={chartSeries}
          categories={categories}
          showLegend={validMetrics.length > 1 || chartSeries.length > 1}
          isStacked={isStacked}
          height="100%"
          yaxisOptions={yAxisOptions}
          tooltipFormatter={tooltipFormatter}
        />
      </div>
    </WidgetCard>
  );
}