# 🚀 START HERE

## Quick Commands

### Start Development (Both Servers)
```bash
npm run dev
```

This starts:
- **API Server** on http://localhost:4000
- **Frontend** on http://localhost:5173

### Login
Open http://localhost:5173

**Default credentials:**
- `admin` / `admin123`
- `user` / `user123`

---

## 📚 Documentation Index

1. **[QUICK_START.md](QUICK_START.md)** - Full quick start guide
2. **[server/DATABASE.md](server/DATABASE.md)** - Database & API documentation
3. **[CHANGELOG_DB_JWT.md](CHANGELOG_DB_JWT.md)** - Detailed changelog
4. **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - Implementation details
5. **[README.md](README.md)** - Project overview

---

## 🆕 What Changed (Latest Update)

✅ Migrated from JSON files to **SQLite database**
✅ Implemented **JWT authentication** (Bearer tokens)
✅ Added **password hashing** with bcrypt
✅ Added **activity logging** for all user actions
✅ Protected admin routes with middleware

---

## 🗄️ Database

- **Location**: `server/database/app.db`
- **Type**: SQLite (auto-created on first run)
- **Tables**: users, activity_logs, usage_limits, global_credits

### Default Users
| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | admin |
| user | user123 | user |

⚠️ **Change these in production!**

---

## 🔑 Environment Variables

Create `.env` file (optional, has defaults):

```env
JWT_SECRET=your-secret-key-change-in-production
API_PORT=4000
```

---

## 🧪 Testing

Test all API endpoints:
```bash
# Start API server first
npm run server

# In another terminal
bash test-api.sh
```

Manual test:
```bash
curl -X POST http://localhost:4000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

---

## 📊 Project Stats

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Express + SQLite + JWT
- **Build time**: ~3.8s
- **Bundle size**: 710 KB
- **Database size**: ~4 KB (empty)
- **Lines of code**: ~15,000+

---

## 🛠️ Troubleshooting

### Can't connect to API
```bash
# Make sure API is running
npm run server

# Check if port 4000 is available
netstat -an | findstr 4000
```

### Authentication fails
```bash
# Reset database
rm server/database/app.db*
npm run server
# Database recreated with default users
```

### See all logs
```bash
# Login first to get token
TOKEN="your_jwt_token_here"

curl http://localhost:4000/api/activity/logs \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📁 Project Structure

```
vcl_lab_01/
├── server/
│   ├── database/
│   │   ├── schema.sql     # Database schema
│   │   ├── db.js          # Service layer
│   │   └── app.db         # SQLite database
│   ├── middleware/
│   │   └── auth.js        # JWT middleware
│   └── index.js           # API server
├── services/
│   ├── authService.ts     # Auth + JWT
│   ├── apiClient.ts       # HTTP client
│   └── usageService.ts    # Usage tracking
├── components/            # React components
├── pages/                 # App pages
└── types/                 # TypeScript types
```

---

## ✅ Features

- [x] AI Image Generation (7 categories)
- [x] Multi-language support (RU/EN/KK)
- [x] User authentication with JWT
- [x] Admin dashboard
- [x] Usage limits and tracking
- [x] Activity logging
- [x] Collage creator
- [x] Product photography
- [x] Model reskin
- [x] Concept art
- [x] Storyboard generator

---

## 🔗 Quick Links

- **Frontend Dev**: http://localhost:5173
- **API Docs**: http://localhost:4000/api/health
- **Activity Logs**: Admin dashboard → Activity Logs

---

## 🎯 Next Steps

1. Start development: `npm run dev`
2. Login with `admin` / `admin123`
3. Test image generation
4. Check activity logs in admin dashboard

---

**Need help?** Check the documentation files above or contact VCL Technology team.

---

**Status**: ✅ Ready for development
