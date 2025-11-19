import React, { createContext, useContext, useState } from 'react';
import "../styles/util/loader.css";

// 전역 로더 Context 생성
const LoaderContext = createContext<any>(null);

// WiFi 로더 컴포넌트
const WifiLoader = ({ message }: { message: string }) => {
  return (
    <div className="loader-overlay">
      <div className="loader-container">
        <div className="wifi-loader-wrapper">
          <div id="wifi-loader">
            <svg className="circle-outer" viewBox="0 0 86 86">
              <circle className="back" cx={43} cy={43} r={40} />
              <circle className="front" cx={43} cy={43} r={40} />
              <circle className="new" cx={43} cy={43} r={40} />
            </svg>
            <svg className="circle-middle" viewBox="0 0 60 60">
              <circle className="back" cx={30} cy={30} r={27} />
              <circle className="front" cx={30} cy={30} r={27} />
            </svg>
            <svg className="circle-inner" viewBox="0 0 34 34">
              <circle className="back" cx={17} cy={17} r={14} />
              <circle className="front" cx={17} cy={17} r={14} />
            </svg>
            <div className="text" />
          </div>
        </div>
        {message && <p className="loading-message">{message}</p>}
      </div>
    </div>
  );
};

// 로더 Provider 컴포넌트
export const LoaderProvider = ({ children }: any) => {
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const showLoader = (message = '') => {
    setLoadingMessage(message);
    setLoading(true);
  };

  const hideLoader = () => {
    setLoading(false);
    setLoadingMessage('');
  };

  return (
    <LoaderContext.Provider value={{ loading, showLoader, hideLoader }}>
      {children}
      {loading && <WifiLoader message={loadingMessage} />}
    </LoaderContext.Provider>
  );
};

// 로더 사용을 위한 커스텀 Hook
export const useLoader = () => {
  const context = useContext(LoaderContext);
  if (!context) {
    throw new Error('useLoader는 LoaderProvider 내부에서 사용해야 합니다');
  }
  return context;
};