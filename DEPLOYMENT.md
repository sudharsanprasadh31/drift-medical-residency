# Drift Deployment Guide

This guide covers deploying Drift to production for web and mobile platforms.

## 🌐 Web Deployment

### Option 1: Vercel (Recommended)

**Prerequisites:**
- GitHub account
- Vercel account (free at vercel.com)

**Steps:**

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin your-repo-url
   git push -u origin main
   ```

2. **Deploy to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repository
   - Configure:
     - **Framework:** Other
     - **Build Command:** `npx expo export:web`
     - **Output Directory:** `dist`
     - **Install Command:** `npm install`

3. **Add Environment Variables:**
   In Vercel dashboard → Settings → Environment Variables:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Deploy:**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Your app is live at: `https://your-app.vercel.app`

**Auto-Deployments:**
Every push to `main` branch automatically deploys!

---

### Option 2: Netlify

**Steps:**

1. **Connect Repository:**
   - Go to [netlify.com](https://netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect to GitHub and select your repo

2. **Configure Build:**
   - **Build command:** `npx expo export:web`
   - **Publish directory:** `dist`
   - **Environment variables:**
     ```
     EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
     EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
     ```

3. **Deploy:**
   - Click "Deploy site"
   - Your app is live at: `https://your-app.netlify.app`

---

## 📱 Mobile Deployment

### iOS & Android with Expo EAS

**Prerequisites:**
- Expo account (free at expo.dev)
- For iOS: Apple Developer account ($99/year)
- For Android: Google Play Developer account ($25 one-time)

**Setup:**

1. **Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo:**
   ```bash
   eas login
   ```

3. **Configure Build:**
   ```bash
   eas build:configure
   ```

---

### Build for iOS

1. **Create Build:**
   ```bash
   eas build --platform ios --profile production
   ```

2. **Wait for Build:**
   - Monitor progress at expo.dev
   - Download `.ipa` file when ready

3. **Submit to App Store:**
   ```bash
   eas submit --platform ios
   ```

   Or manually:
   - Open Xcode → Transporter
   - Upload `.ipa` file
   - Go to App Store Connect
   - Submit for review

**Requirements:**
- App Store Connect setup
- App icons and screenshots
- Privacy policy URL
- App description

---

### Build for Android

1. **Create Build:**
   ```bash
   eas build --platform android --profile production
   ```

2. **Download APK/AAB:**
   - Get `.aab` file from expo.dev
   - Or `.apk` for testing

3. **Submit to Google Play:**
   ```bash
   eas submit --platform android
   ```

   Or manually:
   - Go to [Google Play Console](https://play.google.com/console)
   - Create new app
   - Upload `.aab` file
   - Fill in app details
   - Submit for review

---

## 🔒 Production Supabase Setup

### 1. Configure Authentication URLs

In Supabase dashboard:

1. **Authentication → URL Configuration:**
   - **Site URL:** `https://your-production-domain.com`
   - **Redirect URLs:**
     ```
     https://your-production-domain.com
     https://your-production-domain.com/**
     https://*.vercel.app
     https://*.netlify.app
     ```

2. **Enable/Disable Email Confirmation:**
   - For production: Keep ENABLED
   - Users will receive confirmation emails

### 2. Update RLS Policies

If needed, review and update policies for production use.

### 3. Backup Database

```bash
# Install Supabase CLI
npm install -g supabase

# Backup database
supabase db dump -f backup.sql
```

---

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] All features tested locally
- [ ] Environment variables configured
- [ ] Supabase production URLs set
- [ ] RLS policies reviewed
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] Mobile responsiveness tested

### Web Deployment

- [ ] Code pushed to GitHub
- [ ] Vercel/Netlify connected
- [ ] Environment variables set
- [ ] Build successful
- [ ] Site accessible
- [ ] SSL certificate active (automatic)

### Mobile Deployment

- [ ] App icons created (1024x1024)
- [ ] Splash screens created
- [ ] App Store/Play Store accounts ready
- [ ] App descriptions written
- [ ] Screenshots prepared (multiple sizes)
- [ ] Privacy policy URL ready
- [ ] EAS build successful
- [ ] App submitted for review

---

## 📊 Post-Deployment

### Monitoring

1. **Supabase Dashboard:**
   - Monitor database usage
   - Check API calls
   - Review auth logs

2. **Vercel/Netlify Analytics:**
   - Page views
   - Response times
   - Error rates

3. **App Store Connect / Play Console:**
   - Downloads
   - Crashes
   - Reviews

### Updates

**Web Updates:**
- Push to GitHub → Auto-deploy ✅

**Mobile Updates:**
1. Update version in `app.json`
2. Run `eas build` again
3. Submit new version
4. Wait for approval (1-3 days iOS, 1-2 days Android)

---

## 💡 Best Practices

### Security

1. **Never commit `.env` files:**
   ```bash
   # Already in .gitignore
   .env
   .env.local
   ```

2. **Use environment variables** for all secrets

3. **Enable RLS** on all Supabase tables (already done ✅)

4. **Regular backups** of Supabase database

### Performance

1. **Enable caching** in Vercel/Netlify
2. **Optimize images** before deployment
3. **Use CDN** for assets (automatic with Vercel/Netlify)
4. **Monitor bundle size:**
   ```bash
   npx expo export:web --dump-assetmap
   ```

### Maintenance

1. **Update dependencies** regularly:
   ```bash
   npm outdated
   npm update
   ```

2. **Test before deploying:**
   ```bash
   npm run web  # Test locally first
   ```

3. **Monitor error logs** in production

---

## 🆘 Troubleshooting

### Build Fails

**Web:**
- Check build logs in Vercel/Netlify
- Verify all dependencies installed
- Test `npx expo export:web` locally

**Mobile:**
- Check EAS build logs
- Verify `eas.json` configuration
- Ensure app.json has correct bundle IDs

### Environment Variables Not Working

- Restart build after adding variables
- Variables must start with `EXPO_PUBLIC_`
- Clear cache and rebuild

### App Rejected from Stores

**iOS:**
- Review Apple's guidelines
- Add missing privacy descriptions
- Ensure app has real functionality (not just test data)

**Android:**
- Review Google Play policies
- Add required permissions
- Test on multiple devices

---

## 📞 Support

- **Expo docs:** [docs.expo.dev](https://docs.expo.dev)
- **Supabase docs:** [supabase.com/docs](https://supabase.com/docs)
- **Vercel docs:** [vercel.com/docs](https://vercel.com/docs)

---

## 🎯 Quick Deploy Commands

**Web (Vercel):**
```bash
npm install -g vercel
vercel
```

**Mobile (EAS):**
```bash
eas build --platform all --profile production
eas submit --platform all
```

**All at once:**
```bash
# Build and deploy everything
npm run build:all
```

---

Good luck with your deployment! 🚀
