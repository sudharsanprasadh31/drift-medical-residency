export type UserRole = 'resident' | 'chief_resident' | 'admin';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface Program {
  id: string;
  program_name: string;
  specialty: string;
  location: string;
  program_director: string | null;
  program_coordinator: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone_number: string | null;
  role: UserRole;
  specialty: string | null;
  program_id: string | null;
  is_approved: boolean;
  is_profile_complete: boolean;
  created_at: string;
  updated_at: string;
  program?: Program;
}

export interface ApprovalRequest {
  id: string;
  user_id: string;
  requested_role: UserRole;
  status: ApprovalStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface Specialty {
  id: string;
  name: string;
  created_at: string;
}

export interface AuthContextType {
  user: any;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// ============================================
// ON-CALL SCHEDULE TYPES
// ============================================

export type CallType = 'in_house' | 'home_call' | 'backup' | 'jeopardy';
export type ShiftType = 'day' | 'evening' | 'night' | 'call_24hr' | 'weekend' | 'holiday';
export type ScheduleStatus = 'draft' | 'published' | 'archived';
export type SwapStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface OnCallSchedule {
  id: string;
  program_id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: ScheduleStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  notes: string | null;
  program?: Program;
}

export interface OnCallShift {
  id: string;
  schedule_id: string;
  resident_id: string;
  shift_date: string;
  shift_type: ShiftType;
  call_type: CallType | null;
  start_time: string;
  end_time: string;
  is_post_call_day: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  resident?: Profile;
  schedule?: OnCallSchedule;
}

export interface ShiftSwapRequest {
  id: string;
  requesting_resident_id: string;
  target_resident_id: string;
  requesting_shift_id: string;
  target_shift_id: string | null;
  status: SwapStatus;
  reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
  requesting_resident?: Profile;
  target_resident?: Profile;
  requesting_shift?: OnCallShift;
  target_shift?: OnCallShift;
}

export interface ACGMEViolation {
  id: string;
  resident_id: string;
  schedule_id: string | null;
  violation_date: string;
  violation_type: string;
  description: string;
  hours_worked: number | null;
  max_allowed: number | null;
  severity: string | null;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  resident?: Profile;
}

export interface DutyHours {
  id: string;
  resident_id: string;
  shift_id: string | null;
  duty_date: string;
  hours_worked: number;
  is_call_day: boolean;
  consecutive_hours: number | null;
  hours_off_before: number | null;
  hours_off_after: number | null;
  week_start_date: string;
  created_at: string;
  updated_at: string;
}
