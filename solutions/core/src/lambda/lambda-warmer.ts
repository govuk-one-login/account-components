import * as v from "valibot";
import { logger } from "../../../commons/utils/logger/index.js";

const requestsConfigSchema = v.array(
  v.object({
    method: v.string(),
    headers: v.record(v.string(), v.string()),
    url: v.pipe(v.string(), v.url()),
    requestCount: v.pipe(v.number(), v.integer(), v.minValue(1)),
  }),
);

export const handler = async (): Promise<void> => {
  const requestsConfig = v.parse(
    v.pipe(v.string(), v.parseJson(), requestsConfigSchema),
    process.env["REQUESTS_CONFIG"],
  );

  logger.info("sending_warmup_requests", { requestsConfig });

  const results = await Promise.allSettled(
    requestsConfig.flatMap(({ method, headers, url, requestCount }) =>
      Array.from({ length: requestCount }, () =>
        fetch(url, { method, headers }),
      ),
    ),
  );

  let offset = 0;
  const summary = requestsConfig.map(({ requestCount, ...rest }) => {
    const slice = results.slice(offset, offset + requestCount);
    offset += requestCount;
    return {
      ...rest,
      statusCodes: slice
        .filter((r) => r.status === "fulfilled")
        .reduce<Record<number, number>>((acc, r) => {
          const code = r.value.status;
          acc[code] = (acc[code] ?? 0) + 1;
          return acc;
        }, {}),
      rejected: slice.filter((r) => r.status === "rejected").length,
    };
  });

  logger.info("warmup_requests_complete", { summary });
};
