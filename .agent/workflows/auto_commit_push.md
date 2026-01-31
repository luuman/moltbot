---
description: Automatically commit and push code changes with AI-generated branch names
---

# Auto Commit & Push Workflow

自动提交和推送代码更改，根据需求自动生成分支名称。

## 🎯 工作流程

### 1. 自动生成分支名称

根据当前任务/需求，自动生成 `ai/<task-name>` 格式的分支名称。

**命名规则**：
- 前缀：`ai/`
- 任务名：使用短横线分隔的小写英文
- 示例：
  - `ai/xiaomi-integration` - 小米集成
  - `ai/xiaomi-oauth-fix` - 修复 OAuth 问题
  - `ai/xiaoai-speaker-control` - 小爱音箱控制
  - `ai/miio-token-support` - MiIO Token 支持

### 2. 自动提交流程

```bash
# 1. 检查当前分支
git branch --show-current

# 2. 如果在 main 分支，创建新的 ai/ 分支
if [ "$(git branch --show-current)" = "main" ]; then
  TASK_NAME="xiaomi-oauth-fix"  # 根据需求修改
  git checkout -b "ai/${TASK_NAME}"
fi

# 3. 查看修改
git status

# 4. 添加所有修改
git add .

# 5. 提交（使用有意义的提交信息）
git commit -m "Fix Xiaomi OAuth2 invalid client error

- Update redirect_url to Home Assistant's official URL
- Add OAUTH2_FIX.md guide for users
- Add miio-client.ts as alternative solution

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# 6. 推送到远程
git push -u origin "ai/${TASK_NAME}"
```

## 🤖 自动化脚本

创建 `scripts/auto-commit.sh`：

```bash
#!/bin/bash
# Auto commit and push script

# 配置
TASK_NAME="${1:-xiaomi-integration}"  # 从参数获取，或使用默认值
BRANCH_NAME="ai/${TASK_NAME}"
COMMIT_MSG="${2:-Update: ${TASK_NAME}}"

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🤖 Auto Commit & Push${NC}"
echo "Task: ${TASK_NAME}"
echo "Branch: ${BRANCH_NAME}"

# 1. 检查是否有修改
if [ -z "$(git status --porcelain)" ]; then
  echo -e "${GREEN}✓ No changes to commit${NC}"
  exit 0
fi

# 2. 检查当前分支
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: ${CURRENT_BRANCH}"

# 3. 如果不在目标分支，切换或创建
if [ "${CURRENT_BRANCH}" != "${BRANCH_NAME}" ]; then
  # 检查分支是否存在
  if git show-ref --verify --quiet "refs/heads/${BRANCH_NAME}"; then
    echo "Switching to existing branch: ${BRANCH_NAME}"
    git checkout "${BRANCH_NAME}"
  else
    echo "Creating new branch: ${BRANCH_NAME}"
    git checkout -b "${BRANCH_NAME}"
  fi
fi

# 4. 显示修改
echo -e "\n${YELLOW}Modified files:${NC}"
git status --short

# 5. 添加所有修改
git add .

# 6. 提交
echo -e "\n${YELLOW}Committing changes...${NC}"
git commit -m "${COMMIT_MSG}

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# 7. 推送
echo -e "\n${YELLOW}Pushing to origin/${BRANCH_NAME}...${NC}"
git push -u origin "${BRANCH_NAME}"

echo -e "\n${GREEN}✓ Done!${NC}"
echo "Branch: ${BRANCH_NAME}"
echo "Commit: $(git rev-parse --short HEAD)"
```

### 使用方法：

```bash
# 基本使用（使用默认任务名）
./scripts/auto-commit.sh

# 指定任务名
./scripts/auto-commit.sh xiaomi-oauth-fix

# 指定任务名和提交信息
./scripts/auto-commit.sh xiaomi-oauth-fix "Fix OAuth2 invalid client error"
```

## 📝 提交信息模板

### 格式：
```
<type>: <subject>

<body>

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Type 类型：
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `refactor`: 重构
- `test`: 测试
- `chore`: 构建/工具更改

### 示例：

```bash
# 新功能
git commit -m "feat: Add Xiaomi Home integration with OAuth2 support

- Implement OAuth2 authentication client
- Add device management and control
- Support XiaoAI speaker TTS
- Add CLI tool for easy usage

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# 修复
git commit -m "fix: Fix OAuth2 invalid client error

