// ─── AutoPay Manager – Proxy Server ──────────────────────────────────────────
// All sensitive configuration is loaded from .env (never hardcoded here).
// Copy .env.example → .env and fill in your keys before starting.
require('dotenv').config();

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

// ─── Environment variables ────────────────────────────────────────────────────
// TWO_FACTOR_API_KEY : 2factor.in key for SMS OTP (required)
// RESEND_API_KEY     : Resend key for email notifications (required for emails)
// NOTIFY_EMAIL       : Recipient address for payment notifications (required for emails)
// EXCHANGE_RATE_KEY  : ExchangeRate-API key for currency conversion (required for FX)
// PORT               : HTTP port to listen on (default: 3000)

const PORT             = process.env.PORT || 3000;
const TWO_FACTOR_KEY   = process.env.TWO_FACTOR_API_KEY;
const RESEND_KEY       = process.env.RESEND_API_KEY;
const NOTIFY_EMAIL     = process.env.NOTIFY_EMAIL     || 'test@example.com';
const EXCHANGE_KEY     = process.env.EXCHANGE_RATE_KEY;

// Warn on startup if optional-but-important keys are missing
if (!TWO_FACTOR_KEY)  console.warn('[config] WARNING: TWO_FACTOR_API_KEY is not set — OTP routes will fail');
if (!RESEND_KEY)      console.warn('[config] WARNING: RESEND_API_KEY is not set — email routes will fail');
if (!EXCHANGE_KEY)    console.warn('[config] WARNING: EXCHANGE_RATE_KEY is not set — currency conversion will fail');

// MIME types for static files
const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
};

function proxyRequest(url, res) {
  https.get(url, (apiRes) => {
    let data = '';
    apiRes.on('data', chunk => data += chunk);
    apiRes.on('end', () => {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(data);
    });
  }).on('error', (e) => {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ Status: 'Error', Details: e.message }));
  });
}

