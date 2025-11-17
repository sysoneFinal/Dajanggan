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
import "../../styles/system/memorylist.css";
import { useInstanceContext } from "../../context/InstanceContext";

// 데이터 타입 정의
interface MemoryData {
    id: string;
    objectName: string;
    type: "table" | "index";
    sizeMb: number;
    bufferCount: number;
    usagePercent: number;
    dirtyCount: number;
    dirtyPercent: number;
    pinnedBuffers: number;
    hitPercent: number;
    accessCount: number;
    evictionCount: number;
    avgAccessTime: number;
    status: "정상" | "주의" | "위험";
}

// API 응답 타입
interface MemoryListResponse {
    data: MemoryData[];
    total: number;
}

export default function MemoryListPage() {
    const { selectedInstance } = useInstanceContext();
    const [data, setData] = useState<MemoryData[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedType, setSelectedType] = useState<string[]>([]);
    const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
    const pageSize = 10;

    // API 데이터 조회
    const fetchData = async () => {
        // 인스턴스가 선택되지 않은 경우
        if (!selectedInstance) {
            setData([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // 타입 필터 변환
            const typeParam = selectedType.length > 0
                ? selectedType.join(",")
                : undefined;

            // 상태 필터 변환
            const statusParam = selectedStatus.length > 0
                ? selectedStatus.join(",")
                : undefined;

            console.log("Fetching memory list with params:", { typeParam, statusParam });

            // apiClient 사용하여 API 호출
            const response = await apiClient.get<MemoryListResponse>('/system/memory/list', {
                params: {
                    instanceId: selectedInstance.instanceId,
                    type: typeParam,
                    status: statusParam,
                },
            });

            console.log("Memory List API Response:", response);

            // 응답 데이터 확인 및 설정
            if (response && response.data) {
                setData(response.data || []);
            } else {
                console.warn("No data in response");
                setData([]);
            }
        } catch (err) {
            console.error("Memory 리스트 조회 오류:", err);
            setError(err instanceof Error ? err.message : "데이터 조회 중 오류가 발생했습니다.");
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    // 초기 로드 및 필터 변경 시 데이터 조회
    useEffect(() => {
        fetchData();
    }, [selectedType, selectedStatus, selectedInstance]);

    const columns = useMemo<ColumnDef<MemoryData>[]>(
        () => [
            {
                accessorKey: "objectName",
                header: "객체명",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "type",
                header: "타입",
                cell: (info) => {
                    const value = info.getValue() as string;
                    return <span className="badge badge-type">{value}</span>;
                },
            },
            {
                accessorKey: "sizeMb",
                header: "크기(MB)",
                cell: (info) => {
                    const value = info.getValue() as number;
                    return value ? value.toLocaleString() : "0";
                },
            },
            {
                accessorKey: "bufferCount",
                header: "버퍼(개)",
                cell: (info) => {
                    const value = info.getValue() as number;
                    return value ? value.toLocaleString() : "0";
                },
            },
            {
                accessorKey: "usagePercent",
                header: "점유율(%)",
                cell: (info) => {
                    const value = info.getValue() as number;
                    return value ? value.toLocaleString() : "0";
                },
            },
            {
                accessorKey: "dirtyCount",
                header: "Dirty(개)",
                cell: (info) => {
                    const value = info.getValue() as number;
                    return value ? value.toLocaleString() : "0";
                },
            },
            {
                accessorKey: "dirtyPercent",
                header: "Dirty 비율(%)",
                cell: (info) => {
                    const value = info.getValue() as number;
                    return value ? value.toLocaleString() : "0";
                },
            },
            {
                accessorKey: "pinnedBuffers",
                header: "고정 버퍼",
                cell: (info) => {
                    const value = info.getValue() as number;
                    return value ? value.toLocaleString() : "0";
                },
            },
            {
                accessorKey: "hitPercent",
                header: "Hit 비율(%)",
                cell: (info) => {
                    const value = info.getValue() as number;
                    return value ? value.toLocaleString() : "0";
                },
            },
            {
                accessorKey: "accessCount",
                header: "접근 횟수",
                cell: (info) => {
                    const value = info.getValue() as number;
                    return value ? value.toLocaleString() : "0";
                },
            },
            {
                accessorKey: "evictionCount",
                header: "Eviction",
                cell: (info) => {
                    const value = info.getValue() as number;
                    return value ? value.toLocaleString() : "0";
                },
            },
            {
                accessorKey: "avgAccessTime",
                header: "평균 시간(ms)",
                cell: (info) => {
                    const value = info.getValue() as number;
                    return value || "0";
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
            "객체명", "타입", "크기(MB)", "버퍼(개)", "점유율(%)",
            "Dirty(개)", "Dirty 비율(%)", "고정 버퍼",
            "Hit 비율(%)", "접근 횟수", "Eviction", "평균 시간(ms)", "상태",
        ];
        const csvData = data.map((row) => [
            row.objectName,
            row.type,
            row.sizeMb,
            row.bufferCount,
            row.usagePercent,
            row.dirtyCount,
            row.dirtyPercent,
            row.pinnedBuffers,
            row.hitPercent,
            row.accessCount,
            row.evictionCount,
            row.avgAccessTime,
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
        const fileName = `memory_${now.getFullYear()}${String(
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
        <main className="memory-list-page">
            {/* 필터 선택 영역 */}
            <section className="memory-list-page__filters">
                <MultiSelectDropdown
                    label="타입"
                    options={[
                        "table",
                        "index",
                    ]}
                    selectedValues={selectedType}
                    onChange={(values) => setSelectedType(values)}
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
                <CsvButton onClick={handleExportCSV} tooltip="CSV 파일 저장"/>
            </section>

            {/* Memory 테이블 */}
            <section className="memory-list-page__table">
                <div className="memory-table-header">
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
                    <div className="memory-table-empty">데이터를 불러오는 중...</div>
                ) : error ? (
                    <div className="memory-table-empty">
                        <div>오류: {error}</div>
                        <button
                            onClick={fetchData}
                            style={{
                                marginTop: '16px',
                                padding: '8px 16px',
                                backgroundColor: '#3B82F6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            다시 시도
                        </button>
                    </div>
                ) : table.getRowModel().rows.length > 0 ? (
                    table.getRowModel().rows.map((row) => (
                        <div key={row.id} className="memory-table-row">
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
                    <div className="memory-table-empty">
                        <div>데이터가 없습니다.</div>
                        <div style={{ fontSize: '14px', color: '#6B7280', marginTop: '8px' }}>
                            데이터베이스에 수집된 메모리 데이터가 없거나, 필터 조건에 맞는 데이터가 없습니다.
                        </div>
                    </div>
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