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
import "../../styles/system/disklist.css";

interface DiskIOData {
    id: string;
    processType: string;
    totalIO: number;
    readRate: number;
    writeRate: number;
    readMBs: number;
    writeMBs: number;
    throughputMBs: number;
    fsyncRate: number;
    evictionRate: number;
    extendRate: number;
    hitRatio: number;
    avgQueueDepth: number;
    avgLatency: number;
    readPercent: number;
    writePercent: number;
    status: "정상" | "주의" | "위험";
}

const mockData: DiskIOData[] = [
    {
        id: "1",
        processType: "backend",
        totalIO: 2085,
        readRate: 1840,
        writeRate: 245,
        readMBs: 28.6,
        writeMBs: 3.8,
        throughputMBs: 32.4,
        fsyncRate: 12,
        evictionRate: 45,
        extendRate: 8,
        hitRatio: 96.5,
        avgQueueDepth: 2.3,
        avgLatency: 8.5,
        readPercent: 64.2,
        writePercent: 35.8,
        status: "정상",
    },
    {
        id: "2",
        processType: "bgwriter",
        totalIO: 156,
        readRate: 0,
        writeRate: 156,
        readMBs: 0,
        writeMBs: 2.4,
        throughputMBs: 2.4,
        fsyncRate: 28,
        evictionRate: 12,
        extendRate: 3,
        hitRatio: 100.0,
        avgQueueDepth: 0.8,
        avgLatency: 12.3,
        readPercent: 0.0,
        writePercent: 100.0,
        status: "정상",
    },
    {
        id: "3",
        processType: "checkpointer",
        totalIO: 892,
        readRate: 0,
        writeRate: 892,
        readMBs: 0,
        writeMBs: 13.9,
        throughputMBs: 13.9,
        fsyncRate: 156,
        evictionRate: 0,
        extendRate: 12,
        hitRatio: 100.0,
        avgQueueDepth: 4.2,
        avgLatency: 45.6,
        readPercent: 0.0,
        writePercent: 100.0,
        status: "주의",
    },
    {
        id: "4",
        processType: "autovacuum",
        totalIO: 402,
        readRate: 324,
        writeRate: 78,
        readMBs: 5.0,
        writeMBs: 1.2,
        throughputMBs: 6.2,
        fsyncRate: 8,
        evictionRate: 23,
        extendRate: 5,
        hitRatio: 94.2,
        avgQueueDepth: 1.6,
        avgLatency: 15.7,
        readPercent: 80.6,
        writePercent: 19.4,
        status: "정상",
    },
    {
        id: "5",
        processType: "walwriter",
        totalIO: 567,
        readRate: 0,
        writeRate: 567,
        readMBs: 0,
        writeMBs: 8.8,
        throughputMBs: 8.8,
        fsyncRate: 89,
        evictionRate: 0,
        extendRate: 18,
        hitRatio: 100.0,
        avgQueueDepth: 2.1,
        avgLatency: 18.4,
        readPercent: 0.0,
        writePercent: 100.0,
        status: "정상",
    },
];

export default function DiskListPage() {
    const [data] = useState<DiskIOData[]>(mockData);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const columns = useMemo<ColumnDef<DiskIOData>[]>(
        () => [
            {
                accessorKey: "processType",
                header: "프로세스 타입",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "totalIO",
                header: "전체 I/O(개/s)",
                cell: (info) => (info.getValue() as number).toLocaleString(),
            },
            {
                accessorKey: "readRate",
                header: "읽기(개/s)",
                cell: (info) => (info.getValue() as number).toLocaleString(),
            },
            {
                accessorKey: "writeRate",
                header: "쓰기(개/s)",
                cell: (info) => (info.getValue() as number).toLocaleString(),
            },
            {
                accessorKey: "readMBs",
                header: "읽기(MB/s)",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "writeMBs",
                header: "쓰기(MB/s)",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "throughputMBs",
                header: "처리량(MB/s)",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "fsyncRate",
                header: "Fsync(회/s)",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "evictionRate",
                header: "Eviction(개/s)",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "extendRate",
                header: "Extend(회/s)",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "hitRatio",
                header: "Hit Ratio(%)",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "avgQueueDepth",
                header: "평균 큐 깊이",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "avgLatency",
                header: "평균 지연(ms)",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "readPercent",
                header: "읽기(%)",
                cell: (info) => `${info.getValue()}%`,
            },
            {
                accessorKey: "writePercent",
                header: "쓰기(%)",
                cell: (info) => `${info.getValue()}%`,
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
            "프로세스 타입", "전체 I/O(개/s)",
            "읽기(개/s)", "쓰기(개/s)",
            "읽기(MB/s)", "쓰기(MB/s)", "처리량(MB/s)",
            "Fsync(회/s)", "Eviction(개/s)", "Extend(회/s)",
            "Hit Ratio(%)", "평균 큐 깊이", "평균 지연(ms)",
            "읽기(%)", "쓰기(%)", "상태",
        ];
        const csvData = data.map((row) => [
            row.processType,
            row.totalIO,
            row.readRate,
            row.writeRate,
            row.readMBs,
            row.writeMBs,
            row.throughputMBs,
            row.fsyncRate,
            row.evictionRate,
            row.extendRate,
            row.hitRatio,
            row.avgQueueDepth,
            row.avgLatency,
            row.readPercent,
            row.writePercent,
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
        const fileName = `diskio_${now.getFullYear()}${String(
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
        <main className="diskio-list-page">
            {/* 필터 선택 영역 */}
            <section className="diskio-list-page__filters">
                <CsvButton onClick={handleExportCSV} tooltip="CSV 파일 저장"/>
            </section>

            {/* DiskIO 테이블 */}
            <section className="diskio-list-page__table">
                <div className="diskio-table-header">
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
                        <div key={row.id} className="diskio-table-row">
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
                    <div className="diskio-table-empty">데이터가 없습니다.</div>
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