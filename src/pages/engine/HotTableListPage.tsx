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
import apiClient from "../../api/apiClient";
import "/src/styles/engine/hottablelist.css";

// 데이터 타입 정의
interface HotTableData {
    id: string;
    tableName: string;
    schemaName: string;
    size: string;
    seqScan: number;
    seqTupRead: number;
    idxScan: number;
    idxTupFetch: number;
    ntupIns: number;
    ntupUpd: number;
    ntupDel: number;
    ntupHotUpd: number;
    nliveTup: number;
    ndeadTup: number;
    lastVacuum: string;
    lastAutoVacuum: string;
    bloatPercent: number;
    cacheHit: number;
    status: "정상" | "주의" | "위험";
}

interface HotTableListResponse {
    data: HotTableData[];
    total: number;
}

export default function HotTableListPage() {
    const [data, setData] = useState<HotTableData[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
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

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            // 상태 필터 변환
            const statusParam = selectedStatus.length > 0
                ? selectedStatus.join(",")
                : undefined;

            const response = await apiClient.get<HotTableListResponse>('/engine/hottable/list', {
                params: {
                    databaseId: 1,  // 백엔드 필수 파라미터
                    status: statusParam,
                },
            });

            setData(response.data.data || []);
        } catch (err) {
            console.error("Hot Table 리스트 조회 오류:", err);
            setError(err instanceof Error ? err.message : "데이터 조회 중 오류가 발생했습니다.");
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    // 초기 로드 및 필터 변경 시 데이터 조회
    useEffect(() => {
        fetchData();
    }, [selectedStatus]);

    // 안전한 숫자 변환 헬퍼 함수
    const safeNumber = (value: any): number => {
        return value != null ? Number(value) : 0;
    };

    // 컬럼 정의
    const columns = useMemo<ColumnDef<HotTableData>[]>(
        () => [
            {
                accessorKey: "tableName",
                header: "테이블명",
                cell: (info) => info.getValue() || '-',
            },
            {
                accessorKey: "schemaName",
                header: "스키마",
                cell: (info) => info.getValue() || '-',
            },
            {
                accessorKey: "size",
                header: "크기",
                cell: (info) => info.getValue() || '-',
            },
            {
                accessorKey: "seqScan",
                header: "Seq Scan",
                cell: (info) => safeNumber(info.getValue()).toLocaleString(),
            },
            {
                accessorKey: "idxScan",
                header: "Idx Scan",
                cell: (info) => safeNumber(info.getValue()).toLocaleString(),
            },
            {
                accessorKey: "ntupIns",
                header: "Insert",
                cell: (info) => safeNumber(info.getValue()).toLocaleString(),
            },
            {
                accessorKey: "ntupUpd",
                header: "Update",
                cell: (info) => safeNumber(info.getValue()).toLocaleString(),
            },
            {
                accessorKey: "ntupDel",
                header: "Delete",
                cell: (info) => safeNumber(info.getValue()).toLocaleString(),
            },
            {
                accessorKey: "ntupHotUpd",
                header: "HOT Update",
                cell: (info) => safeNumber(info.getValue()).toLocaleString(),
            },
            {
                accessorKey: "nliveTup",
                header: "Live 튜플",
                cell: (info) => safeNumber(info.getValue()).toLocaleString(),
            },
            {
                accessorKey: "ndeadTup",
                header: "Dead 튜플",
                cell: (info) => safeNumber(info.getValue()).toLocaleString(),
            },
            {
                accessorKey: "bloatPercent",
                header: "Bloat(%)",
                cell: (info) => {
                    const value = safeNumber(info.getValue());
                    let className = "bloat-normal";
                    if (value >= 30) className = "bloat-high";
                    else if (value >= 15) className = "bloat-medium";
                    return <span className={className}>{value.toFixed(1)}%</span>;
                },
            },
            {
                accessorKey: "lastAutoVacuum",
                header: "마지막 Auto VACUUM",
                cell: (info) => info.getValue() || '-',
            },
            {
                accessorKey: "cacheHit",
                header: "캐시 Hit(%)",
                cell: (info) => safeNumber(info.getValue()).toFixed(1) + '%',
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
                    return <span className={className}>{value || '정상'}</span>;
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
            "테이블명", "스키마", "크기", "Seq Scan", "Idx Scan",
            "Insert", "Update", "Delete", "HOT Update",
            "Live 튜플", "Dead 튜플", "Bloat(%)",
            "마지막 Auto VACUUM", "캐시 Hit(%)", "상태"
        ];
        const csvData = filteredData.map((row) => [
            row.tableName,
            row.schemaName,
            row.size,
            safeNumber(row.seqScan),
            safeNumber(row.idxScan),
            safeNumber(row.ntupIns),
            safeNumber(row.ntupUpd),
            safeNumber(row.ntupDel),
            safeNumber(row.ntupHotUpd),
            safeNumber(row.nliveTup),
            safeNumber(row.ndeadTup),
            safeNumber(row.bloatPercent).toFixed(1),
            row.lastAutoVacuum || '-',
            safeNumber(row.cacheHit).toFixed(1),
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

    // 로딩 상태
    if (loading) {
        return (
            <main className="hottable-list-page">
                <div style={{ padding: '2rem', textAlign: 'center' }}>로딩 중...</div>
            </main>
        );
    }

    // 에러 상태
    if (error) {
        return (
            <main className="hottable-list-page">
                <div style={{ padding: '2rem', textAlign: 'center', color: '#EF4444' }}>
                    <p>오류: {error}</p>
                    <button onClick={fetchData} style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>
                        다시 시도
                    </button>
                </div>
            </main>
        );
    }

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