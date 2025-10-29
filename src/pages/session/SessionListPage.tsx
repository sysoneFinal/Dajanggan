import React, { useState, useEffect } from "react";
import "../../styles/session/sessionActivityList.css";
import Pagination from "../../components/util/Pagination";
import apiClient from "../../api/apiClient";
import SessionDetailModal from "../../components/session/SessionDetailModal";
import type { SessionDetail } from "../../components/session/SessionDetailModal";

interface Session {
  pid: number;
  user: string;
  db: string;
  type: string;
  state: string;
  waitType: string;
  waitEvent: string;
  runtime: string;
  query: string;
}

export default function SessionActivityList() {
  // 더미 데이터
  const [sessions, setSessions] = useState<Session[]>(
    Array.from({ length: 22 }).map((_, i) => ({
      pid: 1300 + i,
      user: i % 2 === 0 ? "sammy" : "doyoung",
      db: "post1_db",
      type: i % 2 === 0 ? "vacuum" : "select",
      state: i % 3 === 0 ? "waiting" : "active",
      waitType: i % 2 === 0 ? "Lock" : "IO",
      waitEvent: i % 2 === 0 ? "transactionid" : "buffer_io",
      runtime: `${5 + i}m ${i * 2}s`,
      query:
        i % 2 === 0
          ? "SELECT user_id, username, address, status FROM users WHERE id = 10;"
          : "DELETE FROM orders WHERE id = 5;",
    }))
  );

  // 선택된 세션 (모달용)
  const [selectedSession, setSelectedSession] = useState<SessionDetail | null>(
    null
  );

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(sessions.length);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentSessions = sessions.slice(startIndex, startIndex + itemsPerPage);

  // 페이지 변경
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  //  행 클릭 시 모달 오픈
  const handleRowClick = (session: Session) => {
    const detail: SessionDetail = {
      pid: session.pid,
      user: session.user,
      db: session.db,
      waitType: session.waitType,
      waitEvent: session.waitEvent,
      duration: session.runtime,
      state: session.state,
      cpu: "34%",
      memory: "12MB",
      query: session.query,
      startTime: "2025-10-24 11:03:12",
    };
    setSelectedSession(detail);
  };

  // CSV 내보내기
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

  // (나중에 실제 API로 연결할 때)
  const fetchSessions = async (page: number) => {
    try {
      const response = await apiClient.get(
        `/api/sessions?page=${page}&size=${itemsPerPage}`
      );
      const data = await response.data;
      // setSessions(data.content || []);
      // setTotalCount(data.totalCount || 0);
    } catch (error) {
      console.error("세션 데이터를 불러오지 못했습니다:", error);
    }
  };

  useEffect(() => {
    // fetchSessions(currentPage);
  }, [currentPage]);

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

        {currentSessions.length > 0 ? (
          currentSessions.map((s, idx) => (
            <div
              key={idx}
              className="session-table-row"
              onClick={() => handleRowClick(s)}
            >
              <div>{s.pid}</div>
              <div>{s.user}</div>
              <div>{s.db}</div>
              <div>{s.type}</div>
              <div className="state-wrapper">
                <span className={`state ${s.state}`}>{s.state}</span>
              </div>
              <div>{s.waitType}</div>
              <div>{s.waitEvent}</div>
              <div>{s.runtime}</div>
              <div className="query-text">{s.query}</div>
            </div>
          ))
        ) : (
          <div className="session-empty">데이터가 없습니다.</div>
        )}
      </section>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}

      {/* 세션 상세 모달 */}
      {selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </main>
  );
}
