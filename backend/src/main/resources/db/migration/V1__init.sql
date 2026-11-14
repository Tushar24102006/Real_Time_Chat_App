-- ====================================================================
-- PrepPulse - V1 Database Schema Migration
-- Placement-prep real-time chat platform
-- ====================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(255),
    last_seen_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Chat Rooms Table
CREATE TABLE IF NOT EXISTS chat_rooms (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100),
    type VARCHAR(20) NOT NULL CHECK (type IN ('PRIVATE', 'GROUP')),
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Room Members Table
CREATE TABLE IF NOT EXISTS room_members (
    id BIGSERIAL PRIMARY KEY,
    room_id BIGINT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('ADMIN', 'MEMBER')),
    last_read_message_id BIGINT,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_room_user UNIQUE(room_id, user_id)
);

-- 4. Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    room_id BIGINT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'TEXT' CHECK (type IN ('TEXT', 'IMAGE', 'FILE')),
    status VARCHAR(20) NOT NULL DEFAULT 'SENT' CHECK (status IN ('SENT', 'DELIVERED', 'SEEN')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- Indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_messages_room_created ON messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_room_members_user ON room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ====================================================================
-- Seed Data: Realistic Indian placement-prep community
-- Default password for all seed accounts: Password@123
-- BCrypt: $2a$10$kt3hmHdLVBYIGvc8S2o5NuWLwfXUOdsBqcSIg/A/be3A7Ski3EfzK
-- ====================================================================

INSERT INTO users (id, username, email, password_hash, avatar_url, last_seen_at, created_at) VALUES
(1, 'aarav_sharma', 'aarav.sharma@campus.edu', '$2a$10$kt3hmHdLVBYIGvc8S2o5NuWLwfXUOdsBqcSIg/A/be3A7Ski3EfzK', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'priya_patel', 'priya.patel@campus.edu', '$2a$10$kt3hmHdLVBYIGvc8S2o5NuWLwfXUOdsBqcSIg/A/be3A7Ski3EfzK', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, 'rohan_verma', 'rohan.verma@campus.edu', '$2a$10$kt3hmHdLVBYIGvc8S2o5NuWLwfXUOdsBqcSIg/A/be3A7Ski3EfzK', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(4, 'ananya_iyer', 'ananya.iyer@campus.edu', '$2a$10$kt3hmHdLVBYIGvc8S2o5NuWLwfXUOdsBqcSIg/A/be3A7Ski3EfzK', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(5, 'vikram_singh', 'vikram.singh@campus.edu', '$2a$10$kt3hmHdLVBYIGvc8S2o5NuWLwfXUOdsBqcSIg/A/be3A7Ski3EfzK', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6, 'neha_gupta', 'neha.gupta@campus.edu', '$2a$10$kt3hmHdLVBYIGvc8S2o5NuWLwfXUOdsBqcSIg/A/be3A7Ski3EfzK', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- Placement Rooms
INSERT INTO chat_rooms (id, name, type, created_by, created_at) VALUES
(1, 'DSA & LeetCode Grind', 'GROUP', 1, CURRENT_TIMESTAMP),
(2, 'Java Core & Spring Boot', 'GROUP', 2, CURRENT_TIMESTAMP),
(3, 'HR & Behavioral Prep', 'GROUP', 4, CURRENT_TIMESTAMP),
(4, NULL, 'PRIVATE', 1, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

SELECT setval('chat_rooms_id_seq', (SELECT MAX(id) FROM chat_rooms));

-- Room Memberships
-- Room 1 (DSA): Aarav (Admin), Priya, Rohan, Vikram, Neha
INSERT INTO room_members (room_id, user_id, role, joined_at) VALUES
(1, 1, 'ADMIN', CURRENT_TIMESTAMP),
(1, 2, 'MEMBER', CURRENT_TIMESTAMP),
(1, 3, 'MEMBER', CURRENT_TIMESTAMP),
(1, 5, 'MEMBER', CURRENT_TIMESTAMP),
(1, 6, 'MEMBER', CURRENT_TIMESTAMP)
ON CONFLICT (room_id, user_id) DO NOTHING;

-- Room 2 (Java & Spring): Priya (Admin), Aarav, Rohan, Ananya
INSERT INTO room_members (room_id, user_id, role, joined_at) VALUES
(2, 2, 'ADMIN', CURRENT_TIMESTAMP),
(2, 1, 'MEMBER', CURRENT_TIMESTAMP),
(2, 3, 'MEMBER', CURRENT_TIMESTAMP),
(2, 4, 'MEMBER', CURRENT_TIMESTAMP)
ON CONFLICT (room_id, user_id) DO NOTHING;

-- Room 3 (HR Prep): Ananya (Admin), Priya, Vikram, Neha
INSERT INTO room_members (room_id, user_id, role, joined_at) VALUES
(3, 4, 'ADMIN', CURRENT_TIMESTAMP),
(3, 2, 'MEMBER', CURRENT_TIMESTAMP),
(3, 5, 'MEMBER', CURRENT_TIMESTAMP),
(3, 6, 'MEMBER', CURRENT_TIMESTAMP)
ON CONFLICT (room_id, user_id) DO NOTHING;

-- Room 4 (Private: Aarav & Priya)
INSERT INTO room_members (room_id, user_id, role, joined_at) VALUES
(4, 1, 'MEMBER', CURRENT_TIMESTAMP),
(4, 2, 'MEMBER', CURRENT_TIMESTAMP)
ON CONFLICT (room_id, user_id) DO NOTHING;

-- Initial realistic placement discussions
INSERT INTO messages (id, room_id, sender_id, content, type, status, created_at, deleted) VALUES
(1, 1, 1, 'Hey everyone! Let us target 3 Graph problems today: Clone Graph, Course Schedule, and Pacific Atlantic Water Flow.', 'TEXT', 'SEEN', CURRENT_TIMESTAMP - INTERVAL '3 hour', FALSE),
(2, 1, 2, 'Course Schedule is topological sort using Kahn algorithm (BFS with in-degree array). Really common in Google and Amazon OA rounds.', 'TEXT', 'SEEN', CURRENT_TIMESTAMP - INTERVAL '2 hour', FALSE),
(3, 1, 3, 'Make sure to handle cycle detection carefully when the graph is disconnected.', 'TEXT', 'SEEN', CURRENT_TIMESTAMP - INTERVAL '1 hour', FALSE),
(4, 2, 2, 'Has anyone revised Java memory model and garbage collection algorithms like G1 vs ZGC for tomorrow interview?', 'TEXT', 'SEEN', CURRENT_TIMESTAMP - INTERVAL '4 hour', FALSE),
(5, 2, 4, 'Yes! Also review how HashMap handles collisions using TreeNode (Red-Black tree) when bucket size exceeds 8.', 'TEXT', 'SEEN', CURRENT_TIMESTAMP - INTERVAL '3 hour', FALSE),
(6, 3, 4, 'STAR method template ready: Situation, Task, Action, Result. Keep the Action 60% of your talking time.', 'TEXT', 'SEEN', CURRENT_TIMESTAMP - INTERVAL '5 hour', FALSE),
(7, 4, 2, 'Hey Aarav, did you receive the confirmation mail for the Goldman Sachs hackerrank round?', 'TEXT', 'SEEN', CURRENT_TIMESTAMP - INTERVAL '30 minute', FALSE),
(8, 4, 1, 'Yes! Scheduled for Saturday 10 AM. Practicing dynamic programming on intervals now.', 'TEXT', 'DELIVERED', CURRENT_TIMESTAMP - INTERVAL '15 minute', FALSE)
ON CONFLICT (id) DO NOTHING;

SELECT setval('messages_id_seq', (SELECT MAX(id) FROM messages));

