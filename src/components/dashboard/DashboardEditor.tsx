import { useState, useEffect } from "react";
import metrics from "../chart/Metrics.json"; 
import { flattenMetrics } from "../../util/falttenMetrics";

// === 아이콘 임포트 ===
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
 * - 테마 / 지표 / 차트 선택
 * - 드래그 앤 드롭 미리보기
 */
export default function DashboardEditorPanel({
  currentTheme,
  onThemeChange,
}: DashboardEditorPanelProps) {
  const [selectedChart, setSelectedChart] = useState<string>("");
  const [selectedMetric, setSelectedMetric] = useState<string>("");
  const [availableCharts, setAvailableCharts] = useState<string[]>([]);

  /** 테마 목록 */
  const themes = [
    { id: "custom", label: "All Custom", icon: allCustomIcon, activeIcon: allCustomActiveIcon },
    { id: "card_7_layout", label: "카드 7개", icon: card7Icon, activeIcon: card7ActiveIcon },
    { id: "card_9_layout", label: "카드 9개", icon: card9Icon, activeIcon: card9ActiveIcon },
  ];

  /** 전체 차트 타입 정의 */
  const chartTypes = [
    { id: "column", label: "Column", icon: columnIcon, activeIcon: columnActiveIcon },
    { id: "bar", label: "Bar", icon: barIcon, activeIcon: barActiveIcon },
    { id: "line", label: "Line", icon: lineIcon, activeIcon: lineActiveIcon },
    { id: "area", label: "Area", icon: areaIcon, activeIcon: areaActiveIcon },
    { id: "pie", label: "Pie", icon: pieIcon, activeIcon: pieActiveIcon },
    { id: "donut", label: "Donut", icon: donutIcon, activeIcon: donutActiveIcon },
    { id: "gauge", label: "Gauge", icon: gaugeIcon, activeIcon: gaugeActiveIcon },
    { id: "scatter", label: "Scatter", icon: scatterIcon, activeIcon: scatterActiveIcon },
    { id: "list", label: "List", icon: listIcon, activeIcon: listActiveIcon },
    { id: "number", label: "Number", icon: numberIcon, activeIcon: numberActiveIcon },
  ];

  /** Metrics 파싱 */
  const parsedMetrics = flattenMetrics(metrics);

  /** Metric 변경 시 available_charts 반영 */
  const handleMetricChange = (metricKey: string) => {
    setSelectedMetric(metricKey);
    const metricInfo = parsedMetrics[metricKey];
    if (metricInfo?.available_charts) {
      setAvailableCharts(metricInfo.available_charts.map((c: string) => c.toLowerCase()));
      setSelectedChart(metricInfo.default_chart || metricInfo.available_charts[0]);
    } else {
      setAvailableCharts([]);
      setSelectedChart("");
    }
  };

  /** 보여줄 차트 필터링 */
  const visibleCharts =
    availableCharts.length > 0
      ? chartTypes.filter((chart) => availableCharts.includes(chart.id))
      : [];

  /** 선택된 차트 데이터 */
  const selectedChartData = chartTypes.find((chart) => chart.id === selectedChart);

  /** 안내문 상태 계산 */
  const isCustom = currentTheme === "custom";
  const isTemplate = currentTheme.startsWith("card_");

  useEffect(() => {
    if (currentTheme && !themes.some((t) => t.id === currentTheme)) return;
  }, [currentTheme]);

  return (
    <aside className="editor-panel">
      {/* === 안내문 === */}
      <div className="editor-guide">
        {isCustom ? (
          <>
            🎨 <strong>Custom 모드</strong>입니다.
            <br />
            ↳ 원하는 지표를 선택하고 드래그하여 <strong>새 위젯</strong>을 추가하세요.
          </>
        ) : isTemplate ? (
          <>
            🧩 <strong>Theme 모드</strong>입니다.
            <br />
            ↳ 지표를 선택한 후, <strong>기존 카드 위로 드롭</strong>하면 교체됩니다.
            <br />
            (새 위젯 추가는 불가능)
          </>
        ) : (
          <>
            📊 대시보드 편집 모드입니다.
            <br />
            테마를 선택하여 대시보드를 구성할 수 있습니다.
          </>
        )}
      </div>

      {/* === 테마 선택 === */}
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
                <span className="theme-label">{label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* === Metric 선택 === */}
      <section className="editor-section">
        <h2 className="section-title">Metric</h2>
        <div className="metric-selectors">
          <select className="select-input">
            <option>Select Database</option>
            <option>DB-01</option>
            <option>DB-02</option>
          </select>
          <select
            className="select-input"
            value={selectedMetric}
            onChange={(e) => handleMetricChange(e.target.value)}
          >
            <option value="">Select Metric</option>
            {Object.entries(parsedMetrics).map(([key, value]: any) => (
              <option key={key} value={key}>
                {value.title}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* === Chart 선택 === */}
      <section className="editor-section chart-section">
        {visibleCharts.length > 0 ? (
          <div className="chart-grid">
            {visibleCharts.map(({ id, label, icon, activeIcon }) => {
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
        ) : (
          <div className="empty-chart-container">
            <p className="empty-chart-text">지표를 선택하면 차트 유형이 표시됩니다.</p>
          </div>
        )}
      </section>
      {/* 프리뷰 드래그 앤 드롭으로 차트 등록 */}
<section className="editor-section">
  <h2 className="section-title">Preview</h2>

  <div
    className={`card-preview-single ${!isCustom && !isTemplate ? "disabled" : ""}`}
    draggable={!!selectedMetric && !!selectedChart}
    onDragStart={(e) => {
      if (!selectedMetric || !selectedChart) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.effectAllowed = "copy";
      e.dataTransfer.setData(
        "application/json",
        JSON.stringify({
          metricKey: selectedMetric,
          chartType: selectedChart,
        })
      );
    }}
    onMouseDown={(e) => {
      // 이미지 자체 드래그 방지
      const img = e.currentTarget.querySelector("img");
      if (img) img.ondragstart = () => false;
    }}
  >
    {selectedChartData ? (
      <div className="preview-content">
        <div className="preview-header">
          <h4 className="preview-title">
            {parsedMetrics[selectedMetric]?.title ?? "선택된 지표"}
          </h4>
        </div>
        <div className="preview-chart-box">
          <img
            src={selectedChartData.activeIcon}
            alt={`${selectedChartData.label} preview`}
            className="preview-chart-img"
            draggable={false} //이미지 단독 드래그 방지
          />
        </div>
      </div>
    ) : (
      <p className="empty-preview-text">차트를 선택하면 미리보기가 표시됩니다.</p>
    )}
  </div>

  {(isTemplate || isCustom) && (
    <p className="drag-hint">
      {isCustom
        ? "📦 프리뷰 카드를 드래그하여 새 위젯을 추가할 수 있습니다."
        : "🪄 프리뷰 카드를 기존 카드 위로 드롭하면 해당 지표로 교체됩니다."}
    </p>
  )}
</section>

    </aside>
  );
}
