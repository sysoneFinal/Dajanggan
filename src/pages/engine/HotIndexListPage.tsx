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
import "/src/styles/engine/hotindexlist.css";

// 데이터 타입 정의
interface HotIndexData {
    id: string;
    indexName: string;
    tableName: string;
    size: string;
    usageCount: number;
    efficiency: number;
    cacheHit: number;
    lastUsed: string;
    status: "정상" | "비효율" | "미사용";
}

// 임시 목 데이터
const mockData: HotIndexData[] = [
    {
        id: "1",
        indexName: "idx_users_email",
        tableName: "users",
        size: "124 MB",
        usageCount: 8540,
        efficiency: 94.2,
        cacheHit: 98.5,
        lastUsed: "1분 전",
        status: "정상",
    },
    {
        id: "2",
        indexName: "idx_orders_user_id",
        tableName: "orders",
        size: "256 MB",
        usageCount: 12450,
        efficiency: 88.7,
        cacheHit: 98.3,
        lastUsed: "5분 전",
        status: "정상",
    },
    {
        id: "3",
        indexName: "idx_products_name",
        tableName: "products",
        size: "89 MB",
        usageCount: 3240,
        efficiency: 62.4,
        cacheHit: 91.2,
        lastUsed: "12분 전",
        status: "비효율",
    },
    {
        id: "4",
        indexName: "idx_old_status",
        tableName: "orders",
        size: "45 MB",
        usageCount: 0,
        efficiency: 0.0,
        cacheHit: 0.0,
        lastUsed: "30분 전",
        status: "미사용",
    },
    {
        id: "5",
        indexName: "idx_inventory_sku",
        tableName: "inventory",
        size: "156 MB",
        usageCount: 6540,
        efficiency: 91.5,
        cacheHit: 98.5,
        lastUsed: "2분 전",
        status: "정상",
    },
    {
        id: "6",
        indexName: "idx_temp_hash",
        tableName: "cart_items",
        size: "34 MB",
        usageCount: 0,
        efficiency: 0.0,
        cacheHit: 0.0,
        lastUsed: "15분 전",
        status: "미사용",
    },
];

export default function HotIndexListPage() {
    const [data] = useState<HotIndexData[]>(mockData);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [showUnusedOnly, setShowUnusedOnly] = useState(false);
    const [showInefficientOnly, setShowInefficientOnly] = useState(false);
    const pageSize = 14;

    // 필터링된 데이터
    const filteredData = useMemo(() => {
        let result = data;
        if (showUnusedOnly) {
            result = result.filter((row) => row.status === "미사용");
        }
        if (showInefficientOnly) {
            result = result.filter((row) => row.status === "비효율");
        }
        return result;
    }, [data, showUnusedOnly, showInefficientOnly]);

    // 프로그레스 바 색상 결정 함수
    const getEfficiencyColor = (percent: number) => {
        if (percent >= 80) return "#10B981"; // 녹색
        if (percent >= 60) return "#F59E0B"; // 주황
        return "#EF4444"; // 빨강
    };

    const getCacheHitColor = (percent: number) => {
        if (percent >= 95) return "#10B981"; // 녹색
        if (percent >= 85) return "#F59E0B"; // 주황
        return "#EF4444"; // 빨강
    };

    // 컬럼 정의
    const columns = useMemo<ColumnDef<HotIndexData>[]>(
        () => [
            {
                accessorKey: "indexName",
                header: "인덱스 명",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "tableName",
                header: "테이블 명",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "size",
                header: "크기",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "usageCount",
                header: "사용(회/일)",
                cell: (info) => (info.getValue() as number).toLocaleString(),
            },
            {
                accessorKey: "efficiency",
                header: "효율성(%)",
                cell: (info) => {
                    const value = info.getValue() as number;
                    const color = getEfficiencyColor(value);
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
                accessorKey: "cacheHit",
                header: "캐시 Hit(%)",
                cell: (info) => {
                    const value = info.getValue() as number;
                    const color = getCacheHitColor(value);
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
                accessorKey: "lastUsed",
                header: "마지막 사용",
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
                            case "비효율":
                                return "badge-warning";
                            case "미사용":
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
        data: filteredData,
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

    const totalPages = Math.ceil(filteredData.length / pageSize);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    // CSV 내보내기 함수
    const handleExportCSV = () => {
        const headers = [
            "인덱스 명",
            "테이블 명",
            "크기",
            "사용(회/일)",
            "효율성(%)",
            "캐시 Hit(%)",
            "마지막 사용",
            "상태",
        ];
        const csvData = filteredData.map((row) => [
            row.indexName,
            row.tableName,
            row.size,
            row.usageCount,
            row.efficiency,
            row.cacheHit,
            row.lastUsed,
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
        const fileName = `hotindex_${now.getFullYear()}${String(
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
        <div className="hotindex-container">
            <div className="hotindex-header">
                <div className="filter-toggles">
                    <label className="toggle-label">
                        <input
                            type="checkbox"
                            checked={showUnusedOnly}
                            onChange={(e) => {
                                setShowUnusedOnly(e.target.checked);
                                setCurrentPage(1);
                            }}
                        />
                        <span>미사용 인덱스만 보기</span>
                    </label>
                    <label className="toggle-label">
                        <input
                            type="checkbox"
                            checked={showInefficientOnly}
                            onChange={(e) => {
                                setShowInefficientOnly(e.target.checked);
                                setCurrentPage(1);
                            }}
                        />
                        <span>비효율 인덱스만 보기</span>
                    </label>
                </div>

                <div className="hotindex-actions">
                    <button className="csv-export-button" onClick={handleExportCSV}>
                        CSV 내보내기
                    </button>
                </div>
            </div>

            <div className="table-wrapper">
                <table className="hotindex-table">
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