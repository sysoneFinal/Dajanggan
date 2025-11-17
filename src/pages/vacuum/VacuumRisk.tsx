// src/pages/vacuum/VacuumPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useInstanceContext } from "../../context/InstanceContext";
import Chart from "../../components/chart/ChartComponent";
import ChartGridLayout from "../../components/layout/ChartGridLayout";
import WidgetCard from "../../components/util/WidgetCard";
import "/src/styles/vacuum/VacuumPage.css";
import apiClient from "../../api/apiClient";

/* ---------- 서버 DTO와 맞춘 타입 ---------- */
type ChartDto = { data: number[][]; labels: string[] };

type TopBloatTableDto = {
  table: string;
  bloat: string;     // "9.4%"
  deadTuple: string; // "81K"
};

type VacuumBlockerDto = {
  table: string;
  pid: string;
  lockType: string;
  txAge: string;            // "2h 13m"
  blocked_seconds: string;  // "14m"
  status: string;           // queryState
};

/* ---------- 백엔드 원시 타입 ---------- */
type BlockersPerHourRaw = { hourLabel: string; blockersCount: number };
type TopBloatRaw = { tableName: string; bloatBytes: number; bloatRatio: number; deadTuples: number };
type VacuumBlockerDetailRaw = {
  tableName: string; pid: number; lockType: string;
  transactionAge: number;  // seconds
  blockDuration: number;   // seconds
  queryState: string;
};
type WraparoundProgressRaw = { databaseId: number; wraparoundProgressPct: number };
type ScatterRes = { data: number[][]; labels: string[] };

/* ---------- 유틸 ---------- */
const secondsToHuman = (sec?: number) => {
  if (!sec || sec <= 0) return "0s";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return s ? `${m}m ${s}s` : `${m}m`;
  return `${s}s`;
};
const formatPct = (ratio?: number) => `${Number(((ratio ?? 0) * 100)).toFixed(1)}%`;
const formatK = (n?: number) => {
  const v = Number(n ?? 0);
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return `${v}`;
};

