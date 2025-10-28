import { useMemo } from "react";
import ReactApexChart from "react-apexcharts";

export type ChartType =
  | "column"
  | "line"
  | "area"
  | "bar"
  | "donut"
  | "pie"
  | "scatter"
  | "radialBar";

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
  customOptions?: ApexCharts.ApexOptions;
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
  const normalizedType =
    type === "column"
      ? "bar"
      : (type as
          | "line"
          | "area"
          | "bar"
          | "donut"
          | "pie"
          | "scatter"
          | "radialBar");

  const baseOptions = useMemo<ApexCharts.ApexOptions>(() => {
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

    const options: ApexCharts.ApexOptions = {
      chart: {
        type: normalizedType,
        toolbar: { show: showToolbar },
        background: "transparent",
        fontFamily: "Pretendard, sans-serif",
        animations: { enabled: true },
        stacked: isStacked,
        redrawOnParentResize: true,
        redrawOnWindowResize: true,
      },
      theme: { mode: "light" },
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
        y: {
          formatter:
            tooltipFormatter ?? ((v: number) => (v ?? 0).toLocaleString()),
        },
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
      noData: {
        text: "Loading...",
        align: "center",
        style: { fontSize: "12px" },
      },
    };

    // Chart Type별 세부 설정
    switch (type) {
      // Stacked / 일반 막대
      case "bar":
      case "column":
        options.plotOptions = {
          bar: {
            horizontal: type === "bar",
            borderRadius: 4,
            columnWidth: "60%",
            dataLabels: {
              total: {
                enabled: isStacked,
                style: { fontSize: "13px", fontWeight: 900 },
              },
            },
          },
        };
        options.stroke = { show: false };
        break;

      // Area Chart 
      case "area":
        options.stroke = { curve: "smooth", width: 2 };
        options.fill = {
          type: "gradient",
          gradient: {
            shade: "light",
            type: "vertical",
            opacityFrom: 0.5,
            opacityTo: 0.05,
            stops: [0, 100],
          },
        };

        //  통일된 색상 팔레트
        options.colors = ["#7B61FF", "#FF928A", "#60A5FA"];

        options.markers = {
          size: 4,
          strokeWidth: 2,
          strokeColors: "#fff",
          hover: { size: 6 },
        };

        options.tooltip = {
          theme: "light",
          style: { fontSize: "13px", fontFamily: "Inter, sans-serif" },
          marker: { show: true },
        };

        options.grid = {
          borderColor: "rgba(0,0,0,0.06)",
          strokeDashArray: 4,
        };

        options.yaxis = {
          labels: {
            style: { colors: "rgba(0,0,0,0.5)" },
            formatter: (val: number) => `${Math.round(val)}`,
          },
        };
        break;

      // Donut / Pie
      case "donut":
      case "pie":
        options.labels = categories as string[];
        options.plotOptions = {
          pie: {
            donut: { size: type === "donut" ? "50%" : "0%" },
          },
        };
        break;

      // Radial Gauge
      case "radialBar":
        options.plotOptions = {
          radialBar: {
            hollow: { size: "60%" },
            track: { background: "#E5E7EB", margin: 4 },
            dataLabels: {
              name: { fontSize: "13px", color: "#6B7280" },
              value: {
                fontSize: "22px",
                fontWeight: 600,
                formatter: (v: number) => `${Math.round(v)}%`,
              },
            },
          },
        };
        options.fill = {
          type: "gradient",
          gradient: {
            shade: "light",
            type: "horizontal",
            gradientToColors: ["#7B61FF"],
            stops: [0, 100],
          },
        };
        options.stroke = { lineCap: "round" };
        break;
    }

    // 사용자 옵션 병합
    return {
      ...options,
      ...customOptions,
      chart: { ...options.chart, ...customOptions?.chart },
      plotOptions: { ...options.plotOptions, ...customOptions?.plotOptions },
      fill: { ...options.fill, ...customOptions?.fill },
      stroke: { ...options.stroke, ...customOptions?.stroke },
      grid: { ...options.grid, ...customOptions?.grid },
      title: { ...safeTitle, ...(customOptions?.title ?? {}) },
      subtitle: { ...safeSubtitle, ...(customOptions?.subtitle ?? {}) },
    };
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

  return (
    <div style={{ width, height }}>
      <ReactApexChart
        options={baseOptions}
        series={series}
        type={normalizedType}
        height={height}
      />
    </div>
  );
}
