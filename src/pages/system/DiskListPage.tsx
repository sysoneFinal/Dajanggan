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
import apiClient from "../../api/apiClient";
import {useQuery} from "@tanstack/react-query";
import { useInstanceContext } from "../../context/InstanceContext";

interface DiskIOData {
    id: string;
    processType: string;
    totalIO: number;
    readRate: number;
    writeRate: number;
    readMBs: number;
    writeMBs: number;
    throughputMBs: number;
    fsyncRate: number;
    evictionRate: number;
    extendRate: number;
    hitRatio: number;
    avgQueueDepth: number;
    avgLatency: number;
    readPercent: number;
    writePercent: number;
    status: "정상" | "주의" | "위험";
}

interface DiskIOListResponse {
    data: DiskIOData[];
    total: number;
}

/** API 요청 함수 - instanceId를 쿼리 파라미터로 전달 */
async function fetchDiskIOList(instanceId: number, timeRange: string, statusFilter: string) {
    const params: any = { instanceId, timeRange };
    if (statusFilter) {
        params.status = statusFilter;
    }
    const response = await apiClient.get<DiskIOListResponse>("/system/diskio/list", { params });
    return response.data;
}

export default function DiskListPage() {
    const { selectedInstance } = useInstanceContext();
    const [timeRange, setTimeRange] = useState("7d");
    const [statusFilter, setStatusFilter] = useState("");
    const [sorting, setSorting] = useState<SortingState>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    // React Query로 데이터 가져오기
    const { data: apiResponse, isLoading, isError } = useQuery({
        queryKey: ["diskioList", selectedInstance?.instanceId, timeRange, statusFilter],
        queryFn: () => fetchDiskIOList(selectedInstance!.instanceId, timeRange, statusFilter),
        retry: 1,
        refetchInterval: 60000, // 1분마다 자동 갱신
        enabled: !!selectedInstance, // 인스턴스가 선택되었을 때만 실행
    });

    const data = apiResponse?.data || [];

    const columns = useMemo<ColumnDef<DiskIOData>[]>(
        () => [
            {
                accessorKey: "processType",
                header: "프로세스 타입",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "totalIO",
                header: "전체 I/O(개/s)",
                cell: (info) => (info.getValue() as number).toLocaleString(),
            },
            {
                accessorKey: "readRate",
                header: "읽기(개/s)",
                cell: (info) => (info.getValue() as number).toLocaleString(),
            },
            {
                accessorKey: "writeRate",
                header: "쓰기(개/s)",
                cell: (info) => (info.getValue() as number).toLocaleString(),
            },
            {
                accessorKey: "readMBs",
                header: "읽기(MB/s)",
                cell: (info) => (info.getValue() as number).toFixed(2),
            },
            {
                accessorKey: "writeMBs",
                header: "쓰기(MB/s)",
                cell: (info) => (info.getValue() as number).toFixed(2),
            },
            {
                accessorKey: "throughputMBs",
                header: "처리량(MB/s)",
                cell: (info) => (info.getValue() as number).toFixed(2),
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
                accessorKey: "extendRate",
                header: "Extend(회/s)",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "hitRatio",
                header: "Hit Ratio(%)",
                cell: (info) => (info.getValue() as number).toFixed(1),
            },
            {
                accessorKey: "avgQueueDepth",
                header: "평균 큐 깊이",
                cell: (info) => (info.getValue() as number).toFixed(2),
            },
            {
                accessorKey: "avgLatency",
                header: "평균 지연(ms)",
                cell: (info) => (info.getValue() as number).toFixed(2),
            },
            {
                accessorKey: "readPercent",
                header: "읽기(%)",
                cell: (info) => `${(info.getValue() as number).toFixed(1)}%`,
            },
            {
                accessorKey: "writePercent",
                header: "쓰기(%)",
                cell: (info) => `${(info.getValue() as number).toFixed(1)}%`,
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
            "프로세스 타입", "전체 I/O(개/s)",
            "읽기(개/s)", "쓰기(개/s)",
            "읽기(MB/s)", "쓰기(MB/s)", "처리량(MB/s)",
            "Fsync(회/s)", "Eviction(개/s)", "Extend(회/s)",
            "Hit Ratio(%)", "평균 큐 깊이", "평균 지연(ms)",
            "읽기(%)", "쓰기(%)", "상태",
        ];
        const csvData = data.map((row) => [
            row.processType,
            row.totalIO,
            row.readRate,
            row.writeRate,
            row.readMBs,
            row.writeMBs,
            row.throughputMBs,
            row.fsyncRate,
            row.evictionRate,
            row.extendRate,
            row.hitRatio,
            row.avgQueueDepth,
            row.avgLatency,
            row.readPercent,
            row.writePercent,
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

    // 로딩 상태
    if (isLoading) {
        return (
            <main className="diskio-list-page">
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '400px',
                    fontSize: '18px',
                    color: '#6B7280'
                }}>
                    데이터를 불러오는 중...
                </div>
            </main>
        );
    }

    // 에러 상태
    if (isError) {
        return (
            <main className="diskio-list-page">
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '400px',
                    fontSize: '18px',
                    color: '#EF4444'
                }}>
                    데이터를 불러오는데 실패했습니다.
                </div>
            </main>
        );
    }

    return (
        <main className="diskio-list-page">
            {/* 필터 선택 영역 */}
            <section className="diskio-list-page__filters">
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '4px',
                            border: '1px solid #D1D5DB',
                            fontSize: '14px'
                        }}
                    >
                        <option value="1h">최근 1시간</option>
                        <option value="6h">최근 6시간</option>
                        <option value="24h">최근 24시간</option>
                        <option value="7d">최근 7일</option>
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '4px',
                            border: '1px solid #D1D5DB',
                            fontSize: '14px'
                        }}
                    >
                        <option value="">전체 상태</option>
                        <option value="정상">정상</option>
                        <option value="주의">주의</option>
                        <option value="위험">위험</option>
                    </select>
                </div>

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