const VacuumPage: React.FC<{ hours?: number }> = ({ hours = 24 }) => {
  const { selectedInstance, selectedDatabase } = useInstanceContext();
  const databaseId = selectedDatabase?.databaseId ?? null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [blockers, setBlockers] = useState<ChartDto | null>(null);
  const [wraparound, setWraparound] = useState<ChartDto | null>(null);
  const [bloat, setBloat] = useState<TopBloatTableDto[]>([]);
  const [vacuumblockers, setVacuumblockers] = useState<VacuumBlockerDto[]>([]);
  const [scatterPoints, setScatterPoints] = useState<number[][]>([]); // [[x,y], ...]

  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // hours → startTime/endTime 변환 (백엔드 파라미터 이름에 맞춤)
        const end = new Date();
        const start = new Date(end.getTime() - Math.max(hours, 1) * 3600 * 1000);
        const endISO = end.toISOString();
        const startISO = start.toISOString();

        const baseParams: any = { startTime: startISO, endTime: endISO };
        if (databaseId) baseParams.databaseId = databaseId;

        // 5개 엔드포인트 병렬 호출 (risk 네임스페이스로 통일)
        const [
          blockersRes,
          bloatRes,
          blockersDetailRes,
          wrapRes,
          scatterRes,
        ] = await Promise.all([
          apiClient.get<BlockersPerHourRaw[]>("/vacuum/risk/blockers-per-hour", {
            params: baseParams, signal: ac.signal,
          }),
          apiClient.get<TopBloatRaw[]>("/vacuum/risk/top-bloat", {
            params: { ...baseParams, limit: 3 }, signal: ac.signal,
          }),
          apiClient.get<VacuumBlockerDetailRaw[]>("/vacuum/risk/blockers", {
            params: baseParams, signal: ac.signal,
          }),
          apiClient.get<WraparoundProgressRaw[]>("/vacuum/risk/wraparound", {
            params: baseParams, signal: ac.signal,
          }),
          apiClient.get<ScatterRes>("/vacuum/risk/tx-scatter", {
            params: baseParams, signal: ac.signal,
          }),
        ]);

        // Blockers per hour → ChartDto
        const blockersLabels = blockersRes.data.map(d => d.hourLabel);
        const blockersSeries = blockersRes.data.map(d => d.blockersCount);
        setBlockers({ labels: blockersLabels, data: [blockersSeries] });

        // Wraparound → ChartDto
        const wrapLabels = wrapRes.data.map(d => `DB ${d.databaseId}`);
        const wrapSeries = wrapRes.data.map(d => d.wraparoundProgressPct);
        setWraparound({ labels: wrapLabels, data: [wrapSeries] });

        // Top bloat rows
        setBloat(
          bloatRes.data.map(b => ({
            table: b.tableName,
            bloat: formatPct(b.bloatRatio),
            deadTuple: formatK(b.deadTuples),
          }))
        );

        // Vacuum blockers rows
        setVacuumblockers(
          blockersDetailRes.data.map(v => ({
            table: v.tableName,
            pid: String(v.pid),
            lockType: v.lockType,
            txAge: secondsToHuman(v.transactionAge),
            blocked_seconds: secondsToHuman(v.blockDuration),
            status: v.queryState,
          }))
        );

        // Scatter points (그대로 전달)
        setScatterPoints(scatterRes.data.data ?? []);
      } catch (e: any) {
        if (e?.code === "ERR_CANCELED" || e?.name === "CanceledError") return;
        setError(e?.response?.data?.message ?? e?.message ?? "데이터를 불러오지 못했습니다.");
        setBlockers(null);
        setWraparound(null);
        setBloat([]);
        setVacuumblockers([]);
        setScatterPoints([]);
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [databaseId, hours]);

  /* ---------- 차트 시리즈 ---------- */
  const blockersSeries = useMemo(() => {
    if (!blockers) return [];
    const [s1] = blockers.data ?? [];
    return [{ name: "blockers", data: s1 ?? [] }];
  }, [blockers]);

  const wraparoundSeries = useMemo(() => {
    if (!wraparound) return [];
    const [s1] = wraparound.data ?? [];
    return [{ name: "wraparound", data: s1 ?? [] }];
  }, [wraparound]);

  const wraparoundColors = useMemo(() => {
    const vals = wraparound?.data?.[0] ?? [];
    return vals.map((v: number) => (v >= 90 ? "#FF928A" : v >= 75 ? "#FFD66B" : "#7B61FF"));
  }, [wraparound]);

  const txScatterSeries = useMemo(
    () => [{ name: "Transaction vs Block", data: scatterPoints }],
    [scatterPoints]
  );

  
     // Instance나 Database가 선택되지 않은 경우
    if (!selectedInstance || !selectedDatabase) {
      return (
        <div className="vd-root">
          <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
            <p style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>
              Instance와 Database를 선택해주세요
            </p>
          </div>
        </div>
      );
    }
  
  

  return (
    <div className="vd-root">
      {loading && <div className="il-banner il-banner--muted">로딩 중…</div>}
      {error && <div className="il-banner il-banner--error">{error}</div>}

      {!loading && !error && (blockers || wraparound) && (
        <>
          <ChartGridLayout>
            {/* Blockers per Hour */}
            <WidgetCard title={`시간당 차단 발생 건수 (${hours}h)`} span={4}>
              <Chart
                type="line"
                series={blockersSeries}
                categories={blockers?.labels ?? []}
                width="100%"
              />
            </WidgetCard>

            {/* Transaction Age vs Block Duration (scatter) */}
            <WidgetCard title="트랜잭션 경과 시간 vs 차단 지속 시간" span={4}>
              <Chart
                type="scatter"
                series={txScatterSeries}
                width="100%"
                customOptions={{
                  chart: { zoom: { enabled: true }, toolbar: { show: false } },
                  xaxis: { title: { text: "Transaction Age (sec)" } },
                  yaxis: { title: { text: "Block Duration (sec)" } },
                  markers: {
                    size: 5,
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
                  categories={wraparound?.labels ?? []}
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
                    xaxis: { min: 0, max: 100, labels: { formatter: (val: number) => `${val}%` } },
                    legend: { show: false },
                    tooltip: {
                      y: { formatter: (val: number) => `${Number(val ?? 0).toFixed(1)}%`,
                        title: { formatter: () => "Wraparound Progress" } },
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
                    {(bloat ?? []).map((s) => (
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
                <h3>Vacuum Blockers / 접근 불가 테이블</h3>
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
                    {(vacuumblockers ?? []).map((s, idx) => (
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

      {!loading && !error && !blockers && !wraparound && (
        <div className="il-empty">표시할 데이터가 없습니다.</div>
      )}
    </div>
  );
};

export default VacuumPage;
