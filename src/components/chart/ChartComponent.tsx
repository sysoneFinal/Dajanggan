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
    const options: ApexCharts.ApexOptions = {
      chart: {
        type: normalizedType,
        toolbar: { show: showToolbar },
        background: "transparent",
        fontFamily: "Pretendard, sans-serif",
        stacked: isStacked,
        dropShadow: {
          enabled: true,
          top: 0,
          left: 0,
          blur: 4,
          color: colors?.[0] ?? "#6366F1",
          opacity: 0.25,
        },
      },
      theme: { mode: "light" },
      title: titleOptions
        ? {
            text: titleOptions.text,
            align: titleOptions.align ?? "left",
            style: {
              color: titleOptions.color ?? "#111827",
              fontSize: titleOptions.fontSize ?? "15px",
              fontWeight: titleOptions.fontWeight ?? 600,
            },
          }
        : undefined,
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
          formatter: tooltipFormatter ?? ((v) => v.toLocaleString()),
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
        ...xaxisOptions,
      },
      yaxis: {
        labels: {
          style: { colors: "#6B7280" },
          formatter: (val: number) =>
            val >= 1_000_000
              ? `${(val / 1_000_000).toFixed(1)}M`
              : val >= 1_000
              ? `${(val / 1_000).toFixed(0)}K`
              : val.toLocaleString(),
        },
        ...yaxisOptions,
      },
    };

    switch (type) {
      case "bar":
      case "column":
        options.plotOptions = {
          bar: {
            horizontal: type === "bar",
            borderRadius: 4,
            columnWidth: "60%",
          },
        };
        break;

      case "line":
        options.stroke = { curve: "straight", width: 3 };
        break;

      // case "area":
      //   options.stroke = { curve: "smooth", width: 2 };
      //   options.fill = {
      //     type: "gradient",
      //     gradient: {
      //       shadeIntensity: 0.4,
      //       opacityFrom: 0.7,
      //       opacityTo: 0.1,
      //       stops: [0, 90, 100],
      //     },
      //   };
      //   break;
      case "area":
        options.stroke = {
          curve: "smooth",
          width: 2,
        };

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

        options.markers = {
          size: 4,
          strokeWidth: 2,
          strokeColors: "#fff",
          hover: { size: 6 },
        };

        options.colors = ["#7B61FF", "#FF928A"];

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
            formatter: (val: number) => `${Math.round(val / 1000)}K`,
          },
        };

        break;
  

      case "donut":
      case "pie":
        options.labels = categories as string[];
        options.plotOptions = {
          pie: {
            donut: {
              size: type === "donut" ? "50%" : "0%",
            },
          },
        };
        break;

      case "radialBar":
        options.plotOptions = {
          radialBar: {
            hollow: { size: "60%" },
            track: {
              background: "#E5E7EB",
              strokeWidth: "100%",
              margin: 4,
            },
            dataLabels: {
              show: true,
              name: {
                show: true,
                fontSize: "13px",
                color: "#6B7280",
                offsetY: 10,
              },
              value: {
                show: true,
                fontSize: "22px",
                fontWeight: 600,
                color: "#111827",
                offsetY: -10,
                formatter: (val: number) => `${Math.round(val)}%`,
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
        options.labels = categories as string[];
        break;
    }

    // 병합 로직 수정 (plotOptions 안쪽까지 병합)
    return {
      ...options,
      chart: {
        ...options.chart,
        ...customOptions?.chart,
        dropShadow: {
          ...options.chart?.dropShadow,
          ...(customOptions?.chart?.dropShadow ?? {}),
          ...(customOptions?.dropShadow ?? {}),
        },
      },
      plotOptions: {
        ...options.plotOptions,
        radialBar: {
          ...options.plotOptions?.radialBar,
          ...(customOptions?.plotOptions?.radialBar ?? {}),
        },
        ...customOptions?.plotOptions,
      },
      fill: { ...options.fill, ...customOptions?.fill },
      stroke: { ...options.stroke, ...customOptions?.stroke },
      grid: { ...options.grid, ...customOptions?.grid },
      legend: { ...options.legend, ...customOptions?.legend },
      ...customOptions,
    };
  }, [
    type,
    normalizedType,
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
