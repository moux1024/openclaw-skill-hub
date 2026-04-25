#!/usr/bin/env node
// scripts/nas_login.js — 海康 NAS 云端 API 登录
// 流程：msgType 360 获取二维码 → 361 轮询扫码 → 311 确认登录 → 保存 session

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
// Inline UUID v4 (no external dependency)
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

const API_URL = 'https://api.hiksemi.cn/gateway/api';
const SECRET = 'DCAB251E121F318EC40CA11C30346DCF';
const SESSION_PATH = path.join(__dirname, 'session.json');

// ─── Helpers ───

function generateAccessToken(msgType, msgId) {
  const raw = `8test-001${msgType}${msgId}${SECRET}`;
  return crypto.createHash('md5').update(raw).digest('hex');
}

function generateHead(msgType, sessionId = '') {
  const msgId = uuidv4();
  return {
    sourceType: 8,
    sourceModel: 'web',
    sourceVersion: '1.0',
    sourceId: 'test-001',
    sessionId,
    msgType,
    msgId,
    secretVersion: 1,
    accessToken: generateAccessToken(msgType, msgId),
  };
}

async function apiRequest(msgType, body = {}, sessionId = '') {
  const head = generateHead(msgType, sessionId);
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ head, body }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.code !== 200) throw new Error(`API error ${json.code}: ${json.msg}`);
  return json.data;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Main Flow ───

async function login() {
  // 1. Check cached session
  if (fs.existsSync(SESSION_PATH)) {
    try {
      const session = JSON.parse(fs.readFileSync(SESSION_PATH, 'utf8'));
      if (session.sessionId && Date.now() < session.expireAt) {
        console.log('CACHED_SESSION');
        console.log(JSON.stringify(session));
        return;
      }
    } catch (e) { /* ignore corrupted */ }
  }

  // 2. Get QR code (msgType 360)
  console.error('[1/3] 获取二维码...');
  const qrData = await apiRequest(360);
  const qrCodeId = qrData.qrCodeId;
  if (!qrCodeId) throw new Error('Failed to get qrCodeId');
  console.error(`  qrCodeId: ${qrCodeId}`);
  console.error(`  qrCodeUrl: ${qrData.qrCodeUrl}`);

  // Output QR code image URL for the caller to display
  // The QR code content is: {qrCodeUrl}?qrCodeId={qrCodeId}&qrCodeType=1
  const qrContent = `${qrData.qrCodeUrl || 'https://cloud.hiksemi.cn'}?qrCodeId=${qrCodeId}&qrCodeType=1`;
  console.log(JSON.stringify({
    action: 'show_qr',
    qrCodeId,
    qrContent,
    // Generate QR code image via Google Charts API as fallback
    qrImageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrContent)}`,
  }));

  // 3. Poll scan status (msgType 361)
  console.error('[2/3] 等待扫码...');
  let sessionId = '';
  let deviceToken = '';
  let deviceSn = '';
  let localAccountId = '';

  for (let i = 0; i < 60; i++) { // max 3 min
    await sleep(3000);
    const pollData = await apiRequest(361, {
      qrCodeId,
      qrCodeType: 1,
      terminalName: 'web',
    });

    const status = pollData.scanStatus;
    console.error(`  [${i * 3}s] scanStatus: ${status}`);

    if (status === 2) {
      // Scanned, waiting for confirm
      sessionId = pollData.serverSessionId || sessionId;
      console.error('  已扫码，等待确认...');
    } else if (status === 3) {
      // Confirmed!
      sessionId = pollData.serverSessionId;
      deviceToken = pollData.deviceToken;
      const deviceQrCode = JSON.parse(pollData.deviceQrCode || '{}');
      deviceSn = deviceQrCode.sn || '';
      localAccountId = pollData.deviceUserId || '';
      console.error(`  ✅ 登录成功! device=${deviceSn}`);
      break;
    }
  }

  if (!sessionId) {
    console.error('❌ 扫码超时');
    process.exit(1);
  }

  // 4. Confirm login (msgType 311)
  console.error('[3/3] 确认登录...');
  const loginData = await apiRequest(311, { loginType: 0, terminalName: 'web' }, sessionId);
  console.error(`  accountId: ${loginData.accountId}`);

  // 5. Get device list (msgType 323) + connect info (msgType 342/347)
  let deviceList = [];
  try {
    const devData = await apiRequest(323, { deviceSn }, sessionId);
    deviceList = devData.deviceList || [];
  } catch (e) { console.error('  获取设备列表失败:', e.message); }

  // Get connect info for proxy upload
  let connectInfo = {};
  try {
    const ciData = await apiRequest(347, {
      deviceSn,
      timestamp: Math.floor(Date.now() / 1000),
      timeZone: 'UTC+8',
      timeCity: 'Asia/Shanghai',
    }, sessionId);
    connectInfo = ciData;
  } catch (e) { console.error('  获取连接信息失败:', e.message); }

  // 6. Save session
  const session = {
    sessionId,
    accountId: loginData.accountId,
    account: loginData.account,
    deviceSn,
    deviceToken,
    localAccountId,
    connectInfo,
    deviceList,
    expireAt: Date.now() + 2 * 3600 * 1000, // 2 hours
    createdAt: Date.now(),
  };

  fs.writeFileSync(SESSION_PATH, JSON.stringify(session, null, 2));
  console.error('Session saved.');
  console.log('LOGIN_SUCCESS');
  console.log(JSON.stringify(session));
}

login().catch(err => {
  console.error('Login failed:', err.message);
  process.exit(1);
});
