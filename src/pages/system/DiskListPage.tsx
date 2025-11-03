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

// 데이터 타입 정의
interface DiskIOData {
    id: string;
    processType: string;
    writeRate: number;
    readRate: number;
    fsyncRate: number;
    evictionRate: number;
    writePercent: number;
    readPercent: number;
    averageTime: number;
    status: "정상" | "주의" | "위험";
}

// 임시 목 데이터
const mockData: DiskIOData[] = [
    {
        id: "1",
        processType: "backend",
        writeRate: 245,
        readRate: 1840,
        fsyncRate: 12,
        evictionRate: 45,
        writePercent: 35.8,
        readPercent: 64.2,
        averageTime: 8.5,
        status: "정상",
    },
    {
        id: "2",
        processType: "bgwriter",
        writeRate: 156,
        readRate: 0,
        fsyncRate: 28,
        evictionRate: 12,
        writePercent: 100.0,
        readPercent: 0.0,
        averageTime: 12.3,
        status: "정상",
    },
    {
        id: "3",
        processType: "checkpointer",
        writeRate: 892,
        readRate: 0,
        fsyncRate: 156,
        evictionRate: 0,
        writePercent: 100.0,
        readPercent: 0.0,
        averageTime: 45.6,
        status: "주의",
    },
    {
        id: "4",
        processType: "autovacuum",
        writeRate: 78,
        readRate: 324,
        fsyncRate: 8,
        evictionRate: 23,
        writePercent: 19.4,
        readPercent: 80.6,
        averageTime: 15.7,
        status: "정상",
    },
];

export default function DiskListPage() {
    const [data] = useState<DiskIOData[]>(mockData);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    // 컬럼 정의
    const columns = useMemo<ColumnDef<DiskIOData>[]>(
        () => [
            {
                accessorKey: "processType",
                header: "프로세스 타입",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "writeRate",
                header: "쓰기(개/s)",
                cell: (info) => (info.getValue() as number).toLocaleString(),
            },
            {
                accessorKey: "readRate",
                header: "읽기(개/s)",
                cell: (info) => (info.getValue() as number).toLocaleString(),
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
                accessorKey: "writePercent",
                header: "쓰기(%)",
                cell: (info) => `${info.getValue()}%`,
            },
            {
                accessorKey: "readPercent",
                header: "읽기(%)",
                cell: (info) => `${info.getValue()}%`,
            },
            {
                accessorKey: "averageTime",
                header: "평균 지연(ms)",
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
            "프로세스 타입",
            "쓰기(개/s)",
            "읽기(개/s)",
            "Fsync(회/s)",
            "Eviction(개/s)",
            "쓰기(%)",
            "읽기(%)",
            "평균 지연(ms)",
            "상태",
        ];
        const csvData = data.map((row) => [
            row.processType,
            row.writeRate,
            row.readRate,
            row.fsyncRate,
            row.evictionRate,
            row.writePercent,
            row.readPercent,
            row.averageTime,
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