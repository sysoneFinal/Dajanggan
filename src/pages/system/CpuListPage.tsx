import { useMemo, useState } from "react";
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    flexRender,
    type ColumnDef,
    type SortingState,
} from "@tanstack/react-table";
import Pagination from "../../components/util/Pagination";
import "../../styles/system/cpulist.css";

interface CPUData {
    id: string;
    time: string;
    totalCPU: number;
    userCPU: number;
    systemCPU: number;
    ioWait: number;
    activeSessions: number;
    parallelWorkers: number;
    waitingSessions: number;
    workerTime: number;
    status: "정상" | "주의" | "위험";
}

// 임시 목 데이터
const mockData: CPUData[] = [
    {
        id: "1",
        time: "14:00",
        totalCPU: 85,
        userCPU: 75,
        systemCPU: 13,
        ioWait: 8,
        activeSessions: 45,
        parallelWorkers: 12,
        waitingSessions: 8,
        workerTime: 125.3,
        status: "위험",
    },
    {
        id: "2",
        time: "13:50",
        totalCPU: 65,
        userCPU: 58,
        systemCPU: 7,
        ioWait: 12,
        activeSessions: 38,
        parallelWorkers: 8,
        waitingSessions: 15,
        workerTime: 98.7,
        status: "정상",
    },
    {
        id: "3",
        time: "13:40",
        totalCPU: 45,
        userCPU: 38,
        systemCPU: 7,
        ioWait: 5,
        activeSessions: 28,
        parallelWorkers: 5,
        waitingSessions: 5,
        workerTime: 67.2,
        status: "정상",
    },
    {
        id: "4",
        time: "13:30",
        totalCPU: 78,
        userCPU: 68,
        systemCPU: 10,
        ioWait: 15,
        activeSessions: 52,
        parallelWorkers: 15,
        waitingSessions: 12,
        workerTime: 134.9,
        status: "정상",
    },
    {
        id: "5",
        time: "13:20",
        totalCPU: 42,
        userCPU: 35,
        systemCPU: 7,
        ioWait: 6,
        activeSessions: 25,
        parallelWorkers: 4,
        waitingSessions: 3,
        workerTime: 54.6,
        status: "정상",
    },
    {
        id: "6",
        time: "13:10",
        totalCPU: 92,
        userCPU: 81,
        systemCPU: 9,
        ioWait: 22,
        activeSessions: 68,
        parallelWorkers: 20,
        waitingSessions: 19,
        workerTime: 191.6,
        status: "위험",
    },
];

export default function CPUListPage() {
    const [data] = useState<CPUData[]>(mockData);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [timeFilter, setTimeFilter] = useState("최근 24시간");
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 14;

    // 프로그레스 바 색상 결정 함수
    const getCPUColor = (cpu: number) => {
        if (cpu >= 80) return "#EF4444"; // 빨강 (위험)
        if (cpu >= 60) return "#F59E0B"; // 주황 (주의)
        return "#10B981"; // 녹색 (정상)
    };

    // 컬럼 정의
    const columns = useMemo<ColumnDef<CPUData>[]>(
        () => [
            {
                accessorKey: "time",
                header: "시간",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "totalCPU",
                header: "전체 CPU(%)",
                cell: (info) => {
                    const value = info.getValue() as number;
                    const color = getCPUColor(value);
                    return (
                        <div className="progress-cell">
                            <div className="progress-bar-wrapper">
                                <div className="progress-bar-track">
                                    <div
                                        className="progress-bar-fill"
                                        style={{
                                            width: `${value}%`,
                                            backgroundColor: color,
                                        }}
                                    />
                                </div>
                            </div>
                            <span className="progress-value">{value}%</span>
                        </div>
                    );
                },
            },
            {
                accessorKey: "userCPU",
                header: "User CPU(%)",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "systemCPU",
                header: "System CPU(%)",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "ioWait",
                header: "I/O Wait(%)",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "activeSessions",
                header: "활성 세션",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "parallelWorkers",
                header: "병렬 워커",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "waitingSessions",
                header: "대기 세션",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "workerTime",
                header: "병렬 워커 시간(ms)",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "status",
                header: "상태",
                cell: (info) => {
                    const value = info.getValue() as string;
                    const getBadgeClass = () => {
                        switch (value) {
                            case "정상":
                                return "badge-normal";
                            case "주의":
                                return "badge-warning";
                            case "위험":
                                return "badge-danger";
                            default:
                                return "badge-normal";
                        }
                    };
                    return <span className={`badge ${getBadgeClass()}`}>{value}</span>;
                },
            },
        ],
        []
    );

    // 테이블 인스턴스 생성
    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
            pagination: {
                pageIndex: currentPage - 1,
                pageSize,
            },
        },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        manualPagination: false,
    });

    const totalPages = Math.ceil(data.length / pageSize);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    // CSV 내보내기 함수
    const handleExportCSV = () => {
        const headers = [
            "시간",
            "전체 CPU(%)",
            "User CPU(%)",
            "System CPU(%)",
            "I/O Wait(%)",
            "활성 세션",
            "병렬 워커",
            "대기 세션",
            "병렬 워커 시간(ms)",
            "상태",
        ];
        const csvData = data.map((row) => [
            row.time,
            row.totalCPU,
            row.userCPU,
            row.systemCPU,
            row.ioWait,
            row.activeSessions,
            row.parallelWorkers,
            row.waitingSessions,
            row.workerTime,
            row.status,
        ]);

        const csvContent = [
            headers.join(","),
            ...csvData.map((row) => row.join(",")),
        ].join("\n");

        const BOM = "\uFEFF";
        const blob = new Blob([BOM + csvContent], {
            type: "text/csv;charset=utf-8;",
        });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);

        const now = new Date();
        const fileName = `cpu_${now.getFullYear()}${String(
            now.getMonth() + 1
        ).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(
            now.getHours()
        ).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}.csv`;

        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        link.style.visibility = "hidden";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="cpu-container">
            <div className="cpu-header">
                <div className="cpu-actions">
                    <select
                        className="time-filter-dropdown"
                        value={timeFilter}
                        onChange={(e) => setTimeFilter(e.target.value)}
                    >
                        <option value="최근 1시간">최근 1시간</option>
                        <option value="최근 6시간">최근 6시간</option>
                        <option value="최근 24시간">최근 24시간</option>
                        <option value="최근 7일">최근 7일</option>
                    </select>

                    <button className="csv-export-button" onClick={handleExportCSV}>
                        CSV 내보내기
                    </button>
                </div>
            </div>

            <div className="table-wrapper">
                <table className="cpu-table">
                    <thead>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                                <th
                                    key={header.id}
                                    onClick={header.column.getToggleSortingHandler()}
                                >
                                    {flexRender(
                                        header.column.columnDef.header,
                                        header.getContext()
                                    )}
                                    {header.column.getIsSorted() && (
                                        <span className="sort-icon active">
                                                {header.column.getIsSorted() === "asc"
                                                    ? " ▲"
                                                    : " ▼"}
                                            </span>
                                    )}
                                </th>
                            ))}
                        </tr>
                    ))}
                    </thead>
                    <tbody>
                    {table.getRowModel().rows.map((row) => (
                        <tr key={row.id}>
                            {row.getVisibleCells().map((cell) => (
                                <td key={cell.id}>
                                    {flexRender(
                                        cell.column.columnDef.cell,
                                        cell.getContext()
                                    )}
                                </td>
                            ))}
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
            />
        </div>
    );
}