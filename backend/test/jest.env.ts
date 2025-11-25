// Set test environment variables before tests run
process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:54320/relationship_app_test";
process.env.JWT_SECRET = "test-secret-key";
process.env.JWT_EXPIRES_IN = "7d";
process.env.NODE_ENV = "test";
process.env.PORT = "3001";
