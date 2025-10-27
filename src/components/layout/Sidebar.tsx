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

  const [isExpanded, setIsExpanded] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [activePath, setActivePath] = useState<string>("");

  useEffect(() => setActivePath(location.pathname), [location.pathname]);

  const toggleMenu = (label: string) =>
    setOpenMenus((prev) => ({ ...prev, [label]: !prev[label] }));

  const handleNavigate = (path?: string, labels?: string[]) => {
    if (path) {
      navigate(path);
      if (onChangeBreadcrumb && labels) onChangeBreadcrumb(labels);
    }
  };

  // 하위에 현재 활성 경로가 포함되어 있는지 확인
  const hasActiveChild = (item: MenuItem): boolean => {
    if (!item.children) return false;
    return item.children.some(
      (child) =>
        child.path === activePath ||
        (child.children && hasActiveChild(child))
    );
  };

const renderMenu = (items: readonly MenuItem[], depth = 0): JSX.Element => (
    <div className={`sidebar__menu-level sidebar__menu-level--${depth}`}>
      {items.map((item) => {
        const descendantActive = hasActiveChild(item);
        const isActive = item.path === activePath;

        // 최상위는 하위가 active일 때만 검정
        const isTopActive =
          depth === 0 && (isActive || descendantActive);
        // 하위는 자기 자신 active일 때만 회색
        const isSubActive = depth > 0 && isActive;

        const activeClass =
          isTopActive || isSubActive ? "sidebar__link--active" : "";

        return (
          <div key={item.label}>
            <div
              className={`sidebar__link ${activeClass}`}
              onClick={() => {
                if (item.children) {
                  toggleMenu(item.label);
                } else {
                  // breadcrumb 경로 계산 (depth에 따라 다름)
                  const breadcrumbTrail =
                    depth === 0
                      ? [item.label]
                      : depth === 1
                      ? [items.find(i => i.label)?.label || "", item.label]
                      : ["Database", "Session", item.label]; // 필요시 기본값
                  
                  handleNavigate(item.path, breadcrumbTrail);
                }
              }}

              // style={{ paddingLeft: `${depth * 1}rem` }}
            >
              <span>{item.label}</span>
              {item.children && (
                <img
                  src={openMenus[item.label] ? minus : plus}
                  alt="toggle"
                  className="sidebar__icon"
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
    <aside
      className={`sidebar ${isExpanded ? "sidebar--expanded" : ""}`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="sidebar__header">
        <div className="sidebar__logo-icon">D</div>
        {isExpanded && <div className="sidebar__logo-text">Dajangan</div>}
      </div>

      {isExpanded && (
        <>
          <nav className="sidebar__nav">{renderMenu(SIDEBAR_MENU)}</nav>

          <div className="sidebar__footer">
            <div
              className="sidebar__footer-link"
              onClick={() => navigate("/instance-management")}
            >
              Instance Management
            </div>
            <div
              className="sidebar__footer-link"
              onClick={() => navigate("/alarm")}
            >
              Alarm Settings
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
