export const registerPrivateApiRoutes = () =>
  !!Number(process.env["REGISTER_PRIVATE_API_ROUTES"]);
