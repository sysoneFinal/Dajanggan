import "/src/styles/layout/gaugeChart.css";

export type GaugeType = "semi-circle" | "bar";
export type GaugeStatus = "normal" | "warning" | "critical";

type GaugeChartProps = {
  value: number;
  type?: GaugeType;
  status?: GaugeStatus; // 상태값 
  color?: string;       
  trackColor?: string;
  radius?: number;
  label?: string;
};

const STATUS_COLOR: Record<GaugeStatus, string> = {
  normal: "#7B61FF",   // 보라
  warning: "#FACC15",  // 노랑
  critical: "#EF4444", // 빨강
};

export default function GaugeChart({
   value,
  type = "semi-circle",
  status = "normal",
  color,
  trackColor = "#E5E7EB",
  radius = 70,
  label,
}: GaugeChartProps) {
    // 색상 및 설명 자동 결정
  const gaugeColor = color ?? STATUS_COLOR[status];

 
  // Bar 타입 게이지
  if (type === "bar") {
    return (
      <div className={`gauge-bar-container ${status}`}>
        {label && <div className="gauge-bar-label">{label}</div>}
        <div className="gauge-bar-wrapper">
          <div className="gauge-bar-track" style={{ background: trackColor }}>
            <div
              className="gauge-bar-progress"
              style={{
                width: `${value}%`,
                background: gaugeColor,
                transition: "width 0.8s ease-out",
              }}
            />
          </div>
          <div className="gauge-bar-value">{value}%</div>
        </div>
      </div>
    );
  }

  // 반원형 게이지
  const circumference = Math.PI * radius;
  const progress = (value / 100) * circumference;

  return (
       <div className="gauge-container">
      {/* 상단 라벨 */}
      {label && <div className="gauge-label">{label}</div>}

      {/* 범례 (Legend) */}
      <ul className="gauge-legend">
        <li>
          <span className="dot normal"></span>정상
        </li>
        <li>
          <span className="dot warn"></span>경고
        </li>
        <li>
          <span className="dot danger"></span>위험
        </li>
      </ul>

      {/* 반원형 게이지 */}
      <svg width="180" height="90" viewBox="0 0 180 100">
        <path
          d={`M20,80 A${radius},${radius} 0 0,1 160,80`}
          stroke={trackColor}
          strokeWidth="15"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M20,80 A${radius},${radius} 0 0,1 160,80`}
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
  );
}