const server = http.createServer((req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // ── Proxy: /api/send/:mobile ─────────────────────────────────────────────
  // Uses TWO_FACTOR_API_KEY from .env to send OTP via 2factor.in
  const sendMatch = url.pathname.match(/^\/api\/send\/(\d{10})$/);
  if (sendMatch) {
    if (!TWO_FACTOR_KEY) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ Status: 'Error', Details: 'TWO_FACTOR_API_KEY not configured' }));
    }
    const apiUrl = `https://2factor.in/API/V1/${TWO_FACTOR_KEY}/SMS/${sendMatch[1]}/AUTOGEN`;
    return proxyRequest(apiUrl, res);
  }

  // ── Proxy: /api/verify/:mobile/:otp ──────────────────────────────────────
  // Uses TWO_FACTOR_API_KEY from .env to verify OTP via 2factor.in
  const verifyMatch = url.pathname.match(/^\/api\/verify\/(\d{10})\/(\d{4,6})$/);
  if (verifyMatch) {
    if (!TWO_FACTOR_KEY) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ Status: 'Error', Details: 'TWO_FACTOR_API_KEY not configured' }));
    }
    const apiUrl = `https://2factor.in/API/V1/${TWO_FACTOR_KEY}/SMS/VERIFY3/${verifyMatch[1]}/${verifyMatch[2]}`;
    return proxyRequest(apiUrl, res);
  }

  // ── Email: POST /api/email ────────────────────────────────────────────────
  // Uses RESEND_API_KEY and NOTIFY_EMAIL from .env
  if (req.method === 'POST' && url.pathname === '/api/email') {
    if (!RESEND_KEY) {
      res.writeHead(503, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ ok: false, error: 'RESEND_API_KEY not configured' }));
    }
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { type, name, amount, date } = JSON.parse(body);
        const { Resend } = require('resend');
        const resend = new Resend(RESEND_KEY); // key from .env

        const isSuccess = type === 'success';
        const subject = isSuccess
          ? `Payment Confirmed: ${name}`
          : `Action Required: Payment Failed – ${name}`;

        const statusColor  = isSuccess ? '#10B981' : '#EF4444';
        const statusBg     = isSuccess ? '#ECFDF5' : '#FEF2F2';
        const statusLabel  = isSuccess ? 'Success' : 'Failed';
        const headline     = isSuccess
          ? `₹${amount} has been successfully deducted from your AutoPay balance.`
          : `Insufficient funds for ${name} (₹${amount}). Please top up your wallet.`;

        const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f4f7fe;font-family:Inter,Segoe UI,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fe;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#3D5AFE,#6B8EFF);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center">
          <table cellpadding="0" cellspacing="0" style="margin:0 auto">
            <tr>
              <td style="background:rgba(255,255,255,0.2);border-radius:14px;padding:12px;vertical-align:middle">
                <img src="https://img.icons8.com/ios/32/ffffff/bank-card-front-side.png" width="28" height="28" alt=""/>
              </td>
              <td style="padding-left:12px;vertical-align:middle">
                <p style="color:#fff;font-size:18px;font-weight:700;margin:0;line-height:1.2">AutoPay Manager</p>
                <p style="color:rgba(255,255,255,0.75);font-size:12px;margin:0">Smart Payments. Zero Hassle.</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:32px;border-left:1px solid #E5E7EB;border-right:1px solid #E5E7EB">

          <!-- Status badge -->
          <p style="text-align:center;margin:0 0 20px">
            <span style="display:inline-block;background:${statusBg};color:${statusColor};font-size:12px;font-weight:700;padding:5px 16px;border-radius:50px;letter-spacing:0.04em;text-transform:uppercase">${statusLabel}</span>
          </p>

          <h2 style="color:#1A1A2E;font-size:20px;font-weight:700;text-align:center;margin:0 0 8px">${subject}</h2>
          <p style="color:#6B7280;font-size:14px;text-align:center;margin:0 0 28px;line-height:1.6">${headline}</p>

          <!-- Transaction table -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;font-size:14px">
            <tr style="background:#F9FAFB">
              <td style="padding:10px 16px;color:#6B7280;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #E5E7EB">Field</td>
              <td style="padding:10px 16px;color:#6B7280;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #E5E7EB;text-align:right">Value</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;color:#6B7280;border-bottom:1px solid #F3F4F6">Service</td>
              <td style="padding:12px 16px;color:#1A1A2E;font-weight:600;text-align:right;border-bottom:1px solid #F3F4F6">${name}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;color:#6B7280;border-bottom:1px solid #F3F4F6">Amount</td>
              <td style="padding:12px 16px;color:#3D5AFE;font-weight:700;text-align:right;border-bottom:1px solid #F3F4F6">₹${amount}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;color:#6B7280;border-bottom:1px solid #F3F4F6">Date</td>
              <td style="padding:12px 16px;color:#1A1A2E;font-weight:600;text-align:right;border-bottom:1px solid #F3F4F6">${date}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;color:#6B7280">Status</td>
              <td style="padding:12px 16px;text-align:right">
                <span style="background:${statusBg};color:${statusColor};font-size:12px;font-weight:700;padding:3px 10px;border-radius:50px">${statusLabel}</span>
              </td>
            </tr>
          </table>

          ${!isSuccess ? `
          <!-- Top-up CTA -->
          <div style="text-align:center;margin-top:24px">
            <a href="http://localhost:3000" style="display:inline-block;background:linear-gradient(135deg,#3D5AFE,#6B8EFF);color:#fff;font-size:14px;font-weight:700;padding:13px 28px;border-radius:50px;text-decoration:none;box-shadow:0 4px 16px rgba(61,90,254,0.4)">Top Up Balance →</a>
          </div>` : ''}
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#F9FAFB;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center">
          <p style="color:#9CA3AF;font-size:12px;margin:0">This is an automated notification from AutoPay Manager.</p>
          <p style="color:#9CA3AF;font-size:12px;margin:4px 0 0">You're receiving this because you have AutoPay enabled.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

        const result = await resend.emails.send({
          from: 'AutoPay Manager <onboarding@resend.dev>',
          to: NOTIFY_EMAIL, // recipient from .env
          subject,
          html,
        });

        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok: true, id: result.data?.id }));
      } catch (err) {
        console.error('[email]', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // ── Exchange Rate: GET /api/exchange/:from ───────────────────────────────
  // Uses EXCHANGE_RATE_KEY from .env to fetch live rates from exchangerate-api.com
  const fxMatch = url.pathname.match(/^\/api\/exchange\/([A-Z]{3})$/);
  if (fxMatch) {
    if (!EXCHANGE_KEY) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'EXCHANGE_RATE_KEY not configured' }));
    }
    const apiUrl = `https://v6.exchangerate-api.com/v6/${EXCHANGE_KEY}/latest/${fxMatch[1]}`;
    return proxyRequest(apiUrl, res);
  }

  // ── Welcome Email: POST /api/welcome-email ───────────────────────────────
  // Uses RESEND_API_KEY and NOTIFY_EMAIL from .env
  if (req.method === 'POST' && url.pathname === '/api/welcome-email') {
    if (!RESEND_KEY) {
      res.writeHead(503, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ ok: false, error: 'RESEND_API_KEY not configured' }));
    }
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { balance, mobile } = JSON.parse(body);
        const { Resend } = require('resend');
        const resend = new Resend(RESEND_KEY); // key from .env
        const to = NOTIFY_EMAIL;               // recipient from .env

        const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Welcome to AutoPay Manager</title></head>
