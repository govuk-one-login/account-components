import { initFrontend } from "./index.js";
import dotenv from "dotenv";
import { resolveEnvVarToBool } from "../../commons/utils/resolveEnvVarToBool/index.js";

dotenv.config({
  path: resolveEnvVarToBool("IS_INTEGRATION_TEST")
    ? ".env.integration-tests"
    : ".env",
});

const fastify = await initFrontend();

fastify.listen({ port: 6002 }, (err) => {
  if (err) throw err;
  // eslint-disable-next-line no-console
  console.log("Server listening on port 6002");
});
