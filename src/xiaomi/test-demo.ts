/**
 * Xiaomi Integration Demo
 * Quick demo to show the functionality
 */

import { XiaomiClient } from "./client.js";

async function demo() {
  console.log("=== 小米智能家居集成演示 ===\n");

  // 1. 创建客户端
  console.log("1️⃣  创建客户端...");
  const client = new XiaomiClient({
    cloud_server: "cn", // 中国大陆服务器
    redirect_url: "http://localhost:8123/xiaomi/callback",
  });

  // 2. 初始化
  console.log("2️⃣  初始化客户端...");
  const isLoggedIn = await client.init();

  // 3. 检查登录状态
  if (!isLoggedIn) {
    console.log("\n❌ 未登录");
    console.log("\n📌 请按以下步骤登录:");
    console.log("   1. 运行: node dist/xiaomi/cli.js login");
    console.log("   2. 在浏览器中完成小米账号登录");
    console.log("   3. 复制返回的 code 值");
    console.log("   4. 运行: node dist/xiaomi/cli.js login-code <code>");
    console.log("\n或者使用代码登录:");
    console.log("   const authUrl = client.getAuthUrl();");
    console.log("   await client.loginWithCode(code);");
    return;
  }

  console.log("✅ 已登录");

  // 4. 获取用户信息
  const userInfo = client.getUserInfo();
  if (userInfo) {
    console.log(`\n👤 用户: ${userInfo.miliaoNick} (UID: ${userInfo.userId})`);
  }

  // 5. 加载设备
  console.log("\n3️⃣  加载设备列表...");
  const devices = await client.loadDevices();
  console.log(`✅ 找到 ${Object.keys(devices).length} 个设备`);

  // 6. 查找小爱音箱
  console.log("\n4️⃣  查找小爱音箱...");
  const speakers = client.getXiaoAISpeakers();
  console.log(`✅ 找到 ${speakers.length} 个小爱音箱\n`);

  if (speakers.length === 0) {
    console.log("⚠️  未找到小爱音箱设备");
    return;
  }

  // 7. 显示小爱音箱列表
  console.log("📱 小爱音箱列表:");
  speakers.forEach((speaker, index) => {
    const status = speaker.online ? "🟢 在线" : "🔴 离线";
    console.log(`   ${index + 1}. ${speaker.name} ${status}`);
    console.log(`      型号: ${speaker.model}`);
    console.log(`      DID: ${speaker.did}`);
    console.log("");
  });

  // 8. 测试 TTS 功能
  const firstSpeaker = speakers[0];
  console.log(`5️⃣  测试 TTS 功能 (设备: ${firstSpeaker.name})...`);

  if (!firstSpeaker.online) {
    console.log("⚠️  设备离线，无法测试");
    return;
  }

  try {
    const xiaoai = client.createXiaoAISpeaker(firstSpeaker.did);

    console.log('   发送测试消息: "你好，我是小爱同学测试"');
    await xiaoai.speak("你好，我是小爱同学测试");
    console.log("✅ TTS 命令发送成功！");

    console.log("\n💡 提示: 如果设备在线但没有声音，请检查:");
    console.log("   1. 音量是否静音");
    console.log("   2. 设备型号是否支持 (siid/aiid 参数可能需要调整)");
    console.log("   3. 设备是否真的是小爱音箱");
  } catch (error) {
    console.error("❌ TTS 失败:", error instanceof Error ? error.message : error);
    console.log("\n💡 可能的原因:");
    console.log("   1. 设备型号不支持 (需要调整 siid/aiid 参数)");
    console.log("   2. 网络问题");
    console.log("   3. Token 过期 (会自动刷新)");
  }

  // 9. 显示配置信息
  console.log("\n6️⃣  配置信息:");
  const storage = client.getStorage();
  console.log(`   配置文件: ${storage.getConfigFilePath()}`);

  console.log("\n=== 演示结束 ===\n");
}

// 运行演示
if (import.meta.url === `file://${process.argv[1]}`) {
  demo().catch((error) => {
    console.error("\n❌ 错误:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
}

export { demo };
