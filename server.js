import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from "@google/genai";
import tencentcloud from 'tencentcloud-sdk-nodejs-sms';
import { createClient } from '@supabase/supabase-js';

const SmsClient = tencentcloud.sms.v20210111.Client;

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

// Initialize Supabase Admin Client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

// Initialize Tencent Cloud SMS Client
const smsClient = new SmsClient({
  credential: {
    secretId: process.env.TENCENT_SECRET_ID,
    secretKey: process.env.TENCENT_SECRET_KEY,
  },
  region: "ap-guangzhou", // Default to Guangzhou
  profile: {
    httpProfile: {
      endpoint: "sms.tencentcloudapi.com",
    },
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
    const { error: dbError } = await supabase
      .from('sms_otps')
      .insert({
        phone,
        code: otp,
        expires_at: expiresAt.toISOString()
      });

    if (dbError) throw dbError;

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
    const { data, error } = await supabase
      .from('sms_otps')
      .select('*')
      .eq('phone', phone)
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return res.status(400).json({ error: '验证码无效或已过期' });
    }

    // Mark as used
    await supabase
      .from('sms_otps')
      .update({ used: true })
      .eq('id', data.id);

    res.json({ success: true, message: '验证成功' });
  } catch (error) {
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
    res.status(500).json({ error: '服务器错误' });
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
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    // 2. Save to database
    const { error: dbError } = await supabase.from('email_otps').insert({
      email,
      code,
      expires_at: expiresAt
    });

    if (dbError) {
      console.error('Error saving email OTP:', dbError);
      return res.status(500).json({ error: '验证码生成失败' });
    }

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
    const { data: otpData, error: otpError } = await supabase
      .from('email_otps')
      .select('*')
      .eq('email', newEmail)
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (otpError || !otpData) {
      return res.status(400).json({ error: '验证码无效或已过期' });
    }

    // 2. Forcefully Update User Email via Admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      email: newEmail,
      email_confirm: true // Force confirm
    });

    if (updateError) {
      if (updateError.message.includes('already registered') || updateError.message.includes('email is taken')) {
        return res.status(400).json({ error: '该邮箱已被其他账号使用' });
      }
      throw updateError;
    }

    // 3. Update Profile (if necessary, though we usually just use auth.users)
    // (Assuming you want to track email in profiles too, if not, skip this step)

    // 4. Mark OTP as used
    await supabase.from('email_otps').update({ used: true }).eq('id', otpData.id);

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
    const { data: otpData, error: otpError } = await supabase
      .from('sms_otps')
      .select('*')
      .eq('phone', phone)
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (otpError || !otpData) {
      return res.status(400).json({ error: '验证码无效或已过期' });
    }

    // 2. Prepare shadow email and formatted phone
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('86') ? `+${cleanPhone}` : `+86${cleanPhone}`;
    const shadowEmail = `user_${cleanPhone.replace(/^86/, '')}@users.everstory.ai`;

    // 3. Create user using service role
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email: shadowEmail,
      phone: formattedPhone,
      password: password,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone: formattedPhone
      }
    });

    if (createError) {
      if (createError.message.includes('already registered')) {
        return res.status(400).json({ error: '该手机号已注册，请直接登录' });
      }
      throw createError;
    }

    // 4. Mark OTP as used
    await supabase.from('sms_otps').update({ used: true }).eq('id', otpData.id);

    // 5. Initialize Profile
    const userId = userData.user.id;
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      full_name: fullName,
      phone: formattedPhone,
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanPhone)}`,
      updated_at: new Date().toISOString()
    });

    if (profileError) {
      console.warn('Profile initialization warning:', profileError);
    }

    res.json({ success: true, message: '注册成功' });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: '注册失败: ' + (error.message || '服务器错误') });
  }
});

// Update User Phone
app.post('/api/auth/update-phone', async (req, res) => {
  const { userId, newPhone, code } = req.body;
  if (!userId || !newPhone || !code) {
    return res.status(400).json({ error: '字段缺失' });
  }

  try {
    // 1. Verify OTP first
    const { data: otpData, error: otpError } = await supabase
      .from('sms_otps')
      .select('*')
      .eq('phone', newPhone)
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (otpError || !otpData) {
      return res.status(400).json({ error: '验证码无效或已过期' });
    }

    // 2. Prepare shadow email and formatted phone
    const cleanPhone = newPhone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('86') ? `+${cleanPhone}` : `+86${cleanPhone}`;
    const shadowEmail = `user_${cleanPhone.replace(/^86/, '')}@users.everstory.ai`;

    // 3. Get current user to check if they have a real email
    const { data: user, error: getError } = await supabase.auth.admin.getUserById(userId);
    if (getError || !user) throw new Error('用户不存在');

    const updateData = {
      phone: formattedPhone,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: {
        ...user.user.user_metadata,
        phone: formattedPhone
      }
    };

    // ONLY update email if the current one is a shadow email or missing
    if (!user.user.email || user.user.email.endsWith('@users.everstory.ai') || user.user.email.endsWith('@users.everstory.cc')) {
      updateData.email = shadowEmail;
    }

    // 4. Update Auth User via Admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, updateData);

    if (updateError) throw updateError;

    // 4. Update Profile
    await supabase.from('profiles').update({
      phone: formattedPhone,
      updated_at: new Date().toISOString()
    }).eq('id', userId);

    // 5. Mark OTP as used
    await supabase.from('sms_otps').update({ used: true }).eq('id', otpData.id);

    res.json({ success: true, message: '更新成功' });
  } catch (error) {
    console.error('Update Phone Error:', error);
    res.status(500).json({ error: '更新失败: ' + (error.message || '服务器错误') });
  }
});

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_BASE_URL = process.env.GEMINI_BASE_URL; // Optional: for users in restricted regions
let genAI = null;
if (GEMINI_API_KEY) {
  const options = { apiKey: GEMINI_API_KEY };
  if (GEMINI_BASE_URL) {
    options.httpOptions = { baseUrl: GEMINI_BASE_URL };
  }
  genAI = new GoogleGenAI(options);
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
        console.error(`Error with model ${modelName} (attempt ${i + 1}):`, error.message || error);
        const status = error.status || (error.error?.code);
        if (status === 404) break; // Model not found, try next model
        const isBusy = status === 503 || status === 429;
        if (!isBusy) break; // Other error, don't retry same model
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
    // Include the original error data if present (for deep debugging)
    if (error.error) {
      errorMsg += ` - Data: ${JSON.stringify(error.error)}`;
    }
    res.status(500).json({ error: errorMsg });
  }
});

// Debug endpoint to list available models
app.get('/api/ai/list-models', async (req, res) => {
  if (!genAI) {
    return res.status(500).json({ error: 'Gemini API not configured' });
  }
  try {
    const response = await genAI.models.list();
    res.json(response);
  } catch (error) {
    console.error('List models error:', error);
    res.status(500).json({ error: error.message || 'Failed to list models', details: error.error });
  }
});

// All other GET requests not handled before will serve index.html (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Email SMTP server running on port ${PORT}`);
});
