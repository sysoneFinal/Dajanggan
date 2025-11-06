import { useState } from "react";
import metrics from "../chart/Metrics.json";
import { flattenMetrics } from "../../utils/flattenMetrics";
import { useInstanceContext } from "../../context/InstanceContext";
import MultiSelectDropdown from "../../components/util/MultiSelectDropdown";

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

export default function DashboardEditorPanel({
  currentTheme,
  onThemeChange,
}: DashboardEditorPanelProps) {
  const [selectedChart, setSelectedChart] = useState<string>("");
  const [selectedMetric, setSelectedMetric] = useState<string>("");
  const [availableCharts, setAvailableCharts] = useState<string[]>([]);
  const [selectedDbNames, setSelectedDbNames] = useState<string[]>([]);
  const { databases, selectedInstance } = useInstanceContext();

  /** === 테마 목록 === */
  const themes = [
    { id: "custom", label: "All Custom", icon: allCustomIcon, activeIcon: allCustomActiveIcon },
    { id: "card_7_layout", label: "카드 7개", icon: card7Icon, activeIcon: card7ActiveIcon },
    { id: "card_9_layout", label: "카드 9개", icon: card9Icon, activeIcon: card9ActiveIcon },
  ];

  /** === 전체 차트 타입 === */
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

  /** === Metrics 파싱 === */
  const parsedMetrics = flattenMetrics(metrics);

  /** === Metric 변경 시 chart 옵션 반영 === */
  const handleMetricChange = (metricKey: string) => {
    setSelectedMetric(metricKey);
    const metricInfo = parsedMetrics[metricKey];

    if (metricInfo?.available_charts) {
      const charts = metricInfo.available_charts.map((c: string) => c.toLowerCase());
      setAvailableCharts(charts);

      const defaultChart =
        metricInfo.default_chart?.toLowerCase() ?? charts[0] ?? "";
      setSelectedChart(defaultChart);
    } else {
      setAvailableCharts([]);
      setSelectedChart("");
    }
  };

  /** === Chart 표시 목록 === */
  const visibleCharts =
    availableCharts.length > 0
      ? chartTypes.filter((chart) => availableCharts.includes(chart.id))
      : [];

  const selectedChartData = chartTypes.find((chart) => chart.id === selectedChart);
  const isCustom = currentTheme === "custom";
  const isTemplate = currentTheme.startsWith("card_");

  /** === 프리뷰 드래그 === */
  const handleDragStart = (e: React.DragEvent) => {
    console.log('드래그 직전 상태', {
      selectedMetric,
      selectedChart,
      selectedDbNames,
    });

    if (!selectedMetric || !selectedChart || selectedDbNames.length === 0) {
      e.preventDefault();
      alert('DB, Metric, Chart를 모두 선택해주세요!');
      return;
    }

    const selectedDbObjects = databases
      .filter((db) => selectedDbNames.includes(db.databaseName))
      .map((db) => ({
        id: db.databaseId,
        name: db.databaseName,
      }));

    const payload = {
      metricKey: selectedMetric,
      chartType: selectedChart,
      databases: selectedDbObjects,
      instanceId: selectedInstance?.instanceId ?? null,
    };

    console.log('드래그 전송 데이터:', payload);

    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("application/json", JSON.stringify(payload));
  };

  return (
    <aside className="editor-panel">
      <div className="editor-guide">
        {isCustom ? (
          <>
            🎨 <strong>Custom 모드</strong>입니다.
            <br />
            ↳ 여러 DB와 지표를 선택하여 <strong>비교형 위젯</strong>을 만들 수 있습니다.
          </>
        ) : isTemplate ? (
          <>
            🧩 <strong>Theme 모드</strong>입니다.
            <br />
            ↳ 지표를 선택한 후, <strong>기존 카드 위로 드롭</strong>하면 교체됩니다.
          </>
        ) : (
          <>
            📊 대시보드 편집 모드입니다.
            <br />
            테마를 선택하여 대시보드를 구성할 수 있습니다.
          </>
        )}
      </div>

      {/* === Theme 선택 === */}
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

      {/* === Metric & DB 선택 === */}
      <section className="editor-section">
        <h2 className="section-title">Metric</h2>
        <div className="metric-selectors">
          <MultiSelectDropdown
            label="Select Databases"
            options={databases.map((db) => db.databaseName)}
            onChange={(values) => setSelectedDbNames(values as string[])}
            multi
            width="48%"
          />

          <MultiSelectDropdown
            label="Select Metric"
            options={Object.values(parsedMetrics).map((m: any) => m.title)}
            onChange={(value) => {
              const key = Object.entries(parsedMetrics).find(([_, v]) => v.title === value)?.[0];
              if (key) handleMetricChange(key);
            }}
            multi={false}
            width="80%"
            noShadow
          />
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
                  <img src={isActive ? activeIcon : icon} alt={label} className="chart-icon" />
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

      {/* === Preview === */}
      <section className="editor-section">
        <h2 className="section-title">Preview</h2>
        <div
          className={`card-preview-single ${!isCustom && !isTemplate ? "disabled" : ""}`}
          draggable={!!selectedMetric && !!selectedChart && selectedDbNames.length > 0}
          onMouseDown={() =>
            console.log('드래그 가능 상태', {
              selectedMetric,
              selectedChart,
              selectedDbNames,
            })
          }
          onDragStart={handleDragStart}
        >
          {selectedChartData ? (
            <div className="preview-content">
              <div className="preview-header">
                <h4 className="preview-title">
                  {parsedMetrics[selectedMetric]?.title ?? "선택된 지표"}
                </h4>
                {selectedDbNames.length > 0 && (
                  <span className="preview-db">DBs: {selectedDbNames.join(", ")}</span>
                )}
              </div>
              <div className="preview-chart-box">
                <img
                  src={selectedChartData.activeIcon}
                  alt={`${selectedChartData.label} preview`}
                  className="preview-chart-img"
                  draggable={false}
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
