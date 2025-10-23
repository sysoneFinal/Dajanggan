import { useMemo } from "react";
import ReactApexChart from "react-apexcharts";

// 지원 차트 타입 정의
export type ChartType =
  | "column" // 세로 막대
  | "line" // 선
  | "area" // 면적이 채워진 선
  | "bar" // 가로 막대
  | "donut" // 도넛
  | "pie" // 파이
  | "scatter"; // 산점도

interface ChartProps {
  /** 차트 타입 */
  type: ChartType;
  /** 데이터 시리즈 */
  series: ApexAxisChartSeries | ApexNonAxisChartSeries;
  /** X축 카테고리 */
  categories?: string[] | number[];

  /** 제목 설정 */
  titleOptions?: {
    text?: string;
    align?: "left" | "center" | "right";
    color?: string;
    fontSize?: string;
    fontWeight?: number;
  };

  /** 색상 팔레트 */
  colors?: string[];
  /** 사용자 지정 Apex 옵션 */
  customOptions?: ApexCharts.ApexOptions;

  /** 크기 설정 */
  width?: number | string;
  height?: number | string;

  /** 표시 설정 */
  showGrid?: boolean;
  showLegend?: boolean;
  showToolbar?: boolean;
  /** 스택형 차트 여부 (쌓는 바) */
  isStacked?: boolean;
  /** 축 옵션 */
  xaxisOptions?: ApexXAxis;
  yaxisOptions?: ApexYAxis | ApexYAxis[];

  /** 툴팁 포맷터 */
  tooltipFormatter?: (value: number) => string;
}

/**
 * 통합 Chart 컴포넌트
 * - line, area, bar, column, pie, donut, scatter
 */
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
  // ApexCharts는 column 타입이 없어서 bar로 매핑 후 변환 처리
  const normalizedType =
    type === "column"
      ? "bar"
      : (type as
          | "line"
          | "area"
          | "bar"
          | "donut"
          | "pie"
          | "scatter");
  
  const baseOptions = useMemo(() => {
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
        y: { 
          formatter: tooltipFormatter ?? ((v: number) => (v ?? 0).toLocaleString()) 
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
      noData: { text: "Loading...", align: "center", style: { fontSize: "12px" } },
    };

    // 타입별 세부 설정
    switch (type) {
      case "bar":
      case "column":
        options.plotOptions = {
          bar: {
            horizontal: type === "bar", // column은 세로 막대
            borderRadius: 4,
            columnWidth: "60%",
            dataLabels: {
              total: { 
                enabled: isStacked, // 스택형일 때만 합계 표시
              style: {
                fontSize: "13px",
                fontWeight: 900
                },
              },
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
          gradient: {
            shadeIntensity: 0.4,
            opacityFrom: 0.7,
            opacityTo: 0.1,
            stops: [0, 90, 100],
          },
        };
        break;

      case "donut":
      case "pie":
        options.labels = categories as string[];
        options.plotOptions = {
          pie: {
            donut: {
              size: type === "donut" ? "60%" : "0%",
            },
          },
        };
        options.legend = {
          show: true,
          position: "bottom",
          labels: { colors: "#374151" },
        };
        break;
      case "scatter":
        options.chart = {
          ...(options.chart ?? {}),
          zoom: { enabled: true, type: "xy" },
        };
        options.xaxis = {
          ...options.xaxis,
          tickAmount: 10,
          labels: { formatter: (v) => Number(v).toFixed(1) },
        };
        options.yaxis = { 
          labels: { formatter: (v: number) => Number(v).toFixed(1) } } as ApexYAxis;
        break;
    }

    // 사용자 옵션 병합
    const merged: ApexCharts.ApexOptions = {
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