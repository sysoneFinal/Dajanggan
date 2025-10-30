import { useQuery } from "@tanstack/react-query";
import Chart from "../../components/chart/ChartComponent";
import GaugeChart from "../../components/chart/GaugeChart";
import "../../styles/engine/bgwriter.css";
import WidgetCard from "../../components/util/WidgetCard";

interface BGWriterData {
    backendFlushRatio: {
        value: number;
        buffersClean: number;
        buffersBackend: number;
    };
    cleanRate: {
        categories: string[];
        data: number[];
        average: number;
        max: number;
        min: number;
    };
    bufferFlushRatio: {
        categories: string[];
        backend: number[];
        clean: number[];
        backendTotal: number;
        cleanTotal: number;
    };
    maxwrittenClean: {
        categories: string[];
        data: number[];
        average: number;
        total: number;
    };
    backendFsync: {
        categories: string[];
        data: number[];
        total: number;
    };
    bgwriterVsCheckpoint: {
        categories: string[];
        bgwriter: number[];
        checkpoint: number[];
        bgwriterTotal: number;
        checkpointTotal: number;
    };
}

/** 더미 데이터 */
const mockData: BGWriterData = {
    backendFlushRatio: {
        value: 35.7,
        buffersClean: 28420,
        buffersBackend: 15680,
    },
    cleanRate: {
        categories: [
            "0:00", "2:00", "4:00", "6:00", "8:00", "10:00",
            "12:00", "14:00", "16:00", "18:00", "20:00", "23:00"
        ],
        data: [110, 95, 180, 195, 170, 115, 110, 95, 100, 120, 105, 115],
        average: 126,
        max: 195,
        min: 95,
    },
    bufferFlushRatio: {
        categories: [
            "0:00", "2:00", "4:00", "6:00", "8:00", "10:00",
            "12:00", "14:00", "16:00", "18:00", "20:00", "23:00"
        ],
        backend: [1500, 2000, 3500, 4000, 3800, 2500, 1800, 2200, 2800, 3200, 3500, 3300],
        clean: [3500, 3000, 2500, 2000, 2200, 3500, 4200, 3800, 3200, 2800, 2500, 2700],
        backendTotal: 34100,
        cleanTotal: 36000,
    },
    maxwrittenClean: {
        categories: [
            "0:00", "2:00", "4:00", "6:00", "8:00", "10:00",
            "12:00", "14:00", "16:00", "18:00", "20:00", "23:00"
        ],
        data: [45, 30, 65, 90, 65, 50, 95, 100, 70, 55, 50, 45],
        average: 63,
        total: 760,
    },
    backendFsync: {
        categories: [
            "0:00", "2:00", "4:00", "6:00", "8:00", "10:00",
            "12:00", "14:00", "16:00", "18:00", "20:00", "23:00"
        ],
        data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        total: 0,
    },
    bgwriterVsCheckpoint: {
        categories: [
            "0:00", "2:00", "4:00", "6:00", "8:00", "10:00",
            "12:00", "14:00", "16:00", "18:00", "20:00", "23:00"
        ],
        bgwriter: [1000, 1500, 2000, 1800, 1200, 1000, 2500, 2200, 1800, 1500, 1300, 1700],
        checkpoint: [4000, 3500, 2800, 3000, 2500, 2200, 1000, 1500, 2000, 2500, 3000, 3200],
        bgwriterTotal: 19500,
        checkpointTotal: 31200,
    },
};

/** API 요청 */
async function fetchBGWriterData() {
    const res = await fetch("/api/dashboard/bgwriter");
    if (!res.ok) throw new Error("Failed to fetch BGWriter data");
    return res.json();
}

/** 유틸리티 함수 */
const getGaugeStatus = (value: number): "normal" | "warning" | "critical" => {
    if (value < 15) return "normal";
    if (value < 30) return "warning";
    return "critical";
};

const getStatusText = (value: number): string => {
    if (value < 15) return "정상";
    if (value < 30) return "주의";
    return "위험";
};

/** 메인 컴포넌트 */
export default function BGWriterPage() {
    const { data } = useQuery({
        queryKey: ["bgwriterDashboard"],
        queryFn: fetchBGWriterData,
        retry: 1,
    });

    const dashboard = data || mockData;

    const gaugeStatus = getGaugeStatus(dashboard.backendFlushRatio.value);
    const statusText = getStatusText(dashboard.backendFlushRatio.value);

    return (
        <div className="bgwriter-page">
            {/* 메인 차트 그리드 */}
            <div className="bgwriter-chart-grid">
                {/* Backend Flush 비율 */}
                <WidgetCard title="Backend Flush 비율">
                    <div className="bgwriter-gauge-container">
                        <div className="bgwriter-status-badge">
                            <span className={`status-text ${gaugeStatus}`}>{statusText}</span>
                        </div>
                        <GaugeChart
                            value={dashboard.backendFlushRatio.value}
                            status={gaugeStatus}
                            type="semi-circle"
                        />
                    </div>
                </WidgetCard>

                {/* BGWriter 활동량 추세 */}
                <WidgetCard title="BGWriter 활동량 추세 (Last 24 Hours)">
                    <Chart
                        type="line"
                        series={[{ name: "Buffers Clean/sec", data: dashboard.cleanRate.data }]}
                        categories={dashboard.cleanRate.categories}
                        colors={["#8B5CF6"]}
                        height={250}
                    />
                </WidgetCard>

                {/* 버퍼 플러시 주체별 비율 */}
                <WidgetCard title="버퍼 플러시 주체별 비율 (Last 24 Hours)">
                    <Chart
                        type="area"
                        series={[
                            { name: "Backend", data: dashboard.bufferFlushRatio.backend },
                            { name: "Clean", data: dashboard.bufferFlushRatio.clean },
                        ]}
                        categories={dashboard.bufferFlushRatio.categories}
                        colors={["#3B82F6", "#10B981"]}
                        height={250}
                    />
                </WidgetCard>

                {/* Clean 스캔 상한 도달 추이 */}
                <WidgetCard title="Clean 스캔 상한 도달 추이 (Last 24 Hours)">
                    <Chart
                        type="line"
                        series={[{ name: "Maxwritten Clean", data: dashboard.maxwrittenClean.data }]}
                        categories={dashboard.maxwrittenClean.categories}
                        colors={["#F59E0B"]}
                        height={250}
                    />
                </WidgetCard>

                {/* buffers_backend_fsync 추이 */}
                <WidgetCard title="Buffers Backend Fsync 추이 (Last 24 Hours)">
                    <div className="bgwriter-fsync-status">
                        <div className="bgwriter-status-badge">
                        </div>
                    </div>
                    <Chart
                        type="line"
                        series={[{ name: "Fsync Count", data: dashboard.backendFsync.data }]}
                        categories={dashboard.backendFsync.categories}
                        colors={["#EF4444"]}
                        height={250}
                    />
                </WidgetCard>

                {/* BGWriter vs Checkpoint 쓰기 비중 */}
                <WidgetCard title="BGWriter vs Checkpoint 쓰기 비중 (Last 24 Hours)">
                    <Chart
                        type="line"
                        series={[
                            { name: "BGWriter", data: dashboard.bgwriterVsCheckpoint.bgwriter },
                            { name: "Checkpoint", data: dashboard.bgwriterVsCheckpoint.checkpoint },
                        ]}
                        categories={dashboard.bgwriterVsCheckpoint.categories}
                        colors={["#8B5CF6", "#F59E0B"]}
                        height={250}
                    />
                </WidgetCard>
            </div>
        </div>
    );
}