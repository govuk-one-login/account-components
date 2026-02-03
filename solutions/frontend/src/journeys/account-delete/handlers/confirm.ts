import { type FastifyReply, type FastifyRequest } from "fastify";
import assert from "node:assert";
import { AccountManagementApiClient } from "../../../utils/accountManagementApiClient.js";
import { completeJourney } from "../../utils/completeJourney.js";

const render = async (reply: FastifyReply, options?: object) => {
  assert.ok(reply.render);
  await reply.render("journeys/account-delete/templates/confirm.njk", options);
};

export async function confirmGetHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  await render(reply);
  return reply;
}

export async function confirmPostHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  assert.ok(request.session.claims);
  assert.ok(request.session.claims.account_management_api_access_token);
  const accountManagementApiClient = new AccountManagementApiClient(
    request.session.claims.account_management_api_access_token,
    request.awsLambda?.event,
  );

  const result = await accountManagementApiClient.deleteAccount(
    request.session.claims.email,
  );

  if (!result.success) {
    throw new Error(result.error);
  }

  return await completeJourney(request, reply, {}, true);
}
