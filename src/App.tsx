import { AppRoutes } from "./routes";
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// QueryClient 생성 (전역 캐싱 설정)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 캐시 데이터 유지 시간 (ms) → 5분간 캐시 유지
      staleTime: 5 * 60 * 1000,
      // 캐시에서 제거되기 전까지의 시간 (ms)
      gcTime: 10 * 60 * 1000,
      // 윈도우 포커스 시 자동 리패치 비활성화
      refetchOnWindowFocus: false,
      // 네트워크 재연결 시 자동 리패치 비활성화
      refetchOnReconnect: false,
      // 실패 시 재시도 횟수
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="app-background">
        <div className="app-layout">
          <Sidebar />
          <div className="app-main">
            <Header />
            <AppRoutes />
          </div>
        </div>
      </div>
    </QueryClientProvider>
  );
}

export default App;
