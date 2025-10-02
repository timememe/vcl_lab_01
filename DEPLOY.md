# Deployment Guide for Render

## 🚀 Quick Deploy

### Using Render Dashboard

1. **Push code to GitHub**
   ```bash
   git add .
   git commit -m "Add SQLite + JWT authentication"
   git push origin main
   ```

2. **Create New Web Service on Render**
   - Go to https://dashboard.render.com
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select `vcl_lab_01` repo

3. **Configure Service**

   **⚠️ IMPORTANT:** Use these exact commands:

   **Build Command:**
   ```bash
   npm install && npm run build
   ```

   **Start Command:** (NOT `npm run dev`!)
   ```bash
   npm start
   ```

   **Environment Variables:**
   - `NODE_ENV` = `production`
   - `JWT_SECRET` = (click "Generate" for random secret)
   - `GEMINI_API_KEY` = Your Gemini API key (optional)
   - `OPENAI_API_KEY` = Your OpenAI API key (optional)

4. **Deploy**
   - Click "Create Web Service"
   - Wait for build and deployment (~5 minutes)

---

## ⚙️ Using render.yaml (Recommended)

The project includes `render.yaml` for automatic configuration.

1. **Push to GitHub** (as above)

2. **Create Blueprint**
   - Go to https://dashboard.render.com
   - Click "New +" → "Blueprint"
   - Select your repository
   - Render will auto-detect `render.yaml`
   - Click "Apply"

3. **Set Environment Variables**
   - `JWT_SECRET` will be auto-generated
   - Add `GEMINI_API_KEY` and `OPENAI_API_KEY` if needed

---

## 🔐 Post-Deployment Security

### 1. Change Default Passwords

**Option A: Via Admin Dashboard**
1. Login to https://your-app.onrender.com
2. Use `admin` / `admin123`
3. Go to Admin Dashboard
4. Change passwords (feature to be added)

**Option B: Via Database** (if you have access)
```javascript
// Generate new password hash
const bcrypt = require('bcryptjs');
const newHash = bcrypt.hashSync('your-new-password', 10);
console.log(newHash);

// Then update in database
// UPDATE users SET password_hash = '<hash>' WHERE username = 'admin';
```

### 2. Verify JWT_SECRET

- Check Render dashboard → Environment Variables
- Ensure `JWT_SECRET` is set and is a long random string

### 3. Monitor Logs

```bash
# View real-time logs
render logs -f <service-name>
```

---

## 📊 Database Persistence

⚠️ **Important:** Render's free tier has **ephemeral storage**. Your SQLite database will be **reset** on:
- Service restart
- Re-deployment
- Daily spin-down (free tier)

### Solutions:

**Option 1: Upgrade to Paid Tier**
- Persistent disk available on paid plans
- ~$7/month for 10 GB SSD

**Option 2: Use PostgreSQL** (Recommended for Production)
- Render offers free PostgreSQL database
- Requires migration from SQLite
- Data persists across restarts

**Option 3: External Database**
- Use Railway, Supabase, or PlanetScale
- Configure connection in environment variables

---

## 🐛 Troubleshooting

### Port Conflict Error (EADDRINUSE)

**Error:** `Error: listen EADDRINUSE: address already in use :::10000`

**Cause:** Start command is `npm run dev` instead of `npm start`

**Solution:**
1. Go to Render Dashboard → Your Service
2. Settings → Build & Deploy
3. Change **Start Command** from `npm run dev` to `npm start`
4. Save and redeploy

**Why:** `npm run dev` runs both Vite and API on same port. `npm start` runs single production server.

---

### Build Fails

**Error:** `npm install` fails
```bash
# Check Node version in render.yaml
NODE_VERSION: 20.9.0
```

**Error:** `vite build` fails
```bash
# Check if all dependencies are in package.json
npm install
npm run build
```

### 500 Internal Server Error

**Cause:** Database not initialized

**Solution:**
1. Check logs: `render logs <service-name>`
2. Verify `server/database/` directory exists
3. Database auto-creates on first run

**Cause:** Missing JWT_SECRET

**Solution:**
1. Go to Render dashboard
2. Environment Variables → Add `JWT_SECRET`
3. Generate random value or use: `openssl rand -base64 32`
4. Redeploy

### Cannot login

**Cause:** Database reset (ephemeral storage)

**Solution:**
1. Database recreated with default users on restart
2. Use `admin` / `admin123` or `user` / `user123`

### Static files not loading

**Cause:** `dist/` folder not found

**Solution:**
1. Ensure `npm run build` completes successfully
2. Check build logs for errors
3. Verify `dist/` folder exists after build

### MIME type errors (text/html instead of JavaScript)

**Error:** `Failed to load module script: Expected a JavaScript module but the server responded with a MIME type of "text/html"`

**Cause:** Server fallback returning HTML for all routes (old bug, now fixed)

**Solution:**
1. Pull latest code with fixed `server/index.js`
2. Redeploy on Render
3. Verify static files have correct MIME types:
   - JS files: `application/javascript`
   - CSS files: `text/css`
   - HTML files: `text/html`

---

## 🔄 CI/CD

### Automatic Deploys

Render auto-deploys on every push to `main` branch by default.

**To disable:**
- Go to Service Settings → Auto-Deploy
- Turn off "Auto-Deploy"

**To deploy manually:**
- Go to Service → Manual Deploy
- Click "Deploy latest commit"

### Health Checks

Render uses `/api/health` for health checks:

```bash
# Test locally
curl http://localhost:5000/api/health

# Test on Render
curl https://your-app.onrender.com/api/health
```

**Expected response:**
```json
{"status":"ok","timestamp":"2025-10-02T08:00:00.000Z"}
```

---

## 📈 Scaling

### Free Tier Limitations

- Spins down after 15 minutes of inactivity
- First request after spin-down takes ~30-60 seconds
- 750 hours/month free compute time

### Upgrade Options

**Starter Plan ($7/month):**
- No spin-down
- Persistent disk
- Priority support

**Standard Plan ($25/month):**
- Faster build times
- More memory/CPU
- Horizontal scaling

---

## 🔗 Useful Commands

```bash
# View logs
render logs -f vcl-lab-01

# Restart service
render restart vcl-lab-01

# SSH into service (paid plans only)
render ssh vcl-lab-01

# Check service status
render services
```

---

## 📝 Checklist

Before deploying:
- [ ] Code pushed to GitHub
- [ ] `render.yaml` exists in root
- [ ] `npm run build` works locally
- [ ] All environment variables documented
- [ ] Default passwords changed (post-deploy)
- [ ] Health check endpoint tested
- [ ] Database persistence plan decided

After deploying:
- [ ] Service starts without errors
- [ ] Can access frontend
- [ ] Can login with default credentials
- [ ] API endpoints respond correctly
- [ ] Activity logs working
- [ ] Admin dashboard accessible

---

## 🆘 Support

For issues:
1. Check logs on Render dashboard
2. Review troubleshooting section above
3. Test production build locally: `npm run build && npm start`
4. Contact VCL Technology team

---

**Deployment Status:** ✅ Ready for Production
**Last Updated:** 2025-10-02
