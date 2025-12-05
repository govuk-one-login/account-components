import { flushMetrics } from "../../commons/utils/fastify/flushMetrics/index.js";
import { initFrontend } from "./index.js";

const fastify = await initFrontend();

fastify.addHook("onResponse", () => flushMetrics());

fastify.listen({ port: 6002, host: "0.0.0.0" }, (err) => {
  if (err) throw err;
  // eslint-disable-next-line no-console
  console.log("Server listening on port 6002");
});
