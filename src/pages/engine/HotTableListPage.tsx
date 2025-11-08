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
import "/src/styles/engine/hottablelist.css";

// 데이터 타입 정의
interface HotTableData {
    id: string;
    tableName: string;
    schemaName: string;
    size: string;
    seqScan: number;            // Sequential Scan 횟수
    seqTupRead: number;         // Seq Scan으로 읽은 튜플
    idxScan: number;            // Index Scan 횟수
    idxTupFetch: number;        // Index로 가져온 튜플
    nTupIns: number;            // Insert 횟수
    nTupUpd: number;            // Update 횟수
    nTupDel: number;            // Delete 횟수
    nTupHotUpd: number;         // HOT Update 횟수
    nLiveTup: number;           // Live 튜플 수
    nDeadTup: number;           // Dead 튜플 수
    lastVacuum: string;         // 마지막 VACUUM
    lastAutoVacuum: string;     // 마지막 Auto VACUUM
    bloatPercent: number;       // Bloat 비율
    cacheHit: number;
    status: "정상" | "주의" | "위험";
}

// 임시 목 데이터
const mockData: HotTableData[] = [
    {
        id: "1",
        tableName: "orders",
        schemaName: "public",
        size: "2.4 GB",
        seqScan: 450,
        seqTupRead: 1250000,
        idxScan: 85400,
        idxTupFetch: 425000,
        nTupIns: 12500,
        nTupUpd: 8400,
        nTupDel: 340,
        nTupHotUpd: 7850,
        nLiveTup: 1240000,
        nDeadTup: 3400,
        lastVacuum: "2025-10-23 10:30",
        lastAutoVacuum: "2025-10-23 13:45",
        bloatPercent: 5.2,
        cacheHit: 98.5,
        status: "정상",
    },
    {
        id: "2",
        tableName: "users",
        schemaName: "public",
        size: "1.8 GB",
        seqScan: 120,
        seqTupRead: 450000,
        idxScan: 124500,
        idxTupFetch: 248000,
        nTupIns: 5600,
        nTupUpd: 12400,
        nTupDel: 120,
        nTupHotUpd: 11200,
        nLiveTup: 450000,
        nDeadTup: 1200,
        lastVacuum: "2025-10-23 09:15",
        lastAutoVacuum: "2025-10-23 14:20",
        bloatPercent: 3.8,
        cacheHit: 99.1,
        status: "정상",
    },
    {
        id: "3",
        tableName: "products",
        schemaName: "public",
        size: "856 MB",
        seqScan: 2340,
        seqTupRead: 3400000,
        idxScan: 45600,
        idxTupFetch: 124000,
        nTupIns: 890,
        nTupUpd: 3400,
        nTupDel: 45,
        nTupHotUpd: 2100,
        nLiveTup: 85000,
        nDeadTup: 8400,
        lastVacuum: "2025-10-22 18:30",
        lastAutoVacuum: "2025-10-23 08:15",
        bloatPercent: 18.4,
        cacheHit: 94.2,
        status: "주의",
    },
    {
        id: "4",
        tableName: "inventory",
        schemaName: "public",
        size: "3.2 GB",
        seqScan: 89,
        seqTupRead: 890000,
        idxScan: 156000,
        idxTupFetch: 564000,
        nTupIns: 24500,
        nTupUpd: 45600,
        nTupDel: 890,
        nTupHotUpd: 38400,
        nLiveTup: 2340000,
        nDeadTup: 45600,
        lastVacuum: "2025-10-21 14:20",
        lastAutoVacuum: "2025-10-22 22:45",
        bloatPercent: 34.7,
        cacheHit: 91.5,
        status: "위험",
    },
    {
        id: "5",
        tableName: "cart_items",
        schemaName: "public",
        size: "456 MB",
        seqScan: 560,
        seqTupRead: 1240000,
        idxScan: 34500,
        idxTupFetch: 89000,
        nTupIns: 45600,
        nTupUpd: 12400,
        nTupDel: 8900,
        nTupHotUpd: 9800,
        nLiveTup: 124000,
        nDeadTup: 2300,
        lastVacuum: "2025-10-23 11:10",
        lastAutoVacuum: "2025-10-23 14:05",
        bloatPercent: 7.6,
        cacheHit: 97.8,
        status: "정상",
    },
];

