import { useState } from "react";
import Chart from "../../components/chart/ChartComponent";
import GaugeChart from "../../components/chart/GaugeChart";
import SummaryCard from "../../components/util/SummaryCard";
import WidgetCard from "../../components/util/WidgetCard";
import ChartGridLayout from "../../components/layout/ChartGridLayout";
import "../../styles/system/memory.css";
import apiClient from "../../api/apiClient";
import {useQuery} from "@tanstack/react-query";

// API 응답 전체 구조
interface MemoryData {
    memoryUtilization: {
        value: number;
        usedBuffers: number;
        totalBuffers: number;
    };
    bufferHitRatio: {
        value: number;
        hitCount: number;
        totalCount: number;
    };
    sharedBufferUsage: {
        value: number;
        activeBuffers: number;
        totalBuffers: number;
    };
    evictionRate: {
        categories: string[];
        data: number[];
        average: number;
        max: number;
        min: number;
    };
    fsyncRate: {
        categories: string[];
        data: number[];
        average: number;
        max: number;
        backendFsync: number;
    };
    dirtyBufferTrend: {
        categories: string[];
        data: number[];
        average: number;
        max: number;
        min: number;
    };
    evictionFlushRatio: {
        categories: string[];
        evictions: number[];
        fsyncs: number[];
    };
    topBufferObjects: {
        labels: string[];
        data: number[];
        types: string[]; // "table" or "index"
    };
    summaryStats: {
        dirtyBufferRatio: number;
        backendWaitTime: number;
        workMemUsage: number;
        tempFileUsage: number;
        checkpointInterval: number;
    };
}

// Gauge 색상 결정 (Memory Utilization)
const getMemoryUtilizationColor = (value: number): string => {
    if (value >= 80 && value <= 95) return "#7B61FF";
    if (value < 80) return "#FFD66B";
    return "#FF928A";
};

// Gauge 색상 결정 (Buffer Hit Ratio)
const getHitRatioColor = (value: number): string => {
    if (value >= 95) return "#7B61FF";
    if (value >= 90) return "#FFD66B";
    return "#FF928A";
};
/** API 요청 - apiClient 사용 */
async function fetchMemoryData() {
    const response = await apiClient.get<MemoryData>("/system/memory");
    return response.data;
}

