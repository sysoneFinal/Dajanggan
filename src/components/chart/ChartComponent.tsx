import { useMemo } from "react";
import ReactApexChart from "react-apexcharts";

/** 지원 차트 타입 */
export type ChartType =
  | "column"
  | "line"
  | "area"
  | "bar"
  | "donut"
  | "pie"
  | "scatter"
  | "boxPlot";

/** 컴포넌트 Props */
interface ChartProps {
  type: ChartType;
  series: ApexAxisChartSeries | ApexNonAxisChartSeries;
  categories?: string[] | number[];
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
  showDonutTotal?: boolean;      
  enableDonutShadow?: boolean;    
  style?: React.CSSProperties;    
  donutTitle?: string;
  titleOptions?: {
    text?: string;
    align?: "left" | "center" | "right";
    color?: string;
    fontSize?: string;
    fontWeight?: number;
  };
}

/** 공통 색상 팔레트 */
const DEFAULT_COLORS = [
  "#7B61FF",
  "#FF928A",
  "#34D399",
  "#FBBF24",
  "#60A5FA",
];

/** 공통 폰트 */
const FONT_FAMILY = 'var(--font-family, "Pretendard", sans-serif)';

export default function Chart({
  type,
  series,
  categories,
  colors = DEFAULT_COLORS,
  customOptions,
  width = "100%",
  height = 250,
  showGrid = true,
  showLegend = true,
  showToolbar = false,
  isStacked = false,
  xaxisOptions,
  yaxisOptions,
  tooltipFormatter,
  showDonutTotal = true,
  enableDonutShadow = false,  
  style,
  donutTitle = "",
  titleOptions
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
          | "boxPlot");

  const baseOptions = useMemo<ApexCharts.ApexOptions>(() => {
    const options: ApexCharts.ApexOptions = {
      chart: {
        type: normalizedType,
        toolbar: { show: showToolbar },
        background: "transparent",
        fontFamily: FONT_FAMILY,
        animations: { enabled: false },
        stacked: isStacked,
        redrawOnParentResize: true,
        redrawOnWindowResize: true,
      },
      theme: { mode: "light" },
      colors,
      grid: {
        show: showGrid,
        borderColor: "rgba(0,0,0,0.08)",
        strokeDashArray: 4,
      },
      legend: {
        show: showLegend,
        position: "bottom",
        fontSize: "12px",
        labels: { colors: "#4B5563" },
        itemMargin: { horizontal: 10, vertical: 5 },
      },
      tooltip: {
        theme: "light",
        style: { fontSize: "13px", fontFamily: FONT_FAMILY },
        fillSeriesColor: false,
        marker: { show: true },
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
        labels: {
          style: {
            colors: "#6B7280",
            fontFamily: FONT_FAMILY,
            fontSize: "11px",
          },
        },
        axisBorder: { color: "#D1D5DB" },
        axisTicks: { color: "#D1D5DB" },
        ...xaxisOptions,
      },
      yaxis:
        (yaxisOptions as any) ??
        ({
          labels: {
            style: { colors: "#6B7280", fontFamily: FONT_FAMILY },
            formatter: (val: number) =>
              val >= 1_000_000
                ? `${(val / 1_000_000).toFixed(1)}M`
                : val >= 1_000
                ? `${(val / 1_000).toFixed(0)}K`
                : (val ?? 0).toLocaleString(),
          },
        } as ApexYAxis),
      noData: {
        text: "Loading…",
        align: "center",
        verticalAlign: "middle",
        style: {
          fontSize: "14px",
          fontFamily: FONT_FAMILY,
          color: "#9CA3AF",
          animation: "fadeBlink 1.4s ease-in-out infinite",
        } as any,
      },
      responsive: [
        {
          breakpoint: 768,
          options: {
            legend: { show: showLegend },
            title: { style: { fontSize: "13px" } },
            xaxis: { labels: { show: true, rotate: -30, fontSize: "10px" } },
            yaxis: { labels: { show: true, fontSize: "10px" } },
          },
        },
        {
          breakpoint: 480,
          options: {
            legend: { show: showLegend },
            chart: { height: 220 },
            title: { style: { fontSize: "12px" } },
          },
        },
      ],
    };

    /** 타입별 세부 설정 */
    switch (type) {

      /** 바 : 가로 컬럼 : 세로  */
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
                style: { fontSize: "13px", fontWeight: 600 },
              },
            },
          },
        };
        break;

      /** 채워진 선 차트 */
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
        options.markers = {
          size: 4,
          strokeWidth: 2,
          strokeColors: "#fff",
          hover: { size: 6 },
        };
        break;

      /** 파이 / 도넛 */
      case "pie":
      case "donut":
        options.labels = categories as string[];
        options.plotOptions = {
          pie: {
            donut: {
              size: "55%",
              labels: {
                show: true,
                value: {
                  show: true,
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "#1F2937",
                  offsetY: 5,
                },
                total: {
                  show: showDonutTotal,
                  label: donutTitle || "Total",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#6B7280",
                  formatter: (w) => {
                    const total = w.globals.seriesTotals.reduce(
                      (a: any, b: any) => a + b,
                      0
                    );
                    return total ? total.toString() : "0";
                  },
                },
              },
            },
          },
        };

        options.chart = {
          ...options.chart,
          dropShadow: enableDonutShadow
            ? {
                enabled: true,
                top: 5,
                blur: 6,
                opacity: 0.25,
                color: "#707070ff",
              }
            : { enabled: false },
        };

        options.fill = { type: "solid" };
        options.dataLabels = {
          enabled: true,
          style: {
            fontSize: "13px",
            fontWeight: 600,
            colors: ["#111827"],
          },
          dropShadow: { enabled: false },
          offsetY: 10,
          textAnchor: "middle",
          distributed: true,
          formatter: (val: number, opts: any) => {
            const label = opts.w.globals.labels[opts.seriesIndex];
            const rawValue = opts.w.globals.series[opts.seriesIndex];
            return rawValue === 0 ? "" : `${label} ${rawValue}`;
          },
        };
        break;

      /** 📦 BoxPlot */
      case "boxPlot":
        options.chart = {
          ...options.chart,
          type: "boxPlot",
          toolbar: { show: false },
        };
        options.plotOptions = {
          boxPlot: {
            colors: {
              upper: "#7B61FF",
              lower: "#bfb2fdff",
            },
          },
        };
        options.title = {
          align: titleOptions?.align || "left",
          style: {
            color: titleOptions?.color || "#111827",
            fontSize: titleOptions?.fontSize || "16px",
            fontWeight: titleOptions?.fontWeight ?? 600,
          },
        };
        options.stroke = { width: 1 };
        break;
    }

    /** 사용자 옵션 병합 */
    return {
      ...options,
      ...customOptions,
      chart: { ...options.chart, ...customOptions?.chart },
      plotOptions: { ...options.plotOptions, ...customOptions?.plotOptions },
      fill: { ...options.fill, ...customOptions?.fill },
      stroke: { ...options.stroke, ...customOptions?.stroke },
      grid: { ...options.grid, ...customOptions?.grid },
    };
  }, [
    type,
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
    showDonutTotal,
    enableDonutShadow,
    donutTitle,
    titleOptions,
  ]);

  return (
    <div style={{ width, height, ...style }}>
      <style>
        {`
          @keyframes fadeBlink {
            0% { opacity: 0.2; }
            50% { opacity: 1; }
            100% { opacity: 0.2; }
          }
        `}
      </style>
      <ReactApexChart
        options={baseOptions}
        series={series}
        type={normalizedType}
        height={height}
      />
    </div>
  );
}
