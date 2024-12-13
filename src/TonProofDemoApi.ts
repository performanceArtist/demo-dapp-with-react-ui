import {
  Account,
  ConnectAdditionalRequest,
  SendTransactionRequest,
  TonProofItemReplySuccess,
} from "@tonconnect/ui-react";
import "./patch-local-storage-for-github-pages";
import { CreateJettonRequestDto } from "./server/dto/create-jetton-request-dto";
import axios from "axios";

const axiosInstance = axios.create({
  headers: {
    Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjIxMzIxNCIsImlhdCI6MTczNDA4NDY1MiwiZXhwIjoxNzM0MDg0NzcyfQ.bPxxTOalh3Ht9-MHY_Ol8Pm1N7aGbyuPA7CHBXmoiaA`,
  },
});

class TonProofDemoApiService {
  private localStorageKey = "demo-api-access-token";

  private host = `http://localhost:3000/api/v1/ton`;

  public accessToken: string | null = null;

  public readonly refreshIntervalMs = 9 * 60 * 1000;

  constructor() {
    this.accessToken = localStorage.getItem(this.localStorageKey);

    if (!this.accessToken) {
      this.generatePayload();
    }
  }

  async generatePayload(): Promise<ConnectAdditionalRequest | null> {
    try {
      const { data: response } = await axiosInstance.post(
        `${this.host}/payload`
      );
      return { tonProof: response.payload as string };
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  async checkProof(
    proof: TonProofItemReplySuccess["proof"],
    account: Account
  ): Promise<void> {
    try {
      const reqBody = {
        address: account.address,
        network: account.chain,
        public_key: account.publicKey,
        proof: {
          ...proof,
          state_init: account.walletStateInit,
        },
      };

      const { data: response } = await axiosInstance.post(
        `${this.host}/proof`,
        reqBody
      );

      if (response?.token) {
        localStorage.setItem(this.localStorageKey, response.token);
        this.accessToken = response.token;
      }

      const info = axiosInstance.get(`http://localhost:3000/api/v1/user/me`);
      console.log("info", info);
    } catch (e) {
      console.log("checkProof error:", e);
    }
  }

  async getAccountInfo() {
    const { data: response } = await axios.get(`${this.host}/info`, {
      headers: {
        "authorization-ton": this.accessToken,
      },
    });
    console.log("Account info", response);

    return response as {};
  }

  // alternative to checkProof, not implemented on backend - see checkProof instead
  async createJetton(
    jetton: CreateJettonRequestDto
  ): Promise<SendTransactionRequest> {
    return await (
      await fetch(`${this.host}/api/create_jetton`, {
        body: JSON.stringify(jetton),
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      })
    ).json();
  }

  reset() {
    this.accessToken = null;
    localStorage.removeItem(this.localStorageKey);
    this.generatePayload();
  }
}

export const TonProofDemoApi = new TonProofDemoApiService();
