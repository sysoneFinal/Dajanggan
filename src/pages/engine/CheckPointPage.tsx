import { useQuery } from "@tanstack/react-query";
import Chart from "../../components/chart/ChartComponent";
import SummaryCard from "../../components/util/SummaryCard";
import "../../styles/engine/checkpoint.css";
import GaugeChart from "../../components/chart/GaugeChart";
import WidgetCard from "../../components/util/WidgetCard";
import ChartGridLayout from "../../components/layout/ChartGridLayout";
import apiClient from "../../api/apiClient";
import { useInstanceContext } from "../../context/InstanceContext";

/** Checkpoint API 응답 타입 */
interface CheckpointData {
    requestRatio: {
        value: number;
        requestedCount: number;
        timedCount: number;
    };
    avgWriteTime: {
        categories: string[];
        data: number[];
        average: number;
        max: number;
        min: number;
    };
    occurrence: {
        categories: string[];
        requested: number[];
        timed: number[];
        requestedTotal: number;
        timedTotal: number;
        ratio: number;
    };
    walGeneration: {
        categories: string[];
        data: number[];
        total: number;
        average: number;
        max: number;
    };
    processTime: {
        categories: string[];
        syncTime: number[];
        writeTime: number[];
        avgSync: number;
        avgWrite: number;
        avgTotal: number;
    };
    buffer: {
        categories: string[];
        data: number[];
        average: number;
        max: number;
        min: number;
    };
    checkpointInterval: {
        categories: string[];
        data: number[];
        average: number;
        max: number;
        min: number;
    };
    recentStats?: {
        buffersWritten: number;
        avgTotalProcessTime: number;
        checkpointDistance: number;
        checkpointInterval: number;
        avgWalGenerationSpeed: number;
    };
}

/** API 요청 - apiClient 사용 - instanceId를 쿼리 파라미터로 전달 */
async function fetchCheckpointData(instanceId: number) {
    const response = await apiClient.get<CheckpointData>("/engine/checkpoint", {
        params: { instanceId }
    });
    return response.data;
}

const getCheckpointRequestGaugeStatus = (
    value: number
): "normal" | "warning" | "critical" => {
    // 요청형 체크포인트 비율이 높을수록 위험
    // 0~50%: 정상, 50~70%: 주의, 70% 이상: 경고
    if (value < 50) return "normal";
    if (value < 70) return "warning";
    return "critical";
};

