import { Router } from 'express';
import { generatedImageQueries } from '../database/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/api/gallery', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const categoryId = req.query.category;

    let images;
    if (categoryId) {
      images = generatedImageQueries.findByUserIdAndCategory.all(userId, categoryId, limit);
    } else {
      images = generatedImageQueries.findByUserId.all(userId, limit);
    }

    const formattedImages = images.map(img => ({
      ...img,
      metadata: img.metadata ? JSON.parse(img.metadata) : null
    }));

    res.json(formattedImages);
  } catch (error) {
    console.error('Get gallery error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/api/gallery', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { category_id, image_url, thumbnail_url, prompt, metadata, ai_model, media_type, duration } = req.body;

    if (!category_id || !image_url) {
      return res.status(400).json({ message: 'category_id and image_url are required' });
    }

    const result = generatedImageQueries.create.run(
      userId,
      category_id,
      image_url,
      thumbnail_url || null,
      prompt || null,
      metadata ? JSON.stringify(metadata) : null,
      ai_model || null,
      media_type || 'image',
      duration || null
    );

    const savedImage = generatedImageQueries.findById.get(result.lastInsertRowid);

    res.json({
      ...savedImage,
      metadata: savedImage.metadata ? JSON.parse(savedImage.metadata) : null
    });
  } catch (error) {
    console.error('Save to gallery error:', error);
    res.status(500).json({ message: 'Failed to save image to gallery', error: error.message });
  }
});

router.patch('/api/gallery/:id/favorite', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const imageId = parseInt(req.params.id);

    const image = generatedImageQueries.findById.get(imageId);
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }
    if (image.user_id !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    generatedImageQueries.toggleFavorite.run(imageId);

    const updatedImage = generatedImageQueries.findById.get(imageId);
    res.json({
      ...updatedImage,
      metadata: updatedImage.metadata ? JSON.parse(updatedImage.metadata) : null
    });
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/api/gallery/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const imageId = parseInt(req.params.id);

    const image = generatedImageQueries.findById.get(imageId);
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }
    if (image.user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    generatedImageQueries.delete.run(imageId);

    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Delete from gallery error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
