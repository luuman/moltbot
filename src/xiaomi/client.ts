/**
 * Xiaomi MIoT Client
 * Main client for Xiaomi Home integration
 */

import crypto from "node:crypto";
import { XiaomiOAuthClient, XiaomiOAuthError } from "./oauth.js";
import { XiaomiHttpClient, XiaomiHttpError } from "./http-client.js";
import { XiaomiStorage, XiaomiStorageError } from "./storage.js";
import { XiaoAISpeaker, createXiaoAISpeaker, findXiaoAISpeakers } from "./xiaoai.js";
import type { OAuthToken, UserInfo, DeviceInfo, HomeInfo } from "./types.js";
import { OAUTH2_CLIENT_ID, type CloudServerId } from "./constants.js";

export { XiaomiOAuthError, XiaomiHttpError, XiaomiStorageError };

export interface XiaomiClientConfig {
  cloud_server?: CloudServerId;
  client_id?: string;
  redirect_url?: string;
  storage_path?: string;
}

export class XiaomiClient {
  private storage: XiaomiStorage;
  private oauthClient?: XiaomiOAuthClient;
  private httpClient?: XiaomiHttpClient;
  private config: Required<XiaomiClientConfig>;
  private uuid: string;

  // Cached data
  private devices?: Record<string, DeviceInfo>;
  private homes?: Record<string, HomeInfo>;
  private userInfo?: UserInfo;

  constructor(config?: XiaomiClientConfig) {
    this.config = {
      cloud_server: config?.cloud_server || "cn",
      client_id: config?.client_id || OAUTH2_CLIENT_ID,
      // Use Home Assistant's redirect URL to mimic HA
      redirect_url: config?.redirect_url || "http://homeassistant.local:8123",
      storage_path: config?.storage_path || "",
    };

    this.storage = new XiaomiStorage({
      storage_path: this.config.storage_path || undefined,
    });

    // Generate UUID for this client
    this.uuid = crypto.randomBytes(16).toString("hex");
  }

  /**
   * Initialize client (load saved config if exists)
   */
  async init(): Promise<boolean> {
    const savedConfig = await this.storage.loadConfig();

    if (savedConfig) {
      // Use saved config
      if (savedConfig.cloud_server) {
        this.config.cloud_server = savedConfig.cloud_server as CloudServerId;
      }
      if (savedConfig.client_id) {
        this.config.client_id = savedConfig.client_id;
      }
      if (savedConfig.redirect_url) {
        this.config.redirect_url = savedConfig.redirect_url;
      }

      // Load cached data
      this.devices = savedConfig.devices;
      this.homes = savedConfig.homes;
      this.userInfo = savedConfig.user_info;

      // Initialize OAuth and HTTP clients if token exists
      if (savedConfig.token) {
        await this.initializeClients(savedConfig.token);
        return true;
      }
    }

    return false;
  }

  /**
   * Initialize OAuth and HTTP clients with token
   */
  private async initializeClients(token: OAuthToken): Promise<void> {
    // Create OAuth client
    this.oauthClient = new XiaomiOAuthClient({
      client_id: this.config.client_id,
      redirect_url: this.config.redirect_url,
      cloud_server: this.config.cloud_server,
      uuid: this.uuid,
    });

    // Create HTTP client
    this.httpClient = new XiaomiHttpClient({
      cloud_server: this.config.cloud_server,
      client_id: this.config.client_id,
      access_token: token.access_token,
    });

    // Check if token needs refresh
    const now = Math.floor(Date.now() / 1000);
    if (now >= token.expires_ts) {
      await this.refreshToken();
    }
  }

  /**
   * Generate OAuth authorization URL
   */
  getAuthUrl(): string {
    if (!this.oauthClient) {
      this.oauthClient = new XiaomiOAuthClient({
        client_id: this.config.client_id,
        redirect_url: this.config.redirect_url,
        cloud_server: this.config.cloud_server,
        uuid: this.uuid,
      });
    }

    return this.oauthClient.generateAuthUrl();
  }

