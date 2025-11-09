// src/pages/vacuum/VacuumPage.tsx
import { useEffect, useMemo, useState } from "react";
import Chart from "../../components/chart/ChartComponent";
import ChartGridLayout from "../../components/layout/ChartGridLayout";
import WidgetCard from "../../components/util/WidgetCard";
import "/src/styles/vacuum/VacuumPage.css";
import apiClient from "../../api/apiClient";

/* ---------- 서버 DTO와 맞춘 타입 ---------- */
type ChartDto = {
  data: number[][];     // e.g., [ [1,2,3] ] 또는 다중 시리즈
  labels: string[];     // x축 라벨
};

type TopBloatTableDto = {
  table: string;
  bloat: string;        // "9.4%" 등
  deadTuple: string;    // "81K" 등
};

type VacuumBlockerDto = {
  table: string;
  pid: string;
  lockType: string;
  txAge: string;            // "2h 13m" 같은 문자열
  blocked_seconds: string;  // "14m" 같은 문자열
  status: string;
};

type RiskResponse = {
  blockers: ChartDto;
  autovacuum?: ChartDto; // (서버에서 아직 안 채우는 중일 수 있음)
  wraparound: ChartDto;
  bloat: TopBloatTableDto[];
  vacuumblockers: VacuumBlockerDto[];
};