export default function HotTableListPage() {
    const [data] = useState<HotTableData[]>(mockData);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [showHighBloatOnly, setShowHighBloatOnly] = useState(false);
    const pageSize = 10;

    // 필터링된 데이터
    const filteredData = useMemo(() => {
        let result = data;
        if (showHighBloatOnly) {
            result = result.filter((row) => row.bloatPercent >= 15);
        }
        return result;
    }, [data, showHighBloatOnly]);

    // 컬럼 정의
    const columns = useMemo<ColumnDef<HotTableData>[]>(
        () => [
            {
                accessorKey: "tableName",
                header: "테이블 명",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "schemaName",
                header: "스키마",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "size",
                header: "크기",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "seqScan",
                header: "Seq Scan",
                cell: (info) => (info.getValue() as number).toLocaleString(),
            },
            {
                accessorKey: "idxScan",
                header: "Idx Scan",
                cell: (info) => (info.getValue() as number).toLocaleString(),
            },
            {
                accessorKey: "nTupIns",
                header: "Insert",
                cell: (info) => (info.getValue() as number).toLocaleString(),
            },
            {
                accessorKey: "nTupUpd",
                header: "Update",
                cell: (info) => (info.getValue() as number).toLocaleString(),
            },
            {
                accessorKey: "nTupDel",
                header: "Delete",
                cell: (info) => (info.getValue() as number).toLocaleString(),
            },
            {
                accessorKey: "nTupHotUpd",
                header: "HOT Update",
                cell: (info) => (info.getValue() as number).toLocaleString(),
            },
            {
                accessorKey: "nLiveTup",
                header: "Live 튜플",
                cell: (info) => (info.getValue() as number).toLocaleString(),
            },
            {
                accessorKey: "nDeadTup",
                header: "Dead 튜플",
                cell: (info) => (info.getValue() as number).toLocaleString(),
            },
            {
                accessorKey: "bloatPercent",
                header: "Bloat(%)",
                cell: (info) => {
                    const value = info.getValue() as number;
                    let className = "bloat-normal";
                    if (value >= 30) className = "bloat-high";
                    else if (value >= 15) className = "bloat-medium";
                    return <span className={className}>{value}%</span>;
                },
            },
            {
                accessorKey: "lastAutoVacuum",
                header: "마지막 Auto VACUUM",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "cacheHit",
                header: "캐시 Hit(%)",
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
            "테이블 명", "스키마", "크기", "Seq Scan", "Idx Scan",
            "Insert", "Update", "Delete", "HOT Update",
            "Live 튜플", "Dead 튜플", "Bloat(%)",
            "마지막 Auto VACUUM", "캐시 Hit(%)", "상태"
        ];
        const csvData = filteredData.map((row) => [
            row.tableName,
            row.schemaName,
            row.size,
            row.seqScan,
            row.idxScan,
            row.nTupIns,
            row.nTupUpd,
            row.nTupDel,
            row.nTupHotUpd,
            row.nLiveTup,
            row.nDeadTup,
            row.bloatPercent,
            row.lastAutoVacuum,
            row.cacheHit,
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
                <div className="filter-list-toggles">
                    <label className="toggle-label">
                        <input
                            type="checkbox"
                            checked={showHighBloatOnly}
                            onChange={(e) => {
                                setShowHighBloatOnly(e.target.checked);
                                setCurrentPage(1);
                            }}
                        />
                        <span>High Bloat 테이블만 보기 (≥15%)</span>
                    </label>
                </div>
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