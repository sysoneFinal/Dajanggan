import trendUp from "../../assets/icon/trend-up.svg";
import trendDown from "../../assets/icon/trend-down.svg";
import "../../styles/util/summary-card.css";

type SummaryStatus = "info" | "warning" | "critical";

interface SummaryCardProps {
  label: string;
  value: string | number;
  diff?: number;
  desc?: string;
  status?: SummaryStatus;
}

export default function SummaryCard({
  label,
  value,
  diff = 0,
  desc,
  status = "info",
}: SummaryCardProps) {
  const isUp = diff > 0;
  const isDown = diff < 0;
  const trendClass = isUp ? "up" : isDown ? "down" : "flat";

  return (
    <div className={`summary-card ${status}`}>
      <p className="label">{label}</p>
      <h2>{value}</h2>

      <div className="summary-bottom">
        <div className={`trend ${trendClass}`}>
          {isUp ? (
            <img src={trendUp} alt="up" className="trend-icon" />
          ) : isDown ? (
            <img src={trendDown} alt="down" className="trend-icon" />
          ) : (
            <span className="trend-dash">–</span>
          )}
          <span className="trend-value">{isUp ? `+${diff}` : diff}</span>
        </div>
        <span className="desc">{desc}</span>
      </div>
    </div>
  );
}