/** 메인 컴포넌트 */
export default function CheckPointPage() {
    const { selectedInstance } = useInstanceContext();
    
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["checkpointDashboard", selectedInstance?.instanceId],
        queryFn: () => fetchCheckpointData(selectedInstance!.instanceId),
        retry: 1,
        enabled: !!selectedInstance, // 인스턴스가 선택되었을 때만 실행
    });

    // 인스턴스가 선택되지 않은 경우
    if (!selectedInstance) {
        return (
            <div className="checkpoint-page">
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '400px',
                    fontSize: '18px',
                    color: '#6B7280'
                }}>
                    인스턴스를 선택해주세요.
                </div>
            </div>
        );
    }

    // 로딩 중
    if (isLoading) {
        return (
            <div className="bgwriter-page">
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '400px',
                    fontSize: '18px',
                    color: '#6B7280'
                }}>
                    데이터를 불러오는 중...
                </div>
            </div>
        );
    }

    // 에러 발생
    if (isError) {
        return (
            <div className="bgwriter-page">
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '400px',
                    fontSize: '18px',
                    color: '#EF4444'
                }}>
                    <p>데이터를 불러오는데 실패했습니다.</p>
                    <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '8px' }}>
                        {error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: '16px',
                            padding: '8px 16px',
                            backgroundColor: '#3B82F6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        새로고침
                    </button>
                </div>
            </div>
        );
    }

    // 데이터가 없는 경우
    if (!data) {
        return (
            <div className="bgwriter-page">
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '400px',
                    fontSize: '18px',
                    color: '#6B7280'
                }}>
                    데이터가 없습니다.
                </div>
            </div>
        );
    }
    const dashboard = data;

    const gaugeStatus = getCheckpointRequestGaugeStatus(dashboard.requestRatio.value);

    const recentStats = dashboard.recentStats || {
        buffersWritten: 0,
        avgTotalProcessTime: 0,
        checkpointDistance: 0,
        checkpointInterval: 0,
        avgWalGenerationSpeed: 0,
    };

    const summaryCards = [
        {
            label: "총 Checkpoint 발생",
            value: `${dashboard.occurrence.requestedTotal + dashboard.occurrence.timedTotal}회`,
            desc: "최근 24시간 누적",
            status: "info" as const,
        },
        {
            label: "WAL 총 생성량",
            value: `${(dashboard.walGeneration.total / 1000000000).toFixed(1)}GB`,
            desc: "최근 24시간 누적",
            status: dashboard.walGeneration.total > 120000000000
                ? ("warning" as const)
                : ("info" as const),
        },
        {
            label: "평균 Checkpoint 간격",
            value: `${recentStats.checkpointInterval.toFixed(2)}분`,
            desc: "최근 5분 평균",
            status: recentStats.checkpointInterval < 3
                ? ("warning" as const)
                : ("info" as const),
        },
        {
            label: "평균 Buffer 처리량",
            value: `${dashboard.buffer.average.toLocaleString()}/s`,
            desc: "최근 24시간 평균",
            status: dashboard.buffer.average > 5000
                ? ("warning" as const)
                : ("info" as const),
        },
        {
            label: "Checkpoint 거리",
            value: `${recentStats.checkpointDistance}%`,
            desc: "최근 5분 평균",
            status: recentStats.checkpointDistance > 90
                ? ("warning" as const)
                : ("info" as const),
        },
    ];

    return (
        <div className="checkpoint-page">
            {/* 상단 요약 카드 */}
            <div className="checkpoint-summary-cards">
                {summaryCards.map((card, idx) => (
                    <SummaryCard
                        key={idx}
                        label={card.label}
                        value={card.value}
                        desc={card.desc}
                        status={card.status}
                    />
                ))}
            </div>

            {/* 첫 번째 행: 3개 카드 */}
            <ChartGridLayout>
                {/* Checkpoint 요청 비율 */}
                <WidgetCard title="Checkpoint 요청 비율" span={2}>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        height: '100%',
                        width: '100%',
                        marginTop: '18px',
                    }}>
                        <GaugeChart
                            value={dashboard.requestRatio.value}
                            status={gaugeStatus}
                            type="semi-circle"
                            radius={100}
                            strokeWidth={20}
                            height={250}
                            flattenRatio={0.89}
                        />
                        <div className="cpu-gauge-details">
                            <div className="cpu-detail-item">
                                <span className="cpu-detail-label">Requested</span>
                                <span className="cpu-detail-value">{dashboard.requestRatio.requestedCount}</span>
                            </div>
                            <div className="cpu-detail-divider"></div>
                            <div className="cpu-detail-item">
                                <span className="cpu-detail-label">Timed</span>
                                <span className="cpu-detail-value">{dashboard.requestRatio.timedCount}</span>
                            </div>
                        </div>
                    </div>
                </WidgetCard>

                {/* Checkpoint 발생 추이 */}
                <WidgetCard title="Checkpoint 발생 추이 (Last 24 Hours)" span={5}>
                    <Chart
                        type="line"
                        series={[
                            { name: "Requested", data: dashboard.occurrence.requested },
                            { name: "Timed", data: dashboard.occurrence.timed },
                        ]}
                        categories={dashboard.occurrence.categories}
                        colors={["#8E79FF", "#FEA29B"]}
                        height={250}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        yaxisOptions={{
                            title: { text: "발생 횟수", style: { fontSize: "12px", color: "#6B7280" } }
                        }}

                    />
                </WidgetCard>

                {/* Checkpoint 처리 시간 추세 - 임계치 적용 */}
                <WidgetCard title="Checkpoint 처리 시간 추세 (Last 1 Hour)" span={5}>
                    <Chart
                        type="line"
                        series={[
                            { name: "Sync Time", data: dashboard.processTime.syncTime },
                            { name: "Write Time", data: dashboard.processTime.writeTime },
                        ]}
                        categories={dashboard.processTime.categories}
                        colors={["#8E79FF", "#FEA29B"]}
                        height={250}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        yaxisOptions={{
                            title: { text: "처리 시간 (ms)", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        customOptions={{
                            annotations: {
                                yaxis: [
                                    {
                                        y: 1000,
                                        borderColor: "#60A5FA",
                                        strokeDashArray: 4,
                                        opacity: 0.6,
                                        label: {
                                            borderColor: "#60A5FA",
                                            style: {
                                                color: "#fff",
                                                background: "#60A5FA",
                                                fontSize: "11px",
                                                fontWeight: 500,
                                            },
                                            text: "정상: 1s",
                                            position: "right",
                                        },
                                    },
                                    {
                                        y: 2000,
                                        borderColor: "#FBBF24",
                                        strokeDashArray: 4,
                                        opacity: 0.7,
                                        label: {
                                            borderColor: "#FBBF24",
                                            style: {
                                                color: "#fff",
                                                background: "#FBBF24",
                                                fontSize: "11px",
                                                fontWeight: 500,
                                            },
                                            text: "주의: 2s",
                                            position: "right",
                                        },
                                    },
                                ],
                            },
                            yaxis: {
                                labels: {
                                    style: {
                                        colors: "#6B7280",
                                        fontFamily: 'var(--font-family, "Pretendard", sans-serif)'
                                    },
                                    formatter: (val: number) => `${(val / 1000).toFixed(1)}s`,
                                },
                                min: 0,
                                max: 2500,
                            },
                        }}
                    />
                </WidgetCard>
            </ChartGridLayout>

            {/* 두 번째 행: 3개 카드 */}
            <ChartGridLayout>
                {/* WAL 생성량 추이 */}
                <WidgetCard title="WAL 생성량 추이 (Last 24 Hours)" span={4}>
                    <Chart
                        type="line"
                        series={[{ name: "WAL Generation", data: dashboard.walGeneration.data }]}
                        categories={dashboard.walGeneration.categories}
                        colors={["#8E79FF"]}
                        height={250}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        yaxisOptions={{
                            title: { text: "WAL 생성량 (GB)", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        customOptions={{
                            annotations: {
                                yaxis: [
                                    {
                                        y: 10000000000,
                                        borderColor: "#60A5FA",
                                        strokeDashArray: 4,
                                        opacity: 0.6,
                                        label: {
                                            borderColor: "#60A5FA",
                                            style: {
                                                color: "#fff",
                                                background: "#60A5FA",
                                                fontSize: "11px",
                                                fontWeight: 500,
                                            },
                                            text: "정상: 10GB",
                                            position: "right",
                                        },
                                    },
                                    {
                                        y: 12000000000,
                                        borderColor: "#FBBF24",
                                        strokeDashArray: 4,
                                        opacity: 0.7,
                                        label: {
                                            borderColor: "#FBBF24",
                                            style: {
                                                color: "#fff",
                                                background: "#FBBF24",
                                                fontSize: "11px",
                                                fontWeight: 500,
                                            },
                                            text: "주의: 12GB",
                                            position: "right",
                                        },
                                    },
                                ],
                            },
                            yaxis: {
                                labels: {
                                    style: {
                                        colors: "#6B7280",
                                        fontFamily: 'var(--font-family, "Pretendard", sans-serif)'
                                    },
                                    formatter: (val: number) => `${(val / 1000000000).toFixed(1)}GB`,
                                },
                                min: 0,
                                max: 14000000000,
                            },
                        }}
                    />
                </WidgetCard>

                {/* Checkpoint buffer 처리량 */}
                <WidgetCard title="Checkpoint Buffer 처리량 (Last 1 Hour)" span={8}>
                    <Chart
                        type="line"
                        series={[{ name: "Buffers/sec", data: dashboard.buffer.data }]}
                        categories={dashboard.buffer.categories}
                        colors={["#8E79FF"]}
                        height={250}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        yaxisOptions={{
                            title: { text: "Buffers/sec", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        customOptions={{
                            annotations: {
                                yaxis: [
                                    {
                                        y: 5000,
                                        borderColor: "#60A5FA",
                                        strokeDashArray: 4,
                                        opacity: 0.6,
                                        label: {
                                            borderColor: "#60A5FA",
                                            style: {
                                                color: "#fff",
                                                background: "#60A5FA",
                                                fontSize: "11px",
                                                fontWeight: 500,
                                            },
                                            text: "정상: 5000",
                                            position: "right",
                                        },
                                    },
                                    {
                                        y: 5500,
                                        borderColor: "#FBBF24",
                                        strokeDashArray: 4,
                                        opacity: 0.7,
                                        label: {
                                            borderColor: "#FBBF24",
                                            style: {
                                                color: "#fff",
                                                background: "#FBBF24",
                                                fontSize: "11px",
                                                fontWeight: 500,
                                            },
                                            text: "주의: 5500",
                                            position: "right",
                                        },
                                    },
                                ],
                            },
                            yaxis: {
                                labels: {
                                    style: {
                                        colors: "#6B7280",
                                        fontFamily: 'var(--font-family, "Pretendard", sans-serif)'
                                    },
                                },
                                min: 0,
                                max: 6000,
                            },
                        }}
                    />
                </WidgetCard>

                {/* Checkpoint 간격 추이 */}
                <WidgetCard title="Checkpoint 간격 추이 (Last 24 Hours)" span={4}>
                    <Chart
                        type="line"
                        series={[{ name: "Interval (min)", data: dashboard.checkpointInterval.data }]}
                        categories={dashboard.checkpointInterval.categories}
                        colors={["#8E79FF"]}
                        height={250}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        yaxisOptions={{
                            title: { text: "간격 (분)", style: { fontSize: "12px", color: "#6B7280" } }
                        }}
                        customOptions={{
                            annotations: {
                                yaxis: [
                                    {
                                        y: 3,
                                        borderColor: "#FBBF24",
                                        strokeDashArray: 4,
                                        opacity: 0.7,
                                        label: {
                                            borderColor: "#FBBF24",
                                            style: {
                                                color: "#fff",
                                                background: "#FBBF24",
                                                fontSize: "11px",
                                                fontWeight: 500,
                                            },
                                            text: "주의: 3분",
                                            position: "right",
                                        },
                                    },
                                    {
                                        y: 5,
                                        borderColor: "#60A5FA",
                                        strokeDashArray: 4,
                                        opacity: 0.6,
                                        label: {
                                            borderColor: "#60A5FA",
                                            style: {
                                                color: "#fff",
                                                background: "#60A5FA",
                                                fontSize: "11px",
                                                fontWeight: 500,
                                            },
                                            text: "정상: 5분",
                                            position: "right",
                                        },
                                    },
                                ],
                            },
                            yaxis: {
                                labels: {
                                    style: {
                                        colors: "#6B7280",
                                        fontFamily: 'var(--font-family, "Pretendard", sans-serif)'
                                    },
                                    formatter: (val: number) => `${val.toFixed(1)}분`,
                                },
                                min: 0,
                                // 데이터의 최대값에 여유를 더해서 Y축 범위 동적 조정
                                max: Math.max(12, Math.ceil((dashboard.checkpointInterval.max || 0) * 1.2)),
                            },
                        }}
                    />
                </WidgetCard>
            </ChartGridLayout>
        <ChartGridLayout>
            {/* Checkpoint 간격 추이 */}
            <WidgetCard title="Checkpoint 간격 추이 (Last 24 Hours)" span={4}>
                <Chart
                    type="line"
                    series={[{ name: "Interval (min)", data: dashboard.checkpointInterval.data }]}
                    categories={dashboard.checkpointInterval.categories}
                    colors={["#8E79FF"]}
                    height={250}
                    xaxisOptions={{
                        title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } }
                    }}
                    yaxisOptions={{
                        title: { text: "간격 (분)", style: { fontSize: "12px", color: "#6B7280" } }
                    }}
                    customOptions={{
                        annotations: {
                            yaxis: [
                                {
                                    y: 3,
                                    borderColor: "#FBBF24",
                                    strokeDashArray: 4,
                                    opacity: 0.7,
                                    label: {
                                        borderColor: "#FBBF24",
                                        style: {
                                            color: "#fff",
                                            background: "#FBBF24",
                                            fontSize: "11px",
                                            fontWeight: 500,
                                        },
                                        text: "주의: 3분",
                                        position: "right",
                                    },
                                },
                                {
                                    y: 5,
                                    borderColor: "#60A5FA",
                                    strokeDashArray: 4,
                                    opacity: 0.6,
                                    label: {
                                        borderColor: "#60A5FA",
                                        style: {
                                            color: "#fff",
                                            background: "#60A5FA",
                                            fontSize: "11px",
                                            fontWeight: 500,
                                        },
                                        text: "정상: 5분",
                                        position: "right",
                                    },
                                },
                            ],
                        },
                        yaxis: {
                            labels: {
                                style: {
                                    colors: "#6B7280",
                                    fontFamily: 'var(--font-family, "Pretendard", sans-serif)'
                                },
                                formatter: (val: number) => `${val.toFixed(1)}분`,
                            },
                            min: 0,
                            // 데이터의 최대값에 여유를 더해서 Y축 범위 동적 조정
                            max: Math.max(12, Math.ceil((dashboard.checkpointInterval.max || 0) * 1.2)),
                        },
                    }}
                />
            </WidgetCard>
        </ChartGridLayout>
        </div>
    );
}