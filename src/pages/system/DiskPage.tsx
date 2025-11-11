import { useState } from "react";
import Chart from "../../components/chart/ChartComponent";
import GaugeChart from "../../components/chart/GaugeChart";
import SummaryCard from "../../components/util/SummaryCard";
import WidgetCard from "../../components/util/WidgetCard";
import ChartGridLayout from "../../components/layout/ChartGridLayout";
import "../../styles/system/disk.css";
import apiClient from "../../api/apiClient";
import {useQuery} from "@tanstack/react-query";

// API 응답 전체 구조
interface DiskIOData {
    diskUsage: {
        value: number;
        iopsRead: number;
        iopsWrite: number;
    };
    processIO: {
        categories: string[];
        series: Array<{
            name: string;
            data: number[];
        }>;
    };
    queueDepth: {
        categories: string[];
        queueLength: number[];
        average: number;
    };
    ioLatency: {
        categories: string[];
        readLatency: number[];
        writeLatency: number[];
        avgRead: number;
        avgWrite: number;
    };
    throughput: {
        categories: string[];
        iops: number[];
        throughputMB: number[];
    };
    evictions: {
        categories: string[];
        evictionRate: number[];
        average: number;
    };
    walBytes: {
        categories: string[];
        walBytes: number[];
        average: number;
    };
    recentStats?: {
        diskQueueLength: number;
        iopsSaturation: number;
        avgLatency: number;
        walBottleneck: number;
        bufferEvictionRate: number;
    };
}

const getDiskUtilizationColor = (value: number): string => {
    // 0~70%: 정상, 70~85%: 주의, 85% 이상: 경고
    if (value < 70) return "#8E79FF";   // normal
    if (value < 85) return "#FFD66B";   // warning
    return "#FEA29B";                   // critical
};

/** API 요청 - apiClient 사용 */
async function fetchDiskIOData() {
    const response = await apiClient.get<DiskIOData>("/system/diskio");
    return response.data;
}

