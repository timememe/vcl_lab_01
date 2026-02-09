import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const MIME_EXTENSIONS = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif'
};

export const parseSize = (value) => {
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

export const resizeImageToAspectRatio = async (buffer, targetWidth, targetHeight) => {
  const metadata = await sharp(buffer).metadata();
  const originalWidth = metadata.width || 0;
  const originalHeight = metadata.height || 0;

  if (originalWidth === 0 || originalHeight === 0) {
    throw new Error('Invalid image dimensions');
  }

  console.log('Image resize info:', {
    original: `${originalWidth}x${originalHeight}`,
    target: `${targetWidth}x${targetHeight}`
  });

  const resized = await sharp(buffer)
    .resize(targetWidth, targetHeight, {
      fit: 'cover',
      position: 'center'
    })
    .toFormat('png')
    .toBuffer();

  return resized;
};

export const parseBase64ImagePayload = (payload) => {
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

export const saveBase64Image = (base64, originalName, targetDir, relativeDir, prefix) => {
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
