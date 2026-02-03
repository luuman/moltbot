#!/bin/bash
# Auto commit and push script
# Usage: ./scripts/auto-commit.sh [task-name] [commit-message]

# 配置
TASK_NAME="${1:-$(git branch --show-current | sed 's/^ai\///')}"  # 从参数获取，或使用当前分支名
BRANCH_NAME="ai/${TASK_NAME}"
COMMIT_MSG="${2}"

# 如果没有提供提交信息，自动生成
if [ -z "$COMMIT_MSG" ]; then
  COMMIT_MSG="Update: ${TASK_NAME}"
fi

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🤖 Auto Commit & Push Workflow${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Task: ${TASK_NAME}"
echo "Branch: ${BRANCH_NAME}"
echo ""

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
    echo -e "${YELLOW}→ Switching to existing branch: ${BRANCH_NAME}${NC}"
    git checkout "${BRANCH_NAME}"
  else
    echo -e "${YELLOW}→ Creating new branch: ${BRANCH_NAME}${NC}"
    git checkout -b "${BRANCH_NAME}"
  fi
fi

# 4. 显示修改
echo ""
echo -e "${YELLOW}Modified files:${NC}"
git status --short

# 5. 添加所有修改
echo ""
echo -e "${YELLOW}→ Adding all changes...${NC}"
git add .

# 6. 提交
echo -e "${YELLOW}→ Committing changes...${NC}"
git commit -m "${COMMIT_MSG}

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

if [ $? -ne 0 ]; then
  echo -e "${RED}✗ Commit failed${NC}"
  exit 1
fi

# 7. 推送
echo ""
echo -e "${YELLOW}→ Pushing to origin/${BRANCH_NAME}...${NC}"
git push -u origin "${BRANCH_NAME}"

if [ $? -ne 0 ]; then
  echo -e "${RED}✗ Push failed${NC}"
  exit 1
fi

# 8. 成功
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✓ Done!${NC}"
echo "Branch: ${BRANCH_NAME}"
echo "Commit: $(git rev-parse --short HEAD)"
echo "Message: ${COMMIT_MSG}"
