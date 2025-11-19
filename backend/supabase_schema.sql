-- Supabase Migration: Create Tables for SSIS Application
-- This SQL should be run in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create COLLEGE table
CREATE TABLE IF NOT EXISTS college (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create PROGRAM table
CREATE TABLE IF NOT EXISTS program (
    code VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    college VARCHAR(20) REFERENCES college(code) ON UPDATE CASCADE ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create STUDENT table (with profile photo support)
CREATE TABLE IF NOT EXISTS student (
    id VARCHAR(20) PRIMARY KEY,
    firstname VARCHAR(50) NOT NULL,
    lastname VARCHAR(50) NOT NULL,
    course VARCHAR(20) REFERENCES program(code) ON UPDATE CASCADE ON DELETE SET NULL,
    year INTEGER NOT NULL,
    gender VARCHAR(10) NOT NULL,
    profile_photo_url TEXT,
    profile_photo_filename TEXT,
    profile_photo_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create USERS table (Note: This is separate from Supabase Auth users)
-- For applications that need both authentication and custom user data
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(80) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(256) NOT NULL, -- For backward compatibility
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_program_college ON program(college);
CREATE INDEX IF NOT EXISTS idx_student_course ON student(course);
CREATE INDEX IF NOT EXISTS idx_student_year ON student(year);
CREATE INDEX IF NOT EXISTS idx_student_photo ON student(profile_photo_url);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_college_code ON college(code);

-- Insert sample data for testing
-- Colleges
INSERT INTO college (code, name) VALUES 
    ('CCS', 'College of Computer Studies'),
    ('COE', 'College of Engineering'),
    ('CBA', 'College of Business Administration'),
    ('CAS', 'College of Arts and Sciences')
ON CONFLICT (code) DO NOTHING;

-- Programs
INSERT INTO program (code, name, college) VALUES 
    ('BSCS', 'Bachelor of Science in Computer Science', 'CCS'),
    ('BSIT', 'Bachelor of Science in Information Technology', 'CCS'),
    ('BSCE', 'Bachelor of Science in Civil Engineering', 'COE'),
    ('BSEE', 'Bachelor of Science in Electrical Engineering', 'COE'),
    ('BSA', 'Bachelor of Science in Accountancy', 'CBA'),
    ('BSBA', 'Bachelor of Science in Business Administration', 'CBA'),
    ('ABPH', 'Bachelor of Arts in Philosophy', 'CAS'),
    ('ABPS', 'Bachelor of Arts in Political Science', 'CAS')
ON CONFLICT (code) DO NOTHING;

-- Students (Updated ID format: YYYY-####)
INSERT INTO student (id, firstname, lastname, course, year, gender) VALUES 
    ('2021-0001', 'Juan', 'Dela Cruz', 'BSCS', 4, 'Male'),
    ('2021-0002', 'Maria', 'Santos', 'BSIT', 3, 'Female'),
    ('2021-0003', 'Pedro', 'Garcia', 'BSCE', 2, 'Male'),
    ('2021-0004', 'Ana', 'Reyes', 'BSA', 1, 'Female'),
    ('2021-0005', 'Jose', 'Cruz', 'BSCS', 4, 'Male'),
    ('2021-0006', 'Lisa', 'Mendoza', 'BSIT', 2, 'Female'),
    ('2021-0007', 'Carlos', 'Lopez', 'BSEE', 3, 'Male'),
    ('2021-0008', 'Sofia', 'Torres', 'ABPH', 1, 'Female')
ON CONFLICT (id) DO NOTHING;

-- Users for application authentication
INSERT INTO users (username, email, password_hash) VALUES 
    ('admin', 'admin@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewQ.vd7k3L0xM6a'), -- password: admin123
    ('demo', 'demo@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewQ.vd7k3L0xM6a') -- password: admin123
ON CONFLICT (username) DO NOTHING;

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE college ENABLE ROW LEVEL SECURITY;
ALTER TABLE program ENABLE ROW LEVEL SECURITY;
-- DISABLE RLS on student table to allow custom authentication system
-- ALTER TABLE student ENABLE ROW LEVEL SECURITY;
ALTER TABLE student DISABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (adjust as needed for your use case)
CREATE POLICY "Allow public read access on college" ON college FOR SELECT USING (true);
CREATE POLICY "Allow public read access on program" ON program FOR SELECT USING (true);
CREATE POLICY "Allow public read access on student" ON student FOR SELECT USING (true);

-- Create policies for insert/update/delete (restrict as needed)
CREATE POLICY "Allow authenticated users to modify college" ON college
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to modify program" ON program
    FOR ALL USING (auth.role() = 'authenticated');

-- DISABLE student table RLS policy - uses custom authentication
-- CREATE POLICY "Allow authenticated users to modify student" ON student
--     FOR ALL USING (auth.role() = 'authenticated');

-- Users table policies (more restrictive)
CREATE POLICY "Allow authenticated users to read users" ON users 
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow service role to manage users" ON users 
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Views for common queries
CREATE OR REPLACE VIEW program_with_college AS
SELECT 
    p.code,
    p.name as program_name,
    p.college,
    c.name as college_name,
    p.created_at
FROM program p
LEFT JOIN college c ON p.college = c.code;

CREATE OR REPLACE VIEW student_with_program AS
SELECT 
    s.id,
    s.firstname,
    s.lastname,
    s.course,
    p.name as program_name,
    p.college,
    c.name as college_name,
    s.year,
    s.gender,
    s.profile_photo_url,
    s.profile_photo_filename,
    s.profile_photo_updated_at,
    s.created_at
FROM student s
LEFT JOIN program p ON s.course = p.code
LEFT JOIN college c ON p.college = c.code;

-- Functions for common operations
CREATE OR REPLACE FUNCTION get_student_stats()
RETURNS TABLE(year_count INTEGER, student_count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.year as year_count,
        COUNT(*) as student_count
    FROM student s
    GROUP BY s.year
    ORDER BY s.year;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_college_stats()
RETURNS TABLE(college_code VARCHAR, college_name VARCHAR, program_count BIGINT, student_count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.code as college_code,
        c.name as college_name,
        COUNT(DISTINCT p.code) as program_count,
        COUNT(DISTINCT s.id) as student_count
    FROM college c
    LEFT JOIN program p ON c.code = p.college
    LEFT JOIN student s ON p.code = s.course
    GROUP BY c.code, c.name
    ORDER BY c.code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Storage Setup for Student Photos
-- Create storage bucket for student photos (execute this separately in Supabase dashboard)
-- Name: student-photos
-- Public: true
-- RLS: Disabled (no RLS policies needed)
-- File size limit: 5MB
-- Allowed MIME types: image/jpeg, image/png, image/webp

-- Note: Since RLS is disabled on the bucket, no storage policies are required
-- The bucket is publicly accessible for all operations
