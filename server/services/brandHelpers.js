import { brandQueries } from '../database/db.js';

export const serializeBrandRecord = (record) => ({
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

export const getBrandById = (brandId) => {
  const record = brandQueries.findById.get(brandId);
  if (!record) {
    return null;
  }
  return serializeBrandRecord(record);
};

export const parsePresetsPayload = (value) => {
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

export const parseAssignedBrands = (value) => {
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

export const sanitizeUserRecord = (record) => ({
  id: record.id,
  username: record.username,
  role: record.role,
  assignedBrands: parseAssignedBrands(record.assigned_brands),
  dailyCreditLimit: record.daily_credit_limit || 0,
  createdAt: record.created_at
});

export const VALID_ROLES = new Set(['admin', 'user']);

export const normalizeAssignedBrandIds = (brandIds, availableBrandSet) => {
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
