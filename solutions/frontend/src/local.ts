import { initFrontend } from "./index.js";

const fastify = await initFrontend();

fastify.listen({ port: 6002 }, (err) => {
  if (err) throw err;
  // eslint-disable-next-line no-console
  console.log("Server listening on port 6002");
});
