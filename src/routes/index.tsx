import { Routes, Route } from "react-router-dom";

// Pages 
import Home from "../pages/Home";
import Overview from "../pages/dashboard/Overview";
import EventPage from "../pages/eventlog/EventLogPage";
import InstanceRegister from "../pages/instance/InstanceRegister";
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
import SessionDashboard from "../pages/session/SessionDashboard";
import DatabaseDashboard from "../pages/dashboard/DatabaseOverview";
import SessionListPage from "../pages/session/SessionListPage";

import LayoutBuilder from "../components/dashboard/Layout";
import DashboardEditor from "../components/dashboard/DashboardEditor";
import ExecutionStatus from "../pages/query/ExecutionStatus";
import QueryOverview from "../pages/query/QueryOverview";
import QueryTuner from "../pages/query/QueryTuner";
import BGWriterPage from "../pages/engine/BGWriterPage";
import HotTablePage from "../pages/engine/HotTablePage";
import HotIndexPage from "../pages/engine/HotIndexPage.tsx";
import MemoryPage from "../pages/system/MemoryPage.tsx";
import DiskPage from "../pages/system/DiskPage.tsx";
import AlarmList from "../pages/alarm/AlarmList";
import CheckPointListPage from "../pages/engine/CheckPointListPage.tsx";
import BGWriterListPage from "../pages/engine/BGWriterListPage.tsx";
import DiskListPage from "../pages/system/DiskListPage.tsx";
import CPUListPage from "../pages/system/CpuListPage.tsx";
import MemoryListPage from "../pages/system/MemoryListPage.tsx";
import HotIndexListPage from "../pages/engine/HotIndexListPage.tsx";
import HotTableListPage from "../pages/engine/HotTableListPage.tsx";


interface AppRoutesProps {
  isEditing?: boolean;
}

export const AppRoutes = ({ isEditing = false }: AppRoutesProps) => {

const routeList = [
  // 헤더 없는 초기 페이지
  { path: "/", element: <Home /> },

  // 대시보드 메인
  { path: "/overview", element: <Overview isEditing={isEditing}/> },
  { path : "/layout", element : <LayoutBuilder />},
  { path : "/editor", element : <DashboardEditor />},

  // Instance 단위
  { path: "/instance/event", element: <EventPage /> },

  // cpu
  { path: "/instance/cpu/details", element: <CpuPage /> },
  { path: "/instance/cpu/usage", element: <CPUListPage /> },

  { path: "/instance/memory/details", element: <MemoryPage /> },
  { path: "/instance/memory/buffer-usage", element: <MemoryListPage /> },

  // disk i/o
  { path: "/instance/disk/details", element: <DiskPage /> },
  { path: "/instance/disk/breakdown", element: <DiskListPage /> },

  // CheckPoint
  { path: "/instance/checkpoint/details", element: <CheckpointPage /> },
  { path: "/instance/checkpoint/list", element: <CheckPointListPage /> },

  // BGWriter
  { path: "/instance/bgwriter/details", element: <BGWriterPage /> },
  { path: "/instance/bgwriter/efficiency", element: <BGWriterListPage /> },

  // Database 단위
  { path: "/database/summary", element: <DatabaseDashboard /> },

  // Hot Table
    { path: "/database/hottable/details", element: <HotTablePage /> },
    { path: "/database/hottable/detail", element: <HotTableListPage /> },

  // Hot Index
  { path: "/database/hotindex/details", element: <HotIndexPage /> },
  { path: "/database/hotindex/detail", element: <HotIndexListPage /> },

  // 세션
  { path: "/database/session/details", element: <SessionDashboard /> },
  { path: "/database/session/active", element: <SessionListPage /> },

  // 쿼리
  { path: "/database/query/details", element: <QueryOverview /> },
  { path: "/database/query/execution-stats", element: <ExecutionStatus /> },
  { path: "/database/query/query-analysis", element: <QueryTuner /> },

  // Vacuum
  { path: "/database/vacuum/overview", element: <VacuumOverview /> },
  { path: "/database/vacuum/maintenance", element: <VacuumMaintenance /> },
  { path: "/database/vacuum/session-detail", element: <VacuumSessionDetail /> },
  { path: "/database/vacuum/history", element: <VacuumHistory /> },
  { path: "/database/vacuum/risk", element: <VacuumRisk /> },
  { path: "/database/vacuum/bloat", element: <VacuumBloat /> },
  { path: "/database/vacuum/bloat-detail", element: <VacuumBloatDetail /> },


  // 기타
  { path: "/instance-management", element: <InstancePage /> },
  { path: "/instance-register", element: <InstanceRegister /> },
  // 알람
  { path: "/alarm", element: <AlarmList /> },
];


  return (
    <Routes>
      {routeList.map(({ path, element }) => (
        <Route key={path} path={path} element={element} />
      ))}
    </Routes>
  );
}