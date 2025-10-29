// src/pages/alerts/AlarmRuleList.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "/src/styles/alarm/alarm-list.css"; 
import Pagination from "../../components/util/Pagination";
import SlackSettingsModal from "./SlackSetting";

type AlarmRuleRow = {
  id: number;
  instance: string;
  database: string;
  metric: "vacuum" | "Long Transactions / Blockers" | "Dead tuple";
  enabled: boolean;
};

const base: AlarmRuleRow[] = [
  { id: 1, instance: "orders",   database: "page",    metric: "vacuum", enabled: false },
  { id: 2, instance: "sessions", database: "orders",  metric: "vacuum", enabled: true  },
  { id: 3, instance: "orders",   database: "sessions",metric: "vacuum", enabled: true  },
  { id: 4, instance: "sessions", database: "orders",  metric: "Long Transactions / Blockers", enabled: true },
  { id: 5, instance: "orders",   database: "sessions",metric: "Long Transactions / Blockers", enabled: true },
  { id: 6, instance: "sessions", database: "page",    metric: "Long Transactions / Blockers", enabled: true },
  { id: 7, instance: "orders",   database: "orders",  metric: "Dead tuple", enabled: true },
  { id: 8, instance: "sessions", database: "sessions",metric: "Dead tuple", enabled: true },
  { id: 9, instance: "orders",   database: "sessions",metric: "Dead tuple", enabled: true },
  { id:10, instance: "sessions", database: "page",    metric: "Dead tuple", enabled: true },
];

const demoRows: AlarmRuleRow[] = Array.from({ length: 33 }, (_, i) => {
  const b = base[i % base.length];
  return { ...b, id: i + 1 };
});

export default function AlarmRuleList({ rows = demoRows }: { rows?: AlarmRuleRow[] }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;
  const [openSlack, setOpenSlack] = useState(false);

  const totalPages = Math.ceil(rows.length / rowsPerPage);
  const paged = useMemo(
    () => rows.slice((page - 1) * rowsPerPage, page * rowsPerPage),
    [rows, page]
  );

  const goNew = () => navigate("/alarm-rule");
  const onEdit = (id: number) => navigate(`/alerts/rules/${id}/edit`);
  const onDelete = (id: number) => {
    // TODO: 실제 삭제 로직 연결(모달/confirm 등)
    // eslint-disable-next-line no-alert
    if (confirm("이 규칙을 삭제하시겠습니까?")) {
      console.log("delete id:", id);
    }
  };

  const handleRowClick = (id: number) => {
      navigate("/database/vacuum/sessionDetail", {
        state: { table: id }, // 선택된 테이블 정보 같이 넘길 수도 있음
      });
    };

  return (
    <div className="al-root">
      <section className="al-card3">
        <header className="al-card3__header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>알림 규칙 목록</h3>
          <button className="al-btn" onClick={() => setOpenSlack(true)}>
            <span style={{ marginRight: 6 }}>🔔</span> Slack 연동 설정
          </button>
        </header>

        <div className="al-tablewrap">
          <table className="al-table">
            <thead>
              <tr>
                <th>인스턴스</th>
                <th>데이터베이스</th>
                <th>지표</th>
                <th>활성화 상태</th>
                <th style={{ width: 120, textAlign: "center" }}>수정</th>
                <th style={{ width: 120, textAlign: "center" }}>삭제</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((r) => (
                <tr key={`${r.id}`}
                    onClick={() => handleRowClick(r.id)}
                    className="al-table-row"
                >
                  <td className="al-td-strong">{r.instance}</td>
                  <td>{r.database}</td>
                  <td>{r.metric}</td>
                  <td>
                    <span className={`al-badge ${r.enabled ? "al-badge--ok" : "al-badge--warn"}`}>
                      {r.enabled ? "활성화" : "비활성화"}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button className="al-iconbtn" title="수정" onClick={() => onEdit(r.id)}>
                      {/* 연필 아이콘 */}
                      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" />
                      </svg>
                    </button>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button className="al-iconbtn" title="삭제" onClick={() => onDelete(r.id)}>
                      {/* 휴지통 아이콘 */}
                      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M6 7h12v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7zm3-4h6l1 1h4v2H4V4h4l1-1z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 하단: 좌측은 비활성 버튼(예시), 중앙 페이지네이션, 우측 생성 버튼 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
          <div /> {/* 왼쪽 빈 영역(스크린샷에서 '이전' 버튼이 비활성처럼 보이는 자리) */}

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />

          <button className="al-btn" onClick={goNew}>알림 규칙 생성</button>
        </div>

        <SlackSettingsModal
          open={openSlack}
          onClose={() => setOpenSlack(false)}
          onSave={(v) => console.log("Slack 설정 저장:", v)}
          initialValue={{ instance: "postgres", enabled: true }}
        />
      </section>
    </div>
  );
}
