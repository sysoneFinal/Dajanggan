import { useMemo } from "react";
import ReactApexChart from "react-apexcharts";
import type {
  ApexOptions
} from "apexcharts";

export type ChartType = "column" | "line" | "area" | "bar" | "donut" | "pie" | "scatter";

interface ChartProps {
  type: ChartType;
  series: ApexAxisChartSeries | ApexNonAxisChartSeries;
  categories?: string[] | number[];

  titleOptions?: {
    text?: string;
    align?: "left" | "center" | "right";
    color?: string;
    fontSize?: string;
    fontWeight?: number;
  };

  colors?: string[];
  customOptions?: ApexOptions;

  width?: number | string;
  height?: number | string;

  showGrid?: boolean;
  showLegend?: boolean;
  showToolbar?: boolean;
  isStacked?: boolean;

  xaxisOptions?: ApexXAxis;
  yaxisOptions?: ApexYAxis | ApexYAxis[];

  tooltipFormatter?: (value: number) => string;
}

export default function Chart({
  type,
  series,
  categories,
  titleOptions,
  colors,
  customOptions,
  width = "100%",
  height = 300,
  showGrid = true,
  showLegend = true,
  showToolbar = false,
  isStacked = false,
  xaxisOptions,
  yaxisOptions,
  tooltipFormatter,
}: ChartProps) {
  const normalizedType: "line" | "area" | "bar" | "donut" | "pie" | "scatter" =
    type === "column" ? "bar" : (type as any);

  const baseOptions = useMemo<ApexOptions>(() => {
    // 🔒 title/subtitle 기본객체를 항상 넣어 offsetY 접근 이슈 방지
    const safeTitle = {
      text: titleOptions?.text,
      align: titleOptions?.align ?? "left",
      offsetY: 0,
      style: {
        color: titleOptions?.color ?? "#111827",
        fontSize: titleOptions?.fontSize ?? "15px",
        fontWeight: titleOptions?.fontWeight ?? 600,
      },
    };
    const safeSubtitle = { text: undefined as any, offsetY: 0 };

    const options: ApexOptions = {
      chart: {
        type: normalizedType,
        toolbar: { show: showToolbar },
        background: "transparent",
        fontFamily:
          "Pretendard, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        animations: { enabled: true },
        stacked: isStacked,
        redrawOnParentResize: true,
        redrawOnWindowResize: true,
      },
      theme: { mode: "light" },
      // ✅ 항상 객체를 넣어줌
      title: safeTitle,
      subtitle: safeSubtitle,
      colors,
      grid: {
        show: showGrid,
        borderColor: "#E5E7EB",
        strokeDashArray: 4,
      },
      legend: {
        show: showLegend,
        position: "bottom",
        labels: { colors: "#374151" },
      },
      tooltip: {
        theme: "light",
        y: { formatter: tooltipFormatter ?? ((v: number) => (v ?? 0).toLocaleString()) },
      },
      dataLabels: { enabled: false },
      stroke: {
        curve: type === "line" || type === "area" ? "smooth" : "straight",
        width: type === "line" || type === "area" ? 2 : 0,
      },
      xaxis: {
        categories,
        labels: { style: { colors: "#6B7280" } },
        axisBorder: { color: "#D1D5DB" },
        axisTicks: { color: "#D1D5DB" },
        ...(xaxisOptions ?? {}),
      },
      yaxis:
        (yaxisOptions as any) ??
        ({
          labels: {
            style: { colors: "#6B7280" },
            formatter: (val: number) =>
              val >= 1_000_000
                ? `${(val / 1_000_000).toFixed(1)}M`
                : val >= 1_000
                ? `${(val / 1_000).toFixed(0)}K`
                : (val ?? 0).toLocaleString(),
          },
        } as ApexYAxis),
      noData: { text: "Loading...", align: "center", style: { fontSize: "12px" } },
    };

    // 타입별 세부 설정
    switch (type) {
      case "bar":
      case "column":
        options.plotOptions = {
          bar: {
            horizontal: type === "bar",
            borderRadius: 4,
            columnWidth: "60%",
            dataLabels: {
              total: { enabled: isStacked, style: { fontSize: "13px", fontWeight: 900 } },
            },
          },
        };
        options.stroke = { show: false };
        break;

      case "line":
        options.stroke = { curve: "smooth", width: 3 };
        break;

      case "area":
        options.stroke = { curve: "smooth", width: 2 };
        options.fill = {
          type: "gradient",
          gradient: { shadeIntensity: 0.4, opacityFrom: 0.7, opacityTo: 0.1, stops: [0, 90, 100] },
        };
        break;

      case "donut":
      case "pie":
        options.labels = categories as string[]; // labels 필요
        options.plotOptions = { pie: { donut: { size: type === "donut" ? "60%" : "0%" } } };
        options.legend = { show: true, position: "right", labels: { colors: "#374151" } };
        break;

      case "scatter":
        options.chart = { ...(options.chart ?? {}), zoom: { enabled: true, type: "xy" } };
        options.xaxis = {
          ...(options.xaxis ?? {}),
          tickAmount: 10,
          labels: { formatter: (v) => Number(v).toFixed(1) },
        };
        options.yaxis = { labels: { formatter: (v: number) => Number(v).toFixed(1) } } as ApexYAxis;
        break;
    }

    // 사용자 옵션 병합
    const merged: ApexOptions = {
      ...options,
      ...customOptions,
      chart: { ...options.chart, ...customOptions?.chart },
      plotOptions: { ...options.plotOptions, ...customOptions?.plotOptions },
      fill: { ...options.fill, ...customOptions?.fill },
      stroke: { ...options.stroke, ...customOptions?.stroke },
      grid: { ...options.grid, ...customOptions?.grid },
      xaxis: { ...(options.xaxis ?? {}), ...(customOptions?.xaxis ?? {}) },
      yaxis: (customOptions?.yaxis as any) ?? options.yaxis,
      // 🔒 title/subtitle는 최소 구조 유지
      title: { ...safeTitle, ...(customOptions?.title ?? {}) },
      subtitle: { ...safeSubtitle, ...(customOptions?.subtitle ?? {}) },
    };

    return merged;
  }, [
    type,
    titleOptions,
    colors,
    categories,
    showGrid,
    showLegend,
    showToolbar,
    tooltipFormatter,
    xaxisOptions,
    yaxisOptions,
    customOptions,
    isStacked,
  ]);

  const outerStyle: React.CSSProperties = {
    width,
    height,
    minHeight: typeof height === "number" ? `${height}px` : height,
  };

  return (
    <div style={outerStyle}>
      <ReactApexChart
        options={baseOptions}
        series={series as any}
        type={normalizedType}
        height={height}
      />
    </div>
  );
}
