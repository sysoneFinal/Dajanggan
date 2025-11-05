import { useState } from "react";
import Chart from "../../components/chart/ChartComponent";
import GaugeChart from "../../components/chart/GaugeChart";
import SummaryCard from "../../components/util/SummaryCard";
import WidgetCard from "../../components/util/WidgetCard";
import ChartGridLayout from "../../components/layout/ChartGridLayout";
import "../../styles/system/memory.css";

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
    evictionFlushRatio: {
        categories: string[];
        evictions: number[];
        fsyncs: number[];
    };
    sharedBuffersHitRatio: {
        categories: string[];
        data: number[];
        average: number;
    };
    topBufferObjects: {
        labels: string[];
        data: number[];
    };
    recentStats?: {
        pageFaultRate: number;
        backendWaitTime: number;
        workMemUsage: number;
        evictionCacheMissRate: number;
        backendFsyncCount: number;
    };
}

// 더미 데이터
const dummyData: MemoryData = {
    memoryUtilization: {
        value: 35.7,
        usedBuffers: 45000,
        totalBuffers: 126000,
    },
    bufferHitRatio: {
        value: 92.8,
        hitCount: 8500000,
        totalCount: 9160000,
    },
    sharedBufferUsage: {
        value: 78.5,
        activeBuffers: 98910,
        totalBuffers: 126000,
    },
    evictionRate: {
        categories: [
            "0:00", "2:00", "4:00", "6:00", "8:00", "10:00",
            "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"
        ],
        data: [160, 145, 130, 180, 155, 135, 165, 120, 140, 110, 125, 150],
        average: 143,
        max: 180,
        min: 110,
    },
    fsyncRate: {
        categories: [
            "0:00", "2:00", "4:00", "6:00", "8:00", "10:00",
            "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"
        ],
        data: [30, 45, 55, 28, 35, 48, 52, 38, 42, 31, 40, 50],
        average: 41,
        max: 55,
        backendFsync: 0,
    },
    evictionFlushRatio: {
        categories: [
            "0:00", "2:00", "4:00", "6:00", "8:00", "10:00",
            "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"
        ],
        evictions: [160, 145, 130, 180, 155, 135, 165, 120, 140, 110, 125, 150],
        fsyncs: [30, 45, 55, 28, 35, 48, 52, 38, 42, 31, 40, 50],
    },
    sharedBuffersHitRatio: {
        categories: [
            "0:00", "2:00", "4:00", "6:00", "8:00", "10:00",
            "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"
        ],
        data: [95, 93, 94, 92, 96, 95, 93, 94, 95, 96, 94, 93],
        average: 94.2,
    },
    topBufferObjects: {
        labels: ["orders", "users", "products", "payments", "inventory", "audit_log"],
        data: [18.5, 15.2, 12.8, 10.3, 8.7, 6.2],
    },
    recentStats: {
        pageFaultRate: 12,
        backendWaitTime: 0.8,
        workMemUsage: 340,
        evictionCacheMissRate: 3.2,
        backendFsyncCount: 0,
    },
};

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

