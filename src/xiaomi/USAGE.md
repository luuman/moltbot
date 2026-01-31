# 小米智能家居集成 - 使用指南

## 🎯 功能概述

已完成的功能：
- ✅ OAuth2 登录认证
- ✅ 自动 Token 刷新
- ✅ 获取设备列表
- ✅ 小爱音箱 TTS 控制
- ✅ 配置持久化存储
- ✅ CLI 命令行工具

## 📦 安装

集成已包含在 moltbot 中，无需额外安装。编译后即可使用：

```bash
pnpm build
```

## 🚀 快速开始

### 方法 1: 使用 CLI 工具 (推荐新手)

#### 1. 开始登录

```bash
node dist/xiaomi/cli.js login
```

会输出一个小米账号登录 URL，例如：
```
https://account.xiaomi.com/oauth2/authorize?redirect_uri=...
```

#### 2. 浏览器登录

1. 复制上面的 URL 并在浏览器中打开
2. 使用你的小米账号登录（手机号/邮箱 + 密码）
3. 如果需要验证码，按提示输入
4. 登录成功后，浏览器会跳转到 `http://localhost:8123?code=xxxxx`
5. 复制 URL 中的 `code` 参数值

#### 3. 完成登录

```bash
node dist/xiaomi/cli.js login-code <你的code>
```

成功后会显示：
```
✓ 登录成功: 你的昵称 (UID)
✓ 加载了 XX 个设备
✓ 找到 X 个小爱音箱
```

#### 4. 查看小爱音箱

```bash
node dist/xiaomi/cli.js speakers
```

输出示例：
```
找到 2 个小爱音箱:

  🟢 小爱音箱Pro
     型号: xiaomi.wifispeaker.lx06
     DID: 123456789

  🟢 卧室小爱
     型号: xiaomi.wifispeaker.s12
     DID: 987654321
```

#### 5. 让小爱音箱说话

```bash
node dist/xiaomi/cli.js speak <DID> "你好，今天天气真好"
```

例如：
```bash
node dist/xiaomi/cli.js speak 123456789 "现在是北京时间12点整"
```

#### 6. 静默执行命令

```bash
node dist/xiaomi/cli.js speak-silent <DID> "打开卧室灯"
```

### 方法 2: 使用代码集成

```typescript
import { XiaomiClient } from './xiaomi/client.js';

async function example() {
  // 1. 创建客户端
  const client = new XiaomiClient({
    cloud_server: 'cn', // 'cn' | 'de' | 'us' | 'sg' | 'ru' | 'i2'
  });

  // 2. 初始化
  await client.init();

  // 3. 登录（首次使用）
  if (!(await client.isLoggedIn())) {
    const authUrl = client.getAuthUrl();
    console.log('请访问:', authUrl);
    // 用户登录后获得 code，然后:
    // await client.loginWithCode(code);
    return;
  }

  // 4. 加载设备
  await client.loadDevices();

  // 5. 获取小爱音箱
  const speakers = client.getXiaoAISpeakers();

  // 6. 控制小爱音箱
  if (speakers.length > 0) {
    const xiaoai = client.createXiaoAISpeaker(speakers[0].did);
    await xiaoai.speak('你好，我是小爱同学');
  }
}
```

## 📋 CLI 命令参考

### 登录相关

- `xiaomi login` - 获取登录 URL
- `xiaomi login-code <code>` - 使用授权码完成登录
- `xiaomi logout` - 登出并清除所有数据
- `xiaomi info` - 显示当前登录信息

### 设备管理

- `xiaomi devices` - 列出所有设备
- `xiaomi speakers` - 列出所有小爱音箱

### 小爱控制

- `xiaomi speak <did> <text>` - TTS 播报
- `xiaomi speak-silent <did> <command>` - 静默执行命令

### 帮助

- `xiaomi help` - 显示帮助信息

## 🔧 常见问题

### Q1: 登录后跳转的 localhost:8123 无法访问？

**A**: 这是正常的！你只需要复制浏览器地址栏中的 `code` 参数值即可。

例如，浏览器地址栏显示：
```
http://localhost:8123?code=ABC123XYZ&state=...
```

你只需要复制 `ABC123XYZ` 这部分。

### Q2: 小爱音箱发送成功但没有声音？

**可能原因**：

1. **设备离线** - 检查 `xiaomi speakers` 命令中设备是否显示 🟢 在线
2. **音量静音** - 检查小爱音箱的音量设置
3. **设备型号不支持** - 某些特殊型号可能需要调整参数

**解决方法**：

如果你的设备型号不支持，可以自定义参数：

