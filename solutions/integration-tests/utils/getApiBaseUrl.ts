import { env } from "../env.js";
import { getParameter } from "@aws-lambda-powertools/parameters/ssm";

export const getApiBaseUrl = async () => {
  if (env.TEST_TARGET === "local") {
    return "http://localhost:6004";
  }

  try {
    const apiBaseUrl = await getParameter(
      "/tests/components-api/PrivateApiGatewayUrl",
      { maxAge: 300 },
    );
    if (!apiBaseUrl || apiBaseUrl.trim().length <= 0) {
      throw new Error("API base URL from SSM is empty");
    }
    return apiBaseUrl;
  } catch (error) {
    throw new Error(`Failed to get API base URL from SSM`, { cause: error });
  }
};
