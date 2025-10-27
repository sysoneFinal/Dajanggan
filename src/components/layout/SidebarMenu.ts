// sidebarMenu.ts
export const SIDEBAR_MENU = [
  {
    label: "Overview",
    path: "/overview",
  },
  {
    label: "Instance",
    children: [
      { label: "CPU", 
        children: [
            { label: "Dashboard", path: "/instance/cpu/dashboard" },
            { label: "CPU Usage", path: "/instance/cpu/usage" },
        ]},
      { label: "Memory", children: [
            { label: "Dashboard", path: "/instance/memory/dashboard" },
            { label: "Buffer Usage", path: "/instance/memory/buffer-usage" },
        ]}, 
      { label: "Disk I/O",  children: [
            { label: "Dashboard", path: "/instance/io/dashboard" },
            { label: "I/O Breakdown", path: "/instance/io/breakdown" },
        ]}, 
      { label: "Checkpoint",    children: [
            { label: "Dashboard", path: "/instance/checkpoint/dashboard" },
            { label: "Checkpoint History", path: "/instance/checkpoint/history" },` `    
      ]},
      { label: "BG Writer", children:[
            { label: "Dashboard", path: "/instance/bg-writer/dashboard" },
            { label: "BGWriter Efficiency", path: "/instance/bg-writer/efficiency" }
      ]},
      { label: "Event", path: "/instance/event" }
    ],
    },
  {
    label: "Database",
    children: [
      { label: "Summary", path: "/database/summary" },

      { label: "Session", children:[
        { label: "Dashboard", path: "/database/session/dashboard" },
        { label: "Active Sessions", path: "/database/session/active" },
      ]},
      {
        label: "Hot Table",
        children: [
          { label: "Dashboard", path: "/database/hot-table/dashboard" },
          { label: "Table Detail", path: "/database/hot-table/detail" },
        ],
      }, 
      {
        label: "Hot Index",
        children: [
          { label: "Dashboard", path: "/database/hot-index/dashboard" },
          { label: "Index Detail", path: "/database/hot-index/detail" },
        ],
      },
      {
        label: "Vacuum",
        children: [
          { label: "Overview", path: "/database/vacuum/oerview" },
          { label: "Maintenance", path: "/database/vacuum/maintenance" },
          { label: "History", path: "/database/vacuum/history" },
          { label: "Risk", path: "/database/vacuum/risk" },
          { label: "Bloat", path: "/database/vacuum/bloat" },
        ],
      },
      {
        label: "Query",
        children: [
          { label: "Dashboard", path: "/database/query/dashboard" },
          { label: "Execution Stats", path: "/database/query/execution-stats" },
          { label: "Top-N Query", path: "/database/query/top-n-query" },
          { label: "Query Analysis", path: "/database/query/query-analysis" },
        ],
      },
    ],
  },
]as const;
