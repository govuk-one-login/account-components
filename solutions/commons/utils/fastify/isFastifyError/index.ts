import type { FastifyError } from "fastify";

export const isFastifyError = (error: unknown): error is FastifyError =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  typeof error.code === "string" &&
  error.code.startsWith("FST_");
