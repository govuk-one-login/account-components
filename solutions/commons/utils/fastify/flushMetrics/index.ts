import { metrics } from "../../metrics/index.js";

export const flushMetrics = async () => {
  metrics.publishStoredMetrics();
};
