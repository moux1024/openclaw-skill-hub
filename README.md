# OpenClaw Skill Hub

Community skills registry for [OpenClaw](https://github.com/openclaw/openclaw).

## Skills

| Skill | Description |
|-------|-------------|
| [stream-to-nas](skills/stream-to-nas/SKILL.md) | 流媒体下载并上传到 NAS 的自动化工具 |

## Usage

Copy or symlink a skill folder into your `~/.openclaw/workspace/skills/` directory:

```bash
cp -r skills/stream-to-nas ~/.openclaw/workspace/skills/
```

## Contributing

PRs welcome! Each skill should be a folder under `skills/` containing:

- `SKILL.md` — Skill definition (role, goal, input, steps, output)
- Supporting scripts/assets as needed

## License

MIT
