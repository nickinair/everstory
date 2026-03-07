import express from 'express';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import tencentcloud from 'tencentcloud-sdk-nodejs-sms';
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';
import COS from 'cos-nodejs-sdk-v5';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import os from 'os';
import { stat } from 'fs/promises';
import FormData from 'form-data';
import wavefile from 'wavefile';

const SmsClient = tencentcloud.sms.v20210111.Client;

// Load environment variables from .env or .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '.env.local') }); // Override with .env.local if present

const app = express();
const PORT = process.env.PORT || 3005;

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

// Initialize MySQL Pool
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10, // max idle connections, the default value is the same as `connectionLimit`
  idleTimeout: 60000, // idle connections timeout, in milliseconds, the default value 60000
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'everstory-secret-key-2026';

// Initialize Tencent COS Client
const cos = new COS({
  SecretId: process.env.TENCENT_SECRET_ID,
  SecretKey: process.env.TENCENT_SECRET_KEY,
});
const COS_BUCKET = process.env.TENCENT_COS_BUCKET;
const COS_REGION = process.env.TENCENT_COS_REGION;

// Initialize Tencent Cloud SMS Client
const smsClient = new SmsClient({
  credential: {
    secretId: process.env.TENCENT_SECRET_ID,
    secretKey: process.env.TENCENT_SECRET_KEY,
  },
  region: process.env.TENCENT_SMS_REGION || "ap-guangzhou",
  profile: {
    httpProfile: {
      endpoint: "sms.tencentcloudapi.com",
    },
  },
});

// --- Middleware ---
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

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

// --- SMS Endpoints ---

// Send OTP via Tencent Cloud SMS
app.post('/api/sms/send-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: '手机号不能为空' });
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

  try {
    // 1. Store OTP in database
    await pool.query(
      'INSERT INTO phone_otps (phone, code, expires_at) VALUES (?, ?, ?)',
      [phone, otp, expiresAt]
    );

    // 2. Send SMS via Tencent Cloud
    const params = {
      SmsSdkAppId: process.env.TENCENT_SMS_APP_ID,
      SignName: process.env.TENCENT_SMS_SIGN_NAME,
      TemplateId: process.env.TENCENT_SMS_TEMPLATE_ID,
      TemplateParamSet: [otp], // Only {1} is present in template 2605713
      PhoneNumberSet: [`+86${phone.replace(/\D/g, '')}`],
    };

    smsClient.SendSms(params).then(
      (data) => {
        console.log('SMS Sent Successfully:', data);
        if (data.SendStatusSet[0].Code === 'Ok') {
          res.json({ success: true, message: '验证码已发送' });
        } else {
          res.status(500).json({ error: `发送失败: ${data.SendStatusSet[0].Message}` });
        }
      },
      (err) => {
        console.error('SMS Send Error:', err);
        res.status(500).json({ error: '短信服务调用失败' });
      }
    );

  } catch (error) {
    console.error('OTP Process Error:', error);
    res.status(500).json({ error: '系统错误，请稍后重试' });
  }
});

