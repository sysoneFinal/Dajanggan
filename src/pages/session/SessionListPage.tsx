import React, { useState } from "react";
import "../../styles/session/sessionActivityList.css";

export default function SessionActivityList() {

  const [sessions] = useState([
    {
      pid: 1324,
      user: "sammy",
      db: "post1_db",
      type: "vacuum",
      state: "active",
      waitType: "Lock",
      waitEvent: "transactionid",
      runtime: "05m 32s",
      query: "SELECT * FROM users",
    },
    {
      pid: 2748,
      user: "doyoung",
      db: "post1_db",
      type: "select",
      state: "waiting",
      waitType: "IO",
      waitEvent: "buffer_io",
      runtime: "22m 04s",
      query: "SELECT * FROM logs;",
    },
  ]);

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
    <div className="session-section">
      <div className="session-header">
        <div>
          <h2 className="session-title">Session Activity List</h2>
          <p className="session-sub">
            현재 PostgreSQL 인스턴스 내 활성 및 대기 세션 목록입니다.
          </p>
        </div>
        <button className="export-btn" onClick={handleExportCSV}>
          CSV 내보내기 ⬇️
        </button>
      </div>

      <div className="session-table-container">
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
        {sessions.map((s, idx) => (
          <div key={idx} className="session-table-row">
            <div>{s.pid}</div>
            <div>{s.user}</div>
            <div>{s.db}</div>
            <div>{s.type}</div>
            <div className={`state ${s.state}`}>{s.state}</div>
            <div>{s.waitType}</div>
            <div>{s.waitEvent}</div>
            <div>{s.runtime}</div>
            <div className="query-text">{s.query}</div>
          </div>
        ))}
      </div>
    </div>
  );
}