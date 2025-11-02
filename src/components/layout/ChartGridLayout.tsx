import "@/styles/layout/chart-grid-layout.css";

interface ChartGridLayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * ChartGridLayout
 * - 대시보드 차트/그래프 영역 전용 공용 레이아웃
 * - 12열 grid 기반 + 통일된 여백, 간격, 반응형 제공
 * - 요약카드는 각 페이지에서 별도 구성
 */
export default function ChartGridLayout({ children, className = "" }: ChartGridLayoutProps) {
  return <div className={`chart-grid-layout ${className}`}>{children}</div>;
}
