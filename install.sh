#!/bin/bash
# OpenClaw Skill Hub - Install Script
# Usage: curl -fsSL https://raw.githubusercontent.com/moux1024/openclaw-skill-hub/main/install.sh | bash
#   or:  bash install.sh [skill-name]

set -e

SKILLS_DIR="$HOME/.openclaw/workspace/skills"
REPO_URL="https://github.com/moux1024/openclaw-skill-hub"
TMP_DIR=$(mktemp -d)

cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

# Parse arguments
TARGET_SKILL="${1:-all}"

echo "📦 OpenClaw Skill Hub Installer"
echo "   Skills directory: $SKILLS_DIR"
echo ""

# Clone repo
echo "⬇️  Downloading skill hub..."
git clone --depth 1 "$REPO_URL" "$TMP_DIR/repo" 2>/dev/null

# Ensure skills directory exists
mkdir -p "$SKILLS_DIR"

install_skill() {
  local skill="$1"
  local src="$TMP_DIR/repo/skills/$skill"
  local dst="$SKILLS_DIR/$skill"

  if [ ! -d "$src" ]; then
    echo "❌ Skill not found: $skill"
    return 1
  fi

  if [ ! -f "$src/SKILL.md" ]; then
    echo "❌ Invalid skill (missing SKILL.md): $skill"
    return 1
  fi

  # Remove old version
  rm -rf "$dst"

  # Copy skill
  cp -r "$src" "$dst"

  # Count scripts
  local script_count=0
  if [ -d "$dst/scripts" ]; then
    script_count=$(find "$dst/scripts" -type f | wc -l | tr -d ' ')
    chmod +x "$dst/scripts/"*.sh 2>/dev/null || true
  fi

  echo "✅ Installed: $skill"
  if [ "$script_count" -gt 0 ]; then
    echo "   📜 Scripts: $script_count file(s)"
  fi
}

if [ "$TARGET_SKILL" = "all" ]; then
  echo "🔧 Installing all skills..."
  echo ""
  for skill_dir in "$TMP_DIR/repo/skills"/*/; do
    skill_name=$(basename "$skill_dir")
    install_skill "$skill_name"
  done
else
  install_skill "$TARGET_SKILL"
fi

echo ""
echo "🎉 Done! Restart your OpenClaw session to use new skills."
echo "   Available skills:"
ls -1 "$SKILLS_DIR" | sed 's/^/   - /'
