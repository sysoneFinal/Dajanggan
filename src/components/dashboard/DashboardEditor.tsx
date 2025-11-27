/** 작성자 : 서샘이 */ 

import { useState, useEffect } from "react";
import Joyride, { STATUS } from "react-joyride";
import type { CallBackProps, Step } from "react-joyride";
import { useInstanceContext } from "../../context/InstanceContext";
import { useDashboard } from "../../context/DashboardContext";
import MultiSelectDropdown from "../../components/util/MultiSelectDropdown";
import "@/styles/dashboard/dashboardEditor.css";

/* 
 * 아이콘 모음
 *  */
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

interface DashboardEditorPanelProps {
  currentTheme?: string;
  onThemeChange?: (id: string) => void;
}

export default function DashboardEditorPanel({
  currentTheme,
  onThemeChange,
}: DashboardEditorPanelProps) {
  const { databases, selectedInstance } = useInstanceContext();
const { metricMap } = useDashboard();

  // metricMap 디버깅
  useEffect(() => {
    console.log("🗺️ DashboardEditor - metricMap 업데이트:", metricMap);
    console.log("📊 metricMap keys:", Object.keys(metricMap));
    if (Object.keys(metricMap).length > 0) {
      const firstKey = Object.keys(metricMap)[0];
    }
  }, [metricMap]);

  const [selectedChart, setSelectedChart] = useState("");
  const [selectedMetric, setSelectedMetric] = useState("");
  const [availableCharts, setAvailableCharts] = useState<string[]>([]);
  const [selectedDbNames, setSelectedDbNames] = useState<string[]>([]);
  
  // Joyride 관련 상태
  const [runTour, setRunTour] = useState(false);

  /* 
   * Theme 목록
   *  */
  const themes = [
    { id: "custom", label: "All Custom", icon: allCustomIcon, activeIcon: allCustomActiveIcon },
    { id: "card_7_layout", label: "카드 7개", icon: card7Icon, activeIcon: card7ActiveIcon },
    { id: "card_9_layout", label: "카드 9개", icon: card9Icon, activeIcon: card9ActiveIcon },
  ];

  /* 
   * 전체 차트 타입 정의
   *  */
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

  /* 
   * Metric 선택 → Chart 옵션 표시
   *  */
  const handleMetricChange = (metricKey: string) => {
    setSelectedMetric(metricKey);
    const info = metricMap[metricKey];
    console.log("📋 선택된 지표 정보:", info);
    
    if (!info) {
      console.warn("metricMap에서 정보를 찾을 수 없음:", metricKey);
      return;
    }

    const charts = info.available_charts ?? [];
    setAvailableCharts(charts);
    setSelectedChart(info.default_chart || charts[0] || "");
    console.log("설정된 차트:", info.default_chart || charts[0] || "");
  };

  /* 
   * 차트 목록 필터링
   *  */
  const visibleCharts = availableCharts.length
    ? chartTypes.filter((chart) => availableCharts.includes(chart.id))
    : [];
  
  const selectedChartData = chartTypes.find((chart) => chart.id === selectedChart);
  const isCustom = currentTheme === "custom";
  const isTemplate = currentTheme?.startsWith("card_") ?? false;

  // 가이드 시작 핸들러
  const handleStartTour = () => {
    setRunTour(true);
  };

  // Joyride 콜백
  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRunTour(false);
    }
  };

  // Joyride 스텝 정의
  const steps: Step[] = [
    {
      target: ".theme-grid",
      content: (
        <div>
          <h3>1번 테마를 선택하세요</h3>
          <p>
            <strong>커스텀 모드</strong>를 실행 시, 위젯을 자유롭게 추가할 수 있습니다.
            <br />
            <strong>테마를 선택</strong>할 경우, 위젯의 개수는 고정됩니다. 지표만 추가 가능합니다.
          </p>
        </div>
      ),
      placement: "right",
      disableBeacon: true,
    },
    {
      target: ".metric-selectors",
      content: (
        <div>
          <h3>2번 데이터베이스를 선택하세요</h3>
          <p>비교할 데이터베이스를 선택한 후, 지표와 차트를 선택하여 위젯을 추가할 수 있습니다.</p>
        </div>
      ),
      placement: "right",
      disableBeacon: true,
    },
    {
      target: ".chart-section",
      content: (
        <div>
          <h3>3번 차트를 선택하세요</h3>
          <p>
            지표를 선택하면 사용 가능한 차트 유형이 표시됩니다.
            <br />
            원하는 차트 타입을 클릭하여 선택할 수 있습니다.
          </p>
        </div>
      ),
      placement: "right",
      disableBeacon: true,
    },
    {
      target: ".card-preview-single",
      content: (
        <div>
          <h3>4번 Preview를 드래그앤드롭하세요</h3>
          <p>
            선택한 지표와 차트의 미리보기가 여기에 표시됩니다.
            <br />
            이 Preview 카드를 드래그하여 대시보드에 위젯을 추가할 수 있습니다.
          </p>
        </div>
      ),
      placement: "left",
      disableBeacon: true,
    },
  ];

  /* 
   * Preview 드래그
   *  */
  const handleDragStart = (e: React.DragEvent) => {
    if (!selectedMetric || !selectedChart || selectedDbNames.length === 0) {
      e.preventDefault();
      alert("DB, Metric, Chart를 모두 선택해주세요!");
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

    console.log(">>>> 드래그 전송 데이터:", payload);
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("application/json", JSON.stringify(payload));
  };

  /* 
   * 렌더링
   * */
  return (
    <>
      <Joyride
        steps={steps}
        run={runTour}
        continuous
        showProgress
        showSkipButton
        callback={handleJoyrideCallback}
        disableOverlayClose={false}
        styles={{
          options: {
            primaryColor: "#7B61FF",
            zIndex: 10000,
          },
          tooltip: {
            borderRadius: 12,
            padding: 20,
            backgroundColor: "#ffffff",
            color: "#111827",
            border: "1px solid #e5e7eb",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
          },
          tooltipContainer: {
            textAlign: "left",
          },
          tooltipTitle: {
            color: "#111827",
            fontSize: "18px",
            fontWeight: 700,
            marginBottom: "8px",
          },
          tooltipContent: {
            color: "#6b7280",
            fontSize: "14px",
            lineHeight: "1.5",
          },
          buttonNext: {
            backgroundColor: "#7B61FF",
            borderRadius: 8,
            padding: "10px 20px",
            fontSize: "14px",
            fontWeight: 600,
            color: "#ffffff",
            border: "none",
            cursor: "pointer",
          },
          buttonBack: {
            color: "#6b7280",
            marginRight: 10,
            fontSize: "14px",
            fontWeight: 600,
          },
          buttonSkip: {
            color: "#6b7280",
            fontSize: "14px",
            fontWeight: 600,
          },
          overlay: {
            backgroundColor: "rgba(0, 0, 0, 0.3)",
          },
          spotlight: {
            borderRadius: 12,
          },
        }}
        locale={{
          back: "이전",
          close: "닫기",
          last: "완료",
          next: "다음",
          skip: "건너뛰기",
        }}
      />
      <aside className="editor-panel">
      {/* === 가이드 버튼 === */}
      <button className="guide-help-btn" onClick={handleStartTour} title="사용 가이드 보기">
        <i className="ri-question-line"></i>
      </button>

      {/* === 상단 안내 === */}
      <div className="editor-guide">
        {isCustom ? (
          <>
            🎨 <strong>Custom 모드</strong>입니다.
            <br />↳ 여러 DB와 지표를 선택하여 <strong>비교형 위젯</strong>을 만들 수 있습니다.
          </>
        ) : isTemplate ? (
          <>
            🧩 <strong>Theme 모드</strong>입니다.
            <br />↳ 지표를 선택한 후, <strong>기존 카드 위로 드롭</strong>하면 교체됩니다.
          </>
        ) : (
          <>
            📊 기본 편집 모드입니다.
            <br />테마를 선택하여 대시보드를 구성할 수 있습니다.
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

      {/* === Metric 선택 === */}
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
            options={Object.entries(metricMap).map(([key, value]: [string, any]) => {
            
              return value.title;
            })}
            onChange={(value) => {              
              // metricMap의 모든 항목 상세 정보 출력
              Object.entries(metricMap).forEach(([key, val]: [string, any]) => {
              });
              
              const key = Object.entries(metricMap).find(([_, v]) => v.title === value)?.[0];              
              if (key) {
                handleMetricChange(key);
              } else {
                console.warn("metricMap에서 key를 찾을 수 없음!");
              }
            }}
            multi={false}
            width="80%"
            noShadow
            searchable={true}
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
          onDragStart={handleDragStart}
        >
          {selectedChartData ? (
            <div className="preview-content">
              <div className="preview-header">
                <h4 className="preview-title">
                  {metricMap[selectedMetric]?.title ?? "선택된 지표"}
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
    </>
  );
}