```typescript
const xiaoai = new XiaoAISpeaker(httpClient, device, {
  siid: 5,  // intelligent-speaker service ID
  execute_text_directive_aiid: 5,  // action ID
  text_piid: 1,  // text parameter ID
  silent_execution_piid: 3,  // silent parameter ID
});
```

### Q3: Token 过期怎么办？

**A**: Token 会自动刷新，无需手动处理。如果自动刷新失败，重新登录即可：

```bash
node dist/xiaomi/cli.js logout
node dist/xiaomi/cli.js login
```

### Q4: 支持哪些小爱音箱型号？

**A**: 理论上支持所有小米 WiFi 音箱，包括但不限于：

- 小爱音箱 Pro (lx06)
- 小爱音箱 Play (s12)
- 小爱音箱 HD (lx01)
- 小爱音箱 mini (l05c)
- 小爱触屏音箱系列

如果你的型号不在列表中，可以尝试，或者查看设备的 MIoT 规格调整参数。

### Q5: 配置文件存储在哪里？

**A**: 默认存储在 `~/.moltbot/xiaomi/xiaomi_config.json`

查看配置路径：
```bash
node dist/xiaomi/cli.js info
```

### Q6: 支持多区域吗？

**A**: 支持！可选区域：

- `cn` - 中国大陆 (默认)
- `de` - 欧洲
- `us` - 美国
- `sg` - 新加坡
- `ru` - 俄罗斯
- `i2` - 印度

创建客户端时指定：
```typescript
const client = new XiaomiClient({ cloud_server: 'de' });
```

### Q7: 如何在 moltbot 中集成？

**示例：创建一个小爱播报命令**

```typescript
// 在 moltbot 命令中使用
import { XiaomiClient } from '../xiaomi/client.js';

async function xiaoaiSpeakCommand(text: string) {
  const client = new XiaomiClient();
  await client.init();

  if (!(await client.isLoggedIn())) {
    throw new Error('请先登录小米账号');
  }

  await client.loadDevices();
  const speakers = client.getXiaoAISpeakers();

  if (speakers.length === 0) {
    throw new Error('未找到小爱音箱');
  }

  // 使用第一个音箱
  const xiaoai = client.createXiaoAISpeaker(speakers[0].did);
  await xiaoai.speak(text);

  return `已发送到: ${speakers[0].name}`;
}
```

## 📚 API 文档

详细 API 文档请查看 `README.md`。

## 🔐 安全说明

1. **配置文件包含敏感信息** - `~/.moltbot/xiaomi/xiaomi_config.json` 包含 access_token，请妥善保管
2. **不要分享配置文件** - 配置文件可以直接控制你的设备
3. **定期检查登录设备** - 在小米账号中检查已授权的应用

撤销授权方式：
```
小米 APP -> 我的 -> 小米账号 -> 基本信息：应用 -> Xiaomi Home (Home Assistant Integration) -> 移除
```

## 🐛 故障排查

### 启用调试日志

```bash
# 查看详细错误信息
node dist/xiaomi/cli.js speakers 2>&1 | tee debug.log
```

### 测试网络连接

```bash
# 测试能否访问小米服务器
curl -I https://ha.api.io.mi.com
```

### 重新初始化

```bash
# 清除所有配置重新开始
node dist/xiaomi/cli.js logout
rm -rf ~/.moltbot/xiaomi
node dist/xiaomi/cli.js login
```

## 📞 获取帮助

如果遇到问题：

1. 查看本文档的常见问题部分
2. 查看 `README.md` 了解更多技术细节
3. 运行测试演示：`node dist/xiaomi/test-demo.js`

## 🎉 成功案例

登录成功后的完整流程：

```bash
# 1. 登录
$ node dist/xiaomi/cli.js login
# (在浏览器中登录并获取 code)

# 2. 完成登录
$ node dist/xiaomi/cli.js login-code ABC123XYZ
✓ 登录成功: 张三 (12345678)
✓ 加载了 15 个设备
✓ 找到 2 个小爱音箱

# 3. 查看音箱
$ node dist/xiaomi/cli.js speakers
找到 2 个小爱音箱:

  🟢 客厅小爱
     型号: xiaomi.wifispeaker.lx06
     DID: 123456789

  🟢 卧室小爱
     型号: xiaomi.wifispeaker.s12
     DID: 987654321

# 4. 播报测试
$ node dist/xiaomi/cli.js speak 123456789 "你好，现在是下午3点"
✓ 成功发送到 客厅小爱

# 5. 静默命令
$ node dist/xiaomi/cli.js speak-silent 123456789 "打开客厅灯"
✓ 成功发送到 客厅小爱
```

现在你可以愉快地使用小爱音箱了！🎊
