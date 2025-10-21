import "/src/styles/layout/gaugeChart.css";


type GaugeChartProps = {
  value: number;        // 게이지 값 (0~100)
  color?: string;       // 게이지 색상
  trackColor?: string;  // 배경 색상
  radius?: number;      // 반지름 (크기 조절)
};

export default function GaugeChart({
  value,
  color = "#8B5CF6",       // 보라색
  trackColor = "#E5E7EB",  // 회색 배경
  radius = 70,
}: GaugeChartProps) {
  const circumference = Math.PI * radius;              // 반원 둘레
  const progress = (value / 100) * circumference;      // 채워질 길이 계산

  return (
    <div className="gauge-container">
      <svg width="180" height="110" viewBox="0 0 180 110">
        {/* 배경 트랙 (회색 라인) */}
        <path
          d={`M20,90 A${radius},${radius} 0 0,1 160,90`}
          stroke={trackColor}
          strokeWidth="15"
          fill="none"
          strokeLinecap="round"
        />

        {/* 실제 진행 부분 */}
        <path
          d={`M20,90 A${radius},${radius} 0 0,1 160,90`}
          stroke={color}
          strokeWidth="15"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
        />
      </svg>

      {/* 텍스트 영역 */}
      <h2 className="gauge-value">+{value}%</h2>
      <p className="gauge-desc">Increased this month</p>
    </div>
  );
}
