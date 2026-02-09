import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { brandQueries, userQueries, settingsQueries } from '../database/db.js';
import {
  findUserByUsername,
  findUserById,
  createUser,
  updateUserCore,
  updateUserPassword,
  deleteUser,
  listUsers,
  countAdmins
} from '../database/user-service.js';
import {
  findAllSettings,
  findSettingsByCategory,
  findActiveSettingsByCategory,
  findSettingById,
  findSettingByValue
} from '../database/settings-service.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { saveBase64Image } from '../services/imageProcessing.js';
import {
  serializeBrandRecord,
  getBrandById,
  parsePresetsPayload,
  parseAssignedBrands,
  sanitizeUserRecord,
  VALID_ROLES,
  normalizeAssignedBrandIds
} from '../services/brandHelpers.js';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'public', 'uploads');
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

const router = Router();

// ============================================================
// Brand management
// ============================================================

router.get('/api/brands', authMiddleware, async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const assignedBrandIds = user.assigned_brands ? JSON.parse(user.assigned_brands) : [];
    const allBrands = brandQueries.findAll.all();
    const userBrands = req.user.role === 'admin'
      ? allBrands
      : allBrands.filter(brand => assignedBrandIds.includes(brand.id));

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

router.get('/api/brands/:brandId', authMiddleware, async (req, res) => {
  try {
    const { brandId } = req.params;
    const brand = brandQueries.findById.get(brandId);

    if (!brand) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const assignedBrandIds = user.assigned_brands ? JSON.parse(user.assigned_brands) : [];

    if (req.user.role !== 'admin' && !assignedBrandIds.includes(brandId)) {
      return res.status(403).json({ message: 'Access denied to this brand' });
    }

    res.json({ ...brand, products: JSON.parse(brand.products) });
  } catch (error) {
    console.error('Get brand error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/api/brands/:brandId/products/:productId', authMiddleware, async (req, res) => {
  try {
    const { brandId, productId } = req.params;
    const brand = brandQueries.findById.get(brandId);

    if (!brand) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const assignedBrandIds = user.assigned_brands ? JSON.parse(user.assigned_brands) : [];

    if (req.user.role !== 'admin' && !assignedBrandIds.includes(brandId)) {
      return res.status(403).json({ message: 'Access denied to this brand' });
    }

    const products = JSON.parse(brand.products);
    const product = products.find(p => p.id === productId);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ ...product, brand: { id: brand.id, name: brand.name, logo: brand.logo } });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Admin brand CRUD
router.get('/api/admin/brands', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const brands = brandQueries.findAll.all().map(serializeBrandRecord);
    res.json(brands);
  } catch (error) {
    console.error('List admin brands error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/api/admin/brands', authMiddleware, adminMiddleware, (req, res) => {
  const { id, name, description, logoBase64, logoFilename, logo, products } = req.body || {};

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
      resolvedLogo = saveBase64Image(logoBase64, logoFilename, BRAND_UPLOAD_DIR, 'brands', trimmedId || 'brand');
    } catch (error) {
      return res.status(400).json({ message: 'Failed to process brand logo image.' });
    }
  }

  let initialProducts = [];
  if (typeof products !== 'undefined') {
    if (!Array.isArray(products)) {
      return res.status(400).json({ message: 'Products must be an array.' });
    }
    initialProducts = products;
  }

  try {
    brandQueries.create.run(trimmedId, trimmedName, resolvedLogo || null, typeof description === 'string' ? description : '', JSON.stringify(initialProducts));
    const created = getBrandById(trimmedId);
    res.status(201).json(created);
  } catch (error) {
    console.error('Create brand error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/api/admin/brands/:brandId', authMiddleware, adminMiddleware, (req, res) => {
  const { brandId } = req.params;
  const existing = getBrandById(brandId.trim());

  if (!existing) {
    return res.status(404).json({ message: 'Brand not found.' });
  }

  const { name, description, logoBase64, logoFilename, logo, products } = req.body || {};

  const updatedName = typeof name === 'string' && name.trim() ? name.trim() : existing.name;
  const updatedDescription = typeof description === 'string' ? description : existing.description;
  let updatedLogo = typeof logo === 'string' && logo.trim() ? logo.trim() : existing.logo;

  if (logoBase64) {
    try {
      updatedLogo = saveBase64Image(logoBase64, logoFilename, BRAND_UPLOAD_DIR, 'brands', brandId.trim() || 'brand');
    } catch (error) {
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
    brandQueries.update.run(updatedName, updatedLogo || null, updatedDescription, JSON.stringify(updatedProducts), brandId.trim());
    const updated = getBrandById(brandId.trim());
    res.json(updated);
  } catch (error) {
    console.error('Update brand error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/api/admin/brands/:brandId', authMiddleware, adminMiddleware, (req, res) => {
  const { brandId } = req.params;
  const existing = getBrandById(brandId.trim());

  if (!existing) {
    return res.status(404).json({ message: 'Brand not found.' });
  }

  try {
    brandQueries.delete.run(brandId.trim());

    const users = userQueries.list.all();
    users.forEach((user) => {
      const assigned = parseAssignedBrands(user.assigned_brands);
      if (assigned.includes(brandId.trim())) {
        const updatedAssigned = assigned.filter((id) => id !== brandId.trim());
        userQueries.updateBrands.run(JSON.stringify(updatedAssigned), user.id);
      }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete brand error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Product management within brands
router.post('/api/admin/brands/:brandId/products', authMiddleware, adminMiddleware, (req, res) => {
  const brand = getBrandById(req.params.brandId.trim());
  if (!brand) {
    return res.status(404).json({ message: 'Brand not found.' });
  }

  const { id, name, category, promptTemplate, presets, imageBase64, imageFilename, image } = req.body || {};

  const productId = typeof id === 'string' ? id.trim() : '';
  const productName = typeof name === 'string' ? name.trim() : '';
  const productCategory = typeof category === 'string' ? category.trim() : '';
  const productPrompt = typeof promptTemplate === 'string' ? promptTemplate : '';

  if (!productId) return res.status(400).json({ message: 'Product id is required.' });
  if (!productName) return res.status(400).json({ message: 'Product name is required.' });
  if (!productCategory) return res.status(400).json({ message: 'Product category is required.' });

  if (brand.products.find((p) => p.id === productId)) {
    return res.status(409).json({ message: 'Product with this id already exists in the brand.' });
  }

  let productImage = typeof image === 'string' && image.trim() ? image.trim() : '';

  if (imageBase64) {
    try {
      productImage = saveBase64Image(imageBase64, imageFilename, PRODUCT_UPLOAD_DIR, 'products', productId || 'product');
    } catch (error) {
      return res.status(400).json({ message: 'Failed to process product image.' });
    }
  }

  if (!productImage) return res.status(400).json({ message: 'Product image is required.' });

  let parsedPresets = {};
  try {
    const result = parsePresetsPayload(presets);
    if (typeof result !== 'undefined') parsedPresets = result;
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
    brandQueries.update.run(brand.name, brand.logo, brand.description, JSON.stringify(updatedProducts), brand.id);
    res.status(201).json(getBrandById(brand.id));
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/api/admin/brands/:brandId/products/:productId', authMiddleware, adminMiddleware, (req, res) => {
  const brand = getBrandById(req.params.brandId.trim());
  if (!brand) return res.status(404).json({ message: 'Brand not found.' });

  const index = brand.products.findIndex((p) => p.id === req.params.productId);
  if (index === -1) return res.status(404).json({ message: 'Product not found.' });

  const { name, category, promptTemplate, presets, imageBase64, imageFilename, image } = req.body || {};

  const updatedProducts = [...brand.products];
  const current = { ...updatedProducts[index] };

  if (typeof name === 'string' && name.trim()) current.name = name.trim();
  if (typeof category === 'string' && category.trim()) current.category = category.trim();
  if (typeof promptTemplate === 'string') current.promptTemplate = promptTemplate;
  if (typeof image === 'string' && image.trim()) current.image = image.trim();

  if (imageBase64) {
    try {
      current.image = saveBase64Image(imageBase64, imageFilename, PRODUCT_UPLOAD_DIR, 'products', req.params.productId || 'product');
    } catch (error) {
      return res.status(400).json({ message: 'Failed to process product image.' });
    }
  }

  if (typeof presets !== 'undefined') {
    try {
      current.presets = parsePresetsPayload(presets);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  updatedProducts[index] = current;

  try {
    brandQueries.update.run(brand.name, brand.logo, brand.description, JSON.stringify(updatedProducts), brand.id);
    res.json(getBrandById(brand.id));
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/api/admin/brands/:brandId/products/:productId', authMiddleware, adminMiddleware, (req, res) => {
  const brand = getBrandById(req.params.brandId.trim());
  if (!brand) return res.status(404).json({ message: 'Brand not found.' });

  const updatedProducts = brand.products.filter((p) => p.id !== req.params.productId);
  if (updatedProducts.length === brand.products.length) {
    return res.status(404).json({ message: 'Product not found.' });
  }

  try {
    brandQueries.update.run(brand.name, brand.logo, brand.description, JSON.stringify(updatedProducts), brand.id);
    res.json(getBrandById(brand.id));
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ============================================================
// User management
// ============================================================

router.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await listUsers();
    res.json(users.map(sanitizeUserRecord));
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  const { username, password, role = 'user', assignedBrandIds = [], dailyCreditLimit = 0 } = req.body || {};

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

  const normalizedLimit = Number(dailyCreditLimit);
  if (!Number.isFinite(normalizedLimit) || normalizedLimit < 0) {
    return res.status(400).json({ message: 'Daily credit limit must be a non-negative number.' });
  }

  try {
    const existing = await findUserByUsername(username.trim());
    if (existing) {
      return res.status(409).json({ message: 'Username already exists.' });
    }

    const brands = brandQueries.findAll.all();
    const availableBrandSet = new Set(brands.map((b) => b.id));
    let normalizedBrands = [];
    try {
      normalizedBrands = normalizeAssignedBrandIds(assignedBrandIds, availableBrandSet);
    } catch (validationError) {
      return res.status(400).json({ message: validationError instanceof Error ? validationError.message : 'Invalid brand selection.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const created = await createUser(username.trim(), passwordHash, normalizedRole, JSON.stringify(normalizedBrands), normalizedLimit);

    res.status(201).json(sanitizeUserRecord(created));
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/api/admin/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ message: 'Invalid user id.' });
  }

  const { username, password, role, assignedBrandIds, dailyCreditLimit } = req.body || {};

  if (typeof username !== 'undefined' && (typeof username !== 'string' || !username.trim())) {
    return res.status(400).json({ message: 'Username cannot be empty.' });
  }
  if (typeof password !== 'undefined' && (typeof password !== 'string' || password.length < 6)) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }
  if (typeof role !== 'undefined' && (typeof role !== 'string' || !VALID_ROLES.has(role.trim()))) {
    return res.status(400).json({ message: 'Invalid role specified.' });
  }
  if (typeof dailyCreditLimit !== 'undefined') {
    const limitValue = Number(dailyCreditLimit);
    if (!Number.isFinite(limitValue) || limitValue < 0) {
      return res.status(400).json({ message: 'Daily credit limit must be a non-negative number.' });
    }
  }

  try {
    const existing = await findUserById(userId);
    if (!existing) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const normalizedUsername = typeof username === 'string' ? username.trim() : existing.username;
    if (normalizedUsername !== existing.username) {
      const duplicate = await findUserByUsername(normalizedUsername);
      if (duplicate && duplicate.id !== userId) {
        return res.status(409).json({ message: 'Username already exists.' });
      }
    }

    const normalizedRole = typeof role === 'string' ? role.trim() : existing.role;

    if (existing.role === 'admin' && normalizedRole !== 'admin') {
      const adminCountResult = await countAdmins();
      if (adminCountResult.count <= 1) {
        return res.status(400).json({ message: 'Cannot demote the last admin user.' });
      }
    }

    let normalizedBrands = parseAssignedBrands(existing.assigned_brands);
    if (typeof assignedBrandIds !== 'undefined') {
      const brands = brandQueries.findAll.all();
      const availableBrandSet = new Set(brands.map((b) => b.id));
      try {
        normalizedBrands = normalizeAssignedBrandIds(assignedBrandIds, availableBrandSet);
      } catch (validationError) {
        return res.status(400).json({ message: validationError instanceof Error ? validationError.message : 'Invalid brand selection.' });
      }
    }

    const normalizedLimit = typeof dailyCreditLimit !== 'undefined'
      ? Number(dailyCreditLimit)
      : (existing.daily_credit_limit || 0);

    await updateUserCore(normalizedUsername, normalizedRole, JSON.stringify(normalizedBrands), normalizedLimit, userId);

    if (typeof password === 'string' && password.length >= 6) {
      const passwordHash = bcrypt.hashSync(password, 10);
      await updateUserPassword(passwordHash, userId);
    }

    const updated = await findUserById(userId);
    res.json(sanitizeUserRecord(updated));
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/api/admin/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ message: 'Invalid user id.' });
  }

  if (userId === req.user.id) {
    return res.status(400).json({ message: 'You cannot delete your own account.' });
  }

  try {
    const existing = await findUserById(userId);
    if (!existing) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (existing.role === 'admin') {
      const adminCountResult = await countAdmins();
      if (adminCountResult.count <= 1) {
        return res.status(400).json({ message: 'Cannot delete the last admin user.' });
      }
    }

    await deleteUser(userId);
    res.status(204).send();
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ============================================================
// Settings management
// ============================================================

router.get('/api/admin/settings', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { category } = req.query;
    const settings = category ? await findSettingsByCategory(category) : await findAllSettings();
    res.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/api/settings/:category', authMiddleware, async (req, res) => {
  try {
    const settings = await findActiveSettingsByCategory(req.params.category);
    res.json(settings);
  } catch (error) {
    console.error('Get active settings error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/api/admin/settings', authMiddleware, adminMiddleware, async (req, res) => {
  const { category, value, label, description, is_active, sort_order } = req.body;

  if (!category || !value || !label) {
    return res.status(400).json({ message: 'category, value, and label are required.' });
  }

  const validCategories = ['lighting', 'camera_angle', 'background'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({ message: 'Invalid category. Must be: lighting, camera_angle, or background.' });
  }

  try {
    const existing = await findSettingByValue(value);
    if (existing) {
      return res.status(409).json({ message: 'A setting with this value already exists.' });
    }

    const result = settingsQueries.create.run(
      category, value, label, description || null,
      is_active !== undefined ? (is_active ? 1 : 0) : 1,
      sort_order || 0
    );

    const newSetting = await findSettingById(result.lastInsertRowid);
    res.status(201).json(newSetting);
  } catch (error) {
    console.error('Create setting error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/api/admin/settings/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const settingId = Number(req.params.id);
  if (!Number.isInteger(settingId) || settingId <= 0) {
    return res.status(400).json({ message: 'Invalid setting id.' });
  }

  const { category, value, label, description, is_active, sort_order } = req.body;

  if (!category || !value || !label) {
    return res.status(400).json({ message: 'category, value, and label are required.' });
  }

  const validCategories = ['lighting', 'camera_angle', 'background'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({ message: 'Invalid category. Must be: lighting, camera_angle, or background.' });
  }

  try {
    const existing = await findSettingById(settingId);
    if (!existing) return res.status(404).json({ message: 'Setting not found.' });

    if (value !== existing.value) {
      const valueConflict = await findSettingByValue(value);
      if (valueConflict && valueConflict.id !== settingId) {
        return res.status(409).json({ message: 'A setting with this value already exists.' });
      }
    }

    settingsQueries.update.run(
      settingId, category, value, label, description || null,
      is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
      sort_order !== undefined ? sort_order : existing.sort_order
    );

    const updated = await findSettingById(settingId);
    res.json(updated);
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/api/admin/settings/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const settingId = Number(req.params.id);
  if (!Number.isInteger(settingId) || settingId <= 0) {
    return res.status(400).json({ message: 'Invalid setting id.' });
  }

  try {
    const existing = await findSettingById(settingId);
    if (!existing) return res.status(404).json({ message: 'Setting not found.' });

    settingsQueries.delete.run(settingId);
    res.status(204).send();
  } catch (error) {
    console.error('Delete setting error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.patch('/api/admin/settings/:id/toggle', authMiddleware, adminMiddleware, async (req, res) => {
  const settingId = Number(req.params.id);
  if (!Number.isInteger(settingId) || settingId <= 0) {
    return res.status(400).json({ message: 'Invalid setting id.' });
  }

  try {
    const existing = await findSettingById(settingId);
    if (!existing) return res.status(404).json({ message: 'Setting not found.' });

    const newActiveStatus = existing.is_active === 1 ? 0 : 1;
    settingsQueries.toggleActive.run(newActiveStatus, settingId);

    const updated = await findSettingById(settingId);
    res.json(updated);
  } catch (error) {
    console.error('Toggle setting error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
