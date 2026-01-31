/**
 * Xiaomi Configuration Storage
 * Stores OAuth tokens, device info, and user settings
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import type { XiaomiConfig, OAuthToken, UserInfo, DeviceInfo, HomeInfo } from "./types.js";
import { OAUTH2_CLIENT_ID, type CloudServerId } from "./constants.js";

export class XiaomiStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "XiaomiStorageError";
  }
}

export interface StorageOptions {
  storage_path?: string; // Custom storage path
  config_file?: string; // Config file name (default: 'xiaomi_config.json')
}

const DEFAULT_STORAGE_DIR = path.join(os.homedir(), ".moltbot", "xiaomi");
const DEFAULT_CONFIG_FILE = "xiaomi_config.json";

export class XiaomiStorage {
  private storage_path: string;
  private config_file: string;
  private config_file_path: string;

  constructor(options?: StorageOptions) {
    this.storage_path = options?.storage_path || DEFAULT_STORAGE_DIR;
    this.config_file = options?.config_file || DEFAULT_CONFIG_FILE;
    this.config_file_path = path.join(this.storage_path, this.config_file);
  }

  /**
   * Ensure storage directory exists
   */
  private async ensureStorageDir(): Promise<void> {
    try {
      await fs.mkdir(this.storage_path, { recursive: true });
    } catch (error) {
      throw new XiaomiStorageError(
        `Failed to create storage directory: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Load configuration from file
   */
  async loadConfig(): Promise<XiaomiConfig | null> {
    try {
      const data = await fs.readFile(this.config_file_path, "utf-8");
      return JSON.parse(data) as XiaomiConfig;
    } catch (error: any) {
      if (error.code === "ENOENT") {
        // File doesn't exist yet
        return null;
      }
      throw new XiaomiStorageError(
        `Failed to load config: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Save configuration to file
   */
  async saveConfig(config: XiaomiConfig): Promise<void> {
    await this.ensureStorageDir();

    try {
      await fs.writeFile(this.config_file_path, JSON.stringify(config, null, 2), "utf-8");
    } catch (error) {
      throw new XiaomiStorageError(
        `Failed to save config: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Update OAuth token
   */
  async updateToken(token: OAuthToken): Promise<void> {
    const config = (await this.loadConfig()) || this.createEmptyConfig();
    config.token = token;
    await this.saveConfig(config);
  }

  /**
   * Get OAuth token
   */
  async getToken(): Promise<OAuthToken | null> {
    const config = await this.loadConfig();
    return config?.token || null;
  }

  /**
   * Check if token is expired
   */
  async isTokenExpired(): Promise<boolean> {
    const token = await this.getToken();
    if (!token) {
      return true;
    }

    const now = Math.floor(Date.now() / 1000);
    return now >= token.expires_ts;
  }

  /**
   * Update user info
   */
  async updateUserInfo(user_info: UserInfo): Promise<void> {
    const config = (await this.loadConfig()) || this.createEmptyConfig();
    config.user_info = user_info;
    await this.saveConfig(config);
  }

  /**
   * Get user info
   */
  async getUserInfo(): Promise<UserInfo | null> {
    const config = await this.loadConfig();
    return config?.user_info || null;
  }

  /**
   * Update devices
   */
  async updateDevices(devices: Record<string, DeviceInfo>): Promise<void> {
    const config = (await this.loadConfig()) || this.createEmptyConfig();
    config.devices = devices;
    await this.saveConfig(config);
  }

  /**
   * Get devices
   */
  async getDevices(): Promise<Record<string, DeviceInfo> | null> {
    const config = await this.loadConfig();
    return config?.devices || null;
  }

  /**
   * Update homes
   */
  async updateHomes(homes: Record<string, HomeInfo>): Promise<void> {
    const config = (await this.loadConfig()) || this.createEmptyConfig();
    config.homes = homes;
    await this.saveConfig(config);
  }

  /**
   * Get homes
   */
  async getHomes(): Promise<Record<string, HomeInfo> | null> {
    const config = await this.loadConfig();
    return config?.homes || null;
  }

  /**
   * Update cloud server
   */
  async updateCloudServer(cloud_server: CloudServerId): Promise<void> {
    const config = (await this.loadConfig()) || this.createEmptyConfig();
    config.cloud_server = cloud_server;
    await this.saveConfig(config);
  }

  /**
   * Get cloud server
   */
  async getCloudServer(): Promise<CloudServerId | null> {
    const config = await this.loadConfig();
    return (config?.cloud_server as CloudServerId) || null;
  }

  /**
   * Clear all configuration
   */
  async clear(): Promise<void> {
    try {
      await fs.unlink(this.config_file_path);
    } catch (error: any) {
      if (error.code !== "ENOENT") {
        throw new XiaomiStorageError(
          `Failed to clear config: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  /**
   * Check if configuration exists
   */
  async hasConfig(): Promise<boolean> {
    const config = await this.loadConfig();
    return config !== null && config.token !== undefined;
  }

  /**
   * Get storage path
   */
  getStoragePath(): string {
    return this.storage_path;
  }

  /**
   * Get config file path
   */
  getConfigFilePath(): string {
    return this.config_file_path;
  }

  /**
   * Create empty config
   */
  private createEmptyConfig(): XiaomiConfig {
    return {
      cloud_server: "cn",
      client_id: OAUTH2_CLIENT_ID,
      redirect_url: "http://localhost:8123",
    };
  }
}
