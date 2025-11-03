export const findBreadcrumbPath = (
  menu: MenuItem[],
  targetPath: string
): string[] | null => {
  for (const item of menu) {
    // ✅ 정확히 일치하는 경우만 리턴
    if (item.path === targetPath) {
      return [item.label];
    }

    // ✅ children이 있을 때만 탐색
    if (item.children) {
      // 🔒 prefix가 겹치더라도 실제로는 다른 루트면 탐색 스킵
      // 예: /instance-management 는 /instance/cpu 의 prefix 아님
      if (item.path && targetPath.startsWith(item.path + "/")) continue;

      const childPath = findBreadcrumbPath(item.children, targetPath);

      // ✅ 진짜 일치한 childPath만 상위에 누적
      if (childPath !== null && childPath.length > 0) {
        return [item.label, ...childPath];
      }
    }
  }

  // ✅ 사이드바에 없는 예외 (footer용)
  switch (targetPath) {
    case "/alarm":
      return ["Alarm Settings"];
    case "/instance-management":
      return ["Instance Management"];
    default:
      return null;
  }
};
