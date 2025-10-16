import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import { Blob } from 'buffer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_ROOT = path.join(__dirname, '..', 'public', 'uploads');
const BRAND_UPLOAD_DIR = path.join(UPLOAD_ROOT, 'brands');
const PRODUCT_UPLOAD_DIR = path.join(UPLOAD_ROOT, 'products');

const ensureDirectory = (directoryPath) => {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
};

ensureDirectory(UPLOAD_ROOT);
ensureDirectory(BRAND_UPLOAD_DIR);
ensureDirectory(PRODUCT_UPLOAD_DIR);

const DEFAULT_VIDEO_SIZE = '720x1280';

const parseSize = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const match = value.trim().toLowerCase().match(/^(\d+)x(\d+)$/);
  if (!match) {
    return null;
  }

  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  return { width, height };
};

const getAspectRatio = (width, height) => {
  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  return { width: width / divisor, height: height / divisor };
};

const resizeImageToAspectRatio = async (buffer, targetWidth, targetHeight) => {
  try {
    const metadata = await sharp(buffer).metadata();
    const originalWidth = metadata.width || 0;
    const originalHeight = metadata.height || 0;

    if (originalWidth === 0 || originalHeight === 0) {
      throw new Error('Invalid image dimensions');
    }

    // Calculate target aspect ratio
    const targetAspect = targetWidth / targetHeight;
    const originalAspect = originalWidth / originalHeight;

    console.log('Image resize info:', {
      original: `${originalWidth}x${originalHeight}`,
      target: `${targetWidth}x${targetHeight}`,
      originalAspect: originalAspect.toFixed(2),
      targetAspect: targetAspect.toFixed(2)
    });

    // Resize with aspect ratio fit
    const resized = await sharp(buffer)
      .resize(targetWidth, targetHeight, {
        fit: 'cover',
        position: 'center'
      })
      .toFormat('png')
      .toBuffer();

    return resized;
  } catch (error) {
    console.error('Image resize error:', error);
    throw error;
  }
};

const SORA_API_BASE = 'https://api.openai.com/v1/videos';

const normalizeSoraResponse = (data) => {
  const metadata = {
    id: data?.id ?? null,
    status: data?.status ?? data?.data?.[0]?.status ?? null,
    created: data?.created ?? data?.created_at ?? null
  };

  // Extract error information if status is failed
  let errorDetails = null;
  if (metadata.status === 'failed') {
    errorDetails = data?.error?.message || data?.failure_reason || 'Unknown error';
    console.error('Sora video generation failed:', {
      id: metadata.id,
      error: errorDetails,
      fullResponse: JSON.stringify(data, null, 2)
    });
  }

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

  let statusMessage = null;
  if (metadata.status === 'failed') {
    statusMessage = `Video generation failed: ${errorDetails}`;
  } else if (!videoUrl) {
    if (metadata.status) {
      statusMessage = `Video status: ${metadata.status}. Request ID: ${metadata.id ?? 'unknown'}. Try again in a few seconds to fetch the finished video.`;
    } else {
      statusMessage = 'Video is still processing. Try again shortly.';
    }
  }

  return {
    videoUrl,
    videoBase64,
    metadata,
    statusMessage,
    error: errorDetails
  };
};

const MIME_EXTENSIONS = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif'
};

const sanitizeFileBaseName = (value, fallback) => {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback;
  }
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || fallback;
};

const parseBase64ImagePayload = (payload) => {
  if (typeof payload !== 'string' || payload.length === 0) {
    return null;
  }

  let data = payload;
  let mimeType = 'image/png';

  const dataUrlMatch = payload.match(/^data:([^;]+);base64,(.+)$/);
  if (dataUrlMatch) {
    mimeType = dataUrlMatch[1];
    data = dataUrlMatch[2];
  }

  try {
    const buffer = Buffer.from(data, 'base64');
    if (!buffer.length) {
      return null;
    }
    return { buffer, mimeType };
  } catch (_error) {
    return null;
  }
};

