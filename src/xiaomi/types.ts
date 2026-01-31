/**
 * Xiaomi MIoT Integration Types
 * Based on ha_xiaomi_home implementation
 */

export interface OAuthToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_ts: number; // Unix timestamp when token expires
}

export interface UserInfo {
  userId: string;
  miliaoNick: string;
  miliaoIcon?: string;
  miliaoIconUrl?: string;
}

export interface CloudServer {
  id: string;
  name: string;
  oauth_host: string;
  api_host: string;
}

export interface DeviceInfo {
  did: string; // Device ID
  model: string;
  name: string;
  type: string; // Device type (e.g., 'wifi-speaker')
  parent_id?: string;
  parent_model?: string;
  online: boolean;
  spec_type?: string;
}

export interface HomeInfo {
  home_id: string;
  home_name: string;
  uid: string;
  dids: string[]; // Device IDs in this home
  room_info: Record<string, RoomInfo>;
}

export interface RoomInfo {
  room_id: string;
  room_name: string;
  dids: string[];
}

export interface MIoTProperty {
  did: string;
  siid: number; // Service instance ID
  piid: number; // Property instance ID
  value?: any;
  code?: number;
}

export interface MIoTAction {
  did: string;
  siid: number; // Service instance ID
  aiid: number; // Action instance ID
  in: any[]; // Input parameters
}

export interface MIoTActionResult {
  code: number;
  out?: any[];
}

export interface XiaoAIDevice extends DeviceInfo {
  type: "wifi-speaker";
  intelligent_speaker_service?: {
    siid: number;
    execute_text_directive?: {
      aiid: number;
      params: {
        text: { piid: number };
        silent_execution?: { piid: number };
      };
    };
  };
}

export interface XiaomiConfig {
  cloud_server: string; // 'cn' | 'de' | 'i2' | 'ru' | 'sg' | 'us'
  client_id: string;
  redirect_url: string;
  uuid?: string; // Client UUID for consistent device_id across sessions
  token?: OAuthToken;
  user_info?: UserInfo;
  devices?: Record<string, DeviceInfo>;
  homes?: Record<string, HomeInfo>;
}

export interface MIoTErrorResponse {
  code: number;
  message: string;
}

export interface MIoTSuccessResponse<T = any> {
  code: 0;
  result: T;
}

export type MIoTResponse<T = any> = MIoTSuccessResponse<T> | MIoTErrorResponse;
