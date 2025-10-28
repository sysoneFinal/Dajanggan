import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "/src/styles/vacuum/VacuumPage.css";
import Pagination from "../../components/util/Pagination";

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
  const navigate = useNavigate();
  const paginatedRows = rows.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const handleRowClick = (tableName: string) => {
      navigate("/database/vacuum/sessionDetail", {
        state: { table: tableName }, // 선택된 테이블 정보 같이 넘길 수도 있음
      });
    };

  return (
    <div className="vd-root">
      <section className="vd-card3">
        <header className="vd-card3__header">
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
                <tr key={`${r.table}-${i}`}
                    onClick={() => handleRowClick(r.table)}
                    className="vd-table-row"
                >
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
         <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={(newPage) => setPage(newPage)}
        />
      </section>
    </div>
  );
}