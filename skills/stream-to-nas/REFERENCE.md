# 海康 NAS 云端 API 参考文档

> 逆向自海康威视 EasyConnect Web 前端 (my.hiksemi.cn)
> 日期: 2026-04-24

## 概览

海康 NAS 在无局域网条件下，通过云端代理访问 NAS。所有 API 调用走 `https://api.hiksemi.cn/gateway/api`，文件上传走代理服务器。

## 认证签名算法

### 网关 accessToken（用于 gateway/api 请求）

```javascript
accessToken = md5(sourceType + sourceId + msgType + msgId + secret)
```

| 参数 | 值 | 说明 |
|------|-----|------|
| sourceType | `8` | Web 客户端固定值 |
| sourceId | `"test-001"` | Web 客户端固定值 |
| msgType | 数字 | 接口编号 |
| msgId | UUID v4 | 每次请求随机生成 |
| secret | `DCAB251E121F318EC40CA11C30346DCF` | 生产环境密钥（硬编码在前端 JS 中） |

**验证**：
```
md5("8" + "test-001" + "360" + "7069ff23-24b9-4e74-868e-a1303df86773" + "DCAB251E121F318EC40CA11C30346DCF")
= 24cce59897e0506e72cb732461658866 ✅
```

### 请求格式

```json
POST https://api.hiksemi.cn/gateway/api
Content-Type: application/json

{
  "head": {
    "sourceType": 8,
    "sourceModel": "web",
    "sourceVersion": "1.0",
    "sourceId": "test-001",
    "sessionId": "",
    "msgType": 360,
    "msgId": "<uuid-v4>",
    "secretVersion": 1,
    "accessToken": "<md5-hash>"
  },
  "body": { ... }
}
```

### 设备级 accessToken（用于文件代理通道）

登录成功后获取 `connectInfo.token`，用于构造代理通道的认证：

```javascript
accessToken = md5(connectInfo.token + timestamp) + ":" + timestamp + ":" + localAccountId
```

- `connectInfo.token`：通过 msgType 347 获取
- `timestamp`：Unix 时间戳（秒）
- `localAccountId`：设备上的本地账号 ID（如 `100000`）

## 登录流程

### Step 1: 获取二维码 (msgType 360)

```json
// Request
{ "head": { "msgType": 360, "sessionId": "", ... }, "body": {} }

// Response
{
  "code": 200,
  "data": {
    "qrCodeId": "33b5a9d8-3f51-401e-a0a2-0f8d685b86b8",
    "qrCodeUrl": "https://cloud.hiksemi.cn"
  }
}
```

二维码内容: `{qrCodeUrl}?qrCodeId={qrCodeId}&qrCodeType=1`

### Step 2: 轮询扫码状态 (msgType 361)

```json
// Request
{
  "head": { "msgType": 361, "sessionId": "", ... },
  "body": {
    "qrCodeId": "<from-step1>",
    "qrCodeType": 1,
    "terminalName": "web"
  }
}

// Response (轮询，每 3 秒)
{
  "code": 200,
  "data": {
    "scanStatus": 1,  // 1=未扫码, 2=已扫码待确认, 3=已确认
    "serverSessionId": "",  // scanStatus=2 时开始返回
    "deviceToken": "",      // scanStatus=3 时返回
    "deviceAccount": "admin",
    "deviceUserId": "100000",
    "deviceQrCode": "{...}"  // 包含 deviceSN 等信息
  }
}
```

### Step 3: 确认登录 (msgType 311)

```json
// Request (使用 step2 获取的 sessionId)
{
  "head": { "msgType": 311, "sessionId": "<from-step2>", ... },
  "body": { "loginType": 0, "terminalName": "web" }
}

// Response
{
  "code": 200,
  "data": {
    "sessionId": "<session-id>",
    "accountId": 1000000000001,
    "account": "138****0000",
    "accountInfo": { "nickName": "UserXXX", ... }
  }
}
```

## 登录后常用接口

### 获取设备列表 (msgType 323)

```json
// Request
{ "head": { "msgType": 323, "sessionId": "<session-id>", ... }, "body": { "deviceSn": "SN0000000000" } }

// Response
{ "deviceList": [{ "deviceSn": "SN0000000000", "deviceModel": "HS-AFS-MAGE20PLUS", ... }] }
```

### 获取设备连接信息 (msgType 347)

```json
// Request
{
  "head": { "msgType": 347, "sessionId": "<session-id>", ... },
  "body": {
    "deviceSn": "SN0000000000",
    "timestamp": 1777037302,
    "timeZone": "UTC+8",
    "timeCity": "Asia/Shanghai"
  }
}

// Response — 包含 connectInfo.token 和代理服务器地址
{
  "deviceToken": "sample_token_placeholder",
  "timestamp": 1777037302
}
```

### 获取代理服务器信息 (msgType 111)

```json
// Response
{
  "proxyPort": 8018,
  "proxyDataDomain": "proxy-data.hiksemi.cn",
  "proxyDataPort": 8019,
  "proxyServerDomain": "proxy-server.hiksemi.cn",
  "proxyDataHost": "10.0.0.1",
  "proxyServerHost": "10.0.0.2"
}
```

## 文件上传

文件上传**不走 gateway/api**，而是通过代理服务器直接上传。

上传使用 `XMLHttpRequest` POST，发送文件的 `Blob`/`slice` 到代理服务器 URL。

### 上传方式

```javascript
// fileUploadInBrowser.js 核心逻辑
const xhr = new XMLHttpRequest();
xhr.open('POST', uploadUrl);  // uploadUrl 由前端构造，包含代理服务器地址
xhr.send(file.slice(offset, file.size));  // 支持断点续传
```

### 上传 URL 构造

上传 URL 由以下信息拼接：
- 代理服务器地址: `proxyServerHost` 或 `proxyServerDomain`（来自 msgType 111）
- 代理端口: `proxyPort`（默认 8018）
- 文件路径参数
- 设备级 accessToken 认证

**注意**：上传 URL 的具体拼接规则需在文件管理页面操作时抓包确认。

## 其他已知 msgType

| msgType | 用途 |
|---------|------|
| 107 | 获取设备开关状态 |
| 111 | 获取设备时间/同步 |
| 150 | 获取应用列表 |
| 301 | 获取开关配置 |
| 311 | 登录确认 |
| 323 | 获取设备列表 |
| 342 | 设备信息查询 |
| 347 | 获取设备连接信息/代理 |
| 360 | 获取二维码 |
| 361 | 轮询扫码状态 |

## 设备信息

- **型号**: HS-AFS-MAGE20PLUS (MAGE20PLUS)
- **SN**: SN0000000000
- **MAC**: AA:BB:CC:DD:EE:FF

## 注意事项

1. Session 有效期约 2 小时
2. 网关 accessToken 每次请求都不同（因为 msgId 随机）
3. 设备级 accessToken 有缓存机制，同一秒内复用
4. 代理服务器地址可能会变化（通过 msgType 111 获取最新地址）
5. 上传支持断点续传（通过 file.slice 分段上传）
