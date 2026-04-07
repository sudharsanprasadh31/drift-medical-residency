-- On-Call Schedule System with ACGME VI.F Compliance
-- ACGME Duty Hours: https://www.acgme.org/globalassets/pfassets/programrequirements/cprresidency_2023.pdf

-- ============================================
-- ENUMS AND TYPES
-- ============================================

CREATE TYPE call_type AS ENUM (
    'in_house',      -- Resident stays at hospital
    'home_call',     -- Resident can stay at home
    'backup',        -- Backup/float
    'jeopardy'       -- Emergency coverage
);

CREATE TYPE shift_type AS ENUM (
    'day',           -- Regular day shift
    'evening',       -- Evening shift
    'night',         -- Night shift
    'call_24hr',     -- 24-hour call
    'weekend',       -- Weekend coverage
    'holiday'        -- Holiday coverage
);

CREATE TYPE schedule_status AS ENUM (
    'draft',         -- Not yet published
    'published',     -- Active schedule
    'archived'       -- Historical record
);

CREATE TYPE swap_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'cancelled'
);

-- ============================================
-- ON-CALL SCHEDULES TABLE
-- ============================================

CREATE TABLE oncall_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g., "January 2026 Call Schedule"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status schedule_status DEFAULT 'draft',
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

CREATE INDEX idx_oncall_schedules_program ON oncall_schedules(program_id);
CREATE INDEX idx_oncall_schedules_dates ON oncall_schedules(start_date, end_date);
CREATE INDEX idx_oncall_schedules_status ON oncall_schedules(status);

-- ============================================
-- ON-CALL SHIFTS TABLE
-- ============================================

CREATE TABLE oncall_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID NOT NULL REFERENCES oncall_schedules(id) ON DELETE CASCADE,
    resident_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    shift_date DATE NOT NULL,
    shift_type shift_type NOT NULL,
    call_type call_type,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_post_call_day BOOLEAN DEFAULT FALSE, -- Day after 24-hour call
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_time_range CHECK (end_time > start_time OR shift_type = 'call_24hr')
);

CREATE INDEX idx_oncall_shifts_schedule ON oncall_shifts(schedule_id);
CREATE INDEX idx_oncall_shifts_resident ON oncall_shifts(resident_id);
CREATE INDEX idx_oncall_shifts_date ON oncall_shifts(shift_date);
CREATE INDEX idx_oncall_shifts_resident_date ON oncall_shifts(resident_id, shift_date);

-- ============================================
-- SHIFT SWAP REQUESTS TABLE
-- ============================================

CREATE TABLE shift_swap_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requesting_resident_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    target_resident_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    requesting_shift_id UUID NOT NULL REFERENCES oncall_shifts(id) ON DELETE CASCADE,
    target_shift_id UUID REFERENCES oncall_shifts(id) ON DELETE SET NULL,
    status swap_status DEFAULT 'pending',
    reason TEXT,
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_swap_requests_requesting ON shift_swap_requests(requesting_resident_id);
CREATE INDEX idx_swap_requests_target ON shift_swap_requests(target_resident_id);
CREATE INDEX idx_swap_requests_status ON shift_swap_requests(status);

-- ============================================
-- ACGME COMPLIANCE VIOLATIONS LOG
-- ============================================

CREATE TABLE acgme_violations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resident_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES oncall_schedules(id) ON DELETE SET NULL,
    violation_date DATE NOT NULL,
    violation_type TEXT NOT NULL, -- e.g., 'max_hours_per_week', 'min_rest_period', 'max_consecutive_hours'
    description TEXT NOT NULL,
    hours_worked NUMERIC(5,2),
    max_allowed NUMERIC(5,2),
    severity TEXT, -- 'warning', 'minor', 'major', 'critical'
    resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES profiles(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_violations_resident ON acgme_violations(resident_id);
CREATE INDEX idx_violations_date ON acgme_violations(violation_date);
CREATE INDEX idx_violations_resolved ON acgme_violations(resolved);

-- ============================================
-- DUTY HOURS TRACKING (for ACGME compliance)
-- ============================================

CREATE TABLE duty_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resident_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES oncall_shifts(id) ON DELETE SET NULL,
    duty_date DATE NOT NULL,
    hours_worked NUMERIC(5,2) NOT NULL,
    is_call_day BOOLEAN DEFAULT FALSE,
    consecutive_hours NUMERIC(5,2),
    hours_off_before NUMERIC(5,2),
    hours_off_after NUMERIC(5,2),
    week_start_date DATE NOT NULL, -- For 80-hour/week tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_duty_hours_resident ON duty_hours(resident_id);
CREATE INDEX idx_duty_hours_date ON duty_hours(duty_date);
CREATE INDEX idx_duty_hours_week ON duty_hours(week_start_date);
CREATE INDEX idx_duty_hours_resident_week ON duty_hours(resident_id, week_start_date);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE oncall_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE oncall_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE acgme_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE duty_hours ENABLE ROW LEVEL SECURITY;

-- On-Call Schedules Policies
-- All users in a program can view schedules
CREATE POLICY "Users can view own program schedules" ON oncall_schedules
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND program_id = oncall_schedules.program_id
            AND is_approved = true
        )
    );

