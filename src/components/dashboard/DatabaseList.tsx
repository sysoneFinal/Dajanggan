import "@/styles/dashboard/database-list.css";
import rightArrowIcon from "../../assets/icon/right-arrow.svg";

interface Database {
  name: string;
}

interface Props {
  databases: Database[];
  selectedDb: string;
  onSelect: (db: string) => void;
}

export default function DatabaseList({ databases, selectedDb, onSelect }: Props) {
  return (
    <div className="db-sm-container">
      <div className="db-sm-header">
        <p className="db-sm-desc">
          Database를 선택하여 상태를 확인하세요.
        </p>
      </div>

      <div className="db-sm-list">
        {databases.map((db) => (
          <button
            key={db.name}
            className={`db-sm-item ${selectedDb === db.name ? "active" : ""}`}
            onClick={() => onSelect(db.name)}
          >
            <span className="db-sm-name">{db.name}</span>
            <img src={rightArrowIcon} alt="Select Database" />
          </button>
        ))}
      </div>
    </div>
  );
}
