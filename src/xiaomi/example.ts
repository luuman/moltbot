/**
 * Xiaomi Integration Example Usage
 *
 * This file demonstrates how to use the Xiaomi integration
 */

import { XiaomiClient } from "./client.js";

async function main() {
  // Create client
  const client = new XiaomiClient({
    cloud_server: "cn", // or 'de', 'us', etc.
    redirect_url: "http://localhost:8123/xiaomi/callback",
  });

  // Initialize (load saved config if exists)
  const isLoggedIn = await client.init();

  if (!isLoggedIn) {
    console.log("Not logged in. Please visit the following URL to login:");
    console.log(client.getAuthUrl());
    console.log("\nAfter login, you will get a code. Use it to login:");
    console.log("client.loginWithCode(code)");
    return;
  }

  console.log("✓ Logged in");
  const userInfo = client.getUserInfo();
  console.log(`User: ${userInfo?.miliaoNick} (${userInfo?.userId})`);

  // Load devices
  console.log("\nLoading devices...");
  const devices = await client.loadDevices();
  console.log(`Found ${Object.keys(devices).length} devices`);

  // Find XiaoAI speakers
  const speakers = client.getXiaoAISpeakers();
  console.log(`\nFound ${speakers.length} XiaoAI speakers:`);

  for (const speaker of speakers) {
    console.log(`  - ${speaker.name} (${speaker.model})`);
    console.log(`    DID: ${speaker.did}`);
    console.log(`    Online: ${speaker.online ? "✓" : "✗"}`);
  }

  // Example: Speak on first speaker
  if (speakers.length > 0) {
    const firstSpeaker = speakers[0];
    console.log(`\nTesting TTS on ${firstSpeaker.name}...`);

    try {
      const xiaoai = client.createXiaoAISpeaker(firstSpeaker.did);
      await xiaoai.speak("你好，我是小爱同学");
      console.log("✓ TTS command sent successfully");
    } catch (error) {
      console.error("✗ Failed to send TTS command:", error);
    }
  }
}

// Example: Login with code
async function loginExample(code: string) {
  const client = new XiaomiClient({
    cloud_server: "cn",
  });

  await client.init();

  console.log("Logging in with code...");
  const userInfo = await client.loginWithCode(code);
  console.log(`✓ Logged in as ${userInfo.miliaoNick}`);

  // Load devices
  await client.loadDevices();
  console.log("✓ Devices loaded");
}

// Example: Control XiaoAI speaker
async function speakExample(did: string, text: string) {
  const client = new XiaomiClient();
  await client.init();

  if (!(await client.isLoggedIn())) {
    throw new Error("Not logged in");
  }

  await client.loadDevices();

  const xiaoai = client.createXiaoAISpeaker(did);
  await xiaoai.speak(text);
  console.log(`✓ Sent text to ${xiaoai.getDeviceName()}`);
}

// Export examples
export { main, loginExample, speakExample };

// Run main if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
