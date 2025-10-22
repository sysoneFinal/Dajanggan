import Chart from "../../components/chart/ChartComponent";
import GuageChart from "../../components/chart/GaugeChart";
import { useSearchParams } from "react-router-dom";


export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const instanceId = searchParams.get("instanceId");
  
  const salesSeries = [
    { name: "세션 활성 수", data: [1, 4, 5, 8, 12, 10] },
  ];
  const categories = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00"];

   const dotData = [
    {
      name: "Read Queries",
      data: [
        [1.2, 100],
        [2.5, 150],
        [3.5, 200],
        [4.0, 180],
      ],
    },
    {
      name: "Write Queries",
      data: [
        [1.0, 200],
        [2.2, 250],
        [3.8, 300],
        [4.5, 350],
      ],
    },
  ];


  return (
    <div>
      <h2 style={{ marginBottom: "20px" }}>Instance ID: {instanceId}</h2>
      <div className="line-chart-container">
          <Chart
        type="line"
        width="50%"
        series={salesSeries}
        categories={categories}
        titleOptions={{
          text: "Blocked Session Trend",
          align: "left",
          color: "#111827",
          fontSize: "14px",
          fontWeight: 600,
        }}
        colors={["#6366F1"]} // 보라색 계열 (Tailwind indigo-500)
        height={280}
        tooltipFormatter={(v) => `${v} sessions`}
        customOptions={{
          stroke: { width: 3, curve: "straight" },
          markers: { size: 5, colors: ["#6366F1"], strokeWidth: 2 },
          grid: { borderColor: "#E5E7EB" },
          yaxis: {
            title: { text: "Sessions", style: { color: "#374151", fontWeight: 500 } },
          },
        }}
      />
      </div>
      <div className="column-chart-container">
        <Chart
          type="column"
          series={salesSeries}
          categories={categories}
          width="50%"
          height={300}
          colors={["#6366F1"]}
          titleOptions={{
            text: "세션 추이",
            align: "center",
            color: "#111827",
            fontSize: "18px",
            fontWeight: 700,
          }}
          tooltipFormatter={(v) => `${v.toLocaleString()}개`}
          xaxisOptions={{
            title: { text: "활성 세션 수", style: { color: "#4B5563" } },
          }}
          yaxisOptions={{
            title: { text: "시간", style: { color: "#4B5563" } },
          }}
          customOptions={{
            chart: {
              toolbar: { show: false },
            },
            plotOptions: {
              bar: {
                horizontal: false,
                borderRadius: 6, 
                columnWidth: "50%", 
                distributed: false, 
                dataLabels: { position: "top" },
              },
            },
            dataLabels: {
              enabled: false,
            },
            stroke: {
              show: false, 
            },
            fill: {
              type: "gradient",
              gradient: {
                shade: "light",
                type: "vertical",
                shadeIntensity: 0.4,
                opacityFrom: 0.9,
                opacityTo: 0.3,
                stops: [0, 90, 100],
              },
            },
            xaxis: {
              labels: {
                style: {
                  colors: "#6B7280",
                  fontWeight: 500,
                },
              },
              axisBorder: {
                color: "#E5E7EB",
              },
              axisTicks: {
                color: "#E5E7EB",
              },
            },
            yaxis: {
              labels: {
                style: {
                  colors: "#9CA3AF",
                  fontWeight: 500,
                },
              },
            },
            grid: {
              borderColor: "#E5E7EB",
              strokeDashArray: 4,
              yaxis: { lines: { show: true } },
            },
            legend: { show: false },
          }}
        />
      </div>
      <div className="area-chart-container">
        <Chart
          type="area"
          series={salesSeries}
          categories={categories}
          width="50%"
          height={300}
          colors={["#6366F1"]}
          titleOptions={{
            text: "세션 추이",
            align: "center",
            color: "#111827",
            fontSize: "18px",
            fontWeight: 700,
          }}
          tooltipFormatter={(v) => `${v.toLocaleString()}개`}
          xaxisOptions={{
            title: { text: "활성 세션 수", style: { color: "#4B5563" } },
          }}
          yaxisOptions={{
            title: { text: "시간", style: { color: "#4B5563" } },
          }}
          customOptions={{
            stroke: { width: 4, curve: "smooth" },
            fill: {
              type: "gradient",
              gradient: {
                shadeIntensity: 0.5,
                opacityFrom: 0.7,
                opacityTo: 0.2,
              },
            },
          }}
        />
      </div>
      <div className="bar-chart-container">
        <Chart
          type="bar"
          series={salesSeries}
          categories={categories}
          width="50%"
          height={300}
          colors={["#6366F1"]}
          titleOptions={{
            text: "세션 추이",
            align: "center",
            color: "#111827",
            fontSize: "18px",
            fontWeight: 700,
          }}
          tooltipFormatter={(v) => `${v.toLocaleString()}개`}
          xaxisOptions={{
            title: { text: "활성 세션 수", style: { color: "#4B5563" } },
          }}
          yaxisOptions={{
            title: { text: "시간", style: { color: "#4B5563" } },
          }}
          customOptions={{
            chart: {
              toolbar: { show: false },
            },
            plotOptions: {
              bar: {
                horizontal: true,
                borderRadius: 6, 
                columnWidth: "50%", 
                distributed: false, 
                dataLabels: { position: "top" },
              },
            },
            dataLabels: {
              enabled: false,
            },
            stroke: {
              show: false, 
            },
            fill: {
              type: "gradient",
              gradient: {
                shade: "light",
                type: "vertical",
                shadeIntensity: 0.4,
                opacityFrom: 0.9,
                opacityTo: 0.3,
                stops: [0, 90, 100],
              },
            },
            xaxis: {
              labels: {
                style: {
                  colors: "#6B7280",
                  fontWeight: 500,
                },
              },
              axisBorder: {
                color: "#E5E7EB",
              },
              axisTicks: {
                color: "#E5E7EB",
              },
            },
            yaxis: {
              labels: {
                style: {
                  colors: "#9CA3AF",
                  fontWeight: 500,
                },
              },
            },
            grid: {
              borderColor: "#E5E7EB",
              strokeDashArray: 4,
              yaxis: { lines: { show: true } },
            },
            legend: { show: false },
          }}
        />
      </div>
  <div className="radial-bar-chart-container">  
    <GuageChart value={85} />

  </div>
    <div className="pie-chart-container">
      <Chart
        type="pie"
        series={[12, 8, 5, 3, 2]}
        categories={categories}
        titleOptions={{
          text: "Database Connection Ratio",
          align: "left",
          color: "#111827",
          fontSize: "14px",
          fontWeight: 600,
        }}
        colors={["#4F46E5", "#6366F1", "#818CF8", "#A5B4FC", "#C7D2FE"]}
        height={280}
        width={"50%"}
        tooltipFormatter={(v) => `${v}%`}
        customOptions={{
          legend: {
            position: "right",
            labels: { colors: "#6B7280" },
          },
          dataLabels: {
            enabled: true,
            style: { fontSize: "13px", fontWeight: 500 },
            dropShadow: { enabled: false },
          },
        }}
      />
    </div>
    <div className="scatter-chart-container">
      <Chart
      type="scatter"
      series={dotData}
      titleOptions={{
        text: "Query Latency vs CPU Usage",
        align: "left",
        color: "#111827",
        fontSize: "14px",
        fontWeight: 600,
      }}
      colors={["#6366F1"]}
      height={300}
      width={"50%"}
      tooltipFormatter={(v) => `${v.toFixed(2)}`}
      customOptions={{
        xaxis: {
          title: {
            text: "CPU Usage (%)",
            style: { color: "#374151", fontWeight: 500 },
          },
          tickAmount: 10,
        },
        yaxis: {
          title: {
            text: "Latency (ms)",
            style: { color: "#374151", fontWeight: 500 },
          },
        },
        grid: { borderColor: "#E5E7EB" },
        markers: { size: 6 },
      }}
    />
    </div>
</div>
  );
}
