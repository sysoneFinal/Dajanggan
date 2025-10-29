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
import "../../styles/system/memorylist.css";

// 데이터 타입 정의
interface MemoryData {
    id: string;
    objectName: string;
    type: string;
    bufferCount: number;
    usagePercent: number;
    dirtyCount: number;
    dirtyPercent: number;
    hitPercent: number;
    status: "정상" | "주의" | "위험";
}

// 임시 목 데이터
const mockData: MemoryData[] = [
    {
        id: "1",
        objectName: "orders",
        type: "table",
        bufferCount: 12450,
        usagePercent: 15.2,
        dirtyCount: 845,
        dirtyPercent: 6.8,
        hitPercent: 98.6,
        status: "정상",
    },
    {
        id: "2",
        objectName: "idx_orders_user_id",
        type: "index",
        bufferCount: 4820,
        usagePercent: 5.9,
        dirtyCount: 124,
        dirtyPercent: 2.6,
        hitPercent: 99.2,
        status: "정상",
    },
    {
        id: "3",
        objectName: "users",
        type: "table",
        bufferCount: 8540,
        usagePercent: 10.4,
        dirtyCount: 1240,
        dirtyPercent: 14.5,
        hitPercent: 96.8,
        status: "주의",
    },
    {
        id: "4",
        objectName: "inventory",
        type: "table",
        bufferCount: 15680,
        usagePercent: 19.1,
        dirtyCount: 3450,
        dirtyPercent: 22.0,
        hitPercent: 94.2,
        status: "위험",
    },
    {
        id: "5",
        objectName: "idx_products_name",
        type: "index",
        bufferCount: 3240,
        usagePercent: 3.9,
        dirtyCount: 89,
        dirtyPercent: 2.7,
        hitPercent: 97.5,
        status: "정상",
    },
    {
        id: "6",
        objectName: "cart_items",
        type: "table",
        bufferCount: 5840,
        usagePercent: 7.1,
        dirtyCount: 980,
        dirtyPercent: 16.6,
        hitPercent: 95.6,
        status: "주의",
    },
    {
        id: "7",
        objectName: "reviews",
        type: "table",
        bufferCount: 6920,
        usagePercent: 8.4,
        dirtyCount: 456,
        dirtyPercent: 6.6,
        hitPercent: 98.1,
        status: "정상",
    },
    {
        id: "8",
        objectName: "idx_inventory_sku",
        type: "index",
        bufferCount: 2840,
        usagePercent: 3.5,
        dirtyCount: 45,
        dirtyPercent: 1.6,
        hitPercent: 99.6,
        status: "정상",
    },
];

export default function MemoryListPage() {
    const [data] = useState<MemoryData[]>(mockData);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 14;

    // 프로그레스 바 색상 결정 함수
    const getUsageColor = (percent: number) => {
        if (percent >= 15) return "#F59E0B"; // 주황
        return "#10B981"; // 녹색
    };

    const getDirtyColor = (percent: number) => {
        if (percent >= 20) return "#EF4444"; // 빨강
        if (percent >= 10) return "#F59E0B"; // 주황
        return "#10B981"; // 녹색
    };

    const getHitColor = (percent: number) => {
        if (percent >= 98) return "#10B981"; // 녹색
        if (percent >= 95) return "#F59E0B"; // 주황
        return "#EF4444"; // 빨강
    };

    const columns = useMemo<ColumnDef<MemoryData>[]>(
        () => [
            {
                accessorKey: "objectName",
                header: "객체명",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "type",
                header: "타입",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "bufferCount",
                header: "버퍼(개)",
                cell: (info) => (info.getValue() as number).toLocaleString(),
            },
            {
                accessorKey: "usagePercent",
                header: "점유율(%)",
                cell: (info) => {
                    const value = info.getValue() as number;
                    const color = getUsageColor(value);
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
                accessorKey: "dirtyCount",
                header: "Dirty(개)",
                cell: (info) => (info.getValue() as number).toLocaleString(),
            },
            {
                accessorKey: "dirtyPercent",
                header: "Dirty 비율(%)",
                cell: (info) => {
                    const value = info.getValue() as number;
                    const color = getDirtyColor(value);
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
                accessorKey: "hitPercent",
                header: "Hit 비율(%)",
                cell: (info) => {
                    const value = info.getValue() as number;
                    const color = getHitColor(value);
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
            "객체명",
            "타입",
            "버퍼(개)",
            "점유율(%)",
            "Dirty(개)",
            "Dirty 비율(%)",
            "Hit 비율(%)",
            "상태",
        ];
        const csvData = data.map((row) => [
            row.objectName,
            row.type,
            row.bufferCount,
            row.usagePercent,
            row.dirtyCount,
            row.dirtyPercent,
            row.hitPercent,
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
        const fileName = `memory_${now.getFullYear()}${String(
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
        <div className="memory-container">
            <div className="memory-header">
                <div className="memory-actions">
                    <button className="csv-export-button" onClick={handleExportCSV}>
                        CSV 내보내기
                    </button>
                </div>
            </div>

            <div className="table-wrapper">
                <table className="memory-table">
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