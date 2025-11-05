import { useState } from "react";
import { useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppRoutes } from "./routes";
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import { DashboardProvider } from "./context/DashboardContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

function App() {
  const location = useLocation();
  const noLayoutRoutes = ["/"];
  const hideLayout = noLayoutRoutes.includes(location.pathname);

  const [breadcrumb, setBreadcrumb] = useState(["Database", "Session", "Dashboard"]);

  return (
    <QueryClientProvider client={queryClient}>
      <DashboardProvider>
        <div className="app-background">
          {hideLayout ? (
            <AppRoutes />
          ) : (
            <div className="app-main">
              <Sidebar onChangeBreadcrumb={setBreadcrumb} />

              <div className="app-content">
                {/* Header와 OverviewPage 둘 다 같은 context를 공유함 */}
                <Header breadcrumb={breadcrumb} />
                <AppRoutes />
              </div>
            </div>
          )}
        </div>
      </DashboardProvider>
    </QueryClientProvider>
  );
}

export default App;
