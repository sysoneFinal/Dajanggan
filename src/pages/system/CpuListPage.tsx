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
import "../../styles/system/cpulist.css";
import { useInstanceContext } from "../../context/InstanceContext";

interface CPUData {
    id: string;
    time: string;
    totalCPU: number;
    userCPU: number;
    systemCPU: number;
    idleCPU: number;
    ioWait: number;
    stealCPU: number;
    loadAvg1: number;
    loadAvg5: number;
    loadAvg15: number;
    activeSessions: number;
    parallelWorkers: number;
    waitingSessions: number;
    workerTime: number;
    contextSwitches: number;
    status: "정상" | "주의" | "위험";
}

interface CPUListResponse {
    data: CPUData[];
    total: number;
}

export default function CpuListPage() {
    const { selectedInstance } = useInstanceContext();
    const [data, setData] = useState<CPUData[]>([]);
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

            // 시간 범위 변환
            const timeRange = selectedTimeRange.length > 0
                ? timeRangeMap[selectedTimeRange[0]] || "7d"
                : "7d";

            // 상태 필터 변환
            const statusParam = selectedStatus.length > 0
                ? selectedStatus.join(",")
                : undefined;

            // apiClient 사용하여 API 호출 - instanceId 추가
            const response = await apiClient.get<CPUListResponse>('/system/cpu/list', {
                params: {
                    instanceId: selectedInstance.instanceId,
                    timeRange,
                    status: statusParam,
                },
            });

            setData(response.data.data || []);
        } catch (err) {
            console.error("CPU 리스트 조회 오류:", err);
            setError(err instanceof Error ? err.message : "데이터 조회 중 오류가 발생했습니다.");
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    // 프로그레스 바 색상 결정 함수
    const getCPUColor = (cpu: number) => {
        if (cpu >= 80) return "#FF928A"; // 빨강 (위험)
        if (cpu >= 60) return "#FFD66B"; // 주황 (주의)
        return "#7B61FF"; // 보라 (정상)
    };

    // 초기 로드 및 필터 변경 시 데이터 조회
    useEffect(() => {
        fetchData();
    }, [selectedTimeRange, selectedStatus, selectedInstance]);

    const columns = useMemo<ColumnDef<CPUData>[]>(
        () => [
            {
                accessorKey: "time",
                header: "시간",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "userCPU",
                header: "User CPU(%)",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "systemCPU",
                header: "System CPU(%)",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "idleCPU",
                header: "Idle CPU(%)",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "ioWait",
                header: "I/O Wait(%)",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "stealCPU",
                header: "Steal CPU(%)",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "loadAvg1",
                header: "Load Avg (1m)",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "loadAvg5",
                header: "Load Avg (5m)",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "loadAvg15",
                header: "Load Avg (15m)",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "activeSessions",
                header: "활성 세션",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "parallelWorkers",
                header: "병렬 워커",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "waitingSessions",
                header: "대기 세션",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "workerTime",
                header: "병렬 워커 시간(ms)",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "contextSwitches",
                header: "Context Switch",
                cell: (info) => (info.getValue() as number).toLocaleString(),
            },
            {
                accessorKey: "totalCPU",
                header: "전체 CPU(%)",
                cell: (info) => {
                    const value = info.getValue() as number;
                    const color = getCPUColor(value);
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
            "시간", "전체 CPU(%)", "User CPU(%)", "System CPU(%)",
            "Idle CPU(%)", "I/O Wait(%)", "Steal CPU(%)",
            "Load Avg (1m)", "Load Avg (5m)", "Load Avg (15m)",
            "활성 세션", "병렬 워커", "대기 세션",
            "병렬 워커 시간(ms)", "Context Switch", "상태",
        ];
        const csvData = data.map((row) => [
            row.time,
            row.totalCPU,
            row.userCPU,
            row.systemCPU,
            row.idleCPU,
            row.ioWait,
            row.stealCPU,
            row.loadAvg1,
            row.loadAvg5,
            row.loadAvg15,
            row.activeSessions,
            row.parallelWorkers,
            row.waitingSessions,
            row.workerTime,
            row.contextSwitches,
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
        const fileName = `cpu_${now.getFullYear()}${String(
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
                <CsvButton onClick={handleExportCSV} tooltip="CSV 파일 저장"/>
            </section>

            {/* CPU 테이블 */}
            <section className="cpu-list-page__table">
                <div className="cpu-table-header">
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
                    <div className="cpu-table-empty">데이터를 불러오는 중...</div>
                ) : error ? (
                    <div className="cpu-table-empty">오류: {error}</div>
                ) : table.getRowModel().rows.length > 0 ? (
                    table.getRowModel().rows.map((row) => (
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