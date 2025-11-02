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
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedTimeRange, setSelectedTimeRange] = useState<string[]>(["최근 1시간"]);
    const pageSize = 10;

    // 프로그레스 바 색상 결정 함수
    const getProgressColor = (ratio: number) => {
        if (ratio >= 50) return "#FF928A"; // 빨강 (위험)
        if (ratio >= 30) return "#FFD66B"; // 주황 (주의)
        return "#7B61FF"; // 녹색 (정상)
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
        <main className="bgwriter-page">
            {/* 필터 선택 영역 */}
            <section className="bgwriter-page__filters">
                <MultiSelectDropdown
                    label="시간 선택"
                    options={[
                        "최근 1시간",
                        "최근 6시간",
                        "최근 24시간",
                        "최근 7일",
                    ]}
                    selectedValues={selectedTimeRange}
                    onChange={(values) => {
                        // 시간 선택은 단일 선택만 허용 - 마지막 선택값만 유지
                        if (values.length > 0) {
                            const lastSelected = values[values.length - 1];
                            setSelectedTimeRange([lastSelected]);
                            console.log("선택된 시간:", lastSelected);
                        } else {
                            setSelectedTimeRange([]);
                        }
                    }}
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
                <CsvButton tooltip="CSV 파일 저장" onClick={handleExportCSV} />
            </section>

            {/* BGWriter 테이블 */}
            <section className="bgwriter-page__table">
                <div className="bg-table-header">
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
                        <div key={row.id} className="bg-table-row">
                            {row.getVisibleCells().map((cell) => (
                                <div key={cell.id}>
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </div>
                            ))}
                        </div>
                    ))
                ) : (
                    <div className="bg-table-empty">데이터가 없습니다.</div>
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