import "../../styles/util/widget-card.css";

interface WidgetCardProps {
  title?: string;
  span?: number;
  children: React.ReactNode;
  className?: string;
}

/**
 * WidgetCard
 * - 내부 콘텐츠(차트)가 부모 높이에 맞춰 자동 리사이즈됨
 */
export default function WidgetCard({
  title,
  children,
  span = 1,
  className = "",
}: WidgetCardProps) {
  return (
    <div
      className={`widget-card ${className}`}
      style={{
        gridColumn: `span ${span}`,
        display: "flex",
        flexDirection: "column",
        height: "100%", // 부모 grid item 높이 전체 채움
      }}
    >
      {title && <h6 className="widget-title">{title}</h6>}
      <div
        className="widget-content"
        style={{
          flex: 1, // 내부 차트가 남은 공간 전체 차지
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </div>
    </div>
  );
}
