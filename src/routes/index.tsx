import { Routes, Route } from "react-router-dom";
import Home from "../pages/Home";
import Overview from "../pages/dashboard/Overview";
import EventPage from "../pages/eventlog/EventLogPage";
import InstanceRegister from "../pages/instance/InstanceRegister";
import InstanceEdit from "../pages/instance/InstanceEdit";
import InstancePage from "../pages/instance/InstancePage";
import SessionPage from "../pages/session/SessionPage";
import CheckpointPage from "../pages/engine/CheckPointPage";
import VacuumOverview from "../pages/vacuum/VacuumOverview";
import VacuumMaintenance from "../pages/vacuum/VacuumMaintenance";
import VacuumHistory from "../pages/vacuum/VacuumHistory";
import CpuPage from "../pages/system/CpuPage";
import AlarmPage from "../pages/alarm/AlarmPage";
import ExecutionStatus from "../pages/query/ExecutionStatus";
import QueryOverview from "../pages/query/QueryOverview";
import TopQuery from "../pages/query/TopQuery";
import BGWriterPage from "../pages/engine/BGWriterPage";

const routeList = [
  { path: "/", element: <Home /> },
  { path: "/overview", element: <Overview /> },
  { path: "/event", element: <EventPage /> },

  // Instance 단위
  { path: "/cpu", element: <CpuPage /> },
  { path: "/instance-management", element: <InstancePage /> },
  { path: "/instance-register", element: <InstanceRegister /> },
  { path: "/instances/:id/edit", element: <InstanceEdit /> },
  { path: "/checkpoint", element: <CheckpointPage /> },
  { path: "/bgwriter", element: <BGWriterPage /> },

  // DB 단위 
  { path: "/session", element: <SessionPage /> },

  { path: "/query", element: <QueryOverview /> },
  { path: "/vacuum", element: <VacuumOverview /> },
  { path: "/vacuum-maintenance", element: <VacuumMaintenance /> },
  { path: "/vacuum-history", element: <VacuumHistory /> },
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