// Verify OTP
app.post('/api/sms/verify-otp', async (req, res) => {
  const { phone, code } = req.body;

  try {
    const [otps] = await pool.query(
      'SELECT * FROM phone_otps WHERE phone = ? AND code = ? AND used = FALSE AND expires_at > NOW()',
      [phone, code]
    );

    if (otps.length === 0) {
      return res.status(400).json({ error: '验证码无效或已过期' });
    }

    const otpData = otps[0];

    // Mark as used
    await pool.query('UPDATE phone_otps SET used = TRUE WHERE id = ?', [otpData.id]);

    res.json({ success: true, message: '验证成功' });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// Send Project Invitation via SMS
app.post('/api/sms/send-invite', async (req, res) => {
  const { phone, inviterName, projectName, projectId } = req.body;
  if (!phone || !projectId) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  const inviteLink = `https://everstory.cc?inviteProjectId=${projectId}`;

  try {
    const params = {
      SmsSdkAppId: process.env.TENCENT_SMS_APP_ID,
      SignName: process.env.TENCENT_SMS_SIGN_NAME,
      TemplateId: process.env.TENCENT_SMS_INVITE_TEMPLATE_ID || process.env.TENCENT_SMS_TEMPLATE_ID, // Use dedicated template if available
      TemplateParamSet: [inviterName || '您的好友', projectName || '新项目', inviteLink], // {1} inviter, {2} project, {3} link
      PhoneNumberSet: [`+86${phone.replace(/\D/g, '')}`],
    };

    smsClient.SendSms(params).then(
      (data) => {
        if (data.SendStatusSet[0].Code === 'Ok') {
          res.json({ success: true });
        } else {
          res.status(500).json({ error: data.SendStatusSet[0].Message });
        }
      },
      (err) => {
        res.status(500).json({ error: '发送失败' });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update password
app.post('/api/auth/update-password', authenticate, async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      'UPDATE profiles SET password_hash = ? WHERE id = ?',
      [hashedPassword, req.user.id]
    );
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Custom Email OTP functionality (Bypasses Supabase default email change flow)
app.post('/api/email/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: '无效的电子邮箱' });
  }

  try {
    // 1. Generate 8-digit OTP
    const code = Math.floor(10000000 + Math.random() * 90000000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // 2. Save to database
    await pool.query(
      'INSERT INTO email_otps (email, code, expires_at) VALUES (?, ?, ?)',
      [email, code, expiresAt]
    );

    // 3. Send email using nodemailer
    const mailOptions = {
      from: `"长生记 Everstory" <${process.env.SMTP_USER}>`,
      to: email,
      subject: '[长生记] 账号安全验证',
      html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8f5f0;">
            <div style="background-color: #1a3a3a; padding: 32px 24px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: #BEF264; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 2px;">长生記</h1>
            </div>
            <div style="background: white; padding: 32px 24px; border-left: 1px solid #eee; border-right: 1px solid #eee;">
              <p style="font-size: 16px; color: #333; margin: 0 0 16px;">您好！</p>
              <p style="font-size: 16px; color: #333; margin: 0 0 16px;">
                您正在进行账号安全操作（更换关联邮箱）。您的验证码为：
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <span style="display: inline-block; background-color: #f3f4f6; color: #1f2937; padding: 14px 36px; border-radius: 8px; font-weight: bold; font-size: 32px; letter-spacing: 4px;">
                  ${code}
                </span>
              </div>
              <p style="font-size: 13px; color: #666; margin: 24px 0 0; line-height: 1.5;">
                验证码在 5 分钟内有效。如非本人操作，请忽略此邮件。
              </p>
            </div>
          </div>
        `
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: '验证码已发送' });
  } catch (error) {
    console.error('Email Send Error:', error);
    res.status(500).json({ error: '发送失败' });
  }
});

app.post('/api/auth/update-email', async (req, res) => {
  const { userId, newEmail, code } = req.body;
  if (!userId || !newEmail || !code) {
    return res.status(400).json({ error: '参数缺失' });
  }

  try {
    // 1. Verify OTP
    const [otps] = await pool.query(
      `SELECT * FROM email_otps
       WHERE email = ? AND code = ? AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [newEmail, code]
    );

    if (otps.length === 0) {
      return res.status(400).json({ error: '验证码无效或已过期' });
    }

    const otpData = otps[0];

    // 2. Update User Email (This assumes we have a users table or we're using auth.users schema)
    // For simplicity in self-hosted, we'll update the email in our profiles table.
    // In a real migration from Supabase Auth, you'd need a local users table.
    await pool.query(
      'UPDATE profiles SET email = ? WHERE id = ?',
      [newEmail, userId]
    );

    // 3. Mark OTP as used
    await pool.query('UPDATE email_otps SET used = TRUE WHERE id = ?', [otpData.id]);

    res.json({ success: true, message: '邮箱更新成功' });
  } catch (error) {
    console.error('Update Email Error:', error);
    res.status(500).json({ error: '更新失败: ' + (error.message || '服务器错误') });
  }
});

// Register user via Phone (using SMS verification)
app.post('/api/auth/register-phone', async (req, res) => {
  const { phone, password, fullName, code } = req.body;
  if (!phone || !password || !code) {
    return res.status(400).json({ error: '字段缺失' });
  }

  try {
    // 1. Verify OTP first
    const [otpRows] = await pool.query(
      `SELECT * FROM phone_otps 
       WHERE phone = ? AND code = ? AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [phone, code]
    );

    if (otpRows.length === 0) {
      return res.status(400).json({ error: '验证码无效或已过期' });
    }

    const otpData = otpRows[0];

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Create user in profiles table
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('86') ? `+${cleanPhone}` : `+86${cleanPhone}`;
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanPhone)}`;

    await pool.query(
      `INSERT INTO profiles (full_name, phone, password_hash, avatar_url, email)
       VALUES (?, ?, ?, ?, ?)`,
      [fullName, formattedPhone, hashedPassword, avatarUrl, `user_${cleanPhone}@everstory.ai`]
    );

    const [userRows] = await pool.query('SELECT * FROM profiles WHERE phone = ?', [formattedPhone]);
    const user = userRows[0];

    // 4. Mark OTP as used
    await pool.query('UPDATE phone_otps SET used = TRUE WHERE id = ?', [otpData.id]);

    // 5. Generate JWT
    const token = jwt.sign({ id: user.id, phone: user.phone }, JWT_SECRET, { expiresIn: '30d' });

    res.json({ success: true, token, user: { id: user.id, fullName: user.full_name, phone: user.phone } });
  } catch (error) {
    console.error('Registration Error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: '该手机号已注册，请直接登录' });
    }
    res.status(500).json({ error: '注册失败: ' + (error.message || '服务器错误') });
  }
});

// Register user via Email
app.post('/api/auth/register-email', async (req, res) => {
  const { email, password, fullName, code } = req.body;
  if (!email || !password || !code) {
    return res.status(400).json({ error: '字段缺失' });
  }

  try {
    // 1. Verify Email OTP
    const [otpRows] = await pool.query(
      `SELECT * FROM email_otps 
       WHERE email = ? AND code = ? AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email, code]
    );

    if (otpRows.length === 0) {
      return res.status(400).json({ error: '验证码无效或已过期' });
    }

    const otpData = otpRows[0];

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Create user in profiles
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`;

    const [result] = await pool.query(
      `INSERT INTO profiles (full_name, email, password_hash, avatar_url, phone)
       VALUES (?, ?, ?, ?, ?)`,
      [fullName, email, hashedPassword, avatarUrl, null]
    );

    const userId = result.insertId;
    const [userRows] = await pool.query('SELECT * FROM profiles WHERE id = ?', [userId]);
    const user = userRows[0];

    // 4. Mark OTP as used
    await pool.query('UPDATE email_otps SET used = TRUE WHERE id = ?', [otpData.id]);

    // 5. Generate JWT
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

    res.json({ success: true, token, user: { id: user.id, fullName: user.full_name, email: user.email } });
  } catch (error) {
    console.error('Email Registration Error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: '该邮箱已注册，请直接登录' });
    }
    res.status(500).json({ error: '注册失败: ' + (error.message || '服务器错误') });
  }
});

// Login via Phone and Password
app.post('/api/auth/login', async (req, res) => {
  try {
    const { phone, password, identifier, type, email } = req.body;
    let user;

    // Determine login identifier (phone or email)
    const loginId = identifier || phone || email;
    const loginType = type || (loginId && loginId.toString().includes('@') ? 'email' : 'phone');

    if (loginType === 'email') {
      if (!loginId) return res.status(400).json({ error: '请输入邮箱' });
      const [rows] = await pool.query('SELECT * FROM profiles WHERE email = ?', [loginId]);
      if (rows.length === 0) return res.status(401).json({ error: '账号或密码错误' });
      user = rows[0];
    } else {
      if (!loginId) return res.status(400).json({ error: '请输入手机号' });

      const cleanPhone = loginId.toString().replace(/\D/g, '');
      const formattedPhone = cleanPhone.startsWith('86') ? `+${cleanPhone}` : `+86${cleanPhone}`;

      const [rows] = await pool.query('SELECT * FROM profiles WHERE phone = ?', [formattedPhone]);
      if (rows.length === 0) return res.status(401).json({ error: '账号或密码错误' });
      user = rows[0];
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: '账号或密码错误' });
    }

    const token = jwt.sign({ id: user.id, phone: user.phone, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      success: true,
      token,
      user: { id: user.id, fullName: user.full_name, phone: user.phone, email: user.email, avatarUrl: user.avatar_url }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: '登录失败: ' + error.message });
  }
});

// Get current user info
app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, full_name, email, phone, avatar_url, is_premium FROM profiles WHERE id = ?', [req.user.id]); // Changed $1 to ?
    if (rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }
    res.json({ user: rows[0] });
  } catch (error) {
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

// Update User Phone
app.post('/api/auth/update-phone', authenticate, async (req, res) => {
  const { newPhone, code } = req.body;
  const userId = req.user.id;

  if (!newPhone || !code) {
    return res.status(400).json({ error: '字段缺失' });
  }

  try {
    // 1. Verify OTP first
    const [otpRows] = await pool.query(
      `SELECT * FROM phone_otps
       WHERE phone = ? AND code = ? AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [newPhone, code]
    );

    if (otpRows.length === 0) {
      return res.status(400).json({ error: '验证码无效或已过期' });
    }

    const otpData = otpRows[0];
    const cleanPhone = newPhone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('86') ? `+${cleanPhone}` : `+86${cleanPhone}`;

    // 2. Update Profile
    await pool.query(
      'UPDATE profiles SET phone = ?, updated_at = NOW() WHERE id = ?',
      [formattedPhone, userId]
    );

    // 3. Mark OTP as used
    await pool.query('UPDATE phone_otps SET used = TRUE WHERE id = ?', [otpData.id]);

    res.json({ success: true, message: '更新成功' });
  } catch (error) {
    console.error('Update Phone Error:', error);
    res.status(500).json({ error: '更新失败: ' + (error.message || '服务器错误') });
  }
});

// --- Points Redemption ---
app.post('/api/points/redeem', authenticate, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: '请输入兑换码' });

  // Simple hardcoded mapping
  const validCodes = {
    'ES-GIFT-1000-N7B2R9': 1000,
    'EVERSTORY-500': 500,
    'ES-PLATINUM-2000-W4X7V2': 2000,
  };

  const pointsToAdd = validCodes[code.toUpperCase()];
  if (!pointsToAdd) return res.status(404).json({ error: '兑换码无效或已过期' });

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.query('SELECT balance FROM points WHERE user_id = ?', [req.user.id]);
    if (rows.length === 0) {
      await connection.query('INSERT INTO points (user_id, balance) VALUES (?, ?)', [req.user.id, pointsToAdd]);
    } else {
      await connection.query('UPDATE points SET balance = balance + ? WHERE user_id = ?', [pointsToAdd, req.user.id]);
    }
    await connection.query('INSERT INTO points_history (user_id, type, points) VALUES (?, ?, ?)', [req.user.id, 'redemption', pointsToAdd]);

    await connection.commit();
    res.json({ success: true, points: pointsToAdd });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Points redeem error:', error);
    res.status(500).json({ error: '兑换失败，请稍后重试' });
  } finally {
    if (connection) connection.release();
  }
});

// --- Storage Endpoints (Tencent COS) ---

// Get pre-signed URL for upload
app.post('/api/storage/upload-url', authenticate, async (req, res) => {
  const { fileName, fileType } = req.body;
  const key = `media/${req.user.id}/${Date.now()}_${fileName}`;

  cos.getAuth({
    Method: 'PUT',
    Key: key,
  }, (err, auth) => {
    if (err) return res.status(500).json({ error: 'Failed to generate upload auth' });

    const url = `https://${COS_BUCKET}.cos.${COS_REGION}.myqcloud.com/${key}`;
    res.json({ url, key, auth });
  });
});

// Simple direct upload (for small files/blobs)
app.post('/api/storage/upload', authenticate, async (req, res) => {
  const { base64Data, fileName, fileType } = req.body;
  const buffer = Buffer.from(base64Data, 'base64');
  const key = `media/${req.user.id}/${Date.now()}_${fileName || 'upload.bin'}`;

  cos.putObject({
    Bucket: COS_BUCKET,
    Region: COS_REGION,
    Key: key,
    Body: buffer,
    ContentType: fileType,
  }, (err, data) => {
    if (err) {
      console.error('COS Upload Error:', err);
      return res.status(500).json({ error: 'Upload failed' });
    }
    const publicUrl = `https://${COS_BUCKET}.cos.${COS_REGION}.myqcloud.com/${key}`;
    res.json({ url: publicUrl, key });
  });
});

// --- Project Endpoints ---

app.get('/api/projects', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query( // Changed to destructure for MySQL result format
      `SELECT p.*,
        (SELECT JSON_ARRAYAGG(JSON_OBJECT('project_id', pm.project_id, 'user_id', pm.user_id, 'role', pm.role)) FROM project_members pm WHERE pm.project_id = p.id) as members
       FROM projects p
       JOIN project_members pm ON p.id = pm.project_id
       WHERE pm.user_id = ?`, // Changed $1 to ?, json_agg to JSON_ARRAYAGG, json_build_object to JSON_OBJECT
      [req.user.id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: '获取项目失败' });
  }
});

app.post('/api/projects', authenticate, async (req, res) => {
  const { name, description } = req.body;
  const client = await pool.getConnection(); // Changed pool.connect() to pool.getConnection() for MySQL
  try {
    await client.beginTransaction(); // Changed client.query('BEGIN') to client.beginTransaction()
    const [result] = await client.query( // Changed to destructure for MySQL result format
      'INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)', // Changed $1/$2/$3 to ?
      [name, description, req.user.id]
    );
    const projectId = result.insertId; // Get the ID of the newly inserted project for auto-increment IDs
    // If using UUIDs, you'd need to fetch the project by another unique field or generate UUID client-side.
    // Assuming `id` is auto-increment for simplicity here, or that `RETURNING *` is not supported.
    const [projectRows] = await client.query('SELECT * FROM projects WHERE id = ?', [projectId]);
    const project = projectRows[0];

    await client.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)', // Changed $1/$2/$3 to ?
      [project.id, req.user.id, 'owner']
    );
    await client.commit(); // Changed client.query('COMMIT') to client.commit()
    res.json(project);
  } catch (error) {
    await client.rollback(); // Changed client.query('ROLLBACK') to client.rollback()
    res.status(500).json({ error: '创建项目失败' });
  } finally {
    client.release();
  }
});

app.get('/api/projects/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query( // Changed to destructure for MySQL result format
      'SELECT * FROM projects WHERE id = ?', // Changed $1 to ?
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: '项目不存在' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: '获取项目详情失败' });
  }
});

