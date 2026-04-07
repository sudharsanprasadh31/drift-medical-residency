-- Fix approval logic to restrict to same-program Chief Residents only
-- Drop existing approval request policies
DROP POLICY IF EXISTS "Privileged users can view all approval requests" ON approval_requests;
DROP POLICY IF EXISTS "Privileged users can update approval requests" ON approval_requests;

-- Create new policies that check program matching

-- Chief Residents can only view approval requests from their own program
CREATE POLICY "Chiefs can view own program approval requests" ON approval_requests
    FOR SELECT
    USING (
        auth.uid() = user_id OR  -- Can always see own requests
        (
            -- Chief Residents can see requests from users in their program
            EXISTS (
                SELECT 1 FROM profiles chief
                WHERE chief.id = auth.uid()
                AND chief.role = 'chief_resident'
                AND chief.is_approved = true
                AND EXISTS (
                    SELECT 1 FROM profiles applicant
                    WHERE applicant.id = approval_requests.user_id
                    AND applicant.program_id = chief.program_id
                    AND applicant.program_id IS NOT NULL
                )
            )
        ) OR
        (
            -- Admins can see all requests
            EXISTS (
                SELECT 1 FROM profiles
                WHERE id = auth.uid()
                AND role = 'admin'
                AND is_approved = true
            )
        )
    );

-- Only Chief Residents from the same program can update approval requests
CREATE POLICY "Chiefs can update own program approvals" ON approval_requests
    FOR UPDATE
    USING (
        -- Admins can update any approval
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
            AND is_approved = true
        )
        OR
        -- Chief Residents can only update requests from their program
        EXISTS (
            SELECT 1 FROM profiles chief
            WHERE chief.id = auth.uid()
            AND chief.role = 'chief_resident'
            AND chief.is_approved = true
            AND EXISTS (
                SELECT 1 FROM profiles applicant
                WHERE applicant.id = approval_requests.user_id
                AND applicant.program_id = chief.program_id
                AND applicant.program_id IS NOT NULL
            )
        )
    );

-- Add a helpful comment
COMMENT ON POLICY "Chiefs can view own program approval requests" ON approval_requests IS
'Chief Residents can only view and approve residents from their own program. Admins can view all.';

COMMENT ON POLICY "Chiefs can update own program approvals" ON approval_requests IS
'Chief Residents can only approve/reject residents from their own program. Admins can approve/reject anyone.';
