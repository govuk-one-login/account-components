import { LogController } from "fastify";

export class FastifyLogController extends LogController {
  constructor() {
    super({
      disableRequestLogging: true,
    });
  }
}
