# Drift Setup Guide - Step by Step

This guide will walk you through setting up the Drift medical residency app from scratch.

## ⏱️ Estimated Time: 20-30 minutes

---

## Step 1: Install Dependencies (5 min)

```bash
cd windsurf-project
npm install
```

**Expected output**: All dependencies installed without errors.

---

## Step 2: Create Supabase Project (5 min)

1. Go to https://supabase.com
2. Click **"Start your project"** or **"New Project"**
3. Fill in:
   - **Name**: drift-medical-residency (or your choice)
   - **Database Password**: Choose a strong password (SAVE THIS!)
   - **Region**: Choose closest to you
4. Click **"Create new project"**
5. Wait 2-3 minutes for project to provision

---

## Step 3: Set Up Database (5 min)

### 3.1 Run Migration Files

1. In your Supabase project, go to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Open `supabase/migrations/001_initial_schema.sql` from your project
4. Copy entire contents and paste into SQL Editor
5. Click **"Run"** button (bottom right)
6. ✅ Verify: Should see "Success. No rows returned"

7. Click **"New query"** again
8. Open `supabase/migrations/002_seed_programs.sql`
9. Copy contents and paste
10. Click **"Run"**
11. ✅ Verify: Should see "Success" with inserted rows count

### 3.2 Verify Tables Created

1. Go to **Table Editor** (left sidebar)
2. You should see:
   - ✅ profiles
   - ✅ programs
   - ✅ approval_requests
   - ✅ specialties

---

## Step 4: Configure Environment Variables (2 min)

### 4.1 Get Supabase Credentials

1. In Supabase, go to **Settings** (gear icon, left sidebar)
2. Click **API** in the settings menu
3. You'll see:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public** key: `eyJhbGc...` (long string)

### 4.2 Create .env File

```bash
# In project root
cp .env.example .env
```

Edit `.env` file:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important**: Replace with YOUR actual values!

---

## Step 5: Create Admin Account (5 min)

### Option A: Through the App (Recommended)

1. Start the app:
   ```bash
   npm start
   ```

2. Press `w` for web or scan QR code for mobile

3. Click **"Sign Up"**

4. Enter:
   - Email: your-email@example.com
   - Password: (at least 6 characters)
   - Confirm Password

5. Click **"Sign Up"**

6. Check your email for verification (optional - you can skip and still login)

7. Go back to login and sign in

### Option B: Create in Supabase Dashboard

1. In Supabase → **Authentication** → **Users**
2. Click **"Add user"**
3. Enter email and password
4. Click **"Create user"**

### 5.1 Make Yourself Admin

1. In Supabase → **Table Editor** → **profiles**
2. Find your profile (match your email)
3. Click to edit
4. Update these fields:
   - `role`: Change to `admin`
   - `is_approved`: Check ✅ (set to `true`)
   - `is_profile_complete`: Check ✅ (set to `true`)
   - `first_name`: Your first name
   - `last_name`: Your last name
5. Click **"Save"**

### 5.2 Verify Admin Access

1. Refresh your app
2. You should see:
   - ✅ No "Pending Approval" banner
   - ✅ "Manage Approvals" tab at bottom
   - ✅ Full access to all features

---

## Step 6: Test the App (5 min)

### Test User Sign Up Flow

1. Sign out from admin account
2. Click **"Sign Up"**
3. Create a test resident account
4. Complete profile:
   - First Name: Test
   - Last Name: Resident
   - Phone: 555-0100
   - Role: **Resident**
   - Specialty: Select any (e.g., "Internal Medicine")
   - Program: Search "Massachusetts" → Select a program
5. Click **"Submit for Approval"**
6. ✅ Verify: Should see yellow "Pending Approval" banner

### Test Approval Flow

1. Sign out
2. Sign back in with your admin account
3. Click **"Manage Approvals"** tab
4. You should see the test resident's approval request
5. Review details and click **"Approve"**
6. ✅ Verify: Success message appears

### Test Approved User

1. Sign out
2. Sign in with test resident account
3. ✅ Verify:
   - No more pending banner
   - Can see full program information
   - Has access to all features

---

## Step 7: Customize (Optional)

### Add More Programs

```sql
-- In Supabase SQL Editor
INSERT INTO programs (program_name, specialty, location, program_director, program_coordinator)
VALUES
  ('Your Hospital - Specialty', 'Internal Medicine', 'Your City, ST', 'Dr. Name', 'Coordinator Name');
```

### Add More Specialties

```sql
INSERT INTO specialties (name) VALUES ('Your Specialty');
```

### Customize App Name/Icon

Edit `app.json`:
```json
{
  "expo": {
    "name": "Your App Name",
    "slug": "your-app-slug"
  }
}
```

---

## 🎉 You're Done!

Your app is now fully configured and ready to use!

## Next Steps

- **Deploy to App Stores**: Follow Expo's build guide
- **Add More Features**: Customize to your needs
- **Invite Users**: Share app with your residency program

---

## 🆘 Need Help?

### Can't find Supabase credentials?
→ Settings → API → Copy Project URL and anon key

### Tables not showing up?
→ Make sure both migration SQL files ran successfully

### Can't approve users?
→ Verify you set role='admin' and is_approved=true for your account

### App not connecting to Supabase?
→ Check .env file has correct credentials
→ Restart app after editing .env

### Program search not working?
→ Verify programs table has data (run 002_seed_programs.sql)

---

## 📋 Checklist

- [ ] Node.js installed
- [ ] Dependencies installed (`npm install`)
- [ ] Supabase project created
- [ ] Migration files executed
- [ ] .env file configured
- [ ] Admin account created
- [ ] Admin role assigned in database
- [ ] App running (`npm start`)
- [ ] Test user created and approved
- [ ] Approval flow tested

---

**Congratulations! You've successfully set up Drift! 🚀**
