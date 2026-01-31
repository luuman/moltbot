/**
 * XiaoAI Speaker Control
 * Controls Xiaomi AI speakers via MIoT action API
 */

import type { XiaomiHttpClient } from "./http-client.js";
import type { DeviceInfo, XiaoAIDevice, MIoTAction } from "./types.js";

export class XiaoAIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "XiaoAIError";
  }
}

export interface XiaoAISpeakerConfig {
  // Common intelligent speaker service IDs (may vary by model)
  // siid=5 is common for intelligent-speaker service
  siid?: number;
  // aiid for play-text (TTS - 让小爱说话) (commonly aiid=1)
  play_text_aiid?: number;
  // aiid for execute-text-directive (语音命令 - 说话给小爱听) (commonly aiid=5)
  execute_text_directive_aiid?: number;
}

const DEFAULT_SPEAKER_CONFIG: Required<XiaoAISpeakerConfig> = {
  siid: 5, // intelligent-speaker service
  play_text_aiid: 1, // play-text action (TTS)
  execute_text_directive_aiid: 5, // execute-text-directive action (voice command)
};

export class XiaoAISpeaker {
  private httpClient: XiaomiHttpClient;
  private device: DeviceInfo;
  private config: Required<XiaoAISpeakerConfig>;

  constructor(httpClient: XiaomiHttpClient, device: DeviceInfo, config?: XiaoAISpeakerConfig) {
    this.httpClient = httpClient;
    this.device = device;
    this.config = { ...DEFAULT_SPEAKER_CONFIG, ...config };

    // Validate device type
    if (!this.isXiaoAISpeaker(device)) {
      throw new XiaoAIError(
        `Device ${device.did} (${device.model}) is not a WiFi speaker. Type: ${device.type}`,
      );
    }
  }

  /**
   * Check if device is a XiaoAI speaker
   */
  private isXiaoAISpeaker(device: DeviceInfo): boolean {
    // Check if device type contains 'speaker' or 'wifi-speaker'
    const type = device.type?.toLowerCase() || "";
    const model = device.model?.toLowerCase() || "";

    return (
      type.includes("speaker") ||
      type === "wifi-speaker" ||
      model.includes("speaker") ||
      model.includes("wifispeaker") ||
      model.includes("s12") || // xiaomi.wifispeaker.s12
      model.includes("lx06") || // xiaomi.wifispeaker.lx06
      model.includes("x08c") // xiaomi.wifispeaker.x08c
    );
  }

  /**
   * Play text (TTS - 让小爱说话)
   * @param text Text for the speaker to say
   */
  async speak(text: string): Promise<void> {
    if (!text || text.trim() === "") {
      throw new XiaoAIError("Text cannot be empty");
    }

    const action: MIoTAction = {
      did: this.device.did,
      siid: this.config.siid,
      aiid: this.config.play_text_aiid, // aiid=1: play-text (TTS)
      in: [text], // Only needs text parameter
    };

    try {
      const result = await this.httpClient.executeAction(action);

      if (result.code !== 0) {
        throw new XiaoAIError(
          `Failed to play text: code=${result.code}, device=${this.device.did}`,
        );
      }
    } catch (error) {
      if (error instanceof XiaoAIError) {
        throw error;
      }
      throw new XiaoAIError(
        `Failed to speak on device ${this.device.did}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Execute text directive (语音命令 - 说话给小爱听)
   * @param text Voice command text
   * @param silent_execution Whether to execute silently (default: false)
   */
  async executeVoiceCommand(text: string, silent_execution: boolean = false): Promise<void> {
    if (!text || text.trim() === "") {
      throw new XiaoAIError("Text cannot be empty");
    }

    const action: MIoTAction = {
      did: this.device.did,
      siid: this.config.siid,
      aiid: this.config.execute_text_directive_aiid, // aiid=5: execute-text-directive
      in: [text, silent_execution],
    };

    try {
      const result = await this.httpClient.executeAction(action);

      if (result.code !== 0) {
        throw new XiaoAIError(
          `Failed to execute voice command: code=${result.code}, device=${this.device.did}`,
        );
      }
    } catch (error) {
      if (error instanceof XiaoAIError) {
        throw error;
      }
      throw new XiaoAIError(
        `Failed to execute command on device ${this.device.did}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Execute a voice command (说话给小爱听)
   */
  async sendCommand(command: string): Promise<void> {
    await this.executeVoiceCommand(command, false);
  }

  /**
   * Execute a voice command silently (without TTS feedback)
   */
  async sendCommandSilently(command: string): Promise<void> {
    await this.executeVoiceCommand(command, true);
  }

  /**
   * Get device information
   */
  getDeviceInfo(): DeviceInfo {
    return { ...this.device };
  }

  /**
   * Get device ID
   */
  getDeviceId(): string {
    return this.device.did;
  }

  /**
   * Get device name
   */
  getDeviceName(): string {
    return this.device.name;
  }

  /**
   * Get device model
   */
  getDeviceModel(): string {
    return this.device.model;
  }

  /**
   * Check if device is online
   */
  isOnline(): boolean {
    return this.device.online;
  }
}

/**
 * Helper function to find all XiaoAI speakers from device list
 */
export function findXiaoAISpeakers(devices: Record<string, DeviceInfo>): DeviceInfo[] {
  return Object.values(devices).filter((device) => {
    const type = device.type?.toLowerCase() || "";
    const model = device.model?.toLowerCase() || "";

    return (
      type.includes("speaker") ||
      type === "wifi-speaker" ||
      model.includes("speaker") ||
      model.includes("wifispeaker")
    );
  });
}

/**
 * Create XiaoAI speaker instance from device info
 */
export function createXiaoAISpeaker(
  httpClient: XiaomiHttpClient,
  device: DeviceInfo,
  config?: XiaoAISpeakerConfig,
): XiaoAISpeaker {
  return new XiaoAISpeaker(httpClient, device, config);
}