// 메인 Memory 페이지
export default function MemoryPage() {
    const [data] = useState<MemoryData>(dummyData);

    const memoryUtilizationColor = getMemoryUtilizationColor(data.memoryUtilization.value);
    const hitRatioColor = getHitRatioColor(data.bufferHitRatio.value);
    const sharedBufferColor = getMemoryUtilizationColor(data.sharedBufferUsage.value);

    const recentStats = data.recentStats || {
        pageFaultRate: 12,
        backendWaitTime: 0.8,
        workMemUsage: 340,
        evictionCacheMissRate: 3.2,
        backendFsyncCount: 0,
    };

    const summaryCards = [
        {
            label: "페이지 폴트 발생률",
            value: `${recentStats.pageFaultRate}/s`,
            diff: -2,
            desc: "최근 5분 평균",
            status: recentStats.pageFaultRate > 20 ? ("warning" as const) : ("info" as const),
        },
        {
            label: "Backend 대기 시간",
            value: `${recentStats.backendWaitTime}ms`,
            diff: -0.1,
            desc: "최근 5분 평균",
            status: recentStats.backendWaitTime > 2 ? ("warning" as const) : ("info" as const),
        },
        {
            label: "작업 메모리 사용량",
            value: `${recentStats.workMemUsage}MB`,
            diff: 25,
            desc: "최근 5분 최대값",
            status: "info" as const,
        },
        {
            label: "Eviction 캐시 미스율",
            value: `${recentStats.evictionCacheMissRate}%`,
            diff: -0.3,
            desc: "최근 5분 평균",
            status: recentStats.evictionCacheMissRate > 10 ? ("warning" as const) : ("info" as const),
        },
        {
            label: "Backend Fsync 발생",
            value: `${recentStats.backendFsyncCount}회`,
            diff: 0,
            desc: "최근 5분 누적",
            status: recentStats.backendFsyncCount > 0 ? ("warning" as const) : ("info" as const),
        },
    ];

    return (
        <div className="memory-page">
            {/* 상단 요약 카드 */}
            <div className="memory-summary-cards">
                {summaryCards.map((card, idx) => (
                    <SummaryCard
                        key={idx}
                        label={card.label}
                        value={card.value}
                        diff={card.diff}
                        desc={card.desc}
                        status={card.status}
                    />
                ))}
            </div>

            {/* 첫 번째 행: 3개의 게이지 */}
            <ChartGridLayout>
                <WidgetCard title="Memory Utilization" span={2}>
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

                <WidgetCard title="Eviction 대비 Flush 비율" span={6}>
                    <Chart
                        type="line"
                        series={[
                            { name: "Evictions/sec", data: data.evictionFlushRatio.evictions },
                            { name: "Fsyncs/sec", data: data.evictionFlushRatio.fsyncs },
                        ]}
                        categories={data.evictionFlushRatio.categories}
                        height={250}
                        colors={["#8E79FF", "#FEA29B"]}
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
                    />
                </WidgetCard>

            </ChartGridLayout>

            {/* 두 번째 행: 3개 차트 */}
            <ChartGridLayout>
                <WidgetCard title="버퍼 교체율 (Last 24 Hours)" span={6}>
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
                    />
                </WidgetCard>


            </ChartGridLayout>

            {/* 세 번째 행: 2개 차트 */}
            <ChartGridLayout>
                <WidgetCard title="Shared Buffers 히트율 (Last 24 Hours)" span={6}>
                    <Chart
                        type="line"
                        series={[{ name: "Hit Ratio (%)", data: data.sharedBuffersHitRatio.data }]}
                        categories={data.sharedBuffersHitRatio.categories}
                        height={250}
                        colors={["#8E79FF"]}
                        showGrid={true}
                        showLegend={false}
                        xaxisOptions={{
                            title: { text: "시간", style: { fontSize: "12px", color: "#6B7280" } },
                        }}
                        yaxisOptions={{
                            title: { text: "Hit Ratio (%)", style: { fontSize: "12px", color: "#6B7280" } },
                            labels: { formatter: (val: number) => `${val}%` },
                            min: 85,
                            max: 100,
                        }}
                        tooltipFormatter={(value: number) => `${value}%`}
                        customOptions={{
                            annotations: {
                                yaxis: [
                                    {
                                        y: 95,
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
                                            text: "정상: 95%",
                                            position: "right",
                                        },
                                    },
                                    {
                                        y: 90,
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
                                            text: "주의: 90%",
                                            position: "right",
                                        },
                                    },
                                ],
                            },
                        }}
                    />
                </WidgetCard>

                <WidgetCard title="Top-N 버퍼 점유 객체" span={6}>
                    <Chart
                        type="bar"
                        series={[{ name: "% of Pool", data: data.topBufferObjects.data }]}
                        categories={data.topBufferObjects.labels}
                        height={250}
                        colors={["#FEA29B"]}
                        showGrid={true}
                        showLegend={false}
                        xaxisOptions={{
                            title: { text: "객체명", style: { fontSize: "12px", color: "#6B7280" } },
                        }}
                        tooltipFormatter={(value: number) => `${value}%`}
                    />
                </WidgetCard>
            </ChartGridLayout>
        </div>
    );
}