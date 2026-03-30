# Drift - Medical Residency Management App

A React Native mobile and web application for managing medical residency programs, built with Supabase backend.

## 🎯 Features

- **User Authentication**: Email/password authentication with Supabase
- **Profile Management**: Complete profile with specialty and program selection
- **Role-Based Access Control**: 3 roles (Resident, Chief Resident, Admin)
- **Approval System**:
  - Residents require Chief Resident approval
  - Chief Residents require Admin approval
  - Pending approval banner for unapproved users
- **Program Search**: Search through 5000+ residency programs
- **Specialty Selection**: 38+ medical specialties dropdown
- **Real-time Updates**: Automatic profile refresh and approval status

## 🏗️ Architecture

### Tech Stack

- **Frontend**: React Native (Expo)
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Navigation**: React Navigation (Stack + Bottom Tabs)
- **State Management**: React Context API
- **Form Handling**: Formik + Yup

### Database Schema

#### Tables

1. **profiles** - User profile information
   - Links to Supabase Auth users
   - Contains: name, phone, role, specialty, program_id
   - Approval status tracking

2. **programs** - Medical residency programs
   - 5000+ programs across US
   - Contains: name, specialty, location, director, coordinator

3. **approval_requests** - Approval workflow tracking
   - Links user to reviewer
   - Status: pending, approved, rejected

4. **specialties** - Medical specialty reference data
   - 38 common medical specialties

### Security (Row Level Security)

- Users can only view/update their own profile
- Chief Residents can view profiles in their program
- Admins have full access
- Automatic profile creation on user signup
- Automatic approval request creation on profile completion

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Expo CLI: `npm install -g expo-cli`
- Supabase account (https://supabase.com)

### Setup Instructions

#### 1. Clone and Install

```bash
cd windsurf-project
npm install
```

#### 2. Configure Supabase

1. Create a new project at https://supabase.com
2. Go to **SQL Editor** and run the migration files:
   - Run `supabase/migrations/001_initial_schema.sql`
   - Run `supabase/migrations/002_seed_programs.sql`

3. Get your project credentials:
   - Go to **Settings** → **API**
   - Copy **Project URL** and **anon public** key

4. Create `.env` file in the root:

```bash
cp .env.example .env
```

Edit `.env`:
```
EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

#### 3. Create Admin User

1. Sign up for an account in the app or via Supabase dashboard
2. In Supabase Dashboard → **Table Editor** → **profiles**
3. Find your profile and update:
   - Set `role` = `admin`
   - Set `is_approved` = `true`
   - Set `is_profile_complete` = `true`

#### 4. Run the App

```bash
# Start development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on web
npm run web
```

## 📱 User Flows

### New User Sign Up Flow

1. **Sign Up** → Enter email/password
2. **Email Verification** → Verify email (optional)
3. **Complete Profile** → Fill in:
   - First Name, Last Name
   - Phone Number
   - Role (Resident or Chief Resident)
   - Specialty (dropdown)
   - Program (search & select)
4. **Submit for Approval** → Approval request created
5. **Pending State** → See banner, access general info only
6. **Approved** → Full access to program information

### Approval Flow

#### For Residents:
1. Submit profile → Approval request created
2. Chief Resident from same program reviews
3. Chief approves/rejects with optional notes
4. User gets full access once approved

#### For Chief Residents:
1. Submit profile → Approval request created
2. Admin OR existing approved Chief Resident reviews
3. Reviewer approves/rejects with optional notes
4. User gets full access + approval management once approved

### Admin Functions

Admins can:
- View all profiles
- Approve/reject any user
- Manage programs
- See all approval requests
- Override any restrictions

## 🗂️ Project Structure

```
windsurf-project/
├── App.tsx                     # Main app entry
├── src/
│   ├── components/            # Reusable components
│   │   └── PendingApprovalBanner.tsx
│   ├── navigation/            # Navigation setup
│   │   └── RootNavigator.tsx
│   ├── screens/              # Screen components
│   │   ├── LoginScreen.tsx
│   │   ├── SignUpScreen.tsx
│   │   ├── CompleteProfileScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   └── ApprovalsScreen.tsx
│   ├── services/             # API and auth services
│   │   ├── supabase.ts
│   │   ├── AuthContext.tsx
│   │   └── api.ts
│   └── types/                # TypeScript types
│       └── index.ts
├── supabase/
│   └── migrations/           # Database migrations
│       ├── 001_initial_schema.sql
│       └── 002_seed_programs.sql
├── package.json
└── README.md
```

## 🔐 Security Features

- **Row Level Security (RLS)**: Database-level access control
- **Email Verification**: Optional email confirmation
- **Role-Based Permissions**: Different access levels per role
- **Secure API Keys**: Environment variables for credentials
- **Approval Workflow**: Multi-tier approval system

## 🎨 UI/UX Features

- **Pending Approval Banner**: Clear visual indicator
- **Real-time Search**: Debounced program search
- **Pull to Refresh**: Update profile status
- **Loading States**: Proper loading indicators
- **Error Handling**: User-friendly error messages
- **Responsive Design**: Works on mobile and web

## 📊 Database Policies Summary

| Table | Policy | Who |
|-------|--------|-----|
| profiles | View own | All authenticated |
| profiles | View program | Chief Residents (same program) |
| profiles | View all | Admins |
| profiles | Update own | All authenticated |
| profiles | Update any | Admins & Chiefs (approved) |
| programs | View | All authenticated |
| programs | Manage | Admins only |
| approval_requests | View own | All authenticated |
| approval_requests | View program | Chiefs (same program) |
| approval_requests | View all | Admins |
| approval_requests | Approve/Reject | Admins & Chiefs (approved) |

## 🔧 Development

### Adding More Programs

To add more programs to the database:

```sql
INSERT INTO programs (program_name, specialty, location, program_director, program_coordinator)
VALUES
  ('Program Name', 'Specialty', 'City, State', 'Director Name', 'Coordinator Name');
```

### Adding More Specialties

```sql
INSERT INTO specialties (name) VALUES ('New Specialty Name');
```

### Testing Approval Flow

1. Create a test resident account
2. Complete profile with a program
3. Login as Chief Resident or Admin
4. Go to Approvals tab
5. Approve or reject the request

## 🐛 Troubleshooting

### Common Issues

**Issue**: "Error loading specialties"
- **Solution**: Ensure migration `001_initial_schema.sql` ran successfully

**Issue**: "Failed to search programs"
- **Solution**: Check if programs table has data (run `002_seed_programs.sql`)

**Issue**: "Profile not updating"
- **Solution**: Check RLS policies are enabled and correct

**Issue**: "Can't see approval requests"
- **Solution**: Ensure user role is `chief_resident` or `admin` and `is_approved = true`

### Debug Mode

To see detailed logs:
```bash
# Enable debug logging
export EXPO_DEBUG=true
npm start
```

## 📝 License

MIT License - feel free to use this project for your medical residency program!

## 🤝 Contributing

Contributions welcome! Please follow these steps:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📞 Support

For issues or questions:
- Open an issue on GitHub
- Email: support@drift.example.com

---

Built with ❤️ for medical residents and their programs.
