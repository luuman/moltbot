# 使用 MiIO Token 方案（推荐）

由于 OAuth2 的 client_id 只能在 Home Assistant 环境下使用，我们提供了基于 **python-miio** 的替代方案。

## 为什么使用 MiIO Token？

### OAuth2 方案的问题：
- ❌ `client_id` 是小米专门为 Home Assistant 注册的
- ❌ 其他应用无法使用这个 `client_id`
- ❌ 需要注册自己的 OAuth2 应用（需要企业资质）

### MiIO Token 方案的优势：
- ✅ 不需要 OAuth2 认证
- ✅ 直接通过本地网络控制设备
- ✅ 响应速度更快（本地控制）
- ✅ 无需互联网连接（设备在同一局域网即可）

## 🚀 快速开始

### 1. 安装 python-miio

```bash
# 使用 pip 安装
pip3 install python-miio

# 或使用 pipx（推荐）
pipx install python-miio

# 验证安装
miiocli --version
```

### 2. 发现设备

```bash
# 扫描局域网中的小米设备
miiocli discover

# 输出示例：
# INFO:miio.discovery:  IP 192.168.1.100: Xiaomi Mi Smart WiFi Speaker - token: 1234567890abcdef1234567890abcdef
# INFO:miio.discovery:  IP 192.168.1.101: Xiaomi Mi Robot Vacuum - token: abcdef1234567890abcdef1234567890
```

记录下你的小爱音箱的 **IP 地址** 和 **token**。

### 3. 测试设备连接

```bash
# 获取设备信息
miiocli device --ip 192.168.1.100 --token 1234567890abcdef1234567890abcdef info

# 如果成功，会显示设备信息
```

### 4. 测试 TTS

```bash
# 方法 1: 使用 miiocli raw_command
miiocli device --ip 192.168.1.100 --token YOUR_TOKEN raw_command '{"method":"action","params":{"siid":5,"aiid":5,"in":["你好，我是小爱同学",false]}}'

# 方法 2: 使用 TypeScript 代码（即将实现）
```

## 📝 获取 Token 的方法

### 方法 1: 通过 miiocli discover（推荐）

```bash
miiocli discover --timeout 10
```

### 方法 2: 从 Mi Home App 获取

1. 安装旧版本的米家 APP（6.x 版本）
2. 登录后，设备的 token 会保存在本地数据库中
3. 使用工具提取（Android: `/data/data/com.xiaomi.smarthome/databases/miio2.db`）

### 方法 3: 使用 miio-token-extractor

```bash
# 安装
npm install -g miio-token-extractor

# 提取 token（需要设备处于配对模式）
miio-extract-tokens --ip 192.168.1.100
```

### 方法 4: 抓包获取

1. 使用 Wireshark 或 tcpdump 抓包
2. 过滤 UDP 端口 54321
3. 在握手包中找到 token

## 💻 代码示例

### TypeScript 代码（即将实现）

```typescript
import { MiIOClient } from './xiaomi/miio-client.js';

// 设备配置
const device = {
  ip: '192.168.1.100',
  token: '1234567890abcdef1234567890abcdef',
};

// 检查 python-miio 是否安装
const installed = await MiIOClient.checkInstalled();
if (!installed) {
  console.log('Installing python-miio...');
  await MiIOClient.install();
}

// 获取设备信息
const info = await MiIOClient.getInfo(device);
console.log('Device info:', info);

// TTS 播报
await MiIOClient.speak(device, '你好，我是小爱同学');

// 静默执行命令
await MiIOClient.speakSilent(device, '打开客厅灯');
```

### Shell 脚本

```bash
#!/bin/bash
# xiaomi-speak.sh

IP="192.168.1.100"
TOKEN="1234567890abcdef1234567890abcdef"
TEXT="$1"

if [ -z "$TEXT" ]; then
  echo "Usage: $0 <text>"
  exit 1
fi

miiocli device --ip "$IP" --token "$TOKEN" raw_command "{\"method\":\"action\",\"params\":{\"siid\":5,\"aiid\":5,\"in\":[\"$TEXT\",false]}}"
```

使用：
```bash
chmod +x xiaomi-speak.sh
./xiaomi-speak.sh "你好，今天天气真好"
```

## 🔧 常见问题

### Q1: 无法发现设备？

**A**: 确保：
1. 设备和电脑在同一局域网
2. 防火墙没有阻止 UDP 端口 54321
3. 设备已经配置好并连接到 WiFi

### Q2: Token 是什么？如何获取？

**A**: Token 是设备的密钥，用于本地通信加密。获取方法见上文。

### Q3: Token 会过期吗？

**A**: 不会。Token 是设备级别的，除非重置设备，否则不会改变。

### Q4: 可以同时使用多个设备吗？

**A**: 可以！每个设备有独立的 IP 和 token。

### Q5: siid 和 aiid 是什么？

**A**:
- `siid`: Service Instance ID（服务实例 ID）
- `aiid`: Action Instance ID（动作实例 ID）

小爱音箱的 TTS 功能：
- `siid=5`: intelligent-speaker service
- `aiid=5`: execute-text-directive action

不同型号可能不同，可以通过 `miiocli device --ip IP --token TOKEN call get_properties '[{"siid":5,"piid":1}]'` 来探测。

### Q6: 支持哪些小爱音箱型号？

**A**: 理论上支持所有支持 MIoT 协议的小米音箱，包括：
- 小爱音箱 Pro (lx06)
- 小爱音箱 Play (s12)
- 小爱音箱 HD (lx01)
- 小爱触屏音箱系列

### Q7: MiIO 和 OAuth2 有什么区别？

| 特性 | MiIO Token | OAuth2 |
|------|-----------|--------|
| 认证方式 | 设备 Token | 账号密码 |
| 网络要求 | 仅需局域网 | 需要互联网 |
| 控制方式 | 本地直连 | 云端 API |
| 响应速度 | 快（<100ms） | 慢（200-500ms） |
| 设备发现 | 需要手动配置 | 自动获取 |
| Token 获取 | 需要额外步骤 | 登录即可 |

## 🎯 推荐方案

**个人使用**：MiIO Token 方案（本文档）
- 优点：快速、稳定、无需 OAuth2
- 缺点：需要手动获取 token

**企业使用**：注册自己的 OAuth2 应用
- 优点：自动设备发现、用户体验好
- 缺点：需要企业资质、审核流程长

## 📚 参考资料

- [python-miio 官方文档](https://python-miio.readthedocs.io/)
- [MIoT 协议规范](https://iot.mi.com/v2/new/doc/introduction/knowledge/spec)
- [小米 IoT 开放平台](https://iot.mi.com/)

## 🎉 成功案例

```bash
# 1. 安装 python-miio
$ pip3 install python-miio

# 2. 发现设备
$ miiocli discover
INFO:miio.discovery:  IP 192.168.1.100: Xiaomi Mi Smart WiFi Speaker
  Model: xiaomi.wifispeaker.lx06
  Token: 1234567890abcdef1234567890abcdef

# 3. 测试 TTS
$ miiocli device --ip 192.168.1.100 --token 1234567890abcdef1234567890abcdef raw_command '{"method":"action","params":{"siid":5,"aiid":5,"in":["你好世界",false]}}'

# 成功！小爱音箱说话了
```

现在你可以使用 MiIO Token 方案来控制小爱音箱了！🎊