app.patch('/api/projects/:id', authenticate, async (req, res) => {
  const { name, description } = req.body;
  try {
    const [result] = await pool.query( // Changed to destructure for MySQL result format
      'UPDATE projects SET name = COALESCE(?, name), description = COALESCE(?, description) WHERE id = ? AND owner_id = ?', // Changed $1/$2/$3/$4 to ?
      [name, description, req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(403).json({ error: '无权修改或项目不存在' }); // Check affectedRows for MySQL
    const [rows] = await pool.query('SELECT * FROM projects WHERE id = ?', [req.params.id]); // Fetch updated row
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: '更新项目失败' });
  }
});

app.delete('/api/projects/:id', authenticate, async (req, res) => {
  try {
    const [result] = await pool.query( // Changed to destructure for MySQL result format
      'DELETE FROM projects WHERE id = ? AND owner_id = ?', // Changed $1/$2 to ?
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(403).json({ error: '无权删除或项目不存在' }); // Check affectedRows for MySQL
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除项目失败' });
  }
});

// --- Story Endpoints ---

app.get('/api/projects/:projectId/stories', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT *, cover_url as imageUrl FROM stories WHERE project_id = ? ORDER BY created_at DESC',
      [req.params.projectId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: '获取故事失败' });
  }
});

app.post('/api/projects/:projectId/stories', authenticate, async (req, res) => {
  const { title, content, image_url, audio_url, cover_url, type, pages, metadata, prompt_id } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO stories (project_id, title, content, cover_url, audio_url, type, pages, metadata, prompt_id, owner_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.params.projectId,
        title,
        content,
        cover_url || image_url,
        audio_url,
        type || 'audio',
        pages || 1,
        JSON.stringify(metadata || {}),
        prompt_id,
        req.user.id
      ]
    );
    const storyId = result.insertId;
    const [rows] = await pool.query('SELECT *, cover_url as imageUrl FROM stories WHERE id = ?', [storyId]);
    res.json(rows[0]);
  } catch (error) {
    console.error('Create Story Error:', error);
    res.status(500).json({ error: '创建故事失败: ' + error.message });
  }
});

