import "../../styles/util/csv-button.css";

type DownloadButtonProps = {
  tooltip?: string;
  onClick?: () => void;
};

export default function DownloadButton({ tooltip = "CSV 다운로드", onClick }: DownloadButtonProps) {
  return (
    <button className="csv-btn" onClick={onClick}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 384 512"               
        className="download-svgIcon"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M169.4 470.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L224 370.8 224 64c0-17.7-14.3-32-32-32s-32 14.3-32 32v306.7L54.6 265.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z" />
      </svg>
      <span className="download-icon" aria-hidden="true"></span>
      <span className="csv-tooltip">{tooltip}</span>
    </button>
  );
}