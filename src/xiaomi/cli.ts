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
  xiaomi login                            - 开始登录流程
  xiaomi login-code <code>                - 使用授权码完成登录
  xiaomi devices                          - 列出所有设备
  xiaomi speakers                         - 列出所有小爱音箱
  xiaomi speak [设备名称或DID] <文本>      - 让小爱音箱播报文本 (TTS)
  xiaomi command [设备名称或DID] <命令>    - 发送语音命令给小爱 (模拟说话给小爱听)
  xiaomi command-silent [设备名称或DID] <命令> - 静默执行语音命令
  xiaomi info                             - 显示用户信息
  xiaomi logout                           - 登出
  xiaomi help                             - 显示帮助

参数说明:
  [设备名称或DID] - 可选参数，支持：
    - 省略：自动使用第一个在线的小爱音箱
    - 设备名称：例如 "小爱音箱" 或 "Play"（支持模糊匹配）
    - DID：设备ID，例如 "289833424"

示例:
  # 1. 开始登录
  xiaomi login

  # 2. 在浏览器中完成登录后，使用返回的 code 完成登录
  xiaomi login-code xxxxxx

  # 3. 列出所有小爱音箱
  xiaomi speakers

  # 4. 使用默认小爱音箱播报（自动选择第一个在线的）
  xiaomi speak "你好，今天天气真好"

  # 5. 指定设备名称播报
  xiaomi speak "小爱音箱" "你好，今天天气真好"
  xiaomi speak Play "你好"  # 支持部分匹配

  # 6. 使用DID播报（传统方式）
  xiaomi speak 289833424 "你好，今天天气真好"

  # 7. 发送语音命令（默认设备）
  xiaomi command "打开卧室灯"

  # 8. 静默执行语音命令（指定设备）
  xiaomi command-silent "小爱音箱" "播放音乐"
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

async function cmdSpeak(deviceOrText: string, maybeText?: string) {
  const client = new XiaomiClient();
  await client.init();

  if (!(await client.isLoggedIn())) {
    console.error("错误: 未登录，请先运行 xiaomi login");
    process.exit(1);
  }

  await client.loadDevices();

  let device: string | undefined;
  let text: string;

  // Parse arguments: either "text" or "device text"
  if (maybeText) {
    device = deviceOrText;
    text = maybeText;
  } else {
    device = undefined;
    text = deviceOrText;
  }

  if (!text) {
    console.error("错误: 请提供要播报的文本");
    console.error("用法: xiaomi speak [设备名称或DID] <文本>");
    console.error("示例:");
    console.error('  xiaomi speak "你好"                    # 使用默认设备');
    console.error('  xiaomi speak "小爱音箱" "你好"          # 指定设备名称');
    console.error('  xiaomi speak 289833424 "你好"          # 指定DID');
    process.exit(1);
  }

  try {
    const xiaoai = client.createXiaoAISpeakerSmart(device);
    const deviceName = xiaoai.getDeviceName();

    if (device) {
      console.log(`正在发送 TTS 指令到设备 ${deviceName}...`);
    } else {
      console.log(`正在使用默认设备 ${deviceName} 播报...`);
    }

    await xiaoai.speak(text);
    console.log(`✓ 成功发送到 ${deviceName}`);
  } catch (error) {
    console.error("✗ 发送失败:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

async function cmdCommand(deviceOrCommand: string, maybeCommand?: string) {
  const client = new XiaomiClient();
  await client.init();

  if (!(await client.isLoggedIn())) {
    console.error("错误: 未登录，请先运行 xiaomi login");
    process.exit(1);
  }

  await client.loadDevices();

  let device: string | undefined;
  let command: string;

  // Parse arguments: either "command" or "device command"
  if (maybeCommand) {
    device = deviceOrCommand;
    command = maybeCommand;
  } else {
    device = undefined;
    command = deviceOrCommand;
  }

  if (!command) {
    console.error("错误: 请提供要执行的命令");
    console.error("用法: xiaomi command [设备名称或DID] <命令>");
    console.error("示例:");
    console.error('  xiaomi command "打开客厅灯"            # 使用默认设备');
    console.error('  xiaomi command "小爱音箱" "播放音乐"    # 指定设备名称');
    console.error('  xiaomi command 289833424 "现在几点"    # 指定DID');
    process.exit(1);
  }

  try {
    const xiaoai = client.createXiaoAISpeakerSmart(device);
    const deviceName = xiaoai.getDeviceName();

    if (device) {
      console.log(`正在发送语音命令到设备 ${deviceName}...`);
    } else {
      console.log(`正在使用默认设备 ${deviceName} 执行命令...`);
    }

    await xiaoai.sendCommand(command);
    console.log(`✓ 成功发送到 ${deviceName}`);
  } catch (error) {
    console.error("✗ 发送失败:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

async function cmdCommandSilent(deviceOrCommand: string, maybeCommand?: string) {
  const client = new XiaomiClient();
  await client.init();

  if (!(await client.isLoggedIn())) {
    console.error("错误: 未登录，请先运行 xiaomi login");
    process.exit(1);
  }

  await client.loadDevices();

  let device: string | undefined;
  let command: string;

  // Parse arguments: either "command" or "device command"
  if (maybeCommand) {
    device = deviceOrCommand;
    command = maybeCommand;
  } else {
    device = undefined;
    command = deviceOrCommand;
  }

  if (!command) {
    console.error("错误: 请提供要执行的命令");
    console.error("用法: xiaomi command-silent [设备名称或DID] <命令>");
    console.error("示例:");
    console.error('  xiaomi command-silent "播放音乐"         # 使用默认设备');
    console.error('  xiaomi command-silent "小爱音箱" "下一曲" # 指定设备名称');
    console.error('  xiaomi command-silent 289833424 "暂停"   # 指定DID');
    process.exit(1);
  }

  try {
    const xiaoai = client.createXiaoAISpeakerSmart(device);
    const deviceName = xiaoai.getDeviceName();

    if (device) {
      console.log(`正在发送静默语音命令到设备 ${deviceName}...`);
    } else {
      console.log(`正在使用默认设备 ${deviceName} 静默执行...`);
    }

    await xiaoai.sendCommandSilently(command);
    console.log(`✓ 成功发送到 ${deviceName}`);
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