app.get('/api/stories/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT *, cover_url as imageUrl FROM stories WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: '故事不存在' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: '获取故事详情失败' });
  }
});

app.patch('/api/stories/:id', authenticate, async (req, res) => {
  const { title, content, image_url, audio_url, cover_url, type, pages, metadata, status } = req.body;
  try {
    const [result] = await pool.query(
      `UPDATE stories SET 
        title = COALESCE(?, title), 
        content = COALESCE(?, content), 
        cover_url = COALESCE(?, cover_url),
        audio_url = COALESCE(?, audio_url),
        type = COALESCE(?, type),
        pages = COALESCE(?, pages),
        metadata = COALESCE(?, metadata),
        status = COALESCE(?, status)
       WHERE id = ?`,
      [
        title, content, cover_url || image_url, audio_url, type, pages,
        metadata ? JSON.stringify(metadata) : null,
        status,
        req.params.id
      ]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: '故事不存在' });
    const [rows] = await pool.query('SELECT *, cover_url as imageUrl FROM stories WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (error) {
    console.error('Update Story Error:', error);
    res.status(500).json({ error: '更新故事失败: ' + error.message });
  }
});

app.delete('/api/stories/:id', authenticate, async (req, res) => {
  try {
    await pool.query('DELETE FROM stories WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除故事失败' });
  }
});

