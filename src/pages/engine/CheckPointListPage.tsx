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
import "/src/styles/engine/checkpointlist.css";

// 데이터 타입 정의
interface CheckpointData {
    id: string;
    timestamp: string;
    type: "timed" | "requested";
    writeTime: number;
    syncTime: number;
    totalTime: number;
    walGenerated: string;
    bufferCount: number;
    status: "정상" | "주의" | "위험";
}

// 임시 목 데이터
const mockData: CheckpointData[] = [
    {
        id: "1",
        timestamp: "2025-10-23 11:40:45",
        type: "timed",
        writeTime: 2.4,
        syncTime: 2.8,
        totalTime: 3.0,
        walGenerated: "1.3GB",
        bufferCount: 8541,
        status: "정상",
    },
    {
        id: "2",
        timestamp: "2025-10-23 12:20:45",
        type: "requested",
        writeTime: 2.4,
        syncTime: 2.8,
        totalTime: 3.0,
        walGenerated: "1.3GB",
        bufferCount: 6541,
        status: "주의",
    },
    {
        id: "3",
        timestamp: "2025-10-23 14:15:25",
        type: "timed",
        writeTime: 1.2,
        syncTime: 1.6,
        totalTime: 2.0,
        walGenerated: "2.3GB",
        bufferCount: 2351,
        status: "정상",
    },
    {
        id: "4",
        timestamp: "2025-10-23 15:31:25",
        type: "requested",
        writeTime: 4.4,
        syncTime: 1.2,
        totalTime: 2.0,
        walGenerated: "2.3GB",
        bufferCount: 8541,
        status: "위험",
    },
    {
        id: "5",
        timestamp: "2025-10-23 16:40:45",
        type: "timed",
        writeTime: 2.1,
        syncTime: 2.3,
        totalTime: 4.4,
        walGenerated: "1.5GB",
        bufferCount: 7541,
        status: "정상",
    },
    {
        id: "6",
        timestamp: "2025-10-23 17:20:45",
        type: "requested",
        writeTime: 3.4,
        syncTime: 2.8,
        totalTime: 6.2,
        walGenerated: "1.8GB",
        bufferCount: 9541,
        status: "주의",
    },
    {
        id: "7",
        timestamp: "2025-10-23 18:15:25",
        type: "timed",
        writeTime: 1.8,
        syncTime: 1.9,
        totalTime: 3.7,
        walGenerated: "2.1GB",
        bufferCount: 5351,
        status: "정상",
    },
    {
        id: "8",
        timestamp: "2025-10-23 19:31:25",
        type: "requested",
        writeTime: 5.4,
        syncTime: 2.2,
        totalTime: 7.6,
        walGenerated: "3.3GB",
        bufferCount: 11541,
        status: "위험",
    },
    {
        id: "9",
        timestamp: "2025-10-23 20:40:45",
        type: "timed",
        writeTime: 2.2,
        syncTime: 2.5,
        totalTime: 4.7,
        walGenerated: "1.4GB",
        bufferCount: 6541,
        status: "정상",
    },
    {
        id: "10",
        timestamp: "2025-10-23 21:20:45",
        type: "requested",
        writeTime: 2.9,
        syncTime: 3.1,
        totalTime: 6.0,
        walGenerated: "1.9GB",
        bufferCount: 8241,
        status: "주의",
    },
    {
        id: "11",
        timestamp: "2025-10-23 22:15:25",
        type: "timed",
        writeTime: 1.5,
        syncTime: 1.7,
        totalTime: 3.2,
        walGenerated: "2.2GB",
        bufferCount: 4351,
        status: "정상",
    },
    {
        id: "12",
        timestamp: "2025-10-23 23:31:25",
        type: "requested",
        writeTime: 4.8,
        syncTime: 2.5,
        totalTime: 7.3,
        walGenerated: "3.5GB",
        bufferCount: 10541,
        status: "위험",
    },
    {
        id: "13",
        timestamp: "2025-10-24 00:40:45",
        type: "timed",
        writeTime: 2.3,
        syncTime: 2.6,
        totalTime: 4.9,
        walGenerated: "1.6GB",
        bufferCount: 7241,
        status: "정상",
    },
    {
        id: "14",
        timestamp: "2025-10-24 01:20:45",
        type: "requested",
        writeTime: 3.2,
        syncTime: 2.9,
        totalTime: 6.1,
        walGenerated: "2.0GB",
        bufferCount: 8841,
        status: "주의",
    },
    {
        id: "15",
        timestamp: "2025-10-24 02:15:25",
        type: "timed",
        writeTime: 1.6,
        syncTime: 1.8,
        totalTime: 3.4,
        walGenerated: "2.4GB",
        bufferCount: 4851,
        status: "정상",
    },
    {
        id: "16",
        timestamp: "2025-10-24 03:31:25",
        type: "requested",
        writeTime: 5.1,
        syncTime: 2.7,
        totalTime: 7.8,
        walGenerated: "3.7GB",
        bufferCount: 11241,
        status: "위험",
    },
];

export default function CheckPointListPage() {
    const [data] = useState<CheckpointData[]>(mockData);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [timeFilter, setTimeFilter] = useState("최근 24시간");

    // 페이지네이션 상태 (14개로 변경)
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 14; // 페이지당 14개 항목

    // 컬럼 정의
    const columns = useMemo<ColumnDef<CheckpointData>[]>(
        () => [
            {
                accessorKey: "timestamp",
                header: "시간",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "type",
                header: "유형",
                cell: (info) => {
                    const value = info.getValue() as string;
                    return (
                        <span className={`badge ${value === "timed" ? "badge-timed" : "badge-requested"}`}>
              {value}
            </span>
                    );
                },
            },
            {
                accessorKey: "writeTime",
                header: "Write(초)",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "syncTime",
                header: "Sync(초)",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "totalTime",
                header: "총 시간(초)",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "walGenerated",
                header: "WAL 생성",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "bufferCount",
                header: "Buffer(개)",
                cell: (info) => (info.getValue() as number).toLocaleString(),
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

    // 총 페이지 수 계산
    const totalPages = Math.ceil(data.length / pageSize);

    // 페이지 변경 핸들러
    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    // CSV 내보내기 함수
    const handleExportCSV = () => {
        const headers = ["시간", "유형", "Write(초)", "Sync(초)", "총 시간(초)", "WAL 생성", "Buffer(개)", "상태"];
        const csvData = data.map((row) => [
            row.timestamp,
            row.type,
            row.writeTime,
            row.syncTime,
            row.totalTime,
            row.walGenerated,
            row.bufferCount,
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
        const fileName = `checkpoint_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}.csv`;

        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        link.style.visibility = "hidden";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="checkpoint-container">
            <div className="checkpoint-header">
                <div className="checkpoint-actions">
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
                <table className="checkpoint-table">
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

            {/* 페이지네이션 */}
            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
            />
        </div>
    );
}