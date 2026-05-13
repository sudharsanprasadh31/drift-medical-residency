-- Add PGY (Post-Graduate Year) column to profiles table

-- Create ENUM type for PGY levels
CREATE TYPE pgy_level AS ENUM (
    'PGY0',
    'PGY1',
    'PGY2',
    'PGY3',
    'PGY4',
    'PGY5',
    'PGY6',
    'PGY7',
    'PGY8',
    'ALUMNI'
);

-- Add PGY column to profiles table
ALTER TABLE profiles
ADD COLUMN pgy pgy_level;

-- Add comment
COMMENT ON COLUMN profiles.pgy IS 'Post-Graduate Year level of the resident';
