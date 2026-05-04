require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const http = require('http');
const https = require('https');
const { initDB } = require('./db');
const { pollAllAccounts } = require('./imap');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 4000;
const POLL_INTERVAL = Math.max(60, parseInt(process.env.POLL_INTERVAL || '60'));
const SELF_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'DELETE'],
}));
app.use(express.json());
app.use('/api', routes);
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// Keep-alive ping — hits /health every 10 minutes to prevent Render free tier sleep
function keepAlive() {
  const url = `${SELF_URL}/health`;
  const lib = url.startsWith('https') ? https : http;
  lib.get(url, (res) => {
    console.log(`[KEEP-ALIVE] Ping ${url} → ${res.statusCode}`);
  }).on('error', (err) => {
    console.warn(`[KEEP-ALIVE] Ping failed:`, err.message);
  });
}

let polling = false;

async function safePoll() {
  if (polling) {
    console.log('[CRON] Skipping poll — previous poll still running');
    return;
  }
  polling = true;
  try {
    await pollAllAccounts();
  } finally {
    polling = false;
  }
}

async function start() {
  await initDB();

  safePoll();

  const mins = Math.floor(POLL_INTERVAL / 60);
  const cronExpr = mins >= 1 ? `*/${mins} * * * *` : `* * * * *`;
  cron.schedule(cronExpr, safePoll);
  console.log(`[CRON] Polling every ${POLL_INTERVAL}s`);

  // Ping self every 10 minutes
  cron.schedule('*/10 * * * *', keepAlive);
  console.log(`[KEEP-ALIVE] Auto-ping every 10 minutes → ${SELF_URL}`);

  app.listen(PORT, () => {
    console.log(`[SERVER] Running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('[SERVER] Fatal startup error:', err);
  process.exit(1);
});
