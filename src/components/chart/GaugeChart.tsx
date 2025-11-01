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
  label?: string;
}

const STATUS_COLOR: Record<GaugeStatus, string> = {
  info: "#7B61FF",   // 보라
  warning: "#FACC15",  // 노랑
  critical: "#EF4444", // 빨강
};

export default function GaugeChart({
  value,
  type = "semi-circle",
  status = "info",
  color,
  trackColor = "#E5E7EB",
  radius = 70,
  label,
}: GaugeChartProps) {
  const gaugeColor = color ?? STATUS_COLOR[status];

  const circumference = Math.PI * radius;
  const progress = (value / 100) * circumference;

  // 반원형 전용
  if (type !== "semi-circle") return null;

  return (
    <div className="gauge-container">
      {/* 상단 범례 (디자인 그대로) */}
      <ul className="gauge-legend">
        <li><span className="dot normal"></span>정상</li>
        <li><span className="dot warn"></span>경고</li>
        <li><span className="dot danger"></span>위험</li>
      </ul>

      {/* 라벨 (위쪽) */}
      {label && <div className="gauge-label">{label}</div>}

      {/* 반원형 게이지 */}
      <div className="gauge-svg-wrapper">
        <svg
          className="gauge-svg"
          viewBox={`0 0 ${radius * 2.6} ${radius * 1.4}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* 트랙 */}
          <path
            d={`M20,${radius + 10} A${radius},${radius} 0 0,1 ${radius * 2.3},${radius + 10}`}
            stroke={trackColor}
            strokeWidth="15"
            fill="none"
            strokeLinecap="round"
          />
          {/* 진행률 */}
          <path
            d={`M20,${radius + 10} A${radius},${radius} 0 0,1 ${radius * 2.3},${radius + 10}`}
            stroke={gaugeColor}
            strokeWidth="15"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
          />
        </svg>

        {/* 중앙 값 */}
        <h2 className="gauge-value">{value}%</h2>
      </div>
    </div>
  );
}
