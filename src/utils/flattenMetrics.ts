import rawMetrics from "../components/chart/Metrics.json";

/** Metrics.json을 평탄화 */
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

/** 기본 export: Metrics.json을 즉시 평탄화한 결과 */
export const metricDefinition = flattenMetrics(rawMetrics);

export default metricDefinition;
