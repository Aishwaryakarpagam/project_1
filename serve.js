/**
 * ============================================================================
 * NOVA NEXES - REAL-TIME BACKEND SERVER (project_1)
 * REST API, WebSocket Live Telemetry Server & Persistent JSON Database
 * Serves files from ./data/
 * ============================================================================
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5000;
const DB_FILE = path.join(__dirname, 'data', 'database.json');
const FRONTEND_DIR = path.join(__dirname, 'data');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8'
};

/* ============================================================================
   1. DATABASE MANAGER
   ============================================================================ */
class DatabaseManager {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = this.load();
  }

  getInitialData() {
    return {
      version: '2.0.0',
      lastUpdated: new Date().toISOString(),
      settings: {
        esp32Host: '192.168.4.1',
        hardwareBaud: 9600,
        demoModeDefault: true,
        theme: 'dark',
        soundEnabled: true,
        volume: 0.75
      },
      learners: [
        {
          id: 'learner-1',
          name: 'Leo Martinez',
          age: 7,
          dominantHand: 'Right',
          condition: 'Pediatric Motor Delay',
          notes: 'Focusing on pinch grip speed and visual tracking.',
          targetAccuracy: 90,
          createdAt: '2026-10-10T08:30:00.000Z'
        },
        {
          id: 'learner-2',
          name: 'Maya Chen',
          age: 9,
          dominantHand: 'Left',
          condition: 'Bilateral Coordination Training',
          notes: 'Improving bilateral hand transfers and upper-quadrant reach.',
          targetAccuracy: 95,
          createdAt: '2026-10-12T10:15:00.000Z'
        },
        {
          id: 'learner-3',
          name: 'Samira Patel',
          age: 12,
          dominantHand: 'Bilateral',
          condition: 'Neuro-Rehabilitation / Focus Index',
          notes: 'Tracing complex patterns to stimulate executive motor control.',
          targetAccuracy: 88,
          createdAt: '2026-10-15T14:00:00.000Z'
        }
      ],
      customPatterns: [],
      sessions: []
    };
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, 'utf8');
        return Object.assign(this.getInitialData(), JSON.parse(content));
      }
    } catch (e) {
      console.warn('[DB] Failed to read database, creating fresh:', e.message);
    }
    const initial = this.getInitialData();
    this.save(initial);
    return initial;
  }

  save(dataToSave) {
    try {
      const data = dataToSave || this.data;
      data.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (e) {
      console.error('[DB] Write failed:', e);
      return false;
    }
  }

  getLearners() { return this.data.learners || []; }
  addLearner(learner) {
    if (!learner.id) learner.id = 'learner-' + Date.now();
    if (!learner.createdAt) learner.createdAt = new Date().toISOString();
    this.data.learners.unshift(learner);
    this.save();
    return learner;
  }
  updateLearner(id, updates) {
    const idx = this.data.learners.findIndex(l => l.id === id);
    if (idx >= 0) {
      this.data.learners[idx] = Object.assign(this.data.learners[idx], updates);
      this.save();
      return this.data.learners[idx];
    }
    return null;
  }
  deleteLearner(id) {
    const prev = this.data.learners.length;
    this.data.learners = this.data.learners.filter(l => l.id !== id);
    if (this.data.learners.length !== prev) {
      this.save();
      return true;
    }
    return false;
  }

  getSessions(filter = {}) {
    let list = this.data.sessions || [];
    if (filter.learnerId && filter.learnerId !== 'ALL') {
      list = list.filter(s => s.learnerId === filter.learnerId || s.learnerName === filter.learnerId);
    }
    if (filter.patternId && filter.patternId !== 'ALL') {
      list = list.filter(s => s.patternId === filter.patternId);
    }
    return list;
  }
  addSession(session) {
    if (!session.id) session.id = 'sess-' + Date.now();
    if (!session.timestamp) session.timestamp = new Date().toISOString();
    this.data.sessions.unshift(session);
    if (this.data.sessions.length > 500) this.data.sessions.length = 500;
    this.save();
    return session;
  }
  deleteSession(id) {
    const prev = this.data.sessions.length;
    this.data.sessions = this.data.sessions.filter(s => s.id !== id);
    if (this.data.sessions.length !== prev) {
      this.save();
      return true;
    }
    return false;
  }
  clearSessions() {
    this.data.sessions = [];
    this.save();
    return true;
  }

  getPatterns() { return this.data.customPatterns || []; }
  addPattern(pat) {
    if (!pat.id) pat.id = 'pat-' + Date.now();
    if (!pat.createdAt) pat.createdAt = new Date().toISOString();
    const idx = this.data.customPatterns.findIndex(p => p.id === pat.id);
    if (idx >= 0) this.data.customPatterns[idx] = pat;
    else this.data.customPatterns.push(pat);
    this.save();
    return pat;
  }
  deletePattern(id) {
    this.data.customPatterns = this.data.customPatterns.filter(p => p.id !== id);
    this.save();
    return true;
  }

  getAnalytics() {
    const sessions = this.data.sessions || [];
    const totalSessions = sessions.length;
    if (totalSessions === 0) {
      return { totalSessions: 0, avgAccuracy: 0, avgReactionMs: 0, avgDurationSec: 0, errorHeatmap: new Array(15).fill(0) };
    }
    let sumAcc = 0, sumReact = 0, sumDuration = 0, totalErrors = 0;
    const errorHeatmap = new Array(16).fill(0);
    sessions.forEach(s => {
      sumAcc += Number(s.accuracy) || 0;
      sumReact += Number(s.avgReactionMs) || 0;
      sumDuration += Number(s.duration) || 0;
      totalErrors += Number(s.wrong) || 0;
      if (Array.isArray(s.errorHoles)) {
        s.errorHoles.forEach(h => {
          if (h >= 1 && h <= 15) errorHeatmap[h]++;
        });
      }
    });
    return {
      totalSessions,
      avgAccuracy: Math.round((sumAcc / totalSessions) * 10) / 10,
      avgReactionMs: Math.round(sumReact / totalSessions),
      avgDurationSec: Math.round((sumDuration / totalSessions) * 10) / 10,
      totalErrors,
      errorHeatmap: errorHeatmap.slice(1),
      learnersCount: this.data.learners.length
    };
  }
}

