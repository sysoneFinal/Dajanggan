import { Routes, Route } from "react-router-dom";

// Pages 
import Home from "../pages/Home";
import Overview from "../pages/dashboard/Overview";
import EventPage from "../pages/eventlog/EventLogPage";
import InstanceRegister from "../pages/instance/InstanceRegister";
import InstanceEdit from "../pages/instance/InstanceEdit";
import InstancePage from "../pages/instance/InstancePage";
import VacuumOverview from "../pages/vacuum/VacuumOverview";
import VacuumMaintenance from "../pages/vacuum/VacuumMaintenance";
import VacuumSessionDetail from "../pages/vacuum/VacuumSessionDetail";
import VacuumHistory from "../pages/vacuum/VacuumHistory";
import VacuumRisk from "../pages/vacuum/VacuumRisk";
import VacuumBloat from "../pages/vacuum/VacuumBloat";
import VacuumBloatDetail from "../pages/vacuum/VacuumBloatDetail";
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
import TopQuery from "../pages/query/TopQuery";
import BGWriterPage from "../pages/engine/BGWriterPage";
import HotTablePage from "../pages/engine/HotTablePage";

const routeList = [
  // 헤더 없는 초기 페이지
  { path: "/", element: <Home /> },

  // 대시보드 메인
  { path: "/overview", element: <Overview /> },
  { path : "/layout", element : <LayoutBuilder />},
  { path : "/editor", element : <DashboardEditor />},

  // Instance 단위
  { path: "/instance/event", element: <EventPage /> },
  { path: "/instance/cpu", element: <CpuPage /> },
  { path: "/instance/checkpoint/dashboard", element: <CheckpointPage /> },
  { path: "/instance/bg-writer/dashboard", element: <BGWriterPage /> },
  

  // Database 단위
  { path: "/database/summary", element: <DatabaseDashboard /> },

  // Hot Table
    { path: "/database/hottable/dashboard", element: <HotTablePage /> },
    // { path: "/database/hottable/active", element: <HotTableListPage /> },

  // 세션
  { path: "/database/session/dashboard", element: <SessionPage /> },
  { path: "/database/session/active", element: <SessionListPage /> },

  // 쿼리
  { path: "/database/query/dashboard", element: <QueryOverview /> },
  { path: "/database/query/execution-stats", element: <ExecutionStatus /> },
  { path: "/database/query/top-n-query", element: <TopQuery /> },
  
  // Vacuum
  { path: "/database/vacuum/overview", element: <VacuumOverview /> },
  { path: "/database/vacuum/maintenance", element: <VacuumMaintenance /> },
  { path: "/database/vacuum/sessionDetail", element: <VacuumSessionDetail /> },
  { path: "/database/vacuum/history", element: <VacuumHistory /> },
  { path: "/database/vacuum/risk", element: <VacuumRisk /> },
  { path: "/database/vacuum/bloat", element: <VacuumBloat /> },
  { path: "/database/vacuum/bloatDetail", element: <VacuumBloatDetail /> },
  

  // 기타
  { path: "/instance-management", element: <InstancePage /> },
  { path: "/instance-register", element: <InstanceRegister /> },
  { path: "/instances/:id/edit", element: <InstanceEdit /> },
  { path: "/checkpoint", element: <CheckpointPage /> },
  

  // DB 단위 
  { path: "/session", element: <SessionPage /> },
  { path: "/query", element: <QueryOverview /> },
  { path: "/executionstatus", element: <ExecutionStatus /> },
  { path: "/topquery", element: <TopQuery /> },


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
