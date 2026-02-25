import type { FastifyRequest, FastifyReply } from "fastify";
import * as v from "valibot";
import { passkeyDetailsSchema } from "../../../../commons/utils/constants.js";

export async function passkeysGetHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.headers.authorization) {
    reply.status(401);
    reply.send();
    return reply;
  }

  v.parse(
    v.object({
      publicSubjectId: v.string(),
    }),
    request.params,
    {
      abortEarly: false,
    },
  );

  reply.send({
    passkeys: [
      {
        credential: "fake-credential-1",
        id: "f5cf86e0-6eb5-4965-8c5e-2516b8f1c625",
        aaguid: "a0f53165-0e77-42d3-92cc-203d057562bb",
        isAttested: true,
        signCount: 1,
        transports: ["usb"],
        isBackUpEligible: false,
        isBackedUp: false,
        createdAt: "2026-01-25T19:04:16.341Z",
        lastUsedAt: "2026-02-08T09:33:10.341Z",
      },
      {
        credential: "fake-credential-2",
        id: "8518d6e1-a126-463f-b682-103b7f8b1852",
        aaguid: "00000000-0000-0000-0000-000000000000",
        isAttested: false,
        signCount: 0,
        transports: ["internal"],
        isBackUpEligible: true,
        isBackedUp: true,
        createdAt: "2026-01-19T19:04:16.341Z",
        lastUsedAt: "2026-02-25T20:06:19.341Z",
      },
    ],
  });
  return reply;
}

export async function passkeysPostHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.headers.authorization) {
    reply.status(401);
    reply.send();
    return reply;
  }

  v.parse(
    v.object({
      publicSubjectId: v.string(),
    }),
    request.params,
    {
      abortEarly: false,
    },
  );

  v.parse(passkeyDetailsSchema, request.body, {
    abortEarly: false,
  });

  reply.status(201);
  reply.send();
  return reply;
}