// 메인 Memory 페이지
export default function MemoryPage() {
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["memoryDashboard"],
        queryFn: fetchMemoryData,
        retry: 1,
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

    const memoryUtilizationColor = getMemoryUtilizationColor(dashboard.memoryUtilization.value);
    const hitRatioColor = getHitRatioColor(dashboard.bufferHitRatio.value);
    const sharedBufferColor = getMemoryUtilizationColor(dashboard.sharedBufferUsage.value);

    // 요약 카드 데이터
    const summaryCards = [
        {
            label: "Dirty Buffer 비율",
            value: `${data.summaryStats.dirtyBufferRatio.toFixed(1)}%`,
            desc: "최근 5분 평균",
            status: data.summaryStats.dirtyBufferRatio > 20 ? ("warning" as const) : ("info" as const),
        },
        {
            label: "Backend 대기 시간",
            value: `${data.summaryStats.backendWaitTime.toFixed(1)}ms`,
            desc: "최근 5분 평균",
            status: data.summaryStats.backendWaitTime > 2 ? ("warning" as const) : ("info" as const),
        },
        {
            label: "작업 메모리 사용량",
            value: `${data.summaryStats.workMemUsage}MB`,
            desc: "최근 5분 최대값",
            status: "info" as const,
        },
        {
            label: "Temp File 사용량",
            value: `${data.summaryStats.tempFileUsage}MB`,
            desc: "최근 5분 누적",
            status: data.summaryStats.tempFileUsage > 500 ? ("warning" as const) : ("info" as const),
        },
        {
            label: "Checkpoint 발생 간격",
            value: `${Math.floor(data.summaryStats.checkpointInterval / 60)}분`,
            desc: "마지막 Checkpoint 이후",
            status: data.summaryStats.checkpointInterval < 120 ? ("warning" as const) : ("info" as const),
        },
    ];

    // Top-N 버퍼 객체를 Table/Index로 색상 분리
    const topBufferTableData = data.topBufferObjects.data.filter(
        (_, idx) => data.topBufferObjects.types[idx] === "table"
    );
    const topBufferIndexData = data.topBufferObjects.data.filter(
        (_, idx) => data.topBufferObjects.types[idx] === "index"
    );
    const topBufferTableLabels = data.topBufferObjects.labels.filter(
        (_, idx) => data.topBufferObjects.types[idx] === "table"
    );
    const topBufferIndexLabels = data.topBufferObjects.labels.filter(
        (_, idx) => data.topBufferObjects.types[idx] === "index"
    );

    // 차트용 데이터 재구성 (순서 유지하면서 색상만 분리)
    const topBufferChartData = data.topBufferObjects.data.map((value, idx) => {
        return {
            x: data.topBufferObjects.labels[idx],
            y: value,
            fillColor: data.topBufferObjects.types[idx] === "table" ? "#60A5FA" : "#FBBF24"
        };
    });

    return (
        <div className="memory-page">
            {/* 상단 요약 카드 */}
            <div className="memory-summary-cards">
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

            {/* 첫 번째 행: 3개의 게이지 */}
            <ChartGridLayout>
                <WidgetCard title="Memory 사용률" span={2}>
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
                            value={data.memoryUtilization.value}
                            color={memoryUtilizationColor}
                            type="semi-circle"
                            radius={100}
                            strokeWidth={20}
                            height={200}
                            flattenRatio={0.89}
                        />
                        <div className="memory-gauge-details">
                            <div className="memory-detail-item">
                                <span className="memory-detail-label">사용중</span>
                                <span className="memory-detail-value">{(data.memoryUtilization.usedBuffers / 1000).toFixed(1)}K</span>
                            </div>
                            <div className="memory-detail-divider"></div>
                            <div className="memory-detail-item">
                                <span className="memory-detail-label">전체</span>
                                <span className="memory-detail-value">{(data.memoryUtilization.totalBuffers / 1000).toFixed(1)}K</span>
                            </div>
                        </div>
                    </div>
                </WidgetCard>

                {/* Buffer Hit Ratio */}
                <WidgetCard title="Buffer Hit Ratio" span={2}>
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
                            value={data.bufferHitRatio.value}
                            color={hitRatioColor}
                            type="semi-circle"
                            radius={100}
                            strokeWidth={20}
                            height={200}
                            flattenRatio={0.89}
                        />
                        <div className="memory-gauge-details">
                            <div className="memory-detail-item">
                                <span className="memory-detail-label">Hit</span>
                                <span className="memory-detail-value">{(data.bufferHitRatio.hitCount / 1000000).toFixed(1)}M</span>
                            </div>
                            <div className="memory-detail-divider"></div>
                            <div className="memory-detail-item">
                                <span className="memory-detail-label">Total</span>
                                <span className="memory-detail-value">{(data.bufferHitRatio.totalCount / 1000000).toFixed(1)}M</span>
                            </div>
                        </div>
                    </div>
                </WidgetCard>

                {/* Shared Buffer Usage */}
                <WidgetCard title="Shared Buffer Usage" span={2}>
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
                            value={data.sharedBufferUsage.value}
                            color={sharedBufferColor}
                            type="semi-circle"
                            radius={100}
                            strokeWidth={20}
                            height={200}
                            flattenRatio={0.89}
                        />
                        <div className="memory-gauge-details">
                            <div className="memory-detail-item">
                                <span className="memory-detail-label">Active</span>
                                <span className="memory-detail-value">{(data.sharedBufferUsage.activeBuffers / 1000).toFixed(1)}K</span>
                            </div>
                            <div className="memory-detail-divider"></div>
                            <div className="memory-detail-item">
                                <span className="memory-detail-label">Total</span>
                                <span className="memory-detail-value">{(data.sharedBufferUsage.totalBuffers / 1000).toFixed(1)}K</span>
                            </div>
                        </div>
                    </div>
                </WidgetCard>
                <WidgetCard title="버퍼 퇴거 발생 추세 (Last 24 Hours)" span={6}>
                    <Chart
                        type="line"
                        series={[{ name: "Evictions/sec", data: data.evictionRate.data }]}
                        categories={data.evictionRate.categories}
                        height={250}
                        colors={["#8E79FF"]}
                        showGrid={true}
                        showLegend={false}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                        }}
                        yaxisOptions={{
                            title: { text: "Evictions/sec", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: { formatter: (val: number) => `${val}/s` },
                        }}
                        tooltipFormatter={(value: number) => `${value}/s`}
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
                                            text: "정상: 100/s",
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
                                            text: "주의: 200/s",
                                            position: "right",
                                        },
                                    },
                                    {
                                        y: 300,
                                        borderColor: "#FEA29B",
                                        strokeDashArray: 4,
                                        opacity: 0.8,
                                        label: {
                                            borderColor: "#FEA29B",
                                            style: {
                                                color: "#fff",
                                                background: "#FEA29B",
                                                fontSize: "11px",
                                                fontWeight: 600,
                                            },
                                            text: "경고: 300/s",
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
                                    formatter: (val: number) => `${val}/s`,
                                },
                                min: 0,
                                max: 350,
                            },
                        }}
                    />
                </WidgetCard>
            </ChartGridLayout>
        {/*  두번째 차트 행  */}
        <ChartGridLayout>
            <WidgetCard title="버퍼 플러시 발생 추세 (Last 24 Hours)" span={6}>
                <Chart
                    type="line"
                    series={[{ name: "Fsyncs/sec", data: data.fsyncRate.data }]}
                    categories={data.fsyncRate.categories}
                    height={250}
                    colors={["#8E79FF"]}
                    showGrid={true}
                    showLegend={false}
                    xaxisOptions={{
                        title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                    }}
                    yaxisOptions={{
                        title: { text: "Fsyncs/sec", style: { fontSize: "12px", color: "#6B7280" } },
                        labels: { formatter: (val: number) => `${val}/s` },
                    }}
                    tooltipFormatter={(value: number) => `${value}/s`}
                    customOptions={{
                        annotations: {
                            yaxis: [
                                {
                                    y: 50,
                                    borderColor: "#FBBF24",
                                    strokeDashArray: 4,
                                    opacity: 0.6,
                                    label: {
                                        borderColor: "#FBBF24",
                                        style: {
                                            color: "#fff",
                                            background: "#FBBF24",
                                            fontSize: "11px",
                                            fontWeight: 500,
                                        },
                                        text: "주의: 50/s",
                                        position: "right",
                                    },
                                },
                            ],
                        },
                    }}
                />
            </WidgetCard>
                <WidgetCard title="Dirty Buffer 추세 (Last 24 Hours)" span={6}>
                    <Chart
                        type="line"
                        series={[{ name: "Dirty Buffer %", data: data.dirtyBufferTrend.data }]}
                        categories={data.dirtyBufferTrend.categories}
                        height={250}
                        colors={["#8E79FF"]}
                        showGrid={true}
                        showLegend={false}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                        }}
                        yaxisOptions={{
                            title: { text: "Dirty Buffer (%)", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: { formatter: (val: number) => `${val.toFixed(1)}%` },
                            min: 0,
                            max: 30,
                        }}
                        tooltipFormatter={(value: number) => `${value.toFixed(1)}%`}
                        customOptions={{
                            annotations: {
                                yaxis: [
                                    {
                                        y: 15,
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
                                            text: "정상: 15%",
                                            position: "right",
                                        },
                                    },
                                    {
                                        y: 25,
                                        borderColor: "#FEA29B",
                                        strokeDashArray: 4,
                                        opacity: 0.7,
                                        label: {
                                            borderColor: "#FEA29B",
                                            style: {
                                                color: "#fff",
                                                background: "#FEA29B",
                                                fontSize: "11px",
                                                fontWeight: 600,
                                            },
                                            text: "경고: 25%",
                                            position: "right",
                                        },
                                    },
                                ],
                            },
                        }}
                    />
                </WidgetCard>
            </ChartGridLayout>
            {/* 3번째 행 */}
            <ChartGridLayout>
            <WidgetCard title="Eviction vs Flush 비교 (Last 24 Hours)" span={6}>
                <Chart
                    type="line"
                    series={[
                        { name: "Evictions/sec", data: data.evictionFlushRatio.evictions },
                        { name: "Fsyncs/sec", data: data.evictionFlushRatio.fsyncs }
                    ]}
                    categories={data.evictionFlushRatio.categories}
                    height={250}
                    colors={["#8E79FF", "#F59E0B"]}
                    showGrid={true}
                    showLegend={true}
                    xaxisOptions={{
                        title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                    }}
                    yaxisOptions={{
                        title: { text: "Events/sec", style: { fontSize: "12px", color: "#6B7280" } },
                        labels: { formatter: (val: number) => `${val}/s` },
                    }}
                    tooltipFormatter={(value: number) => `${value}/s`}
                    customOptions={{
                    }}
                />
            </WidgetCard>
            <WidgetCard title="Top-5 버퍼 점유 객체" span={6}>
                <Chart
                    type="bar"
                    series={[
                        {
                            name: "% of Pool",
                            data: data.topBufferObjects.data,
                        },
                    ]}
                    categories={data.topBufferObjects.labels}
                    height={250}
                    colors={["#60A5FA", "#FBBF24"]}
                    showGrid={true}
                    showLegend={false}
                    xaxisOptions={{
                        title: { text: "객체명", style: { fontSize: "12px", color: "#6B7280" } },
                        labels: {
                            style: { fontSize: "11px", colors: "#6B7280" },
                            rotate: -30,
                            trim: true,
                        },
                    }}
                    yaxisOptions={{
                        title: { text: "버퍼 점유율 (%)", style: { fontSize: "12px", color: "#6B7280" } },
                        labels: { formatter: (val: number) => `${val.toFixed(1)}%` },
                        min: 0,
                    }}
                    tooltipFormatter={(value: number, opts: any) => {
                        const type = data.topBufferObjects.types[opts.dataPointIndex];
                        const label = data.topBufferObjects.labels[opts.dataPointIndex];
                        return `${label}: ${value.toFixed(1)}% (${type === "table" ? "Table" : "Index"})`;
                    }}
                    customOptions={{
                        plotOptions: {
                            bar: {
                                distributed: true,
                                horizontal: false,
                                borderRadius: 4,
                                columnWidth: "55%",
                                dataLabels: { position: "top" },
                            },
                        },
                        dataLabels: {
                            enabled: true,
                            formatter: (val: number) => `${val.toFixed(1)}%`,
                            offsetY: -20,
                            style: {
                                fontSize: "11px",
                                colors: ["#374151"],
                                fontWeight: 600,
                            },
                        },
                        tooltip: {
                            y: {
                                formatter: (val: number, opts: any) => {
                                    const type = data.topBufferObjects.types[opts.dataPointIndex];
                                    return `${val.toFixed(1)}% (${type === "table" ? "Table" : "Index"})`;
                                },
                            },
                        },
                        xaxis: {
                            labels: {
                                rotate: -30,
                                style: { fontSize: "11px" },
                            },
                        },
                    }}
                />
            </WidgetCard>
            </ChartGridLayout>
        </div>
    );
}