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

// 전체 메모리 요약 정보 타입
interface MemorySummary {
    totalSharedBuffers: string;
    usedSharedBuffers: string;
    freeSharedBuffers: string;
    dirtyBuffers: string;
    dirtyPercent: number;
    overallHitRatio: number;
}

// 데이터 타입 정의 - 컬럼 추가
interface MemoryData {
    id: string;
    objectName: string;
    type: "table" | "index";
    sizeMB: number;
    bufferCount: number;
    usagePercent: number;
    dirtyCount: number;
    dirtyPercent: number;
    pinnedBuffers: number;
    hitPercent: number;
    accessCount: number;
    evictionCount: number;
    avgAccessTime: number;
    status: "정상" | "주의" | "위험";
}

// 전체 메모리 요약 정보 (페이지 상단 표시용)
const memorySummary: MemorySummary = {
    totalSharedBuffers: "16 GB",
    usedSharedBuffers: "12.4 GB",
    freeSharedBuffers: "3.6 GB",
    dirtyBuffers: "1.2 GB",
    dirtyPercent: 9.7,
    overallHitRatio: 97.8,
};

// 임시 목 데이터 - 새 컬럼 포함
const mockData: MemoryData[] = [
    {
        id: "1",
        objectName: "orders",
        type: "table",
        sizeMB: 2458,
        bufferCount: 12450,
        usagePercent: 15.2,
        dirtyCount: 845,
        dirtyPercent: 6.8,
        pinnedBuffers: 24,
        hitPercent: 98.6,
        accessCount: 245600,
        evictionCount: 89,
        avgAccessTime: 0.8,
        status: "정상",
    },
    {
        id: "2",
        objectName: "idx_orders_user_id",
        type: "index",
        sizeMB: 256,
        bufferCount: 4820,
        usagePercent: 5.9,
        dirtyCount: 124,
        dirtyPercent: 2.6,
        pinnedBuffers: 8,
        hitPercent: 99.2,
        accessCount: 124500,
        evictionCount: 23,
        avgAccessTime: 0.5,
        status: "정상",
    },
    {
        id: "3",
        objectName: "users",
        type: "table",
        sizeMB: 1842,
        bufferCount: 8540,
        usagePercent: 10.4,
        dirtyCount: 1240,
        dirtyPercent: 14.5,
        pinnedBuffers: 18,
        hitPercent: 96.8,
        accessCount: 189400,
        evictionCount: 156,
        avgAccessTime: 1.2,
        status: "주의",
    },
    {
        id: "4",
        objectName: "inventory",
        type: "table",
        sizeMB: 3268,
        bufferCount: 15680,
        usagePercent: 19.1,
        dirtyCount: 3450,
        dirtyPercent: 22.0,
        pinnedBuffers: 42,
        hitPercent: 94.2,
        accessCount: 312400,
        evictionCount: 345,
        avgAccessTime: 2.1,
        status: "위험",
    },
    {
        id: "5",
        objectName: "idx_products_name",
        type: "index",
        sizeMB: 89,
        bufferCount: 3240,
        usagePercent: 3.9,
        dirtyCount: 89,
        dirtyPercent: 2.7,
        pinnedBuffers: 5,
        hitPercent: 97.5,
        accessCount: 45600,
        evictionCount: 34,
        avgAccessTime: 0.7,
        status: "정상",
    },
    {
        id: "6",
        objectName: "cart_items",
        type: "table",
        sizeMB: 456,
        bufferCount: 5840,
        usagePercent: 7.1,
        dirtyCount: 980,
        dirtyPercent: 16.6,
        pinnedBuffers: 12,
        hitPercent: 95.6,
        accessCount: 124800,
        evictionCount: 178,
        avgAccessTime: 1.5,
        status: "주의",
    },
];

export default function MemoryListPage() {
    const [data] = useState<MemoryData[]>(mockData);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

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
                cell: (info) => {
                    const value = info.getValue() as string;
                    return <span className="badge badge-type">{value}</span>;
                },
            },
            {
                accessorKey: "sizeMB",
                header: "크기(MB)",
                cell: (info) => (info.getValue() as number).toLocaleString(),
            },
            {
                accessorKey: "bufferCount",
                header: "버퍼(개)",
                cell: (info) => (info.getValue() as number).toLocaleString(),
            },
            {
                accessorKey: "usagePercent",
                header: "점유율(%)",
                cell: (info) => (info.getValue() as number).toLocaleString(),
            },
            {
                accessorKey: "dirtyCount",
                header: "Dirty(개)",
                cell: (info) => (info.getValue() as number).toLocaleString(),
            },
            {
                accessorKey: "dirtyPercent",
                header: "Dirty 비율(%)",
                cell: (info) => (info.getValue() as number).toLocaleString(),
            },
            {
                accessorKey: "pinnedBuffers",
                header: "고정 버퍼",
                cell: (info) => (info.getValue() as number).toLocaleString(),
            },
            {
                accessorKey: "hitPercent",
                header: "Hit 비율(%)",
                cell: (info) => (info.getValue() as number).toLocaleString(),
            },
            {
                accessorKey: "accessCount",
                header: "접근 횟수",
                cell: (info) => (info.getValue() as number).toLocaleString(),
            },
            {
                accessorKey: "evictionCount",
                header: "Eviction",
                cell: (info) => (info.getValue() as number).toLocaleString(),
            },
            {
                accessorKey: "avgAccessTime",
                header: "평균 시간(ms)",
                cell: (info) => info.getValue(),
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
            "객체명", "타입", "크기(MB)", "버퍼(개)", "점유율(%)",
            "Dirty(개)", "Dirty 비율(%)", "고정 버퍼",
            "Hit 비율(%)", "접근 횟수", "Eviction", "평균 시간(ms)", "상태",
        ];
        const csvData = data.map((row) => [
            row.objectName,
            row.type,
            row.sizeMB,
            row.bufferCount,
            row.usagePercent,
            row.dirtyCount,
            row.dirtyPercent,
            row.pinnedBuffers,
            row.hitPercent,
            row.accessCount,
            row.evictionCount,
            row.avgAccessTime,
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
        <main className="memory-list-page">
            {/* 필터 선택 영역 */}
            <section className="memory-list-page__filters">
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
            <section className="memory-list-page__table">
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