# 让小爱播放自定义音频的方案

## 🎯 目标

播放自定义音频文件（音乐、音效、录音等）到小爱音箱。

---

## 📊 方案对比

| 方案 | 可行性 | 难度 | 音质 | 推荐度 |
|------|--------|------|------|--------|
| TTS 文字转语音 | ✅ 支持 | ⭐ 简单 | 一般 | ⭐⭐⭐ |
| 本地HTTP + 语音命令 | ✅ 可能 | ⭐⭐ 中等 | 原音质 | ⭐⭐⭐⭐ |
| 蓝牙连接 | ✅ 支持 | ⭐ 简单 | 好 | ⭐⭐⭐⭐⭐ |
| DLNA投屏 | ⚠️ 未知 | ⭐⭐⭐ 复杂 | 好 | ⭐⭐ |
| 直接上传 | ❌ 不支持 | - | - | ❌ |

---

## ✅ 方案1: TTS 文字转语音（已实现）

### 适用场景
- 播报文字内容
- 通知提醒
- 语音反馈

### 代码示例

```typescript
// 播报文字
await xiaoai.speak("您有新消息");
await xiaoai.speak("今天天气晴朗，温度25度");
await xiaoai.speak("您的快递已送达");
```

### 优缺点

**优点**：
- ✅ 已经实现，直接可用
- ✅ 简单易用
- ✅ 支持任意文字

**缺点**：
- ❌ 只能播报文字，不能播放音频文件
- ❌ 只有小爱的声音
- ❌ 不能播放音乐、音效

---

## ✅ 方案2: 本地HTTP服务器 + 语音命令 ⭐推荐

### 工作原理

```
1. 在本地启动HTTP服务器，托管音频文件
2. 通过语音命令让小爱播放URL
3. 小爱从你的服务器下载并播放音频
```

### 实现步骤

#### Step 1: 启动本地HTTP服务器

创建 `src/xiaomi/audio-server.ts`：

```typescript
import express from 'express';
import path from 'path';

const app = express();

// 托管音频文件目录
const AUDIO_DIR = '/path/to/your/audio/files';
app.use('/audio', express.static(AUDIO_DIR));

// 列出所有音频文件
app.get('/list', (req, res) => {
  const fs = require('fs');
  const files = fs.readdirSync(AUDIO_DIR)
    .filter((f: string) => /\.(mp3|wav|m4a)$/i.test(f));
  res.json(files);
});

app.listen(8080, () => {
  console.log('🎵 音频服务器启动: http://localhost:8080');
  console.log('   音频目录:', AUDIO_DIR);
});
```

#### Step 2: 获取本地IP地址

```bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# 或
ip addr show | grep "inet " | grep -v 127.0.0.1

# 例如得到：192.168.1.100
```

#### Step 3: 测试音频URL

```bash
# 在浏览器访问
http://192.168.1.100:8080/audio/test.mp3

# 确认可以访问和播放
```

#### Step 4: 让小爱播放

```typescript
import { XiaomiClient } from './client.js';

const client = new XiaomiClient();
await client.init();

const xiaoai = client.createXiaoAISpeaker('289833424');

// 方法1: 尝试通过语音命令播放URL
await xiaoai.executeVoiceCommand(
  '播放 http://192.168.1.100:8080/audio/test.mp3'
);

// 方法2: 如果方法1不行，先播报提示
await xiaoai.speak('正在为您播放自定义音频');
// 然后通过其他方式播放（见下面的蓝牙方案）
```

### 注意事项

⚠️ **小爱可能不支持播放本地网络URL**，需要测试验证。

如果不支持，使用方案3（蓝牙）。

---

## ✅ 方案3: 蓝牙连接（最可靠）⭐⭐⭐⭐⭐

### 工作原理

将小爱音箱作为蓝牙音箱使用，从电脑/手机推送音频。

### 实现步骤

#### Step 1: 开启小爱蓝牙模式

对小爱说：
```
"小爱同学，打开蓝牙"
```

或者在米家App中开启蓝牙模式。

#### Step 2: 连接蓝牙（从电脑）

**macOS**:
```bash
# 1. 打开蓝牙设置
# 2. 搜索设备
# 3. 找到小爱音箱并连接
```

**Linux**:
```bash
# 使用 bluetoothctl
bluetoothctl
> scan on
> pair XX:XX:XX:XX:XX:XX  # 小爱的MAC地址
> connect XX:XX:XX:XX:XX:XX
```

**Windows**:
```
设置 → 蓝牙和其他设备 → 添加蓝牙设备
```

#### Step 3: 播放音频

**Node.js 播放音频**:

```bash
npm install play-sound
```

```typescript
import player from 'play-sound';

const play = player({});

// 播放音频文件（会通过蓝牙输出到小爱）
play.play('path/to/audio.mp3', (err: any) => {
  if (err) console.error('播放失败:', err);
  else console.log('播放完成');
});
```

**Python 播放音频**:

```python
import pygame

pygame.mixer.init()
pygame.mixer.music.load('audio.mp3')
pygame.mixer.music.play()

# 等待播放完成
while pygame.mixer.music.get_busy():
    pygame.time.Clock().tick(10)
```

### 优缺点

**优点**：
- ✅ 最可靠的方案
- ✅ 支持任何音频格式
- ✅ 音质好
- ✅ 简单易用

