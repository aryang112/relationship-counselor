-- This script runs automatically when PostgreSQL container first starts
-- It creates both development and test databases

-- Create development database
CREATE DATABASE relationship_app;

-- Create test database
CREATE DATABASE relationship_app_test;

-- Grant privileges (postgres user already has them, but being explicit)
GRANT ALL PRIVILEGES ON DATABASE relationship_app TO postgres;
GRANT ALL PRIVILEGES ON DATABASE relationship_app_test TO postgres;

-- Create a separate test user (optional, for better isolation)
-- Uncomment if you want a dedicated test user:
-- CREATE USER test_user WITH PASSWORD 'test_password';
-- GRANT ALL PRIVILEGES ON DATABASE relationship_app_test TO test_user;
