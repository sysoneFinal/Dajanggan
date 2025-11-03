import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import plus from "../../assets/icon/sidebar-plus.svg";
import minus from "../../assets/icon/sidebar-minus.svg";
import { SIDEBAR_MENU } from "./SidebarMenu";
import "../../styles/layout/sidebar.css";

interface MenuItem {
  label: string;
  path?: string;
  children?: MenuItem[];
}

interface SidebarProps {
  onChangeBreadcrumb: (path: string[]) => void;
}

export default function Sidebar({ onChangeBreadcrumb }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [isExpanded, setIsExpanded] = useState(true);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    Instance: true,
    Database: true,
  });
  const [activePath, setActivePath] = useState<string>("");

  useEffect(() => setActivePath(location.pathname), [location.pathname]);

  const toggleMenu = (label: string) => {
    if (label === "Instance" || label === "Database") return;
    setOpenMenus((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const handleNavigate = (path?: string, labels?: string[]) => {
    if (path) {
      navigate(path);
      if (onChangeBreadcrumb && labels) onChangeBreadcrumb(labels);
    }
  };

  const hasActiveChild = (item: MenuItem): boolean => {
    if (!item.children) return false;
    return item.children.some(
      (child) =>
        child.path === activePath ||
        (child.children && hasActiveChild(child))
    );
  };

  const renderMenu = (items: readonly MenuItem[], depth = 0): JSX.Element => (
    <div className={`sidebar_menu_level sidebar_menu_level_${depth}`}>
      {items.map((item) => {
        const descendantActive = hasActiveChild(item);
        const isActive = item.path === activePath;
        const isTopActive = depth === 0 && (isActive || descendantActive);
        const isSubActive = depth > 0 && isActive;
        const activeClass =
          item.label === "Instance" || item.label === "Database"
            ? ""
            : isTopActive || isSubActive
            ? "sidebar_link_active"
            : "";

        const isStatic = item.label === "Instance" || item.label === "Database";
        const customClass = isStatic
          ? `sidebar_link_static sidebar_link_${item.label.toLowerCase()}`
          : "";

        return (
          <div key={item.label}>
            <div
              className={`sidebar_link ${activeClass} ${customClass}`}
              onClick={() => {
                if (isStatic) return; // 클릭 비활성화
                if (item.children) {
                  toggleMenu(item.label);
                } else {
                  const breadcrumbTrail =
                    depth === 0
                      ? [item.label]
                      : depth === 1
                      ? [items.find((i) => i.label)?.label || "", item.label]
                      : ["Database", "Session", item.label];
                  handleNavigate(item.path, breadcrumbTrail);
                }
              }}
              style={{ cursor: isStatic ? "default" : "pointer" }}
            >
              <span>{item.label}</span>
              {item.children && !isStatic && (
                <img
                  src={openMenus[item.label] ? minus : plus}
                  alt="toggle"
                  className="sidebar_icon"
                />
              )}
            </div>

            {item.children &&
              openMenus[item.label] &&
              renderMenu(item.children, depth + 1)}
          </div>
        );
      })}
    </div>
  );

  return (
    <aside className={`sidebar ${isExpanded ? "sidebar_expanded" : ""}`}>
      <div className="sidebar_header">
        <div
          className="sidebar_logo_icon"
          onClick={() => setIsExpanded((prev) => !prev)}
          style={{ cursor: "pointer" }}
        >
          D
        </div>
        {isExpanded && <div className="sidebar_logo_text">Dajangan</div>}
      </div>

      {isExpanded && (
        <>
          <nav className="sidebar_nav">{renderMenu(SIDEBAR_MENU)}</nav>

          <div className="sidebar_footer">
            <div
              className="sidebar_footer_link"
              onClick={() => {navigate("/instance-management");
                onChangeBreadcrumb(["Instance Management"]);
              }}
            >
              Instance Management
            </div>
            <div
              className="sidebar_footer_link"
              onClick={() =>{ navigate("/alarm");
                onChangeBreadcrumb(["Alarm Settings"]);
              }}
            >
              Alarm Settings
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
