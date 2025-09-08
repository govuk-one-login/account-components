import { Logger } from "@aws-lambda-powertools/logger";

const logger = new Logger({ serviceName: "test-function" });

export const handle = async (event: never) => {
  logger.info("Received event", event);
  await new Promise((resolve) => setTimeout(resolve, 1));
  return JSON.stringify({ message: "hello world" });
};
