import { metrics } from "../../observability/index.js";

export const flushMetrics = async () => {
  metrics.captureColdStartMetric();
  metrics.publishStoredMetrics();
};
