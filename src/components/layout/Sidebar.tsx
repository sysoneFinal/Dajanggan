import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import plus from "../../assets/icon/sidebar-plus.svg";
import minus from "../../assets/icon/sidebar-minus.svg";
import arrowDown from "../../assets/icon/arrow-down.svg";
import "../../styles/layout/sidebar.css";

type MainItem = "Overview" | "Instance" | "Event";

const INSTANCE_MENUS = ["Instance Management", "CPU", "Memory", "I/O", "Checkpoint", "BG Writer"];
const DB_LIST = ["db-01", "db-02", "db-03", "db-04"];

const DB_SUBMENUS: Record<string, string[] | null> = {
  Session: null,
  "Hot Spot": ["Hot Table", "Hot Index"],
  Vacuum: null,
  Query: ["Query Overview", "Top-N Query", "Query 분석"],
};

const ROUTE_MAP: Record<string, string> = {
  "Instance Management": "/instance-management",
  CPU: "/cpu",
  Memory: "/memory",
  "I/O": "/io",
  Checkpoint: "/checkpoint",
  "BG Writer": "/bg-writer",
  Session: "/session",
  Vacuum: "/vacuum",
  Query: "/query",
  "Query Overview": "/query/overview",
  "Top-N Query": "/query/top-n",
  "Query 분석": "/query/analysis",
  "Hot Table": "/engine/hottable",
  "Hot Index": "/engine/hotindex",
  Overview: "/overview",
  Event: "/event",
  Alarm: "/alarm",
};

