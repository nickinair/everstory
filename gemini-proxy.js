/**
 * Universal Gemini Proxy Server (v2.0)
 * ------------------------------------
 * This proxy handles both:
 * 1. Legacy custom path: /api/ai/process
 * 2. Standard Google SDK paths: /v1beta/models/...
 * 
 * Supports authentication via:
 * - Authorization: Bearer <token>
 * - x-goog-api-key: <token>
 * - ?key=<token> (query parameter)
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";
import fetch from 'node-fetch'; // Ensure node-fetch is installed or use global fetch (Node 18+)

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // The REAL Google API Key
const PROXY_AUTH_TOKEN = process.env.PROXY_AUTH_TOKEN; // The secret token matching your app's .env

if (!GEMINI_API_KEY) {
    console.error("Error: GEMINI_API_KEY is not set in environment variables.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- Authentication Middleware ---
const authMiddleware = (req, res, next) => {
    if (!PROXY_AUTH_TOKEN) return next();

    const authHeader = req.headers.authorization;
    const sdkKeyHeader = req.headers['x-goog-api-key'];
    const queryKey = req.query.key;

    const token = (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader) || sdkKeyHeader || queryKey;

    if (!token || token !== PROXY_AUTH_TOKEN) {
        console.warn(`[Auth] Unauthorized access attempt from ${req.ip}`);
        return res.status(401).json({ error: 'Unauthorized: Invalid or missing proxy token' });
    }
    next();
};

// --- Endpoint 1: Legacy Custom Path (/api/ai/process) ---
app.post('/api/ai/process', authMiddleware, async (req, res) => {
    const { action, payload } = req.body;
    try {
        console.log(`[Legacy] Processing action: ${action}`);
        const modelName = process.env.GEMINI_MODEL_NAME || "gemini-1.5-flash";
        const model = genAI.getGenerativeModel({ model: modelName });

        let result;
        if (action === 'generateStory' || action === 'transcribe') {
            const { base64Data, mimeType, prompt } = payload;
            const response = await model.generateContent([
                { inlineData: { data: base64Data, mimeType } },
                { text: prompt }
            ]);
            result = response.response.text();
        } else {
            const { prompt } = payload;
            const response = await model.generateContent(prompt);
            result = response.response.text();
        }

        res.json({ result });
    } catch (error) {
        console.error('[Legacy Error]:', error);
        res.status(500).json({ error: error.message || 'AI processing failed' });
    }
});

// --- Endpoint 2: Standard Google SDK Path (/v1beta/models/...) ---
// This acts as a transparent proxy to the real Google API but with our Auth
app.use('/v1beta/models', authMiddleware, async (req, res) => {
    const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models${req.path}?key=${GEMINI_API_KEY}`;

    console.log(`[SDK Proxy] Forwarding to: models${req.path}`);

    try {
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
                // Don't forward our internal proxy auth headers to Google
            },
            body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
        });

        const data = await response.json();
        res.status(response.status).send(data);
    } catch (error) {
        console.error('[SDK Proxy Error]:', error);
        res.status(500).json({ error: 'Failed to connect to Google API' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', model: process.env.GEMINI_MODEL_NAME || 'gemini-1.5-flash' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Universal Gemini Proxy running on http://0.0.0.0:${PORT}`);
});
