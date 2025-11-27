// 작성자: 김민서
// 좌측 알람 목록 컴포넌트

import React from "react";
import type { AlarmListItem } from "./AlarmFeedModal";

type Props = {
  alarms: AlarmListItem[];
  currentAlarmId?: number;
  loading: boolean;
  error: string | null;
  onSelectAlarm: (id: number) => void;
  onDeleteAlarm: (id: number) => void;
};

export default function AlarmList({
  alarms,
  currentAlarmId,
  loading,
  error,
  onSelectAlarm,
  onDeleteAlarm,
}: Props) {
  const unreadCount = alarms.filter((a) => !a.isRead).length;

  return (
    <aside className="am-alarms-list">
      <header className="am-alarms-list__header">
        <h3>알림 내역</h3>
        <span className="am-alarms-count">{unreadCount}</span>
      </header>

      <div className="am-alarms-list__body">
        {loading && <div className="am-alarms-empty">로딩 중...</div>}
        
        {!loading && error && (
          <div className="am-alarms-empty" style={{ color: "#EF4444" }}>
            {error}
          </div>
        )}
        
        {!loading && !error && alarms.length === 0 && (
          <div className="am-alarms-empty">알림이 없습니다</div>
        )}
        
        {!loading && !error && alarms.map((alarm) => (
          <div
            key={alarm.id}
            className={`am-alarm-item ${alarm.isRead ? "am-alarm-item--read" : ""} ${
              currentAlarmId === alarm.id ? "am-alarm-item--active" : ""
            }`}
            onClick={() => onSelectAlarm(alarm.id)}
          >
            <div className="am-alarm-item__header">
              <span className={`am-badge am-badge--${alarm.severity.toLowerCase()}`}>
                {alarm.severity}
              </span>
              <div className="am-alarm-item__actions">
                <button
                  className="am-alarm-action-btn am-alarm-action-btn--delete"
                  title="삭제"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("이 알림을 삭제하시겠습니까?")) {
                      onDeleteAlarm(alarm.id);
                    }
                  }}
                >
                  ×
                </button>
              </div>
            </div>
            <h4 className="am-alarm-item__title">{alarm.title}</h4>
            <p className="am-alarm-item__desc">{alarm.description}</p>
            <time className="am-alarm-item__time">{alarm.occurredAt}</time>
          </div>
        ))}
      </div>
    </aside>
  );
}
