<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# VCL Lab 01 - AI Image Generation App

Professional AI-powered image generation tool with support for multiple AI models, interactive collage creation, various image transformation categories, SQLite database, and JWT authentication.

## 🎯 Key Features

### **Authentication & Security**
- **JWT Authentication**: Secure token-based authentication with 7-day expiry
- **Password Hashing**: bcrypt with 10 rounds for secure password storage
- **Role-Based Access**: Admin and user roles with protected routes
- **Activity Logging**: Full audit trail of all user actions

### **Database & Persistence**
- **SQLite Database**: ACID-compliant local database
- **Usage Tracking**: Per-category and global daily limits
- **Activity Logs**: Track all generations with user, model, and metadata
- **Automatic Reset**: Daily usage counters reset automatically

### **AI Image Generation**
- **Multiple AI Models**: Google Gemini and OpenAI GPT-Image-1
- **7 Generation Categories**:
  - Product Photography
  - Model Product (virtual try-on)
  - Concept Art
  - Storyboard
  - Angle Change
  - Model Reskin (face swap, demographic transform)
  - Collage Creation

### **Interactive Collage System**
- **Visual Upload Grid**: 2x2 interactive slots for image upload
- **6 Product-Specific Presets**: Hero shots, comparisons, lineups, showcases
- **Real-time Canvas**: Live preview with drag-drop positioning
- **Smart Text Rendering**: Stylized labels under products

### **User Experience**
- **Multi-language Support**: Russian, English, and Kazakh
- **Admin Dashboard**: Manage limits, view activity logs, reset usage
- **Loading Animation**: Custom dombra.gif during AI processing
- **Professional Interface**: Step-by-step workflow with intuitive navigation

---

## 🚀 Quick Start

### Development

**Prerequisites:** Node.js 18+

```bash
# Install dependencies
npm install

# Start both API server and frontend
npm run dev
```

This starts:
- **API Server** on http://localhost:4000
- **Frontend** on http://localhost:5173

### Default Login

- **Admin**: `admin` / `admin123`
- **User**: `user` / `user123`

⚠️ **Change these passwords in production!**

### Environment Variables

Create `.env` file (optional, has defaults):

