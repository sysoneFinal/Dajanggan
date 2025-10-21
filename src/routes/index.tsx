import { Routes, Route } from "react-router-dom";
import Home from "../pages/Home";
import Overview from "../pages/dashboard/Overview";
import EventPage from "../pages/eventlog/EventLogPage";
import InstancePage from "../pages/instance/InstancePage";
import SessionPage from "../pages/session/SessionPage";
import CheckpointPage from "../pages/engine/CheckPointPage";
import QueryPage from "../pages/query/QueryPage";
import VacuumPage from "../pages/vacuum/VacuumPage";
import CpuPage from "../pages/system/CpuPage";
import AlarmPage from "../pages/alarm/AlarmPage";

const routeList = [
  { path: "/", element: <Home /> },
  { path: "/overview", element: <Overview /> },
  { path: "/event", element: <EventPage /> },

  // Instance 단위
  { path: "/cpu", element: <CpuPage /> },
  { path: "/instance-management", element: <InstancePage /> },
  { path: "/checkpoint", element: <CheckpointPage /> },

  // DB 단위 
  { path: "/session", element: <SessionPage /> },
  { path: "/query", element: <QueryPage /> },
  { path: "/vacuum", element: <VacuumPage /> },

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
