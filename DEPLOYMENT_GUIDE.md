# 🚀 ExamPortal Deployment Guide (Step-by-Step)

This guide will walk you through deploying your ExamPortal application so that it is live and accessible on the internet. We will use **Render.com** for both the backend and frontend.

---

## 📋 Prerequisites
1. A **GitHub** account.
2. A **Render.com** account (Free tier is fine).
3. All your local changes must be **saved**.

---

## 🛠️ Phase 1: Prepare Your Code (Git)
Before we go to Render, your code must be on GitHub.

1. **Commit your changes**:
   Open a terminal and run:
   ```bash
   git add .
   git commit -m "Final version with Dark Theme and Shuffling"
   ```
2. **Push to GitHub**:
   ```bash
   git push origin main
   ```

---

## 🔌 Phase 2: Deploy the Backend (FastAPI)
The backend is the "brain" that handles the exams and candidates.

1. Log in to [Render.com](https://dashboard.render.com).
2. Click **New +** (top right) and select **Web Service**.
3. Connect your GitHub repository.
4. Use these settings:
   - **Name**: `exam-portal-api`
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. **Environment Variables**: Click the "Advanced" button and add:
   - `SECRET_KEY`: (Any random text like `KiwiSuperSecretKey123`)
   - `GOOGLE_API_KEY`: (Your Gemini API Key from Google AI Studio)
   - `SMTP_EMAIL`: (Your email for sending results)
   - `SMTP_PASSWORD`: (Your App Password)
   
6. Click **Create Web Service**. 
7. **WAIT**: Copy the "Service URL" once it starts deploying (e.g., `https://exam-portal-api.onrender.com`).

---

## 🖥️ Phase 3: Deploy the Frontend (React)
The frontend is the website that users and candidates actually see.

1. Go back to the Render Dashboard.
2. Click **New +** and select **Static Site**.
3. Connect the **same** GitHub repository.
4. Use these settings:
   - **Name**: `exam-portal-app`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
5. **Environment Variables**: IMPORTANT! Add these variables:
   - `VITE_API_URL`: (Paste your Backend URL from Phase 2 here)

6. **Routing (IMPORTANT)**: 
   - In the Render dashboard for your **Frontend** site, go to **Redirects/Rewrites**.
   - Add a rule:
     - **Source**: `/*`
     - **Destination**: `/index.html`
     - **Action**: `Rewrite` (Status 200)

7. Click **Create Static Site**.

---

## ✅ Phase 4: Final Verification
Once both are finished (green balance), follow these steps:

1. Open your **Frontend URL** (e.g., `https://exam-portal-app.onrender.com`).
2. Log in as an Admin.
3. Create a test Exam.
4. Open the Exam link in a New Incognito Window to test the Candidate side.
5. Check if **Dark Mode** works and **Questions are Shuffled**.

---

## ⚠️ CRITICAL WARNING: Data Persistence
Because we are currently using **JSON files** (`exams.json`) to store data:
- **Render's Free Tier** uses "Ephemeral Storage."
- **If you re-deploy or the site restarts, all exams you created will be deleted.**
- This is fine for testing today!
- For a "Permanent" production site, we must connect a **PostgreSQL Database** in the future.

---

## 🛠️ Troubleshooting
- **White Screen on Frontend**: Check the `VITE_API_URL` in your Render environment variables. It must be correct.
- **Backend Error**: Check the Render logs. Ensure your `GOOGLE_API_KEY` is correct.
- **Node Version**: If build fails, add an environment variable `NODE_VERSION` set to `20`.