const saveBase64Image = (base64, originalName, targetDir, relativeDir, prefix) => {
  const parsed = parseBase64ImagePayload(base64);
  if (!parsed) {
    throw new Error('Invalid image payload.');
  }

  let extension = '';
  if (typeof originalName === 'string') {
    extension = path.extname(originalName).replace('.', '').toLowerCase();
  }
  if (!extension && parsed.mimeType) {
    extension = MIME_EXTENSIONS[parsed.mimeType.toLowerCase()] || '';
  }
  if (!extension) {
    extension = 'png';
  }

  const safeBase = sanitizeFileBaseName(originalName, prefix);
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  const fileName = `${safeBase}-${uniqueSuffix}.${extension}`;
  const absolutePath = path.join(targetDir, fileName);

  fs.writeFileSync(absolutePath, parsed.buffer);

  return path.posix.join('/uploads', relativeDir, fileName);
};

const serializeBrandRecord = (record) => ({
  id: record.id,
  name: record.name,
  logo: record.logo,
  description: record.description,
  products: (() => {
    try {
      const parsed = JSON.parse(record.products || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  })(),
  created_at: record.created_at,
  updated_at: record.updated_at
});

const getBrandById = (brandId) => {
  const record = brandQueries.findById.get(brandId);
  if (!record) {
    return null;
  }
  return serializeBrandRecord(record);
};

const persistBrandProducts = (brandId, products) => {
  const record = brandQueries.findById.get(brandId);
  if (!record) {
    throw new Error('Brand not found');
  }
  brandQueries.update.run(
    record.name,
    record.logo,
    record.description,
    JSON.stringify(products),
    brandId
  );
};

const parsePresetsPayload = (value) => {
  if (typeof value === 'undefined') {
    return undefined;
  }

  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch (_error) {
      throw new Error('Invalid presets payload. Expected valid JSON.');
    }
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid presets payload. Expected object.');
  }

  return parsed;
};

const parseAssignedBrands = (value) => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch (_error) {
    return [];
  }
};

const sanitizeUserRecord = (record) => ({
  id: record.id,
  username: record.username,
  role: record.role,
  assignedBrands: parseAssignedBrands(record.assigned_brands),
  createdAt: record.created_at
});

const VALID_ROLES = new Set(['admin', 'user']);

const normalizeAssignedBrandIds = (brandIds, availableBrandSet) => {
  if (!Array.isArray(brandIds)) {
    return [];
  }

  const unique = [];
  const seen = new Set();

  brandIds.forEach((value) => {
    if (typeof value !== 'string') {
      return;
    }
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      return;
    }
    if (!availableBrandSet.has(trimmed)) {
      throw new Error(`Unknown brand id: ${trimmed}`);
    }
    seen.add(trimmed);
    unique.push(trimmed);
  });

  return unique;
};

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
        role: user.role,
        assignedBrands: parseAssignedBrands(user.assigned_brands),
        createdAt: user.created_at
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
      role: user.role,
      assignedBrands: parseAssignedBrands(user.assigned_brands),
      createdAt: user.created_at
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

// ============================================================
// Admin brand management endpoints
// ============================================================

