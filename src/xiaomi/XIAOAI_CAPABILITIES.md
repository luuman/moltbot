# 小爱音箱完整功能列表

基于 MIoT 规范：`xiaomi.wifispeaker.lx05` (小爱音箱Play 2019款)

---

## 📊 功能概览

小爱音箱通过 MIoT API 提供 6 大服务，共 23 个功能点：

| 服务 | 功能数 | 说明 |
|------|--------|------|
| 设备信息 | 4个属性 | 查询设备基本信息 |
| 音箱控制 | 2个属性 | 音量、静音控制 |
| 播放控制 | 1个属性 + 4个动作 | 播放、暂停、上/下一曲 |
| 麦克风 | 1个属性 | 麦克风静音 |
| 智能语音 | 5个动作 | TTS、音乐、电台、唤醒、命令 |
| 时钟 | 1个动作 | 停止闹钟 |

---

## 1️⃣ 设备信息服务 (Device Information)

**Service ID**: 1

### 可读取的属性：

| 属性ID | 属性名 | 说明 | 类型 | 访问权限 |
|--------|--------|------|------|----------|
| 1 | manufacturer | 设备制造商 | string | 只读 |
| 2 | model | 设备型号 | string | 只读 |
| 3 | serial-number | 设备序列号 | string | 只读 |
| 4 | firmware-revision | 固件版本 | string | 只读 |

### 代码示例：

```typescript
// 获取设备信息
const deviceInfo = await httpClient.getProperties([
  { did: speakerDid, siid: 1, piid: 1 }, // 制造商
  { did: speakerDid, siid: 1, piid: 2 }, // 型号
  { did: speakerDid, siid: 1, piid: 3 }, // 序列号
  { did: speakerDid, siid: 1, piid: 4 }, // 固件版本
]);
```

---

## 2️⃣ 音箱控制服务 (Speaker)

**Service ID**: 2

### 可控制的属性：

| 属性ID | 属性名 | 说明 | 类型 | 范围 | 访问权限 |
|--------|--------|------|------|------|----------|
| 1 | volume | 音量 | uint8 | 5-100 (步进1) | 读写 |
| 2 | mute | 静音 | bool | true/false | 读写 |

### 代码示例：

```typescript
// 设置音量为 50
await httpClient.setProperties([
  { did: speakerDid, siid: 2, piid: 1, value: 50 }
]);

// 读取当前音量
const volume = await httpClient.getProperties([
  { did: speakerDid, siid: 2, piid: 1 }
]);

// 静音
await httpClient.setProperties([
  { did: speakerDid, siid: 2, piid: 2, value: true }
]);

// 取消静音
await httpClient.setProperties([
  { did: speakerDid, siid: 2, piid: 2, value: false }
]);
```

---

## 3️⃣ 播放控制服务 (Play Control)

**Service ID**: 3

### 属性：

| 属性ID | 属性名 | 说明 | 类型 | 可选值 | 访问权限 |
|--------|--------|------|------|--------|----------|
| 1 | playing-state | 播放状态 | uint8 | 0=空闲, 1=播放中 | 只读 |

### 动作 (Actions)：

| 动作ID | 动作名 | 说明 | 输入参数 | 输出 |
|--------|--------|------|----------|------|
| 1 | play | 播放 | 无 | 无 |
| 2 | pause | 暂停 | 无 | 无 |
| 3 | next | 下一曲 | 无 | 无 |
| 4 | previous | 上一曲 | 无 | 无 |

### 代码示例：

```typescript
// 播放
await httpClient.executeAction({
  did: speakerDid,
  siid: 3,
  aiid: 1,
  in: []
});

// 暂停
await httpClient.executeAction({
  did: speakerDid,
  siid: 3,
  aiid: 2,
  in: []
});

// 下一曲
await httpClient.executeAction({
  did: speakerDid,
  siid: 3,
  aiid: 3,
  in: []
});

// 上一曲
await httpClient.executeAction({
  did: speakerDid,
  siid: 3,
  aiid: 4,
  in: []
});

// 获取播放状态
const state = await httpClient.getProperties([
  { did: speakerDid, siid: 3, piid: 1 }
]);
// state[0].value: 0=空闲, 1=播放中
```

---

## 4️⃣ 麦克风服务 (Microphone)

**Service ID**: 4

