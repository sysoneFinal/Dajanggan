import {Fragment, useEffect, useMemo, useState} from "react";
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
import apiClient from "../../api/apiClient";

// 데이터 타입 정의
interface HotIndexData {
    id: string;
    indexName: string;
    tableName: string;
    schemaName: string;
    indexType: string;
    size: string;
    idxScan: number;
    idxTupRead: number;
    idxTupFetch: number;
    cacheHit: number;
    bloatPercent: number;
    avgScanTime: number;
    lastUsed: string;
    status: "정상" | "비효율" | "미사용" | "bloat";
}

interface HotIndexListResponse {
    data: HotIndexData[];
    total: number;
}

export default function HotIndexListPage() {
    const [data, setData] = useState<HotIndexData[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedTimeRange, setSelectedTimeRange] = useState<string>("7d");
    const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
    const pageSize = 10;

    // 체크박스 상태 (selectedStatus와 동기화)
    const showUnusedOnly = selectedStatus.includes("미사용");
    const showInefficientOnly = selectedStatus.includes("비효율");
    const showBloatOnly = selectedStatus.includes("bloat");

    // API 데이터 조회
    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            // 상태 필터 변환
            const statusParam = selectedStatus.length > 0
                ? selectedStatus.join(",")
                : undefined;

            // apiClient 사용하여 API 호출
            const response = await apiClient.get<HotIndexListResponse>('/engine/hotindex/list', {
                params: {
                    timeRange: selectedTimeRange,
                    status: statusParam,
                },
            });

            setData(response.data.data || []);
        } catch (err) {
            console.error("HotIndex 리스트 조회 오류:", err);
            setError(err instanceof Error ? err.message : "데이터 조회 중 오류가 발생했습니다.");
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    // 초기 로드 및 필터 변경 시 데이터 조회
    useEffect(() => {
        fetchData();
    }, [selectedTimeRange, selectedStatus]);

    // 필터링된 데이터 (이미 API에서 필터링됨)
    const filteredData = useMemo(() => data, [data]);

    // 체크박스 토글 핸들러
    const handleStatusToggle = (status: string, checked: boolean) => {
        setSelectedStatus(prev => {
            if (checked) {
                return [...prev, status];
            } else {
                return prev.filter(s => s !== status);
            }
        });
        setCurrentPage(1);
    };

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
                accessorKey: "indexType",
                header: "타입",
                cell: (info) => {
                    const value = info.getValue() as string;
                    return <span className="badge badge-type">{value}</span>;
                },
            },
            {
                accessorKey: "size",
                header: "크기",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "idxScan",
                header: "스캔(회/일)",
                cell: (info) => (info.getValue() as number).toLocaleString(),
            },
            {
                accessorKey: "idxTupRead",
                header: "읽은 튜플",
                cell: (info) => (info.getValue() as number).toLocaleString(),
            },
            {
                accessorKey: "idxTupFetch",
                header: "가져온 튜플",
                cell: (info) => (info.getValue() as number).toLocaleString(),
            },
            {
                accessorKey: "cacheHit",
                header: "캐시 Hit(%)",
                cell: (info) => {
                    const value = info.getValue() as number;
                    return `${value.toFixed(2)}%`;
                },
            },
            {
                accessorKey: "bloatPercent",
                header: "Bloat(%)",
                cell: (info) => {
                    const value = info.getValue() as number;
                    let className = "bloat-normal";
                    if (value >= 30) className = "bloat-high";
                    else if (value >= 15) className = "bloat-medium";
                    return <span className={className}>{value.toFixed(2)}%</span>;
                },
            },
            {
                accessorKey: "avgScanTime",
                header: "평균 시간(ms)",
                cell: (info) => {
                    const value = info.getValue() as number;
                    return value.toFixed(2);
                },
            },
            {
                accessorKey: "lastUsed",
                header: "마지막 사용",
                cell: (info) => info.getValue() || "N/A",
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
                        case "bloat":
                            className = "bloat";
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
            "스키마 명",
            "타입",
            "크기",
            "스캔(회/일)",
            "읽은 튜플",
            "가져온 튜플",
            "캐시 Hit(%)",
            "Bloat(%)",
            "평균 시간(ms)",
            "마지막 사용",
            "상태",
        ];
        const csvData = filteredData.map((row) => [
            row.indexName,
            row.tableName,
            row.schemaName,
            row.indexType,
            row.size,
            row.idxScan,
            row.idxTupRead,
            row.idxTupFetch,
            row.cacheHit,
            row.bloatPercent,
            row.avgScanTime,
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

    if (loading) {
        return <div className="hotindex-list-page">로딩 중...</div>;
    }

    if (error) {
        return <div className="hotindex-list-page">오류: {error}</div>;
    }

    return (
        <main className="hotindex-list-page">
            {/* 필터 선택 영역 */}
            <section className="hotindex-list-page__filters">
                <div className="filter-list-toggles">
                    <label className="toggle-label">
                        <input
                            type="checkbox"
                            checked={showUnusedOnly}
                            onChange={(e) => handleStatusToggle("미사용", e.target.checked)}
                        />
                        <span>미사용 인덱스만 보기</span>
                    </label>
                    <label className="toggle-label">
                        <input
                            type="checkbox"
                            checked={showInefficientOnly}
                            onChange={(e) => handleStatusToggle("비효율", e.target.checked)}
                        />
                        <span>비효율 인덱스만 보기</span>
                    </label>
                    <label className="toggle-label">
                        <input
                            type="checkbox"
                            checked={showBloatOnly}
                            onChange={(e) => handleStatusToggle("bloat", e.target.checked)}
                        />
                        <span>Bloat 인덱스만 보기</span>
                    </label>
                </div>
                <CsvButton onClick={handleExportCSV} tooltip="CSV 파일 저장"/>
            </section>

            {/* HotIndex 테이블 */}
            <section className="hotindex-list-page__table">
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