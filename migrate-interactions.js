import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function migrate() {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    console.log('Connected to database for migration...');

    const createInteractionsTable = `
        CREATE TABLE IF NOT EXISTS story_interactions (
            id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
            story_id VARCHAR(36) NOT NULL,
            user_id VARCHAR(36) NOT NULL,
            type VARCHAR(20) NOT NULL,
            content TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
        );
    `;

    try {
        await connection.execute(createInteractionsTable);
        console.log('✅ story_interactions table created successfully');
    } catch (error) {
        console.error('❌ Failed to create table:', error);
    } finally {
        await connection.end();
    }
}

migrate();
