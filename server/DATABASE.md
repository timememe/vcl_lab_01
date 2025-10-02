# Database Documentation

## SQLite Database Setup

This project uses SQLite for data persistence with JWT authentication.

### Database Schema

#### Tables

1. **users** - User accounts
   - `id` - Primary key
   - `username` - Unique username
   - `password_hash` - bcrypt hashed password
   - `role` - 'admin' or 'user'
   - `created_at`, `updated_at` - Timestamps

2. **activity_logs** - User activity tracking
   - `id` - Primary key
   - `user_id` - Foreign key to users
   - `category_id` - Generation category
   - `action` - Action type (e.g., 'generate')
   - `ai_model` - AI model used (gemini/openai)
   - `credits_used` - Credits consumed
   - `metadata` - JSON metadata
   - `created_at` - Timestamp

3. **usage_limits** - Daily category limits
   - `id` - Primary key
   - `date` - YYYY-MM-DD
   - `user_id` - User (nullable for global limits)
   - `category_id` - Category identifier
   - `daily_limit` - Maximum allowed
   - `used` - Current usage
   - `created_at`, `updated_at` - Timestamps

4. **global_credits** - Global daily limits
   - `id` - Primary key
   - `date` - YYYY-MM-DD (unique)
   - `daily_limit` - Global limit (0 = unlimited)
   - `used` - Current usage
   - `created_at`, `updated_at` - Timestamps

### Default Users

On first run, the database is seeded with:

- **admin** / admin123 (role: admin)
- **user** / user123 (role: user)

**⚠️ SECURITY**: Change these passwords in production!

### Environment Variables

Create a `.env` file in the project root:

```env
JWT_SECRET=your-secret-key-change-in-production
API_PORT=4000
```

### Development

Run both API and frontend:
```bash
npm run dev
```

Run API only:
```bash
npm run server
```

### API Endpoints

#### Authentication
- `POST /api/login` - Login (returns JWT token)
- `GET /api/auth/me` - Verify token and get user info

#### Usage Tracking (requires authentication)
- `GET /api/usage` - Get current usage stats
- `POST /api/usage/increment` - Increment usage (logs activity)
- `POST /api/usage/limits` - Update limits (admin only)
- `POST /api/usage/reset` - Reset daily usage (admin only)

#### Activity Logs (requires authentication)
- `GET /api/activity/logs?limit=100` - Get all logs (admin only)
- `GET /api/activity/user/:userId?limit=50` - Get user's logs

### Database Location

- **Development**: `server/database/app.db`
- **Production**: Same location (ensure persistence on host)

### Backup

To backup the database:
```bash
cp server/database/app.db server/database/app.db.backup
```

### Reset Database

To reset all data:
```bash
rm server/database/app.db*
npm run server
# Database will be recreated with default users
```
