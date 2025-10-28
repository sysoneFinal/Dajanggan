import React, { useState, useEffect } from "react";
import "../../styles/event/event-log.css";
import Pagination from "../../components/util/Pagination";
import CsvButton from "../../components/util/CsvButton";
import MultiSelectDropdown from "../../components/util/MultiSelectDropdown";

interface EventLog {
  time: string;
  instance: string;
  db: string;
  category: string;
  eventType: string;
  resource: string;
  user: string;
  level: string;
  duration: string;
  message: string;
}

const EventLogPage = () => {
  // 상단 카드 데이터 상태
  const [totalCount, setTotalCount] = useState(147);
  const [normalCount, setNormalCount] = useState(127);
  const [warnCount, setWarnCount] = useState(15);
  const [dangerCount, setDangerCount] = useState(5);

  // 이벤트 로그 리스트 상태
  const [eventLogs, setEventLogs] = useState<EventLog[]>([
    {
      time: "2025-10-16 13:21:05",
      instance: "inst-01",
      db: "orders_db",
      category: "Session",
      eventType: "Deadlock",
      resource: "Lock",
      user: "sammy",
      level: "WARN",
      duration: "10.3s",
      message: "트랜잭션 간 교착 발생",
    },
    {
      time: "2025-10-16 13:22:11",
      instance: "inst-01",
      db: "sales",
      category: "Query",
      eventType: "SlowQuery",
      resource: "I/O",
      user: "db_user",
      level: "INFO",
      duration: "8.5s",
      message: "쿼리 실행 지연 감지",
    },
    {
      time: "2025-10-16 13:23:27",
      instance: "inst-01",
      db: "inventory",
      category: "System",
      eventType: "BufferIO",
      resource: "Memory",
      user: "system",
      level: "ERROR",
      duration: "20.9s",
      message: "버퍼 캐시 과부하 탐지",
    },
  ]);

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCountAll, setTotalCountAll] = useState(eventLogs.length); // 추후 API totalCount로 교체
  const itemsPerPage = 10;
  const totalPages = Math.ceil(totalCountAll / itemsPerPage);

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // TODO: fetchEventLogs(page) 호출
  };

  // 나중에 실제 API로 데이터 
  const fetchEventLogs = async (page: number) => {
    try {
      const response = await fetch(`/api/event-logs?page=${page}&size=${itemsPerPage}`);
      const data = await response.json();

      // 예시 응답 구조:
      // {
      //   "summary": { "total": 147, "normal": 127, "warn": 15, "danger": 5 },
      //   "content": [ { time: "...", instance: "...", ... } ],
      //   "totalCount": 147
      // }

      // 나중에 주석 해제해서 사용
      // setTotalCount(data.summary.total);
      // setNormalCount(data.summary.normal);
      // setWarnCount(data.summary.warn);
      // setDangerCount(data.summary.danger);
      // setEventLogs(data.content);
      // setTotalCountAll(data.totalCount);
    } catch (error) {
      console.error("이벤트 로그 불러오기 실패:", error);
    }
  };

  useEffect(() => {
    // fetchEventLogs(currentPage);
  }, [currentPage]);

  return (
    <main className="event-log">
      {/* 상단 통계 카드 */}
      <section className="event-log__summary">
        <div className="summary-card">
          <h4>최근 15분 내 전체 이벤트</h4>
          <p className="summary-value">{totalCount}</p>
        </div>
        <div className="summary-card">
          <h4>정상 이벤트</h4>
          <p className="summary-value normal">{normalCount}</p>
        </div>
        <div className={`summary-card ${warnCount > 0 ? "warn-active" : ""}`}>
          <h4>경고 발생</h4>
          <p className="summary-value warn">{warnCount}</p>
        </div>
        <div className={`summary-card ${dangerCount > 0 ? "danger-active" : ""}`}>
          <h4>위험 발생</h4>
          <p className="summary-value danger">{dangerCount}</p>
        </div>
      </section>


      {/* 필터 선택 영역 */}
      <section className="event-log__filters">
          <MultiSelectDropdown
            label="Database 선택"
            options={[
              "api로 불러와야함",
            ]}
            onChange={(values) => console.log("선택된 DB:", values)}
          />
          <MultiSelectDropdown
            label="구분"
            options={[
              "CPU",
              "Memory",
              "Checkpoint",
              "Disk I/O",
              "Vacuum",
              "Session",
              "Query",
              "BGWriter",
            ]}
            onChange={(values) => console.log("선택된 구분:", values)}
          />
          <MultiSelectDropdown
              label="레벨"
              options={[
                "INFO",
                "WARN",
                "ERROR",
              ]}
              onChange={(values) => console.log("선택된 레벨:", values)}
            />
        <MultiSelectDropdown
              label="시간 선택"
              options={[
                "최근 1시간 이내",
                "최근 3시간 이내",
                "최근 6시간 이내",
                "최근 12시간 이내",
                "오늘",
              ]}
              onChange={(values) => console.log("선택된 레벨:", values)}
            />
        <CsvButton  tooltip="CSV 파일 저장" onClick={()=>{console.log("다운로드")}}/>

      </section>

      {/* 이벤트 테이블 */}
      <section className="event-log__table">
        <div className="e-table-header">
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

        {eventLogs.length > 0 ? (
          eventLogs.map((e, i) => (
            <div key={i} className="e-table-row">
              <div>{e.time}</div>
              <div>{e.instance}</div>
              <div>{e.db}</div>
              <div>{e.category}</div>
              <div>{e.eventType}</div>
              <div>{e.resource}</div>
              <div>{e.user}</div>
              <div className={e.level.toLowerCase()}>{e.level}</div>
              <div>{e.duration}</div>
              <div>{e.message}</div>
            </div>
          ))
        ) : (
          <div className="e-table-empty">데이터가 없습니다.</div>
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
    </main>
  );
};

export default EventLogPage;
