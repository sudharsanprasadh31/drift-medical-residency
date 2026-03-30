-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types for roles and approval status
CREATE TYPE user_role AS ENUM ('resident', 'chief_resident', 'admin');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');

-- ============================================
-- PROGRAMS TABLE
-- ============================================
CREATE TABLE programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_name TEXT NOT NULL,
    specialty TEXT NOT NULL,
    location TEXT NOT NULL,
    program_director TEXT,
    program_coordinator TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for program search (name and specialty)
CREATE INDEX idx_programs_name ON programs USING gin(to_tsvector('english', program_name));
CREATE INDEX idx_programs_specialty ON programs(specialty);

-- ============================================
-- USER PROFILES TABLE
-- ============================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    email TEXT UNIQUE NOT NULL,
    phone_number TEXT,
    role user_role NOT NULL DEFAULT 'resident',
    specialty TEXT,
    program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    is_profile_complete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for profiles
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_program ON profiles(program_id);
CREATE INDEX idx_profiles_role ON profiles(role);

-- ============================================
-- APPROVAL REQUESTS TABLE
-- ============================================
CREATE TABLE approval_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    requested_role user_role NOT NULL,
    status approval_status DEFAULT 'pending',
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for approval requests
CREATE INDEX idx_approval_requests_user ON approval_requests(user_id);
CREATE INDEX idx_approval_requests_status ON approval_requests(status);

-- ============================================
-- SPECIALTIES REFERENCE TABLE
-- ============================================
CREATE TABLE specialties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert common medical specialties
INSERT INTO specialties (name) VALUES
    ('Anesthesiology'),
    ('Dermatology'),
    ('Emergency Medicine'),
    ('Family Medicine'),
    ('Internal Medicine'),
    ('Neurology'),
    ('Obstetrics and Gynecology'),
    ('Ophthalmology'),
    ('Orthopedic Surgery'),
    ('Otolaryngology'),
    ('Pathology'),
    ('Pediatrics'),
    ('Physical Medicine and Rehabilitation'),
    ('Psychiatry'),
    ('Radiology'),
    ('General Surgery'),
    ('Cardiology'),
    ('Gastroenterology'),
    ('Pulmonology'),
    ('Nephrology'),
    ('Endocrinology'),
    ('Hematology/Oncology'),
    ('Infectious Disease'),
    ('Rheumatology'),
    ('Geriatrics'),
    ('Hospice and Palliative Medicine'),
    ('Sleep Medicine'),
    ('Sports Medicine'),
    ('Allergy and Immunology'),
    ('Clinical Genetics'),
    ('Nuclear Medicine'),
    ('Plastic Surgery'),
    ('Thoracic Surgery'),
    ('Vascular Surgery'),
    ('Pediatric Surgery'),
    ('Urology'),
    ('Neurosurgery'),
    ('Radiation Oncology');

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE specialties ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile (but not role or approval status)
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin' AND is_approved = true
        )
    );

-- Chief residents can view profiles in their program
CREATE POLICY "Chief residents can view program profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'chief_resident'
            AND p.is_approved = true
            AND p.program_id = profiles.program_id
        )
    );

-- Admins and Chief Residents can update profiles (including approval)
CREATE POLICY "Admins and Chiefs can update profiles" ON profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND (p.role = 'admin' OR p.role = 'chief_resident')
            AND p.is_approved = true
        )
    );

-- Programs Policies
-- All authenticated users can view programs
CREATE POLICY "Authenticated users can view programs" ON programs
    FOR SELECT TO authenticated USING (true);

-- Only admins can insert/update/delete programs
CREATE POLICY "Admins can manage programs" ON programs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin' AND is_approved = true
        )
    );

-- Approval Requests Policies
-- Users can view their own approval requests
CREATE POLICY "Users can view own approval requests" ON approval_requests
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own approval requests
CREATE POLICY "Users can create approval requests" ON approval_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all approval requests
CREATE POLICY "Admins can view all approval requests" ON approval_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin' AND is_approved = true
        )
    );

-- Chief residents can view approval requests for their program
CREATE POLICY "Chiefs can view program approval requests" ON approval_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p1
            JOIN profiles p2 ON p1.program_id = p2.program_id
            WHERE p1.id = auth.uid()
            AND p1.role = 'chief_resident'
            AND p1.is_approved = true
            AND p2.id = approval_requests.user_id
        )
    );

-- Admins and Chief Residents can update approval requests
CREATE POLICY "Admins and Chiefs can update approvals" ON approval_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND (role = 'admin' OR role = 'chief_resident')
            AND is_approved = true
        )
    );

-- Specialties Policies
-- All authenticated users can view specialties
CREATE POLICY "Authenticated users can view specialties" ON specialties
    FOR SELECT TO authenticated USING (true);

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON programs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approval_requests_updated_at BEFORE UPDATE ON approval_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to automatically create approval request when profile is completed
CREATE OR REPLACE FUNCTION create_approval_request_on_profile_complete()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create approval request if profile is newly marked complete and not yet approved
    IF NEW.is_profile_complete = true AND OLD.is_profile_complete = false AND NEW.is_approved = false THEN
        INSERT INTO approval_requests (user_id, requested_role, status)
        VALUES (NEW.id, NEW.role, 'pending');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_approval_request
    AFTER UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_approval_request_on_profile_complete();
