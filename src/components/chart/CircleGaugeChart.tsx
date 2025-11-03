import "../../styles/util/circle-gauge-chart.css"

interface CircleGaugeChartProps {
  label: string;          // 중앙 라벨
  value: number;          // 0~100 (%)
  size?: number;          // 차트 전체 크기
  thickness?: number;     // 게이지 두께
  color?: string;         // 게이지 색상
  backgroundColor?: string; // 트랙 색상
}

/**
 * CircleGaugeChart
 */
export default function CircleGaugeChart({
  label,
  value,
  size = 130,
  thickness = 18,
  color = "#7B61FF",
  backgroundColor = "#F3F4F6",
}: CircleGaugeChartProps) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div
      className="circle-gauge-container"
      style={{ width: size, height: size }}
    >
      <svg
        className="circle-gauge-svg"
        width={size}
        height={size}
      >
        {/* 회색 트랙 */}
        <circle
          className="circle-gauge-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={thickness}
        />

        {/* 보라 게이지 */}
        <circle
          className="circle-gauge-bar"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={thickness}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>

      {/* 중앙 텍스트 */}
      <div className="circle-gauge-label">
        <div className="circle-gauge-title">{label}</div>
        <div className="circle-gauge-value">{Math.round(value)}%</div>
      </div>
    </div>
  );
}
