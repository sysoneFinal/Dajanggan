import "../../styles/util/widget-card.css";

interface WidgetCardProps {
  title?: string;
  subtitle?: string;
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
  subtitle,
  children,
  span = 1,
  className = "",
}: WidgetCardProps) {
  return (
    <div
      className={`widget-card ${className}`}
      style={{
        gridColumn: `span ${span}`,
      }}
    >
      {(title || subtitle) && (
        <div className="widget-header">
          {title && <h6 className="widget-title">{title}</h6>}
          {subtitle && <p className="widget-subtitle" title={subtitle}>{subtitle}</p>}
        </div>
      )}
      <div
        className="widget-content"
      >
        {children}
      </div>
    </div>
  );
}
