import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import {
  userQueries,
  brandQueries,
  activityQueries,
  usageLimitQueries,
  globalCreditsQueries,
  getTodayDate,
  transaction
} from './database/db.js';
import { generateToken, authMiddleware, adminMiddleware } from './middleware/auth.js';

const app = express();
// In production, use Render's PORT. In development, use API_PORT or 4000
const PORT = process.env.NODE_ENV === 'production'
  ? (process.env.PORT || 4000)
  : (process.env.API_PORT || 4000);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ============================================================
// Authentication endpoints
// ============================================================

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  try {
    const user = userQueries.findByUsername.get(username);

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  try {
    const user = userQueries.findById.get(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user.id,
      username: user.username,
      role: user.role
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ============================================================
// Usage tracking endpoints
// ============================================================

app.get('/api/usage', authMiddleware, (req, res) => {
  try {
    const today = getTodayDate();

    // Get global credits
    let globalCredits = globalCreditsQueries.get.get(today);
    if (!globalCredits) {
      globalCreditsQueries.upsert.run(today, 100, 0);
      globalCredits = globalCreditsQueries.get.get(today);
    }

    // Get all category limits for today
    const categoryLimits = usageLimitQueries.getAllForDate.all(today);

    const categories = {};
    categoryLimits.forEach(limit => {
      categories[limit.category_id] = {
        dailyLimit: limit.daily_limit,
        used: limit.used
      };
    });

    res.json({
      date: today,
      categories,
      credits: {
        dailyLimit: globalCredits.daily_limit,
        used: globalCredits.used
      }
    });
  } catch (error) {
    console.error('Get usage error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/usage/limits', authMiddleware, adminMiddleware, (req, res) => {
  const { categories = {}, credits } = req.body || {};

  try {
    const today = getTodayDate();

    transaction(() => {
      // Update category limits
      Object.entries(categories).forEach(([categoryId, value]) => {
        const dailyLimit = Number(value?.dailyLimit);
        if (!Number.isFinite(dailyLimit) || dailyLimit < 0) {
          return;
        }

        const existing = usageLimitQueries.get.get(today, categoryId);
        const currentUsed = existing?.used || 0;

        usageLimitQueries.upsert.run(
          today,
          categoryId,
          dailyLimit,
          Math.min(currentUsed, dailyLimit || currentUsed)
        );
      });

      // Update global credits limit
      if (credits && typeof credits.dailyLimit !== 'undefined') {
        const limit = Number(credits.dailyLimit);
        if (Number.isFinite(limit) && limit >= 0) {
          globalCreditsQueries.setLimit.run(today, limit);
        }
      }
    })();

    // Return updated usage
    const updated = usageLimitQueries.getAllForDate.all(today);
    const globalCredits = globalCreditsQueries.get.get(today);

    const categoriesResult = {};
    updated.forEach(limit => {
      categoriesResult[limit.category_id] = {
        dailyLimit: limit.daily_limit,
        used: limit.used
      };
    });

    res.json({
      date: today,
      categories: categoriesResult,
      credits: {
        dailyLimit: globalCredits.daily_limit,
        used: globalCredits.used
      }
    });
  } catch (error) {
    console.error('Update limits error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/usage/increment', authMiddleware, (req, res) => {
  const { categoryId, creditsUsed = 1, aiModel, metadata } = req.body || {};

  if (!categoryId) {
    return res.status(400).json({ message: 'categoryId is required.' });
  }

  const increment = Number(creditsUsed);
  if (!Number.isFinite(increment)) {
    return res.status(400).json({ message: 'creditsUsed must be a number.' });
  }

  try {
    const today = getTodayDate();
    const userId = req.user.id;

    const result = transaction(() => {
      // Check and increment category limit
      const categoryLimit = usageLimitQueries.get.get(today, categoryId);
      if (categoryLimit && categoryLimit.daily_limit > 0) {
        const tentativeUsed = categoryLimit.used + increment;
        if (tentativeUsed > categoryLimit.daily_limit) {
          throw new Error('Category limit exceeded');
        }
      }

      // Check and increment global credits
      let globalCredits = globalCreditsQueries.get.get(today);
      if (!globalCredits) {
        globalCreditsQueries.upsert.run(today, 100, 0);
        globalCredits = globalCreditsQueries.get.get(today);
      }

      if (globalCredits.daily_limit > 0) {
        const tentativeCreditsUsed = globalCredits.used + increment;
        if (tentativeCreditsUsed > globalCredits.daily_limit) {
          throw new Error('Daily credits limit exceeded');
        }
      }

      // Increment counters
      usageLimitQueries.increment.run(today, categoryId, increment);
      globalCreditsQueries.increment.run(today, increment);

      // Log activity
      activityQueries.create.run(
        userId,
        categoryId,
        'generate',
        aiModel || 'unknown',
        increment,
        metadata ? JSON.stringify(metadata) : null
      );

      // Get updated data
      const updatedCategory = usageLimitQueries.get.get(today, categoryId);
      const updatedGlobal = globalCreditsQueries.get.get(today);

      return {
        category: updatedCategory,
        global: updatedGlobal
      };
    })();

    // Return updated usage
    const allCategories = usageLimitQueries.getAllForDate.all(today);
    const categoriesResult = {};
    allCategories.forEach(limit => {
      categoriesResult[limit.category_id] = {
        dailyLimit: limit.daily_limit,
        used: limit.used
      };
    });

    res.json({
      date: today,
      categories: categoriesResult,
      credits: {
        dailyLimit: result.global.daily_limit,
        used: result.global.used
      }
    });
  } catch (error) {
    if (error.message.includes('limit exceeded')) {
      return res.status(429).json({ message: error.message });
    }
    console.error('Increment usage error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/usage/reset', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const today = getTodayDate();

    transaction(() => {
      // Reset global credits
      globalCreditsQueries.upsert.run(today, 100, 0);

      // Reset all category limits
      const categories = usageLimitQueries.getAllForDate.all(today);
      categories.forEach(cat => {
        usageLimitQueries.upsert.run(today, cat.category_id, cat.daily_limit, 0);
      });
    })();

    const globalCredits = globalCreditsQueries.get.get(today);
    const categoryLimits = usageLimitQueries.getAllForDate.all(today);

    const categoriesResult = {};
    categoryLimits.forEach(limit => {
      categoriesResult[limit.category_id] = {
        dailyLimit: limit.daily_limit,
        used: 0
      };
    });

    res.json({
      date: today,
      categories: categoriesResult,
      credits: {
        dailyLimit: globalCredits.daily_limit,
        used: 0
      }
    });
  } catch (error) {
    console.error('Reset usage error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ============================================================
// Activity logs endpoints (admin only)
// ============================================================

app.get('/api/activity/logs', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const logs = activityQueries.findAll.all(limit);

    res.json(logs.map(log => ({
      ...log,
      metadata: log.metadata ? JSON.parse(log.metadata) : null
    })));
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/activity/user/:userId', authMiddleware, (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    // Users can only view their own logs unless they're admin
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const limit = parseInt(req.query.limit) || 50;
    const logs = activityQueries.findByUser.all(userId, limit);

    res.json(logs.map(log => ({
      ...log,
      metadata: log.metadata ? JSON.parse(log.metadata) : null
    })));
  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ============================================================
// Brand endpoints
// ============================================================

app.get('/api/brands', authMiddleware, (req, res) => {
  try {
    const user = userQueries.findById.get(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Parse user's assigned brands
    const assignedBrandIds = user.assigned_brands ? JSON.parse(user.assigned_brands) : [];

    // Get all brands if admin, or only assigned brands if user
    const allBrands = brandQueries.findAll.all();
    const userBrands = req.user.role === 'admin'
      ? allBrands
      : allBrands.filter(brand => assignedBrandIds.includes(brand.id));

    // Parse products JSON for each brand
    const brandsWithProducts = userBrands.map(brand => ({
      ...brand,
      products: JSON.parse(brand.products)
    }));

    res.json(brandsWithProducts);
  } catch (error) {
    console.error('Get brands error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/brands/:brandId', authMiddleware, (req, res) => {
  try {
    const { brandId } = req.params;
    const brand = brandQueries.findById.get(brandId);

    if (!brand) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    // Check if user has access to this brand
    const user = userQueries.findById.get(req.user.id);
    const assignedBrandIds = user.assigned_brands ? JSON.parse(user.assigned_brands) : [];

    if (req.user.role !== 'admin' && !assignedBrandIds.includes(brandId)) {
      return res.status(403).json({ message: 'Access denied to this brand' });
    }

    res.json({
      ...brand,
      products: JSON.parse(brand.products)
    });
  } catch (error) {
    console.error('Get brand error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/brands/:brandId/products/:productId', authMiddleware, (req, res) => {
  try {
    const { brandId, productId } = req.params;
    const brand = brandQueries.findById.get(brandId);

    if (!brand) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    // Check access
    const user = userQueries.findById.get(req.user.id);
    const assignedBrandIds = user.assigned_brands ? JSON.parse(user.assigned_brands) : [];

    if (req.user.role !== 'admin' && !assignedBrandIds.includes(brandId)) {
      return res.status(403).json({ message: 'Access denied to this brand' });
    }

    const products = JSON.parse(brand.products);
    const product = products.find(p => p.id === productId);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({
      ...product,
      brand: {
        id: brand.id,
        name: brand.name,
        logo: brand.logo
      }
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


app.post('/api/sora/generate', authMiddleware, async (req, res) => {
  const { prompt, imageBase64, imageName } = req.body || {};

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ message: 'Prompt is required.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ message: 'OPENAI_API_KEY is not configured on the server.' });
  }

  let imageContent;
  let mimeType = 'image/png';

  if (imageBase64) {
    let base64Data = imageBase64;

    const dataUrlMatch = typeof imageBase64 === 'string'
      ? imageBase64.match(/^data:([^;]+);base64,(.+)$/)
      : null;

    if (dataUrlMatch) {
      mimeType = dataUrlMatch[1];
      base64Data = dataUrlMatch[2];
    }

    try {
      Buffer.from(base64Data, 'base64');
    } catch (error) {
      return res.status(400).json({ message: 'Invalid base64 image payload.' });
    }

    imageContent = {
      type: 'input_image',
      image_base64: base64Data
    };

    if (mimeType) {
      imageContent.mime_type = mimeType;
    }

    if (imageName && typeof imageName === 'string') {
      imageContent.filename = imageName;
    }
  }

  const content = [
    {
      type: 'input_text',
      text: prompt.trim()
    }
  ];

  if (imageContent) {
    content.push(imageContent);
  }

  console.log('Sora request meta:', { promptLength: prompt.trim().length, hasImage: Boolean(imageContent) });

  const payload = {
    model: 'sora-2',
    input: [
      {
        role: 'user',
        content
      }
    ]
  };

  try {
    const response = await fetch('https://api.openai.com/v1/videos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Sora generation failed:', errorText);

      let errorMessage = 'Failed to generate video';
      try {
        const parsed = JSON.parse(errorText);
        if (parsed?.error?.message) {
          errorMessage = parsed.error.message;
        }
      } catch (_parseError) {
        // ignore
      }

      return res.status(response.status).json({
        message: errorMessage,
        details: errorText
      });
    }

    const data = await response.json();

    const metadata = {
      id: data?.id ?? null,
      status: data?.status ?? data?.data?.[0]?.status ?? null,
      created: data?.created ?? data?.created_at ?? null
    };

    let videoUrl = null;
    let videoBase64 = null;

    const candidates = Array.isArray(data?.data) ? data.data : [];
    for (const candidate of candidates) {
      if (candidate && typeof candidate === 'object') {
        if (!videoUrl) {
          videoUrl = candidate.url
            || candidate?.data?.url
            || candidate?.asset_url
            || null;
        }

        if (!videoBase64) {
          videoBase64 = candidate?.b64_json
            || candidate?.data?.b64_json
            || null;
        }
      }
    }

    if (!videoUrl && data?.video?.url) {
      videoUrl = data.video.url;
    }

    if (!videoUrl && videoBase64) {
      videoUrl = `data:video/mp4;base64,${videoBase64}`;
    }

    res.json({
      videoUrl,
      videoBase64,
      metadata,
      raw: data
    });
  } catch (error) {
    console.error('Sora generation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ============================================================
// Health check
// ============================================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Serve static files with correct MIME types
  app.use(express.static(path.join(__dirname, '..', 'dist')));

  // Fallback to index.html for SPA routing (only for HTML requests, not assets)
  app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api')) {
      return next();
    }

    // Skip static file extensions
    const ext = path.extname(req.path);
    if (ext && ext !== '.html') {
      return next();
    }

    // Send index.html for SPA routes
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`✓ API server running on port ${PORT}`);
  console.log(`✓ Database initialized with SQLite`);
  console.log(`✓ JWT authentication enabled`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`✓ Serving static files from dist/`);
  }
});
