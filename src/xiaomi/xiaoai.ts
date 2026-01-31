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
  // aiid for execute-text-directive (commonly aiid=5)
  execute_text_directive_aiid?: number;
  // piid for text parameter (commonly piid=1)
  text_piid?: number;
  // piid for silent_execution parameter (commonly piid=3)
  silent_execution_piid?: number;
}

const DEFAULT_SPEAKER_CONFIG: Required<XiaoAISpeakerConfig> = {
  siid: 5, // intelligent-speaker service
  execute_text_directive_aiid: 5, // execute-text-directive action
  text_piid: 1, // text parameter
  silent_execution_piid: 3, // silent_execution parameter
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
   * Execute text directive (TTS/command)
   * @param text Text to speak or command to execute
   * @param silent_execution Whether to execute silently (default: false)
   */
  async speak(text: string, silent_execution: boolean = false): Promise<void> {
    if (!text || text.trim() === "") {
      throw new XiaoAIError("Text cannot be empty");
    }

    const action: MIoTAction = {
      did: this.device.did,
      siid: this.config.siid,
      aiid: this.config.execute_text_directive_aiid,
      in: [text, silent_execution],
    };

    try {
      const result = await this.httpClient.executeAction(action);

      if (result.code !== 0) {
        throw new XiaoAIError(
          `Failed to execute text directive: code=${result.code}, device=${this.device.did}`,
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
   * Play a sound effect
   */
  async playSound(sound: string): Promise<void> {
    await this.speak(sound, false);
  }

  /**
   * Execute a command silently (without TTS feedback)
   */
  async executeCommandSilently(command: string): Promise<void> {
    await this.speak(command, true);
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
