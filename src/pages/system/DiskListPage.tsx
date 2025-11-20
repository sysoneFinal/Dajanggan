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
import "../../styles/system/cpulist.css";
import apiClient from "../../api/apiClient";
import {useQuery} from "@tanstack/react-query";
import { useInstanceContext } from "../../context/InstanceContext";

// 낮은 Cache Hit Ratio 시간대 데이터 타입
interface LowCacheHitItem {
    collectedAt: string;
    bufferHitRatio: number;
    physicalReads: number;
    cacheHits: number;
    status: string;
    backendType: string;
    databaseName: string;
}

/** 낮은 Cache Hit 리스트 API 요청 */
async function fetchLowCacheHitList(instanceId: number, timeRange: string, statusFilter: string) {
    const params: any = { instanceId, timeRange };
    if (statusFilter) {
        params.status = statusFilter;
    }
    const response = await apiClient.get<LowCacheHitItem[]>("/system/diskio/list/low-cache-hit", { params });
    return response.data;
}

export default function DiskListPage() {
    const { selectedInstance } = useInstanceContext();
    const [timeRange, setTimeRange] = useState("7d");
    const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
    
    // 시간 범위 매핑 (한글 -> API 파라미터)
    const timeRangeMap: { [key: string]: string } = {
        "최근 1시간": "1h",
        "최근 6시간": "6h",
        "최근 24시간": "24h",
        "최근 7일": "7d",
    };
    
    const statusFilter = selectedStatus.length > 0 ? selectedStatus.join(",") : "";

    // 낮은 Cache Hit 리스트 조회
    const { data: lowCacheHitData, isLoading: isLoadingLowCacheHit, isError: isErrorLowCacheHit } = useQuery({
        queryKey: ["diskioLowCacheHit", selectedInstance?.instanceId, timeRange, statusFilter],
        queryFn: () => fetchLowCacheHitList(selectedInstance!.instanceId, timeRange, statusFilter),
        retry: 1,
        refetchInterval: 60000,
        enabled: !!selectedInstance,
    });

    // 낮은 Cache Hit 테이블 설정
    const [lowCacheHitSorting, setLowCacheHitSorting] = useState<SortingState>([]);
    const [lowCacheHitCurrentPage, setLowCacheHitCurrentPage] = useState(1);
    const lowCacheHitPageSize = 10;

    const lowCacheHitColumns = useMemo<ColumnDef<LowCacheHitItem>[]>(
        () => [
            {
                accessorKey: "collectedAt",
                header: "시간",
                cell: (info) => {
                    const value = info.getValue() as string;
                    return new Date(value).toLocaleString("ko-KR");
                },
            },
            {
                accessorKey: "backendType",
                header: "Backend 타입",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "databaseName",
                header: "데이터베이스",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "bufferHitRatio",
                header: "Buffer Hit Ratio(%)",
                cell: (info) => (info.getValue() as number).toFixed(1),
            },
            {
                accessorKey: "physicalReads",
                header: "Physical Reads",
                cell: (info) => (info.getValue() as number).toLocaleString(),
            },
            {
                accessorKey: "cacheHits",
                header: "Cache Hits",
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

    const lowCacheHitTable = useReactTable({
        data: lowCacheHitData || [],
        columns: lowCacheHitColumns,
        state: {
            sorting: lowCacheHitSorting,
            pagination: {
                pageIndex: lowCacheHitCurrentPage - 1,
                pageSize: lowCacheHitPageSize,
            },
        },
        onSortingChange: setLowCacheHitSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        manualPagination: false,
    });

    const lowCacheHitTotalPages = Math.ceil((lowCacheHitData?.length || 0) / lowCacheHitPageSize);

    // CSV 내보내기 함수
    const handleExportCSV = () => {
        if (!lowCacheHitData || lowCacheHitData.length === 0) return;
        
        const headers = ["시간", "Backend 타입", "데이터베이스", "Buffer Hit Ratio(%)", "Physical Reads", "Cache Hits", "상태"];
        
        const csvData = lowCacheHitData.map((item) => [
            new Date(item.collectedAt).toLocaleString("ko-KR"),
            item.backendType,
            item.databaseName,
            item.bufferHitRatio.toFixed(1),
            item.physicalReads.toLocaleString(),
            item.cacheHits.toLocaleString(),
            item.status,
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

    return (
        <main className="cpu-list-page">
            {/* 필터 선택 영역 */}
            <section className="cpu-list-page__filters">
                <MultiSelectDropdown
                    label="시간 선택"
                    options={[
                        "최근 1시간",
                        "최근 6시간",
                        "최근 24시간",
                        "최근 7일",
                    ]}
                    value={(() => {
                        const key = Object.keys(timeRangeMap).find(k => timeRangeMap[k] === timeRange);
                        return key ? [key] : ["최근 7일"];
                    })()}
                    onChange={(values) => {
                        // 시간 선택은 단일 선택만 허용 - 마지막 선택값만 유지
                        const valuesArray = Array.isArray(values) ? values : [values];
                        if (valuesArray.length > 0) {
                            const lastSelected = valuesArray[valuesArray.length - 1];
                            setTimeRange(timeRangeMap[lastSelected] || "7d");
                        } else {
                            setTimeRange("7d");
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
                    value={selectedStatus}
                    onChange={(values) => {
                        const valuesArray = Array.isArray(values) ? values : [values];
                        setSelectedStatus(valuesArray);
                    }}
                />
                <CsvButton onClick={handleExportCSV} tooltip="CSV 파일 저장"/>
            </section>

            {/* 낮은 Cache Hit Ratio 시간대 */}
            <section className="cpu-list-page__table disk-cache-hit-table">
                {/*<h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: '0 0 1rem 0' }}>낮은 Cache Hit Ratio 시간대</h2>*/}
                <div className="cpu-table-header">
                    {lowCacheHitTable.getHeaderGroups().map((headerGroup) => (
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

                {isLoadingLowCacheHit ? (
                    <div className="cpu-table-empty">데이터를 불러오는 중...</div>
                ) : isErrorLowCacheHit ? (
                    <div className="cpu-table-empty">오류: 데이터를 불러오는데 실패했습니다.</div>
                ) : lowCacheHitTable.getRowModel().rows.length > 0 ? (
                    lowCacheHitTable.getRowModel().rows.map((row) => (
                        <div key={row.id} className="cpu-table-row">
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
                    <div className="cpu-table-empty">데이터가 없습니다.</div>
                )}

                {lowCacheHitTotalPages > 1 && (
                    <Pagination
                        currentPage={lowCacheHitCurrentPage}
                        totalPages={lowCacheHitTotalPages}
                        onPageChange={setLowCacheHitCurrentPage}
                    />
                )}
            </section>
        </main>
    );
}