**缺点**：
- ⚠️ 需要手动配对蓝牙
- ⚠️ 蓝牙连接后，语音功能可能受限
- ⚠️ 需要在小爱附近

---

## ⚠️ 方案4: DLNA 投屏

### 检测小爱是否支持DLNA

```bash
npm install upnp-client
```

```typescript
import { Client } from 'upnp-client';

const client = new Client();

client.on('available', (device) => {
  console.log('发现设备:', device.friendlyName);
  console.log('类型:', device.deviceType);

  if (device.friendlyName.includes('小爱')) {
    console.log('找到小爱音箱！');
    // 尝试投屏音频
    device.play('http://your-server.com/audio.mp3', (err) => {
      if (err) console.error('投屏失败:', err);
      else console.log('投屏成功');
    });
  }
});

client.search();
```

### 注意

⚠️ 小爱音箱可能不支持DLNA，需要实际测试。

---

## ❌ 方案5: 直接上传音频（不支持）

```typescript
// ❌ MIoT API 没有这种功能
await httpClient.uploadAudio(audioBuffer);    // 不存在
await httpClient.playAudioFile(filePath);     // 不存在
```

---

## 🎨 完整示例：播放自定义欢迎语

### 场景

当用户回家时，播放自定义的欢迎音频。

### 方案A: TTS（简单但有限）

```typescript
import { XiaomiClient } from './client.js';

const client = new XiaomiClient();
await client.init();

const xiaoai = client.createXiaoAISpeaker('289833424');

// 检测到用户回家（通过门锁、人体传感器等）
onUserArriveHome(async () => {
  await xiaoai.speak('欢迎回家，主人！今天过得怎么样？');
});
```

### 方案B: 蓝牙 + 自定义音频（完美）

```typescript
import { XiaomiClient } from './client.js';
import player from 'play-sound';

const play = player({});
const client = new XiaomiClient();
await client.init();

// 1. 确保小爱已通过蓝牙连接

// 2. 检测到用户回家
onUserArriveHome(async () => {
  // 播放自定义音频（通过蓝牙输出到小爱）
  play.play('/audio/welcome-home.mp3', (err: any) => {
    if (err) console.error('播放失败:', err);
  });
});
```

---

## 🎯 推荐方案总结

### 情况1: 只需要播报文字

**推荐**：TTS（方案1）

```typescript
await xiaoai.speak("您的快递已送达");
```

### 情况2: 需要播放自定义音频/音乐

**推荐**：蓝牙连接（方案3）

```typescript
// 1. 连接蓝牙（一次性设置）
// 2. 播放音频
play.play('custom-audio.mp3');
```

### 情况3: 需要远程控制播放

**推荐**：本地HTTP服务器 + 语音命令（方案2）

```typescript
// 1. 启动HTTP服务器
// 2. 让小爱播放URL
await xiaoai.executeVoiceCommand(
  '播放 http://192.168.1.100:8080/audio/song.mp3'
);
```

---

## 🚀 快速开始：蓝牙方案实现

### 安装依赖

```bash
npm install play-sound
```

### 创建播放器

```typescript
// src/xiaomi/audio-player.ts
import player from 'play-sound';
import { XiaomiClient } from './client.js';

export class XiaoAIAudioPlayer {
  private play = player({});
  private xiaomiClient: XiaomiClient;
  private speakerDid: string;

  constructor(xiaomiClient: XiaomiClient, speakerDid: string) {
    this.xiaomiClient = xiaomiClient;
    this.speakerDid = speakerDid;
  }

  /**
   * 播放音频文件（通过蓝牙）
   */
  async playAudio(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.play.play(filePath, (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * 先播报提示，再播放音频
   */
  async playWithAnnouncement(
    announcement: string,
    audioPath: string
  ): Promise<void> {
    const xiaoai = this.xiaomiClient.createXiaoAISpeaker(this.speakerDid);

    // 先播报
    await xiaoai.speak(announcement);

    // 等待2秒
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 播放音频
    await this.playAudio(audioPath);
  }
}

// 使用示例
const client = new XiaomiClient();
await client.init();

const audioPlayer = new XiaoAIAudioPlayer(client, '289833424');

// 播放欢迎音频
await audioPlayer.playWithAnnouncement(
  '正在为您播放欢迎音乐',
  '/audio/welcome.mp3'
);
```

### CLI 工具

```bash
# 播放音频
node dist/xiaomi/audio-player-cli.js play /path/to/audio.mp3

# 带提示播放
node dist/xiaomi/audio-player-cli.js play-with-tts "正在播放音乐" /path/to/audio.mp3
```

---

## 📝 总结

**问题**："可以让小爱播放我传输的声音？"

**答案**：

| 需求 | 方案 | 可行性 |
|------|------|--------|
| 播报文字 | TTS | ✅ 完全支持 |
| 播放音频文件 | 蓝牙连接 | ✅ 支持（推荐） |
| 播放网络音频 | HTTP + 语音命令 | ⚠️ 需测试 |
| 直接上传音频 | - | ❌ 不支持 |

**最佳实践**：
1. **文字内容** → 使用 TTS
2. **自定义音频** → 使用蓝牙连接
3. **远程控制** → 尝试 HTTP + 语音命令

**立即可用的方案**：
- ✅ TTS（已实现）
- ✅ 蓝牙（需要配对）

需要我帮您实现蓝牙音频播放功能吗？🎵
