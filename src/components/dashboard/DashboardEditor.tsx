import { useState } from "react";
import columnIcon from "@/assets/icon/column.svg";
import pieIcon from "@/assets/icon/pie.svg";
import lineIcon from "@/assets/icon/line.svg";
import areaIcon from "@/assets/icon/area.svg";
import barIcon from "@/assets/icon/bar.svg";
import scatterIcon from "@/assets/icon/scatter.svg";
import numberIcon from "@/assets/icon/number.svg";
import gaugeIcon from "@/assets/icon/gauge.svg";
import donutIcon from "@/assets/icon/donut.svg";
import listIcon from "@/assets/icon/list.svg";
import "@/styles/dashboard/dashboardEditor.css";

export default function DashboardEditorPanel() {
  const [selectedTheme, setSelectedTheme] = useState<string>("기본형");
  const [selectedChart, setSelectedChart] = useState<string>("Column");

  const themes = ["지표 6", "요약형"];
  const chartCategories = [
  {
    category: "기본형",
    charts: [
      { id: "Column", label: "Column", icon: columnIcon },
      { id: "Bar", label: "Bar", icon: barIcon },
      { id: "Line", label: "Line", icon: lineIcon },
      { id: "Area", label: "Area", icon: areaIcon },
    ],
  },
  {
    category: "분석형",
    charts: [
      { id: "Pie", label: "Pie", icon: pieIcon },
      { id: "Donut", label: "Donut", icon: donutIcon },
      { id: "Gauge", label: "Gauge", icon: gaugeIcon },
    ],
  },
  {
    category: "기타",
    charts: [
      { id: "Scatter", label: "Scatter", icon: scatterIcon },
      { id: "List", label: "List", icon: listIcon },
      { id: "Number", label: "Number", icon: numberIcon },
    ],
  },
  ];


  return (
    <aside className="editor-panel">
      {/* Theme Section */}
      <section className="editor-section">
        <h2 className="section-title">Theme</h2>
        <div className="theme-grid">
          {themes.map((theme) => (
            <button
              key={theme}
              className={`theme-item ${selectedTheme === theme ? "active" : ""}`}
              onClick={() => setSelectedTheme(theme)}
            >
              <div className="theme-thumb" />
              <span>{theme}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Metric Section */}
      <section className="editor-section">
        <h2 className="section-title">Metric</h2>
        <div className="metric-selectors">
          <select className="select-input">
            <option>Select Database</option>
            <option>DB-01</option>
            <option>DB-02</option>
          </select>
          <select className="select-input">
            <option>Select Metric</option>
            <option>CPU Usage</option>
            <option>Session Count</option>
          </select>
        </div>
      </section>

      {/* Chart Selector */}
      <section className="editor-section">
        <div className="chart-grid">
          {charts.map(({ id, label, icon }) => (
            <button
              key={id}
              className={`chart-item ${selectedChart === id ? "active" : ""}`}
              onClick={() => setSelectedChart(id)}
            >
              {/* ✅ <Icon /> → <img src={icon} /> 로 변경 */}
              <img
                src={icon}
                alt={label}
                className={`chart-icon ${selectedChart === id ? "selected" : ""}`}
              />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Card Previews */}
      <section className="editor-section">
        <div className="card-preview-grid">
          <div className="card small">기본 카드</div>
          <div className="card medium">요약 카드</div>
          <div className="card wide">넓은형 카드</div>
          <div className="card tall">긴 카드</div>
        </div>
      </section>
    </aside>
  );
}
