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
    const pageSize = 10;

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
        if (percent >= 80) return "#7B61FF"; // 녹색
        if (percent >= 60) return "#FFD66B"; // 주황
        return "#FF928A"; // 빨강
    };

    const getCacheHitColor = (percent: number) => {
        if (percent >= 95) return "#7B61FF"; // 녹색
        if (percent >= 85) return "#FFD66B"; // 주황
        return "#FF928A"; // 빨강
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
                    let className = "";
                    switch (value) {
                        case "정상":
                            className = "info";
                            break;
                        case "비효율":
                            className = "warn";
                            break;
                        case "미사용":
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
        <main className="hotindex-page">
            {/* 필터 선택 영역 */}
            <section className="hotindex-page__filters">
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
                <CsvButton onClick={handleExportCSV} tooltip="CSV 파일 저장"/>
            </section>

            {/* HotIndex 테이블 */}
            <section className="hotindex-page__table">
                <div className="hotindex-table-header">
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
                        <div key={row.id} className="hotindex-table-row">
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
                    <div className="hotindex-table-empty">데이터가 없습니다.</div>
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