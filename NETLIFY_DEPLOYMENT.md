# ZenMix Netlify Deployment Guide

This guide explains how to deploy the ZenMix Expo app to Netlify.

## Prerequisites

- Node.js and npm installed
- Git repository set up
- Netlify account

## Option 1: Manual Deployment (Recommended)

This approach builds the app locally and deploys directly to Netlify.

### Step 1: Install Netlify CLI

```bash
npm install -g netlify-cli
```

### Step 2: Build the App

```bash
npm run build:web
```

This will create a `dist` directory with the static files.

### Step 3: Deploy to Netlify

```bash
netlify deploy --prod --dir=dist
```

If this is your first time, you'll be prompted to:
1. Link to an existing site or create a new one
2. Choose to connect via Git remote origin

### Step 4: Access Your Site

After deployment completes, you'll receive a URL like:
```
Website URL: https://zenmix-expo-master.netlify.app
```

## Option 2: Continuous Deployment via GitHub

This approach automatically deploys when you push to GitHub.

### Step 1: Push Your Code to GitHub

```bash
git add .
git commit -m "Your commit message"
git push
```

### Step 2: Set Up Netlify Site

1. Go to [Netlify](https://app.netlify.com/)
2. Click "Add new site" > "Import an existing project"
3. Select GitHub and authorize Netlify
4. Choose your repository

### Step 3: Configure Build Settings

- Build command: `npm run build:web`
- Publish directory: `dist`

### Step 4: Add Environment Variables

If your app uses environment variables (like Supabase credentials):
1. Go to Site settings > Environment variables
2. Add variables from your `.env` file:
   - EXPO_PUBLIC_SUPABASE_URL
   - EXPO_PUBLIC_SUPABASE_ANON_KEY

### Step 5: Deploy

Click "Deploy site" and wait for the build to complete.

## Troubleshooting

- **Build Errors**: Check Netlify logs for specific error messages
- **Missing Dependencies**: Ensure all dependencies are in package.json
- **Environment Variables**: Verify they're correctly set in Netlify
- **Path Issues**: Make sure the publish directory is correct (dist)

## Updating Your Site

For manual deployments, repeat steps 2-3 from Option 1.

For continuous deployments, simply push changes to GitHub:
```bash
git add .
git commit -m "Update message"
git push
```
