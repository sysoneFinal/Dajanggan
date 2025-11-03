import "/src/styles/layout/gaugeChart.css";

export type GaugeType = "semi-circle" | "bar";
export type GaugeStatus = "info" | "warning" | "critical";

interface GaugeChartProps {
  value: number;
  type?: GaugeType;
  status?: GaugeStatus;
  color?: string;
  trackColor?: string;
  radius?: number;
  strokeWidth?: number;
  height?: number;
  flattenRatio?: number; // ✅ 추가
  label?: string;
}

const STATUS_COLOR: Record<GaugeStatus, string> = {
  info: "#7B61FF",
  warning: "#FACC15",
  critical: "#EF4444",
};

export default function GaugeChart({
  value,
  type = "semi-circle",
  status = "info",
  color,
  trackColor = "#E5E7EB",
  radius = 70,
  strokeWidth = 14, 
  height = 140,     
  flattenRatio = 0.75, /** 납작 정도  */
  label,
}: GaugeChartProps) {
  const gaugeColor = color ?? STATUS_COLOR[status];
  const circumference = Math.PI * radius;
  const progress = (value / 100) * circumference;

  if (type !== "semi-circle") return null;

  const svgWidth = radius * 2.5;
  const svgHeight = height;

  return (
    <div className="gauge-container" style={{ height }}>
      <ul className="gauge-legend">
        <li><span className="dot normal"></span>정상</li>
        <li><span className="dot warn"></span>경고</li>
        <li><span className="dot danger"></span>위험</li>
      </ul>

      {label && <div className="gauge-label">{label}</div>}

      <div className="gauge-svg-wrapper">
        <svg
          className="gauge-svg"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* 트랙 */}
          <path
            d={`M${strokeWidth},${radius} A${radius},${radius * flattenRatio} 0 0,1 ${svgWidth - strokeWidth},${radius}`}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
          />
          {/* 진행률 */}
          <path
            d={`M${strokeWidth},${radius} A${radius},${radius * flattenRatio} 0 0,1 ${svgWidth - strokeWidth},${radius}`}
            stroke={gaugeColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
          />
        </svg>

        <h2 className="gauge-value">{value}%</h2>
      </div>
    </div>
  );
}
