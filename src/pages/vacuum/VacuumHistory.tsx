import { useState } from "react";
import "/src/styles/VacuumPage.css";

type VacuumHistoryRow = {
  table: string;
  lastVacuum: string;
  lastAutovacuum: string;
  deadTuples: string;
  modSinceAnalyze: string;
  bloatPct: string;
  tableSize: string;
  frequency: string;
  status: "주의" | "정상";
};

const baseRows: VacuumHistoryRow[] = [
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

// 총 48개 생성
const historyDemo: VacuumHistoryRow[] = Array.from({ length: 48 }, (_, i) => ({
  ...baseRows[i % baseRows.length],
}));

export default function VacuumHistoryTable({ rows = historyDemo }: { rows?: VacuumHistoryRow[] }) {
  const [page, setPage] = useState(1);
  const rowsPerPage = 14;
  const totalPages = Math.ceil(rows.length / rowsPerPage);

  const paginatedRows = rows.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  return (
    <div className="vd-root">
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
              {paginatedRows.map((r, i) => (
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
        </div>

        {/* 페이지네이션 */}
        <div className="tq-pagination">
          <button
            className="tq-page-btn"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            이전
          </button>

          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              className={`tq-page-num ${page === i + 1 ? "tq-page-num--active" : ""}`}
              onClick={() => setPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}

          <button
            className="tq-page-btn"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            다음
          </button>
        </div>
      </section>
    </div>
  );
}
