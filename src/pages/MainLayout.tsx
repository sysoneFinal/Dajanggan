import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import { Outlet, useLocation } from "react-router-dom";

export default function MainLayout() {
  const location = useLocation();

  // 특정 경로에서는 전체 레이아웃 숨기기
  const hideLayout =
    location.pathname === "/" ;

  if (hideLayout) {
    return <Outlet />; // 헤더·사이드바 없이 렌더
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <Header />
        <Outlet /> {/* 각 페이지 내용 (Dashboard, Event 등) */}
      </div>
    </div>
  );
}
