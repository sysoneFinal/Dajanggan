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
import "/src/styles/engine/checkpointlist.css";

interface CheckpointData {
    id: string;
    timestamp: string;
    type: "timed" | "requested";
    writeTime: number;
    syncTime: number;
    totalTime: number;
    walGenerated: string;
    walFilesAdded: number;
    walFilesRemoved: number;
    checkpointDistance: string;
    buffersWritten: number;
    buffersBackend: number;
    avgBuffersPerSec: number;
    status: "정상" | "주의" | "위험";
}

interface CheckpointListResponse {
    data: CheckpointData[];
    total: number;
}

export default function CheckPointListPage() {
    const [data, setData] = useState<CheckpointData[]>([]);
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
            const response = await apiClient.get<CheckpointListResponse>('/engine/checkpoint/list', {
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


    // 컬럼 정의 - 새 컬럼 추가
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
                accessorKey: "checkpointDistance",
                header: "간격",
                cell: (info) => info.getValue(),
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
                accessorKey: "walFilesAdded",
                header: "WAL 추가",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "walFilesRemoved",
                header: "WAL 제거",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "buffersWritten",
                header: "버퍼 쓰기(개)",
                cell: (info) => (info.getValue() as number).toLocaleString(),
            },
            {
                accessorKey: "buffersBackend",
                header: "Backend(개)",
                cell: (info) => (info.getValue() as number).toLocaleString(),
            },
            {
                accessorKey: "avgBuffersPerSec",
                header: "평균(개/초)",
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
        const headers = [
            "시간", "유형", "간격", "Write(초)", "Sync(초)", "총 시간(초)",
            "WAL 생성", "WAL 추가", "WAL 제거",
            "버퍼 쓰기(개)", "Backend(개)", "평균(개/초)", "상태"
        ];
        const csvData = data.map((row) => [
            row.timestamp,
            row.type,
            row.checkpointDistance,
            row.writeTime,
            row.syncTime,
            row.totalTime,
            row.walGenerated,
            row.walFilesAdded,
            row.walFilesRemoved,
            row.buffersWritten,
            row.buffersBackend,
            row.avgBuffersPerSec,
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