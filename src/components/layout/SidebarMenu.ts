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
            { label: "Dashboard", path: "/instance/disk/dashboard" },
            { label: "I/O Breakdown", path: "/instance/disk/breakdown" },
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
          { label: "Dashboard", path: "/database/hottable/dashboard" },
          { label: "Table Detail", path: "/database/hottable/detail" },
        ],
      }, 
      {
        label: "Hot Index",
        children: [
          { label: "Dashboard", path: "/database/hotindex/dashboard" },
          { label: "Index Detail", path: "/database/hotindex/detail" },
        ],
      },
      {
        label: "Vacuum",
        children: [
          { label: "Dashboard", path: "/database/vacuum/dashboard" },
          { label: "Detail", path: "/database/vacuum/detail" },
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
];