// 메인 컴포넌트
export default function DiskPage() {
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["diskioDashboard"],
        queryFn: fetchDiskIOData,
        retry: 1,
        refetchInterval: 60000, // 1분마다 자동 갱신
    });


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

    const DiskUtilizationColor = getDiskUtilizationColor(dashboard.diskUsage.value);

    const recentStats = dashboard.recentStats || {
        diskQueueLength: 0,
        iopsSaturation: 0,
        avgLatency: 0,
        walBottleneck: 0,
        bufferEvictionRate: 0,
    };

    const summaryCards = [
        {
            label: "디스크 대기열 길이",
            value: recentStats.diskQueueLength.toFixed(2),
            desc: "최근 5분 평균",
            status: recentStats.diskQueueLength > 2 ? ("warning" as const) : ("info" as const),
        },
        {
            label: "IOPS 포화도",
            value: `${recentStats.iopsSaturation.toFixed(1)}%`,
            desc: "최근 5분 평균",
            status: recentStats.iopsSaturation > 90 ? ("warning" as const) : ("info" as const),
        },
        {
            label: "평균 응답 시간",
            value: `${recentStats.avgLatency.toFixed(1)}ms`,
            desc: "최근 5분 평균",
            status: recentStats.avgLatency > 10 ? ("warning" as const) : ("info" as const),
        },
        {
            label: "WAL 병목 여부",
            value: `${recentStats.walBottleneck.toFixed(1)}%`,
            desc: "최근 5분 평균",
            status: recentStats.walBottleneck > 15 ? ("warning" as const) : ("info" as const),
        },
        {
            label: "버퍼 교체 빈도",
            value: `${recentStats.bufferEvictionRate.toFixed(0)}/sec`,
            desc: "최근 5분 평균",
            status: recentStats.bufferEvictionRate > 100 ? ("warning" as const) : ("info" as const),
        },
    ];

    return (
        <div className="bgwriter-page">
            {/* Summary Cards */}
            <section className="disk-summary-cards">
                {summaryCards.map((card, index) => (
                    <SummaryCard
                        key={index}
                        label={card.label}
                        value={card.value}
                        desc={card.desc}
                        status={card.status}
                    />
                ))}
            </section>

            {/* 첫 번째 행: 게이지 차트 + 프로세스별 I/O 차트 */}
            <ChartGridLayout>
                <WidgetCard title="디스크 사용률" span={2}>
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
                        value={dashboard.diskUsage.value}
                        color={DiskUtilizationColor}
                        type="semi-circle"
                        radius={100}
                        strokeWidth={20}
                        height={200}
                        flattenRatio={0.89}
                    />
                        <div className="cpu-gauge-details">
                            <div className="cpu-detail-item">
                                <span className="cpu-detail-label">IOPS Read</span>
                                <span className="cpu-detail-value">{(dashboard.diskUsage.iopsRead / 1000).toFixed(1)}K</span>
                            </div>
                            <div className="cpu-detail-divider"></div>
                            <div className="cpu-detail-item">
                                <span className="cpu-detail-label">IOPS Write</span>
                                <span className="cpu-detail-value">{(dashboard.diskUsage.iopsWrite / 1000).toFixed(1)}K</span>
                            </div>
                        </div>
                    </div>
                </WidgetCard>

                <WidgetCard title="프로세스별 I/O 활동" span={5}>
                    <Chart
                        type="line"
                        series={dashboard.processIO.series.map(s => ({
                            name: s.name,
                            data: s.data
                        }))}
                        categories={dashboard.processIO.categories}
                        height={250}
                        colors={["#8E79FF", "#60A5FA", "#FBBF24", "#34D399", "#F87171"]}
                        showLegend={true}
                        showGrid={true}
                        // isStacked={true}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                        }}
                        yaxisOptions={{
                            title: { text: "I/O 횟수", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: {
                                formatter: (val: number) => `${(val / 1000).toFixed(1)}K`,
                            },
                        }}
                    />
                </WidgetCard>
                <WidgetCard title="I/O Latency 추이" span={5}>
                    <Chart
                        type="line"
                        series={[
                            { name: "읽기 지연", data: dashboard.ioLatency.readLatency },
                            { name: "쓰기 지연", data: dashboard.ioLatency.writeLatency },
                        ]}
                        categories={dashboard.ioLatency.categories}
                        height={250}
                        colors={["#8E79FF", "#FEA29B"]}
                        showLegend={true}
                        showGrid={true}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                        }}
                        yaxisOptions={{
                            title: { text: "지연시간 (ms)", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: { formatter: (val: number) => `${val.toFixed(1)}ms` },
                        }}
                        tooltipFormatter={(value: number) => `${value.toFixed(2)}ms`}
                        customOptions={{
                            annotations: {
                                yaxis: [
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
                                            text: "정상: 5ms",
                                            position: "right",
                                        },
                                    },
                                    {
                                        y: 10,
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
                                            text: "주의: 10ms",
                                            position: "right",
                                        },
                                    },
                                    {
                                        y: 20,
                                        borderColor: "#FEA29B",
                                        strokeDashArray: 4,
                                        opacity: 0.7,
                                        label: {
                                            borderColor: "#FEA29B",
                                            style: {
                                                color: "#fff",
                                                background: "#FEA29B",
                                                fontSize: "11px",
                                                fontWeight: 500,
                                            },
                                            text: "경고: 20ms",
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
                                    formatter: (val: number) => `${val}ms`,
                                },
                                min: 0,
                                max: 25,
                            },
                        }}
                    />
                </WidgetCard>
            </ChartGridLayout>

            {/* 두 번째 행: I/O Latency + Throughput + WAL Bytes + Queue Depth */}
            <ChartGridLayout>
                <WidgetCard title="Throughput (IOPS / 처리량 (MB/s))" span={4}>
                    <Chart
                        type="line"
                        series={[
                            { name: "IOPS", data: dashboard.throughput.iops },
                            { name: "처리량 (MB/s)", data: dashboard.throughput.throughputMB },
                        ]}
                        categories={dashboard.throughput.categories}
                        height={250}
                        colors={["#8E79FF", "#FEA29B"]}
                        showLegend={true}
                        showGrid={true}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                        }}
                        yaxisOptions={[
                            {
                                title: {
                                    text: "IOPS",
                                    style: { fontSize: "12px", color: "#6B7280" },
                                },
                                labels: {
                                    formatter: (val: number) => `${val}K`,
                                },
                            },
                            {
                                opposite: true,
                                title: {
                                    text: "MB/s",
                                    style: { fontSize: "12px", color: "#6B7280" },
                                },
                                labels: {
                                    formatter: (val: number) => `${val}MB`,
                                },
                            },
                        ]}
                    />
                </WidgetCard>

                <WidgetCard title="WAL Bytes 추이" span={4}>
                    <Chart
                        type="line"
                        series={[
                            { name: "WAL Bytes/sec", data: dashboard.walBytes.walBytes },
                        ]}
                        categories={dashboard.walBytes.categories}
                        height={250}
                        colors={["#8E79FF"]}
                        showLegend={false}
                        showGrid={true}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                        }}
                        yaxisOptions={{
                            title: { text: "WAL Bytes/sec", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: {
                                formatter: (val: number) => {
                                    if (val >= 1000000) {
                                        return `${(val / 1000000).toFixed(1)}M`;
                                    } else if (val >= 1000) {
                                        return `${(val / 1000).toFixed(1)}K`;
                                    }
                                    return `${val.toFixed(0)}`;
                                }
                            },
                        }}
                        tooltipFormatter={(value: number) => {
                            if (value >= 1000000) {
                                return `${(value / 1000000).toFixed(2)}MB/s`;
                            } else if (value >= 1000) {
                                return `${(value / 1000).toFixed(2)}KB/s`;
                            }
                            return `${value.toFixed(0)}B/s`;
                        }}
                        customOptions={{
                            annotations: {
                                yaxis: (() => {
                                    const maxValue = Math.max(...dashboard.walBytes.walBytes);
                                    const normalThreshold = Math.max(4000000, maxValue * 0.4);
                                    const warningThreshold = Math.max(7000000, maxValue * 0.7);

                                    return [
                                        {
                                            y: normalThreshold,
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
                                                text: `정상: ${(normalThreshold / 1000000).toFixed(1)}MB/s`,
                                                position: "right",
                                            },
                                        },
                                        {
                                            y: warningThreshold,
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
                                                text: `주의: ${(warningThreshold / 1000000).toFixed(1)}MB/s`,
                                                position: "right",
                                            },
                                        },
                                    ];
                                })(),
                            },
                            yaxis: {
                                labels: {
                                    style: {
                                        colors: "#6B7280",
                                        fontFamily: 'var(--font-family, "Pretendard", sans-serif)'
                                    },
                                    formatter: (val: number) => {
                                        if (val >= 1000000) {
                                            return `${(val / 1000000).toFixed(1)}M`;
                                        } else if (val >= 1000) {
                                            return `${(val / 1000).toFixed(1)}K`;
                                        }
                                        return `${val.toFixed(0)}`;
                                    },
                                },
                                min: 0,
                                max: (() => {
                                    const maxValue = Math.max(...dashboard.walBytes.walBytes);
                                    // 최대값의 120%로 설정하여 여유 공간 확보
                                    return Math.ceil(maxValue * 1.2);
                                })(),
                            },
                        }}
                    />
                </WidgetCard>

                <WidgetCard title="Disk Queue Depth 추이" span={4}>
                    <Chart
                        type="line"
                        series={[
                            { name: "Queue Length", data: dashboard.queueDepth.queueLength },
                        ]}
                        categories={dashboard.queueDepth.categories}
                        height={250}
                        colors={["#8E79FF"]}
                        showLegend={false}
                        showGrid={true}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                        }}
                        yaxisOptions={{
                            title: { text: "대기열 길이", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: { formatter: (val: number) => `${val.toFixed(1)}` },
                        }}
                        tooltipFormatter={(value: number) => `${value.toFixed(2)}`}
                        customOptions={{
                            annotations: {
                                yaxis: [
                                    {
                                        y: 2,
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
                                            text: "정상: 2",
                                            position: "right",
                                        },
                                    },
                                    {
                                        y: 5,
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
                                            text: "주의: 5",
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
                                    formatter: (val: number) => `${val.toFixed(1)}`,
                                },
                                min: 0,
                                max: 8,
                            },
                        }}
                    />
                </WidgetCard>
            </ChartGridLayout>

            {/* 세 번째 행: 1개 차트 */}
            <ChartGridLayout>
                <WidgetCard title="버퍼 교체(Evictions) 추이" span={12}>
                    <Chart
                        type="line"
                        series={[{ name: "Evictions/sec", data: dashboard.evictions.evictionRate }]}
                        categories={dashboard.evictions.categories}
                        height={250}
                        colors={["#8E79FF"]}
                        showLegend={false}
                        showGrid={true}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                        }}
                        yaxisOptions={{
                            title: { text: "Evictions/sec", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: { formatter: (val: number) => `${val}` },
                        }}
                        tooltipFormatter={(value: number) => `${value}/sec`}
                        customOptions={{
                            annotations: {
                                yaxis: [
                                    {
                                        y: 100,
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
                                            text: "정상: 100/sec",
                                            position: "right",
                                        },
                                    },
                                    {
                                        y: 200,
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
                                            text: "주의: 200/sec",
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
                                    formatter: (val: number) => `${val}`,
                                },
                                min: 0,
                                max: 250,
                            },
                        }}
                    />
                </WidgetCard>
            </ChartGridLayout>
        </div>
    );
}