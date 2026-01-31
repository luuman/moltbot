#!/usr/bin/env node
/**
 * Xiaomi CLI Tool
 * Command line interface for Xiaomi Home integration
 */

import { XiaomiClient } from "./client.js";

async function showHelp() {
  console.log(`
Xiaomi CLI Tool - 小米智能家居命令行工具

用法:
  xiaomi login                       - 开始登录流程
  xiaomi login-code <code>           - 使用授权码完成登录
  xiaomi devices                     - 列出所有设备
  xiaomi speakers                    - 列出所有小爱音箱
  xiaomi speak <did> <text>          - 让小爱音箱播报文本 (TTS)
  xiaomi command <did> <cmd>         - 发送语音命令给小爱 (模拟说话给小爱听)
  xiaomi command-silent <did> <cmd>  - 静默执行语音命令
  xiaomi info                        - 显示用户信息
  xiaomi logout                      - 登出
  xiaomi help                        - 显示帮助

示例:
  # 1. 开始登录
  xiaomi login

  # 2. 在浏览器中完成登录后，使用返回的 code 完成登录
  xiaomi login-code xxxxxx

  # 3. 列出所有小爱音箱
  xiaomi speakers

  # 4. 让小爱音箱播报文本 (TTS)
  xiaomi speak 123456789 "你好，今天天气真好"

  # 5. 发送语音命令 (模拟说话给小爱听)
  xiaomi command 123456789 "打开卧室灯"

  # 6. 静默执行语音命令 (不会有语音反馈)
  xiaomi command-silent 123456789 "播放音乐"
`);
}

async function cmdLogin() {
  const client = new XiaomiClient({ cloud_server: "cn" });
  await client.init();

  const authUrl = client.getAuthUrl();
  console.log("\n请访问以下 URL 登录:");
  console.log(authUrl);
  console.log("\n登录后，浏览器会跳转到一个包含 code 参数的 URL");
  console.log("复制 code 的值，然后执行:");
  console.log("  xiaomi login-code <code>");
  console.log("");
}

