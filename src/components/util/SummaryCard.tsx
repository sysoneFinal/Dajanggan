import "../../styles/util/summary-card.css";

type SummaryStatus = "info" | "warning" | "critical";

interface SummaryCardProps {
  label: string;
  value: string | number;
  desc?: string;
  status?: SummaryStatus;
}

export default function SummaryCard({
  label,
  value,
  desc,
  status = "info",
}: SummaryCardProps) {
  return (
    <div className={`summary-card ${status}`}>
      <p className="label">{label}</p>
      <h2 className="value">{value}</h2>
      {desc && <span className="desc">{desc}</span>}
    </div>
  );
}
