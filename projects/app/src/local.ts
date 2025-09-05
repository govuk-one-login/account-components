import initApp from "./app.js";
import "dotenv/config";

const app = await initApp();

app.listen({ port: 3000 }, (err) => {
  if (err) throw err;
  // eslint-disable-next-line no-console
  console.log("Server listening on port 3000");
});