```env
# JWT Secret (CHANGE IN PRODUCTION!)
JWT_SECRET=your-secret-key-change-in-production

# API Server Port
API_PORT=4000

# AI API Keys (optional, can be set on frontend)
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

---

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- React 19 + TypeScript
- Vite 6.2
- Tailwind CSS
- React Router DOM
- shadcn/ui components

**Backend:**
- Express.js
- SQLite (better-sqlite3)
- JWT (jsonwebtoken)
- bcrypt for password hashing

**AI Integration:**
- Google Gemini API
- OpenAI API

### Project Structure

```
vcl_lab_01/
├── server/                      # Backend API
│   ├── database/
│   │   ├── schema.sql          # Database schema
│   │   ├── db.js               # Database service layer
│   │   └── app.db              # SQLite database (gitignored)
│   ├── middleware/
│   │   └── auth.js             # JWT authentication middleware
│   └── index.js                # Express API server
│
├── components/                  # React components
│   ├── collage/                # Collage system components
│   │   ├── CollageCanvas.tsx
│   │   ├── CollageCreator.tsx
│   │   ├── ProductCollageCreator.tsx
│   │   ├── InteractiveUploadGrid.tsx
│   │   ├── BackgroundManager.tsx
│   │   └── ElementLabels.tsx
│   ├── category-specific/      # Category-specific forms
│   │   ├── ProductPhotoForm.tsx
│   │   ├── ModelReskinForm.tsx
│   │   └── ConceptArtForm.tsx
│   ├── admin/
│   │   └── AdminDashboard.tsx  # Admin panel
│   ├── ui/                     # shadcn/ui components
│   ├── CategorySelector.tsx
│   ├── CategorySpecificGenerator.tsx
│   ├── ImageResult.tsx
│   ├── LoadingIndicator.tsx
│   └── LoginScreen.tsx
│
├── services/                    # Service layer
│   ├── authService.ts          # Authentication + JWT
│   ├── apiClient.ts            # HTTP client with auto JWT
│   ├── usageService.ts         # Usage tracking
│   ├── aiService.ts            # Main AI service
│   ├── geminiService.ts        # Google Gemini integration
│   ├── openaiService.ts        # OpenAI integration
│   ├── collagePresets.ts       # Collage layouts
│   ├── collageExport.ts        # PNG export
│   └── collageAiService.ts     # AI for collages
│
├── contexts/                    # React contexts
│   ├── AuthContext.tsx         # Authentication state
│   └── LocalizationContext.tsx # i18n state
│
├── types/                       # TypeScript types
│   ├── auth.ts                 # Auth types
│   ├── usage.ts                # Usage tracking types
│   ├── collage.ts              # Collage types
│   └── index.ts
│
├── pages/                       # Application pages
│   ├── VclLabApp.tsx           # Main app page
│   ├── IndexPlaceholder.tsx
│   └── FilcheckPlaceholder.tsx
│
├── i18n/                        # Translations (RU/EN/KK)
├── public/                      # Static assets
├── App.tsx                      # Router
├── constants.tsx                # Category configurations
└── presets.ts                   # AI generation presets
```

### Database Schema

**Tables:**

1. **users** - User accounts
   - `id`, `username`, `password_hash`, `role`, `created_at`, `updated_at`

2. **activity_logs** - Activity audit trail
   - `id`, `user_id`, `category_id`, `action`, `ai_model`, `credits_used`, `metadata`, `created_at`

3. **usage_limits** - Per-category daily limits
   - `id`, `date`, `user_id`, `category_id`, `daily_limit`, `used`, `created_at`, `updated_at`

4. **global_credits** - Global daily limits
   - `id`, `date`, `daily_limit`, `used`, `created_at`, `updated_at`

**Location:** `server/database/app.db`

---

## 🔌 API Endpoints

### Authentication
```
POST /api/login              - Login (returns JWT token)
GET  /api/auth/me            - Verify token and get user info
```

### Usage Tracking (requires authentication)
```
GET  /api/usage              - Get current usage stats
POST /api/usage/increment    - Increment usage (logs activity)
POST /api/usage/limits       - Update limits (admin only)
POST /api/usage/reset        - Reset daily usage (admin only)
```

### Activity Logs (requires authentication)
```
GET  /api/activity/logs?limit=100        - Get all logs (admin only)
GET  /api/activity/user/:userId?limit=50 - Get user's logs
```

### Health Check
```
GET  /api/health             - API health status
```

---

## 📦 Scripts

```bash
# Development (starts both API and frontend)
npm run dev

# Start API server only
npm run server

# Start frontend only (requires API on port 4000)
npm run dev:vite

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 🚀 Deployment on Render

### Prerequisites

Render deployment requires running the API server separately. You need **TWO** services:

1. **Web Service** - Frontend (Static Site or Web Service)
2. **Web Service** - Backend API

### Option 1: Single Service (Web Service)

**Build Command:**
```bash
npm install && npm run build
```

**Start Command:**
```bash
npm start
```

**Environment Variables:**
- `JWT_SECRET` - Your secure JWT secret key
- `GEMINI_API_KEY` - Google Gemini API key (optional)
- `OPENAI_API_KEY` - OpenAI API key (optional)
- `PORT` - Auto-set by Render
- `API_PORT` - Set to `4000`

**Important:** This serves only the frontend. You'll need a separate backend service.

### Option 2: Two Services (Recommended)

#### Service 1: Backend API

**Type:** Web Service

**Build Command:**
```bash
npm install
```

**Start Command:**
```bash
npm run server
```

