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
import "/src/styles/engine/bgwriterlist.css";

// 데이터 타입 정의
interface BGWriterData {
    id: string;
    timestamp: string;
    cleanRate: number;
    backendRate: number;
    backendRatio: number;
    fsyncRate: number;
    maxWrittenRate: number;
    status: "정상" | "주의" | "위험";
}

// 임시 목 데이터
const mockData: BGWriterData[] = [
    {
        id: "1",
        timestamp: "2025-10-23 14:05:30",
        cleanRate: 142,
        backendRate: 28,
        backendRatio: 16.5,
        fsyncRate: 12,
        maxWrittenRate: 0,
        status: "정상",
    },
    {
        id: "2",
        timestamp: "2025-10-23 14:05:30",
        cleanRate: 142,
        backendRate: 28,
        backendRatio: 16.5,
        fsyncRate: 12,
        maxWrittenRate: 0,
        status: "정상",
    },
    {
        id: "3",
        timestamp: "2025-10-23 14:05:30",
        cleanRate: 142,
        backendRate: 28,
        backendRatio: 16.5,
        fsyncRate: 12,
        maxWrittenRate: 0,
        status: "정상",
    },
    {
        id: "4",
        timestamp: "2025-10-23 14:05:30",
        cleanRate: 142,
        backendRate: 28,
        backendRatio: 34.7,
        fsyncRate: 12,
        maxWrittenRate: 0,
        status: "주의",
    },
    {
        id: "5",
        timestamp: "2025-10-23 14:05:30",
        cleanRate: 142,
        backendRate: 28,
        backendRatio: 16.5,
        fsyncRate: 12,
        maxWrittenRate: 0,
        status: "정상",
    },
    {
        id: "6",
        timestamp: "2025-10-23 14:05:30",
        cleanRate: 142,
        backendRate: 28,
        backendRatio: 60.7,
        fsyncRate: 12,
        maxWrittenRate: 0,
        status: "위험",
    },
];

export default function BGWriterListPage() {
    const [data] = useState<BGWriterData[]>(mockData);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [timeFilter, setTimeFilter] = useState("최근 24시간");
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 14;

    // 프로그레스 바 색상 결정 함수
    const getProgressColor = (ratio: number) => {
        if (ratio >= 50) return "#EF4444"; // 빨강 (위험)
        if (ratio >= 30) return "#F59E0B"; // 주황 (주의)
        return "#10B981"; // 녹색 (정상)
    };

    // 컬럼 정의
    const columns = useMemo<ColumnDef<BGWriterData>[]>(
        () => [
            {
                accessorKey: "timestamp",
                header: "시간",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "cleanRate",
                header: "Clean(개/s)",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "backendRate",
                header: "Backend(개/s)",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "backendRatio",
                header: "Backend 비율(%)",
                cell: (info) => {
                    const value = info.getValue() as number;
                    const color = getProgressColor(value);
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
                accessorKey: "fsyncRate",
                header: "Fsync(회/s)",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "maxWrittenRate",
                header: "상한 도달(회/분)",
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
        const headers = ["시간", "Clean(개/s)", "Backend(개/s)", "Backend 비율(%)", "Fsync(회/s)", "상한 도달(회/분)", "상태"];
        const csvData = data.map((row) => [
            row.timestamp,
            row.cleanRate,
            row.backendRate,
            row.backendRatio,
            row.fsyncRate,
            row.maxWrittenRate,
            row.status,
        ]);

        const csvContent = [
            headers.join(","),
            ...csvData.map((row) => row.join(",")),
        ].join("\n");

        const BOM = "\uFEFF";
        const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);

        const now = new Date();
        const fileName = `bgwriter_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}.csv`;

        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        link.style.visibility = "hidden";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="bgwriter-container">
            <div className="bgwriter-header">
                <div className="bgwriter-actions">
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
                <table className="bgwriter-table">
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
                        {header.column.getIsSorted() === "asc" ? " ▲" : " ▼"}
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
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
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