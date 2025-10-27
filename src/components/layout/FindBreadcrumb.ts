interface MenuItem {
  label: string;
  path?: string;
  children?: MenuItem[];
}

export const findBreadcrumbPath = (
  menu: MenuItem[],
  targetPath: string
): string[] | null => {
  for (const item of menu) {
    if (item.path === targetPath) return [item.label];
    if (item.children) {
      const childPath = findBreadcrumbPath(item.children, targetPath);
      if (childPath) return [item.label, ...childPath];
    }
  }
  return null;
};
