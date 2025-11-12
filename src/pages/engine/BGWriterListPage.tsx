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
import MultiSelectDropdown from "../../components/util/MultiSelectDropdown";
import apiClient from "../../api/apiClient";
import "/src/styles/engine/bgwriterlist.css";

interface BGWriterData {
    id: string;
    timestamp: string;
    buffersAlloc: number;
    cleanRate: number;
    backendRate: number;
    checkpointBuffers: number;
    backendRatio: number;
    fsyncRate: number;
    maxWrittenRate: number;
    avgCycleTime: number;
    status: "정상" | "주의" | "위험";
}

interface BGWriterListResponse {
    data: BGWriterData[];
    total: number;
}

export default function BGWriterListPage() {
    const [data, setData] = useState<BGWriterData[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedTimeRange, setSelectedTimeRange] = useState<string[]>(["최근 7일"]);
    const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
    const pageSize = 10;

    // 시간 범위 매핑 (한글 -> API 파라미터)
    const timeRangeMap: { [key: string]: string } = {
        "최근 1시간": "1h",
        "최근 6시간": "6h",
        "최근 24시간": "24h",
        "최근 7일": "7d",
    };

    // API 데이터 조회
    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            // 시간 범위 변환
            const timeRange = selectedTimeRange.length > 0
                ? timeRangeMap[selectedTimeRange[0]] || "7d"
                : "7d";

            // 상태 필터 변환
            const statusParam = selectedStatus.length > 0
                ? selectedStatus.join(",")
                : undefined;

            // apiClient 사용하여 API 호출
            const response = await apiClient.get<BGWriterListResponse>('/engine/bgwriter/list', {
                params: {
                    timeRange,
                    status: statusParam,
                },
            });

            setData(response.data.data || []);
        } catch (err) {
            console.error("BGWriter 리스트 조회 오류:", err);
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

    // 프로그레스 바 색상 결정 함수
    const getProgressColor = (ratio: number) => {
        if (ratio >= 50) return "#FF928A"; // 빨강 (위험)
        if (ratio >= 30) return "#FFD66B"; // 주황 (주의)
        return "#7B61FF"; // 보라 (정상)
    };

    const columns = useMemo<ColumnDef<BGWriterData>[]>(
        () => [
            {
                accessorKey: "timestamp",
                header: "시간",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "buffersAlloc",
                header: "할당 버퍼(개)",
                cell: (info) => (info.getValue() as number).toLocaleString(),
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
                accessorKey: "checkpointBuffers",
                header: "Checkpoint(개)",
                cell: (info) => (info.getValue() as number).toLocaleString(),
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
                accessorKey: "avgCycleTime",
                header: "평균 사이클(ms)",
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
            "시간", "할당 버퍼(개)", "Clean(개/s)", "Backend(개/s)",
            "Checkpoint(개)", "Backend 비율(%)", "Fsync(회/s)",
            "상한 도달(회/분)", "평균 사이클(ms)", "상태"
        ];
        const csvData = data.map((row) => [
            row.timestamp,
            row.buffersAlloc,
            row.cleanRate,
            row.backendRate,
            row.checkpointBuffers,
            row.backendRatio,
            row.fsyncRate,
            row.maxWrittenRate,
            row.avgCycleTime,
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
        <main className="bgwriter-list-page">
            {/* 필터 선택 영역 */}
            <section className="bgwriter-list-page__filters">
                <MultiSelectDropdown
                    label="최근 7일"
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
                    selectedValues={selectedStatus}
                    onChange={(values) => setSelectedStatus(values)}
                />
                <CsvButton tooltip="CSV 파일 저장" onClick={handleExportCSV} />
            </section>

            {/* BGWriter 테이블 */}
            <section className="bgwriter-list-page__table">
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

                {loading ? (
                    <div className="bg-table-empty">데이터를 불러오는 중...</div>
                ) : error ? (
                    <div className="bg-table-empty">오류: {error}</div>
                ) : table.getRowModel().rows.length > 0 ? (
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