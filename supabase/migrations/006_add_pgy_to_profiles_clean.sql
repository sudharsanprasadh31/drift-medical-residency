-- Add PGY (Post-Graduate Year) column to profiles table
-- Safe version that handles existing types

-- Drop existing type if it exists (will cascade to dependent columns)
DROP TYPE IF EXISTS pgy_level CASCADE;

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

-- Add PGY column to profiles table (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'pgy'
    ) THEN
        ALTER TABLE profiles ADD COLUMN pgy pgy_level;
    END IF;
END $$;

-- If column exists but has wrong type, fix it
DO $$
BEGIN
    -- Drop and recreate with correct type
    ALTER TABLE profiles DROP COLUMN IF EXISTS pgy;
    ALTER TABLE profiles ADD COLUMN pgy pgy_level;
END $$;

-- Add comment
COMMENT ON COLUMN profiles.pgy IS 'Post-Graduate Year level of the resident';
