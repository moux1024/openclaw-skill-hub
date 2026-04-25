# Stream to NAS

流媒体下载并上传到海康 NAS 的自动化工具。

## Input

```json
{
  "url": "string — 播放页 URL（m3u8 或视频页面）",
  "filename": "string (optional) — 输出文件名",
  "nas_path": "string (optional) — NAS 上的目标路径，默认 /用户上传/"
}
```

## Tools

- shell (Node.js, ffmpeg, curl)

## Steps

1. **提取 m3u8 地址**
   ```
   node scripts/extract_m3u8.js "<url>"
   ```
   返回 m3u8 URL。

2. **下载并转换为 MP4**
   ```
   bash scripts/download_convert.sh "<m3u8_url>" "<filename>"
   ```
   输出 MP4 文件路径。

3. **登录 NAS**
   ```
   node scripts/nas_login.js
   ```
   - 首次登录：生成二维码 → 输出给用户扫码 → 轮询等待 → 保存 session
   - 后续请求：复用缓存 session（2 小时有效）
   - 输出 JSON: `{ action: "show_qr", qrImageUrl: "..." }` 或 `LOGIN_SUCCESS`
   - **如果返回二维码**：下载 `qrImageUrl` 图片发送给用户，等待用户确认已扫码后重新运行

4. **上传到 NAS**
   ```
   node scripts/nas_upload.js "<file_path>" ["<nas_path>"]
   ```

5. 返回结果

## Output

```json
{
  "nas_path": "string — NAS 上的文件路径",
  "file_size": "number — 文件大小"
}
```

## Requirements

- Node.js 18+（内置 `fetch`、`crypto`）
- ffmpeg (`brew install ffmpeg`)
- 无需 Playwright（纯 API 调用）

## 架构

```
登录流程: 纯 API（无浏览器依赖）
  msgType 360 → 获取二维码
  msgType 361 → 轮询扫码（每 3s）
  msgType 311 → 确认登录 → 保存 session.json

文件上传: 代理服务器直传
  msgType 347 → 获取连接信息
  msgType 111 → 获取代理服务器地址
  POST 代理服务器 → 上传文件
```

## 参考

- [API 逆向参考文档](./REFERENCE.md) — 完整的签名算法、接口列表、请求格式
