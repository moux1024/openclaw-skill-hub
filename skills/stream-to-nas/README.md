# stream-to-nas

流媒体下载并上传到海康 NAS（云端代理模式）。

## 功能

- 从视频页面提取 m3u8 流地址
- 下载并转换为 MP4
- 通过海康云端 API 扫码登录
- 上传文件到 NAS

## 特点

- **纯 API 调用**：不依赖浏览器自动化，直接调用海康云端 API
- **扫码登录**：生成二维码供海康威视 APP 扫码
- **Session 缓存**：登录态有效期 2 小时，自动复用
- **断点续传**：上传支持文件分片

## 依赖

- Node.js 18+
- ffmpeg

## 使用

```bash
# 安装
bash install.sh stream-to-nas

# 登录 NAS（首次需扫码）
node scripts/nas_login.js

# 下载视频
bash scripts/download_convert.sh "https://example.com/video.m3u8" "output.mp4"

# 上传到 NAS
node scripts/nas_upload.js "/path/to/output.mp4"
```

## API 参考

详见 [REFERENCE.md](./REFERENCE.md)，包含：
- 签名算法（accessToken = md5(sourceType + sourceId + msgType + msgId + secret)）
- 完整登录流程（msgType 360 → 361 → 311）
- 文件上传机制
- 所有已知接口列表