const db = new DatabaseManager(DB_FILE);

/* ============================================================================
   2. WEBSOCKET SERVER (RFC 6455)
   ============================================================================ */
class WebSocketServer {
  constructor(server) {
    this.server = server;
    this.clients = new Set();

    this.server.on('upgrade', (req, socket, head) => {
      const pathname = req.url.split('?')[0];
      if (pathname === '/ws' || pathname === '/ws/') {
        this.handleUpgrade(req, socket, head);
      } else {
        socket.destroy();
      }
    });
  }

  handleUpgrade(req, socket, head) {
    const key = req.headers['sec-websocket-key'];
    if (!key) {
      socket.destroy();
      return;
    }

    const acceptKey = crypto
      .createHash('sha1')
      .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
      .digest('base64');

    const responseHeaders = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey}`
    ];

    socket.write(responseHeaders.join('\r\n') + '\r\n\r\n');

    const client = {
      socket,
      id: 'ws-' + Math.random().toString(36).substring(2, 9),
      buffer: Buffer.alloc(0)
    };

    this.clients.add(client);
    // Note: Do not send fake PING from backend server.
    // Real PING must come from physical ESP32 / Arduino Mega.

    socket.on('data', chunk => {
      client.buffer = Buffer.concat([client.buffer, chunk]);
      this.processFrames(client);
    });

    socket.on('close', () => this.clients.delete(client));
    socket.on('error', () => this.clients.delete(client));
  }

  processFrames(client) {
    while (client.buffer.length >= 2) {
      const byte1 = client.buffer[0];
      const byte2 = client.buffer[1];
      const opcode = byte1 & 0x0f;
      const masked = (byte2 & 0x80) === 0x80;
      let payloadLength = byte2 & 0x7f;
      let offset = 2;

      if (payloadLength === 126) {
        if (client.buffer.length < offset + 2) return;
        payloadLength = client.buffer.readUInt16BE(offset);
        offset += 2;
      } else if (payloadLength === 127) {
        if (client.buffer.length < offset + 8) return;
        payloadLength = Number(client.buffer.readBigUInt64BE(offset));
        offset += 8;
      }

      let maskingKey = null;
      if (masked) {
        if (client.buffer.length < offset + 4) return;
        maskingKey = client.buffer.slice(offset, offset + 4);
        offset += 4;
      }

      if (client.buffer.length < offset + payloadLength) return;

      const payload = client.buffer.slice(offset, offset + payloadLength);
      client.buffer = client.buffer.slice(offset + payloadLength);

      if (masked && maskingKey) {
        for (let i = 0; i < payload.length; i++) {
          payload[i] ^= maskingKey[i % 4];
        }
      }

      if (opcode === 0x8) {
        client.socket.end();
        this.clients.delete(client);
        return;
      } else if (opcode === 0x1) {
        const text = payload.toString('utf8');
        this.handleClientMessage(client, text);
      }
    }
  }

  encodeFrame(data, opcode = 0x1) {
    const payload = Buffer.from(data, 'utf8');
    const length = payload.length;
    let header;
    if (length < 126) {
      header = Buffer.from([0x80 | opcode, length]);
    } else if (length <= 0xffff) {
      header = Buffer.alloc(4);
      header[0] = 0x80 | opcode;
      header[1] = 126;
      header.writeUInt16BE(length, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x80 | opcode;
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(length), 2);
    }
    return Buffer.concat([header, payload]);
  }

  sendToClient(client, msg) {
    try {
      if (client.socket && client.socket.writable) {
        client.socket.write(this.encodeFrame(msg));
      }
    } catch (e) {}
  }

  broadcast(msg, exceptClient = null) {
    const frame = this.encodeFrame(msg);
    for (const client of this.clients) {
      if (client !== exceptClient && client.socket.writable) {
        try { client.socket.write(frame); } catch (e) {}
      }
    }
  }

  handleClientMessage(client, rawText) {
    const text = rawText.trim();
    if (!text) return;

    if (text.startsWith('{') && text.endsWith('}')) {
      try {
        const payload = JSON.parse(text);
        if (payload.type === 'SAVE_SESSION' && payload.session) {
          const saved = db.addSession(payload.session);
          this.broadcast(JSON.stringify({ type: 'SESSION_SAVED', session: saved }));
          return;
        }
      } catch (e) {}
    }

    if (text === 'STATUS?') {
      this.broadcast('STATUS?', client);
    } else if (text === 'STOP') {
      this.broadcast('STATE:idle');
    } else if (text.startsWith('START:')) {
      this.broadcast('STATE:running');
      this.broadcast(text, client);
    } else {
      this.broadcast(text, client);
    }
  }
}

/* ============================================================================
   3. HTTP & REST ROUTER
   ============================================================================ */
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) { req.destroy(); reject(new Error('Too large')); }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
    });
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-cache'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // REST API
  if (pathname.startsWith('/api/')) {
    try {
      if (pathname === '/api/status' && method === 'GET') {
        return sendJson(res, 200, {
          status: 'online',
          serverTime: new Date().toISOString(),
          connectedWsClients: wsServer.clients.size,
          databaseRecords: {
            learners: db.getLearners().length,
            sessions: db.getSessions().length,
            patterns: db.getPatterns().length
          }
        });
      }

      if (pathname === '/api/learners') {
        if (method === 'GET') return sendJson(res, 200, { success: true, learners: db.getLearners() });
        if (method === 'POST') {
          const body = await parseJsonBody(req);
          return sendJson(res, 201, { success: true, learner: db.addLearner(body) });
        }
      }

      if (pathname.startsWith('/api/learners/')) {
        const id = pathname.substring('/api/learners/'.length);
        if (method === 'PUT') {
          const body = await parseJsonBody(req);
          return sendJson(res, 200, { success: true, learner: db.updateLearner(id, body) });
        }
        if (method === 'DELETE') return sendJson(res, 200, { success: db.deleteLearner(id) });
      }

      if (pathname === '/api/sessions') {
        if (method === 'GET') {
          const learnerId = parsedUrl.searchParams.get('learnerId');
          const patternId = parsedUrl.searchParams.get('patternId');
          return sendJson(res, 200, { success: true, sessions: db.getSessions({ learnerId, patternId }) });
        }
        if (method === 'POST') {
          const body = await parseJsonBody(req);
          const session = db.addSession(body);
          wsServer.broadcast(JSON.stringify({ type: 'SESSION_SAVED', session }));
          return sendJson(res, 201, { success: true, session });
        }
        if (method === 'DELETE') {
          db.clearSessions();
          return sendJson(res, 200, { success: true });
        }
      }

      if (pathname.startsWith('/api/sessions/')) {
        const id = pathname.substring('/api/sessions/'.length);
        if (method === 'DELETE') return sendJson(res, 200, { success: db.deleteSession(id) });
      }

      if (pathname === '/api/patterns') {
        if (method === 'GET') return sendJson(res, 200, { success: true, patterns: db.getPatterns() });
        if (method === 'POST') {
          const body = await parseJsonBody(req);
          return sendJson(res, 201, { success: true, pattern: db.addPattern(body) });
        }
      }

      if (pathname.startsWith('/api/patterns/')) {
        const id = pathname.substring('/api/patterns/'.length);
        if (method === 'DELETE') return sendJson(res, 200, { success: db.deletePattern(id) });
      }

      if (pathname === '/api/analytics' && method === 'GET') {
        return sendJson(res, 200, { success: true, analytics: db.getAnalytics() });
      }

      if (pathname === '/api/export/csv' && method === 'GET') {
        const sessions = db.getSessions();
        const headers = ['SessionID', 'Date_Time', 'Learner', 'Pattern', 'Guidance', 'Hand', 'Accuracy', 'Correct', 'Wrong', 'Duration_Sec', 'Avg_Reaction_Ms', 'Motor_Score'];
        const rows = sessions.map(s => [
          s.id, s.timestamp, `"${(s.learnerName || '').replace(/"/g, '""')}"`, `"${(s.patternName || '').replace(/"/g, '""')}"`,
          s.guidance || 'easy', s.hand || 'Right', s.accuracy, s.correct, s.wrong, s.duration, s.avgReactionMs || 0, s.motorFluencyScore || 0
        ]);
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
        res.writeHead(200, {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="skillet_sessions.csv"',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(csvContent);
        return;
      }

      return sendJson(res, 404, { success: false, error: 'Not found' });
    } catch (e) {
      return sendJson(res, 500, { success: false, error: e.message });
    }
  }

  // Static File Serving
  let reqPath = pathname === '/' || pathname === '' ? '/index.html' : pathname;
  const filePath = path.join(FRONTEND_DIR, reqPath);

  if (!filePath.startsWith(FRONTEND_DIR)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404); res.end('Not Found'); return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

const wsServer = new WebSocketServer(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log('================================================================');
  console.log('  SKILLET - SMART TRAINING PAD REAL-TIME PLATFORM');
  console.log(`  Live UI & REST API: http://localhost:${PORT}/`);
  console.log(`  WebSocket Channel:  ws://localhost:${PORT}/ws`);
  console.log(`  Data Directory:     ${FRONTEND_DIR}`);
  console.log('================================================================');
});
