# 🚀 Deploy Drift App - Step by Step

## ✅ Completed So Far

- [x] Git repository initialized
- [x] Code pushed to GitHub: https://github.com/sudharsanprasadh31/drift-medical-residency
- [x] Vercel CLI installed
- [x] EAS CLI installed

---

## 🌐 PART 1: Deploy Web to Vercel

### Step 1: Deploy with Vercel CLI

Run this command in your terminal:

```bash
vercel
```

**Answer the prompts:**
1. **Set up and deploy?** → **Y** (Yes)
2. **Which scope?** → Select your account
3. **Link to existing project?** → **N** (No)
4. **Project name?** → `drift-medical-residency`
5. **Directory?** → `.` (press Enter)
6. **Override settings?** → **N** (No)

**Wait for deployment** (~2-3 minutes)

You'll get a URL like: `https://drift-medical-residency-xxxx.vercel.app`

---

### Step 2: Add Environment Variables to Vercel

After deployment succeeds:

**Option A: Using Vercel CLI (Fastest)**

```bash
vercel env add EXPO_PUBLIC_SUPABASE_URL
```
When prompted, paste: `https://rfrmlkafszkqpihidvdo.supabase.co`
Select: **Production**

```bash
vercel env add EXPO_PUBLIC_SUPABASE_ANON_KEY
```
When prompted, paste: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmcm1sa2Fmc3prcXBpaGlkdmRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4Mjg4ODMsImV4cCI6MjA5MDQwNDg4M30.4RYlsvu_CCD2B-HmhC0fABZusBuV9EWTS_Tr8EalXwE`
Select: **Production**

**Option B: Using Vercel Dashboard**

1. Go to https://vercel.com/dashboard
2. Click on your project: `drift-medical-residency`
3. Go to **Settings** → **Environment Variables**
4. Add these two variables:

   **Variable 1:**
   - Name: `EXPO_PUBLIC_SUPABASE_URL`
   - Value: `https://rfrmlkafszkqpihidvdo.supabase.co`
   - Environment: Production ✓

   **Variable 2:**
   - Name: `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmcm1sa2Fmc3prcXBpaGlkdmRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4Mjg4ODMsImV4cCI6MjA5MDQwNDg4M30.4RYlsvu_CCD2B-HmhC0fABZusBuV9EWTS_Tr8EalXwE`
   - Environment: Production ✓

5. Click **Save**

---

### Step 3: Redeploy with Environment Variables

```bash
vercel --prod
```

This redeploys with the environment variables.

---

### Step 4: Test Your Web App

Visit your Vercel URL (from Step 1) and test:
- ✅ Can you see the login page?
- ✅ Can you login with your credentials?
- ✅ Can you search for programs?
- ✅ Does everything work?

**🎉 Web deployment complete!**

---

## 📱 PART 2: Deploy Mobile with EAS

### Step 1: Login to Expo

If you don't have an Expo account:
1. Go to https://expo.dev
2. Click **Sign up**
3. Create account

Then login:

```bash
eas login
```

Enter your Expo email and password.

---

### Step 2: Configure EAS Build

```bash
eas build:configure
```

**Answer the prompts:**
- **Generate a new Android Keystore?** → **Y** (Yes)
- **Generate project id?** → **Y** (Yes)

This creates/updates `eas.json` and `app.json` with your project ID.

---

### Step 3: Add Environment Variables to EAS

```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value https://rfrmlkafszkqpihidvdo.supabase.co
```

```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmcm1sa2Fmc3prcXBpaGlkdmRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4Mjg4ODMsImV4cCI6MjA5MDQwNDg4M30.4RYlsvu_CCD2B-HmhC0fABZusBuV9EWTS_Tr8EalXwE
```

---

### Step 4: Build Android App (APK for Testing)

```bash
eas build --platform android --profile preview
```

**This will:**
- Upload your code to Expo servers
- Build an Android APK
- Take about 10-15 minutes
- Give you a download link

**Monitor progress:**
- You'll get a build URL like: `https://expo.dev/accounts/xxx/projects/xxx/builds/xxx`
- Open it to watch the build in real-time

**When complete:**
- Download the `.apk` file
- Install on Android device (enable "Install from unknown sources")
- Test the app!

---

### Step 5: Build iOS App (Requires Mac + Apple Developer Account)

**Prerequisites:**
- Mac computer
- Apple Developer account ($99/year)
- Xcode installed

**Build command:**

```bash
eas build --platform ios --profile preview
```

**For App Store production build:**

```bash
eas build --platform ios --profile production
```

---

### Step 6: Submit to App Stores (Optional)

**For Android (Google Play):**

```bash
eas submit --platform android
```

Requirements:
- Google Play Developer account ($25 one-time)
- App details, screenshots, description ready

**For iOS (App Store):**

```bash
eas submit --platform ios
```

Requirements:
- Apple Developer account ($99/year)
- App Store Connect configured
- App screenshots, description ready

---

## 📊 Deployment Checklist

### Web (Vercel)
- [ ] Run `vercel` command
- [ ] Deployment successful
- [ ] Add environment variables
- [ ] Redeploy with `vercel --prod`
- [ ] Test at production URL
- [ ] Login works
- [ ] Features work

### Mobile (EAS)
- [ ] Run `eas login`
- [ ] Run `eas build:configure`
- [ ] Add EAS secrets
- [ ] Build Android: `eas build --platform android --profile preview`
- [ ] Download and test APK
- [ ] (Optional) Build iOS
- [ ] (Optional) Submit to stores

### Supabase Configuration
- [ ] Update Site URL in Supabase
- [ ] Add Vercel URL to redirect URLs
- [ ] Test authentication from production

---

## 🔧 Supabase Production Configuration

After deploying, update Supabase:

1. Go to: https://rfrmlkafszkqpihidvdo.supabase.co
2. **Authentication** → **URL Configuration**
3. **Site URL:** `https://your-vercel-url.vercel.app`
4. **Redirect URLs:** Add:
   ```
   https://your-vercel-url.vercel.app
   https://your-vercel-url.vercel.app/**
   https://*.vercel.app
   ```
5. Click **Save**

---

## 🎯 Quick Reference

### Useful Commands

**Check deployment status:**
```bash
vercel ls
```

**View logs:**
```bash
vercel logs
```

**EAS build status:**
```bash
eas build:list
```

**Push updates:**
```bash
git add .
git commit -m "Update"
git push
# Vercel auto-deploys!
```

---

## 🆘 Troubleshooting

### Vercel build fails
- Check build logs in Vercel dashboard
- Verify `vercel.json` configuration
- Try: `npx expo export:web` locally first

### EAS build fails
- Check build logs at expo.dev
- Verify `eas.json` and `app.json`
- Check environment variables are set

### App not connecting to Supabase
- Verify environment variables are set correctly
- Check Supabase URL configuration
- Test API calls in browser console

---

## 📞 Support

- **Vercel Docs:** https://vercel.com/docs
- **EAS Docs:** https://docs.expo.dev/build/introduction/
- **Supabase Docs:** https://supabase.com/docs

---

## 🎉 Success!

Once both deployments are complete:

- **Web App:** `https://your-app.vercel.app`
- **Android App:** Download from EAS build
- **iOS App:** Download from EAS build (if built)

Share your apps with residents and get feedback!

---

**Good luck with your deployment! 🚀**
