import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const BASE_URL = 'http://localhost:3005/api';

async function testInteractions() {
    console.log('--- Testing Story Interactions ---');

    const config = {
        host: 'bj-cynosdbmysql-grp-o8xlj272.sql.tencentcdb.com',
        user: 'root',
        password: 'Nickis-2323',
        database: 'everstory',
        port: 26888,
    };

    let storyId;
    let projectId;
    const connection = await mysql.createConnection(config);
    try {
        const [rows] = await connection.execute('SELECT id, project_id FROM stories LIMIT 1');
        if (rows.length === 0) {
            console.log('No stories found to test with.');
            return;
        }
        storyId = rows[0].id;
        projectId = rows[0].project_id;
        console.log(`Using Story ID: ${storyId}, Project ID: ${projectId}`);
    } catch (error) {
        console.error('Database connection failed:', error.message);
        return;
    } finally {
        await connection.end();
    }

    // Perform Login to get Token
    let token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImR1bW15LTEyMyIsInBob25lIjoiMTk5OTk5OTk5OTkiLCJpYXQiOjE3NzI4NzEyMDYsImV4cCI6MTc3Mjg3NDgwNn0.x-udgKfSiZjzilbx4_jKBmRslruarnqtW4iNNRbAhcw';

    // 1. Add Like Interaction
    try {
        const payload = { type: 'like' };
        console.log('Adding Like...');
        const addRes = await fetch(`${BASE_URL}/stories/${storyId}/interactions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (addRes.ok) {
            console.log('✅ Success: Like Added');
        } else {
            console.error('❌ Failed to add like:', await addRes.json());
        }
    } catch (error) {
        console.error('❌ Request Exception:', error.message);
    }

    // 2. Add Reaction Interaction
    try {
        const payload = { type: 'reaction', content: '哈哈太有趣了😄' };
        console.log('Adding Reaction...');
        const addRes = await fetch(`${BASE_URL}/stories/${storyId}/interactions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (addRes.ok) {
            console.log('✅ Success: Reaction Added');
        } else {
            console.error('❌ Failed to add reaction:', await addRes.json());
        }
    } catch (error) {
        console.error('❌ Request Exception:', error.message);
    }

    // 3. Get Story Interactions
    try {
        console.log('Fetching Story Interactions...');
        const getRes = await fetch(`${BASE_URL}/stories/${storyId}/interactions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await getRes.json();
        if (getRes.ok) {
            console.log(`✅ Success: Fetched ${data.length} interactions for story`);
        } else {
            console.error('❌ Failed to fetch interactions:', data);
        }
    } catch (error) {
        console.error('❌ Request Exception:', error.message);
    }

    // 4. Get Project Interaction History
    try {
        console.log('Fetching Project Interaction History...');
        const getRes = await fetch(`${BASE_URL}/projects/${projectId}/interactions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await getRes.json();
        if (getRes.ok) {
            console.log(`✅ Success: Fetched ${data.length} interaction history events for project`);
            if (data.length > 0) {
                console.log('Sample event:', JSON.stringify(data[0], null, 2));
            }
        } else {
            console.error('❌ Failed to fetch project interactions:', data);
        }
    } catch (error) {
        console.error('❌ Request Exception:', error.message);
    }
}

testInteractions();
