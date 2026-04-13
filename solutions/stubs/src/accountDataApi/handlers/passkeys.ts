import type { FastifyRequest, FastifyReply } from "fastify";
import { decodeJwt } from "jose";
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

  const passkeys = [
    {
      credential: "fake-credential-1",
      id: "f5cf86e0-6eb5-4965-8c5e-2516b8f1c625",
      aaguid: "a0f53165-0e77-42d3-92cc-203d057562bb",
      isAttested: true,
      isResidentKey: true,
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
      isResidentKey: true,
      signCount: 0,
      transports: ["internal"],
      isBackUpEligible: true,
      isBackedUp: true,
      createdAt: "2026-01-19T19:04:16.341Z",
      lastUsedAt: "2026-02-25T20:06:19.341Z",
    },
    {
      credential: "fake-credential-3",
      id: "7b83b06f-f5a7-495b-9f1c-5485c66b19ee",
      aaguid: "ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4",
      isAttested: false,
      isResidentKey: true,
      signCount: 0,
      transports: ["internal"],
      isBackUpEligible: true,
      isBackedUp: true,
      createdAt: "2025-12-19T12:32:19.341Z",
      lastUsedAt: "2025-12-25T08:14:00.341Z",
    },
    {
      credential: "fake-credential-4",
      id: "2250f2de-2add-4d2d-bb0c-4e67f2a7d4bf",
      aaguid: "00000000-0000-0000-0000-000000000000",
      isAttested: false,
      isResidentKey: true,
      signCount: 0,
      transports: ["internal"],
      isBackUpEligible: true,
      isBackedUp: true,
      createdAt: "2025-11-05T05:09:01.341Z",
      lastUsedAt: "2025-11-11T23:56:58.341Z",
    },
    {
      credential: "fake-credential-5",
      id: "57312c8f-5ab3-40eb-bc9a-d076edba7834",
      aaguid: "00000000-0000-0000-0000-000000000000",
      isAttested: false,
      isResidentKey: true,
      signCount: 0,
      transports: ["internal"],
      isBackUpEligible: true,
      isBackedUp: true,
      createdAt: "2025-12-19T07:19:11.341Z",
      lastUsedAt: "2025-12-20T21:24:05.341Z",
    },
  ];

  const token = request.headers.authorization.split(" ")[1];
  if (token) {
    try {
      const claims = decodeJwt(token);
      if (claims["getPasskeys_scenario"] === "max_number_of_passkeys") {
        reply.send({ passkeys });
        return await reply;
      }
    } catch {
      // token is not a valid JWT, continue with default response
    }
  }

  reply.send({ passkeys: passkeys.slice(0, 2) });
  return await reply;
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
