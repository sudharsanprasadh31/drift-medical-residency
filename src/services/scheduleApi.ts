import { supabase } from './supabase';
import {
  OnCallSchedule,
  OnCallShift,
  ShiftSwapRequest,
  ACGMEViolation,
  DutyHours,
  ScheduleStatus,
  ShiftType,
  CallType,
} from '../types';

// ============================================
// SCHEDULE OPERATIONS
// ============================================

export const getSchedules = async (programId: string): Promise<OnCallSchedule[]> => {
  const { data, error } = await supabase
    .from('oncall_schedules')
    .select(`
      *,
      program:programs(*)
    `)
    .eq('program_id', programId)
    .order('start_date', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const getScheduleById = async (scheduleId: string): Promise<OnCallSchedule> => {
  const { data, error } = await supabase
    .from('oncall_schedules')
    .select(`
      *,
      program:programs(*)
    `)
    .eq('id', scheduleId)
    .single();

  if (error) throw error;
  return data;
};

export const createSchedule = async (
  schedule: Omit<OnCallSchedule, 'id' | 'created_at' | 'updated_at' | 'published_at'>
): Promise<OnCallSchedule> => {
  const { data, error } = await supabase
    .from('oncall_schedules')
    .insert(schedule)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateSchedule = async (
  scheduleId: string,
  updates: Partial<OnCallSchedule>
): Promise<OnCallSchedule> => {
  const { data, error } = await supabase
    .from('oncall_schedules')
    .update(updates)
    .eq('id', scheduleId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const publishSchedule = async (scheduleId: string): Promise<OnCallSchedule> => {
  const { data, error } = await supabase
    .from('oncall_schedules')
    .update({
      status: 'published' as ScheduleStatus,
      published_at: new Date().toISOString(),
    })
    .eq('id', scheduleId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteSchedule = async (scheduleId: string): Promise<void> => {
  const { error } = await supabase
    .from('oncall_schedules')
    .delete()
    .eq('id', scheduleId);

  if (error) throw error;
};

// ============================================
// SHIFT OPERATIONS
// ============================================

export const getShiftsBySchedule = async (scheduleId: string): Promise<OnCallShift[]> => {
  const { data, error } = await supabase
    .from('oncall_shifts')
    .select(`
      *,
      resident:profiles(*),
      schedule:oncall_schedules(*)
    `)
    .eq('schedule_id', scheduleId)
    .order('shift_date', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const getShiftsByResident = async (
  residentId: string,
  startDate?: string,
  endDate?: string
): Promise<OnCallShift[]> => {
  let query = supabase
    .from('oncall_shifts')
    .select(`
      *,
      resident:profiles(*),
      schedule:oncall_schedules(*)
    `)
    .eq('resident_id', residentId)
    .order('shift_date', { ascending: true });

  if (startDate) {
    query = query.gte('shift_date', startDate);
  }
  if (endDate) {
    query = query.lte('shift_date', endDate);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
};

export const createShift = async (
  shift: Omit<OnCallShift, 'id' | 'created_at' | 'updated_at'>
): Promise<OnCallShift> => {
  const { data, error } = await supabase
    .from('oncall_shifts')
    .insert(shift)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const createBulkShifts = async (
  shifts: Omit<OnCallShift, 'id' | 'created_at' | 'updated_at'>[]
): Promise<OnCallShift[]> => {
  const { data, error } = await supabase
    .from('oncall_shifts')
    .insert(shifts)
    .select();

  if (error) throw error;
  return data || [];
};

export const updateShift = async (
  shiftId: string,
  updates: Partial<OnCallShift>
): Promise<OnCallShift> => {
  const { data, error } = await supabase
    .from('oncall_shifts')
    .update(updates)
    .eq('id', shiftId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteShift = async (shiftId: string): Promise<void> => {
  const { error } = await supabase
    .from('oncall_shifts')
    .delete()
    .eq('id', shiftId);

  if (error) throw error;
};

// ============================================
// SHIFT SWAP OPERATIONS
// ============================================

export const getSwapRequests = async (residentId: string): Promise<ShiftSwapRequest[]> => {
  const { data, error } = await supabase
    .from('shift_swap_requests')
    .select(`
      *,
      requesting_resident:profiles!requesting_resident_id(*),
      target_resident:profiles!target_resident_id(*),
      requesting_shift:oncall_shifts!requesting_shift_id(*),
      target_shift:oncall_shifts!target_shift_id(*)
    `)
    .or(`requesting_resident_id.eq.${residentId},target_resident_id.eq.${residentId}`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const createSwapRequest = async (
  swap: Omit<ShiftSwapRequest, 'id' | 'created_at' | 'updated_at' | 'reviewed_by' | 'reviewed_at' | 'review_notes'>
): Promise<ShiftSwapRequest> => {
  const { data, error } = await supabase
    .from('shift_swap_requests')
    .insert(swap)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const respondToSwapRequest = async (
  swapId: string,
  status: 'approved' | 'rejected',
  reviewerId: string,
  reviewNotes?: string
): Promise<ShiftSwapRequest> => {
  const { data, error } = await supabase
    .from('shift_swap_requests')
    .update({
      status,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNotes,
    })
    .eq('id', swapId)
    .select()
    .single();

  if (error) throw error;

  // If approved, swap the shifts
  if (status === 'approved' && data) {
    await executeShiftSwap(data.requesting_shift_id, data.target_shift_id);
  }

  return data;
};

const executeShiftSwap = async (shift1Id: string, shift2Id: string | null): Promise<void> => {
  // Get both shifts
  const { data: shift1, error: error1 } = await supabase
    .from('oncall_shifts')
    .select('*')
    .eq('id', shift1Id)
    .single();

  if (error1) throw error1;

  if (shift2Id) {
    const { data: shift2, error: error2 } = await supabase
      .from('oncall_shifts')
      .select('*')
      .eq('id', shift2Id)
      .single();

    if (error2) throw error2;

    // Swap resident assignments
    const { error: updateError1 } = await supabase
      .from('oncall_shifts')
      .update({ resident_id: shift2.resident_id })
      .eq('id', shift1Id);

    const { error: updateError2 } = await supabase
      .from('oncall_shifts')
      .update({ resident_id: shift1.resident_id })
      .eq('id', shift2Id);

    if (updateError1 || updateError2) throw updateError1 || updateError2;
  }
};

// ============================================
// ACGME COMPLIANCE OPERATIONS
// ============================================

export const getViolationsByResident = async (residentId: string): Promise<ACGMEViolation[]> => {
  const { data, error } = await supabase
    .from('acgme_violations')
    .select(`
      *,
      resident:profiles(*)
    `)
    .eq('resident_id', residentId)
    .order('violation_date', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const getAllViolations = async (programId?: string): Promise<ACGMEViolation[]> => {
  let query = supabase
    .from('acgme_violations')
    .select(`
      *,
      resident:profiles(*)
    `)
    .order('violation_date', { ascending: false });

  if (programId) {
    query = query.eq('resident.program_id', programId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
};

export const getDutyHoursByWeek = async (
  residentId: string,
  weekStartDate: string
): Promise<DutyHours[]> => {
  const { data, error } = await supabase
    .from('duty_hours')
    .select('*')
    .eq('resident_id', residentId)
    .eq('week_start_date', weekStartDate)
    .order('duty_date', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const check80HourViolation = async (
  residentId: string,
  weekStartDate: string
): Promise<{ isViolation: boolean; hoursWorked: number; maxAllowed: number }> => {
  const { data, error } = await supabase.rpc('check_80_hour_week_violation', {
    p_resident_id: residentId,
    p_week_start_date: weekStartDate,
  });

  if (error) throw error;
  return data[0] || { isViolation: false, hoursWorked: 0, maxAllowed: 80 };
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export const generateRotatingSchedule = async (
  scheduleId: string,
  programId: string,
  startDate: string,
  endDate: string,
  residentIds: string[]
): Promise<OnCallShift[]> => {
  // Generate a rotating call schedule
  // Example: Each resident takes call every N days
  const shifts: Omit<OnCallShift, 'id' | 'created_at' | 'updated_at'>[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalResidents = residentIds.length;
  let residentIndex = 0;

  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const shift: Omit<OnCallShift, 'id' | 'created_at' | 'updated_at'> = {
      schedule_id: scheduleId,
      resident_id: residentIds[residentIndex % totalResidents],
      shift_date: date.toISOString().split('T')[0],
      shift_type: 'call_24hr',
      call_type: 'in_house',
      start_time: '08:00',
      end_time: '08:00', // Next day
      is_post_call_day: false,
      notes: null,
    };
    shifts.push(shift);
    residentIndex++;
  }

  return createBulkShifts(shifts);
};

export const getResidentScheduleStats = async (
  residentId: string,
  startDate: string,
  endDate: string
): Promise<{
  totalShifts: number;
  callShifts: number;
  totalHours: number;
  averageHoursPerWeek: number;
  violations: number;
}> => {
  // Get shifts
  const shifts = await getShiftsByResident(residentId, startDate, endDate);

  // Get violations
  const { data: violations, error } = await supabase
    .from('acgme_violations')
    .select('*')
    .eq('resident_id', residentId)
    .gte('violation_date', startDate)
    .lte('violation_date', endDate)
    .eq('resolved', false);

  if (error) throw error;

  const callShifts = shifts.filter((s) => s.shift_type === 'call_24hr').length;

  // Calculate total hours (simplified)
  const totalHours = shifts.reduce((acc, shift) => {
    if (shift.shift_type === 'call_24hr') return acc + 24;
    // Simple hour calculation
    const start = new Date(`2000-01-01 ${shift.start_time}`);
    const end = new Date(`2000-01-01 ${shift.end_time}`);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return acc + hours;
  }, 0);

  const weeks = (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24 * 7);
  const averageHoursPerWeek = weeks > 0 ? totalHours / weeks : 0;

  return {
    totalShifts: shifts.length,
    callShifts,
    totalHours,
    averageHoursPerWeek,
    violations: violations?.length || 0,
  };
};
