import React ,{useState}from "react";
import "../../styles/event/event-log.css";
import Pagination from "../../components/util/Pagination";

const EventLogPage = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 5; // 임시 값 (API로 받아올 수 있음)

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    //  TODO: 여기서 API 호출 (예: fetchEventLogs(page))
  };
  
  return (
    <main className="event-log">
      {/*  상단 통계 카드 */}
      <section className="event-log__summary">
        <div className="summary-card">
          <h4>전체</h4>
          <p className="summary-value">147</p>
        </div>
        <div className="summary-card">
          <h4>정상</h4>
          <p className="summary-value normal">127</p>
        </div>
        <div className="summary-card">
          <h4>경고</h4>
          <p className="summary-value warn">15</p>
        </div>
        <div className="summary-card">
          <h4>위험</h4>
          <p className="summary-value danger">5</p>
        </div>
      </section>

      {/*  필터 선택 영역 */}
      <section className="event-log__filters">
        <div className="filter-item">All Database ⌄</div>
        <div className="filter-item">구분 ⌄</div>
        <div className="filter-item">Level ⌄</div>
        <div className="filter-item">최근 24시간 ⌄</div>
      </section>

      {/*  이벤트 테이블 */}
      <section className="event-log__table">
        <div className="table-header">
          <div>발생시각</div>
          <div>인스턴스</div>
          <div>DB명</div>
          <div>구분</div>
          <div>이벤트 유형</div>
          <div>자원유형</div>
          <div>User</div>
          <div>Level</div>
          <div>지속시간</div>
          <div>내용</div>
        </div>

        <div className="table-row">
          <div>2025-10-16 13:21:05</div>
          <div>inst-01</div>
          <div>orders_db</div>
          <div>Session</div>
          <div>Deadlock</div>
          <div>Lock</div>
          <div>sammy</div>
          <div className="warn">WARN</div>
          <div>10.3s</div>
          <div>트랜잭션 간 교착 발생</div>
        </div>

        <div className="table-row">
          <div>2025-10-16 13:22:11</div>
          <div>inst-01</div>
          <div>sales</div>
          <div>Query</div>
          <div>SlowQuery</div>
          <div>I/O</div>
          <div>db_user</div>
          <div className="info">INFO</div>
          <div>8.5s</div>
          <div>쿼리 실행 지연 감지</div>
        </div>

        <div className="table-row">
          <div>2025-10-16 13:23:27</div>
          <div>inst-01</div>
          <div>inventory</div>
          <div>System</div>
          <div>BufferIO</div>
          <div>Memory</div>
          <div>system</div>
          <div className="error">ERROR</div>
          <div>20.9s</div>
          <div>버퍼 캐시 과부하 탐지</div>
        </div>
      </section>

      {/* 페이지네이션 */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </main>
  );
};

export default EventLogPage;