// --- Interaction Endpoints ---

app.get('/api/stories/:storyId/interactions', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT i.*, p.full_name, p.phone, p.avatar_url 
       FROM story_interactions i
       JOIN profiles p ON i.user_id = p.id
       WHERE i.story_id = ?
       ORDER BY i.created_at DESC`,
      [req.params.storyId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Get Interactions Error:', error);
    res.status(500).json({ error: '获取互动记录失败' });
  }
});

app.post('/api/stories/:storyId/interactions', authenticate, async (req, res) => {
  const { type, content } = req.body;
  try {
    await pool.query(
      'INSERT INTO story_interactions (story_id, user_id, type, content) VALUES (?, ?, ?, ?)',
      [req.params.storyId, req.user.id, type, content]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Add Interaction Error:', error);
    res.status(500).json({ error: '添加互动失败' });
  }
});

app.get('/api/projects/:projectId/interactions', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT i.*, p.full_name, p.phone, p.avatar_url, s.title as story_title
       FROM story_interactions i
       JOIN profiles p ON i.user_id = p.id
       JOIN stories s ON i.story_id = s.id
       WHERE s.project_id = ?
       ORDER BY i.created_at DESC`,
      [req.params.projectId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Get Project Interactions Error:', error);
    res.status(500).json({ error: '获取项目互动历史失败' });
  }
});

