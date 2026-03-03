-- Create database (run this in PostgreSQL)
-- CREATE DATABASE ecomap;

-- Create table for items
CREATE TABLE IF NOT EXISTS items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  value INTEGER NOT NULL CHECK (value >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO items (name, value) VALUES
  ('Item 1', 100),
  ('Item 2', 200),
  ('Item 3', 300)
ON CONFLICT DO NOTHING;
