# 🚀 HALTT Deployment Guide - Vercel

This guide will help you deploy your HALTT application to Vercel with serverless functions.

## 📋 Prerequisites

- GitHub account
- Vercel account (sign up at https://vercel.com)
- Firebase project configured
- ChainAbuse API key

---

## 🔧 Step 1: Prepare Your Code

### 1.1 Update API Endpoints in Frontend

Update all API calls from `http://localhost:3001` to `/api`:

**Files to update:**
- `src/services/fraudDetectionService.js`

Change:
```javascript
const proxyUrl = 'http://localhost:3001/api/check-address';
```

To:
```javascript
const proxyUrl = '/api/check-address';
```

### 1.2 Environment Variables

The following environment variables are already configured:
- Firebase config (in `src/firebase.js`)
- ChainAbuse API key (will be set in Vercel)

---

## 📦 Step 2: Push to GitHub

1. **Initialize Git (if not already done):**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Create GitHub Repository:**
   - Go to https://github.com/new
   - Create a new repository (e.g., `haltt-wallet`)
   - Don't initialize with README (you already have one)

3. **Push to GitHub:**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/haltt-wallet.git
   git branch -M main
   git push -u origin main
   ```

---

## 🌐 Step 3: Deploy to Vercel

### 3.1 Connect Repository

1. Go to https://vercel.com/dashboard
2. Click **"Add New Project"**
3. Click **"Import Git Repository"**
4. Select your GitHub repository
5. Click **"Import"**

### 3.2 Configure Project

**Framework Preset:** Create React App

**Build Settings:**
- Build Command: `npm run build`
- Output Directory: `build`
- Install Command: `npm install`

**Root Directory:** `./` (leave as default)

### 3.3 Add Environment Variables

Click **"Environment Variables"** and add:

| Name | Value | Notes |
|------|-------|-------|
| `CHAINABUSE_API_KEY` | `your_api_key_here` | Your ChainAbuse API key |
| `NODE_VERSION` | `18.x` | Specify Node version |

**Important:** Do NOT add Firebase config as environment variables since they're already in your code.

### 3.4 Deploy

1. Click **"Deploy"**
2. Wait for deployment to complete (2-3 minutes)
3. You'll get a URL like: `https://haltt-wallet.vercel.app`

---

## ✅ Step 4: Verify Deployment

### 4.1 Test Frontend
1. Visit your Vercel URL
2. Try logging in with Google
3. Connect a wallet
4. Check if dashboard loads

### 4.2 Test Serverless Functions
1. Try sending a transaction
2. Check browser console for API errors
3. Verify fraud detection works

### 4.3 Common Issues

**Issue 1: API calls fail**
- Check if you updated API endpoints from `localhost:3001` to `/api`
- Verify environment variables are set in Vercel

**Issue 2: Firebase errors**
- Add your Vercel domain to Firebase authorized domains:
  - Go to Firebase Console → Authentication → Settings
  - Add `your-app.vercel.app` to authorized domains

**Issue 3: Serverless function timeout**
- Increase timeout in `vercel.json` (max 10s on free plan)

---

## 🔄 Step 5: Update Deployment

### For Code Changes:
```bash
git add .
git commit -m "Your commit message"
git push
```

Vercel will automatically redeploy!

### For Environment Variables:
1. Go to Vercel Dashboard → Your Project → Settings
2. Click "Environment Variables"
3. Update or add new variables
4. Redeploy from Deployments tab

---

## 📊 Step 6: Monitor Your App

### Vercel Dashboard
- **Analytics:** View page views and performance
- **Logs:** Check serverless function logs
- **Deployments:** View deployment history

### Access Logs:
1. Go to your project in Vercel
2. Click "Deployments"
3. Click on a deployment
4. Click "Functions" to see serverless function logs

---

## 🔒 Security Checklist

- ✅ Firebase authorized domains updated
- ✅ Environment variables set in Vercel (not in code)
- ✅ API keys not exposed in frontend code
- ✅ Firestore security rules deployed
- ✅ CORS properly configured

---

## 🎯 Architecture Overview

```
User Browser
     ↓
Vercel (Frontend - React App)
     ↓
Vercel Serverless Functions (/api/*)
     ↓
External APIs (ChainAbuse, Firebase)
```

**What's deployed where:**
- **Frontend (React):** Vercel static hosting
- **Backend (Proxy):** Vercel serverless functions (`/api` folder)
- **Database:** Firebase Firestore (cloud)
- **Authentication:** Firebase Auth (cloud)

---

## 💡 Pro Tips

### 1. Custom Domain
- Go to Project Settings → Domains
- Add your custom domain
- Update DNS records as instructed

### 2. Preview Deployments
- Every push to a branch creates a preview deployment
- Test changes before merging to main

### 3. Environment-Specific Variables
- Production: Set in "Production" tab
- Preview: Set in "Preview" tab
- Development: Use `.env.local` file locally

### 4. Optimize Build
Add to `package.json`:
```json
{
  "scripts": {
    "build": "GENERATE_SOURCEMAP=false react-scripts build"
  }
}
```

This reduces build size by removing source maps.

---

## 🆘 Troubleshooting

### Build Fails

**Error:** "Module not found"
```bash
# Solution: Ensure all dependencies are in package.json
npm install --save missing-package
git add package.json package-lock.json
git commit -m "Add missing dependency"
git push
```

**Error:** "Build exceeded maximum duration"
```bash
# Solution: Optimize your build
# Remove unused dependencies
# Use production build settings
```

### Runtime Errors

**Error:** "Failed to fetch"
- Check if API endpoints are correct (`/api/...`)
- Verify CORS settings in serverless functions
- Check Vercel function logs

**Error:** "Firebase: Error (auth/unauthorized-domain)"
- Add Vercel domain to Firebase authorized domains

---

## 📱 Testing Locally with Vercel CLI

Install Vercel CLI:
```bash
npm install -g vercel
```

Run locally:
```bash
vercel dev
```

This simulates the Vercel environment locally!

---

## 🔗 Useful Links

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Vercel Docs:** https://vercel.com/docs
- **Serverless Functions:** https://vercel.com/docs/functions
- **Firebase Console:** https://console.firebase.google.com

---

## ✨ Your Deployment URLs

After deployment, you'll have:
- **Production:** `https://your-app.vercel.app`
- **API Endpoint:** `https://your-app.vercel.app/api/check-address`
- **Preview:** `https://your-app-git-branch.vercel.app` (for each branch)

---

## 🎉 Success!

Your HALTT application is now live on Vercel! 

**Next Steps:**
1. Share your app URL
2. Monitor usage in Vercel dashboard
3. Set up custom domain (optional)
4. Enable analytics (optional)

---

**Need Help?**
- Check Vercel logs for errors
- Review Firebase console for auth issues
- Test API endpoints individually

**Last Updated:** October 2025
