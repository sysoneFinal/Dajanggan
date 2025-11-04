import { useState } from "react";
import { useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppRoutes } from "./routes";
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";

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

  /** 헤더 · 브레드크럼 · 대시보드 편집 상태 */
  const [breadcrumb, setBreadcrumb] = useState(["Database", "Session", "Dashboard"]);
  const [isEditing, setIsEditing] = useState(false);

  /** 편집 모드 토글 */
  const handleToggleEdit = () => {
    setIsEditing((prev) => !prev);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="app-background">
        {hideLayout ? (
          <AppRoutes />
        ) : (
          <div className="app-main">
            <Sidebar onChangeBreadcrumb={setBreadcrumb} />

            <div className="app-content">
              <Header
                breadcrumb={breadcrumb}
                isEditing={isEditing}
                onToggleEdit={handleToggleEdit}
              />
              <AppRoutes isEditing={isEditing} />
            </div>
          </div>
        )}
      </div>
    </QueryClientProvider>
  );
}

export default App;