/* ---------- 유틸: "2h 13m", "14m", "30s" → 초 ---------- */
const parseDurationToSeconds = (s?: string) => {
  if (!s) return 0;
  let sec = 0;
  const m = s.match(/(\d+)\s*h/i);
  const mm = s.match(/(\d+)\s*m/i);
  const ss = s.match(/(\d+)\s*s/i);
  if (m) sec += parseInt(m[1], 10) * 3600;
  if (mm) sec += parseInt(mm[1], 10) * 60;
  if (ss) sec += parseInt(ss[1], 10);
  if (sec === 0) {
    // "123" 같은 숫자만 들어오는 경우도 방어
    const n = Number(s);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return sec;
};

const VacuumPage: React.FC<{ hours?: number }> = ({ hours = 24 }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [risk, setRisk] = useState<RiskResponse | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await apiClient.get<RiskResponse>("/vacuum/risk", {
          params: { hours },
          signal: ac.signal,
        });
        setRisk(res.data);
      } catch (e: any) {
        if (e?.name !== "CanceledError") {
          setError(e?.response?.data?.message ?? e?.message ?? "데이터를 불러오지 못했습니다.");
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [hours]);

  /* ---------- 차트 시리즈 ---------- */
  const blockersSeries = useMemo(() => {
    if (!risk?.blockers) return [];
    // 서버는 단일 시리즈 형태로 내려주므로 그대로 전달
    const [series1] = risk.blockers.data ?? [];
    return [{ name: "blockers", data: series1 ?? [] }];
  }, [risk?.blockers]);

  const wraparoundSeries = useMemo(() => {
    if (!risk?.wraparound) return [];
    const [series1] = risk.wraparound.data ?? [];
    return [{ name: "wraparound", data: series1 ?? [] }];
  }, [risk?.wraparound]);

  // Wraparound 진행률 색상(분포형 막대)
  const wraparoundColors = useMemo(() => {
    const vals = risk?.wraparound?.data?.[0] ?? [];
    return vals.map((v: number) => (v >= 90 ? "#FF928A" : v >= 75 ? "#FFD66B" : "#7B61FF"));
  }, [risk?.wraparound]);

  // 산포도: vacuumblockers의 문자열 시간을 초로 변환하여 (txAgeSec, blockedSec)
  const transactionScatterSeries = useMemo(() => {
    const list = risk?.vacuumblockers ?? [];
    const pts = list.map((b) => [
      parseDurationToSeconds(b.txAge),
      parseDurationToSeconds(b.blocked_seconds),
    ]) as [number, number][];
    return [{ name: "Transaction vs Block", data: pts }];
  }, [risk?.vacuumblockers]);

  return (
    <div className="vd-root">
      {loading && <div className="il-banner il-banner--muted">로딩 중…</div>}
      {error && <div className="il-banner il-banner--error">{error}</div>}

      {!loading && !error && risk && (
        <>
          <ChartGridLayout>
            {/* Blockers per Hour */}
            <WidgetCard title={`Blockers per Hour (${hours}h)`} span={4}>
              <Chart
                type="line"
                series={blockersSeries}
                categories={risk.blockers?.labels ?? []}
                width="100%"
              />
            </WidgetCard>

            {/* Transaction Age vs Block Duration (scatter) */}
            <WidgetCard title="Transaction Age vs Block Duration" span={4}>
              <Chart
                type="scatter"
                series={transactionScatterSeries}
                customOptions={{
                  chart: { zoom: { enabled: true }, toolbar: { show: false } },
                  xaxis: {
                    title: { text: "Transaction Age (sec)" },
                  },
                  yaxis: {
                    title: { text: "Block Duration (sec)" },
                  },
                  markers: {
                    size: 5,
                    colors: ["#818CF8"],
                    strokeColors: "transparent",
                    fillOpacity: 0.45,
                  },
                  grid: { borderColor: "#E5E7EB", strokeDashArray: 4 },
                }}
              />
            </WidgetCard>

            {/* Wraparound Progress */}
            <WidgetCard title="Wraparound Progress" span={4}>
              <div style={{ paddingBottom: "12px" }}>
                <div style={{ display: "flex", gap: "16px", marginBottom: "2px", fontSize: "12px", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: "#7B61FF" }} />
                    <span style={{ color: "#6B7280" }}>안전 (0-75%)</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: "#FFD66B" }} />
                    <span style={{ color: "#6B7280" }}>경고 (75-90%)</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: "#FF928A" }} />
                    <span style={{ color: "#6B7280" }}>위험 (90-100%)</span>
                  </div>
                </div>

                <Chart
                  type="bar"
                  series={wraparoundSeries}
                  categories={risk.wraparound?.labels ?? []}
                  width="100%"
                  customOptions={{
                    chart: { redrawOnParentResize: true, redrawOnWindowResize: true },
                    plotOptions: { bar: { horizontal: true, distributed: true, borderRadius: 4 } },
                    colors: wraparoundColors,
                    dataLabels: {
                      enabled: true,
                      formatter: (val: number) => `${Number(val ?? 0).toFixed(1)}%`,
                      style: { fontSize: "12px", colors: ["#fff"] },
                    },
                    grid: { borderColor: "#E5E7EB", strokeDashArray: 4 },
                    xaxis: {
                      min: 0,
                      max: 100,
                      labels: { formatter: (val: number) => `${val}%` },
                    },
                    legend: { show: false },
                    tooltip: {
                      y: {
                        formatter: (val: number) => `${Number(val ?? 0).toFixed(1)}%`,
                        title: { formatter: () => "Wraparound Progress" },
                      },
                    },
                  }}
                />
              </div>
            </WidgetCard>
          </ChartGridLayout>

          {/* 하단 테이블 */}
          <div className="vd-grid3">
            {/* Top Bloat */}
            <section className="vd-card">
              <header className="vd-card__header">
                <h3>Top-3 Bloat Tables</h3>
              </header>
              <div className="vd-tablewrap">
                <table className="vd-table2">
                  <thead>
                    <tr>
                      <th>TABLE</th>
                      <th>BLOAT</th>
                      <th>DEAD TUPLES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(risk.bloat ?? []).map((s) => (
                      <tr key={s.table}>
                        <td className="vd-td-strong">{s.table}</td>
                        <td>{s.bloat}</td>
                        <td>{s.deadTuple}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Vacuum Blockers */}
            <section className="vd-card">
              <header className="vd-card__header">
                <h3>Vacuum Blockers / Inaccessible Tables</h3>
              </header>
              <div className="vd-tablewrap">
                <table className="vd-table2">
                  <thead>
                    <tr>
                      <th>TABLE</th>
                      <th>PID</th>
                      <th>LOCKTYPE</th>
                      <th>TX AGE</th>
                      <th>BLOCKED</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(risk.vacuumblockers ?? []).map((s, idx) => (
                      <tr key={`${s.table}-${s.pid}-${idx}`}>
                        <td className="vd-td-strong">{s.table}</td>
                        <td>{s.pid}</td>
                        <td>{s.lockType}</td>
                        <td>{s.txAge}</td>
                        <td>{s.blocked_seconds}</td>
                        <td>{s.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      )}

      {!loading && !error && !risk && (
        <div className="il-empty">표시할 데이터가 없습니다.</div>
      )}
    </div>
  );
};

export default VacuumPage;
