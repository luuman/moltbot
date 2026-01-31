# Jarvis 语音助手实现方案

## 🎯 目标

创建一个类似钢铁侠 Jarvis 的智能语音助手：
- 自定义唤醒词（例如"贾维斯"）
- 本地语音识别
- 通过小爱音箱播报响应
- 可扩展的命令处理系统

## 📋 方案对比

### 方案 A：本地语音识别 + 小爱 TTS（推荐 ⭐⭐⭐⭐⭐）

**架构**：
```
麦克风 → 语音识别 → 唤醒词检测 → 命令处理 → 小爱 TTS
```

**优点**：
- ✅ 完全可控，隐私保护
- ✅ 自定义唤醒词
- ✅ 可扩展命令系统
- ✅ 无需审核

**所需组件**：
1. 麦克风（USB 麦克风 or 树莓派音频模块）
2. 语音识别引擎（Whisper / Vosk）
3. 命令处理逻辑
4. 小爱音箱（播报响应）

---

### 方案 B：小爱开放平台技能

**流程**：
```
用户语音 → 小米云识别 → 自定义技能 → 你的服务器 → 小米云 → 小爱播报
```

**优点**：
- ✅ 官方支持
- ✅ 无需本地语音识别

**缺点**：
- ❌ 需要开发者认证
- ❌ 需要运行服务器
- ❌ 审核流程复杂

---

## 🚀 方案 A 实现指南（推荐）

### 1. 安装依赖

#### 1.1 语音识别引擎选择

**选项 1: OpenAI Whisper（精度高，需要 GPU）**
```bash
# Python 环境
pip install openai-whisper

# 或使用 whisper.cpp (更快)
git clone https://github.com/ggerganov/whisper.cpp
cd whisper.cpp && make
```

**选项 2: Vosk（离线，轻量）**
```bash
pip install vosk

# 下载中文模型
wget https://alphacephei.com/vosk/models/vosk-model-cn-0.22.zip
unzip vosk-model-cn-0.22.zip
```

#### 1.2 麦克风录音

```bash
npm install node-record-lpcm16
# 或
npm install mic
```

### 2. 实现语音识别服务

创建 `src/xiaomi/voice-recognition.ts`：

```typescript
import { spawn } from 'node:child_process';
import mic from 'mic';

export class VoiceRecognition {
  private modelPath: string;

  constructor(modelPath: string) {
    this.modelPath = modelPath;
  }

  /**
   * 实时识别语音
   */
  async recognizeStream(callback: (text: string) => void): Promise<void> {
    // 使用 Vosk 实时识别
    const vosk = spawn('python3', ['-c', `
import sys
import json
from vosk import Model, KaldiRecognizer

model = Model("${this.modelPath}")
rec = KaldiRecognizer(model, 16000)

while True:
    data = sys.stdin.buffer.read(4000)
    if len(data) == 0:
        break
    if rec.AcceptWaveform(data):
        result = json.loads(rec.Result())
        if 'text' in result:
            print(result['text'], flush=True)
    `]);

    // 麦克风输入
    const micInstance = mic({
      rate: '16000',
      channels: '1',
      debug: false,
    });

    const micInputStream = micInstance.getAudioStream();
    micInputStream.pipe(vosk.stdin);

    vosk.stdout.on('data', (data) => {
      const text = data.toString().trim();
      if (text) {
        callback(text);
      }
    });

    micInstance.start();
  }
}
```

### 3. 实现唤醒词检测

```typescript
export class WakeWordDetector {
  private wakeWord: string;

  constructor(wakeWord: string) {
    this.wakeWord = wakeWord.toLowerCase();
  }

  /**
   * 检测是否包含唤醒词
   */
  detect(text: string): { detected: boolean; command?: string } {
    const normalized = text.toLowerCase();

    if (normalized.includes(this.wakeWord)) {
      // 提取唤醒词后的命令
      const command = text
        .replace(new RegExp(this.wakeWord, 'i'), '')
        .trim();

      return { detected: true, command };
    }

    return { detected: false };
  }
}
```

### 4. 实现命令处理器

```typescript
export interface CommandHandler {
  pattern: RegExp;
  handle: (command: string) => Promise<string>;
}

export class CommandProcessor {
  private handlers: CommandHandler[] = [];

  /**
   * 注册命令处理器
   */
  register(pattern: RegExp, handler: (cmd: string) => Promise<string>): void {
    this.handlers.push({ pattern, handle: handler });
  }

  /**
   * 处理命令
   */
  async process(command: string): Promise<string> {
    for (const handler of this.handlers) {
      if (handler.pattern.test(command)) {
        return await handler.handle(command);
      }
    }

    return `收到命令：${command}。抱歉，我还不知道如何处理。`;
  }
}

// 使用示例
const processor = new CommandProcessor();

// 时间查询
processor.register(/时间|几点/, async () => {
  const now = new Date();
  return `现在是${now.getHours()}点${now.getMinutes()}分`;
});

// 天气查询
processor.register(/天气/, async (cmd) => {
  // TODO: 调用天气 API
  return '今天天气晴朗，温度25度';
});

// 智能家居控制
processor.register(/打开|关闭/, async (cmd) => {
  if (cmd.includes('灯')) {
    // TODO: 控制智能灯
    return '已为您打开灯';
  }
  return '请说明要控制的设备';
});
```

