import { useState, useEffect } from 'react';
import '../../styles/layout/query-monitor.css';
import Chart from '../../components/chart/ChartComponent';
import GaugeChart from '../../components/chart/GaugeChart';

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
  warning: number;
  critical: number;
  type: 'high' | 'low';
}

const QueryMonitor = () => {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const [slowQueries] = useState<SlowQuery[]>([
    {
      query: "SELECT * FROM orders o JOIN customers c ON o.cust_id = c.id WHERE o.created_at > NOW() - INTERVAL '30 days';",
      executionTime: '4.2s',
      timestamp: '14:20:15'
    },
    {
      query: "SELECT * FROM users WHERE active = TRUE;",
      executionTime: '3.1s',
      timestamp: '14:21:20'
    },
    {
      query: "SELECT * FROM payments;",
      executionTime: '2.9s',
      timestamp: '14:22:45'
    },
    {
      query: "SELECT * FROM inventory;",
      executionTime: '2.1s',
      timestamp: '14:23:10'
    },
    {
      query: "SELECT * FROM logs WHERE date > NOW() - INTERVAL '1 day';",
      executionTime: '1.8s',
      timestamp: '14:23:50'
    }
  ]);

  const [resourceUsage] = useState<ResourceUsage>({
    cpu: 42,
    memory: 87,
    diskIo: 67
  });

  const [metrics] = useState<PerformanceMetrics>({
    tps: 1250,
    qps: 5500,
    activeSessions: 185,
    avgResponseTime: 12
  });

  const thresholds: Record<string, MetricThreshold> = {
    tps: {
      warning: 800,
      critical: 500,
      type: 'low'
    },
    qps: {
      warning: 5000,
      critical: 8000,
      type: 'high'
    },
    sessions: {
      warning: 150,
      critical: 180,
      type: 'high'
    },
    responseTime: {
      warning: 50,
      critical: 100,
      type: 'high'
    }
  };

  const getMetricStatus = (metricKey: string, value: number): 'normal' | 'warning' | 'critical' => {
    const threshold = thresholds[metricKey];
    if (!threshold) return 'normal';

    if (threshold.type === 'high') {
      if (value >= threshold.critical) return 'critical';
      if (value >= threshold.warning) return 'warning';
    } else {
      if (value <= threshold.critical) return 'critical';
      if (value <= threshold.warning) return 'warning';
    }
    return 'normal';
  };

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
        { key: '실행 중 (active)', value: '25' },
        { key: '대기 중 (idle)', value: '55' },
        { key: 'I/O 블록 수', value: '18' },
        { key: '최대 연결 수', value: '200' }
      ]
    },
    responseTime: {
      label: '평균 응답 시간',
      details: [
        { key: '이전 대비', value: '+15.3ms' },
        { key: '최대 응답시간', value: '125ms' },
        { key: '최소 응답시간', value: '8ms' },
        { key: '슬로우 쿼리 기준', value: '>100ms' }
      ]
    }
  };

  const getTooltipValueStatus = (metricKey: string, detailKey: string, value: string): string => {
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

  const categories = ['0:00', '1:00', '2:00', '3:00', '4:00', '5:00', '6:00', '7:00', '8:00', '9:00', '10:00', '11:00'];

  return (
    <div className="query-monitor-container">
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

      <div className="chart-section">
        <div className="chart-header">
          <h3 className="chart-title">TPS/QPS 실시간 그래프</h3>
          <div className="chart-legend">
            <span className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: '#6366F1' }}></span>
              TPS
            </span>
            <span className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: 'rgba(255, 182, 46, 0.78)' }}></span>
              QPS
            </span>
          </div>
        </div>
        <div className="chart-wrapper">
          <Chart
            type="line"
            series={chartSeries}
            categories={categories}
            colors={['#6366F1', 'rgba(255, 182, 46, 0.78)']}
            height={330}
            showLegend={false}
            showToolbar={false}
            customOptions={{
              chart: {
                background: 'transparent',
                animations: {
                  enabled: true,
                  easing: 'linear',
                  dynamicAnimation: {
                    speed: 1000
                  }
                }
              },
              stroke: {
                curve: 'smooth',
                width: 2.5
              },
              grid: {
                borderColor: 'rgba(0, 0, 0, 0.1)',
                strokeDashArray: 0,
                padding: {
                  top: 15,
                  right: 5,
                  bottom: 5,
                  left: 10
                }
              },
              xaxis: {
                labels: {
                  style: {
                    colors: '#888888',
                    fontSize: '11px'
                  }
                }
              },
              yaxis: {
                min: 950,
                max: 4250,
                tickAmount: 8,
                labels: {
                  style: {
                    colors: '#888888',
                    fontSize: '11px'
                  },
                  formatter: function(value: number) {
                    return Math.round(value).toString();
                  },
                  offsetX: -10
                }
              },
              tooltip: {
                enabled: true,
                shared: true,
                intersect: false,
                theme: 'dark',
                y: {
                  formatter: function(value: number, { seriesIndex }: any) {
                    return seriesIndex === 0 ? `${value} TPS` : `${value} QPS`;
                  }
                }
              }
            }}
          />
        </div>
      </div>

      <div className="bottom-section">
        <div className="slow-query-card">
          <div className="card-header">
            <h3 className="header-title">
              <span className="warning-icon">⚠️</span>
              슬로우 쿼리 TOP 5
            </h3>
            <button className="export-button">
              <span className="export-icon">📊</span>
              CSV 내보내기
            </button>
          </div>
          <div className="query-list">
            {slowQueries.map((query, index) => (
              <div 
                key={index} 
                className="query-item"
              >
                <div className="query-content">
                  <div className="query-text">{query.query}</div>
                  <div className="query-timestamp">{query.timestamp}</div>
                </div>
                <div className="query-time">{query.executionTime}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="resource-card">
          <div className="resource-header">
            <span className="resource-icon">📊</span>
            <h3 className="resource-title">리소스 사용률</h3>
          </div>
          <div className="gauge-wrapper">
            <GaugeChart 
              value={resourceUsage.cpu} 
              type="bar"
              color="linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)"
              trackColor="rgba(229, 231, 235, 0.6)"
              label="CPU"
            />
            <GaugeChart 
              value={resourceUsage.memory} 
              type="bar"
              color="linear-gradient(90deg, #ef4444 0%, #f87171 100%)"
              trackColor="rgba(229, 231, 235, 0.6)"
              label="Memory"
            />
            <GaugeChart 
              value={resourceUsage.diskIo} 
              type="bar"
              color="linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)"
              trackColor="rgba(229, 231, 235, 0.6)"
              label="Disk I/O"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default QueryMonitor;