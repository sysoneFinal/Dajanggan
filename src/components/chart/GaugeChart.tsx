import "/src/styles/layout/gaugeChart.css";

type GaugeChartProps = {
  value: number;        // 0~100
  color?: string;
  trackColor?: string;
  radius?: number;
};

export default function GaugeChart({
  value,
  color = "#8B5CF6",
  trackColor = "#E5E7EB",
  radius = 70,
}: GaugeChartProps) {
  const circumference = Math.PI * radius;
  const progress = (value / 100) * circumference;

  return (
    <div className="gauge-container">
      <svg width="180" height="110" viewBox="0 0 180 110">
        <path
          d={`M20,90 A${radius},${radius} 0 0,1 160,90`}
          stroke={trackColor}
          strokeWidth="15"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M20,90 A${radius},${radius} 0 0,1 160,90`}
          stroke={color}
          strokeWidth="15"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          style={{
            transition: "stroke-dashoffset 0.8s ease-out",
          }}
        />
      </svg>
      <h2 className="gauge-value">+{value}%</h2>
      <p className="gauge-desc">Increased this month</p>
    </div>
  );
}