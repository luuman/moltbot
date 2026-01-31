# Xiaomi Home Integration

小米智能家居集成，支持小爱音箱控制。

## 功能特性

- ✅ OAuth2 登录认证
- ✅ 获取设备列表
- ✅ 小爱音箱 TTS 控制
- ✅ 配置持久化存储
- ✅ Token 自动刷新

## 快速开始

### 1. 安装依赖

本模块已集成到 moltbot 中，无需额外安装依赖。

### 2. 初始化客户端

```typescript
import XiaomiClient from './xiaomi/index.js';

const client = new XiaomiClient({
  cloud_server: 'cn', // 'cn' | 'de' | 'us' | 'sg' | 'ru' | 'i2'
  redirect_url: 'http://localhost:8123/xiaomi/callback',
});

await client.init();
```

### 3. 登录

```typescript
// 生成授权 URL
const authUrl = client.getAuthUrl();
console.log('请访问以下 URL 登录:', authUrl);

// 用户登录后会重定向到 redirect_url?code=xxx
// 使用 code 完成登录
const userInfo = await client.loginWithCode(code);
console.log('登录成功:', userInfo.miliaoNick);
```

### 4. 加载设备

```typescript
// 加载所有设备
const devices = await client.loadDevices();

// 获取小爱音箱
const speakers = client.getXiaoAISpeakers();
console.log('找到小爱音箱:', speakers);
```

### 5. 控制小爱音箱

```typescript
// 创建小爱音箱控制器
const xiaoai = client.createXiaoAISpeaker(deviceId);

// TTS 播报
await xiaoai.speak('你好，我是小爱同学');

// 静默执行命令
await xiaoai.executeCommandSilently('打开卧室灯');

// 播放音效
await xiaoai.playSound('开始工作');
```

## API 文档

### XiaomiClient

主客户端类。

#### 构造函数

```typescript
new XiaomiClient(config?: XiaomiClientConfig)
```

配置选项：
- `cloud_server`: 云服务器区域 ('cn', 'de', 'us', 'sg', 'ru', 'i2')
- `client_id`: OAuth2 客户端 ID (默认使用官方 ID)
- `redirect_url`: OAuth2 重定向 URL
- `storage_path`: 配置存储路径

#### 方法

- `init()`: 初始化客户端，加载已保存的配置
- `getAuthUrl()`: 获取 OAuth2 授权 URL
- `loginWithCode(code)`: 使用授权码登录
- `loadDevices(force?)`: 加载设备列表
- `getDevices()`: 获取已加载的设备
- `getXiaoAISpeakers()`: 获取小爱音箱列表
- `createXiaoAISpeaker(deviceId)`: 创建小爱音箱控制器
- `isLoggedIn()`: 检查是否已登录
- `logout()`: 登出并清除所有数据

### XiaoAISpeaker

小爱音箱控制器。

#### 方法

- `speak(text, silent?)`: TTS 播报
- `executeCommandSilently(command)`: 静默执行命令
- `playSound(sound)`: 播放音效
- `getDeviceInfo()`: 获取设备信息
- `isOnline()`: 检查设备是否在线

## 配置文件

配置默认保存在 `~/.moltbot/xiaomi/xiaomi_config.json`，包含：

```json
{
  "cloud_server": "cn",
  "client_id": "2882303761520251711",
  "redirect_url": "http://localhost:8123",
  "token": {
    "access_token": "...",
    "refresh_token": "...",
    "expires_in": 7200,
    "expires_ts": 1234567890
  },
  "user_info": {
    "userId": "...",
    "miliaoNick": "..."
  },
  "devices": {...},
  "homes": {...}
}
```

## 注意事项

1. **OAuth2 登录流程**：
   - 需要用户在浏览器中完成登录
   - 获取授权码后才能完成登录
   - Token 会自动刷新

2. **设备型号**：
   - 小爱音箱通常为 `wifi-speaker` 类型
   - 常见型号：`xiaomi.wifispeaker.s12`, `xiaomi.wifispeaker.lx06` 等

3. **API 参数**：
   - 小爱音箱的 service/action ID 可能因型号而异
   - 默认使用 siid=5, aiid=5，可通过配置覆盖

4. **网络要求**：
   - 中国大陆服务器: `ha.api.io.mi.com`
   - 其他区域服务器有不同域名

## 错误处理

```typescript
import { XiaomiOAuthError, XiaomiHttpError, XiaomiStorageError } from './xiaomi/index.js';

try {
  await client.loginWithCode(code);
} catch (error) {
  if (error instanceof XiaomiOAuthError) {
    console.error('OAuth 错误:', error.message);
  } else if (error instanceof XiaomiHttpError) {
    console.error('HTTP 错误:', error.message, error.statusCode);
  } else if (error instanceof XiaomiStorageError) {
    console.error('存储错误:', error.message);
  }
}
```

## 参考资料

- [ha_xiaomi_home](https://github.com/XiaoMi/ha_xiaomi_home) - Home Assistant 小米智能家居集成
- [MIoT Spec](https://iot.mi.com/v2/new/doc/introduction/knowledge/spec) - MIoT 规范文档

## 许可证

本实现基于 [ha_xiaomi_home](https://github.com/XiaoMi/ha_xiaomi_home) 项目，仅供个人非商业用途。