// --- Prompt Endpoints ---

app.get('/api/projects/:projectId/prompts', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM prompts WHERE project_id = ? ORDER BY sent_date ASC',
      [req.params.projectId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: '获取提示词失败' });
  }
});

app.post('/api/projects/:projectId/prompts', authenticate, async (req, res) => {
  const { question, image_url, category, status } = req.body;
  const promptId = req.body.id || crypto.randomUUID();
  try {
    await pool.query(
      `INSERT INTO prompts (id, project_id, question, image_url, category, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [promptId, req.params.projectId, question, image_url, category, status || 'sent']
    );
    const [rows] = await pool.query('SELECT * FROM prompts WHERE id = ?', [promptId]);
    res.json(rows[0]);
  } catch (error) {
    console.error('Create Prompt Error:', error);
    res.status(500).json({ error: '创建提示词失败' });
  }
});

app.patch('/api/prompts/:id', authenticate, async (req, res) => {
  const { status } = req.body;
  try {
    await pool.query('UPDATE prompts SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '更新提示词状态失败' });
  }
});

// --- Order Endpoints ---

app.get('/api/projects/:projectId/orders', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT o.*, (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', ol.id, 'order_id', ol.order_id)) FROM order_logistics ol WHERE ol.order_id = o.id) as logistics 
       FROM orders o WHERE o.project_id = ? ORDER BY o.created_at DESC`,
      [req.params.projectId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: '获取订单失败' });
  }
});

app.post('/api/projects/:projectId/orders', authenticate, async (req, res) => {
  const { id, book_title, book_subtitle, book_author, cover_color, image_url, status, price, recipient_name, contact_phone, shipping_address } = req.body;
  const orderId = id || `ORD-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

  const client = await pool.getConnection();
  try {
    await client.beginTransaction();
    await client.query(
      `INSERT INTO orders (id, project_id, user_id, book_title, book_subtitle, book_author, cover_color, image_url, status, price, recipient_name, contact_phone, shipping_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [orderId, req.params.projectId, req.user.id, book_title, book_subtitle, book_author, cover_color, image_url, status || 'processing', price, recipient_name, contact_phone, shipping_address]
    );
    // Set premium status
    if (status === 'processing' || !status) {
      await client.query('UPDATE profiles SET is_premium = TRUE WHERE id = ?', [req.user.id]);
    }
    await client.commit();
    const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    res.json(rows[0]);
  } catch (error) {
    await client.rollback();
    res.status(500).json({ error: '创建订单失败' });
  } finally {
    client.release();
  }
});

