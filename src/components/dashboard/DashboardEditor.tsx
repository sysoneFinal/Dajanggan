import { useState, useEffect } from "react";
import columnIcon from "@/assets/icon/column.svg";
import columnActiveIcon from "@/assets/icon/column-active.svg";
import pieIcon from "@/assets/icon/pie.svg";
import pieActiveIcon from "@/assets/icon/pie-active.svg";
import lineIcon from "@/assets/icon/line.svg";
import lineActiveIcon from "@/assets/icon/line-active.svg";
import areaIcon from "@/assets/icon/area.svg";
import areaActiveIcon from "@/assets/icon/area-active.svg";
import barIcon from "@/assets/icon/bar.svg";
import barActiveIcon from "@/assets/icon/bar-active.svg";
import scatterIcon from "@/assets/icon/scatter.svg";
import scatterActiveIcon from "@/assets/icon/scatter-active.svg";
import numberIcon from "@/assets/icon/number.svg";
import numberActiveIcon from "@/assets/icon/number-active.svg";
import gaugeIcon from "@/assets/icon/gauge.svg";
import gaugeActiveIcon from "@/assets/icon/gauge-active.svg";
import donutIcon from "@/assets/icon/donut.svg";
import donutActiveIcon from "@/assets/icon/donut-active.svg";
import listIcon from "@/assets/icon/list.svg";
import listActiveIcon from "@/assets/icon/list-active.svg";
import allCustomIcon from "@/assets/icon/all-custom.svg";
import allCustomActiveIcon from "@/assets/icon/all-custom-active.svg";
import card7Icon from "@/assets/icon/7card.svg";
import card7ActiveIcon from "@/assets/icon/7card-active.svg";
import card9Icon from "@/assets/icon/9card.svg";
import card9ActiveIcon from "@/assets/icon/9card-active.svg";
import "@/styles/dashboard/dashboardEditor.css";

interface DashboardEditorPanelProps {
  currentTheme: string;
  onThemeChange: (id: string) => void;
}

/**
 * DashboardEditorPanel
 * 테마 및 차트 선택 전용 편집 패널
 * (저장은 Header에서 처리)
 */
export default function DashboardEditorPanel({
  currentTheme,
  onThemeChange,
}: DashboardEditorPanelProps) {
  const [selectedChart, setSelectedChart] = useState<string>("Column");

  /** 테마 정의 (아이콘 기반) */
  const themes = [
    { id: "custom", label: "All Custom", icon: allCustomIcon, activeIcon: allCustomActiveIcon },
    { id: "card_7_layout", label: "카드 7개", icon: card7Icon, activeIcon: card7ActiveIcon },
    { id: "card_9_layout", label: "카드 9개", icon: card9Icon, activeIcon: card9ActiveIcon },
  ];

  /** 차트 정의 */
  const chartCategories = [
    {
      category: "기본형",
      charts: [
        { id: "Column", label: "Column", icon: columnIcon, activeIcon: columnActiveIcon },
        { id: "Bar", label: "Bar", icon: barIcon, activeIcon: barActiveIcon },
        { id: "Line", label: "Line", icon: lineIcon, activeIcon: lineActiveIcon },
        { id: "Area", label: "Area", icon: areaIcon, activeIcon: areaActiveIcon },
      ],
    },
    {
      category: "분석형",
      charts: [
        { id: "Pie", label: "Pie", icon: pieIcon, activeIcon: pieActiveIcon },
        { id: "Donut", label: "Donut", icon: donutIcon, activeIcon: donutActiveIcon },
        { id: "Gauge", label: "Gauge", icon: gaugeIcon, activeIcon: gaugeActiveIcon },
      ],
    },
    {
      category: "기타",
      charts: [
        { id: "Scatter", label: "Scatter", icon: scatterIcon, activeIcon: scatterActiveIcon },
        { id: "List", label: "List", icon: listIcon, activeIcon: listActiveIcon },
        { id: "Number", label: "Number", icon: numberIcon, activeIcon: numberActiveIcon },
      ],
    },
  ];

  /** 선택된 차트 미리보기 */
  const selectedChartData = chartCategories
    .flatMap(({ charts }) => charts)
    .find((chart) => chart.id === selectedChart);

  useEffect(() => {
    if (currentTheme && !themes.some((t) => t.id === currentTheme)) return;
  }, [currentTheme]);

  return (
    <aside className="editor-panel">
      {/* ================= Theme Section ================= */}
      <section className="editor-section">
        <h2 className="section-title">Theme</h2>
        <div className="theme-grid">
          {themes.map(({ id, label, icon, activeIcon }) => {
            const isActive = currentTheme === id;
            return (
              <button
                key={id}
                className={`theme-item ${isActive ? "active" : ""}`}
                onClick={() => onThemeChange(id)}
              >
                <img
                  src={isActive ? activeIcon : icon}
                  alt={`${label} theme`}
                  className="theme-thumb"
                />
              </button>
            );
          })}
        </div>
      </section>

      {/* ================= Metric Section ================= */}
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

      {/* ================= Chart Selector ================= */}
      <section className="editor-section chart-section">
        <div className="chart-grid">
          {chartCategories
            .flatMap(({ charts }) => charts)
            .map(({ id, label, icon, activeIcon }) => {
              const isActive = selectedChart === id;
              return (
                <button
                  key={id}
                  className={`chart-item ${isActive ? "active" : ""}`}
                  onClick={() => setSelectedChart(id)}
                >
                  <img
                    src={isActive ? activeIcon : icon}
                    alt={label}
                    className="chart-icon"
                  />
                  <span>{label}</span>
                </button>
              );
            })}
        </div>
      </section>

      {/* ================= Preview Section ================= */}
      <section className="editor-section">
        <h2 className="section-title">Preview</h2>
        <div className="card-preview-single">
          {selectedChartData && (
            <img
              src={selectedChartData.activeIcon}
              alt={`${selectedChartData.label} preview`}
              className="preview-chart-img"
            />
          )}
        </div>
      </section>
    </aside>
  );
}
