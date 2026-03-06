-- Database Schema for Everstory (Tencent Lighthouse - MySQL 8.0+)

-- 1. Profiles (Users)
CREATE TABLE IF NOT EXISTS profiles (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    full_name TEXT,
    avatar_url TEXT,
    phone VARCHAR(20) UNIQUE,
    email VARCHAR(255) UNIQUE,
    password_hash TEXT,
    is_premium BOOLEAN DEFAULT FALSE,
    points INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Projects
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name TEXT NOT NULL,
    description TEXT,
    owner_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- 3. Project Members
CREATE TABLE IF NOT EXISTS project_members (
    project_id VARCHAR(36),
    user_id VARCHAR(36),
    role VARCHAR(20) DEFAULT 'member', -- 'owner', 'member', 'viewer'
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (project_id, user_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- 4. Stories
CREATE TABLE IF NOT EXISTS stories (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    project_id VARCHAR(36),
    title TEXT,
    content TEXT,
    audio_url TEXT,
    cover_url TEXT,
    owner_id VARCHAR(36),
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'published'
    type VARCHAR(20) DEFAULT 'audio',
    pages INTEGER DEFAULT 1,
    metadata JSON,
    prompt_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE SET NULL
);

-- 5. Prompts
CREATE TABLE IF NOT EXISTS prompts (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    project_id VARCHAR(36),
    question TEXT NOT NULL,
    image_url TEXT,
    category VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'answered'
    sent_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 6. Orders
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(36) PRIMARY KEY, -- Manual ID often used for orders
    project_id VARCHAR(36),
    user_id VARCHAR(36),
    book_title TEXT,
    book_subtitle TEXT,
    book_author TEXT,
    cover_color VARCHAR(50),
    image_url TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    price DECIMAL(10, 2),
    recipient_name TEXT,
    contact_phone VARCHAR(20),
    shipping_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL
);

-- 7. Order Logistics
CREATE TABLE IF NOT EXISTS order_logistics (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    order_id VARCHAR(36),
    status TEXT,
    location TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- 8. Invitations
CREATE TABLE IF NOT EXISTS project_invitations (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    project_id VARCHAR(36),
    email VARCHAR(255),
    phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY idx_unique_invite (project_id, email, phone),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 9. OTPs
CREATE TABLE IF NOT EXISTS phone_otps (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(10) NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_otps (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    code VARCHAR(10) NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_stories_project ON stories(project_id);
CREATE INDEX idx_prompts_project ON prompts(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);
CREATE INDEX idx_phone_otps_lookup ON phone_otps(phone, code, used);
CREATE INDEX idx_email_otps_lookup ON email_otps(email, code, used);
