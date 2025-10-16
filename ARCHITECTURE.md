# VCL Lab 01 - System Architecture

## 🏛️ Overview

VCL Lab 01 is a full-stack AI-powered image generation platform with a **hybrid dual-database architecture**, combining Supabase PostgreSQL (cloud-persistent) with SQLite (local fallback) for maximum reliability and scalability.

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Auth UI    │  │  Generator   │  │    Admin     │      │
│  │   Context    │  │  Components  │  │  Dashboard   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│           │                │                 │               │
│           └────────────────┴─────────────────┘               │
│                            │                                 │
│                    JWT Token Auth                            │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │
                    HTTP REST API
                             │
┌────────────────────────────┼─────────────────────────────────┐
│                   Backend (Express.js)                        │
│                            │                                  │
│  ┌─────────────────────────┴──────────────────────────────┐  │
│  │             Authentication Middleware                   │  │
│  │         (JWT validation, role-based access)            │  │
│  └─────────────────────────┬──────────────────────────────┘  │
│                            │                                  │
│  ┌─────────────────────────┴──────────────────────────────┐  │
│  │                 Service Layer                           │  │
│  │  ┌───────────────┐  ┌───────────────┐                 │  │
│  │  │ user-service  │  │  AI services  │                 │  │
│  │  │ (Supabase→SQ) │  │  (Gemini/OAI) │                 │  │
│  │  └───────────────┘  └───────────────┘                 │  │
│  └─────────────────────────┬──────────────────────────────┘  │
│                            │                                  │
│  ┌────────────────────┬────┴────┬────────────────────────┐   │
│  │   Database Layer   │         │                        │   │
│  │                    │         │                        │   │
│  │  ┌─────────────────▼───┐  ┌──▼──────────────────┐    │   │
│  │  │   Supabase (PG)    │  │   SQLite (local)   │    │   │
│  │  │  ┌──────────────┐  │  │  ┌──────────────┐  │    │   │
│  │  │  │ Primary Read │  │  │  │   Fallback   │  │    │   │
│  │  │  │  (for users) │  │  │  │  Read/Write  │  │    │   │
│  │  │  └──────────────┘  │  │  └──────────────┘  │    │   │
│  │  │  ┌──────────────┐  │  │  ┌──────────────┐  │    │   │
│  │  │  │ Async Backup │  │  │  │   Primary    │  │    │   │
│  │  │  │  (dual-write)│◄─┼──┼──│    Write     │  │    │   │
│  │  │  └──────────────┘  │  │  └──────────────┘  │    │   │
│  │  └────────────────────┘  └─────────────────────┘    │   │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
         │                                      │
         │                                      │
    ┌────▼─────┐                          ┌────▼─────┐
    │  Google  │                          │  OpenAI  │
    │  Gemini  │                          │   API    │
    │   API    │                          │          │
    └──────────┘                          └──────────┘
```

---

## 🔧 Technology Stack

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 6.2
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Routing**: React Router DOM v7
- **State Management**: React Context API
- **HTTP Client**: Fetch API with custom wrapper
- **i18n**: Custom localization (RU/EN/KK)

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Authentication**: JWT (jsonwebtoken) + bcrypt
- **Primary Database**: Supabase PostgreSQL (@supabase/supabase-js)
- **Fallback Database**: SQLite (better-sqlite3)
- **AI APIs**: Google Gemini, OpenAI (gpt-image-1, Sora)

### Infrastructure
- **Hosting**: Render.com
- **Database**: Supabase (PostgreSQL)
- **Storage**: Local SQLite fallback
- **CDN**: Static assets served by Express

---

## 🗄️ Database Architecture

### Hybrid Dual-Database Design

The system uses **two databases in parallel** for maximum reliability:

#### Primary: Supabase PostgreSQL
- **Purpose**: Cloud-persistent storage, survives Render restarts
- **Strengths**: Scalable, concurrent access, REST API, real-time subscriptions
- **Used for**: User authentication (primary reads), all data writes (async backup)
- **Connection**: @supabase/supabase-js client with service role key

#### Fallback: SQLite
- **Purpose**: Local file-based storage, development-friendly
- **Strengths**: Fast, zero-latency, ACID-compliant, no network dependency
- **Used for**: Fallback reads when Supabase unavailable, primary writes (sync)
- **Connection**: better-sqlite3 with WAL mode

### Data Flow Patterns

#### 1. User Authentication (Supabase-First)
```javascript
// Read flow:
1. Try Supabase query (SELECT * FROM users WHERE username = ?)
   ├─ Success → Return user from Supabase
   └─ Fail/Error → Fallback to SQLite query
      ├─ Success → Return user from SQLite
      └─ Fail → Return null (user not found)