### 5. 完整的 Jarvis CLI

创建 `src/xiaomi/jarvis-cli.ts`：

```typescript
import { XiaomiClient } from './client.js';
import { JarvisAssistant } from './jarvis-assistant.js';
import { VoiceRecognition } from './voice-recognition.js';
import { WakeWordDetector } from './wake-word-detector.js';
import { CommandProcessor } from './command-processor.js';

async function main() {
  // 1. 初始化小米客户端
  const xiaomiClient = new XiaomiClient();
  await xiaomiClient.init();

  if (!await xiaomiClient.isLoggedIn()) {
    console.error('请先登录: node dist/xiaomi/cli.js login');
    process.exit(1);
  }

  // 2. 加载设备，找到小爱音箱
  await xiaomiClient.loadDevices();
  const speakers = xiaomiClient.getXiaoAISpeakers();

  if (speakers.length === 0) {
    console.error('未找到小爱音箱');
    process.exit(1);
  }

  const speakerDid = speakers[0].did;
  console.log(`🔊 使用小爱音箱: ${speakers[0].name} (${speakerDid})`);

  // 3. 初始化语音识别
  const voiceRec = new VoiceRecognition('/path/to/vosk-model');
  const wakeWord = new WakeWordDetector('贾维斯');
  const cmdProcessor = new CommandProcessor();

  // 4. 注册命令
  setupCommands(cmdProcessor, xiaomiClient);

  // 5. 启动 Jarvis
  console.log('🤖 贾维斯已启动，请说"贾维斯"来唤醒我...');

  voiceRec.recognizeStream(async (text) => {
    console.log(`📝 识别: ${text}`);

    const result = wakeWord.detect(text);
    if (result.detected && result.command) {
      console.log(`⚡ 命令: ${result.command}`);

      const response = await cmdProcessor.process(result.command);
      console.log(`💬 响应: ${response}`);

      // 通过小爱播报
      const xiaoai = xiaomiClient.createXiaoAISpeaker(speakerDid);
      await xiaoai.speak(response);
    }
  });
}

function setupCommands(processor: CommandProcessor, client: XiaomiClient) {
  // 时间
  processor.register(/时间|几点/, async () => {
    const now = new Date();
    return `现在是${now.getHours()}点${now.getMinutes()}分`;
  });

  // 日期
  processor.register(/日期|今天/, async () => {
    const now = new Date();
    return `今天是${now.getMonth() + 1}月${now.getDate()}日`;
  });

  // 设备列表
  processor.register(/设备|有什么/, async () => {
    const devices = Object.values(client.getDevices() || {});
    return `您有${devices.length}个设备：${devices.map(d => d.name).join('、')}`;
  });

  // 默认
  processor.register(/.*/, async (cmd) => {
    return `收到命令：${cmd}`;
  });
}

main().catch(console.error);
```

### 6. 运行

```bash
# 1. 编译
npm run build

# 2. 启动 Jarvis
node dist/xiaomi/jarvis-cli.js

# 3. 说话测试
# "贾维斯，现在几点了"
# "贾维斯，今天几号"
# "贾维斯，我有什么设备"
```

## 🎨 高级功能扩展

### 1. 接入 ChatGPT/Claude

```typescript
processor.register(/.*/, async (cmd) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: '你是贾维斯，钢铁侠的智能助手' },
        { role: 'user', content: cmd },
      ],
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content;
});
```

### 2. 多轮对话

```typescript
class ConversationManager {
  private history: Array<{role: string; content: string}> = [];

  addMessage(role: string, content: string) {
    this.history.push({ role, content });
    // 保持最近10轮对话
    if (this.history.length > 20) {
      this.history = this.history.slice(-20);
    }
  }

  getHistory() {
    return this.history;
  }
}
```

### 3. 智能家居控制

```typescript
processor.register(/打开|关闭/, async (cmd) => {
  // 解析设备和动作
  const action = cmd.includes('打开') ? 'on' : 'off';
  const deviceName = cmd.replace(/打开|关闭/, '').trim();

  // 查找设备
  const devices = Object.values(client.getDevices() || {});
  const device = devices.find(d => d.name.includes(deviceName));

  if (!device) {
    return `没有找到设备：${deviceName}`;
  }

  // TODO: 控制设备
  return `已为您${action === 'on' ? '打开' : '关闭'}${device.name}`;
});
```

## 📝 总结

**推荐方案**：本地语音识别 + 小爱 TTS

**实现步骤**：
1. ✅ 已完成：小爱音箱登录和控制
2. ⏳ 待实现：语音识别服务（Vosk/Whisper）
3. ⏳ 待实现：唤醒词检测
4. ⏳ 待实现：命令处理器
5. ⏳ 待实现：集成测试

**您想要**：
- [ ] 方案A：完整实现本地语音识别？
- [ ] 方案B：简化版（手动输入命令，小爱播报）？
- [ ] 方案C：小爱开放平台技能？

请告诉我您的选择，我可以继续实现！🚀
