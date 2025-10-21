import { useState } from "react";
import arrowDown from "../../assets/icon/arrow-down.svg";

export default function SidebarDatabase({
  selectedDb,
  onSelectDb
}: {
  selectedDb: string | null;
  onSelectDb: (db: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dbList = ["db-01", "db-02", "db-03", "db-04"];

  const isActive = isOpen || !!selectedDb;

  return (
    <div className="sidebar__database">
      <div
        className={`sidebar__dropdown-btn ${isActive ? "sidebar__dropdown-btn--active" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedDb ?? "Database 선택"}</span>
        <img
          className="sidebar__icon"
          src={arrowDown}
          alt="toggle"
          style={{
            transform: isOpen ? "rotate(180deg)" : "none",
            transition: "transform 0.2s ease"
          }}
        />
      </div>

      {isOpen && (
        <div className="sidebar__dropdown-list">
          {dbList.map((db) => (
            <div
              key={db}
              className={`sidebar__dropdown-item ${
                selectedDb === db ? "sidebar__dropdown-item--active" : ""
              }`}
              onClick={() => {
                onSelectDb(db);
                setIsOpen(false);
              }}
            >
              {db}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