-- Chiefs and Admins can manage schedules
CREATE POLICY "Chiefs can manage program schedules" ON oncall_schedules
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND program_id = oncall_schedules.program_id
            AND role IN ('chief_resident', 'admin')
            AND is_approved = true
        )
    );

-- On-Call Shifts Policies
-- Users can view shifts in their program
CREATE POLICY "Users can view program shifts" ON oncall_shifts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM oncall_schedules s
            JOIN profiles p ON p.id = auth.uid()
            WHERE s.id = oncall_shifts.schedule_id
            AND p.program_id = s.program_id
            AND p.is_approved = true
        )
    );

-- Chiefs can manage shifts
CREATE POLICY "Chiefs can manage shifts" ON oncall_shifts
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM oncall_schedules s
            JOIN profiles p ON p.id = auth.uid()
            WHERE s.id = oncall_shifts.schedule_id
            AND p.program_id = s.program_id
            AND p.role IN ('chief_resident', 'admin')
            AND p.is_approved = true
        )
    );

-- Shift Swap Requests Policies
-- Users can view swap requests involving them
CREATE POLICY "Users can view own swap requests" ON shift_swap_requests
    FOR SELECT
    USING (
        auth.uid() = requesting_resident_id
        OR auth.uid() = target_resident_id
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('chief_resident', 'admin')
            AND is_approved = true
        )
    );

-- Users can create swap requests
CREATE POLICY "Users can create swap requests" ON shift_swap_requests
    FOR INSERT
    WITH CHECK (auth.uid() = requesting_resident_id);

-- Target resident can approve/reject swaps
CREATE POLICY "Target can update swap status" ON shift_swap_requests
    FOR UPDATE
    USING (
        auth.uid() = target_resident_id
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('chief_resident', 'admin')
            AND is_approved = true
        )
    );

-- ACGME Violations Policies
-- Users can view own violations
CREATE POLICY "Users can view own violations" ON acgme_violations
    FOR SELECT
    USING (
        auth.uid() = resident_id
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('chief_resident', 'admin')
            AND is_approved = true
        )
    );

-- Only chiefs/admins can create/resolve violations
CREATE POLICY "Chiefs can manage violations" ON acgme_violations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('chief_resident', 'admin')
            AND is_approved = true
        )
    );

-- Duty Hours Policies
-- Users can view own duty hours
CREATE POLICY "Users can view own duty hours" ON duty_hours
    FOR SELECT
    USING (
        auth.uid() = resident_id
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('chief_resident', 'admin')
            AND is_approved = true
        )
    );

-- System and chiefs can create/update duty hours
CREATE POLICY "Chiefs can manage duty hours" ON duty_hours
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('chief_resident', 'admin')
            AND is_approved = true
        )
    );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to calculate hours worked in a shift
CREATE OR REPLACE FUNCTION calculate_shift_hours(
    start_time TIME,
    end_time TIME,
    shift_type shift_type
) RETURNS NUMERIC AS $$
BEGIN
    IF shift_type = 'call_24hr' THEN
        RETURN 24.0;
    ELSIF end_time > start_time THEN
        RETURN EXTRACT(EPOCH FROM (end_time - start_time)) / 3600.0;
    ELSE
        -- Crosses midnight
        RETURN EXTRACT(EPOCH FROM ('24:00:00'::TIME - start_time + end_time)) / 3600.0;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check ACGME 80-hour week violation