// Write flow (dual-write):
1. Write to SQLite (synchronous, primary)
   └─ Success → Get inserted row
      └─ Async sync to Supabase (non-blocking)
         ├─ Success → Log "✓ User synced to Supabase"
         └─ Fail → Log "⚠️ Supabase sync failed" (non-critical)
```

#### 2. Other Data (SQLite-First, for now)
```javascript
// Brands, Activity Logs, Usage Tracking:
- Read: SQLite only (fast, local)
- Write: SQLite (sync) → Supabase (async backup)
```

### Schema

Both databases maintain **identical schemas**:

#### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT CHECK(role IN ('admin', 'user')) NOT NULL,
  assigned_brands TEXT,  -- JSON array of brand IDs
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Brands Table
```sql
CREATE TABLE brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logo TEXT,
  description TEXT,
  products TEXT NOT NULL,  -- JSON array
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Activity Logs Table
```sql
CREATE TABLE activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  category_id TEXT NOT NULL,
  action TEXT NOT NULL,
  ai_model TEXT,
  credits_used INTEGER DEFAULT 1,
  metadata TEXT,  -- JSON
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### Usage Limits Table
```sql
CREATE TABLE usage_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  user_id INTEGER,  -- NULL = global category limit
  category_id TEXT NOT NULL,
  daily_limit INTEGER DEFAULT 0,
  used INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date, user_id, category_id)
);
```

#### Global Credits Table
```sql
CREATE TABLE global_credits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT UNIQUE NOT NULL,
  daily_limit INTEGER DEFAULT 100,
  used INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔐 Authentication & Authorization

### JWT-Based Authentication

**Flow:**
1. User submits `username` + `password` to `POST /api/login`
2. Server validates credentials:
   - Query Supabase for user (fallback to SQLite)
   - Compare password hash with bcrypt
3. If valid, generate JWT token:
   ```javascript
   jwt.sign(
     { id: user.id, username: user.username, role: user.role },
     JWT_SECRET,
     { expiresIn: '7d' }
   )
   ```
4. Client stores token in localStorage
5. All subsequent requests include `Authorization: Bearer <token>`
6. Server verifies token with `authMiddleware`

### Role-Based Access Control (RBAC)

**Roles:**
- **Admin**: Full access (user management, brand management, usage limits)
- **User**: Limited access (assigned brands only, no admin dashboard)

**Middleware:**
```javascript
authMiddleware      → Verifies JWT token
adminMiddleware     → Checks role === 'admin'
```

**Brand Access Control:**
```javascript
// Users can only access assigned brands
const user = await findUserById(req.user.id);
const assignedBrands = JSON.parse(user.assigned_brands);
if (role !== 'admin' && !assignedBrands.includes(brandId)) {
  return res.status(403).json({ message: 'Access denied' });
}
```

---

## 🎯 Service Layer Architecture

### User Service (`server/database/user-service.js`)

**Purpose**: Unified interface for all user operations with Supabase-first reads

**Key Functions:**
```javascript
// Reads (Supabase → SQLite fallback)
findUserByUsername(username)  // Used by login
findUserById(userId)          // Used by auth/me, brand access
listUsers()                   // Admin dashboard
countAdmins()                 // Prevent last admin deletion

// Writes (SQLite sync + Supabase async)
createUser(username, hash, role, brands)
updateUserCore(username, role, brands, userId)
updateUserPassword(hash, userId)
deleteUser(userId)
```

