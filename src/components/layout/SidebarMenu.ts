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
            { label: "Details", path: "/instance/cpu/details" },
            { label: "CPU Usage", path: "/instance/cpu/usage" },
        ]},
      { label: "Memory", children: [
            { label: "Details", path: "/instance/memory/details" },
            { label: "Buffer Usage", path: "/instance/memory/buffer-usage" },
        ]}, 
      { label: "Disk I/O",  children: [
            { label: "Details", path: "/instance/disk/details" },
            { label: "I/O Breakdown", path: "/instance/disk/breakdown" },
        ]}, 
      { label: "Checkpoint",    children: [
            { label: "Details", path: "/instance/checkpoint/details" },
            { label: "Checkpoint History", path: "/instance/checkpoint/list" },
      ]},
      { label: "BG Writer", children:[
            { label: "Details", path: "/instance/bgwriter/details" },
            { label: "BGWriter Efficiency", path: "/instance/bgwriter/efficiency" }
      ]},
      { label: "Event", path: "/instance/event" }
    ],
    },
  {
    label: "Database",
    children: [
      { label: "Summary", path: "/database/summary" },

      { label: "Session", children:[
        { label: "Details", path: "/database/session/details" },
        { label: "Active Sessions", path: "/database/session/active" },
      ]},
      {
        label: "Hot Table",
        children: [
          { label: "Details", path: "/database/hottable/details" },
          { label: "Table Detail", path: "/database/hottable/detail" },
        ],
      }, 
      {
        label: "Hot Index",
        children: [
          { label: "Details", path: "/database/hotindex/details" },
          { label: "Index Detail", path: "/database/hotindex/detail" },
        ],
      },
      {
        label: "Vacuum",
        children: [
          { label: "Maintenance", path: "/database/vacuum/maintenance" },
          { label: "History", path: "/database/vacuum/history" },
          { label: "Risk", path: "/database/vacuum/risk" },
          { label: "Bloat", path: "/database/vacuum/bloat" },
        ],
      },
      {
        label: "Query",
        children: [
          { label: "Details", path: "/database/query/details" },
          { label: "Execution Stats", path: "/database/query/execution-stats" },
          { label: "Query Analysis", path: "/database/query/query-analysis" },
        ],
      },
    ],
  },
];
