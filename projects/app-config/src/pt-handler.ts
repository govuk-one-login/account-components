import { Logger } from "@aws-lambda-powertools/logger";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getAppConfig } from "@aws-lambda-powertools/parameters/appconfig";

const logger = new Logger({ serviceName: "test-function" });

// const configPath = process.env["AWS_APPCONFIG_EXTENSION_PREFETCH_LIST"];
const configPath =
  "/applications/account-management-components/environments/dev/configurations/operational";

export const handle = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  logger.info("Received event", { event, configPath });
  let response: APIGatewayProxyResult;
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call
    const config = await getAppConfig("operational", {
      application: "account-management-components",
      environment: "dev",
      transform: "json",
    });

    logger.info(JSON.stringify(config));

    // const config = await configResponse.json();

    // const configurationResponse: Configuration = {
    //     Pagination: {
    //
    //         Enabled: config.pagination.enabled,
    //         PageSize: config.pagination.pageSize,
    //     },
    //     WizardSwitch: {
    //         Enabled: config.wizardSwitch.enabled,
    //     },
    // };

    response = {
      statusCode: 200,
      body: JSON.stringify(config),
    };
  } catch (err) {
    logger.error("Failed to get config", { err });
    response = {
      statusCode: 500,
      body: JSON.stringify({
        message: JSON.stringify(err),
      }),
    };
  }

  return response;
};

interface Configuration {
  Pagination: PaginationFeature;
  WizardSwitch: Feature;
}
type PaginationFeature = Feature & {
  PageSize: number;
};
interface Feature {
  Enabled: boolean;
}