**Example Implementation:**
```javascript
export async function findUserByUsername(username) {
  // Try Supabase first
  if (isSupabaseAvailable()) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

      if (!error && data) {
        console.log('✓ User loaded from Supabase:', username);
        return formatFromSupabase('users', data);
      }
    } catch (error) {
      console.error('Supabase query error:', error);
    }
  }

  // Fallback to SQLite
  const user = userQueries.findByUsername.get(username);
  if (user) {
    console.log('✓ User loaded from SQLite:', username);
  }
  return user;
}
```

### AI Services

**Gemini Service (`services/geminiService.ts`)**
- Image generation via Google Gemini API
- Supports text-to-image and image-to-image
- Configurable aspect ratios

**OpenAI Service (`services/openaiService.ts`)**
- Image generation via OpenAI GPT-Image-1
- Image editing with mask support
- Sora video generation (admin-only)

**Collage AI Service (`services/collageAiService.ts`)**
- Multi-image collage generation
- Layout presets (2x2 grid, hero shot, comparison, etc.)
- Canvas-based composition

---

## 📡 API Architecture

### Endpoint Categories

#### 1. Authentication
```
POST /api/login           → JWT token generation
GET  /api/auth/me         → Verify token, get user info
```

#### 2. User Management (Admin)
```
GET    /api/admin/users       → List all users
POST   /api/admin/users       → Create new user
PUT    /api/admin/users/:id   → Update user
DELETE /api/admin/users/:id   → Delete user
```

#### 3. Brand Management (Admin)
```
GET    /api/admin/brands           → List all brands
POST   /api/admin/brands           → Create brand
PUT    /api/admin/brands/:id       → Update brand
DELETE /api/admin/brands/:id       → Delete brand
POST   /api/admin/brands/:id/products         → Add product
PUT    /api/admin/brands/:id/products/:pid    → Update product
DELETE /api/admin/brands/:id/products/:pid    → Delete product
```

#### 4. Brand Access (User)
```
GET /api/brands                          → List accessible brands
GET /api/brands/:brandId                 → Get brand details
GET /api/brands/:brandId/products/:pid   → Get product details
```

#### 5. Usage Tracking
```
GET  /api/usage              → Get current usage stats
POST /api/usage/increment    → Log AI generation
POST /api/usage/limits       → Set limits (admin)
POST /api/usage/reset        → Reset daily usage (admin)
```

#### 6. Activity Logs
```
GET /api/activity/logs           → All logs (admin)
GET /api/activity/user/:userId   → User's logs
```

#### 7. AI Generation
```
POST /api/gemini/generate        → Gemini image generation
POST /api/openai/generate        → OpenAI image generation
POST /api/sora/generate          → Sora video generation (admin)
GET  /api/sora/status/:id        → Check video status
GET  /api/sora/download/:id      → Download completed video
```

#### 8. Health Check
```
GET /api/health   → API status
```

---

## 🔄 Data Synchronization

### Migration Script (`server/database/migrate-to-supabase.js`)

**Purpose**: One-time bulk migration from SQLite to Supabase

**Process:**
1. Connect to both databases
2. For each table (users, brands, activity_logs, usage_limits, global_credits):
   - Read all rows from SQLite
   - Upsert into Supabase
   - Report progress
3. Log success/failure summary

**Usage:**
```bash
node server/database/migrate-to-supabase.js
```

### Dual-Write Wrapper

**Function:** `dualWrite(tableName, operation, sqliteQuery, ...params)`

**Behavior:**
1. Execute SQLite write (synchronous, throws on error)
2. Async sync to Supabase (non-blocking)
   - On success: Log "✓ Synced to Supabase"
   - On failure: Log "⚠️ Supabase sync failed" (non-critical)

