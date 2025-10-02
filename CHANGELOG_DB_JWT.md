# Changelog: SQLite Database + JWT Authentication

## 📅 Date: 2025-10-02

---

## 🎯 Summary

Migrated from JSON file storage to SQLite database with JWT authentication for improved security and data persistence.

---

## ✨ New Features

### 1. **SQLite Database**
- Persistent storage with ACID guarantees
- 4 tables: `users`, `activity_logs`, `usage_limits`, `global_credits`
- Automatic schema creation on first run
- WAL mode for better concurrent performance

### 2. **JWT Authentication**
- Token-based authentication (7-day expiry)
- Secure password hashing with bcryptjs
- Automatic token refresh on app load
- Protected API endpoints

### 3. **Activity Logging**
- Every image generation is logged
- Tracks: user, category, AI model, credits used, timestamp
- Admin dashboard can view all logs
- Users can view their own logs

### 4. **Enhanced Security**
- Passwords hashed with bcrypt (10 rounds)
- JWT tokens instead of session storage
- Middleware for admin-only routes
- Token verification on protected endpoints

---

## 📦 New Dependencies

```json
{
  "dependencies": {
    "better-sqlite3": "^12.4.1",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^3.0.2"
  },
  "devDependencies": {
    "@types/jsonwebtoken": "^9.0.10",
    "@types/bcryptjs": "^3.0.0",
    "concurrently": "^9.2.1"
  }
}
```

---

## 🗂️ New Files

### Backend
- `server/database/schema.sql` - Database schema
- `server/database/db.js` - Database service layer
- `server/middleware/auth.js` - JWT middleware
- `server/migrate-old-data.js` - Migration script (optional)
- `server/DATABASE.md` - Full documentation

### Configuration
- `.env.example` - Environment variables template
- `QUICK_START.md` - Quick start guide
- `CHANGELOG_DB_JWT.md` - This file

---

## 🔧 Modified Files

### Backend
- `server/index.js` - Complete rewrite with:
  - SQLite queries instead of JSON file I/O
  - JWT authentication middleware
  - Activity logging on all actions
  - Admin-only endpoints

### Frontend
- `types/auth.ts` - Added `id` field and `LoginResponse` type
- `services/authService.ts` - JWT token management
- `services/apiClient.ts` - Auto-attach JWT to requests
- `services/usageService.ts` - Added metadata logging
- `contexts/AuthContext.tsx` - Token verification on mount

### Configuration
- `package.json` - New scripts and dependencies
- `vite.config.ts` - Proxy for `/api` routes
- `.gitignore` - Ignore database files

---

## 🚀 API Changes

### New Endpoints
```
GET  /api/auth/me              - Verify JWT token
GET  /api/activity/logs        - Get all activity logs (admin)
GET  /api/activity/user/:id    - Get user's activity logs
GET  /api/health               - Health check
```

### Modified Endpoints
```
POST /api/login                - Now returns JWT token
GET  /api/usage                - Requires authentication
POST /api/usage/increment      - Requires auth, logs activity
POST /api/usage/limits         - Requires admin role
POST /api/usage/reset          - Requires admin role
```

---

## 📊 Database Schema

```sql
users
├── id (INTEGER PRIMARY KEY)
├── username (TEXT UNIQUE)
├── password_hash (TEXT)
├── role (TEXT)
└── created_at, updated_at

activity_logs
├── id (INTEGER PRIMARY KEY)
├── user_id (INTEGER FK → users)
├── category_id (TEXT)
├── action (TEXT)
├── ai_model (TEXT)
├── credits_used (INTEGER)
├── metadata (JSON TEXT)
└── created_at

usage_limits
├── id (INTEGER PRIMARY KEY)
├── date (TEXT)
├── user_id (INTEGER NULL)
├── category_id (TEXT)
├── daily_limit (INTEGER)
├── used (INTEGER)
└── created_at, updated_at

global_credits
├── id (INTEGER PRIMARY KEY)
├── date (TEXT UNIQUE)
├── daily_limit (INTEGER)
├── used (INTEGER)
└── created_at, updated_at
```

---

## 🔐 Security Improvements

### Before
- ❌ Passwords stored in plain text
- ❌ No session persistence
- ❌ No activity logging
- ❌ File-based storage (race conditions)

### After
- ✅ bcrypt password hashing
- ✅ JWT with 7-day expiry
- ✅ Complete activity audit trail
- ✅ ACID-compliant database
- ✅ Admin-only routes protected

---

## 🎮 Usage

### Development
```bash
npm run dev
# Starts both API (4000) and Vite (5173)
```

### Login
- Username: `admin` or `user`
- Password: `admin123` or `user123`

### Environment Variables
```env
JWT_SECRET=your-secret-key-change-in-production
API_PORT=4000
```

---

## 🔄 Migration Guide

### For Existing Installations

1. **Backup your data**
   ```bash
   cp server/data/users.json server/data/users.json.backup
   ```

2. **Pull latest changes**
   ```bash
   git pull origin main
   ```

3. **Install new dependencies**
   ```bash
   npm install
   ```

4. **Migrate old users** (optional)
   ```bash
   node server/migrate-old-data.js
   ```

5. **Start the server**
   ```bash
   npm run dev
   ```

6. **Test login**
   - Try logging in with old credentials
   - If migration worked, they should be auto-hashed

---

## 📝 Breaking Changes

### For Developers

1. **API Authentication**
   - All `/api/usage/*` endpoints now require `Authorization: Bearer <token>` header
   - Login endpoint returns `{ token, user }` instead of just `{ username, role }`

2. **Frontend Auth Flow**
   - `localStorage` key changed from `vcl_auth_user` to `vcl_auth_token`
   - User data fetched from `/api/auth/me` instead of stored locally

3. **Admin Actions**
   - `/api/usage/limits` and `/api/usage/reset` now require admin role
   - Returns 403 Forbidden for non-admin users

---

## 🐛 Known Issues

None at this time.

---

## 🎯 Future Improvements

- [ ] Email verification for new users
- [ ] Password reset functionality
- [ ] Rate limiting on login endpoint
- [ ] Session revocation (blacklist tokens)
- [ ] Database backups automation
- [ ] Migration to PostgreSQL for production
- [ ] 2FA support

---

## 👥 Contributors

- VCL Technology Team

---

## 📄 License

Same as main project
