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
import apiClient from "../../api/apiClient";
import {useQuery} from "@tanstack/react-query";
import "../../styles/system/cpulist.css";
import { useInstanceContext } from "../../context/InstanceContext";

// 낮은 캐시 히트율 테이블 데이터 타입
interface LowCacheHitItem {
    rankNum: number;
    tableName: string;
    databaseName: string;
    cacheHitRatio: number;
    physicalReads: number;
    cacheHits: number;
    status: string;
}

/** 낮은 캐시 히트율 리스트 API 요청 */
async function fetchLowCacheHitList(instanceId: number, timeRange: string, statusFilter: string, typeFilter: string) {
    try {
        const params: any = { instanceId, timeRange };
        if (statusFilter) {
            params.status = statusFilter;
        }
        if (typeFilter) {
            params.type = typeFilter;
        }
        console.log("[MemoryListPage] 낮은 캐시 히트율 리스트 API 호출:", params);
        const response = await apiClient.get<LowCacheHitItem[]>("/system/memory/list/low-cache-hit", { params });
        console.log("[MemoryListPage] 낮은 캐시 히트율 리스트 API 응답:", response.data?.length || 0, "개");
        return response.data;
    } catch (error) {
        console.error("[MemoryListPage] 낮은 캐시 히트율 리스트 API 에러:", error);
        throw error;
    }
}

export default function MemoryListPage() {
    const { selectedInstance } = useInstanceContext();
    const [timeRange, setTimeRange] = useState("24h");
    const [selectedType, setSelectedType] = useState<string[]>([]);
    const [selectedStatus, setSelectedStatus] = useState<string[]>([]);

    const typeFilter = selectedType.length > 0 ? selectedType.join(",") : "";
    const statusFilter = selectedStatus.length > 0 ? selectedStatus.join(",") : "";

    // 낮은 캐시 히트율 리스트 조회
    const { data: lowCacheHitData, isLoading: isLoadingLowCacheHit, isError: isErrorLowCacheHit } = useQuery({
        queryKey: ["memoryLowCacheHit", selectedInstance?.instanceId, timeRange, statusFilter, typeFilter],
        queryFn: () => fetchLowCacheHitList(selectedInstance!.instanceId, timeRange, statusFilter, typeFilter),
        retry: 1,
        refetchInterval: 60000,
        enabled: !!selectedInstance,
    });

    // 낮은 캐시 히트율 테이블 설정
    const [lowCacheHitSorting, setLowCacheHitSorting] = useState<SortingState>([]);
    const [lowCacheHitCurrentPage, setLowCacheHitCurrentPage] = useState(1);
    const lowCacheHitPageSize = 10;

    const lowCacheHitColumns = useMemo<ColumnDef<LowCacheHitItem>[]>(
        () => [
            {
                accessorKey: "rankNum",
                header: "순위",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "tableName",
                header: "테이블명",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "databaseName",
                header: "데이터베이스",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "cacheHitRatio",
                header: "Cache Hit 비율(%)",
                cell: (info) => (info.getValue() as number).toFixed(2),
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
        const headers = ["순위", "테이블명", "데이터베이스", "Cache Hit 비율(%)", "Physical Reads", "Cache Hits", "상태"];
        
        const csvData = lowCacheHitData?.map((row) => {
            const item = row as LowCacheHitItem;
            return [
                item.rankNum,
                item.tableName,
                item.databaseName,
                item.cacheHitRatio.toFixed(2),
                item.physicalReads,
                item.cacheHits,
                item.status,
            ];
        }) || [];

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
        const fileName = `memory_low_cache_hit_${now.getFullYear()}${String(
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

    // 시간 범위 매핑 (한글 -> API 파라미터)
    const timeRangeMap: { [key: string]: string } = {
        "최근 1시간": "1h",
        "최근 6시간": "6h",
        "최근 24시간": "24h",
        "최근 7일": "7d",
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
                        return key ? [key] : ["최근 24시간"];
                    })()}
                    onChange={(values) => {
                        // 시간 선택은 단일 선택만 허용 - 마지막 선택값만 유지
                        const valuesArray = Array.isArray(values) ? values : [values];
                        if (valuesArray.length > 0) {
                            const lastSelected = valuesArray[valuesArray.length - 1];
                            setTimeRange(timeRangeMap[lastSelected] || "24h");
                        } else {
                            setTimeRange("24h");
                        }
                    }}
                />
                <MultiSelectDropdown
                    label="타입"
                    options={["table", "index"]}
                    value={selectedType}
                    onChange={(values) => {
                        const valuesArray = Array.isArray(values) ? values : [values];
                        setSelectedType(valuesArray);
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

            {/* 낮은 캐시 히트율 테이블 */}
            <section className="cpu-list-page__table memory-cache-hit-table">
                {/*<h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: '0 0 1rem 0' }}>낮은 캐시 히트율 테이블</h2>*/}
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
