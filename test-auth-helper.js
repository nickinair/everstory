import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const BASE_URL = 'http://localhost:3005/api';

async function testAll() {
  const config = {
      host: 'bj-cynosdbmysql-grp-o8xlj272.sql.tencentcdb.com',
      user: 'root',
      password: 'Nickis-2323',
      database: 'everstory',
      port: 26888,
  };
  
  let projectId, storyId, token;
  const connection = await mysql.createConnection(config);
  try {
      const [projects] = await connection.execute('SELECT id FROM projects LIMIT 1');
      if (projects.length === 0) return console.log('No projects');
      projectId = projects[0].id;

      const [stories] = await connection.execute('SELECT id FROM stories WHERE project_id = ? LIMIT 1', [projectId]);
      if (stories.length === 0) return console.log('No stories');
      storyId = stories[0].id;

      const [users] = await connection.execute('SELECT id FROM profiles LIMIT 1');
      if (users.length === 0) return console.log('No users - cannot mint token');
      
      const userId = users[0].id;
      
      token = jwt.sign({ id: userId }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '1h' });

      console.log('✅ Auth bypassed with DB user:', userId);

  } catch (error) {
      console.error('Database connection failed:', error.message);
      return;
  } finally {
      await connection.end();
  }

  console.log('\n--- 1. Testing Prompt Creation ---');
  try {
    const payload = { question: 'Test Prompt ' + Date.now(), category: '自定义', image_url: 'test.jpg' };
    const res = await fetch(`${BASE_URL}/projects/${projectId}/prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log(res.ok ? '✅ Prompt created success' : '❌ Prompt failed: ' + JSON.stringify(data));
  } catch (error) { console.error('Error:', error.message); }

  console.log('\n--- 2. Testing Story Interactions ---');
  try {
    const addRes = await fetch(`${BASE_URL}/stories/${storyId}/interactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ type: 'reaction', content: '哈哈太有趣了😄' })
    });
    console.log(addRes.ok ? '✅ Reaction added' : '❌ Add failed');

    const getRes = await fetch(`${BASE_URL}/stories/${storyId}/interactions`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await getRes.json();
    console.log(getRes.ok ? `✅ Fetched ${data.length} interactions` : '❌ Fetch failed');
  } catch (error) { console.error('Error:', error.message); }
}

testAll();
