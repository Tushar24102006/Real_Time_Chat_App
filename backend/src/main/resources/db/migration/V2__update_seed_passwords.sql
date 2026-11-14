-- ====================================================================
-- V2 Update Seed Passwords
-- Applies the exact verified BCrypt hash for "Password@123"
-- BCrypt: $2a$10$kt3hmHdLVBYIGvc8S2o5NuWLwfXUOdsBqcSIg/A/be3A7Ski3EfzK
-- ====================================================================

UPDATE users
SET password_hash = '$2a$10$kt3hmHdLVBYIGvc8S2o5NuWLwfXUOdsBqcSIg/A/be3A7Ski3EfzK'
WHERE username IN (
    'aarav_sharma',
    'priya_patel',
    'rohan_verma',
    'ananya_iyer',
    'vikram_singh',
    'neha_gupta'
);

