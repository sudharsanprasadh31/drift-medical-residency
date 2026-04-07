# Approval Logic Update - Program-Specific Approvals

## 🎯 What Changed

Updated the approval system so that **Chief Residents can only approve residents from their own program**.

---

## 📋 Changes Summary

### Before ❌
- Chief Residents could see ALL pending approval requests
- Any Chief Resident could approve any Resident
- No program-based filtering

### After ✅
- Chief Residents only see approval requests from **their own program**
- Chief Residents can only approve residents who selected **the same program**
- Admins still see and can approve ALL requests

---

## 🔄 How It Works Now

### For Residents:
1. Resident signs up for "Massachusetts General Hospital - Internal Medicine"
2. Approval request is created
3. **Only** Chief Residents from "Massachusetts General Hospital - Internal Medicine" can see and approve it
4. Admins can also see and approve it

### For Chief Residents:
1. Chief Resident is part of "Johns Hopkins Hospital - Surgery"
2. When they open the Approvals tab, they see:
   - ✅ Residents who selected "Johns Hopkins Hospital - Surgery"
   - ❌ Residents from other programs (filtered out automatically)
3. Header shows: "Your Program Approvals - Showing approval requests for: Johns Hopkins Hospital - Surgery"

### For Admins:
1. No change in functionality
2. Still see ALL approval requests
3. Can approve anyone from any program

---

## 🛠️ Technical Implementation

### 1. Database Changes (RLS Policies)

**File:** `supabase/migrations/004_fix_program_specific_approvals.sql`

Created new Row Level Security policies:

```sql
-- Chief Residents can only view approval requests 
-- from users in their own program
CREATE POLICY "Chiefs can view own program approval requests" ON approval_requests
    FOR SELECT
    USING (
        -- Can see own requests
        auth.uid() = user_id OR  
        -- Chiefs can see requests where applicant.program_id = chief.program_id
        (EXISTS (SELECT 1 FROM profiles chief
                 WHERE chief.id = auth.uid()
                 AND chief.program_id = applicant.program_id))
        OR
        -- Admins can see all
        (role = 'admin' AND is_approved = true)
    );
```

### 2. UI Changes

**File:** `src/screens/ApprovalsScreen.tsx`

Added header for Chief Residents showing:
- Their program name
- Clarification that only their program's requests appear
- Updated empty state message

### 3. API Documentation

**File:** `src/services/api.ts`

Added comments explaining how RLS policies automatically filter results.

---

## 📝 Migration Steps

### Step 1: Run SQL Migration in Supabase

1. Go to Supabase Dashboard: https://rfrmlkafszkqpihidvdo.supabase.co
2. Click **SQL Editor** (left sidebar)
3. Click **"New query"**
4. Open file: `supabase/migrations/004_fix_program_specific_approvals.sql`
5. Copy entire contents
6. Paste into SQL Editor
7. Click **"Run"**

**Expected result:**
```
Success. Policies updated.
```

### Step 2: Deploy Frontend (Automatic)

Already pushed to GitHub! Vercel will auto-deploy in ~1 minute.

Visit: https://drift-medical-residency.vercel.app

### Step 3: Verify

**Test as Chief Resident:**
1. Login as a Chief Resident
2. Go to Approvals tab
3. You should see header showing your program
4. Only see residents from your program

**Test as Admin:**
1. Login as Admin
2. Go to Approvals tab
3. See ALL pending approvals (no filtering)

---

## 🧪 Testing Scenarios

### Test Case 1: Same Program Approval ✅

**Setup:**
- Chief Resident "Dr. Smith" at "Massachusetts General Hospital"
- Resident "John Doe" signs up for "Massachusetts General Hospital"

**Expected:**
- Dr. Smith sees John Doe's approval request
- Dr. Smith can approve/reject

### Test Case 2: Different Program ❌ 

**Setup:**
- Chief Resident "Dr. Smith" at "Massachusetts General Hospital"  
- Resident "Jane Doe" signs up for "Johns Hopkins Hospital"

**Expected:**
- Dr. Smith does NOT see Jane Doe's request
- Only Johns Hopkins Chiefs and Admins see it

### Test Case 3: Admin Access ✅

**Setup:**
- Admin user
- Multiple residents from different programs

**Expected:**
- Admin sees ALL approval requests
- No filtering applied

### Test Case 4: No Program Set ⚠️

**Setup:**
- Resident hasn't selected a program yet

**Expected:**
- No Chief Resident can see it (program_id is NULL)
- Only Admins can see and approve

---

## 🔒 Security Features

1. **Database-Level Enforcement:** RLS policies enforce rules at the database level
2. **Cannot Be Bypassed:** Even if frontend is hacked, database won't return unauthorized data
3. **Audit Trail:** All approvals track who approved (reviewed_by field)
4. **Program Validation:** Ensures program_id matches before allowing approval

---

## 📊 Impact

### Who's Affected:

| User Type | Impact | Action Required |
|-----------|--------|-----------------|
| Chief Residents | 🔵 Will see fewer approval requests (only their program) | Run SQL migration |
| Residents | ✅ No change | None |
| Admins | ✅ No change | None |

### Database:

| Table | Changes | Backward Compatible |
|-------|---------|---------------------|
| approval_requests | New RLS policies | ✅ Yes |
| profiles | No changes | ✅ Yes |
| programs | No changes | ✅ Yes |

---

## 🚨 Important Notes

1. **Chief Residents must have program_id set:** If a Chief Resident's program_id is NULL, they won't see any approvals
2. **Residents must select a program:** Approval requests require program_id to be routed correctly
3. **Existing approvals:** Old pending approvals still work with new logic
4. **Admin override:** Admins can always approve anyone regardless of program

---

## 📞 Support

If you need help:
1. Check the SQL migration ran successfully
2. Verify Chief Resident has program_id set in profiles table
3. Check Supabase logs for any policy errors
4. See `MIGRATION_GUIDE.md` for detailed troubleshooting

---

## ✅ Deployment Status

- 🟢 **SQL Migration:** Created (`004_fix_program_specific_approvals.sql`)
- 🟢 **Code Changes:** Committed to GitHub
- 🟢 **Vercel Deploy:** Auto-deploying now
- 🟡 **SQL Execution:** **YOU NEED TO RUN THE SQL MIGRATION**

---

**Next Step:** Run the SQL migration in Supabase to activate the new approval logic!
