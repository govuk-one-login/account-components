import type { FastifyReply, FastifyRequest } from "fastify";

export const onSend = async (request: FastifyRequest, reply: FastifyReply) => {
  // This is ensures the browser doesn't cache responses which is important
  // to prevent users being able to go back to pages they shouldn't
  // because they are no longer in that state of the journey
  reply.headers({ "cache-control": "no-store" });

  if (request.session.claims) {
    const journeyState = reply.journeyStates?.[request.session.claims.scope];

    if (journeyState) {
      request.session.journeyStateSnapshot = journeyState.getSnapshot();
      // It seems necessary to manually save the session changes when updating
      // the session in this context
      await request.session.save();
    }
  }
};
