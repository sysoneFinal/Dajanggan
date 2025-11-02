import {Fragment, useMemo, useState} from "react";
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
import CsvButton from "../../components/util/CsvButton";
import MultiSelectDropdown from "../../components/util/MultiSelectDropdown";
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
    const pageSize = 10;

    // 프로그레스 바 색상 결정 함수
    const getUsageColor = (percent: number) => {
        if (percent >= 15) return "#FFD66B"; // 주황
        return "#7B61FF"; // 녹색
    };

    const getDirtyColor = (percent: number) => {
        if (percent >= 20) return "#FF928A"; // 빨강
        if (percent >= 10) return "#FFD66B"; // 주황
        return "#7B61FF"; // 녹색
    };

    const getHitColor = (percent: number) => {
        if (percent >= 98) return "#7B61FF"; // 녹색
        if (percent >= 95) return "#FFD66B"; // 주황
        return "#FF928A"; // 빨강
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
                    let className = "";
                    switch (value) {
                        case "정상":
                            className = "info";
                            break;
                        case "주의":
                            className = "warn";
                            break;
                        case "위험":
                            className = "error";
                            break;
                    }
                    return <span className={className}>{value}</span>;
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
        <main className="memory-page">
            {/* 필터 선택 영역 */}
            <section className="memory-page__filters">
                <MultiSelectDropdown
                    label="타입"
                    options={[
                        "table",
                        "index",
                    ]}
                    onChange={(values) => console.log("선택된 타입:", values)}
                />
                <MultiSelectDropdown
                    label="상태"
                    options={[
                        "정상",
                        "주의",
                        "위험",
                    ]}
                    onChange={(values) => console.log("선택된 상태:", values)}
                />
                <CsvButton onClick={handleExportCSV} tooltip="CSV 파일 저장"/>
            </section>

            {/* Memory 테이블 */}
            <section className="memory-page__table">
                <div className="memory-table-header">
                    {table.getHeaderGroups().map((headerGroup) => (
                        <Fragment key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                                <div
                                    key={header.id}
                                    onClick={header.column.getToggleSortingHandler()}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {flexRender(
                                        header.column.columnDef.header,
                                        header.getContext()
                                    )}
                                    {header.column.getIsSorted() && (
                                        <span className="sort-icon">
                                            {header.column.getIsSorted() === "asc" ? " ▲" : " ▼"}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </Fragment>
                    ))}
                </div>

                {table.getRowModel().rows.length > 0 ? (
                    table.getRowModel().rows.map((row) => (
                        <div key={row.id} className="memory-table-row">
                            {row.getVisibleCells().map((cell) => (
                                <div key={cell.id}>
                                    {flexRender(
                                        cell.column.columnDef.cell,
                                        cell.getContext()
                                    )}
                                </div>
                            ))}
                        </div>
                    ))
                ) : (
                    <div className="memory-table-empty">데이터가 없습니다.</div>
                )}
            </section>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                />
            )}
        </main>
    );
}