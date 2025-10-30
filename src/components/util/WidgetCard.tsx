import "../../styles/util/widget-card.css";

interface WidgetCardProps {
  title?: string;
  span?: number;
  children: React.ReactNode;
  height?: number | string;
}

export default function WidgetCard({ title, children,  span, height = 300 }: WidgetCardProps) {
  return (
    <div className="widget-card" style={{ minHeight: height , gridColumn: `span ${span}` }}>
      {title && <h6 className="widget-title">{title}</h6>}
      <div className="widget-content">{children}</div>
    </div>
  );
}
