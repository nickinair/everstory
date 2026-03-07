import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function testConnection() {
    const hosts = ['10.2.4.15', '127.0.0.1', 'localhost'];

    for (const host of hosts) {
        const config = {
            host: host,
            user: 'root',
            password: 'Nickis-2323',
            database: 'everstory',
            port: 3306,
            connectTimeout: 5000,
        };

        console.log(`--- Testing host: ${host} ---`);

        try {
            const connection = await mysql.createConnection(config);
            console.log(`✅ Success: Connected to ${host}`);
            const [rows] = await connection.execute('SHOW TABLES');
            console.log(`✅ Tables:`, rows.map(r => Object.values(r)[0]));
            await connection.end();
            return; // Stop after first success
        } catch (error) {
            console.error(`❌ Failed: ${host}`);
            console.error(`Message: ${error.message}`);
        }
    }
}

testConnection();
