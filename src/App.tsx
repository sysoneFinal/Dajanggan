import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppRoutes } from "./routes";
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import { DashboardProvider } from "./context/DashboardContext";
import { InstanceProvider } from "./context/InstanceContext";
import { SIDEBAR_MENU } from "./components/layout/SidebarMenu";
import { getBreadcrumbOrFallback } from "./components/layout/FindBreadcrumb";
import { LoaderProvider } from "./context/LoaderContext";


export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 모든 쿼리를 즉시 stale 처리 → 항상 최신 데이터 fetch
      staleTime: 0,

      // 컴포넌트 unmount 시 캐시 즉시 삭제
      cacheTime: 0,

      // 화면 focus나 reconnect 시 자동 refetch 방지
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,

      // 실패 시 재시도 횟수
      retry: 1,

      // fetch 시 기본 로딩 상태 유지 (optional)
      refetchInterval: 0,
    },
  },
});


function App() {
  const location = useLocation();
  const noLayoutRoutes = ["/"];
  const hideLayout = noLayoutRoutes.includes(location.pathname);

  const [breadcrumb, setBreadcrumb] = useState(() =>
    getBreadcrumbOrFallback(SIDEBAR_MENU, location.pathname)
  );

  useEffect(() => {
    if (hideLayout) return;
    const next = getBreadcrumbOrFallback(SIDEBAR_MENU, location.pathname);
    setBreadcrumb((prev) =>
      prev.join("›") === next.join("›") ? prev : next
    );
  }, [hideLayout, location.pathname]);

  return (
  <LoaderProvider>
    <QueryClientProvider client={queryClient}>
      <InstanceProvider>
        <DashboardProvider>
          <div className="app-background">
            {hideLayout ? (
              <AppRoutes />
            ) : (
              <div className="app-main">
                <Sidebar onChangeBreadcrumb={setBreadcrumb} />

                <div className="app-content">
                  <Header breadcrumb={breadcrumb} />
                  <AppRoutes />
                </div>
              </div>
            )}
          </div>
        </DashboardProvider>
      </InstanceProvider>
    </QueryClientProvider>
  </LoaderProvider>
  );
}

export default App;
