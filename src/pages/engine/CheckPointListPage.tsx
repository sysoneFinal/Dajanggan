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
];

export default function CheckPointListPage() {
    const [data] = useState<CheckpointData[]>(mockData);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

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
        <main className="checkpoint-list-page">
            {/* 필터 선택 영역 */}
            <section className="checkpoint-list-page__filters">
                <MultiSelectDropdown
                    label="시간 선택"
                    options={[
                        "최근 1시간",
                        "최근 6시간",
                        "최근 24시간",
                        "최근 7일",
                    ]}
                    onChange={(values) => console.log("선택된 시간:", values)}
                />
                <MultiSelectDropdown
                    label="유형"
                    options={[
                        "timed",
                        "requested",
                    ]}
                    onChange={(values) => console.log("선택된 유형:", values)}
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

            {/* Checkpoint 테이블 */}
            <section className="checkpoint-list-page__table">
                <div className="checkpoint-table-header">
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
                        <div key={row.id} className="checkpoint-table-row">
                            {row.getVisibleCells().map((cell) => (
                                <div key={cell.id}>
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </div>
                            ))}
                        </div>
                    ))
                ) : (
                    <div className="checkpoint-table-empty">데이터가 없습니다.</div>
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