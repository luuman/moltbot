# 小爱音箱：我们能知道什么 vs 不能知道什么

## ❌ 我们**不能知道**的（通过 MIoT API）

### 1. 用户语音输入

| 场景 | 能否知道 | 说明 |
|------|---------|------|
| 用户说："小爱同学，现在几点了" | ❌ 不知道 | 无法获取语音识别结果 |
| 用户说："小爱同学，播放音乐" | ❌ 不知道 | 无法监听语音命令 |
| 用户说："小爱同学，设置闹钟" | ❌ 不知道 | 无法获取命令历史 |

**原因**：隐私保护，MIoT API 不提供语音监听功能

---

### 2. 小爱的响应内容

| 场景 | 能否知道 | 说明 |
|------|---------|------|
| 小爱回答："现在是下午3点" | ❌ 不知道 | 无法获取 TTS 内容 |
| 小爱说："好的，已为您播放音乐" | ❌ 不知道 | 无法监听播报内容 |
| 小爱回答天气 | ❌ 不知道 | 除非是我们发送的 TTS |

**例外**：只有我们通过 `executeAction` 发送的 TTS，我们自己知道内容

```typescript
// 我们发送的 TTS，我们知道内容
await xiaoai.speak("你好，主人");
// ↑ 我们知道小爱会说"你好，主人"

// 但用户问"小爱同学，天气怎么样"
// 小爱回答的内容 → ❌ 我们不知道
```

---

### 3. 正在播放的内容

| 场景 | 能否知道 | 说明 |
|------|---------|------|
| 正在播放的歌曲名称 | ❌ 不知道 | 只能知道"播放中" |
| 正在播放的艺术家 | ❌ 不知道 | 无此属性 |
| 播放进度 | ❌ 不知道 | 无此属性 |
| 播放列表 | ❌ 不知道 | 无此属性 |

**我们只能知道**：
- ✅ 是否在播放（playing-state: 0=空闲, 1=播放中）
- ❌ 播放什么 - 不知道！

```typescript
// 查询播放状态
const state = await httpClient.getProperties([
  { did: speakerDid, siid: 3, piid: 1 }
]);

if (state[0].value === 1) {
  console.log('正在播放');
  // 但是播放什么？❌ 不知道！
}
```

---

### 4. 闹钟和定时器

| 功能 | 能否知道 | 说明 |
|------|---------|------|
| 查看已设置的闹钟 | ❌ 不知道 | 无查询 API |
| 查看定时器 | ❌ 不知道 | 无查询 API |
| 闹钟何时响 | ❌ 不知道 | 无查询 API |

**我们只能**：
- ✅ 停止正在响的闹钟（executeAction: stop-alarm）
- ❌ 查询闹钟列表 - 不知道！
- ❌ 设置新闹钟 - 只能通过语音命令让小爱设置

---

### 5. 对话历史

| 内容 | 能否知道 | 说明 |
|------|---------|------|
| 最近的对话 | ❌ 不知道 | 无历史记录 API |
| 执行的命令 | ❌ 不知道 | 无命令日志 |
| 用户询问的问题 | ❌ 不知道 | 隐私保护 |

---

### 6. 智能家居状态（通过小爱控制的）

| 场景 | 能否知道 | 说明 |
|------|---------|------|
| 用户说："小爱，打开灯" | ❌ 不知道 | 无法监听命令 |
| 小爱执行：打开灯 | ❌ 不知道小爱执行了 | 只能查询灯的状态 |

**注意**：我们可以直接查询智能设备状态，但无法知道是小爱控制的还是用户手动控制的

```typescript
// 可以查询灯的状态
const lightState = await httpClient.getProperties([
  { did: lightDid, siid: 2, piid: 1 }
]);

// 但不知道：
// - 是用户通过小爱打开的？
// - 还是用户手动打开的？
// - 还是定时任务打开的？
```

---

## ✅ 我们**能知道**的（极少数）

### 1. 设备基本信息

```typescript
// ✅ 可以查询
const info = await httpClient.getProperties([
  { did: speakerDid, siid: 1, piid: 1 }, // 制造商
  { did: speakerDid, siid: 1, piid: 2 }, // 型号
  { did: speakerDid, siid: 1, piid: 3 }, // 序列号
  { did: speakerDid, siid: 1, piid: 4 }, // 固件版本
]);
```

### 2. 音量状态

```typescript
// ✅ 可以查询和设置
const volume = await httpClient.getProperties([
  { did: speakerDid, siid: 2, piid: 1 }
]);

console.log('当前音量:', volume[0].value); // 0-100
```

### 3. 静音状态

```typescript
// ✅ 可以查询和设置
const muted = await httpClient.getProperties([
  { did: speakerDid, siid: 2, piid: 2 }
]);

console.log('是否静音:', muted[0].value); // true/false
```

### 4. 播放状态（仅状态，不知道内容）

```typescript
// ✅ 可以查询
const playing = await httpClient.getProperties([
  { did: speakerDid, siid: 3, piid: 1 }
]);

console.log('播放状态:', playing[0].value); // 0=空闲, 1=播放中

// ❌ 但不知道播放什么！
```

### 5. 麦克风状态

```typescript
// ✅ 可以查询和设置
const micMuted = await httpClient.getProperties([
  { did: speakerDid, siid: 4, piid: 1 }
]);

console.log('麦克风是否静音:', micMuted[0].value);
```