app.get('/api/admin/brands', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const brands = brandQueries.findAll.all().map(serializeBrandRecord);
    res.json(brands);
  } catch (error) {
    console.error('List admin brands error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/admin/brands', authMiddleware, adminMiddleware, (req, res) => {
  const {
    id,
    name,
    description,
    logoBase64,
    logoFilename,
    logo,
    products
  } = req.body || {};

  const trimmedId = typeof id === 'string' ? id.trim().toLowerCase() : '';
  const trimmedName = typeof name === 'string' ? name.trim() : '';

  if (!trimmedId || !/^[a-z0-9-_.]+$/.test(trimmedId)) {
    return res.status(400).json({ message: 'Brand id must contain only alphanumeric characters, dashes, underscores or dots.' });
  }

  if (!trimmedName) {
    return res.status(400).json({ message: 'Brand name is required.' });
  }

  const existing = brandQueries.findById.get(trimmedId);
  if (existing) {
    return res.status(409).json({ message: 'Brand with this id already exists.' });
  }

  let resolvedLogo = typeof logo === 'string' && logo.trim() ? logo.trim() : '';

  if (logoBase64) {
    try {
      resolvedLogo = saveBase64Image(
        logoBase64,
        logoFilename,
        BRAND_UPLOAD_DIR,
        'brands',
        trimmedId || 'brand'
      );
    } catch (error) {
      console.error('Brand logo upload error:', error);
      return res.status(400).json({ message: 'Failed to process brand logo image.' });
    }
  }

  const descriptionText = typeof description === 'string' ? description : '';

  let initialProducts = [];
  if (typeof products !== 'undefined') {
    if (!Array.isArray(products)) {
      return res.status(400).json({ message: 'Products must be an array.' });
    }
    initialProducts = products;
  }

  try {
    brandQueries.create.run(
      trimmedId,
      trimmedName,
      resolvedLogo || null,
      descriptionText,
      JSON.stringify(initialProducts)
    );

    const created = getBrandById(trimmedId);
    res.status(201).json(created);
  } catch (error) {
    console.error('Create brand error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put('/api/admin/brands/:brandId', authMiddleware, adminMiddleware, (req, res) => {
  const { brandId } = req.params;
  const targetId = brandId.trim();
  const existing = getBrandById(targetId);

  if (!existing) {
    return res.status(404).json({ message: 'Brand not found.' });
  }

  const {
    name,
    description,
    logoBase64,
    logoFilename,
    logo,
    products
  } = req.body || {};

  const updatedName = typeof name === 'string' && name.trim() ? name.trim() : existing.name;
  const updatedDescription = typeof description === 'string' ? description : existing.description;

  let updatedLogo = typeof logo === 'string' && logo.trim() ? logo.trim() : existing.logo;

  if (logoBase64) {
    try {
      updatedLogo = saveBase64Image(
        logoBase64,
        logoFilename,
        BRAND_UPLOAD_DIR,
        'brands',
        targetId || 'brand'
      );
    } catch (error) {
      console.error('Brand logo update error:', error);
      return res.status(400).json({ message: 'Failed to process brand logo image.' });
    }
  }

  let updatedProducts = existing.products;
  if (typeof products !== 'undefined') {
    if (!Array.isArray(products)) {
      return res.status(400).json({ message: 'Products must be an array.' });
    }
    updatedProducts = products;
  }

  try {
    brandQueries.update.run(
      updatedName,
      updatedLogo || null,
      updatedDescription,
      JSON.stringify(updatedProducts),
      targetId
    );

    const updated = getBrandById(targetId);
    res.json(updated);
  } catch (error) {
    console.error('Update brand error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete('/api/admin/brands/:brandId', authMiddleware, adminMiddleware, (req, res) => {
  const { brandId } = req.params;
  const targetId = brandId.trim();
  const existing = getBrandById(targetId);

  if (!existing) {
    return res.status(404).json({ message: 'Brand not found.' });
  }

  try {
    brandQueries.delete.run(targetId);

    const users = userQueries.list.all();
    users.forEach((user) => {
      const assigned = parseAssignedBrands(user.assigned_brands);
      if (assigned.includes(targetId)) {
        const updatedAssigned = assigned.filter((id) => id !== targetId);
        userQueries.updateBrands.run(JSON.stringify(updatedAssigned), user.id);
      }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete brand error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/admin/brands/:brandId/products', authMiddleware, adminMiddleware, (req, res) => {
  const { brandId } = req.params;
  const brand = getBrandById(brandId.trim());

  if (!brand) {
    return res.status(404).json({ message: 'Brand not found.' });
  }

  const {
    id,
    name,
    category,
    promptTemplate,
    presets,
    imageBase64,
    imageFilename,
    image
  } = req.body || {};

  const productId = typeof id === 'string' ? id.trim() : '';
  const productName = typeof name === 'string' ? name.trim() : '';
  const productCategory = typeof category === 'string' ? category.trim() : '';
  const productPrompt = typeof promptTemplate === 'string' ? promptTemplate : '';

  if (!productId) {
    return res.status(400).json({ message: 'Product id is required.' });
  }
  if (!productName) {
    return res.status(400).json({ message: 'Product name is required.' });
  }
  if (!productCategory) {
    return res.status(400).json({ message: 'Product category is required.' });
  }

  const existingProduct = brand.products.find((product) => product.id === productId);
  if (existingProduct) {
    return res.status(409).json({ message: 'Product with this id already exists in the brand.' });
  }

  let productImage = typeof image === 'string' && image.trim() ? image.trim() : '';

  if (imageBase64) {
    try {
      productImage = saveBase64Image(
        imageBase64,
        imageFilename,
        PRODUCT_UPLOAD_DIR,
        'products',
        productId || 'product'
      );
    } catch (error) {
      console.error('Product image upload error:', error);
      return res.status(400).json({ message: 'Failed to process product image.' });
    }
  }

  if (!productImage) {
    return res.status(400).json({ message: 'Product image is required.' });
  }

  let parsedPresets = {};
  try {
    const result = parsePresetsPayload(presets);
    if (typeof result !== 'undefined') {
      parsedPresets = result;
    }
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }

  const newProduct = {
    id: productId,
    name: productName,
    category: productCategory,
    image: productImage,
    promptTemplate: productPrompt,
    presets: parsedPresets
  };

  try {
    const updatedProducts = [...brand.products, newProduct];
    brandQueries.update.run(
      brand.name,
      brand.logo,
      brand.description,
      JSON.stringify(updatedProducts),
      brand.id
    );

    const updatedBrand = getBrandById(brand.id);
    res.status(201).json(updatedBrand);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put('/api/admin/brands/:brandId/products/:productId', authMiddleware, adminMiddleware, (req, res) => {
  const { brandId, productId } = req.params;
  const brand = getBrandById(brandId.trim());

  if (!brand) {
    return res.status(404).json({ message: 'Brand not found.' });
  }

  const index = brand.products.findIndex((product) => product.id === productId);
  if (index === -1) {
    return res.status(404).json({ message: 'Product not found.' });
  }

  const {
    name,
    category,
    promptTemplate,
    presets,
    imageBase64,
    imageFilename,
    image
  } = req.body || {};

  const updatedProducts = [...brand.products];
  const current = { ...updatedProducts[index] };

  if (typeof name === 'string' && name.trim()) {
    current.name = name.trim();
  }
  if (typeof category === 'string' && category.trim()) {
    current.category = category.trim();
  }
  if (typeof promptTemplate === 'string') {
    current.promptTemplate = promptTemplate;
  }
  if (typeof image === 'string' && image.trim()) {
    current.image = image.trim();
  }

  if (imageBase64) {
    try {
      current.image = saveBase64Image(
        imageBase64,
        imageFilename,
        PRODUCT_UPLOAD_DIR,
        'products',
        productId || 'product'
      );
    } catch (error) {
      console.error('Product image update error:', error);
      return res.status(400).json({ message: 'Failed to process product image.' });
    }
  }

  if (typeof presets !== 'undefined') {
    try {
      const parsed = parsePresetsPayload(presets);
      current.presets = parsed;
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  updatedProducts[index] = current;

  try {
    brandQueries.update.run(
      brand.name,
      brand.logo,
      brand.description,
      JSON.stringify(updatedProducts),
      brand.id
    );

    const updatedBrand = getBrandById(brand.id);
    res.json(updatedBrand);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete('/api/admin/brands/:brandId/products/:productId', authMiddleware, adminMiddleware, (req, res) => {
  const { brandId, productId } = req.params;
  const brand = getBrandById(brandId.trim());

  if (!brand) {
    return res.status(404).json({ message: 'Brand not found.' });
  }

  const updatedProducts = brand.products.filter((product) => product.id !== productId);

  if (updatedProducts.length === brand.products.length) {
    return res.status(404).json({ message: 'Product not found.' });
  }

  try {
    brandQueries.update.run(
      brand.name,
      brand.logo,
      brand.description,
      JSON.stringify(updatedProducts),
      brand.id
    );

    const updatedBrand = getBrandById(brand.id);
    res.json(updatedBrand);
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ============================================================
// Admin user management endpoints
// ============================================================

app.get('/api/admin/users', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const users = userQueries.list.all();
    res.json(users.map(sanitizeUserRecord));
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/admin/users', authMiddleware, adminMiddleware, (req, res) => {
  const { username, password, role = 'user', assignedBrandIds = [] } = req.body || {};

  if (typeof username !== 'string' || !username.trim()) {
    return res.status(400).json({ message: 'Username is required.' });
  }

  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }

  const normalizedRole = typeof role === 'string' ? role.trim() : 'user';
  if (!VALID_ROLES.has(normalizedRole)) {
    return res.status(400).json({ message: 'Invalid role specified.' });
  }

  try {
    const existing = userQueries.findByUsername.get(username.trim());
    if (existing) {
      return res.status(409).json({ message: 'Username already exists.' });
    }

    const brands = brandQueries.findAll.all();
    const availableBrandSet = new Set(brands.map((brand) => brand.id));
    let normalizedBrands = [];
    try {
      normalizedBrands = normalizeAssignedBrandIds(assignedBrandIds, availableBrandSet);
    } catch (validationError) {
      return res.status(400).json({ message: validationError instanceof Error ? validationError.message : 'Invalid brand selection.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    userQueries.create.run(
      username.trim(),
      passwordHash,
      normalizedRole,
      JSON.stringify(normalizedBrands)
    );

    const created = userQueries.findByUsername.get(username.trim());
    res.status(201).json(sanitizeUserRecord(created));
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put('/api/admin/users/:id', authMiddleware, adminMiddleware, (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ message: 'Invalid user id.' });
  }

  const { username, password, role, assignedBrandIds } = req.body || {};

  if (
    typeof username !== 'undefined' &&
    (typeof username !== 'string' || !username.trim())
  ) {
    return res.status(400).json({ message: 'Username cannot be empty.' });
  }

  if (
    typeof password !== 'undefined' &&
    (typeof password !== 'string' || password.length < 6)
  ) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }

  if (
    typeof role !== 'undefined' &&
    (typeof role !== 'string' || !VALID_ROLES.has(role.trim()))
  ) {
    return res.status(400).json({ message: 'Invalid role specified.' });
  }

  try {
    const existing = userQueries.findById.get(userId);
    if (!existing) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const normalizedUsername = typeof username === 'string' ? username.trim() : existing.username;
    if (normalizedUsername !== existing.username) {
      const duplicate = userQueries.findByUsername.get(normalizedUsername);
      if (duplicate && duplicate.id !== userId) {
        return res.status(409).json({ message: 'Username already exists.' });
      }
    }

    const normalizedRole = typeof role === 'string' ? role.trim() : existing.role;

    if (existing.role === 'admin' && normalizedRole !== 'admin') {
      const adminCount = userQueries.countAdmins.get().count;
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'Cannot demote the last admin user.' });
      }
    }

    let normalizedBrands = parseAssignedBrands(existing.assigned_brands);
    if (typeof assignedBrandIds !== 'undefined') {
      const brands = brandQueries.findAll.all();
      const availableBrandSet = new Set(brands.map((brand) => brand.id));
      try {
        normalizedBrands = normalizeAssignedBrandIds(assignedBrandIds, availableBrandSet);
      } catch (validationError) {
        return res.status(400).json({ message: validationError instanceof Error ? validationError.message : 'Invalid brand selection.' });
      }
    }

    userQueries.updateCore.run(
      normalizedUsername,
      normalizedRole,
      JSON.stringify(normalizedBrands),
      userId
    );

    if (typeof password === 'string' && password.length >= 6) {
      const passwordHash = bcrypt.hashSync(password, 10);
      userQueries.updatePassword.run(passwordHash, userId);
    }

    const updated = userQueries.findById.get(userId);
    res.json(sanitizeUserRecord(updated));
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete('/api/admin/users/:id', authMiddleware, adminMiddleware, (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ message: 'Invalid user id.' });
  }

  if (userId === req.user.id) {
    return res.status(400).json({ message: 'You cannot delete your own account.' });
  }

  try {
    const existing = userQueries.findById.get(userId);
    if (!existing) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (existing.role === 'admin') {
      const adminCount = userQueries.countAdmins.get().count;
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'Cannot delete the last admin user.' });
      }
    }

    userQueries.delete.run(userId);
    res.status(204).send();
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// ============================================================
// AI Generation endpoints (Gemini & OpenAI)
// ============================================================

app.post('/api/gemini/generate', authMiddleware, async (req, res) => {
  const { parts, aspectRatio } = req.body || {};

  if (!parts || !Array.isArray(parts)) {
    return res.status(400).json({ message: 'Parts array is required.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ message: 'GEMINI_API_KEY is not configured on the server.' });
  }

  try {
    const { GoogleGenAI, Modality } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    const contents = { parts };
    const config = {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
      ...(aspectRatio && { imageConfig: { aspectRatio } })
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents,
      config
    });

    // Extract image from response
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return res.json({
          image: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
        });
      }
    }

    // Check for safety ratings
    const candidate = response.candidates[0];
    if (candidate.finishReason !== 'STOP' && candidate.safetyRatings) {
      const blockedRating = candidate.safetyRatings.find(rating => rating.blocked);
      if (blockedRating) {
        console.warn('Gemini generation blocked due to safety settings:', blockedRating.category);
        return res.status(400).json({
          message: `Image generation blocked due to safety settings: ${blockedRating.category}`
        });
      }
    }

    return res.status(500).json({ message: 'API did not return an image.' });
  } catch (error) {
    console.error('Gemini generation error:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

app.post('/api/openai/generate', authMiddleware, async (req, res) => {
  const { prompt, imageBase64, mode = 'edit' } = req.body || {};

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ message: 'Prompt is required.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ message: 'OPENAI_API_KEY is not configured on the server.' });
  }

  try {
    let response;

    if (mode === 'edit' && imageBase64) {
      // Image editing mode
      const parsed = parseBase64ImagePayload(imageBase64);
      if (!parsed) {
        return res.status(400).json({ message: 'Invalid image data.' });
      }

      const formData = new FormData();
      const blob = new Blob([parsed.buffer], { type: 'image/png' });
      formData.append('image', blob, 'image.png');
      formData.append('prompt', prompt);
      formData.append('model', 'gpt-image-1');
      formData.append('n', '1');
      formData.append('size', '1024x1024');

      response = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`
        },
        body: formData
      });
    } else {
      // Text-to-image mode
      response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-image-1',
          prompt,
          n: 1,
          size: '1024x1024'
        })
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      let errorMessage = 'Failed to generate image';
      try {
        const parsed = JSON.parse(errorText);
        if (parsed?.error?.message) {
          errorMessage = parsed.error.message;
        }
      } catch (_) {}
      return res.status(response.status).json({ message: errorMessage });
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      return res.status(500).json({ message: 'OpenAI API did not return any images.' });
    }

    // Return the first image (URL or base64)
    const imageData = data.data[0];
    if (imageData.url) {
      // Download and convert to base64
      const imageResponse = await fetch(imageData.url);
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64 = Buffer.from(imageBuffer).toString('base64');
      return res.json({ image: `data:image/png;base64,${base64}` });
    } else if (imageData.b64_json) {
      return res.json({ image: `data:image/png;base64,${imageData.b64_json}` });
    }

    return res.status(500).json({ message: 'No image data found in response.' });
  } catch (error) {
    console.error('OpenAI generation error:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// ============================================================
// Sora video generation endpoints
// ============================================================

app.post('/api/sora/generate', authMiddleware, adminMiddleware, async (req, res) => {
  const { prompt, imageBase64, imageName, size, seconds } = req.body || {};

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ message: 'Prompt is required.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ message: 'OPENAI_API_KEY is not configured on the server.' });
  }

  const sizeValue = typeof size === 'string' ? size.trim() : '';
  const resolvedSize = sizeValue || DEFAULT_VIDEO_SIZE;
  const parsedSize = parseSize(resolvedSize);
  const secondsNumber = Number(seconds);
  const resolvedSeconds = Number.isFinite(secondsNumber) && secondsNumber > 0
    ? Math.min(Math.floor(secondsNumber), 60)
    : 4;

  let referenceBlob = null;
  let mimeType = 'image/png';
  let referenceFilename = (typeof imageName === 'string' && imageName.trim()) ? imageName.trim() : null;

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
      const buffer = Buffer.from(base64Data, 'base64');

      if (parsedSize) {
        const { width, height } = parsedSize;

        try {
          const resizedBuffer = await resizeImageToAspectRatio(buffer, width, height);

          referenceBlob = new Blob([resizedBuffer], { type: 'image/png' });
          mimeType = 'image/png';
          const baseName = referenceFilename ? referenceFilename.replace(/\.[^.]+$/, '') : `reference-${Date.now()}`;
          referenceFilename = `${baseName}.png`;
          console.log('Sora reference resized successfully', {
            size: `${width}x${height}`,
            originalBytes: buffer.length,
            resizedBytes: resizedBuffer.length
          });
        } catch (resizeError) {
          console.error('Sora image resize failed, using original buffer:', resizeError);
          referenceBlob = new Blob([buffer], { type: mimeType });
        }
      } else {
        referenceBlob = new Blob([buffer], { type: mimeType });
      }

      if (!referenceFilename) {
        const extension = mimeType.split('/')[1] || 'png';
        referenceFilename = `reference-${Date.now()}.${extension}`;
      }
    } catch (error) {
      console.error('Invalid base64 image payload:', error);
      return res.status(400).json({ message: 'Invalid base64 image payload.' });
    }
  }

  console.log('Sora request meta:', {
    promptLength: prompt.trim().length,
    hasImage: Boolean(referenceBlob),
    size: resolvedSize,
    seconds: resolvedSeconds
  });

  const formData = new FormData();
  formData.append('model', 'sora-2');
  formData.append('prompt', prompt.trim());
  formData.append('size', resolvedSize);
  formData.append('seconds', resolvedSeconds.toString());

  if (referenceBlob && referenceFilename) {
    formData.append('input_reference', referenceBlob, referenceFilename);
  }

  try {
    const response = await fetch('https://api.openai.com/v1/videos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: formData
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
        // ignore JSON parse issues
      }

      return res.status(response.status).json({
        message: errorMessage,
        details: errorText
      });
    }

    const data = await response.json();
    const normalized = normalizeSoraResponse(data);

    console.log('Sora response meta:', {
      status: normalized.metadata.status,
      id: normalized.metadata.id,
      videoUrlPresent: Boolean(normalized.videoUrl)
    });

    res.json({
      ...normalized,
      raw: data,
      requestId: data?.id ?? null
    });
  } catch (error) {
    console.error('Sora generation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



app.get('/api/sora/status/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const videoId = id?.trim();

  if (!videoId) {
    return res.status(400).json({ message: 'Video id is required.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ message: 'OPENAI_API_KEY is not configured on the server.' });
  }

  try {
    const statusResponse = await fetch(`${SORA_API_BASE}/${encodeURIComponent(videoId)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      console.error('Sora status check failed:', videoId, errorText);
      return res.status(statusResponse.status).json({
        message: 'Failed to retrieve video status',
        details: errorText
      });
    }

    const data = await statusResponse.json();
    let normalized = normalizeSoraResponse(data);

    // If video is completed, fetch the actual video content
    if (data.status === 'completed' && !normalized.videoUrl) {
      console.log('Video completed, fetching content for:', videoId);

      try {
        const contentResponse = await fetch(`${SORA_API_BASE}/${encodeURIComponent(videoId)}/content`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${apiKey}`
          }
        });

        if (contentResponse.ok) {
          const videoBuffer = await contentResponse.arrayBuffer();
          const base64Video = Buffer.from(videoBuffer).toString('base64');
          normalized.videoBase64 = base64Video;
          normalized.videoUrl = `data:video/mp4;base64,${base64Video}`;
          console.log('Video content downloaded successfully, size:', videoBuffer.byteLength, 'bytes');
        } else {
          console.warn('Failed to download video content:', contentResponse.status);
        }
      } catch (downloadError) {
        console.error('Error downloading video content:', downloadError);
      }
    }

    console.log('Sora status check meta:', {
      id: normalized.metadata.id,
      status: normalized.metadata.status,
      videoUrlPresent: Boolean(normalized.videoUrl)
    });

    res.json({
      ...normalized,
      raw: data,
      requestId: videoId
    });
  } catch (error) {
    console.error('Sora status check error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Download completed Sora video
app.get('/api/sora/download/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const videoId = id?.trim();

  if (!videoId) {
    return res.status(400).json({ message: 'Video id is required.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ message: 'OPENAI_API_KEY is not configured on the server.' });
  }

  try {
    console.log('Downloading video content for:', videoId);

    const contentResponse = await fetch(`${SORA_API_BASE}/${encodeURIComponent(videoId)}/content`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });

    if (!contentResponse.ok) {
      const errorText = await contentResponse.text();
      console.error('Video download failed:', videoId, errorText);
      return res.status(contentResponse.status).json({
        message: 'Failed to download video',
        details: errorText
      });
    }

    const videoBuffer = await contentResponse.arrayBuffer();

    // Set headers for video download
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="sora-${videoId}.mp4"`);
    res.setHeader('Content-Length', videoBuffer.byteLength);

    console.log('Video downloaded successfully, size:', videoBuffer.byteLength, 'bytes');

    res.send(Buffer.from(videoBuffer));
  } catch (error) {
    console.error('Video download error:', error);
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
  const distDir = path.join(__dirname, '..', 'dist');

  // Serve static files with correct MIME types
  app.use(express.static(distDir));

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
    res.sendFile(path.join(distDir, 'index.html'));
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
