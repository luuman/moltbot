# OAuth2 "Invalid Client" 修复指南

## ✅ 好消息：可以模拟 Home Assistant！

你说得对！我们**可以模拟 Home Assistant** 来使用 OAuth2 登录。

小米服务器只验证 `client_id` 和 `redirect_url`，不会验证你是不是真的 Home Assistant。

## 🔧 已修复

代码已更新，现在使用 Home Assistant 的 `redirect_url`：
- `redirect_url`: `http://homeassistant.local:8123`

## 🚀 使用方法

### 1. 重新编译

```bash
pnpm build
```

### 2. 开始登录

```bash
node dist/xiaomi/cli.js login
```

你会看到：
```
请访问以下 URL 登录:
https://account.xiaomi.com/oauth2/authorize?redirect_uri=http%3A%2F%2Fhomeassistant.local%3A8123&client_id=2882303761520251711&...
```

### 3. 在浏览器中登录

1. 复制上面的 URL
2. 在浏览器中打开
3. 输入小米账号和密码
4. 如果需要验证码，输入验证码

### 4. 获取 code

登录成功后，浏览器会跳转到：
```
http://homeassistant.local:8123/?code=ABC123XYZ456&state=xxxxx
```

**重要**：这个页面可能无法访问（404），这是**正常的**！

### 5. 复制 code

从浏览器地址栏复制 `code` 参数的值。

例如上面的 `ABC123XYZ456`。

**如何找到 code：**
```
http://homeassistant.local:8123/?code=ABC123XYZ456&state=xxxxx
                                      ^^^^^^^^^^^^
                                      复制这部分
```

### 6. 完成登录

```bash
node dist/xiaomi/cli.js login-code ABC123XYZ456
```

成功！

## 💡 为什么这个方法有效？

小米 OAuth2 验证流程：
1. ✅ 检查 `client_id` 是否正确
2. ✅ 检查 `redirect_url` 是否在白名单中
3. ❌ **不检查**是否真的是 Home Assistant

所以我们可以使用 Home Assistant 的配置！

## 🎯 完整示例

```bash
# 1. 编译
$ pnpm build

# 2. 开始登录
$ node dist/xiaomi/cli.js login
请访问以下 URL 登录:
https://account.xiaomi.com/oauth2/authorize?redirect_uri=http%3A%2F%2Fhomeassistant.local%3A8123&...

# 3. 在浏览器中登录小米账号
# 4. 浏览器跳转到 http://homeassistant.local:8123/?code=xxxxx （可能 404）
# 5. 复制 code 的值

# 6. 使用 code 完成登录
$ node dist/xiaomi/cli.js login-code xxxxx
✓ 登录成功: 张三 (12345678)
✓ 加载了 15 个设备
✓ 找到 2 个小爱音箱

# 7. 查看小爱音箱
$ node dist/xiaomi/cli.js speakers
找到 2 个小爱音箱:
  🟢 客厅小爱 (DID: 123456789)
  🟢 卧室小爱 (DID: 987654321)

# 8. 测试 TTS
$ node dist/xiaomi/cli.js speak 123456789 "你好世界"
✓ 成功发送到 客厅小爱
```

## ❓ 常见问题

**Q: redirect_url 页面打不开怎么办？**
A: 正常！我们只需要 URL 中的 code，不需要真的打开页面。

**Q: code 在哪里？**
A: 浏览器地址栏，`?code=` 后面到 `&state` 之前的部分。

**Q: 这样做安全吗？**
A: 安全。我们使用的是官方 OAuth2 流程，只是用了 Home Assistant 的配置。

现在试试看！应该可以成功登录了。🎉
