# 🚀 Deployment Guide for 4 in a Row Game

This guide will help you deploy your game to the internet for free!

## 📋 Prerequisites

1. **GitHub Account** (you already have this ✅)
2. **MongoDB Atlas Account** (free) - for database
3. **Render Account** (free) - for backend
4. **Vercel Account** (free) - for frontend

---

## Step 1: Set Up MongoDB Atlas (Database)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Sign up for a free account
3. Create a new cluster (choose FREE tier)
4. Wait for cluster to be created (~5 minutes)
5. Click **"Connect"** button
6. Choose **"Connect your application"**
7. Copy the connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/`)
8. Replace `<password>` with your database password
9. Add database name at the end: `/4inarow`
10. **Save this connection string** - you'll need it later!

**Example:** `mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/4inarow?retryWrites=true&w=majority`

---

## Step 2: Deploy Backend to Render

1. Go to [Render.com](https://render.com)
2. Sign up with GitHub (click "Sign up with GitHub")
3. Click **"New +"** → **"Web Service"**
4. Connect your GitHub repository: `sakshee44566/4-IN-A-ROW`
5. Configure the service:
   - **Name:** `4-in-a-row-backend` (or any name you like)
   - **Region:** Choose closest to you
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
6. Click **"Advanced"** and add Environment Variables:
   - `NODE_ENV` = `production`
   - `PORT` = `10000` (Render uses this port)
   - `MONGODB_URI` = (paste your MongoDB connection string from Step 1)
   - `JWT_SECRET` = (generate a random string, e.g., use [this generator](https://randomkeygen.com/))
7. Click **"Create Web Service"**
8. Wait for deployment (~5-10 minutes)
9. **Copy your backend URL** (looks like: `https://4-in-a-row-backend.onrender.com`)

⚠️ **Important:** Render free tier spins down after 15 minutes of inactivity. First request after spin-down takes ~30 seconds.

---

## Step 3: Deploy Frontend to Vercel

1. Go to [Vercel.com](https://vercel.com)
2. Sign up with GitHub (click "Continue with GitHub")
3. Click **"Add New"** → **"Project"**
4. Import your repository: `sakshee44566/4-IN-A-ROW`
5. Configure the project:
   - **Framework Preset:** Create React App
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`
6. Add Environment Variables:
   - `REACT_APP_API_URL` = (your Render backend URL from Step 2, e.g., `https://4-in-a-row-backend.onrender.com`)
   - `REACT_APP_SOCKET_URL` = (same as above, e.g., `https://4-in-a-row-backend.onrender.com`)
7. Click **"Deploy"**
8. Wait for deployment (~2-3 minutes)
9. **Copy your frontend URL** (looks like: `https://4-in-a-row.vercel.app`)

---

## Step 4: Update Backend CORS Settings

After getting your frontend URL, you need to update the backend to allow requests from your frontend:

1. Go back to Render dashboard
2. Click on your backend service
3. Go to **"Environment"** tab
4. Add new environment variable:
   - `FRONTEND_URL` = (your Vercel frontend URL, e.g., `https://4-in-a-row.vercel.app`)
5. Click **"Save Changes"** (this will trigger a redeploy)

✅ **The backend code is already updated to use this environment variable!**

---

## Step 5: Test Your Deployment

1. Open your frontend URL in a browser
2. Try to register/login
3. Play a game!

---

## 🔧 Troubleshooting

### Backend not connecting?
- Check Render logs: Go to your service → "Logs" tab
- Verify MongoDB connection string is correct
- Make sure environment variables are set correctly

### Frontend can't connect to backend?
- Check that `REACT_APP_API_URL` and `REACT_APP_SOCKET_URL` in Vercel match your Render backend URL
- Make sure backend CORS allows your frontend URL

### Socket.io connection issues?
- Render free tier supports WebSockets, but first connection might be slow
- Check browser console for errors

---

## 📝 Quick Reference

- **Backend URL:** `https://your-backend.onrender.com`
- **Frontend URL:** `https://your-frontend.vercel.app`
- **MongoDB:** Your Atlas connection string

---

## 🎉 You're Done!

Your game is now live on the internet! Share the frontend URL with friends to play together!

