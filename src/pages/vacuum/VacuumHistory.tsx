// 1) 타입: 이미지 컬럼 그대로
type VacuumHistoryRow = {
  table: string;
  lastVacuum: string;       // "YYYY-MM-DD HH:mm"
  lastAutovacuum: string;   // "
  deadTuples: string;       // "81K" 등
  modSinceAnalyze: string;  // "127K" 등
  bloatPct: string;         // "9.4%"
  tableSize: string;        // "16 GB"
  frequency: string;        // "4회/일"
  status: "주의" | "정상";
};

// 2) 더미 데이터: 스샷과 동일 패턴 10행
const historyDemo: VacuumHistoryRow[] = [
  {
    table: "orders",
    lastVacuum: "2024-04-23 08:30",
    lastAutovacuum: "2024-04-23 15:26",
    deadTuples: "81K",
    modSinceAnalyze: "127K",
    bloatPct: "9.4%",
    tableSize: "16 GB",
    frequency: "4회/일",
    status: "주의",
  },
  {
    table: "sessions",
    lastVacuum: "2024-04-21 19:40",
    lastAutovacuum: "2024-04-22 13:15",
    deadTuples: "22K",
    modSinceAnalyze: "55K",
    bloatPct: "1.2%",
    tableSize: "7 GB",
    frequency: "3회/일",
    status: "정상",
  },
  {
    table: "orders",
    lastVacuum: "2024-04-23 08:30",
    lastAutovacuum: "2024-04-23 15:26",
    deadTuples: "81K",
    modSinceAnalyze: "127K",
    bloatPct: "9.4%",
    tableSize: "16 GB",
    frequency: "4회/일",
    status: "주의",
  },
  {
    table: "sessions",
    lastVacuum: "2024-04-21 19:40",
    lastAutovacuum: "2024-04-22 13:15",
    deadTuples: "22K",
    modSinceAnalyze: "55K",
    bloatPct: "1.2%",
    tableSize: "7 GB",
    frequency: "3회/일",
    status: "정상",
  },
  {
    table: "orders",
    lastVacuum: "2024-04-23 08:30",
    lastAutovacuum: "2024-04-23 15:26",
    deadTuples: "81K",
    modSinceAnalyze: "127K",
    bloatPct: "9.4%",
    tableSize: "16 GB",
    frequency: "4회/일",
    status: "주의",
  },
  {
    table: "sessions",
    lastVacuum: "2024-04-21 19:40",
    lastAutovacuum: "2024-04-22 13:15",
    deadTuples: "22K",
    modSinceAnalyze: "55K",
    bloatPct: "1.2%",
    tableSize: "7 GB",
    frequency: "3회/일",
    status: "정상",
  },
  {
    table: "orders",
    lastVacuum: "2024-04-23 08:30",
    lastAutovacuum: "2024-04-23 15:26",
    deadTuples: "81K",
    modSinceAnalyze: "127K",
    bloatPct: "9.4%",
    tableSize: "16 GB",
    frequency: "4회/일",
    status: "주의",
  },
  {
    table: "sessions",
    lastVacuum: "2024-04-21 19:40",
    lastAutovacuum: "2024-04-22 13:15",
    deadTuples: "22K",
    modSinceAnalyze: "55K",
    bloatPct: "1.2%",
    tableSize: "7 GB",
    frequency: "3회/일",
    status: "정상",
  },
  {
    table: "orders",
    lastVacuum: "2024-04-23 08:30",
    lastAutovacuum: "2024-04-23 15:26",
    deadTuples: "81K",
    modSinceAnalyze: "127K",
    bloatPct: "9.4%",
    tableSize: "16 GB",
    frequency: "4회/일",
    status: "주의",
  },
  {
    table: "sessions",
    lastVacuum: "2024-04-21 19:40",
    lastAutovacuum: "2024-04-22 13:15",
    deadTuples: "22K",
    modSinceAnalyze: "55K",
    bloatPct: "1.2%",
    tableSize: "7 GB",
    frequency: "3회/일",
    status: "정상",
  },
];

// 3) 렌더: Progress 컬럼 대신 이미지의 컬럼들로 출력
export default function VacuumHistoryTable({
  rows = historyDemo,
}: {
  rows?: VacuumHistoryRow[];
}) {
  return (
    <section className="vd-card">
      <header className="vd-card__header">
        <h3>History</h3>
      </header>
      <div className="vd-tablewrap">
        <table className="vd-table">
          <thead>
            <tr>
              <th>TABLE</th>
              <th>LAST VACUUM</th>
              <th>LAST AUTOVACUUM</th>
              <th>DEAD TUPLES</th>
              <th>MOD SINCE ANALYZE</th>
              <th>BLOAT %</th>
              <th>TABLE SIZE</th>
              <th>실행빈도</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.table}-${i}`}>
                <td className="vd-td-strong">{r.table}</td>
                <td>{r.lastVacuum}</td>
                <td>{r.lastAutovacuum}</td>
                <td>{r.deadTuples}</td>
                <td>{r.modSinceAnalyze}</td>
                <td>{r.bloatPct}</td>
                <td>{r.tableSize}</td>
                <td>{r.frequency}</td>
                <td>
                  <span className={`vd-badge ${r.status === "주의" ? "vd-badge--warn" : "vd-badge--ok"}`}>
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* 총 건수/페이지네이션은 rows.length 기준으로 표시 */}
      </div>
    </section>
  );
}
