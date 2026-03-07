import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const BASE_URL = 'http://localhost:3005/api';

async function testPrompts() {
    console.log('--- Testing Prompt Creation ---');

    // 1. Get a project ID to use for testing
    const config = {
        host: 'bj-cynosdbmysql-grp-o8xlj272.sql.tencentcdb.com',
        user: 'root',
        password: 'Nickis-2323',
        database: 'everstory',
        port: 26888,
    };

    let projectId;
    const connection = await mysql.createConnection(config);
    try {
        const [rows] = await connection.execute('SELECT id FROM projects LIMIT 1');
        if (rows.length === 0) {
            console.log('No projects found to test with. Run a project creation flow first.');
            return;
        }
        projectId = rows[0].id;
        console.log(`Using Project ID: ${projectId}`);
    } catch (error) {
        console.error('Database connection failed:', error.message);
        return;
    } finally {
        await connection.end();
    }

    // 2. Perform Login to get Token
    let token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImR1bW15LTEyMyIsInBob25lIjoiMTk5OTk5OTk5OTkiLCJpYXQiOjE3NzI4NzEyMDYsImV4cCI6MTc3Mjg3NDgwNn0.x-udgKfSiZjzilbx4_jKBmRslruarnqtW4iNNRbAhcw';
    try {
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: '19999999999', password: 'tester123' }) // Need a valid user
        });
        const loginData = await loginRes.json();
        if (!loginRes.ok) {
            console.log('Login failed (Ensure user 19999999999 exists):', loginData);
            // Fallback for testing: bypass auth or use a known user's token here manually if needed during real execution
            return;
        }
        token = loginData.token;
        console.log('Login successful');
    } catch (e) {
        console.error('Login request failed:', e.message);
        return;
    }

    // 3. Test Create Prompt
    try {
        const payload = {
            question: 'Test Question ' + Date.now(),
            category: '自定义',
            image_url: 'https://example.com/test-image.jpg'
        };
        console.log('Sending payload:', payload);

        const res = await fetch(`${BASE_URL}/projects/${projectId}/prompts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok) {
            console.log('✅ Success: Prompt Created:', data);
        } else {
            console.error('❌ Failed to create prompt:', data);
        }
    } catch (error) {
        console.error('❌ Request Exception:', error.message);
    }
}

testPrompts();
