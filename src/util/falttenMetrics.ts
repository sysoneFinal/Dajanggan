export const flattenMetrics = (data: any[]): Record<string, any> => {
  const result: Record<string, any> = {};
  data.forEach((group) => {
    Object.keys(group).forEach((category) => {
      const metricsInCategory = group[category];
      Object.keys(metricsInCategory).forEach((metricKey) => {
        result[metricKey] = {
          ...metricsInCategory[metricKey],
          category,
        };
      });
    });
  });
  return result;
};
