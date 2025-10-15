import { initStubs } from "./index.js";

const fastify = await initStubs();

fastify.listen({ port: 6003 }, (err) => {
  if (err) throw err;
  // eslint-disable-next-line no-console
  console.log("Server listening on port 6003");
});