**Environment Variables:**
- `JWT_SECRET` - Your secure JWT secret key
- `API_PORT` - Use `$PORT` (Render's dynamic port)

**Health Check Path:** `/api/health`

#### Service 2: Frontend

**Type:** Static Site or Web Service

**Build Command:**
```bash
npm install && npm run build
```

**Publish Directory:** `dist`

**Environment Variables:**
- `VITE_API_BASE_URL` - Your backend URL (e.g., `https://your-api.onrender.com`)

### Database Persistence

⚠️ **Important:** Render's free tier has ephemeral storage. The SQLite database will be **lost on restart**.

**Solutions:**
1. **Upgrade to paid tier** with persistent disk
2. **Use external database** (PostgreSQL recommended for production)
3. **Mount persistent volume** on Render

### Render Configuration

Create `render.yaml` in project root:

```yaml
services:
  - type: web
    name: vcl-lab-api
    env: node
    buildCommand: npm install
    startCommand: npm run server
    envVars:
      - key: JWT_SECRET
        generateValue: true
      - key: API_PORT
        value: 10000
    healthCheckPath: /api/health

  - type: web
    name: vcl-lab-frontend
    env: static
    buildCommand: npm install && npm run build
    staticPublishPath: ./dist
    envVars:
      - key: VITE_API_BASE_URL
        value: https://vcl-lab-api.onrender.com
```

---

## 🔐 Security Best Practices

### For Production:

1. **Change default passwords**
   ```sql
   -- Connect to database and update
   UPDATE users SET password_hash = '<new_bcrypt_hash>' WHERE username = 'admin';
   ```

2. **Set secure JWT_SECRET**
   ```bash
   # Generate a random secret
   openssl rand -base64 32
   ```

3. **Enable HTTPS** (automatic on Render)

4. **Set up database backups**
   ```bash
   # Manual backup
   cp server/database/app.db server/database/app.db.backup
   ```

5. **Use environment variables**
   - Never commit API keys or secrets to git
   - Use `.env` files locally
   - Use Render's environment variables in production

6. **Monitor activity logs**
   - Check admin dashboard regularly
   - Review unusual patterns

---

## 🐛 Troubleshooting

### Cannot connect to API

**Problem:** Frontend shows "Connection failed" or 404/500 errors

**Solution:**
```bash
# Check if API is running
curl http://localhost:4000/api/health

# Start API manually
npm run server
```

### Authentication fails

**Problem:** Login returns 401 Unauthorized

**Solution:**
1. Check if database exists at `server/database/app.db`
2. Try default credentials: `admin` / `admin123`
3. Reset database:
   ```bash
   rm server/database/app.db*
   npm run server
   # Database recreated with default users
   ```

### Database locked error

**Problem:** `SQLITE_BUSY: database is locked`

**Solution:**
1. Close all connections to the database
2. Restart the server
3. If persists, delete WAL files:
   ```bash
   rm server/database/app.db-wal server/database/app.db-shm
   ```

### Render deployment errors

**Problem:** 500 Internal Server Error on Render

**Solutions:**
1. Check if `JWT_SECRET` is set in environment variables
2. Verify database directory exists (ephemeral storage issue)
3. Check Render logs for specific errors
4. Ensure both API and frontend services are running

---

## 📊 Usage Statistics

View in Admin Dashboard:
- Total generations by category
- Credits used per day
- Activity logs with timestamps
- User-specific statistics

---

## 🎨 Workflow Examples

### Single Product Photography
1. Select "Product Photography" category
2. Upload product image
3. Configure style settings (camera angle, concept, background, lighting)
4. Add custom requirements
5. Generate professional product photo

### Multi-Product Collage
1. Select "Collage" category
2. Choose layout preset
3. Upload images via interactive grid
4. Add text descriptions
5. Adjust positioning with drag-drop
6. Generate AI-enhanced collage

### Model Reskin / Face Swap
1. Select "Model Reskin" category
2. Upload product and model images
3. Choose transformation type (outfit/face swap/demographics)
4. Configure style preferences
5. Generate realistic composite

---

## 📝 Development Notes

### Adding New AI Models

Edit `types.ts`:
```typescript
export type AIModel = 'gemini' | 'openai' | 'your-new-model';
```

Create service in `services/yourModelService.ts`

### Adding New Categories

Edit `constants.tsx`:
```typescript
export const CATEGORIES: Category[] = [
  // Add your new category
]
```

### Customizing Usage Limits

Admin dashboard → Set Limits → Configure per category

---

## 🤝 Contributing

This project is developed by [VCL Technology](https://vcl.studio).

For issues or feature requests, please contact the development team.

---

## 📄 License

Same as main project

---

## 🔗 Links

- **GitHub**: [Repository](https://github.com/your-repo)
- **VCL Technology**: [https://vcl.studio](https://vcl.studio)
- **Live Demo**: [https://vcl-lab-01.onrender.com](https://vcl-lab-01.onrender.com)

---

**Last Updated:** 2025-10-02
**Version:** 1.0.0 with SQLite + JWT
