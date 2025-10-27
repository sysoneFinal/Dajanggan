import React, { useState, useMemo } from "react";
import "../../styles/session/sessionActivityList.css";
import Pagination from "../../components/util/Pagination";

export default function SessionActivityList() {
  // 더미 세션 데이터
  const [sessions] = useState(
    Array.from({ length: 22 }).map((_, i) => ({
      pid: 1300 + i,
      user: i % 2 === 0 ? "sammy" : "doyoung",
      db: "post1_db",
      type: i % 2 === 0 ? "vacuum" : "select",
      state: i % 3 === 0 ? "waiting" : "active",
      waitType: i % 2 === 0 ? "Lock" : "IO",
      waitEvent: i % 2 === 0 ? "transactionid" : "buffer_io",
      runtime: `${5 + i}m ${i * 2}s`,
      query: i % 2 === 0 ? "SELECT * FROM users" : "SELECT * FROM logs;",
    }))
  );

  //  페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = useMemo(() => Math.ceil(sessions.length / itemsPerPage), [sessions]);

  //  현재 페이지 데이터
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentSessions = sessions.slice(startIndex, startIndex + itemsPerPage);

  //  페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // TODO: API 호출 (예: fetchSessions(page))
  };

  //  CSV 내보내기
  const handleExportCSV = () => {
    const headers = [
      "PID",
      "사용자",
      "DB명",
      "작업 유형",
      "상태",
      "대기유형",
      "대기이벤트",
      "실행시간",
      "쿼리",
    ];
    const rows = sessions.map((s) =>
      [
        s.pid,
        s.user,
        s.db,
        s.type,
        s.state,
        s.waitType,
        s.waitEvent,
        s.runtime,
        s.query,
      ].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "session_activity.csv";
    link.click();
  };

  return (
    <main className="session-section">
      {/* 상단 헤더 */}
      <header className="session-header">
        <div>
          <h2 className="session-title">Session Activity List</h2>
          <p className="session-sub">
            현재 PostgreSQL 인스턴스 내 활성 및 대기 세션 목록입니다.
          </p>
        </div>
        <button className="export-btn" onClick={handleExportCSV}>
          CSV 내보내기
        </button>
      </header>

      {/* 테이블 */}
      <section className="session-table-container">
        <div className="session-table-header">
          <div>PID</div>
          <div>사용자</div>
          <div>DB명</div>
          <div>작업 유형</div>
          <div>상태</div>
          <div>대기유형</div>
          <div>대기이벤트</div>
          <div>실행시간</div>
          <div>쿼리</div>
        </div>

        {currentSessions.map((s, idx) => (
          <div key={idx} className="session-table-row">
            <div>{s.pid}</div>
            <div>{s.user}</div>
            <div>{s.db}</div>
            <div>{s.type}</div>
            <div className="state-wrapper">
              <span className={`state ${s.state.replace(/\s+/g, "-")}`}>
                {s.state}
              </span>
            </div>
            <div>{s.waitType}</div>
            <div>{s.waitEvent}</div>
            <div>{s.runtime}</div>
            <div className="query-text">{s.query}</div>
          </div>
        ))}
      </section>

      {/* 페이지네이션 */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </main>
  );
}
