import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from "@google/genai";

// Load environment variables from .env or .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '.env.local') }); // Override with .env.local if present

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files from the 'dist' directory
app.use(express.static(path.join(__dirname, 'dist')));

// Set up Nodemailer transporter using Tencent Enterprise Email SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.everstory.cn',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'admin@everstory.cn',
    pass: process.env.SMTP_PASSWORD, // Must be provided in .env
  },
});

app.post('/api/send-email', async (req, res) => {
  try {
    const { email, projectId, inviterName, projectTitle } = req.body;

    if (!email || !projectId) {
      return res.status(400).json({ error: 'Missing email or projectId' });
    }

    if (!process.env.SMTP_PASSWORD) {
      console.error('SMTP_PASSWORD environment variable is not set correctly.');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const finalLink = `https://everstory.cc?inviteProjectId=${projectId}`;

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8f5f0;">
        <div style="background-color: #1a3a3a; padding: 32px 24px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: #BEF264; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 2px;">长生記</h1>
          <p style="color: rgba(255,255,255,0.7); margin: 8px 0 0; font-size: 13px; letter-spacing: 1px;">Everstory</p>
        </div>
        <div style="background: white; padding: 32px 24px; border-left: 1px solid #eee; border-right: 1px solid #eee;">
          <p style="font-size: 16px; color: #333; margin: 0 0 16px;">您好！</p>
          <p style="font-size: 16px; color: #333; margin: 0 0 16px;">
            <strong>${inviterName || '您的好友'}</strong> 邀请您加入项目 <strong style="color: #1a3a3a;">"${projectTitle || '家庭回忆录'}"</strong>。
          </p>
          <p style="font-size: 15px; color: #666; margin: 0 0 24px; line-height: 1.6;">
            在这里，您可以一起记录珍贵的家庭故事，分享照片，共同打造属于家族的数字传记。
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${finalLink}" style="display: inline-block; background-color: #1a3a3a; color: white; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              立即加入项目
            </a>
          </div>
          <p style="font-size: 13px; color: #999; margin: 24px 0 0; line-height: 1.5;">
            如果按钮无法点击，请复制以下链接到浏览器打开：<br/>
            <a href="${finalLink}" style="color: #1a3a3a; word-break: break-all;">${finalLink}</a>
          </p>
        </div>
        <div style="background-color: #f8f5f0; padding: 20px 24px; text-align: center; border-radius: 0 0 12px 12px; border: 1px solid #eee; border-top: none;">
          <p style="font-size: 12px; color: #999; margin: 0;">此邮件由 长生記 系统自动发送，请勿直接回复。</p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: '"长生記 Everstory" <admin@everstory.cn>',
      to: email,
      subject: `[长生記] ${inviterName || '好友'} 邀请您共同记录故事`,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);

    res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Gemini AI Proxy
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let genAI = null;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
}

const MODELS_LIST = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash"
];

async function withRetry(fn, initialDelay = 1000) {
  let lastError;
  for (const modelName of MODELS_LIST) {
    for (let i = 0; i < 2; i++) {
      try {
        return await fn(modelName);
      } catch (error) {
        lastError = error;
        const status = error.status || (error.error?.code);
        if (status === 404) break;
        const isBusy = status === 503 || status === 429;
        if (!isBusy) break;
        const delay = initialDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

app.post('/api/ai/process', async (req, res) => {
  if (!genAI) {
    return res.status(500).json({ error: 'Gemini API not configured on server' });
  }

  const { action, payload } = req.body;

  try {
    console.log(`AI Proxy request - Action: ${action}, payload keys: ${Object.keys(payload)}`);
    let result;
    switch (action) {
      case 'generateStory':
      case 'transcribe': {
        const { base64Data, mimeType, prompt } = payload;
        result = await withRetry(async (modelName) => {
          console.log(`Attempting AI with model: ${modelName} for action: ${action}`);
          const response = await genAI.models.generateContent({
            model: modelName,
            contents: [{
              parts: [
                { inlineData: { data: base64Data, mimeType } },
                { text: prompt }
              ]
            }]
          });
          return response.text;
        });
        break;
      }
      case 'optimize':
      case 'generatePrompts': {
        const { prompt } = payload;
        result = await withRetry(async (modelName) => {
          console.log(`Attempting AI with model: ${modelName} for action: ${action}`);
          const response = await genAI.models.generateContent({
            model: modelName,
            contents: [{ parts: [{ text: prompt }] }]
          });
          return response.text;
        });
        break;
      }
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    res.json({ result });
  } catch (error) {
    console.error(`AI Proxy error (${action}):`, error);
    // Extract a cleaner error message if possible
    let errorMsg = error.message || 'AI processing failed';
    if (error.status && error.statusText) {
      errorMsg = `${error.status} ${error.statusText}: ${errorMsg}`;
    }
    res.status(500).json({ error: errorMsg });
  }
});

// All other GET requests not handled before will serve index.html (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Email SMTP server running on port ${PORT}`);
});