CREATE OR REPLACE FUNCTION check_80_hour_week_violation(
    p_resident_id UUID,
    p_week_start_date DATE
) RETURNS TABLE(
    is_violation BOOLEAN,
    hours_worked NUMERIC,
    max_allowed NUMERIC
) AS $$
DECLARE
    v_total_hours NUMERIC;
BEGIN
    SELECT COALESCE(SUM(hours_worked), 0)
    INTO v_total_hours
    FROM duty_hours
    WHERE resident_id = p_resident_id
    AND week_start_date = p_week_start_date;

    RETURN QUERY SELECT
        v_total_hours > 80.0,
        v_total_hours,
        80.0;
END;
$$ LANGUAGE plpgsql;

-- Function to get resident's next available shift date
CREATE OR REPLACE FUNCTION get_next_available_date(
    p_resident_id UUID,
    p_program_id UUID,
    p_start_date DATE
) RETURNS DATE AS $$
DECLARE
    v_date DATE := p_start_date;
    v_has_shift BOOLEAN;
BEGIN
    LOOP
        SELECT EXISTS(
            SELECT 1 FROM oncall_shifts s
            JOIN oncall_schedules sch ON sch.id = s.schedule_id
            WHERE s.resident_id = p_resident_id
            AND sch.program_id = p_program_id
            AND s.shift_date = v_date
        ) INTO v_has_shift;

        IF NOT v_has_shift THEN
            RETURN v_date;
        END IF;

        v_date := v_date + INTERVAL '1 day';
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_oncall_schedules_updated_at
    BEFORE UPDATE ON oncall_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oncall_shifts_updated_at
    BEFORE UPDATE ON oncall_shifts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_swap_requests_updated_at
    BEFORE UPDATE ON shift_swap_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_duty_hours_updated_at
    BEFORE UPDATE ON duty_hours
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-calculate duty hours when shift is created/updated
CREATE OR REPLACE FUNCTION auto_create_duty_hours()
RETURNS TRIGGER AS $$
DECLARE
    v_hours NUMERIC;
    v_week_start DATE;
BEGIN
    -- Calculate hours
    v_hours := calculate_shift_hours(NEW.start_time, NEW.end_time, NEW.shift_type);

    -- Get week start (Monday)
    v_week_start := DATE_TRUNC('week', NEW.shift_date)::DATE;

    -- Insert or update duty hours
    INSERT INTO duty_hours (
        resident_id,
        shift_id,
        duty_date,
        hours_worked,
        is_call_day,
        consecutive_hours,
        week_start_date
    ) VALUES (
        NEW.resident_id,
        NEW.id,
        NEW.shift_date,
        v_hours,
        NEW.shift_type = 'call_24hr',
        CASE WHEN NEW.shift_type = 'call_24hr' THEN 24.0 ELSE v_hours END,
        v_week_start
    )
    ON CONFLICT (shift_id) WHERE shift_id IS NOT NULL
    DO UPDATE SET
        hours_worked = v_hours,
        is_call_day = NEW.shift_type = 'call_24hr',
        consecutive_hours = CASE WHEN NEW.shift_type = 'call_24hr' THEN 24.0 ELSE v_hours END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_create_duty_hours
    AFTER INSERT OR UPDATE ON oncall_shifts
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_duty_hours();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE oncall_schedules IS 'Master schedule table for on-call assignments';
COMMENT ON TABLE oncall_shifts IS 'Individual shift assignments for residents';
COMMENT ON TABLE shift_swap_requests IS 'Resident-initiated shift swap requests';
COMMENT ON TABLE acgme_violations IS 'ACGME VI.F duty hour violations tracking';
COMMENT ON TABLE duty_hours IS 'Detailed duty hours tracking for compliance';

COMMENT ON COLUMN oncall_shifts.is_post_call_day IS 'Day after 24-hour call (resident should have reduced duties)';
COMMENT ON COLUMN duty_hours.consecutive_hours IS 'Consecutive hours worked (max 28 hours per ACGME)';
COMMENT ON COLUMN duty_hours.hours_off_after IS 'Hours off after duty (min 14 hours after 24-hour call)';
