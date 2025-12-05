import type { Mock } from "vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FastifyPowertoolsLogger } from "./index.js";

interface mockLogger {
  getLevelName: Mock;
  createChild: Mock;
  appendPersistentKeys: Mock;
  critical: Mock;
  error: Mock;
  warn: Mock;
  info: Mock;
  debug: Mock;
  trace: Mock;
}

// @ts-expect-error
vi.mock(import("../../logger/index.js"), () => ({
  logger: {
    getLevelName: vi.fn(),
    createChild: vi.fn(),
    appendPersistentKeys: vi.fn(),
    critical: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
  },
}));

const { logger: mockedLogger } = await vi.importMock<{
  logger: mockLogger;
}>("../../logger/index.js");

describe("fastifyPowertoolsLogger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("sets level to mapped pino level when powertools level is known", () => {
      mockedLogger.getLevelName.mockReturnValue("INFO");
      const logger = new FastifyPowertoolsLogger();

      expect(logger.level).toBe("info");
    });

    it("defaults to info level when powertools level is unknown", () => {
      mockedLogger.getLevelName.mockReturnValue("UNKNOWN");
      const logger = new FastifyPowertoolsLogger();

      expect(logger.level).toBe("info");
    });

    it("maps all powertools levels correctly", () => {
      const testCases = [
        ["DEBUG", "debug"],
        ["INFO", "info"],
        ["WARN", "warn"],
        ["ERROR", "error"],
        ["CRITICAL", "fatal"],
        ["TRACE", "trace"],
        ["SILENT", "silent"],
      ];

      testCases.forEach(([powertoolsLevel, expectedPinoLevel]) => {
        mockedLogger.getLevelName.mockReturnValue(powertoolsLevel);
        const logger = new FastifyPowertoolsLogger();

        expect(logger.level).toBe(expectedPinoLevel);
      });
    });
  });

  describe("child", () => {
    it("creates child logger with default level when no options provided", () => {
      const mockChildLogger = { ...mockedLogger };
      mockedLogger.createChild.mockReturnValue(mockChildLogger);
      mockedLogger.getLevelName.mockReturnValue("INFO");

      const logger = new FastifyPowertoolsLogger();
      const bindings = { requestId: "123" };
      const child = logger.child(bindings);

      expect(mockedLogger.createChild).toHaveBeenCalledWith({
        logLevel: "INFO",
      });
      expect(mockChildLogger.appendPersistentKeys).toHaveBeenCalledWith(
        bindings,
      );
      expect(child).toBeInstanceOf(FastifyPowertoolsLogger);
    });

    it("creates child logger with specified level", () => {
      const mockChildLogger = { ...mockedLogger };
      mockedLogger.createChild.mockReturnValue(mockChildLogger);
      mockedLogger.getLevelName.mockReturnValue("INFO");

      const logger = new FastifyPowertoolsLogger();
      const bindings = { requestId: "123" };
      logger.child(bindings, { level: "error" });

      expect(mockedLogger.createChild).toHaveBeenCalledWith({
        logLevel: "ERROR",
      });
      expect(mockChildLogger.appendPersistentKeys).toHaveBeenCalledWith(
        bindings,
      );
    });

    it("defaults to INFO when unknown pino level provided", () => {
      const mockChildLogger = { ...mockedLogger };
      mockedLogger.createChild.mockReturnValue(mockChildLogger);
      mockedLogger.getLevelName.mockReturnValue("INFO");

      const logger = new FastifyPowertoolsLogger();
      logger.child({}, { level: "unknown" });

      expect(mockedLogger.createChild).toHaveBeenCalledWith({
        logLevel: "INFO",
      });
    });
  });

  describe("logging methods", () => {
    let logger: FastifyPowertoolsLogger;

    beforeEach(() => {
      mockedLogger.getLevelName.mockReturnValue("INFO");
      logger = new FastifyPowertoolsLogger();
    });

    it("calls fatal method correctly", () => {
      const details = { error: "test" };
      const msg = "Fatal error";
      const args = ["arg1", "arg2"];

      logger.fatal(details, msg, ...args);

      expect(mockedLogger.critical).toHaveBeenCalledWith(msg, {
        extraArgs: args,
        details,
      });
    });

    it("calls error method correctly", () => {
      const details = { error: "test" };
      const msg = "Error occurred";
      const args = ["arg1"];

      logger.error(details, msg, ...args);

      expect(mockedLogger.error).toHaveBeenCalledWith(msg, {
        extraArgs: args,
        details,
      });
    });

    it("calls warn method correctly", () => {
      const details = { warning: "test" };
      const msg = "Warning message";

      logger.warn(details, msg);

      expect(mockedLogger.warn).toHaveBeenCalledWith(msg, {
        extraArgs: [],
        details,
      });
    });

    it("calls info method correctly", () => {
      const details = { info: "test" };
      const msg = "Info message";

      logger.info(details, msg);

      expect(mockedLogger.info).toHaveBeenCalledWith(msg, {
        extraArgs: [],
        details,
      });
    });

    it("calls debug method correctly", () => {
      const details = { debug: "test" };
      const msg = "Debug message";

      logger.debug(details, msg);

      expect(mockedLogger.debug).toHaveBeenCalledWith(msg, {
        extraArgs: [],
        details,
      });
    });

    it("calls trace method correctly", () => {
      const details = { trace: "test" };
      const msg = "Trace message";

      logger.trace(details, msg);

      expect(mockedLogger.trace).toHaveBeenCalledWith(msg, {
        extraArgs: [],
        details,
      });
    });

    it("handles empty message correctly", () => {
      const details = { test: "data" };

      logger.info(details);

      expect(mockedLogger.info).toHaveBeenCalledWith("", {
        extraArgs: [],
        details,
      });
    });

    it("silent method does nothing", () => {
      const details = { test: "data" };
      const msg = "Silent message";

      logger.silent(details, msg, "arg1", "arg2");

      expect(mockedLogger.critical).not.toHaveBeenCalled();
      expect(mockedLogger.error).not.toHaveBeenCalled();
      expect(mockedLogger.warn).not.toHaveBeenCalled();
      expect(mockedLogger.info).not.toHaveBeenCalled();
      expect(mockedLogger.debug).not.toHaveBeenCalled();
      expect(mockedLogger.trace).not.toHaveBeenCalled();
    });
  });
});
