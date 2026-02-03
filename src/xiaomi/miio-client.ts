/**
 * Xiaomi MiIO Client
 * Alternative approach using python-miio library
 * This method uses miio tokens instead of OAuth2
 */

import { spawn } from "node:child_process";
import { promisify } from "node:util";
import { exec as execCallback } from "node:child_process";

const exec = promisify(execCallback);

export class MiIOError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MiIOError";
  }
}

export interface MiIODevice {
  ip: string;
  token: string;
  model?: string;
}

export class MiIOClient {
  /**
   * Check if python-miio is installed
   */
  static async checkInstalled(): Promise<boolean> {
    try {
      await exec("miiocli --version");
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Install python-miio
   */
  static async install(): Promise<void> {
    try {
      await exec("pip3 install python-miio");
    } catch (error) {
      throw new MiIOError(
        `Failed to install python-miio: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Discover devices on local network
   */
  static async discover(timeout: number = 5): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const devices: any[] = [];
      const proc = spawn("miiocli", ["discover", "--timeout", timeout.toString()]);

      let output = "";

      proc.stdout.on("data", (data) => {
        output += data.toString();
      });

      proc.stderr.on("data", (data) => {
        console.error("miio discover error:", data.toString());
      });

      proc.on("close", (code) => {
        if (code !== 0) {
          reject(new MiIOError(`miiocli discover failed with code ${code}`));
          return;
        }

        // Parse output
        const lines = output.split("\n");
        for (const line of lines) {
          // Example: Device ID: 123456789 at 192.168.1.100 - token: xxxxxxxx
          const match = line.match(/(\d+\.\d+\.\d+\.\d+).*token:\s*([a-f0-9]+)/i);
          if (match) {
            devices.push({
              ip: match[1],
              token: match[2],
            });
          }
        }

        resolve(devices);
      });
    });
  }

  /**
   * Send command to device via miiocli
   */
  private static async runCommand(
    ip: string,
    token: string,
    command: string,
    args: string[] = [],
  ): Promise<string> {
    const cmdArgs = ["device", "--ip", ip, "--token", token, command, ...args];

    try {
      const { stdout, stderr } = await exec(`miiocli ${cmdArgs.join(" ")}`);
      if (stderr) {
        console.warn("miio stderr:", stderr);
      }
      return stdout;
    } catch (error) {
      throw new MiIOError(
        `Failed to execute command: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get device info
   */
  static async getInfo(device: MiIODevice): Promise<any> {
    const output = await this.runCommand(device.ip, device.token, "info");
    try {
      return JSON.parse(output);
    } catch {
      return { raw: output };
    }
  }

  /**
   * Send TTS command to XiaoAI speaker
   */
  static async speak(device: MiIODevice, text: string): Promise<void> {
    // Use raw command to send MIoT action
    // siid=5, aiid=5, params=[text, false]
    const command = JSON.stringify({
      method: "action",
      params: {
        siid: 5,
        aiid: 5,
        in: [text, false],
      },
    });

    await this.runCommand(device.ip, device.token, "raw_command", [command]);
  }

  /**
   * Send silent command to XiaoAI speaker
   */
  static async speakSilent(device: MiIODevice, text: string): Promise<void> {
    const command = JSON.stringify({
      method: "action",
      params: {
        siid: 5,
        aiid: 5,
        in: [text, true],
      },
    });

    await this.runCommand(device.ip, device.token, "raw_command", [command]);
  }
}

/**
 * Get device token using miio-token tool
 * This requires the device to be in setup mode
 */
export async function getDeviceToken(ip: string): Promise<string> {
  try {
    const { stdout } = await exec(`miio-extract-tokens ${ip}`);
    const match = stdout.match(/token:\s*([a-f0-9]+)/i);
    if (match) {
      return match[1];
    }
    throw new MiIOError("Token not found in output");
  } catch (error) {
    throw new MiIOError(
      `Failed to get device token: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