**Example:**
```javascript
export function createUser(username, hash, role, brands) {
  // 1. Write to SQLite (primary, sync)
  const result = userQueries.create.run(username, hash, role, brands);

  // 2. Get created user
  const user = userQueries.findById.get(result.lastInsertRowid);

  // 3. Sync to Supabase (async, non-blocking)
  if (isSupabaseAvailable() && user) {
    syncToSupabase('users', user).catch(err => {
      console.error('⚠️ Supabase sync failed:', err);
    });
  }

  return user;
}
```

---

## 🎨 Frontend Architecture

### Component Hierarchy

```
App (Router)
├── VclLabApp (Main application)
│   ├── AuthContext.Provider
│   │   ├── LoginScreen (if not authenticated)
│   │   └── Authenticated Routes
│   │       ├── CategorySelector
│   │       ├── CategorySpecificGenerator
│   │       │   ├── ProductPhotoForm
│   │       │   ├── ModelReskinForm
│   │       │   ├── ConceptArtForm
│   │       │   ├── StoryboardForm
│   │       │   ├── AngleChangeForm
│   │       │   └── CollageCreator
│   │       │       ├── InteractiveUploadGrid
│   │       │       ├── CollageCanvas
│   │       │       ├── BackgroundManager
│   │       │       └── ElementLabels
│   │       ├── ImageResult
│   │       ├── LoadingIndicator
│   │       └── AdminDashboard (admin only)
│   └── LocalizationContext.Provider
└── Other routes (IndexPlaceholder, FilcheckPlaceholder)
```

### State Management

**AuthContext:**
```typescript
interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}
```

**LocalizationContext:**
```typescript
interface LocalizationContextType {
  language: 'ru' | 'en' | 'kk';
  setLanguage: (lang: 'ru' | 'en' | 'kk') => void;
  t: (key: string) => string;  // Translation function
}
```

### API Client

**Features:**
- Automatic JWT token injection
- Centralized error handling
- Request/response logging
- Base URL configuration

**Usage:**
```typescript
// services/apiClient.ts
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('auth_token');
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}
```

---

## 🚀 Deployment Architecture

### Render Configuration

**Service Type:** Web Service (Node.js)

**Build Command:**
```bash
npm install && npm run build
```

**Start Command:**
```bash
npm start
```

**Environment Variables:**
```env
NODE_ENV=production
JWT_SECRET=<random-secret>
GEMINI_API_KEY=<gemini-key>
OPENAI_API_KEY=<openai-key>
SUPABASE_URL=<supabase-project-url>
SUPABASE_SERVICE_KEY=<supabase-service-role-key>
PORT=<render-auto-assigned>
```

**Health Check:**
- Path: `/api/health`
- Expected: `{"status":"ok","timestamp":"..."}`

### Production Flow

```
User Request
    ↓
Render Load Balancer
    ↓
Express Server (port $PORT)
    ├─ Static files (dist/)
    │   └─ React SPA
    └─ API routes (/api/*)
        ├─ Auth middleware
        ├─ Business logic
        └─ Database queries
            ├─ Supabase (cloud)
            └─ SQLite (ephemeral)
                ⚠️ Lost on restart!
```

### Database Persistence

**Supabase (Persistent):**
- ✅ Survives Render restarts
- ✅ Shared across instances
- ✅ Automatic backups

**SQLite (Ephemeral):**
- ⚠️ Lost on Render restart (free tier)
- ✅ Used as fallback only
- ✅ Auto-recreated on startup

**Migration Strategy:**
1. Run `migrate-to-supabase.js` locally
2. Push code to GitHub
3. Render auto-deploys
4. App starts with Supabase-first reads
5. SQLite fallback ensures uptime

---

## 📈 Performance Considerations

### Database Query Optimization

**Supabase:**
- Indexes on `username`, `id`, `date` columns
- Single-row queries use `.single()` for efficiency
- Connection pooling via @supabase/supabase-js

**SQLite:**
- WAL mode for concurrent reads
- Prepared statements for all queries
- Transactions for bulk operations

### Caching Strategy

**Current:**
- No caching layer (direct DB queries)

**Future Optimization:**
- Redis for session storage
- In-memory cache for brand/product catalog
- CDN for static assets

### Concurrent Access