// --- Project Members & Invitations ---

app.post('/api/projects/:projectId/join', authenticate, async (req, res) => {
  const { projectId } = req.params;
  const userId = req.user.id;
  try {
    // Check if already a member
    const [existing] = await pool.query(
      'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, userId]
    );
    if (existing.length > 0) {
      return res.json({ success: true, message: '已是成员' });
    }
    await pool.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
      [projectId, userId, 'collaborator']
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Join Project Error:', error);
    res.status(500).json({ error: '加入项目失败' });
  }
});

app.get('/api/projects/:projectId/members', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT pm.*, p.full_name, p.avatar_url, p.phone, p.email
       FROM project_members pm
       JOIN profiles p ON pm.user_id = p.id
       WHERE pm.project_id = ?`,
      [req.params.projectId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: '获取成员失败' });
  }
});

app.get('/api/projects/:projectId/invitations', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT email, phone, status FROM project_invitations WHERE project_id = ?',
      [req.params.projectId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: '获取邀请记录失败' });
  }
});

app.post('/api/projects/:projectId/invitations', authenticate, async (req, res) => {
  const { email, phone } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO project_invitations (project_id, email, phone) VALUES (?, ?, ?)',
      [req.params.projectId, email, phone]
    );
    const [rows] = await pool.query('SELECT * FROM project_invitations WHERE id = ?', [result.insertId]);
    res.json(rows[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.json({ success: true, message: '已存在邀请' });
    res.status(500).json({ error: '创建邀请失败' });
  }
});

app.delete('/api/projects/:projectId/invitations/:identifier', authenticate, async (req, res) => {
  const { projectId, identifier } = req.params;
  try {
    await pool.query(
      'DELETE FROM project_invitations WHERE project_id = ? AND (email = ? OR phone = ?)',
      [projectId, identifier, identifier]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除邀请失败' });
  }
});

// Public Project Preview (Bypass Auth for invitations/preview)
app.get('/api/public/projects/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, description, owner_id, created_at,
        (SELECT full_name FROM profiles WHERE id = projects.owner_id) as owner_name
       FROM projects WHERE id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: '项目不存在' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: '获取项目预览失败' });
  }
});

// --- AI Configuration (Volcengine Doubao) ---
const VOLC_ARK_API_KEY = process.env.VOLC_ARK_API_KEY;
const VOLC_ARK_ENDPOINT_ID = process.env.VOLC_ARK_ENDPOINT_ID;
const VOLC_ASR_APP_ID = process.env.VOLC_ASR_APP_ID;
const VOLC_ASR_ACCESS_TOKEN = process.env.VOLC_ASR_ACCESS_TOKEN; // Different token for ASR

import axios from 'axios';

import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

// Initialize ffmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
// LLM Helper (OpenAI compatible API with Volcengine)
// Reference used from user snippet: axios.post to ark.cn-beijing.volces.com/api/v3/chat/completions
async function callDoubaoLLM(prompt, options = {}) {
  const url = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

  // The endpoint ID might have been misconfigured to the API Key in .env.
  // Fallback to the standard Doubao model if it looks like a generic UUID API Key or is missing.
  let validEndpointId = VOLC_ARK_ENDPOINT_ID;
  if (!validEndpointId || validEndpointId === VOLC_ARK_API_KEY) {
    validEndpointId = 'doubao-1-5-pro-32k-250115';
  }

  if (!VOLC_ARK_API_KEY) {
    throw new Error('Volcengine API Key missing');
  }

  console.log(`[Doubao LLM] Request with endpoint: ${validEndpointId}`);

  try {
    const res = await axios.post(
      url,
      {
        model: validEndpointId,
        messages: [
          { role: 'system', content: '你是人工智能助手.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        ...options
      },
      {
        headers: {
          'Authorization': `Bearer ${VOLC_ARK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return res.data.choices[0].message.content;
  } catch (err) {
    console.error('[Doubao LLM] Error:', err.response?.data || err.message);
    throw new Error(err.response?.data?.error?.message || 'Doubao Ark API request failed');
  }
}

// ASR Helper (v1 Standard Synchronous API - Form-Data Request)

