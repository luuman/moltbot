/**
 * Xiaomi MIoT HTTP Client
 * Based on ha_xiaomi_home/miot/miot_cloud.py MIoTHttpClient
 */

import type {
  UserInfo,
  DeviceInfo,
  HomeInfo,
  MIoTProperty,
  MIoTAction,
  MIoTActionResult,
  MIoTResponse,
  MIoTSuccessResponse,
} from "./types.js";
import { CLOUD_SERVERS, MIHOME_HTTP_API_TIMEOUT, type CloudServerId } from "./constants.js";

export class XiaomiHttpError extends Error {
  code?: string;
  statusCode?: number;

  constructor(message: string, code?: string, statusCode?: number) {
    super(message);
    this.name = "XiaomiHttpError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export interface HttpClientConfig {
  cloud_server: CloudServerId;
  client_id: string;
  access_token: string;
}

export class XiaomiHttpClient {
  private host: string;
  private base_url: string;
  private client_id: string;
  private access_token: string;

  constructor(config: HttpClientConfig) {
    const { cloud_server, client_id, access_token } = config;

    if (!cloud_server || !client_id || !access_token) {
      throw new XiaomiHttpError("Invalid HTTP client configuration");
    }

    const server = CLOUD_SERVERS[cloud_server];
    if (!server) {
      throw new XiaomiHttpError(`Invalid cloud server: ${cloud_server}`);
    }

    this.host = server.api_host;
    this.base_url = `https://${this.host}`;
    this.client_id = client_id;
    this.access_token = access_token;
  }

  /**
   * Update HTTP headers (e.g., after token refresh)
   */
  updateCredentials(access_token: string): void {
    this.access_token = access_token;
  }

  /**
   * Get HTTP request headers
   */
  private getRequestHeaders(): Record<string, string> {
    return {
      Host: this.host,
      "X-Client-BizId": "haapi",
      "Content-Type": "application/json",
      Authorization: `Bearer${this.access_token}`, // Note: No space after "Bearer"
      "X-Client-AppId": this.client_id,
    };
  }

  /**
   * Make HTTP GET request to Xiaomi API
   */
  private async apiGet<T = any>(
    url_path: string,
    params: Record<string, any>,
    timeout: number = MIHOME_HTTP_API_TIMEOUT,
  ): Promise<T> {
    const url = new URL(url_path, this.base_url);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: this.getRequestHeaders(),
        signal: controller.signal,
      });

      if (response.status === 401) {
        throw new XiaomiHttpError("Unauthorized (401)", "HTTP_INVALID_ACCESS_TOKEN", 401);
      }

      if (!response.ok) {
        throw new XiaomiHttpError(`HTTP error ${response.status}`, undefined, response.status);
      }

      const result: MIoTResponse<T> = await response.json();

      if (result.code !== 0) {
        throw new XiaomiHttpError(
          `API error: ${result.code} - ${(result as any).message || "Unknown error"}`,
          `API_ERROR_${result.code}`,
        );
      }

      return (result as MIoTSuccessResponse<T>).result;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Make HTTP POST request to Xiaomi API
   */
  private async apiPost<T = any>(
    url_path: string,
    data: Record<string, any>,
    timeout: number = MIHOME_HTTP_API_TIMEOUT,
  ): Promise<T> {
    const url = new URL(url_path, this.base_url);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url.toString(), {
        method: "POST",
        headers: this.getRequestHeaders(),
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      if (response.status === 401) {
        throw new XiaomiHttpError("Unauthorized (401)", "HTTP_INVALID_ACCESS_TOKEN", 401);
      }

      if (!response.ok) {
        throw new XiaomiHttpError(`HTTP error ${response.status}`, undefined, response.status);
      }

      const result: MIoTResponse<T> = await response.json();

      if (result.code !== 0) {
        throw new XiaomiHttpError(
          `API error: ${result.code} - ${(result as any).message || "Unknown error"}`,
          `API_ERROR_${result.code}`,
        );
      }

      return (result as MIoTSuccessResponse<T>).result;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Get user information
   */
  async getUserInfo(): Promise<UserInfo> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), MIHOME_HTTP_API_TIMEOUT);

