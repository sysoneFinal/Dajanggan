import { Routes, Route } from "react-router-dom";

// Pages 
import Home from "../pages/Home";
import Overview from "../pages/dashboard/Overview";
import EventPage from "../pages/eventlog/EventLogPage";
import InstanceRegister from "../pages/instance/InstanceRegister";
import InstancePage from "../pages/instance/InstancePage";
import VacuumPage from "../pages/vacuum/VacuumPage";
import CpuPage from "../pages/system/CpuPage";
import CheckpointPage from "../pages/engine/CheckPointPage";
import SessionPage from "../pages/session/SessionPage";
import DatabaseDashboard from "../pages/dashboard/DatabaseOverview";
import SessionListPage from "../pages/session/SessionListPage";

import AlarmPage from "../pages/alarm/AlarmPage";
import LayoutBuilder from "../components/dashboard/Layout";
import DashboardEditor from "../components/dashboard/DashboardEditor";
import ExecutionStatus from "../pages/query/ExecutionStatus";
import QueryOverview from "../pages/query/QueryOverview";

const routeList = [
  // 헤더 없는 초기 페이지
  { path: "/", element: <Home />, layout: "none" },

  // 대시보드 메인
  { path: "/overview", element: <Overview /> },
  { path : "/layout", element : <LayoutBuilder />},
  { path : "/editor", element : <DashboardEditor />},

  // Instance 단위
  { path: "/instance/cpu", element: <CpuPage /> },
  { path: "/instance/checkpoint", element: <CheckpointPage /> },
  { path: "/instance/event", element: <EventPage /> },


  // Database 단위
  { path: "database/summary", element: <DatabaseDashboard /> },
  // 세션
  { path: "/database/session", element: <SessionPage /> },
  { path: "/database/sessionList", element: <SessionListPage /> },
  // 쿼리
  { path: "/database/query", element: <QueryOverview /> },
  { path: "/database/executionstatus", element: <ExecutionStatus /> },
  // Vacuum
  { path: "/database/vacuum", element: <VacuumPage /> },
  


  // 기타
  { path: "/instance-management", element: <InstancePage /> },
  { path: "/instance-register", element: <InstanceRegister /> },


  // 알람
  { path: "/alarm", element: <AlarmPage /> },
];


export const AppRoutes = () => (
  <Routes>
    {routeList.map(({ path, element }) => (
      <Route key={path} path={path} element={element} />
    ))}
  </Routes>
);