<body style="margin:0;padding:0;background:#f4f7fe;font-family:Inter,Segoe UI,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fe;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">

        <!-- Hero header -->
        <tr><td style="background:linear-gradient(135deg,#3D5AFE,#6B8EFF);border-radius:16px 16px 0 0;padding:40px 32px;text-align:center">
          <div style="width:72px;height:72px;background:rgba(255,255,255,0.2);border-radius:20px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px">
            <img src="https://img.icons8.com/ios/40/ffffff/bank-card-front-side.png" width="40" height="40" alt=""/>
          </div>
          <h1 style="color:#fff;font-size:24px;font-weight:700;margin:0 0 8px;line-height:1.3">Welcome to AutoPay Manager</h1>
          <p style="color:rgba(255,255,255,0.8);font-size:14px;margin:0;line-height:1.6">Smart Payments. Zero Hassle.</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:36px 32px;border-left:1px solid #E5E7EB;border-right:1px solid #E5E7EB">

          <p style="color:#1A1A2E;font-size:16px;font-weight:600;margin:0 0 8px">Hey there 👋</p>
          <p style="color:#6B7280;font-size:14px;line-height:1.7;margin:0 0 28px">
            Managing your subscriptions just got easier. You're all set up on AutoPay Manager —
            your personal hub for tracking, automating, and staying on top of every recurring payment.
          </p>

          <!-- Balance summary card -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F9FF;border-radius:14px;border:1px solid #E5E7EB;margin-bottom:28px">
            <tr>
              <td style="padding:20px 24px">
                <p style="color:#6B7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 6px">Your Current Balance</p>
                <p style="color:#3D5AFE;font-size:28px;font-weight:700;margin:0 0 4px">₹${balance}</p>
                <p style="color:#9CA3AF;font-size:12px;margin:0">Account: +91 ${mobile || 'XXXXXXXXXX'}</p>
              </td>
              <td style="padding:20px 24px;text-align:right;vertical-align:middle">
                <span style="display:inline-block;background:#EEF1FF;color:#3D5AFE;font-size:12px;font-weight:700;padding:6px 14px;border-radius:50px">Active</span>
              </td>
            </tr>
          </table>

          <!-- Feature highlights -->
          <p style="color:#1A1A2E;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 16px">What you can do</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${[
              ['🔄', 'Auto-Deduction', 'Payments are processed automatically on their due date.'],
              ['📊', 'Analytics', 'Track monthly spend and active subscriptions at a glance.'],
              ['🔔', 'Smart Alerts', 'Get notified when balance is low or a payment fails.'],
              ['✏️', 'Full Control', 'Add, edit, pause or delete any subscription anytime.'],
            ].map(([icon, title, desc]) => `
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #F3F4F6;vertical-align:top;width:36px">
                <span style="font-size:20px">${icon}</span>
              </td>
              <td style="padding:10px 0 10px 14px;border-bottom:1px solid #F3F4F6">
                <p style="color:#1A1A2E;font-size:14px;font-weight:600;margin:0 0 2px">${title}</p>
                <p style="color:#6B7280;font-size:13px;margin:0">${desc}</p>
              </td>
            </tr>`).join('')}
          </table>

          <!-- CTA button -->
          <div style="text-align:center;margin-top:32px">
            <a href="http://localhost:3000" style="display:inline-block;background:linear-gradient(135deg,#3D5AFE,#6B8EFF);color:#fff;font-size:15px;font-weight:700;padding:15px 36px;border-radius:50px;text-decoration:none;box-shadow:0 4px 16px rgba(61,90,254,0.4);letter-spacing:0.02em">
              Go to Dashboard →
            </a>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#F9FAFB;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center">
          <p style="color:#9CA3AF;font-size:12px;margin:0">You're receiving this because you just signed up for AutoPay Manager.</p>
          <p style="color:#9CA3AF;font-size:12px;margin:6px 0 0">© 2026 AutoPay Manager. All rights reserved.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

        const result = await resend.emails.send({
          from: 'AutoPay Manager <onboarding@resend.dev>',
          to,
          subject: 'Welcome to AutoPay Manager 🎉',
          html,
        });

        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok: true, id: result.data?.id }));
      } catch (err) {
        console.error('[welcome-email]', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // ── Serve static files from /public ─────────────────────────────────────────
  let filePath = path.join(__dirname, 'public', url.pathname === '/' ? 'index.html' : url.pathname);
  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(__dirname, 'public', 'index.html'), (e, d) => {
        if (e) { res.writeHead(404); return res.end('Not found'); }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(d);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n  AutoPay Manager running at http://localhost:${PORT}\n`);
});