### 6. 我们主动发送的命令

```typescript
// ✅ 我们知道自己发送了什么
await xiaoai.speak("你好，主人");
// ↑ 我们知道小爱会播报这个

await httpClient.executeAction({
  did: speakerDid,
  siid: 5,
  aiid: 2, // play-music
  in: []
});
// ↑ 我们知道自己让小爱播放音乐了

// ❌ 但用户对小爱说的话，我们不知道！
```

---

## 📊 完整对比表

| 类别 | 具体内容 | 能否知道 | API |
|------|---------|---------|-----|
| **设备信息** | 制造商、型号、序列号 | ✅ 能 | getProperties |
| **音量** | 当前音量、静音状态 | ✅ 能 | getProperties |
| **播放** | 是否在播放 | ✅ 能（仅状态） | getProperties |
| | 播放什么内容 | ❌ 不能 | - |
| | 播放进度 | ❌ 不能 | - |
| **麦克风** | 是否静音 | ✅ 能 | getProperties |
| **用户输入** | 用户说了什么 | ❌ 不能 | - |
| | 语音命令历史 | ❌ 不能 | - |
| **小爱响应** | 小爱说了什么 | ❌ 不能 | - |
| | TTS内容（我们发的除外） | ❌ 不能 | - |
| **闹钟** | 闹钟列表 | ❌ 不能 | - |
| | 停止闹钟 | ✅ 能（仅停止） | executeAction |
| **对话** | 对话历史 | ❌ 不能 | - |
| | 当前对话内容 | ❌ 不能 | - |

---

## 🎯 核心结论

### 我们能做的（主动控制）

```typescript
// ✅ 让小爱做事
await xiaoai.speak("你好");           // TTS播报
await playMusic();                    // 播放音乐
await pause();                        // 暂停
await setVolume(50);                  // 设置音量

// ✅ 查询状态
const volume = await getVolume();     // 音量
const isPlaying = await getState();   // 播放状态
const isMuted = await getMute();      // 静音状态
```

### 我们不能做的（被动监听）

```typescript
// ❌ 监听用户
on('userSpeak', ...)                  // 无此功能
on('voiceCommand', ...)               // 无此功能
getVoiceHistory()                     // 无此功能

// ❌ 监听小爱
on('xiaoaiSpeak', ...)                // 无此功能
getCurrentTTS()                       // 无此功能
getPlayingContent()                   // 无此功能

// ❌ 查询任务
getAlarms()                           // 无此功能
getTimers()                           // 无此功能
getConversationHistory()              // 无此功能
```

---

## 💡 为什么这样设计？

### 1. 隐私保护
- 用户的语音输入属于隐私
- 对话历史属于敏感信息
- 小米不允许第三方随意访问

### 2. 安全考虑
- 防止恶意应用监听用户
- 防止语音数据泄露
- 符合隐私法规要求

### 3. 系统限制
- MIoT 协议主要用于设备控制，不是监控
- 智能音箱的核心功能在小米云端
- 本地 API 只提供基础控制

---

## 🚀 如果你真的需要监听...

### 方案 1: 小爱开放平台技能（推荐）

可以接收到：
- ✅ 用户说的话（识别后的文字）
- ✅ 触发技能的命令
- ✅ NLU 解析的槽位

**但仍然接收不到**：
- ❌ 不是针对你技能的命令
- ❌ 用户的日常对话
- ❌ 小爱的其他任务

**示例**：
```typescript
// 用户: "小爱同学，让贾维斯查询天气"
// ✅ 你能收到: { query: "查询天气" }

// 用户: "小爱同学，现在几点了"
// ❌ 你收不到（不是针对你的技能）
```

### 方案 2: 本地麦克风 + 语音识别

自己架设：
- 麦克风
- Whisper/Vosk 语音识别
- 唤醒词检测

**优势**：
- ✅ 完全控制
- ✅ 可以监听所有声音

**劣势**：
- ❌ 需要额外硬件
- ❌ 实现复杂

---

## 📋 实际使用建议

### 场景 1: 主动通知

```typescript
// ✅ 适合：我们主动让小爱播报
setInterval(async () => {
  const weather = await getWeather();
  await xiaoai.speak(`今天${weather.desc}，温度${weather.temp}度`);
}, 3600000);
```

### 场景 2: 被动响应

```typescript
// ❌ 不适合：等用户问了才回答
// MIoT API 做不到，需要用小爱技能

// ✅ 小爱技能方案：
app.post('/api/xiaoai/jarvis', (req, res) => {
  const { query } = req.body;
  // 用户问："天气怎么样"
  // 我们可以收到并回答
});
```

---

## 总结

**问题**："小爱在执行什么任务，我们不知道？"

**答案**：**对的，基本上不知道！**

我们只能：
- ✅ 主动控制小爱做事
- ✅ 查询少数几个状态（音量、播放状态、麦克风）
- ❌ 不能知道用户说了什么
- ❌ 不能知道小爱正在做什么任务
- ❌ 不能知道小爱说了什么（除了我们发的）
- ❌ 不能监听对话历史

**解决方案**：
1. 接受限制，只做主动控制
2. 使用小爱开放平台技能（部分监听）
3. 使用本地麦克风 + 语音识别（完全监听）
