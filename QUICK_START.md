# Quick Start Guide

## 🚀 Local Development

### 1. Install dependencies
```bash
npm install
```

### 2. Start development environment
```bash
npm run dev
```

This will start:
- **API Server** on http://localhost:4000
- **Vite Dev Server** on http://localhost:5173

### 3. Login
Open http://localhost:5173 in your browser

**Default credentials:**
- Username: `admin` or `user`
- Password: `admin123` or `user123`

---

## 🔧 Separate Commands

If you need to run servers separately:

```bash
# API Server only
npm run server

# Frontend only (requires API running on port 4000)
npm run dev:vite
```

---

## 📊 Database

- **Location:** `server/database/app.db`
- **Type:** SQLite
- **Auto-created** on first run with default users

### View Activity Logs

Login as admin and check activity logs through admin dashboard or via API:
```bash
curl http://localhost:4000/api/activity/logs \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔑 Environment Variables

Create `.env` file (optional, has defaults):

```env
JWT_SECRET=your-secret-key-change-in-production
API_PORT=4000
```

---

## 🏗️ Production Build

```bash
npm run build
npm run preview
```

---

## 📝 API Documentation

See [server/DATABASE.md](server/DATABASE.md) for:
- Database schema
- API endpoints
- Authentication flow
- Usage tracking

---

## 🐛 Troubleshooting

### "Cannot connect to API"
- Check if API server is running on port 4000
- Run `npm run server` in separate terminal

### "Authentication failed"
- Check that database exists at `server/database/app.db`
- Try default credentials: admin/admin123

### Reset database
```bash
rm server/database/app.db*
npm run server
# Database recreated with default users
```

---

## 🔐 Security Notes

**⚠️ IMPORTANT for Production:**

1. Change default passwords
2. Set secure `JWT_SECRET` environment variable
3. Use HTTPS
4. Don't commit `.db` files to git
5. Set up proper backup strategy
