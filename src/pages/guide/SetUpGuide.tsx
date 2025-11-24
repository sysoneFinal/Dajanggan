import React from "react";
import { useNavigate } from "react-router-dom";
import "/src/styles/guide/setup-guide.css";

const SetupGuide: React.FC = () => {
  const navigate = useNavigate();

  const handleConfirm = () => {
    // 인스턴스 선택 페이지로 이동 (헤더 없는 페이지)
    navigate("/home");
  };

  return (
    <div className="sg-root">
      <div className="sg-card">
        <div className="sg-header">
          <h1 className="sg-title">시작 전 가이드</h1>
          <p className="sg-sub">
            Dajanggan을 사용하기 위해 아래 설정을 완료해주세요
          </p>
        </div>

        <div className="sg-content">
          {/* 1. pg_stat_statements 설치 */}
          <div className="sg-section">
            <div className="sg-section-header">
              <span className="sg-number">1</span>
              <h2 className="sg-section-title">
                더 정확한 쿼리 성능 분석을 위해 DB에 pg_stat_statements를 확장 설치해주세요
              </h2>
            </div>
            <div className="sg-code-block">
              <pre className="sg-code">
                <code>{`-- PostgreSQL에 연결 후 실행
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- 설치 확인
SELECT * FROM pg_extension WHERE extname = 'pg_stat_statements';`}</code>
              </pre>
              <button
                className="sg-copy-btn"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `CREATE EXTENSION IF NOT EXISTS pg_stat_statements;\n\nSELECT * FROM pg_extension WHERE extname = 'pg_stat_statements';`
                  );
                  alert("클립보드에 복사되었습니다!");
                }}
              >
                복사
              </button>
            </div>
            <div className="sg-hint">
              <strong>참고:</strong> pg_stat_statements는 PostgreSQL의 쿼리 성능 통계를 수집하는 확장 모듈입니다.
              이를 통해 실행된 모든 SQL 문의 통계를 추적하고 분석할 수 있습니다.
            </div>
          </div>

          {/* 2. Agent 설치 */}
          <div className="sg-section">
            <div className="sg-section-header">
              <span className="sg-number">2</span>
              <h2 className="sg-section-title">
                시스템 사용률 수집을 위해 Agent를 설치해주세요
              </h2>
            </div>
            <div className="sg-code-block">
              <pre className="sg-code">
                <code>{`# Agent 다운로드 및 설치
curl -O https://dajanggan.io/agent/install.sh
chmod +x install.sh
sudo ./install.sh

# Agent 시작
sudo systemctl start dajanggan-agent
sudo systemctl enable dajanggan-agent

# 설치 확인
sudo systemctl status dajanggan-agent`}</code>
              </pre>
              <button
                className="sg-copy-btn"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `curl -O https://dajanggan.io/agent/install.sh\nchmod +x install.sh\nsudo ./install.sh\n\nsudo systemctl start dajanggan-agent\nsudo systemctl enable dajanggan-agent\n\nsudo systemctl status dajanggan-agent`
                  );
                  alert("클립보드에 복사되었습니다!");
                }}
              >
                복사
              </button>
            </div>
            <div className="sg-hint">
              <strong>참고:</strong> Dajanggan Agent는 서버의 CPU, 메모리, 디스크 사용률 등의 시스템 메트릭을 수집합니다.
              Agent 설치 후 약 1-2분 내에 데이터 수집이 시작됩니다.
            </div>
          </div>
        </div>

        <div className="sg-footer">
          <button className="sg-btn-primary" onClick={handleConfirm}>
            확인, 인스턴스 선택하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetupGuide;