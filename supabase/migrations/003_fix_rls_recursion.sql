-- Fix infinite recursion in RLS policies
-- The issue: Policies were checking profiles table from within profiles policies

-- Drop all existing policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Chief residents can view program profiles" ON profiles;
DROP POLICY IF EXISTS "Admins and Chiefs can update profiles" ON profiles;

-- Create a function to get user role without recursion
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Create a function to check if user is approved admin/chief
CREATE OR REPLACE FUNCTION is_admin_or_chief()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'chief_resident')
    AND is_approved = true
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Create new profiles policies without recursion

-- 1. Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT
    USING (auth.uid() = id);

-- 2. Users can insert their own profile (for signup)
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 3. Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE
    USING (auth.uid() = id);

-- 4. Admins and Chiefs can view all profiles in a separate policy
-- This uses a security definer function to avoid recursion
CREATE POLICY "Privileged users can view all profiles" ON profiles
    FOR SELECT
    USING (
        CASE
            WHEN auth.uid() = id THEN true  -- Can always see own profile
            WHEN is_admin_or_chief() THEN true  -- Admins/Chiefs can see all
            ELSE false
        END
    );

-- 5. Admins and Chiefs can update any profile
CREATE POLICY "Privileged users can update profiles" ON profiles
    FOR UPDATE
    USING (is_admin_or_chief() OR auth.uid() = id);

-- Recreate approval_requests policies without recursion
DROP POLICY IF EXISTS "Users can view own approval requests" ON approval_requests;
DROP POLICY IF EXISTS "Users can create approval requests" ON approval_requests;
DROP POLICY IF EXISTS "Admins can view all approval requests" ON approval_requests;
DROP POLICY IF EXISTS "Chiefs can view program approval requests" ON approval_requests;
DROP POLICY IF EXISTS "Admins and Chiefs can update approvals" ON approval_requests;

-- Approval requests policies
CREATE POLICY "Users can view own approval requests" ON approval_requests
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create approval requests" ON approval_requests
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Privileged users can view all approval requests" ON approval_requests
    FOR SELECT
    USING (auth.uid() = user_id OR is_admin_or_chief());

CREATE POLICY "Privileged users can update approval requests" ON approval_requests
    FOR UPDATE
    USING (is_admin_or_chief());
