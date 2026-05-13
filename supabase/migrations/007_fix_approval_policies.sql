-- Fix approval request policies to ensure Chief Residents see their program's approvals
-- This migration cleans up all existing policies and creates fresh ones

-- ============================================
-- DROP ALL EXISTING APPROVAL_REQUESTS POLICIES
-- ============================================

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

-- ============================================
-- CREATE NEW CLEAN POLICIES
-- ============================================

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

-- ============================================
-- ADD HELPFUL COMMENTS
-- ============================================

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
-- VERIFICATION QUERY (For debugging in Supabase dashboard)
-- ============================================

-- To test the policies, run this query as a Chief Resident:
--
-- SELECT ar.*,
--        applicant.first_name, applicant.last_name,
--        applicant.program_id as applicant_program,
--        chief.program_id as chief_program
-- FROM approval_requests ar
-- JOIN profiles applicant ON applicant.id = ar.user_id
-- CROSS JOIN profiles chief
-- WHERE chief.id = auth.uid()
-- AND ar.status = 'pending';
