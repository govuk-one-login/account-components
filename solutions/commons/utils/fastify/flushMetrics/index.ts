import { metrics } from "../../metrics/index.js";

export const flushMetrics = () => {
  metrics.captureColdStartMetric();
  metrics.publishStoredMetrics();
};