### 可控制的属性：

| 属性ID | 属性名 | 说明 | 类型 | 访问权限 |
|--------|--------|------|------|----------|
| 1 | mute | 麦克风静音 | bool | 读写 |

### 代码示例：

```typescript
// 禁用麦克风（硬件静音）
await httpClient.setProperties([
  { did: speakerDid, siid: 4, piid: 1, value: true }
]);

// 启用麦克风
await httpClient.setProperties([
  { did: speakerDid, siid: 4, piid: 1, value: false }
]);

// 查询麦克风状态
const micState = await httpClient.getProperties([
  { did: speakerDid, siid: 4, piid: 1 }
]);
```

---

## 5️⃣ 智能语音服务 (Intelligent Speaker) ⭐核心功能

**Service ID**: 5

### 动作 (Actions)：

| 动作ID | 动作名 | 说明 | 输入参数 | 输出 |
|--------|--------|------|----------|------|
| 1 | **play-text** | **TTS 播报文字** | [text] | 无 |
| 2 | play-music | 播放音乐 | 无 | 无 |
| 3 | wake-up | 唤醒小爱 | 无 | 无 |
| 4 | play-radio | 播放电台 | 无 | 无 |
| 5 | **execute-text-directive** | **执行语音命令** | [text, silent] | 无 |

### 代码示例：

#### 1. TTS 播报 (让小爱说话)

```typescript
// 最常用的功能！
await xiaoai.speak("你好，我是小爱音箱");
await xiaoai.speak("现在是北京时间下午3点25分");
await xiaoai.speak("主人，您的快递已经到了");

// 底层实现
await httpClient.executeAction({
  did: speakerDid,
  siid: 5,
  aiid: 1,  // play-text
  in: ["你好，我是小爱音箱"]
});
```

#### 2. 播放音乐

```typescript
await httpClient.executeAction({
  did: speakerDid,
  siid: 5,
  aiid: 2,  // play-music
  in: []
});
```

#### 3. 唤醒小爱

```typescript
// 模拟"小爱同学"唤醒
await httpClient.executeAction({
  did: speakerDid,
  siid: 5,
  aiid: 3,  // wake-up
  in: []
});
```

#### 4. 播放电台

```typescript
await httpClient.executeAction({
  did: speakerDid,
  siid: 5,
  aiid: 4,  // play-radio
  in: []
});
```

#### 5. 执行语音命令 (模拟说话给小爱听)

```typescript
// 模拟你对小爱说话
await xiaoai.executeVoiceCommand("现在几点了");
await xiaoai.executeVoiceCommand("今天天气怎么样");
await xiaoai.executeVoiceCommand("播放周杰伦的歌");

// 静默执行（不要语音反馈）
await xiaoai.sendCommandSilently("打开客厅灯");

// 底层实现
await httpClient.executeAction({
  did: speakerDid,
  siid: 5,
  aiid: 5,  // execute-text-directive
  in: ["现在几点了", false]  // [命令文字, 是否静默]
});
```

---

## 6️⃣ 时钟服务 (Clock)

**Service ID**: 6

### 动作 (Actions)：

| 动作ID | 动作名 | 说明 | 输入参数 | 输出 |
|--------|--------|------|----------|------|
| 1 | stop-alarm | 停止闹钟 | 无 | 无 |

### 代码示例：

```typescript
// 停止正在响的闹钟
await httpClient.executeAction({
  did: speakerDid,
  siid: 6,
  aiid: 1,  // stop-alarm
  in: []
});
```

---

## 🎯 常用场景示例

### 场景 1: 智能家居语音反馈

```typescript
// 当灯光被打开时，播报状态
await xiaoai.speak("客厅灯已打开");

// 当门铃响起时
await xiaoai.speak("主人，有人在门口");

// 温度过高时
await xiaoai.speak("注意，室内温度已超过30度");
```

### 场景 2: 定时播报

```typescript
// 每小时播报时间
setInterval(async () => {
  const now = new Date();
  await xiaoai.speak(`现在是${now.getHours()}点整`);
}, 3600000);

// 早晨播报天气
const weather = await getWeather();
await xiaoai.speak(`早上好，今天${weather.description}，温度${weather.temp}度`);
```

### 场景 3: 交互式控制

