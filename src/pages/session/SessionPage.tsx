import "@/styles/dashboard/sessionDashboard.css";
import Chart from "../../components/chart/ChartComponent";  

export default function SessionDashboard() {
  return (
    <div className="session-dashboard">
      {/* 상단 요약 카드 영역 */}
      <div className="summary-cards">
        <div className="summary-card">
          <p className="label">Active Sessions</p>
          <h2>10</h2>
          <span className="desc">최근 5분 평균 기준</span>
        </div>
        <div className="summary-card">
          <p className="label">Idle In Transaction</p>
          <h2>2</h2>
          <span className="desc">최근 5분 평균 기준</span>
        </div>
        <div className="summary-card">
          <p className="label">Waiting Sessions</p>
          <h2>2</h2>
          <span className="desc">최근 5분 평균 기준</span>
        </div>
        <div className="summary-card">
          <p className="label">Avg Transaction Time</p>
          <h2>3.8s</h2>
          <span className="desc">최근 5분 평균 기준</span>
        </div>
        <div className="summary-card warn-active">
          <p className="label">DeadLocks</p>
          <h2>1</h2>
          <span className="desc">최근 10분 이내 발생</span>
        </div>
      </div>

      {/* 하단 차트 영역 */}
      <div className="chart-grid">
        <Chart
          type="area"
          titleOptions={{ text: "Session State Trend (Last 30 Minutes)" }}
          series={[
            { name: "Active", data: [10, 12, 11, 14, 13, 12] },
            { name: "Idle", data: [3, 4, 2, 3, 2, 2] },
            { name: "Waiting", data: [1, 1, 2, 2, 3, 3] },
          ]}
          categories={["10:00", "10:05", "10:10", "10:15", "10:20", "10:25"]}
          colors={["#7B61FF", "#9AA0F7", "#FF9FAE"]}
          height={200}
        />

        <Chart
          type="bar"
          titleOptions={{ text: "Wait Event Type Ratio (Last 15 Minutes)" }}
          series={[
            { name: "Lock", data: [25, 30, 20, 25, 15] },
            { name: "IO", data: [40, 30, 25, 35, 30] },
            { name: "Client", data: [15, 20, 30, 25, 40] },
            { name: "LWLock", data: [20, 20, 25, 15, 15] },
          ]}
          categories={["10:15", "10:20", "10:25", "10:30", "10:35"]}
          colors={["#7B61FF", "#FF928A", "#FFD66B", "#9BE7C4"]}
          height={200}
        />

        <Chart
          type="radialBar"
          titleOptions={{ text: "Connection Usage" }}
          series={[50]}
          categories={[""]}
          colors={["#7B61FF"]}
          height={220}
        />

        <Chart
          type="line"
          titleOptions={{ text: "Avg Transaction Duration (Last 30 Minutes)" }}
          series={[{ name: "Avg Tx Duration", data: [3, 4, 5, 7, 6, 5] }]}
          categories={["10:00", "10:05", "10:10", "10:15", "10:20", "10:25"]}
          colors={["#7B61FF"]}
          height={200}
        />

        <Chart
          type="line"
          titleOptions={{ text: "Avg Lock Wait Time (Last 30 Minutes)" }}
          series={[{ name: "Lock Wait", data: [2, 3, 5, 6, 5, 4] }]}
          categories={["10:00", "10:05", "10:10", "10:15", "10:20", "10:25"]}
          colors={["#FF9FAE"]}
          height={200}
        />

        <Chart
          type="bar"
          titleOptions={{ text: "Top Users by Session Count" }}
          series={[{ name: "Session Count", data: [42, 18, 8, 4] }]}
          categories={["app_user", "batch_service", "admin_user", "report_user"]}
          colors={["#7B61FF"]}
          height={200}
        />

        <Chart
          type="line"
          titleOptions={{ text: "DeadLock Count Trend (Last 30 Minutes)" }}
          series={[{ name: "DeadLock Count", data: [0, 1, 0, 2, 1, 0] }]}
          categories={["10:00", "10:05", "10:10", "10:15", "10:20", "10:25"]}
          colors={["#FF6363"]}
          height={200}
        />
      </div>

      {/* Deadlock 상세 테이블 */}
      <div className="deadlock-table">
        <h3>Recent Deadlocks (Latest 3)</h3>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>User</th>
              <th>Table</th>
              <th>Message</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>10:22</td>
              <td>batch_user</td>
              <td>orders</td>
              <td className="warn">Deadlock occurred</td>
              <td>4.8s</td>
            </tr>
            <tr>
              <td>10:18</td>
              <td>api_user</td>
              <td>sessions</td>
              <td className="warn">Conflict with transaction</td>
              <td>6.1s</td>
            </tr>
            <tr>
              <td>10:15</td>
              <td>admin</td>
              <td>payments</td>
              <td className="warn">Lock chain detected</td>
              <td>4.2s</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
