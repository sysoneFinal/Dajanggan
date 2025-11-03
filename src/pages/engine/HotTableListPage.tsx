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
import "/src/styles/engine/hottablelist.css";

// 데이터 타입 정의
interface HotTableData {
    id: string;
    tableName: string;
    size: string;
    selectRate: number;
    updateRate: number;
    deadTuple: number;
    deadPercent: number;
    cacheHit: number;
    vacuumDelay: string;
    seqScan: number;
    status: "정상" | "주의" | "위험";
}

// 임시 목 데이터
const mockData: HotTableData[] = [
    {
        id: "1",
        tableName: "users",
        size: "2.4GB",
        selectRate: 1280,
        updateRate: 85,
        deadTuple: 12150,
        deadPercent: 8.5,
        cacheHit: 98.5,
        vacuumDelay: "2시간",
        seqScan: 12.5,
        status: "정상",
    },
    {
        id: "2",
        tableName: "orders",
        size: "4.2GB",
        selectRate: 2240,
        updateRate: 45860,
        deadTuple: 42150,
        deadPercent: 15.5,
        cacheHit: 94.2,
        vacuumDelay: "5시간",
        seqScan: 8.7,
        status: "정상",
    },
    {
        id: "3",
        tableName: "products",
        size: "1.4GB",
        selectRate: 921,
        updateRate: 25,
        deadTuple: 42150,
        deadPercent: 3.5,
        cacheHit: 98.7,
        vacuumDelay: "1시간",
        seqScan: 48.5,
        status: "위험",
    },
    {
        id: "4",
        tableName: "reviews",
        size: "3.4GB",
        selectRate: 1840,
        updateRate: 420,
        deadTuple: 4150,
        deadPercent: 8.5,
        cacheHit: 98.2,
        vacuumDelay: "2시간",
        seqScan: 4.5,
        status: "정상",
    },
    {
        id: "5",
        tableName: "carts",
        size: "4.4GB",
        selectRate: 705,
        updateRate: 78,
        deadTuple: 62150,
        deadPercent: 22.5,
        cacheHit: 90.9,
        vacuumDelay: "8시간",
        seqScan: 18.5,
        status: "정상",
    },
    {
        id: "6",
        tableName: "cart_items",
        size: "1.1GB",
        selectRate: 2240,
        updateRate: 850,
        deadTuple: 7150,
        deadPercent: 5.1,
        cacheHit: 98.9,
        vacuumDelay: "2시간",
        seqScan: 4.5,
        status: "정상",
    },
    {
        id: "7",
        tableName: "points",
        size: "4.4GB",
        selectRate: 1740,
        updateRate: 850,
        deadTuple: 16150,
        deadPercent: 18.9,
        cacheHit: 88.9,
        vacuumDelay: "6시간",
        seqScan: 22.5,
        status: "주의",
    },
];

export default function HotTableListPage() {
    const [data] = useState<HotTableData[]>(mockData);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    // 프로그레스 바 색상 결정 함수
    const getDeadPercentColor = (percent: number) => {
        if (percent >= 20) return "#FF928A"; // 빨강
        if (percent >= 10) return "#FFD66B"; // 주황
        return "#7B61FF"; // 녹색
    };

    const getCacheHitColor = (percent: number) => {
        if (percent >= 95) return "#7B61FF"; // 녹색
        if (percent >= 90) return "#FFD66B"; // 주황
        return "#FF928A"; // 빨강
    };

    const getSeqScanColor = (percent: number) => {
        if (percent >= 40) return "#FF928A"; // 빨강
        if (percent >= 20) return "#FFD66B"; // 주황
        return "#7B61FF"; // 녹색
    };

    const columns = useMemo<ColumnDef<HotTableData>[]>(
        () => [
            {
                accessorKey: "tableName",
                header: "테이블명",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "size",
                header: "크기",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "selectRate",
                header: "조회(건/s)",
                cell: (info) => (info.getValue() as number).toLocaleString(),
            },
            {
                accessorKey: "updateRate",
                header: "변경(건/s)",
                cell: (info) => (info.getValue() as number).toLocaleString(),
            },
            {
                accessorKey: "deadTuple",
                header: "Dead Tuple",
                cell: (info) => (info.getValue() as number).toLocaleString(),
            },
            {
                accessorKey: "deadPercent",
                header: "Dead 비율(%)",
                cell: (info) => {
                    const value = info.getValue() as number;
                    const color = getDeadPercentColor(value);
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
                accessorKey: "vacuumDelay",
                header: "Vaccum 지연",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "seqScan",
                header: "Seq Scan(%)",
                cell: (info) => {
                    const value = info.getValue() as number;
                    const color = getSeqScanColor(value);
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
            "테이블명",
            "크기",
            "조회(건/s)",
            "변경(건/s)",
            "Dead Tuple",
            "Dead 비율(%)",
            "캐시 Hit(%)",
            "Vaccum 지연",
            "Seq Scan(%)",
            "상태",
        ];
        const csvData = data.map((row) => [
            row.tableName,
            row.size,
            row.selectRate,
            row.updateRate,
            row.deadTuple,
            row.deadPercent,
            row.cacheHit,
            row.vacuumDelay,
            row.seqScan,
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
        const fileName = `hottable_${now.getFullYear()}${String(
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
        <main className="hottable-list-page">
            {/* 필터 선택 영역 */}
            <section className="hottable-list-page__filters">
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

            {/* HotTable 테이블 */}
            <section className="hottable-list-page__table">
                <div className="hottable-table-header">
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
                        <div key={row.id} className="hottable-table-row">
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
                    <div className="hottable-table-empty">데이터가 없습니다.</div>
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