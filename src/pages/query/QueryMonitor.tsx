import { useState, useEffect } from 'react';
import '../../styles/layout/query-monitor.css';
import ApexCharts from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

/**
 * Query 모니터링 페이지
 * - TPS/QPS 실시간 그래프 표시
 * - 슬로우 쿼리 TOP 5 리스트
 * - 리소스 사용률 표시
 * - 현재 성능 지표 카드 (TPS, QPS, 활성 세션, 응답 시간)
 * 
 * @author 이해든
 */

interface SlowQuery {
  query: string;
  executionTime: string;
  timestamp: string;
}

interface ResourceUsage {
  cpu: number;
  memory: number;
  diskIo: number;
}

interface PerformanceMetrics {
  tps: number;
  qps: number;
  activeSessions: number;
  avgResponseTime: number;
}

interface MetricTooltip {
  label: string;
  details: {
    key: string;
    value: string;
  }[];
}

interface MetricThreshold {
  warning: number;   // 경고 임계값
  critical: number;  // 위험 임계값
  type: 'high' | 'low';  // high: 높을수록 위험, low: 낮을수록 위험
}

const QueryMonitor = () => {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [slowQueries] = useState<SlowQuery[]>([
    {
      query: "SELECT * FROM orders o JOIN customers c ON o.cust_id = c.id WHERE o.created_at > NOW() - INTERVAL '30 days';",
      executionTime: "4.2s",
      timestamp: "14:20:15"
    },
    {
      query: "SELECT * FROM orders o JOIN customers c ON o.cust_id = c.id WHERE o.created_at > NOW() - INTERVAL '30 days';",
      executionTime: "3.1s",
      timestamp: "14:20:15"
    },
    {
      query: "SELECT * FROM orders o JOIN customers c ON o.cust_id = c.id WHERE o.created_at > NOW() - INTERVAL '30 days';",
      executionTime: "2.9s",
      timestamp: "14:20:15"
    },
    {
      query: "SELECT * FROM orders o JOIN customers c ON o.cust_id = c.id WHERE o.created_at > NOW() - INTERVAL '30 days';",
      executionTime: "2.1s",
      timestamp: "14:20:15"
    },
    {
      query: "SELECT * FROM orders o JOIN customers c ON o.cust_id = c.id WHERE o.created_at > NOW() - INTERVAL '30 days';",
      executionTime: "1.8s",
      timestamp: "14:20:15"
    }
  ]);

  const [resourceUsage] = useState<ResourceUsage>({
    cpu: 42,
    memory: 87,
    diskIo: 67
  });

  const [metrics] = useState<PerformanceMetrics>({
    tps: 1250,        // NORMAL: 정상 (800 초과)
    qps: 5500,        // WARNING: 경고 (5000 이상)
    activeSessions: 185,  // CRITICAL: 위험 (180 이상)
    avgResponseTime: 12   // NORMAL: 정상 (50 미만)
  });

  // 메트릭별 임계값 설정
  const thresholds: Record<string, MetricThreshold> = {
    tps: {
      warning: 800,    // TPS가 800 이하면 경고
      critical: 500,   // 500 이하면 위험
      type: 'low'
    },
    qps: {
      warning: 5000,   // QPS가 5000 이상이면 경고
      critical: 8000,  // 8000 이상이면 위험
      type: 'high'
    },
    sessions: {
      warning: 150,    // 활성 세션이 150 이상이면 경고
      critical: 180,   // 180 이상이면 위험
      type: 'high'
    },
    responseTime: {
      warning: 50,     // 응답시간이 50ms 이상이면 경고
      critical: 100,   // 100ms 이상이면 위험
      type: 'high'
    }
  };

  // 메트릭 상태 판단 함수
  const getMetricStatus = (metricKey: string, value: number): 'normal' | 'warning' | 'critical' => {
    const threshold = thresholds[metricKey];
    if (!threshold) return 'normal';

    if (threshold.type === 'high') {
      // 값이 높을수록 위험한 경우 (QPS, 세션, 응답시간)
      if (value >= threshold.critical) return 'critical';
      if (value >= threshold.warning) return 'warning';
    } else {
      // 값이 낮을수록 위험한 경우 (TPS)
      if (value <= threshold.critical) return 'critical';
      if (value <= threshold.warning) return 'warning';
    }
    return 'normal';
  };

  // 툴팁 정보 (ERD 기반)
  const tooltips: Record<string, MetricTooltip> = {
    tps: {
      label: '현재 TPS',
      details: [
        { key: '이전 대비', value: '+8.5%' },
        { key: '최대 TPS (1h)', value: '1,420' },
        { key: '최소 TPS (1h)', value: '980' },
        { key: '총 실행 횟수', value: '45,230' }
      ]
    },
    qps: {
      label: '현재 QPS',
      details: [
        { key: 'SELECT', value: '2,890 (75%)' },
        { key: 'INSERT', value: '520 (14%)' },
        { key: 'UPDATE', value: '310 (8%)' },
        { key: 'DELETE', value: '120 (3%)' }
      ]
    },
    sessions: {
      label: '활성 세션 수',
      details: [
        { key: '실행 중 (active)', value: '25' },      // CRITICAL (20 이상)
        { key: '대기 중 (idle)', value: '55' },        // WARNING (50 이상)
        { key: 'I/O 블록 수', value: '18' },           // CRITICAL (15 이상)
        { key: '최대 연결 수', value: '200' }
      ]
    },
    responseTime: {
      label: '평균 응답 시간',
      details: [
        { key: '이전 대비', value: '+15.3ms' },
        { key: '최대 응답시간', value: '125ms' },      // CRITICAL (100 이상)
        { key: '최소 응답시간', value: '8ms' },
        { key: '슬로우 쿼리 기준', value: '>100ms' }
      ]
    }
  };

  // 툴팁 값의 상태 판단 (세부 항목별)
  const getTooltipValueStatus = (metricKey: string, detailKey: string, value: string): string => {
    // 숫자만 추출
    const numValue = parseInt(value.replace(/[^0-9]/g, ''));
    
    if (metricKey === 'sessions') {
      if (detailKey === '실행 중 (active)' && numValue >= 20) return 'critical';
      if (detailKey === '실행 중 (active)' && numValue >= 15) return 'warning';
      if (detailKey === '대기 중 (idle)' && numValue >= 50) return 'warning';
      if (detailKey === 'I/O 블록 수' && numValue >= 15) return 'critical';
      if (detailKey === 'I/O 블록 수' && numValue >= 10) return 'warning';
    }
    
    if (metricKey === 'responseTime') {
      if (detailKey === '최대 응답시간' && numValue >= 100) return 'critical';
      if (detailKey === '최대 응답시간' && numValue >= 50) return 'warning';
    }
    
    return 'normal';
  };

  const [chartData, setChartData] = useState({
    tps: [] as number[],
    qps: [] as number[]
  });

  // 실시간 데이터 시뮬레이션
  useEffect(() => {
    const generateInitialData = () => {
      const tpsData = [];
      const qpsData = [];
      for (let i = 0; i < 12; i++) {
        tpsData.push(Math.floor(Math.random() * 500) + 3800);
        qpsData.push(Math.floor(Math.random() * 200) + 1100);
      }
      return { tps: tpsData, qps: qpsData };
    };

    setChartData(generateInitialData());

    const interval = setInterval(() => {
      setChartData(prev => ({
        tps: [...prev.tps.slice(1), Math.floor(Math.random() * 500) + 3800],
        qps: [...prev.qps.slice(1), Math.floor(Math.random() * 200) + 1100]
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const chartOptions: ApexOptions = {
    chart: {
      type: 'line',
      height: 330,
      toolbar: {
        show: false
      },
      animations: {
        enabled: true,
        easing: 'linear',
        dynamicAnimation: {
          speed: 1000
        }
      },
      background: 'transparent',
      offsetY: 0
    },
    stroke: {
      curve: 'smooth',
      width: 2.5
    },
    colors: ['#6366F1', 'rgba(255, 182, 46, 0.78)'],
    dataLabels: {
      enabled: false
    },
    xaxis: {
      categories: ['0:00', '1:00', '2:00', '3:00', '4:00', '5:00', '6:00', '7:00', '8:00', '9:00', '10:00', '11:00'],
      labels: {
        style: {
          colors: '#888888',
          fontSize: '11px'
        }
      },
      axisBorder: {
        show: false
      },
      axisTicks: {
        show: false
      }
    },
    yaxis: {
      min: 950,
      max: 4250,
      tickAmount: 8,
      forceNiceScale: false,
      labels: {
        style: {
          colors: '#888888',
          fontSize: '11px'
        },
        formatter: function(value) {
          return Math.round(value).toString();
        },
        offsetX: -10
      }
    },
    grid: {
      borderColor: 'rgba(0, 0, 0, 0.1)',
      strokeDashArray: 0,
      padding: {
        top: 15,
        right: 5,
        bottom: 5,
        left: 10
      },
      xaxis: {
        lines: {
          show: true
        }
      },
      yaxis: {
        lines: {
          show: true
        }
      }
    },
    legend: {
      show: false
    },
    tooltip: {
      enabled: true,
      shared: true,
      intersect: false,
      theme: 'dark',
      x: {
        show: true
      },
      y: {
        formatter: function(value, { seriesIndex }) {
          return seriesIndex === 0 ? `${value} TPS` : `${value} QPS`;
        }
      },
      style: {
        fontSize: '12px'
      }
    }
  };

  const chartSeries = [
    {
      name: 'TPS',
      data: chartData.tps
    },
    {
      name: 'QPS',
      data: chartData.qps
    }
  ];

  const handleExportCsv = () => {
    console.log('CSV 내보내기');
  };

  return (
    <div className="query-monitor-container">
      {/* 상단 메트릭 카드 */}
      <div className="metrics-section">
        <div 
          className={`metric-card ${getMetricStatus('tps', metrics.tps)}`}
          onMouseEnter={() => setActiveTooltip('tps')}
          onMouseLeave={() => setActiveTooltip(null)}
        >
          <div className="metric-label">
            현재 TPS
            {getMetricStatus('tps', metrics.tps) !== 'normal' && (
              <span className="warning-indicator">⚠️</span>
            )}
          </div>
          <div className="metric-value">{metrics.tps.toLocaleString()}</div>
          {activeTooltip === 'tps' && (
            <div className="metric-tooltip">
              {tooltips.tps.details.map((detail, index) => (
                <div key={index} className="tooltip-row">
                  <span className="tooltip-key">{detail.key}</span>
                  <span className={`tooltip-value ${getTooltipValueStatus('tps', detail.key, detail.value)}`}>
                    {detail.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div 
          className={`metric-card ${getMetricStatus('qps', metrics.qps)}`}
          onMouseEnter={() => setActiveTooltip('qps')}
          onMouseLeave={() => setActiveTooltip(null)}
        >
          <div className="metric-label">
            현재 QPS
            {getMetricStatus('qps', metrics.qps) !== 'normal' && (
              <span className="warning-indicator">⚠️</span>
            )}
          </div>
          <div className="metric-value">{metrics.qps.toLocaleString()}</div>
          {activeTooltip === 'qps' && (
            <div className="metric-tooltip">
              {tooltips.qps.details.map((detail, index) => (
                <div key={index} className="tooltip-row">
                  <span className="tooltip-key">{detail.key}</span>
                  <span className={`tooltip-value ${getTooltipValueStatus('qps', detail.key, detail.value)}`}>
                    {detail.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div 
          className={`metric-card ${getMetricStatus('sessions', metrics.activeSessions)}`}
          onMouseEnter={() => setActiveTooltip('sessions')}
          onMouseLeave={() => setActiveTooltip(null)}
        >
          <div className="metric-label">
            활성 세션 수
            {getMetricStatus('sessions', metrics.activeSessions) !== 'normal' && (
              <span className="warning-indicator">⚠️</span>
            )}
          </div>
          <div className="metric-value">{metrics.activeSessions}</div>
          {activeTooltip === 'sessions' && (
            <div className="metric-tooltip">
              {tooltips.sessions.details.map((detail, index) => (
                <div key={index} className="tooltip-row">
                  <span className="tooltip-key">{detail.key}</span>
                  <span className={`tooltip-value ${getTooltipValueStatus('sessions', detail.key, detail.value)}`}>
                    {detail.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div 
          className={`metric-card ${getMetricStatus('responseTime', metrics.avgResponseTime)}`}
          onMouseEnter={() => setActiveTooltip('responseTime')}
          onMouseLeave={() => setActiveTooltip(null)}
        >
          <div className="metric-label">
            평균 응답 시간
            {getMetricStatus('responseTime', metrics.avgResponseTime) !== 'normal' && (
              <span className="warning-indicator">⚠️</span>
            )}
          </div>
          <div className="metric-value">{metrics.avgResponseTime}ms</div>
          {activeTooltip === 'responseTime' && (
            <div className="metric-tooltip">
              {tooltips.responseTime.details.map((detail, index) => (
                <div key={index} className="tooltip-row">
                  <span className="tooltip-key">{detail.key}</span>
                  <span className={`tooltip-value ${getTooltipValueStatus('responseTime', detail.key, detail.value)}`}>
                    {detail.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* TPS/QPS 실시간 그래프 */}
      <div className="chart-section">
        <div className="chart-header">
          <h3 className="chart-title">TPS/QPS 실시간 그래프</h3>
          <div className="chart-legend">
            <div className="legend-item">
              <div className="legend-color tps-color"></div>
              <span className="legend-text">TPS</span>
            </div>
            <div className="legend-item">
              <div className="legend-color qps-color"></div>
              <span className="legend-text">QPS</span>
            </div>
          </div>
        </div>
        <div className="chart-wrapper">
          <ApexCharts
            options={chartOptions}
            series={chartSeries}
            type="line"
            height={330}
          />
        </div>
      </div>

      {/* 하단 섹션 */}
      <div className="bottom-section">
        {/* 슬로우 쿼리 TOP 5 */}
        <div className="slow-query-card">
          <div className="card-header">
            <div className="header-title">
              <span className="warning-icon">⚠️</span>
              <span>슬로우 쿼리 TOP 5</span>
            </div>
            <button className="export-button" onClick={handleExportCsv}>
              <span className="export-icon">📄</span>
              <span>CSV 내보내기</span>
            </button>
          </div>
          <div className="query-list">
            {slowQueries.map((query, index) => (
              <div key={index} className="query-item">
                <div className="query-content">
                  <div className="query-text">{query.query}</div>
                  <div className="query-timestamp">{query.timestamp}</div>
                </div>
                <div className="query-time">{query.executionTime}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 리소스 사용률 */}
        <div className="resource-card">
          <div className="resource-header">
            <span className="resource-icon">📊</span>
            <span className="resource-title">리소스 사용률</span>
          </div>
          <div className="resource-list">
            <div className="resource-item">
              <div className="resource-info">
                <span className="resource-label">CPU</span>
                <span className="resource-value">{resourceUsage.cpu}%</span>
              </div>
              <div className="resource-bar">
                <div 
                  className="resource-progress cpu-progress" 
                  style={{ width: `${resourceUsage.cpu}%` }}
                ></div>
              </div>
            </div>
            <div className="resource-item">
              <div className="resource-info">
                <span className="resource-label">Memory</span>
                <span className="resource-value">{resourceUsage.memory}%</span>
              </div>
              <div className="resource-bar">
                <div 
                  className="resource-progress memory-progress" 
                  style={{ width: `${resourceUsage.memory}%` }}
                ></div>
              </div>
            </div>
            <div className="resource-item">
              <div className="resource-info">
                <span className="resource-label">Disk I/O</span>
                <span className="resource-value">{resourceUsage.diskIo}%</span>
              </div>
              <div className="resource-bar">
                <div 
                  className="resource-progress disk-progress" 
                  style={{ width: `${resourceUsage.diskIo}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QueryMonitor;