async function cmdLoginCode(code: string, options?: { redirectUri?: string; deviceId?: string }) {
  if (!code) {
    console.error("错误: 请提供授权码");
    process.exit(1);
  }

  const client = new XiaomiClient({ cloud_server: "cn" });
  await client.init();

  console.log("正在登录...");
  try {
    // Support Home Assistant hybrid mode
    const loginOptions =
      options?.redirectUri || options?.deviceId
        ? {
            redirect_uri: options.redirectUri,
            device_id: options.deviceId,
          }
        : undefined;

    const userInfo = await client.loginWithCode(code, loginOptions);
    console.log(`✓ 登录成功: ${userInfo.miliaoNick} (${userInfo.userId})`);

    // Load devices
    console.log("\n正在加载设备...");
    const devices = await client.loadDevices();
    console.log(`✓ 加载了 ${Object.keys(devices).length} 个设备`);

    const speakers = client.getXiaoAISpeakers();
    console.log(`✓ 找到 ${speakers.length} 个小爱音箱`);
  } catch (error) {
    console.error("✗ 登录失败:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

async function cmdDevices() {
  const client = new XiaomiClient();
  await client.init();

  if (!(await client.isLoggedIn())) {
    console.error("错误: 未登录，请先运行 xiaomi login");
    process.exit(1);
  }

  console.log("正在加载设备...");
  const devices = await client.loadDevices();

  console.log(`\n找到 ${Object.keys(devices).length} 个设备:\n`);
  for (const device of Object.values(devices)) {
    console.log(`  ${device.online ? "🟢" : "🔴"} ${device.name}`);
    console.log(`     型号: ${device.model}`);
    console.log(`     DID: ${device.did}`);
    console.log(`     类型: ${device.type}`);
    console.log("");
  }
}

async function cmdSpeakers() {
  const client = new XiaomiClient();
  await client.init();

  if (!(await client.isLoggedIn())) {
    console.error("错误: 未登录，请先运行 xiaomi login");
    process.exit(1);
  }

  console.log("正在加载设备...");
  await client.loadDevices();

  const speakers = client.getXiaoAISpeakers();
  console.log(`\n找到 ${speakers.length} 个小爱音箱:\n`);

  for (const speaker of speakers) {
    console.log(`  ${speaker.online ? "🟢" : "🔴"} ${speaker.name}`);
    console.log(`     型号: ${speaker.model}`);
    console.log(`     DID: ${speaker.did}`);
    console.log("");
  }
}

async function cmdSpeak(did: string, text: string) {
  if (!did || !text) {
    console.error("错误: 请提供设备 DID 和文本");
    console.error("用法: xiaomi speak <did> <text>");
    process.exit(1);
  }

  const client = new XiaomiClient();
  await client.init();

  if (!(await client.isLoggedIn())) {
    console.error("错误: 未登录，请先运行 xiaomi login");
    process.exit(1);
  }

  await client.loadDevices();

  console.log(`正在发送 TTS 指令到设备 ${did}...`);
  try {
    const xiaoai = client.createXiaoAISpeaker(did);
    await xiaoai.speak(text);
    console.log(`✓ 成功发送到 ${xiaoai.getDeviceName()}`);
  } catch (error) {
    console.error("✗ 发送失败:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

async function cmdCommand(did: string, command: string) {
  if (!did || !command) {
    console.error("错误: 请提供设备 DID 和命令");
    console.error("用法: xiaomi command <did> <command>");
    process.exit(1);
  }

  const client = new XiaomiClient();
  await client.init();

  if (!(await client.isLoggedIn())) {
    console.error("错误: 未登录，请先运行 xiaomi login");
    process.exit(1);
  }

  await client.loadDevices();

  console.log(`正在发送语音命令到设备 ${did}...`);
  try {
    const xiaoai = client.createXiaoAISpeaker(did);
    await xiaoai.sendCommand(command);
    console.log(`✓ 成功发送到 ${xiaoai.getDeviceName()}`);
  } catch (error) {
    console.error("✗ 发送失败:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

async function cmdCommandSilent(did: string, command: string) {
  if (!did || !command) {
    console.error("错误: 请提供设备 DID 和命令");
    console.error("用法: xiaomi command-silent <did> <command>");
    process.exit(1);
  }

  const client = new XiaomiClient();
  await client.init();

  if (!(await client.isLoggedIn())) {
    console.error("错误: 未登录，请先运行 xiaomi login");
    process.exit(1);
  }

  await client.loadDevices();

  console.log(`正在发送静默语音命令到设备 ${did}...`);
  try {
    const xiaoai = client.createXiaoAISpeaker(did);
    await xiaoai.sendCommandSilently(command);
    console.log(`✓ 成功发送到 ${xiaoai.getDeviceName()}`);
  } catch (error) {
    console.error("✗ 发送失败:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

async function cmdInfo() {
  const client = new XiaomiClient();
  await client.init();

  if (!(await client.isLoggedIn())) {
    console.error("错误: 未登录，请先运行 xiaomi login");
    process.exit(1);
  }

  const userInfo = client.getUserInfo();
  const homes = client.getHomes();
  const storage = client.getStorage();

  console.log("\n用户信息:");
  console.log(`  昵称: ${userInfo?.miliaoNick}`);
  console.log(`  用户ID: ${userInfo?.userId}`);

  if (homes) {
    console.log(`\n家庭数量: ${Object.keys(homes).length}`);
    for (const home of Object.values(homes)) {
      console.log(`  - ${home.home_name} (${home.dids.length} 个设备)`);
    }
  }

  console.log(`\n配置文件: ${storage.getConfigFilePath()}`);
  console.log("");
}

async function cmdLogout() {
  const client = new XiaomiClient();
  await client.init();

  if (!(await client.isLoggedIn())) {
    console.error("错误: 未登录");
    process.exit(1);
  }

  console.log("正在登出...");
  await client.logout();
  console.log("✓ 已登出");
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case "login":
        await cmdLogin();
        break;
      case "login-code": {
        // Parse arguments: login-code <code> [--redirect-uri <uri>] [--device-id <id>]
        const code = args[1];
        const options: { redirectUri?: string; deviceId?: string } = {};

        for (let i = 2; i < args.length; i++) {
          if (args[i] === "--redirect-uri" && args[i + 1]) {
            options.redirectUri = args[i + 1];
            i++;
          } else if (args[i] === "--device-id" && args[i + 1]) {
            options.deviceId = args[i + 1];
            i++;
          }
        }

        await cmdLoginCode(code, options);
        break;
      }
      case "devices":
        await cmdDevices();
        break;
      case "speakers":
        await cmdSpeakers();
        break;
      case "speak":
        await cmdSpeak(args[1], args.slice(2).join(" "));
        break;
      case "command":
        await cmdCommand(args[1], args.slice(2).join(" "));
        break;
      case "command-silent":
        await cmdCommandSilent(args[1], args.slice(2).join(" "));
        break;
      case "info":
        await cmdInfo();
        break;
      case "logout":
        await cmdLogout();
        break;
      case "help":
      default:
        await showHelp();
        break;
    }
  } catch (error) {
    console.error("\n错误:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main };
