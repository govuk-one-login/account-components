import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(import("@aws-sdk/client-kms"));
vi.mock(import("../getAwsClientConfig/index.js"));
vi.mock(import("../../getEnvironment/index.js"));
vi.mock(import("aws-xray-sdk"));

const mockKmsClient = {
  config: { region: "eu-west-2" },
  send: vi.fn(),
};

const mockCommands = {
  GetPublicKeyCommand: vi.fn(),
  DecryptCommand: vi.fn(),
  DescribeKeyCommand: vi.fn(),
};

describe("getKmsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.doMock("@aws-sdk/client-kms", () => ({
      KMSClient: vi.fn(() => mockKmsClient),
      GetPublicKeyCommand: mockCommands.GetPublicKeyCommand,
      DecryptCommand: mockCommands.DecryptCommand,
      DescribeKeyCommand: mockCommands.DescribeKeyCommand,
    }));
    vi.doMock("../getAwsClientConfig/index.js", () => ({
      getAwsClientConfig: vi.fn(() => ({ region: "eu-west-2" })),
    }));
    vi.doMock("../../getEnvironment/index.js", () => ({
      getEnvironment: vi.fn(() => "local"),
    }));
    vi.doMock("aws-xray-sdk", () => ({
      captureAWSv3Client: vi.fn(<T>(client: T): T => client),
    }));
  });

  it("returns cached client on subsequent calls", async () => {
    const { getKmsClient } = await import("./index.js");

    const client1 = getKmsClient();
    const client2 = getKmsClient();

    expect(client1).toBe(client2);
  });

  it("returns client with all methods", async () => {
    const { getKmsClient } = await import("./index.js");

    const client = getKmsClient();

    expect(client.client).toBeDefined();
    expect(client.config).toBeDefined();
    expect(client.getPublicKey).toBeTypeOf("function");
    expect(client.decrypt).toBeTypeOf("function");
    expect(client.describeKey).toBeTypeOf("function");
  });

  it("getPublicKey method calls client.send with GetPublicKeyCommand", async () => {
    const { getKmsClient } = await import("./index.js");

    const client = getKmsClient();
    const params = { KeyId: "test-key-id" };

    await client.getPublicKey(params);

    expect(mockCommands.GetPublicKeyCommand).toHaveBeenCalledWith(params);
    expect(mockKmsClient.send).toHaveBeenCalledWith(expect.any(Object));
  });

  it("decrypt method calls client.send with DecryptCommand", async () => {
    const { getKmsClient } = await import("./index.js");

    const client = getKmsClient();
    const params = { CiphertextBlob: new Uint8Array([1, 2, 3]) };

    await client.decrypt(params);

    expect(mockCommands.DecryptCommand).toHaveBeenCalledWith(params);
    expect(mockKmsClient.send).toHaveBeenCalledWith(expect.any(Object));
  });

  it("describeKey method calls client.send with DescribeKeyCommand", async () => {
    const { getKmsClient } = await import("./index.js");

    const client = getKmsClient();
    const params = { KeyId: "test-key-id" };

    await client.describeKey(params);

    expect(mockCommands.DescribeKeyCommand).toHaveBeenCalledWith(params);
    expect(mockKmsClient.send).toHaveBeenCalledWith(expect.any(Object));
  });
});
