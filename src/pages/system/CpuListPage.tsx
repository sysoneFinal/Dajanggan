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

const mockData: CPUData[] = [
    {
        id: "1",
        time: "14:00",
        totalCPU: 85,
        userCPU: 75,
        systemCPU: 13,
        idleCPU: 10,
        ioWait: 8,
        stealCPU: 2,
        loadAvg1: 8.45,
        loadAvg5: 7.82,
        loadAvg15: 6.91,
        activeSessions: 45,
        parallelWorkers: 12,
        waitingSessions: 8,
        workerTime: 125.3,
        contextSwitches: 15420,
        status: "위험",
    },
    {
        id: "2",
        time: "13:50",
        totalCPU: 65,
        userCPU: 58,
        systemCPU: 7,
        idleCPU: 28,
        ioWait: 12,
        stealCPU: 0,
        loadAvg1: 5.23,
        loadAvg5: 5.67,
        loadAvg15: 5.42,
        activeSessions: 38,
        parallelWorkers: 8,
        waitingSessions: 15,
        workerTime: 98.7,
        contextSwitches: 12340,
        status: "정상",
    },
    {
        id: "3",
        time: "13:40",
        totalCPU: 45,
        userCPU: 38,
        systemCPU: 7,
        idleCPU: 50,
        ioWait: 5,
        stealCPU: 0,
        loadAvg1: 3.12,
        loadAvg5: 3.45,
        loadAvg15: 3.78,
        activeSessions: 28,
        parallelWorkers: 5,
        waitingSessions: 5,
        workerTime: 67.2,
        contextSwitches: 9840,
        status: "정상",
    },
    {
        id: "4",
        time: "13:30",
        totalCPU: 78,
        userCPU: 68,
        systemCPU: 10,
        idleCPU: 12,
        ioWait: 15,
        stealCPU: 0,
        loadAvg1: 6.89,
        loadAvg5: 6.45,
        loadAvg15: 6.12,
        activeSessions: 52,
        parallelWorkers: 15,
        waitingSessions: 12,
        workerTime: 134.9,
        contextSwitches: 14560,
        status: "정상",
    },
    {
        id: "5",
        time: "13:20",
        totalCPU: 42,
        userCPU: 35,
        systemCPU: 7,
        idleCPU: 52,
        ioWait: 6,
        stealCPU: 0,
        loadAvg1: 2.87,
        loadAvg5: 3.12,
        loadAvg15: 3.34,
        activeSessions: 25,
        parallelWorkers: 4,
        waitingSessions: 3,
        workerTime: 54.6,
        contextSwitches: 8920,
        status: "정상",
    },
    {
        id: "6",
        time: "13:10",
        totalCPU: 92,
        userCPU: 81,
        systemCPU: 9,
        idleCPU: 6,
        ioWait: 22,
        stealCPU: 2,
        loadAvg1: 10.24,
        loadAvg5: 9.67,
        loadAvg15: 8.91,
        activeSessions: 68,
        parallelWorkers: 20,
        waitingSessions: 19,
        workerTime: 191.6,
        contextSwitches: 18750,
        status: "위험",
    },
];

export default function CPUListPage() {
    const [data] = useState<CPUData[]>(mockData);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    // 프로그레스 바 색상 결정 함수
    const getCPUColor = (cpu: number) => {
        if (cpu >= 80) return "#FF928A"; // 빨강 (위험)
        if (cpu >= 60) return "#FFD66B"; // 주황 (주의)
        return "#7B61FF"; // 녹색 (정상)
    };

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
                    onChange={(values) => console.log("선택된 시간:", values)}
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

                {table.getRowModel().rows.length > 0 ? (
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