const PATH_TO_LABEL = Object.entries(ROUTE_MAP).reduce<Record<string, string>>((acc, [label, path]) => {
  acc[path] = label;
  return acc;
}, {});

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeMain, setActiveMain] = useState<MainItem>("Overview");
  const [activePath, setActivePath] = useState<string | null>(null);
  const [isInstanceOpen, setIsInstanceOpen] = useState(false);
  const [isDbOpen, setIsDbOpen] = useState(false);
  const [selectedDb, setSelectedDb] = useState<string | null>(null);
  const [openDbSubmenus, setOpenDbSubmenus] = useState<Record<string, boolean>>({});
  const [isExpanded, setIsExpanded] = useState(false);

  // === URL 감지 ===
  useEffect(() => {
    const currentLabel = PATH_TO_LABEL[location.pathname];
    if (currentLabel) {
      setActivePath(currentLabel);
      for (const [menu, subItems] of Object.entries(DB_SUBMENUS)) {
        if (subItems?.includes(currentLabel)) {
          setOpenDbSubmenus((prev) => ({ ...prev, [menu]: true }));
          break;
        }
      }
      if (INSTANCE_MENUS.some((menu) => ROUTE_MAP[menu] === location.pathname)) {
        setIsInstanceOpen(true);
        setActiveMain("Instance");
      }
    }
  }, [location.pathname]);

  const onClickMain = (item: MainItem) => {
    setActiveMain(item);
    setActivePath(item);
    if (item !== "Instance") setIsInstanceOpen(false);
    const path = ROUTE_MAP[item];
    if (path) navigate(path);
  };

  const toggleInstance = () => setIsInstanceOpen((v) => !v);
  const onSelectDb = (db: string) => {
    setSelectedDb(db);
    setIsDbOpen(false);
    setOpenDbSubmenus({});
  };

  const toggleDbSubmenu = (menu: string) =>
    setOpenDbSubmenus((prev) => ({ ...prev, [menu]: !prev[menu] }));

  const onClickSubChild = (sub: string) => {
    setActivePath(sub);
    const targetPath = ROUTE_MAP[sub];
    if (targetPath) navigate(targetPath);
  };

  return (
    <aside
      className={`sidebar ${isExpanded ? "sidebar--expanded" : ""}`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* HEADER */}
      <div className={`sidebar__header ${!isExpanded ? "sidebar__header--collapsed" : ""}`}>
        <div className="sidebar__logo">
          <div className="sidebar__logo-icon">D</div>
        </div>
        {isExpanded && <div className="sidebar__logo-text">Dajangan</div>}
      </div>

      {/* NAVIGATION */}
      {isExpanded && (
        <>
          <nav className="sidebar__nav">
            {/* Overview */}
            <div
              className={`sidebar__link ${activeMain === "Overview" ? "sidebar__link--active" : ""}`}
              onClick={() => onClickMain("Overview")}
            >
              <div className="sidebar__link-text">Overview</div>
            </div>

            {/* Instance */}
            <div
              className={`sidebar__link ${activeMain === "Instance" ? "sidebar__link--active" : ""}`}
              onClick={toggleInstance}
            >
              <div className="sidebar__link-text">Instance</div>
              <img className="sidebar__icon" src={isInstanceOpen ? minus : plus} alt="toggle" />
            </div>

            {isInstanceOpen && (
              <div className="sidebar__submenu">
                {INSTANCE_MENUS.map((m) => (
                  <div
                    key={m}
                    className={`sidebar__submenu-item ${activePath === m ? "sidebar__submenu-item--active" : ""}`}
                    onClick={() => {
                      setActivePath(m);
                      const path = ROUTE_MAP[m];
                      if (path) navigate(path);
                    }}
                  >
                    {m}
                  </div>
                ))}
              </div>
            )}

            {/* DB 선택 */}
            <div className="sidebar__database">
              <div
                className={`sidebar__dropdown-btn ${selectedDb ? "sidebar__dropdown-btn--active" : ""}`}
                onClick={() => setIsDbOpen((v) => !v)}
              >
                <span>{selectedDb ?? "Database 선택"}</span>
                <img
                  className="sidebar__icon"
                  src={arrowDown}
                  alt="open"
                  style={{ transform: isDbOpen ? "rotate(180deg)" : "none" }}
                />
              </div>

              {isDbOpen && (
                <div className="sidebar__dropdown-list">
                  {DB_LIST.map((db) => (
                    <div
                      key={db}
                      className={`sidebar__dropdown-item ${selectedDb === db ? "sidebar__dropdown-item--active" : ""}`}
                      onClick={() => onSelectDb(db)}
                    >
                      {db}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* DB 하위 메뉴 */}
            {selectedDb && (
              <div className="sidebar__db-submenu">
                {Object.entries(DB_SUBMENUS).map(([menu, subItems]) => (
                  <div key={menu}>
                    <div
                      className={`sidebar__db-submenu-item ${
                        openDbSubmenus[menu] || activePath === menu ? "sidebar__db-submenu-item--active" : ""
                      }`}
                      onClick={() => {
                        if (subItems) toggleDbSubmenu(menu);
                        else {
                          setActivePath(menu);
                          const path = ROUTE_MAP[menu];
                          if (path) navigate(path);
                        }
                      }}
                    >
                      <span>{menu}</span>
                      {subItems && (
                        <img
                          src={openDbSubmenus[menu] ? minus : plus}
                          alt="toggle"
                          className="sidebar__icon"
                          style={{ marginLeft: "auto" }}
                        />
                      )}
                    </div>

                    {subItems && openDbSubmenus[menu] && (
                      <div className="sidebar__submenu sidebar__submenu--nested">
                        {subItems.map((sub) => (
                          <div
                            key={sub}
                            className={`sidebar__submenu-item ${activePath === sub ? "sidebar__submenu-item--active" : ""}`}
                            onClick={() => onClickSubChild(sub)}
                          >
                            {sub.replace(/^Query\s/, "")}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Event */}
            <div
              className={`sidebar__link ${activeMain === "Event" ? "sidebar__link--active" : ""}`}
              onClick={() => onClickMain("Event")}
            >
              <div className="sidebar__link-text">Event</div>
            </div>
          </nav>

          <div className="sidebar__footer">
            <div className="sidebar__footer-link" onClick={() => navigate(ROUTE_MAP.Alarm)}>
              Alarm Settings
            </div>
            <div className="sidebar__footer-link">Team</div>
          </div>
        </>
      )}
    </aside>
  );
}
