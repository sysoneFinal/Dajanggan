import { useMemo, useRef, useEffect, useState } from "react";
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
  xAxisTickAmount?: number;
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
  enableSlidingAnimation?: boolean;
  slidingAnimationDuration?: number;
  animationEasing?: "linear" | "easein" | "easeout" | "easeinout";
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
  xAxisTickAmount = 6, 
  yaxisOptions,
  tooltipFormatter,
  showDonutTotal = true,
  enableDonutShadow = false,
  style,
  donutTitle = "",
  titleOptions,
  enableSlidingAnimation = true, // 기본값을 true로 변경
  slidingAnimationDuration = 800, // 기본 800ms로 증가
  animationEasing = "easeinout",
}: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);

  // width/height가 퍼센트 문자열인지 확인
  const isPercentHeight = typeof height === 'string' && height.includes('%');
  const isPercentWidth = typeof width === 'string' && width.includes('%');

  const [calculatedHeight, setCalculatedHeight] = useState<number | string>(
    isPercentHeight ? 300 : height
  );
  const [calculatedWidth, setCalculatedWidth] = useState<number | string>(
    isPercentWidth ? 400 : width
  );

  useEffect(() => {
    // 퍼센트 값이 아니면 아무 작업도 하지 않음
    if (!isPercentHeight && !isPercentWidth) return;
    if (!containerRef.current) return;

    const updateSize = () => {
      const parentElement = containerRef.current?.parentElement;
      if (!parentElement) return;

      if (isPercentHeight) {
        const parentHeight = parentElement.clientHeight;
        if (parentHeight && parentHeight > 0) {
          setCalculatedHeight(parentHeight);
        }
      }

      if (isPercentWidth) {
        const parentWidth = parentElement.clientWidth;
        if (parentWidth && parentWidth > 0) {
          setCalculatedWidth(parentWidth);
        }
      }
    };

    // 초기 렌더링 후 약간의 지연을 두고 실행
    const timer = setTimeout(updateSize, 10);

    window.addEventListener('resize', updateSize);

    // ResizeObserver로 부모 크기 변경 감지
    const resizeObserver = new ResizeObserver(updateSize);
    if (containerRef.current.parentElement) {
      resizeObserver.observe(containerRef.current.parentElement);
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateSize);
      resizeObserver.disconnect();
    };
  }, [isPercentHeight, isPercentWidth]);

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
        // 방어 코드 
  const safeSeries = useMemo(() => {
    if (!Array.isArray(series) || series.length === 0) {
      return [{ name: 'No Data', data: [] }];
    }
    
    return series.map((s: any) => ({
      ...s,
      data: Array.isArray(s.data) ? s.data : []
    }));
  }, [series]);

  const safeCategories = useMemo(() => {
    if (!Array.isArray(categories)) {
      return [];
    }
    return categories;
  }, [categories]);


  // 슬라이딩 애니메이션을 위한 축 차트 타입 확인
  const isAxisChart =
    normalizedType === "line" ||
    normalizedType === "area" ||
    normalizedType === "bar" ||
    normalizedType === "scatter" ||
    normalizedType === "boxPlot";

  // 도넛/파이 차트인지 확인
  const isCircularChart = normalizedType === "donut" || normalizedType === "pie";

  const baseOptions = useMemo<ApexCharts.ApexOptions>(() => {
    const options: ApexCharts.ApexOptions = {
      chart: {
        type: normalizedType,
        toolbar: { show: showToolbar },
        background: "transparent",
        fontFamily: FONT_FAMILY,
        animations: {
          enabled: enableSlidingAnimation,
          easing: animationEasing,
          speed: slidingAnimationDuration,
          animateGradually: {
            enabled: false, // 등장 애니메이션 비활성화
            delay: 0,
          },
          dynamicAnimation: {
            enabled: enableSlidingAnimation, // 데이터 업데이트 애니메이션만 활성화
            speed: slidingAnimationDuration,
          },
        },
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
        categories: safeCategories,
        labels: {
          style: {
            colors: "#6B7280",
            fontFamily: FONT_FAMILY,
            fontSize: "11px",
          },
          rotate: -45,
          rotateAlways: false,
          hideOverlappingLabels: true,
          trim: true,
          maxHeight: 80,
        },
        tickAmount: xAxisTickAmount,
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
        
        // 줌 기능 추가
        options.chart = {
          ...options.chart,
          zoom: {
            enabled: true,
            type: 'x',
            autoScaleYaxis: true,
          },
          toolbar: {
            show: true,
            tools: {
              download: true,
              selection: true,
              zoom: true,
              zoomin: true,
              zoomout: true,
              pan: true,
              reset: true,
            },
            autoSelected: 'zoom'
          }
        };
        
        // x축 라벨 개선
        options.xaxis = {
          ...options.xaxis,
          labels: {
            ...options.xaxis?.labels,
            hideOverlappingLabels: true,
            rotate: -45,
            rotateAlways: false,
            trim: true,
          }
        };
        
        // 막대 위 숫자 끄기
        options.dataLabels = {
          ...options.dataLabels,
          enabled: false,
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
        break;

      /** 파이 / 도넛 */
      case "pie":
      case "donut":
        options.labels = safeCategories as string[];      
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
          formatter: (_val: number, opts: any) => {
            const label = opts.w.globals.labels[opts.seriesIndex];
            const rawValue = opts.w.globals.series[opts.seriesIndex];
            return rawValue === 0 ? "" : `${label} ${rawValue}`;
          },
        };
        break;

      /** BoxPlot */
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

    let mergedYaxis = options.yaxis;

    if (customOptions?.yaxis) {
      // 둘 중 하나라도 배열이면 => 배열로 합쳐서 넘기기
      if (Array.isArray(options.yaxis) || Array.isArray(customOptions.yaxis)) {
        const baseArr = Array.isArray(options.yaxis)
          ? options.yaxis
          : options.yaxis
            ? [options.yaxis]
            : [];
        const customArr = Array.isArray(customOptions.yaxis)
          ? customOptions.yaxis
          : [customOptions.yaxis];

        mergedYaxis = [...baseArr, ...customArr];
      } else {
        // 둘 다 객체면 기존 옵션에 custom만 덮어쓰기
        mergedYaxis = {
          ...(options.yaxis as ApexYAxis),
          ...(customOptions.yaxis as ApexYAxis),
        };
      }
    }

    /** 사용자 옵션 병합 */
    return {
      ...options,
      ...customOptions,
      chart: {
        ...options.chart,
        ...customOptions?.chart,
        animations: {
          ...(options.chart?.animations ?? {}),
          ...(customOptions?.chart?.animations ?? {}),
        },
      },
      plotOptions: { ...options.plotOptions, ...customOptions?.plotOptions },
      fill: { ...options.fill, ...customOptions?.fill },
      stroke: { ...options.stroke, ...customOptions?.stroke },
      grid: { ...options.grid, ...customOptions?.grid },
      xaxis: { ...options.xaxis, ...customOptions?.xaxis },
      yaxis: mergedYaxis,
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
    xAxisTickAmount,
    yaxisOptions,
    customOptions,
    isStacked,
    showDonutTotal,
    enableDonutShadow,
    donutTitle,
    titleOptions,
    enableSlidingAnimation,
    slidingAnimationDuration,
    animationEasing,
    isAxisChart,
    safeCategories,
  ]);

  // 데이터 업데이트 시 부드러운 전환을 위한 effect
  useEffect(() => {
    if (chartRef.current && enableSlidingAnimation) {
      try {
        // ApexCharts의 updateSeries 메서드 사용
        chartRef.current.chart?.updateSeries(safeSeries, true);
      } catch (error) {
        console.warn('Chart update failed:', error);
      }
    }
  }, [safeSeries, enableSlidingAnimation]);

  // 최종적으로 사용할 width/height 결정
  const finalWidth = isPercentWidth ? calculatedWidth : width;
  const finalHeight = isPercentHeight ? calculatedHeight : height;

  return (
    <div
      ref={containerRef}
      style={{
        width: isPercentWidth ? width : 'auto',
        height: isPercentHeight ? height : 'auto',
        display: 'flex',
        flexDirection: 'column',
        flex: isPercentHeight || isPercentWidth ? 1 : 'none',
        ...style
      }}
    >
      <style>
        {`
          @keyframes fadeBlink {
            0% { opacity: 0.2; }
            50% { opacity: 1; }
            100% { opacity: 0.2; }
          }
        `}
      </style>
      {(finalHeight && finalWidth) && (
        <ReactApexChart
          ref={chartRef}
          options={baseOptions}
          series={safeSeries}
          type={normalizedType}
          width={finalWidth}
          height={finalHeight}
        />
      )}
    </div>
  );
}