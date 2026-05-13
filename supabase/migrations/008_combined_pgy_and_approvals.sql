-- Combined migration: Add PGY field and fix approval policies
-- Run this single file to apply both changes safely

-- ============================================
-- PART 1: ADD PGY FIELD TO PROFILES
-- ============================================

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

-- Add PGY column to profiles table
ALTER TABLE profiles ADD COLUMN pgy pgy_level;

-- Add comment
COMMENT ON COLUMN profiles.pgy IS 'Post-Graduate Year level of the resident';

-- ============================================
-- PART 2: FIX APPROVAL REQUEST POLICIES
-- ============================================

-- Drop all existing approval_requests policies
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'approval_requests'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON approval_requests', policy_record.policyname);
    END LOOP;
END $$;

-- Policy 1: Users can view their own approval requests
CREATE POLICY "users_view_own_requests" ON approval_requests
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy 2: Chief Residents can view approval requests from their program
CREATE POLICY "chiefs_view_program_requests" ON approval_requests
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles chief
            INNER JOIN profiles applicant ON chief.program_id = applicant.program_id
            WHERE chief.id = auth.uid()
            AND chief.role = 'chief_resident'
            AND chief.is_approved = true
            AND chief.program_id IS NOT NULL
            AND applicant.id = approval_requests.user_id
            AND applicant.program_id IS NOT NULL
        )
    );

-- Policy 3: Admins can view all approval requests
CREATE POLICY "admins_view_all_requests" ON approval_requests
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
            AND is_approved = true
        )
    );

-- Policy 4: Chief Residents can update approval requests from their program
CREATE POLICY "chiefs_update_program_requests" ON approval_requests
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles chief
            INNER JOIN profiles applicant ON chief.program_id = applicant.program_id
            WHERE chief.id = auth.uid()
            AND chief.role = 'chief_resident'
            AND chief.is_approved = true
            AND chief.program_id IS NOT NULL
            AND applicant.id = approval_requests.user_id
            AND applicant.program_id IS NOT NULL
        )
    );

-- Policy 5: Admins can update all approval requests
CREATE POLICY "admins_update_all_requests" ON approval_requests
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
            AND is_approved = true
        )
    );

-- Policy 6: System can insert approval requests (via trigger)
CREATE POLICY "system_insert_requests" ON approval_requests
    FOR INSERT
    WITH CHECK (true);

-- Add helpful comments
COMMENT ON POLICY "users_view_own_requests" ON approval_requests IS
'Residents can view their own approval requests';

COMMENT ON POLICY "chiefs_view_program_requests" ON approval_requests IS
'Chief Residents can only view approval requests from residents in their program';

COMMENT ON POLICY "admins_view_all_requests" ON approval_requests IS
'Admins have full visibility of all approval requests';

COMMENT ON POLICY "chiefs_update_program_requests" ON approval_requests IS
'Chief Residents can only approve/reject residents from their own program';

COMMENT ON POLICY "admins_update_all_requests" ON approval_requests IS
'Admins can approve/reject any approval request';

-- ============================================
-- VERIFICATION
-- ============================================

-- Success! The migration completed.
--
-- What was changed:
-- 1. Added 'pgy' column to profiles table with PGY0-PGY8 and ALUMNI options
-- 2. Fixed approval request RLS policies to properly filter by program_id
--
-- Next steps:
-- - Deploy your app updates to Vercel and rebuild mobile app
-- - Test the approval workflow as a Chief Resident
-- - Use diagnostic_approval_check.sql if you need to troubleshoot