- Update redirect_url to homeassistant.local:8123
- Mimic Home Assistant to pass OAuth validation
- Add detailed setup guide

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# 文档
git commit -m "docs: Add OAuth2 troubleshooting guide

- Explain why invalid client error occurs
- Provide Home Assistant mimicking solution
- Add step-by-step setup instructions

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

## 🔄 工作流程图

```
┌─────────────────┐
│ 开始新任务        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 生成分支名称      │
│ ai/<task-name>  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 创建/切换分支     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 编写代码          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 自动 git add .   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 生成提交信息      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ git commit      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ git push        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 完成 ✓          │
└─────────────────┘
```

## 🎯 分支命名建议

根据任务类型选择合适的分支名：

| 任务类型 | 分支名示例 |
|---------|-----------|
| 新功能集成 | `ai/xiaomi-integration` |
| Bug 修复 | `ai/fix-oauth-error` |
| 性能优化 | `ai/optimize-api-calls` |
| 文档更新 | `ai/update-docs` |
| 重构代码 | `ai/refactor-auth` |
| 添加测试 | `ai/add-tests` |

## ⚙️ 配置记录

### 当前任务配置

```json
{
  "current_task": "xiaomi-integration",
  "branch_prefix": "ai/",
  "auto_commit": true,
  "auto_push": true,
  "commit_template": {
    "type": "feat|fix|docs|refactor|test|chore",
    "co_author": "Claude Sonnet 4.5 <noreply@anthropic.com>"
  }
}
```

### Git 配置

```bash
# 设置默认分支前缀
git config --local branch.prefix "ai/"

# 设置自动推送
git config --local push.default current

# 设置提交模板
git config --local commit.template .gitmessage
```

## 🚀 快速命令

```bash
# 查看当前分支
git branch --show-current

# 查看所有 ai/ 分支
git branch | grep "ai/"

# 切换到最新的 ai/ 分支
git checkout $(git branch | grep "ai/" | tail -1 | xargs)

# 删除已合并的 ai/ 分支
git branch --merged | grep "ai/" | xargs git branch -d

# 推送所有 ai/ 分支
git push origin 'refs/heads/ai/*'
```

## 📊 状态检查

```bash
# 检查工作区状态
git status

# 查看未推送的提交
git log origin/$(git branch --show-current)..HEAD

# 查看分支关系
git log --oneline --graph --all | head -20
```

## 🔧 故障排除

### 问题：分支名称冲突

**解决**：添加时间戳或序号
```bash
TASK_NAME="xiaomi-integration-$(date +%Y%m%d)"
# 或
TASK_NAME="xiaomi-integration-v2"
```

### 问题：推送失败

**解决**：检查远程分支
```bash
git fetch origin
git pull --rebase origin ai/xiaomi-integration
git push -u origin ai/xiaomi-integration
```

### 问题：忘记提交信息

**解决**：修改最后一次提交
```bash
git commit --amend -m "New commit message"
git push -f origin ai/xiaomi-integration
```

## 📝 注意事项

1. ⚠️ **不要在 main 分支直接提交**
2. ✅ 每个任务使用独立的 ai/ 分支
3. ✅ 提交信息要清晰描述改动
4. ✅ 推送前确保代码已编译通过
5. ✅ 定期合并到 main 并清理旧分支

## 🎉 成功案例

```bash
# 场景：修复 Xiaomi OAuth2 问题

# 1. 创建分支
$ git checkout -b ai/xiaomi-oauth-fix

# 2. 修改代码
$ vim src/xiaomi/constants.ts
$ vim src/xiaomi/client.ts

# 3. 自动提交
$ ./scripts/auto-commit.sh xiaomi-oauth-fix "Fix OAuth2 invalid client error"
🤖 Auto Commit & Push
Task: xiaomi-oauth-fix
Branch: ai/xiaomi-oauth-fix
Modified files:
 M src/xiaomi/constants.ts
 M src/xiaomi/client.ts
 A src/xiaomi/OAUTH2_FIX.md
✓ Done!
Branch: ai/xiaomi-oauth-fix
Commit: e982cba

# 4. 验证
$ git log --oneline -1
e982cba Fix OAuth2 invalid client error
```
