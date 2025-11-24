import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Heart, Trash2, Download, Loader2, Grid3x3, Filter } from 'lucide-react';
import { Button } from '../ui/button';
import { galleryService } from '../../services/galleryService';
import type { GeneratedImage } from '../../types/gallery';

interface ImageGalleryProps {
  categoryFilter?: string;
  onClose?: () => void;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ categoryFilter, onClose }) => {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(categoryFilter);

  useEffect(() => {
    loadImages();
  }, [selectedCategory]);

  const loadImages = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await galleryService.getGallery(50, selectedCategory);
      setImages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (imageId: number) => {
    try {
      await galleryService.toggleFavorite(imageId);
      setImages(prev =>
        prev.map(img =>
          img.id === imageId ? { ...img, is_favorite: !img.is_favorite } : img
        )
      );
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleDelete = async (imageId: number) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      await galleryService.deleteImage(imageId);
      setImages(prev => prev.filter(img => img.id !== imageId));
    } catch (err) {
      console.error('Failed to delete image:', err);
    }
  };

  const handleDownload = async (imageUrl: string, imageId: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-${imageId}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download image:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
        <span className="ml-3 text-gray-600">Loading gallery...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={loadImages}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Grid3x3 className="w-6 h-6 text-red-600" />
          <div>
            <h2 className="text-2xl font-bold">My Gallery</h2>
            <p className="text-sm text-gray-600">{images.length} images generated</p>
          </div>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-600" />
        <Button
          variant={selectedCategory === undefined ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory(undefined)}
        >
          All
        </Button>
        <Button
          variant={selectedCategory === 'product_photo' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('product_photo')}
        >
          Packshots
        </Button>
        <Button
          variant={selectedCategory === 'collage' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('collage')}
        >
          Collages
        </Button>
      </div>

      {/* Gallery Grid */}
      {images.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-400">
          <ImageIcon className="w-16 h-16 mb-4" />
          <p className="text-lg font-medium">No images yet</p>
          <p className="text-sm">Generate your first image to see it here!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {images.map((image) => (
            <div
              key={image.id}
              className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-red-400 transition-all"
            >
              {/* Image */}
              <img
                src={image.thumbnail_url || image.image_url}
                alt={`Generated ${image.id}`}
                className="w-full h-full object-cover"
              />

              {/* Overlay with actions */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleToggleFavorite(image.id)}
                  className={image.is_favorite ? 'text-red-500' : ''}
                >
                  <Heart className={`w-4 h-4 ${image.is_favorite ? 'fill-current' : ''}`} />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleDownload(image.image_url, image.id)}
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleDelete(image.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Favorite indicator */}
              {image.is_favorite && (
                <div className="absolute top-2 right-2">
                  <Heart className="w-5 h-5 text-red-500 fill-current drop-shadow-lg" />
                </div>
              )}

              {/* Category badge */}
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                {image.category_id}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageGallery;
