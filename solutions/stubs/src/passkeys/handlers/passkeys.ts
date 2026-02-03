import type { FastifyRequest, FastifyReply } from "fastify";
import * as v from "valibot";

interface PassKeyT {
  id: string;
  type: "passkey";
  createdAt: string;
  lastUsedAt?: string;
  aaguid: string;
  attestationSignature: string;
  credential: "public-key";
}

const passkeyData: Record<string, PassKeyT[]> = {
  user1: [
    {
      id: "passkey1",
      type: "passkey",
      createdAt: "2023-10-01T12:00:00Z",
      aaguid: "123e4567-e89b-12d3-a456-426614174000",
      attestationSignature: "attest",
      credential: "public-key",
    },
    {
      id: "passkey2",
      type: "passkey",
      createdAt: "2023-11-15T08:30:00Z",
      aaguid: "123e4567-e89b-12d3-a456-426614174001",
      attestationSignature: "attest2",
      credential: "public-key",
    },
  ],
};

export async function passkeysGetHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const parsedRequestParams = v.parse(
    v.object({
      accountId: v.string(),
    }),
    request.params,
    {
      abortEarly: false,
    },
  );

  if (!passkeyData[parsedRequestParams.accountId]) {
    reply.status(404);
    reply.send({
      message: "User not found",
    });
    return reply;
  }

  reply.send({
    passkeys: (passkeyData[parsedRequestParams.accountId] ?? []).map((p) => {
      return {
        type: p.type,
        createdAt: p.createdAt,
      };
    }),
  });
  return reply;
}

export async function passkeysPostHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { accountId } = v.parse(
    v.object({
      accountId: v.string(),
    }),
    request.params,
    {
      abortEarly: false,
    },
  );

  const parsedRequestBody = v.safeParse(
    v.object({
      credential: v.literal("public-key"),
      id: v.string(),
      aaguid: v.pipe(v.string(), v.uuid()),
      attestationSignature: v.string(),
    }),
    request.body,
    {
      abortEarly: false,
    },
  );

  if (!passkeyData[accountId]) {
    reply.status(404);
    reply.send({
      message: "User not found",
    });
    return reply;
  }

  if (!parsedRequestBody.success) {
    reply.status(400);
    reply.send({
      message: parsedRequestBody.issues
        .map((issue) => issue.message)
        .join(", "),
    });
    return reply;
  }

  if (
    passkeyData[accountId].some((p) => p.id === parsedRequestBody.output.id)
  ) {
    reply.status(409);
    reply.send({
      message: "Passkey already exists",
    });
    return reply;
  }

  reply.status(201);
  reply.send({
    message: "Passkey created successfully",
  });
  return reply;
}

const deleteAndPatchHandler = async (
  request: FastifyRequest,
  reply: FastifyReply,
  fn: () => Promise<FastifyReply>,
) => {
  const { accountId, passkeyId } = v.parse(
    v.object({
      accountId: v.string(),
      passkeyId: v.string(),
    }),
    request.params,
    {
      abortEarly: false,
    },
  );

  if (!passkeyData[accountId]) {
    reply.status(404);
    reply.send({
      message: "User not found",
    });
    return reply;
  }

  const passkeyIndex = passkeyData[accountId].findIndex(
    (p) => p.id === passkeyId,
  );
  if (passkeyIndex === -1) {
    reply.status(404);
    reply.send({
      message: "Passkey not found",
    });
    return reply;
  }

  return await fn();
};

export async function passkeysDeleteHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  return await deleteAndPatchHandler(request, reply, async () => {
    reply.status(204);
    reply.send({ message: "Passkey deleted successfully" });
    return reply;
  });
}

export async function passkeysPatchHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  return await deleteAndPatchHandler(request, reply, async () => {
    const parsedRequestBody = v.safeParse(
      v.object({
        lastUsedAt: v.string(),
      }),
      request.body,
      {
        abortEarly: false,
      },
    );

    if (!parsedRequestBody.success) {
      reply.status(400);
      reply.send({
        message: parsedRequestBody.issues
          .map((issue) => issue.message)
          .join(", "),
      });
      return reply;
    }

    reply.status(200);
    reply.send({
      message: "Passkey updated successfully",
    });
    return reply;
  });
}
