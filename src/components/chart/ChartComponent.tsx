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
  | "radialBar";

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
}

/** 공통 색상 팔레트 */
const DEFAULT_COLORS = [
  "#7B61FF",
  "#FF928A",
  "#60A5FA",
  "#34D399",
  "#FBBF24",
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
        style: {
          fontSize: "13px",
          fontFamily: FONT_FAMILY,
        },
        fillSeriesColor: false,
        marker: { show: true },
        y: {
          formatter:
            tooltipFormatter ?? ((v: number) => (v ?? 0).toLocaleString()),
        },
        custom: undefined, // 필요시 커스텀 추가 가능
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

      /**  로딩 상태 (NoData) 애니메이션 */
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

      /** 반응형 설정 */
      responsive: [
        {
          breakpoint: 768,
          options: {
            legend: { show: false },
            title: {
              style: {
                fontSize: "13px",
              },
            },
            xaxis: {
              labels: { show: true, rotate: -30, fontSize: "10px" },
            },
            yaxis: {
              labels: { show: true, fontSize: "10px" },
            },
          },
        },
        {
          breakpoint: 480,
          options: {
            legend: { show: false },
            chart: { height: 220 },
            title: {
              style: {
                fontSize: "12px",
              },
            },
          },
        },
      ],
    };

    /**  타입별 세부 설정 */
    switch (type) {
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

      case "donut":
      case "pie":
        options.labels = categories as string[];
        options.plotOptions = {
          pie: {
            donut: { size: type === "donut" ? "50%" : "0%" },
          },
        };
        break;

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
  ]);

  return (
    <div style={{ width, height }}>
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
