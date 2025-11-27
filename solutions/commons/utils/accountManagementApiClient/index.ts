import assert from "node:assert";

export class AccountManagementApiClient {
  private readonly baseUrl: string;
  private readonly accessToken: string;

  constructor(accessToken: string) {
    assert(
      process.env["ACCOUNT_MANAGEMENT_API_URL"],
      "ACCOUNT_MANAGEMENT_API_URL is not set",
    );
    this.baseUrl = process.env["ACCOUNT_MANAGEMENT_API_URL"];
    this.accessToken = accessToken;
  }

  async sendOtpChallenge(emailAdress: string) {
    const response = await fetch(`${this.baseUrl}/send-otp-challenge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({
        email: emailAdress,
        mfaMethodType: "EMAIL",
      }),
    });

    return response;
  }

  async verifyOtpChallenge(emailAdress: string, otp: string) {
    const response = await fetch(`${this.baseUrl}/send-otp-challenge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({
        email: emailAdress,
        mfaMethodType: "EMAIL",
        otp,
      }),
    });

    return response;
  }
}