const VOLC_CONFIG = {
  // Use V3 BigModel configs from env
  API_KEY: process.env.VOLC_ASR_API_KEY || "b2b0f9e5-657d-441d-9a73-7907d470cda4",
  RESOURCE_ID_FLASH: "volc.bigasr.auc_turbo",
  FLASH_API: 'https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash'
};

async function convertAudioToWav(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat('wav')
      // Doubao ASR standard requirement is usually 16kHz, 16-bit, mono
      .audioFrequency(16000)
      .audioChannels(1)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .save(outputPath);
  });
}

async function callDoubaoASR(base64Data, mimeType) {
  const originalFormat = mimeType.includes('webm') ? 'webm' : (mimeType.includes('mp4') ? 'mp4' : 'wav');
  const tempId = crypto.randomUUID();
  const tempInputPath = path.join(os.tmpdir(), `audio_in_${tempId}.${originalFormat}`);
  const tempOutputPath = path.join(os.tmpdir(), `audio_out_${tempId}.wav`);

  try {
    // 1. Write base64 audio to temp input file
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(tempInputPath, buffer);
    console.log(`[Doubao ASR] Temp input audio created: ${tempInputPath} (Format: ${originalFormat})`);

    // 2. Convert to standard WAV (16kHz, Mono) for Volcengine
    console.log(`[Doubao ASR] ⚙️ Converting to standard WAV format via ffmpeg...`);
    await convertAudioToWav(tempInputPath, tempOutputPath);
    console.log(`[Doubao ASR] ✅ Audio converted successfully: ${tempOutputPath}`);

    // 3. Instead of form-data, encode the converted WAV to base64 for V3 BigModel API
    const wavBuffer = fs.readFileSync(tempOutputPath);
    const base64Audio = wavBuffer.toString('base64');

    const payload = {
      user: { uid: `user_${Date.now()}` },
      audio: {
        data: base64Audio,
        format: 'wav',
      },
      request: {
        model_name: "bigmodel",
        enable_itn: true
      }
    };

    const headers = {
      'Content-Type': 'application/json',
      'X-Api-Key': VOLC_CONFIG.API_KEY,
      'X-Api-Resource-Id': VOLC_CONFIG.RESOURCE_ID_FLASH,
      'X-Api-Request-Id': crypto.randomUUID(),
      'X-Api-Sequence': '-1'
    };

    // 4. Send Request directly to V3 flash endpoint
    console.log("[Doubao ASR] 🔹 发送标准WAV录音至火山 V3 极速版大模型...");
    const response = await axios.post(VOLC_CONFIG.FLASH_API, payload, { headers });

    // Status code extraction
    const statusCode = response.headers['x-api-status-code'];
    const msg = response.headers['x-api-message'];

    if (statusCode && !statusCode.startsWith('2')) {
      throw new Error(`Volc API Error: [${statusCode}] ${msg}`);
    }

    if (response.data && response.data.result) {
      const finalText = response.data.result.text || '';
      console.log(`[Doubao ASR] ✅ 识别成功，文本长度：${finalText.length}字`);

      // Cleanup
      if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
      if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);

      return finalText;
    } else {
      throw new Error(`Volc API Error: 无返回文本, Response: ${JSON.stringify(response.data)}`);
    }

  } catch (error) {
    if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
    if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
    console.error("[Doubao ASR] ❌ ASR识别失败：", error.message, error.response?.data ? JSON.stringify(error.response?.data, null, 2) : '');
    throw error;
  }
}


app.post('/api/ai/process', async (req, res) => {
  const { action, payload } = req.body;

  try {
    console.log(`[Doubao] AI Action: ${action}`);
    let result;
    switch (action) {
      case 'generateStory':
      case 'optimize':
      case 'generatePrompts': {
        const { prompt } = payload;
        result = await callDoubaoLLM(prompt);
        break;
      }
      case 'transcribe': {
        const { base64Data, mimeType } = payload;
        result = await callDoubaoASR(base64Data, mimeType);
        break;
      }
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    res.json({ result });
  } catch (error) {
    console.error(`[Doubao] Error (${action}):`, error);
    res.status(500).json({ error: error.message || 'AI processing failed' });
  }
});

// Debug endpoint removed or fixed
app.get('/api/ai/list-models', (req, res) => {
  res.json({ message: 'Debug endpoint disabled during migration' });
});

// All other GET requests not handled before will serve index.html (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Email SMTP server running on port ${PORT}`);
});
