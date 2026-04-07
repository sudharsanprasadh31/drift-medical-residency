# Migration Guide - Program-Specific Approvals

## What Changed

Updated approval logic to restrict approval requests to Chief Residents from the same program only.

## Why This Change

**Before:** All Chief Residents could see and approve any resident from any program.

**After:** Chief Residents can only see and approve residents who are enrolling in their own program.

## How to Apply This Migration

### Step 1: Run SQL Migration

In Supabase Dashboard → SQL Editor → New Query:

```sql
-- Copy and paste contents of:
-- 004_fix_program_specific_approvals.sql
```

### Step 2: Verify Changes

1. **Test as Chief Resident:**
   - Login as a Chief Resident
   - Go to Approvals tab
   - You should only see residents from YOUR program

2. **Test as Admin:**
   - Login as Admin
   - Go to Approvals tab
   - You should see ALL pending approvals (no change)

3. **Test as Resident:**
   - Login as Resident
   - Complete profile with a specific program
   - Only Chief Residents from that program can approve

## Technical Details

### Database Changes

**New RLS Policies:**

1. **`Chiefs can view own program approval requests`**
   - Chief Residents: Only see requests where `applicant.program_id = chief.program_id`
   - Admins: See all requests
   - Users: See own requests

2. **`Chiefs can update own program approvals`**
   - Chief Residents: Only approve/reject if `applicant.program_id = chief.program_id`
   - Admins: Can approve/reject anyone

### Code Changes

**Updated Files:**
- `supabase/migrations/004_fix_program_specific_approvals.sql` - New RLS policies
- `src/services/api.ts` - Added documentation comments
- `src/screens/ApprovalsScreen.tsx` - Added program context header

### UI Changes

**For Chief Residents:**
- Shows header: "Your Program Approvals"
- Shows program name: "Showing approval requests for: [Program Name]"
- Empty state: "No pending approvals from your program"
- Clarification: "Only residents enrolling in your program will appear here"

**For Admins:**
- No visual changes
- Still see all approval requests

## Migration Checklist

- [ ] Run SQL migration `004_fix_program_specific_approvals.sql`
- [ ] Deploy updated frontend code
- [ ] Test as Chief Resident (should see filtered list)
- [ ] Test as Admin (should see all requests)
- [ ] Test new resident signup (should go to correct Chief)
- [ ] Verify old pending requests still work

## Rollback Plan

If you need to revert:

```sql
-- Revert to old policies (from 003_fix_rls_recursion.sql)
DROP POLICY IF EXISTS "Chiefs can view own program approval requests" ON approval_requests;
DROP POLICY IF EXISTS "Chiefs can update own program approvals" ON approval_requests;

CREATE POLICY "Privileged users can view all approval requests" ON approval_requests
    FOR SELECT
    USING (auth.uid() = user_id OR is_admin_or_chief());

CREATE POLICY "Privileged users can update approval requests" ON approval_requests
    FOR UPDATE
    USING (is_admin_or_chief());
```

## Testing Scenarios

### Scenario 1: Same Program
1. Chief Resident A is in "Program X"
2. Resident B signs up for "Program X"
3. ✅ Chief Resident A sees the approval request
4. ✅ Chief Resident A can approve

### Scenario 2: Different Program
1. Chief Resident A is in "Program X"
2. Resident C signs up for "Program Y"
3. ❌ Chief Resident A does NOT see the request
4. ✅ Chief Resident from "Program Y" sees it

### Scenario 3: Admin Access
1. Admin user
2. Resident D signs up for any program
3. ✅ Admin sees ALL approval requests
4. ✅ Admin can approve anyone

### Scenario 4: Chief Resident Signup
1. User E signs up as Chief Resident for "Program Z"
2. ✅ Admin sees the approval request
3. ✅ Existing approved Chief from "Program Z" also sees it
4. Either can approve

## Support

If you encounter issues:
1. Check RLS policies are created: `SELECT * FROM pg_policies WHERE tablename = 'approval_requests';`
2. Verify user's program_id is set: `SELECT id, email, program_id, role FROM profiles;`
3. Test policy with: `SELECT * FROM approval_requests;` (as different users)
