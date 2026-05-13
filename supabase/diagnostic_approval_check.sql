-- Diagnostic queries to troubleshoot approval request visibility
-- Run these queries in Supabase SQL Editor while logged in as a Chief Resident

-- ============================================
-- 1. CHECK YOUR OWN PROFILE
-- ============================================
-- This shows your current user info and program
SELECT
    id,
    email,
    first_name,
    last_name,
    role,
    program_id,
    is_approved,
    is_profile_complete
FROM profiles
WHERE id = auth.uid();

-- ============================================
-- 2. CHECK ALL PENDING APPROVAL REQUESTS
-- ============================================
-- This shows ALL pending requests in the system (regardless of RLS)
-- You should see requests from your program here
SELECT
    ar.id as request_id,
    ar.status,
    ar.created_at,
    applicant.id as applicant_id,
    applicant.first_name,
    applicant.last_name,
    applicant.role as requested_role,
    applicant.program_id as applicant_program_id,
    prog.program_name
FROM approval_requests ar
JOIN profiles applicant ON applicant.id = ar.user_id
LEFT JOIN programs prog ON prog.id = applicant.program_id
WHERE ar.status = 'pending'
ORDER BY ar.created_at DESC;

-- ============================================
-- 3. CHECK PROGRAM MATCHING
-- ============================================
-- This shows if any applicants match your program
-- Run this as a Chief Resident to see if program_id matching works
WITH your_info AS (
    SELECT program_id
    FROM profiles
    WHERE id = auth.uid()
)
SELECT
    'Your Program ID' as info_type,
    program_id as value
FROM your_info
UNION ALL
SELECT
    'Applicants in Your Program' as info_type,
    COUNT(*)::TEXT as value
FROM profiles applicant
CROSS JOIN your_info
WHERE applicant.program_id = your_info.program_id
AND applicant.is_profile_complete = true
AND applicant.is_approved = false;

-- ============================================
-- 4. TEST RLS POLICY (What you SHOULD see)
-- ============================================
-- This query uses RLS - shows what the API will return
-- If this returns nothing, the RLS policy is blocking you
SELECT
    ar.*,
    applicant.first_name,
    applicant.last_name,
    applicant.program_id
FROM approval_requests ar
JOIN profiles applicant ON applicant.id = ar.user_id
WHERE ar.status = 'pending'
ORDER BY ar.created_at DESC;

-- ============================================
-- 5. CHECK POLICY DETAILS
-- ============================================
-- This shows all active policies on approval_requests
SELECT
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'approval_requests'
ORDER BY policyname;

-- ============================================
-- EXPECTED RESULTS:
-- ============================================
-- Query 1: Should show your profile with role='chief_resident' and a program_id
-- Query 2: Should show all pending requests (including those from your program)
-- Query 3: Should show your program_id and count of applicants
-- Query 4: Should show ONLY requests from applicants in your program
-- Query 5: Should show the RLS policies

-- ============================================
-- COMMON ISSUES:
-- ============================================
-- 1. If Query 1 shows program_id = NULL
--    → Your Chief Resident profile doesn't have a program assigned
--
-- 2. If Query 2 shows applicants but Query 4 is empty
--    → RLS policy is too restrictive or there's a bug in the policy
--
-- 3. If Query 3 shows 0 applicants
--    → No residents have selected your program yet
--
-- 4. If applicant.program_id is NULL in Query 2
--    → Residents didn't select a program during profile completion
