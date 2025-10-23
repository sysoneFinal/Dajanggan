import axios, {
  AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import type { AxiosInstance } from 'axios';

/**
 * Axios 인스턴스 생성
 * - 공통 baseURL 및 timeout 설정
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
	@@ -22,7 +22,9 @@ const apiClient: AxiosInstance = axios.create({
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    return config;
  },
  (error: AxiosError) => {
    console.error('요청 에러:', error.message);
    return Promise.reject(error);
  }
);

/**
 * 응답 인터셉터
 * - 공통 에러 처리 및 응답 래핑
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response) {
      console.error('응답 에러 상태:', error.response.status, error.response.data);
    } else {
      console.error('서버 응답 없음:', error.message);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
