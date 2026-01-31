/**
 * Xiaomi OAuth2 Client
 * Based on ha_xiaomi_home/miot/miot_cloud.py MIoTOauthClient
 */

import crypto from "node:crypto";
import type { OAuthToken } from "./types.js";
import {
  OAUTH2_CLIENT_ID,
  OAUTH2_AUTH_URL,
  CLOUD_SERVERS,
  MIHOME_HTTP_API_TIMEOUT,
  TOKEN_EXPIRES_TS_RATIO,
  type CloudServerId,
} from "./constants.js";

export class XiaomiOAuthError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "XiaomiOAuthError";
    this.code = code;
  }
}

export interface OAuthConfig {
  client_id?: string;
  redirect_url: string;
  cloud_server: CloudServerId;
  uuid: string; // Unique ID for this client
}

export class XiaomiOAuthClient {
  private client_id: number;
  private redirect_url: string;
  private oauth_host: string;
  private device_id: string;
  private state: string;

  constructor(config: OAuthConfig) {
    const { client_id = OAUTH2_CLIENT_ID, redirect_url, cloud_server, uuid } = config;

    if (!client_id || !redirect_url || !cloud_server || !uuid) {
      throw new XiaomiOAuthError("Invalid OAuth configuration");
    }

    this.client_id = parseInt(client_id, 10);
    this.redirect_url = redirect_url;
    this.device_id = `ha.${uuid}`;

    // Generate state from device_id
    this.state = crypto.createHash("sha1").update(`d=${this.device_id}`).digest("hex");

    // Set OAuth host based on cloud server
    const server = CLOUD_SERVERS[cloud_server];
    if (!server) {
      throw new XiaomiOAuthError(`Invalid cloud server: ${cloud_server}`);
    }
    this.oauth_host = server.oauth_host;
  }

  /**
   * Get the state value for CSRF protection
   */
  getState(): string {
    return this.state;
  }

  /**
   * Set redirect URL (if needed to update)
   */
  setRedirectUrl(redirect_url: string): void {
    if (!redirect_url || redirect_url.trim() === "") {
      throw new XiaomiOAuthError("Invalid redirect_url");
    }
    this.redirect_url = redirect_url;
  }

  /**
   * Generate authorization URL for user login
   */
  generateAuthUrl(options?: {
    redirect_url?: string;
    state?: string;
    scope?: string[];
    skip_confirm?: boolean;
  }): string {
    const params = new URLSearchParams({
      redirect_uri: options?.redirect_url || this.redirect_url,
      client_id: this.client_id.toString(),
      response_type: "code",
      device_id: this.device_id,
      state: options?.state || this.state,
    });

    if (options?.scope && options.scope.length > 0) {
      params.set("scope", options.scope.join(" "));
    }

    params.set("skip_confirm", (options?.skip_confirm !== false).toString());

    return `${OAUTH2_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Get access token by authorization code
   */
  async getAccessToken(code: string): Promise<OAuthToken> {
    if (!code || typeof code !== "string") {
      throw new XiaomiOAuthError("Invalid authorization code");
    }

    return await this._getTokenAsync({
      client_id: this.client_id,
      redirect_uri: this.redirect_url,
      code,
      device_id: this.device_id,
    });
  }

  /**
   * Refresh access token using refresh_token
   */
  async refreshAccessToken(refresh_token: string): Promise<OAuthToken> {
    if (!refresh_token || typeof refresh_token !== "string") {
      throw new XiaomiOAuthError("Invalid refresh_token");
    }

    return await this._getTokenAsync({
      client_id: this.client_id,
      redirect_uri: this.redirect_url,
      refresh_token,
    });
  }

  /**
   * Internal method to get token from Xiaomi OAuth server
   */
  private async _getTokenAsync(data: Record<string, any>): Promise<OAuthToken> {
    const url = `https://${this.oauth_host}/app/v2/ha/oauth/get_token`;
    const params = new URLSearchParams({
      data: JSON.stringify(data),
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), MIHOME_HTTP_API_TIMEOUT);

    try {
      const response = await fetch(`${url}?${params.toString()}`, {
        method: "GET",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
        },
        signal: controller.signal,
      });

      if (response.status === 401) {
        throw new XiaomiOAuthError("Unauthorized (401)", "OAUTH_UNAUTHORIZED");
      }

      if (!response.ok) {
        throw new XiaomiOAuthError(`HTTP error ${response.status}`);
      }

      const result = await response.json();

      if (
        !result ||
        result.code !== 0 ||
        !result.result ||
        !result.result.access_token ||
        !result.result.refresh_token ||
        !result.result.expires_in
      ) {
        throw new XiaomiOAuthError(`Invalid response: ${JSON.stringify(result)}`);
      }

      return {
        access_token: result.result.access_token,
        refresh_token: result.result.refresh_token,
        expires_in: result.result.expires_in,
        expires_ts: Math.floor(
          Date.now() / 1000 + result.result.expires_in * TOKEN_EXPIRES_TS_RATIO,
        ),
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