  /**
   * Login with authorization code
   */
  async loginWithCode(code: string): Promise<UserInfo> {
    if (!this.oauthClient) {
      this.oauthClient = new XiaomiOAuthClient({
        client_id: this.config.client_id,
        redirect_url: this.config.redirect_url,
        cloud_server: this.config.cloud_server,
        uuid: this.uuid,
      });
    }

    // Get access token
    const token = await this.oauthClient.getAccessToken(code);
    await this.storage.updateToken(token);

    // Initialize HTTP client
    await this.initializeClients(token);

    // Get user info
    if (!this.httpClient) {
      throw new XiaomiHttpError("HTTP client not initialized");
    }

    this.userInfo = await this.httpClient.getUserInfo();
    await this.storage.updateUserInfo(this.userInfo);

    return this.userInfo;
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<void> {
    const token = await this.storage.getToken();
    if (!token) {
      throw new XiaomiOAuthError("No token found");
    }

    if (!this.oauthClient) {
      this.oauthClient = new XiaomiOAuthClient({
        client_id: this.config.client_id,
        redirect_url: this.config.redirect_url,
        cloud_server: this.config.cloud_server,
        uuid: this.uuid,
      });
    }

    const newToken = await this.oauthClient.refreshAccessToken(token.refresh_token);
    await this.storage.updateToken(newToken);

    // Update HTTP client with new token
    if (this.httpClient) {
      this.httpClient.updateCredentials(newToken.access_token);
    }
  }

  /**
   * Load devices from cloud
   */
  async loadDevices(force: boolean = false): Promise<Record<string, DeviceInfo>> {
    if (!this.httpClient) {
      throw new XiaomiHttpError("Not logged in");
    }

    if (this.devices && !force) {
      return this.devices;
    }

    // Get homes first
    const homeInfos = await this.httpClient.getHomeInfos();
    this.homes = homeInfos.home_list;
    await this.storage.updateHomes(this.homes);

    // Get all home IDs
    const homeIds = Object.keys(this.homes);

    if (homeIds.length === 0) {
      this.devices = {};
      return this.devices;
    }

    // Load devices for all homes
    this.devices = await this.httpClient.getDeviceList(homeIds);
    await this.storage.updateDevices(this.devices);

    return this.devices;
  }

  /**
   * Get all devices
   */
  getDevices(): Record<string, DeviceInfo> | undefined {
    return this.devices;
  }

  /**
   * Get device by ID
   */
  getDevice(did: string): DeviceInfo | undefined {
    return this.devices?.[did];
  }

  /**
   * Get all XiaoAI speakers
   */
  getXiaoAISpeakers(): DeviceInfo[] {
    if (!this.devices) {
      return [];
    }
    return findXiaoAISpeakers(this.devices);
  }

  /**
   * Create XiaoAI speaker controller
   */
  createXiaoAISpeaker(deviceId: string): XiaoAISpeaker {
    if (!this.httpClient) {
      throw new XiaomiHttpError("Not logged in");
    }

    const device = this.devices?.[deviceId];
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    return createXiaoAISpeaker(this.httpClient, device);
  }

  /**
   * Get user info
   */
  getUserInfo(): UserInfo | undefined {
    return this.userInfo;
  }

  /**
   * Get homes
   */
  getHomes(): Record<string, HomeInfo> | undefined {
    return this.homes;
  }

  /**
   * Check if logged in
   */
  async isLoggedIn(): Promise<boolean> {
    return await this.storage.hasConfig();
  }

  /**
   * Logout (clear all data)
   */
  async logout(): Promise<void> {
    await this.storage.clear();
    this.oauthClient = undefined;
    this.httpClient = undefined;
    this.devices = undefined;
    this.homes = undefined;
    this.userInfo = undefined;
  }

  /**
   * Get storage instance
   */
  getStorage(): XiaomiStorage {
    return this.storage;
  }
}