**Supabase:**
- Handles concurrent writes natively (PostgreSQL)
- Row-level locking for updates

**SQLite:**
- WAL mode allows concurrent reads
- Single writer at a time (queue writes)

---

## 🔒 Security Architecture

### Authentication Security

1. **Password Hashing**: bcrypt with 10 rounds (salt + hash)
2. **JWT Signing**: HS256 algorithm with secret key
3. **Token Expiry**: 7 days (configurable)
4. **Token Storage**: localStorage (client-side)

### API Security

1. **Authentication**: All routes require valid JWT (except /login, /health)
2. **Authorization**: Role-based middleware checks
3. **Input Validation**: Express middleware + manual checks
4. **SQL Injection**: Prepared statements (parameterized queries)
5. **XSS Protection**: React auto-escapes output
6. **CORS**: Configured for production domain

### Environment Variables

**Sensitive Data:**
- `JWT_SECRET` - Must be cryptographically random
- `SUPABASE_SERVICE_KEY` - Service role (full access)
- `GEMINI_API_KEY` - AI API key
- `OPENAI_API_KEY` - AI API key

**Security Rules:**
- ❌ Never commit to git
- ✅ Use `.env` locally
- ✅ Set in Render dashboard for production

---

## 🧪 Testing Strategy

**Current Status:** No automated tests

**Recommended:**
1. **Unit Tests**: Jest for service functions
2. **Integration Tests**: Supertest for API endpoints
3. **E2E Tests**: Playwright for user flows
4. **Load Tests**: Artillery for API performance

---

## 📊 Monitoring & Logging

### Current Logging

**Console Logs:**
- Database operations (✓ success, ⚠️ warnings)
- API requests (method, path, status)
- Authentication events
- AI generation requests

**Render Logs:**
- Accessible via dashboard
- Real-time streaming
- 7-day retention (free tier)

### Recommended Monitoring

1. **APM**: New Relic or Datadog
2. **Error Tracking**: Sentry
3. **Uptime Monitoring**: UptimeRobot
4. **Database Metrics**: Supabase built-in analytics

---

## 🔮 Future Architecture Improvements

### 1. Fully Migrate to Supabase Reads
- Move brands, activity logs, usage to Supabase-first
- Keep SQLite only for local development
- Improve scalability for multi-instance deployments

### 2. Add Caching Layer
- Redis for session storage
- Cache frequently accessed data (brands, products)
- Reduce database load

### 3. Separate API and Frontend Services
- Deploy as two separate Render services
- Independent scaling
- Better fault isolation

### 4. Add Real-Time Features
- Supabase real-time subscriptions
- Live activity feed in admin dashboard
- Multi-user collaborative editing

### 5. Implement Rate Limiting
- Per-user API rate limits
- Prevent abuse of AI APIs
- Token bucket algorithm

### 6. Add Automated Tests
- CI/CD pipeline with GitHub Actions
- Automated test suite before deployment
- Integration tests for critical paths

---

## 📚 Key Files Reference

**Backend:**
- `server/index.js` - Main Express server
- `server/database/db.js` - SQLite queries and dual-write
- `server/database/supabase.js` - Supabase client wrapper
- `server/database/user-service.js` - User operations (Supabase-first)
- `server/database/schema.sql` - SQLite schema
- `server/database/supabase-migration.sql` - Supabase schema
- `server/middleware/auth.js` - JWT authentication

**Frontend:**
- `src/contexts/AuthContext.tsx` - Authentication state
- `src/services/apiClient.ts` - HTTP client
- `src/services/authService.ts` - Auth API calls
- `src/components/CategorySpecificGenerator.tsx` - Main generator UI
- `src/pages/VclLabApp.tsx` - Main application

**Documentation:**
- `README.md` - User guide and quick start
- `DEPLOY.md` - Deployment instructions
- `SUPABASE_MIGRATION.md` - Migration guide
- `ARCHITECTURE.md` - This file (system design)

---

**Last Updated:** 2025-10-16
**Architecture Version:** 2.0 (Hybrid Supabase + SQLite)
