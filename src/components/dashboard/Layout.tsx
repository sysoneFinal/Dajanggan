import { useState } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import type { Layout, Layouts } from "react-grid-layout";

import "react-resizable/css/styles.css";
import "react-grid-layout/css/styles.css";
import "../../styles/dashboard/Layout.css";


/** * * @param basic-7card 
 *    { w: 8, h: 6, x: 0, y: 0, i: "a" },
    { w: 8, h: 6, x: 8, y: 0, i: "b" },
    { w: 8, h: 6, x: 16, y: 0, i: "c" },
    { w: 16, h: 6, x: 0, y: 6, i: "d" },
    { w: 8, h: 6, x: 0, y: 12, i: "e" },
    { w: 16, h: 6, x: 8, y: 12, i: "f" },
    { w: 8, h: 6, x: 16, y: 6, i: "g" }, */ 
/** * * @param 빽빽-9card
 * { "w": 8,"h": 6,"x": 0,"y": 0,"i": "a"}, 
 * { "w": 8,"h": 6,"x": 8,"y": 0,"i": "b"}, 
 * { "w": 8,"h": 6,"x": 16, "y": 0,"i": "c",}, 
 * { "w": 8,"h": 6,"x": 0,"y": 12,"i": "d",}, 
 * { "w": 8,"h": 6,"x": 0,"y": 6,"i": "e",}, 
 * { "w": 8,"h": 6,"x": 8,"y": 6,"i": "f",}, 
 * { "w": 8,"h": 6,"x": 16,"y": 6,"i": "g",}, 
 * { "w": 8,"h": 6, "x": 8,"y": 12,"i": "h",}, 
{ "w": 8,"h": 6,"x": 16,"y": 12,"i": "i",} */

interface DashboardProps {
  isEditing?: boolean;
}

const ResponsiveGridLayout = WidthProvider(Responsive);

export default function Dashboard({ isEditing }: DashboardProps) {
  /** 기본 레이아웃  */
  const defaultLayouts: Layouts = {
    lg: [
      // @param basic-6card 
  { w: 8, h: 12, x: 0, y: 0, i: "a" }, 
  { w: 8, h: 6, x: 8, y: 0, i: "b" },
  { w: 8, h: 6, x: 16, y: 0, i: "c" }, 
  { w: 16, h: 6, x: 8, y: 6, i: "d" }, 
  { w: 8, h: 6, x: 0, y: 12, i: "e" }, 
  { w: 16, h: 6, x: 8, y: 12, i: "f" }, 
    ],
    md: [],
    sm: [],
  };

  /** 로컬 스토리지에서 불러오기 */
  const [layouts, setLayouts] = useState<Layouts>(() => {
    try {
      const saved = localStorage.getItem("userDashboardLayout");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.lg) return parsed;
      }
    } catch (e) {
      console.warn("레이아웃 불러오기 실패, 기본값 사용", e);
    }
    return defaultLayouts;
  });

  /** 변경 시 저장 */
  const handleLayoutChange = (currentLayout: Layout[], allLayouts: Layouts) => {
    setLayouts(allLayouts);
    localStorage.setItem("userDashboardLayout", JSON.stringify(allLayouts, null, 2));
    console.log("저장된 레이아웃:", allLayouts);
  };

  /** 카드 추가 */
  const handleAddCard = () => {
    const newCard: Layout = {
      i: `new-${Date.now()}`,
      x: 0,
      y: Infinity,
      w: 8,
      h: 6,
    };
    setLayouts((prev) => ({
      ...prev,
      lg: [...(prev.lg || []), newCard],
    }));
  };

  /** 카드 삭제 */
  const handleRemoveCard = (id: string) => {
    setLayouts((prev) => ({
      ...prev,
      lg: prev.lg?.filter((item) => item.i !== id) || [],
    }));
  };

  /** 전체 리셋 */
  const handleResetLayout = () => {
    localStorage.removeItem("userDashboardLayout");
    setLayouts(defaultLayouts);
  };

  return (
    <div className={`dashboard-wrapper ${isEditing ? "editing" : ""}`}>
      {isEditing && (
        <div className="dashboard-toolbar">
          <button onClick={handleAddCard}>＋ Add Widget</button>
          <button onClick={handleResetLayout}>↺ Reset Layout</button>
        </div>
      )}

      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 24, md: 20, sm: 12 }}
        rowHeight={40}
        isDraggable={isEditing}
        isResizable={isEditing}
        preventCollision={false}
        compactType="vertical"
        onLayoutChange={handleLayoutChange}
      >
        {layouts.lg?.map((item : any) => (
          <div key={item.i} className="grid-item">
            <div className="grid-header">
              <span>{item.i.toUpperCase()}</span>
              {isEditing && (
                <button className="remove-btn" onClick={() => handleRemoveCard(item.i)}>
                  ✕
                </button>
              )}
            </div>
            <div className="grid-body">Card {item.i.toUpperCase()}</div>
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}