    try {
      const response = await fetch(
        `https://open.account.xiaomi.com/user/profile?${new URLSearchParams({
          clientId: this.client_id,
          token: this.access_token,
        })}`,
        {
          method: "GET",
          headers: {
            "content-type": "application/x-www-form-urlencoded",
          },
          signal: controller.signal,
        },
      );

      const result = await response.json();

      if (!result || result.code !== 0 || !result.data || !result.data.miliaoNick) {
        throw new XiaomiHttpError(`Invalid user info response: ${JSON.stringify(result)}`);
      }

      return {
        userId: result.data.userId,
        miliaoNick: result.data.miliaoNick,
        miliaoIcon: result.data.miliaoIcon,
        miliaoIconUrl: result.data.miliaoIconUrl,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Get home information including device list
   */
  async getHomeInfos(): Promise<{
    uid: string;
    home_list: Record<string, HomeInfo>;
    share_home_list: Record<string, HomeInfo>;
  }> {
    const result = await this.apiPost("/app/v2/homeroom/gethome", {
      limit: 150,
      fetch_share: true,
      fetch_share_dev: true,
      plat_form: 0,
      app_ver: 9,
    });

    let uid: string | null = null;
    const home_infos: {
      homelist: Record<string, HomeInfo>;
      share_home_list: Record<string, HomeInfo>;
    } = {
      homelist: {},
      share_home_list: {},
    };

    for (const device_source of ["homelist", "share_home_list"] as const) {
      for (const home of result[device_source] || []) {
        if (!home.id || !home.name || !home.roomlist) {
          continue;
        }

        if (uid === null && device_source === "homelist") {
          uid = String(home.uid);
        }

        const room_info: Record<string, any> = {};
        for (const room of home.roomlist || []) {
          if (room.id) {
            room_info[room.id] = {
              room_id: room.id,
              room_name: room.name,
              dids: room.dids || [],
            };
          }
        }

        home_infos[device_source][home.id] = {
          home_id: home.id,
          home_name: home.name,
          uid: String(home.uid),
          dids: home.dids || [],
          room_info,
        };
      }
    }

    return {
      uid: uid || "",
      home_list: home_infos.homelist,
      share_home_list: home_infos.share_home_list,
    };
  }

  /**
   * Get device list for specific device IDs
   */
  async getDeviceList(dids: string[]): Promise<Record<string, DeviceInfo>> {
    // Use device_list_page endpoint (matches HA implementation)
    const result = await this.apiPost("/app/v2/home/device_list_page", {
      dids: dids, // Pass as array, not comma-separated string
      limit: 200,
      get_split_device: true,
      get_third_device: true,
    });

    const devices: Record<string, DeviceInfo> = {};
    for (const device of result.list || []) {
      // Skip miwifi.* router devices (not supported)
      if (device.did && device.did.startsWith("miwifi.")) {
        continue;
      }

      if (device.did && device.name && device.model && device.spec_type) {
        devices[device.did] = {
          did: device.did,
          model: device.model,
          name: device.name,
          type: device.spec_type || "unknown",
          parent_id: device.parent_id,
          parent_model: device.parent_model,
          online: device.isOnline !== false,
          spec_type: device.spec_type,
        };
      }
    }

    return devices;
  }

  /**
   * Get device properties
   */
  async getProperties(params: MIoTProperty[]): Promise<MIoTProperty[]> {
    const result = await this.apiPost("/app/v2/miotspec/prop/get", {
      params: params.map((p) => ({
        did: p.did,
        siid: p.siid,
        piid: p.piid,
      })),
    });

    return result || [];
  }

  /**
   * Set device properties
   */
  async setProperties(params: MIoTProperty[]): Promise<MIoTProperty[]> {
    const result = await this.apiPost("/app/v2/miotspec/prop/set", {
      params: params.map((p) => ({
        did: p.did,
        siid: p.siid,
        piid: p.piid,
        value: p.value,
      })),
    });

    return result || [];
  }

  /**
   * Execute device action
   */
  async executeAction(action: MIoTAction): Promise<MIoTActionResult> {
    const result = await this.apiPost(
      "/app/v2/miotspec/action",
      {
        params: {
          did: action.did,
          siid: action.siid,
          aiid: action.aiid,
          in: action.in,
        },
      },
      15000, // 15 seconds timeout for actions
    );

    return result;
  }
}
