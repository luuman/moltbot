/**
 * Xiaomi MIoT Constants
 * Based on ha_xiaomi_home implementation
 */

export const OAUTH2_CLIENT_ID = "2882303761520251711";
export const OAUTH2_AUTH_URL = "https://account.xiaomi.com/oauth2/authorize";
export const DEFAULT_OAUTH2_API_HOST = "ha.api.io.mi.com";

export const MIHOME_HTTP_API_TIMEOUT = 30000; // 30 seconds

export const TOKEN_EXPIRES_TS_RATIO = 0.7; // Refresh token when 70% of lifetime is reached

export const CLOUD_SERVERS = {
  cn: {
    id: "cn",
    name: "中国大陆",
    oauth_host: DEFAULT_OAUTH2_API_HOST,
    api_host: DEFAULT_OAUTH2_API_HOST,
  },
  de: {
    id: "de",
    name: "Europe",
    oauth_host: `de.${DEFAULT_OAUTH2_API_HOST}`,
    api_host: `de.${DEFAULT_OAUTH2_API_HOST}`,
  },
  i2: {
    id: "i2",
    name: "India",
    oauth_host: `i2.${DEFAULT_OAUTH2_API_HOST}`,
    api_host: `i2.${DEFAULT_OAUTH2_API_HOST}`,
  },
  ru: {
    id: "ru",
    name: "Russia",
    oauth_host: `ru.${DEFAULT_OAUTH2_API_HOST}`,
    api_host: `ru.${DEFAULT_OAUTH2_API_HOST}`,
  },
  sg: {
    id: "sg",
    name: "Singapore",
    oauth_host: `sg.${DEFAULT_OAUTH2_API_HOST}`,
    api_host: `sg.${DEFAULT_OAUTH2_API_HOST}`,
  },
  us: {
    id: "us",
    name: "United States",
    oauth_host: `us.${DEFAULT_OAUTH2_API_HOST}`,
    api_host: `us.${DEFAULT_OAUTH2_API_HOST}`,
  },
} as const;

export type CloudServerId = keyof typeof CLOUD_SERVERS;