```typescript
// 用户: "小爱同学，打开灯"
// 小爱识别并执行

// 通过我们的代码确认
await xiaoai.speak("好的，已为您打开客厅灯");
```

### 场景 4: 音乐播放控制

```typescript
// 播放音乐
await httpClient.executeAction({
  did: speakerDid,
  siid: 5,
  aiid: 2,  // play-music
  in: []
});

// 调整音量
await httpClient.setProperties([
  { did: speakerDid, siid: 2, piid: 1, value: 30 }  // 音量30
]);

// 暂停
await httpClient.executeAction({
  did: speakerDid,
  siid: 3,
  aiid: 2,  // pause
  in: []
});

// 下一曲
await httpClient.executeAction({
  did: speakerDid,
  siid: 3,
  aiid: 3,  // next
  in: []
});
```

### 场景 5: 闹钟管理

```typescript
// 停止闹钟
await httpClient.executeAction({
  did: speakerDid,
  siid: 6,
  aiid: 1,  // stop-alarm
  in: []
});

// 播报提醒
await xiaoai.speak("闹钟已关闭");
```

---

## 🚫 无法实现的功能

以下功能 **MIoT API 不支持**：

| 功能 | 说明 | 原因 |
|------|------|------|
| ❌ 监听麦克风 | 无法获取语音输入 | 隐私保护 |
| ❌ 获取语音识别结果 | 无法拦截识别文字 | 安全限制 |
| ❌ 修改唤醒词 | 无法改成"贾维斯" | 系统限制 |
| ❌ 查看对话历史 | 无法获取聊天记录 | 隐私保护 |
| ❌ 自定义技能触发 | 需要开放平台 | 需要认证 |
| ❌ 设置闹钟 | 只能停止闹钟 | API限制 |

---

## 📝 完整 API 参考

### 已实现的方法 (在我们的代码中)

#### XiaomiClient
```typescript
- login() / loginWithCode()
- loadDevices()
- getXiaoAISpeakers()
- createXiaoAISpeaker(did)
```

#### XiaoAISpeaker
```typescript
- speak(text)                        // TTS播报
- executeVoiceCommand(text, silent)  // 语音命令
- sendCommand(text)                  // 语音命令
- sendCommandSilently(text)          // 静默语音命令
```

#### XiaomiHttpClient (底层API)
```typescript
- getProperties(params)              // 读取属性
- setProperties(params)              // 设置属性
- executeAction(action)              // 执行动作
```

### CLI 命令
```bash
node dist/xiaomi/cli.js speak <did> <text>          # TTS播报
node dist/xiaomi/cli.js command <did> <cmd>         # 语音命令
node dist/xiaomi/cli.js command-silent <did> <cmd>  # 静默命令
```

---

## 🎨 创意应用场景

### 1. 智能门铃通知
```typescript
// 门铃响起时
await xiaoai.speak("主人，有客人来访");
```

### 2. 快递到达提醒
```typescript
// 收到快递通知时
await xiaoai.speak("您的快递已送达，请及时领取");
```

### 3. 烹饪计时器
```typescript
// 定时器到时
await xiaoai.speak("时间到，您的菜已经煮好了");
```

### 4. 宠物喂食提醒
```typescript
// 定时提醒
await xiaoai.speak("该给喵星人喂食了");
```

### 5. 会议提醒
```typescript
// 会议前5分钟
await xiaoai.speak("注意，您的会议将在5分钟后开始");
```

### 6. 健康提醒
```typescript
// 久坐提醒
await xiaoai.speak("您已经坐了一个小时了，起来活动一下吧");
```

---

## 总结

**小爱音箱核心能力**：
- ✅ **TTS 播报** - 最常用，让小爱说任何文字
- ✅ **语音命令** - 模拟对小爱说话
- ✅ **音量控制** - 调节音量和静音
- ✅ **播放控制** - 播放/暂停/上一曲/下一曲
- ✅ **麦克风控制** - 禁用/启用麦克风
- ✅ **闹钟控制** - 停止闹钟

**最佳实践**：
1. **TTS 播报**用于主动通知和反馈
2. **语音命令**用于自动化控制（模拟用户操作）
3. **音量控制**根据场景调整（夜间降低音量）
4. **麦克风控制**用于隐私保护

**限制**：
- 无法监听语音输入
- 无法修改唤醒词
- 无法设置闹钟（只能停止）
