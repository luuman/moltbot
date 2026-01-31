/**
 * Jarvis Voice Assistant
 * Local voice recognition + XiaoAI TTS
 *
 * Architecture:
 * - Microphone → Voice Recognition (Whisper/Vosk) → Wake Word Detection
 * - Command Processing → Response Generation → XiaoAI TTS
 */

import type { XiaomiClient } from "./client.js";

export interface JarvisConfig {
  wakeWord: string; // 唤醒词，例如 "贾维斯"
  xiaomiClient: XiaomiClient;
  speakerDid: string; // 小爱音箱 DID
  // 语音识别服务配置（待实现）
  recognitionService?: {
    type: "whisper" | "vosk" | "local";
    apiKey?: string;
  };
}

export class JarvisAssistant {
  private config: JarvisConfig;
  private isListening: boolean = false;

  constructor(config: JarvisConfig) {
    this.config = config;
  }

  /**
   * 启动贾维斯助手
   */
  async start(): Promise<void> {
    console.log(`🤖 贾维斯助手已启动，唤醒词: "${this.config.wakeWord}"`);
    this.isListening = true;

    // TODO: 实现语音识别循环
    // while (this.isListening) {
    //   const audio = await this.captureMicrophone();
    //   const text = await this.recognize(audio);
    //
    //   if (text.startsWith(this.config.wakeWord)) {
    //     await this.handleCommand(text);
    //   }
    // }
  }

  /**
   * 停止贾维斯助手
   */
  stop(): void {
    this.isListening = false;
    console.log("🤖 贾维斯助手已停止");
  }

  /**
   * 处理语音命令
   */
  private async handleCommand(fullText: string): Promise<void> {
    // 移除唤醒词，获取实际命令
    const command = fullText.replace(this.config.wakeWord, "").trim();

    console.log(`📝 收到命令: ${command}`);

    // TODO: 实现命令处理逻辑
    // 例如：
    // - 查询天气
    // - 控制智能家居
    // - 问答对话
    // - 等等

    const response = await this.processCommand(command);

    // 通过小爱播报响应
    const xiaoai = this.config.xiaomiClient.createXiaoAISpeaker(this.config.speakerDid);
    await xiaoai.speak(response);
  }

  /**
   * 处理命令并生成响应
   */
  private async processCommand(command: string): Promise<string> {
    // 简单的命令处理示例
    if (command.includes("时间")) {
      const now = new Date();
      return `现在是${now.getHours()}点${now.getMinutes()}分`;
    }

    if (command.includes("天气")) {
      // TODO: 调用天气 API
      return "今天天气晴朗，温度25度";
    }

    // 默认响应
    return `收到命令：${command}。抱歉，我还不知道如何处理这个请求。`;
  }

  /**
   * 捕获麦克风音频（待实现）
   */
  private async captureMicrophone(): Promise<Buffer> {
    // TODO: 实现麦克风录音
    // 可以使用 node-record-lpcm16 或其他库
    throw new Error("Microphone capture not implemented");
  }

  /**
   * 语音识别（待实现）
   */
  private async recognize(audio: Buffer): Promise<string> {
    // TODO: 实现语音识别
    // 选项1: 使用 Whisper API
    // 选项2: 使用 Vosk (离线)
    // 选项3: 使用其他语音识别服务
    throw new Error("Voice recognition not implemented");
  }
}

/**
 * 使用示例：
 *
 * const client = new XiaomiClient();
 * await client.init();
 *
 * const jarvis = new JarvisAssistant({
 *   wakeWord: "贾维斯",
 *   xiaomiClient: client,
 *   speakerDid: "289833424",
 * });
 *
 * await jarvis.start();
 */
