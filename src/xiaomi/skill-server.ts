/**
 * XiaoAI Skill Server - Jarvis Voice Assistant
 *
 * 小爱技能服务器 - 接收小爱语音命令的回调接口
 *
 * 使用场景：
 * 用户: "小爱同学，让贾维斯查询天气"
 * → 小米云识别 → 匹配技能 → 回调此服务器 → 处理命令 → 返回响应 → 小爱播报
 */

import express from "express";
import type { XiaomiClient } from "./client.js";

export interface SkillRequest {
  query: string; // 用户说的话（去除触发词后的部分）
  slots?: Record<string, any>; // NLU提取的槽位
  session: {
    new: boolean;
    sessionId: string;
  };
}

export interface SkillResponse {
  version: string;
  response: {
    shouldEndSession: boolean;
    outputSpeech: {
      type: "PlainText" | "SSML";
      text: string;
    };
  };
}

export interface CommandHandler {
  pattern: RegExp;
  handle: (query: string, slots?: any) => Promise<string>;
}

export class JarvisSkillServer {
  private app: express.Application;
  private handlers: CommandHandler[] = [];
  private xiaomiClient?: XiaomiClient;

  constructor(options?: { xiaomiClient?: XiaomiClient }) {
    this.app = express();
    this.app.use(express.json());
    this.xiaomiClient = options?.xiaomiClient;

    this.setupRoutes();
    this.registerDefaultHandlers();
  }

  /**
   * 注册命令处理器
   */
  registerHandler(pattern: RegExp, handler: (query: string, slots?: any) => Promise<string>): void {
    this.handlers.push({ pattern, handle: handler });
  }

  /**
   * 设置路由
   */
  private setupRoutes(): void {
    // 小爱技能回调接口
    this.app.post("/api/xiaoai/jarvis", async (req, res) => {
      const request: SkillRequest = req.body;
      console.log("📞 收到小爱技能请求:", request);

      try {
        const responseText = await this.processCommand(request.query, request.slots);
        const response = this.buildResponse(responseText);

        res.json(response);
        console.log("✅ 返回响应:", responseText);
      } catch (error) {
        console.error("❌ 处理失败:", error);
        res.json(this.buildResponse("抱歉，贾维斯遇到了一些问题"));
      }
    });

    // 健康检查接口
    this.app.get("/health", (req, res) => {
      res.json({ status: "ok", service: "jarvis-skill-server" });
    });
  }

  /**
   * 注册默认命令处理器
   */
  private registerDefaultHandlers(): void {
    // 时间查询
    this.registerHandler(/时间|几点/, async () => {
      const now = new Date();
      return `现在是${now.getHours()}点${now.getMinutes()}分`;
    });

    // 日期查询
    this.registerHandler(/日期|几号|今天/, async () => {
      const now = new Date();
      const weekDays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
      return `今天是${now.getMonth() + 1}月${now.getDate()}日，${weekDays[now.getDay()]}`;
    });

    // 问候
    this.registerHandler(/你好|嗨|hello/i, async () => {
      return "你好，我是贾维斯，很高兴为您服务";
    });

    // 自我介绍
    this.registerHandler(/你是谁|介绍/, async () => {
      return "我是贾维斯，您的智能语音助手，可以帮您查询信息、控制智能家居设备";
    });
  }

  /**
   * 处理命令
   */
  private async processCommand(query: string, slots?: any): Promise<string> {
    console.log(`🤖 贾维斯处理命令: "${query}"`);

    // 尝试匹配注册的处理器
    for (const handler of this.handlers) {
      if (handler.pattern.test(query)) {
        return await handler.handle(query, slots);
      }
    }

    // 默认响应
    return `收到您的指令：${query}。抱歉，我还不知道如何处理这个请求。`;
  }

  /**
   * 构建响应
   */
  private buildResponse(text: string): SkillResponse {
    return {
      version: "1.0",
      response: {
        shouldEndSession: true,
        outputSpeech: {
          type: "PlainText",
          text,
        },
      },
    };
  }

  /**
   * 启动服务器
   */
  start(port: number = 3000): void {
    this.app.listen(port, () => {
      console.log(`🚀 贾维斯技能服务器已启动`);
      console.log(`   端口: ${port}`);
      console.log(`   接口: POST http://localhost:${port}/api/xiaoai/jarvis`);
      console.log(`   健康检查: GET http://localhost:${port}/health`);
      console.log("");
      console.log("💡 使用 ngrok 获取公网地址:");
      console.log(`   ngrok http ${port}`);
    });
  }

  /**
   * 获取 Express 应用实例（用于自定义路由）
   */
  getApp(): express.Application {
    return this.app;
  }
}

/**
 * 使用示例：
 *
 * // 基本使用
 * const server = new JarvisSkillServer();
 * server.start(3000);
 *
 * // 注册自定义命令
 * server.registerHandler(/天气/, async (query, slots) => {
 *   const city = slots?.city || '北京';
 *   const weather = await getWeather(city);
 *   return `${city}今天${weather.desc}，温度${weather.temp}度`;
 * });
 *
 * // 智能家居控制
 * const xiaomiClient = new XiaomiClient();
 * await xiaomiClient.init();
 *
 * const server = new JarvisSkillServer({ xiaomiClient });
 * server.registerHandler(/打开|关闭/, async (query) => {
 *   // 解析设备和动作
 *   const action = query.includes('打开') ? 'on' : 'off';
 *   // 控制设备
 *   return `好的，已为您${action === 'on' ? '打开' : '关闭'}设备`;
 * });
 */

// CLI 入口
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new JarvisSkillServer();

  // 注册示例命令
  server.registerHandler(/天气/, async (query, slots) => {
    const city = slots?.city || "北京";
    // TODO: 调用天气API
    return `${city}今天晴天，温度25度`;
  });

  server.registerHandler(/笑话|讲个笑话/, async () => {
    const jokes = [
      "为什么程序员总是分不清万圣节和圣诞节？因为 Oct 31 == Dec 25",
      "程序员：世界上有10种人，一种懂二进制，一种不懂",
      "为什么程序员喜欢黑暗？因为光会造成 Bug",
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  });

  const port = parseInt(process.env.PORT || "3000", 10);
  server.start(port);
}
