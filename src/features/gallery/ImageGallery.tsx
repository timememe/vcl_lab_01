import React, { useState, useEffect, useCallback } from 'react';
import {
  Image as ImageIcon,
  Heart,
  Trash2,
  Download,
  Loader2,
  Filter,
  Video as VideoIcon,
  X,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { galleryService } from './galleryService';
import type { GeneratedImage } from '@/types/gallery';
import { useLocalization } from '@/i18n/LocalizationContext';

interface ImageGalleryProps {
  categoryFilter?: string;
  onClose?: () => void;
}

const FILTERS = [
  { key: undefined as string | undefined, labelKey: 'gallery_filter_all', fallback: 'All' },
  { key: 'product_photo', labelKey: 'gallery_filter_packshots', fallback: 'Packshots' },
  { key: 'collage', labelKey: 'gallery_filter_collages', fallback: 'Collages' },
];

const ImageGallery: React.FC<ImageGalleryProps> = ({ categoryFilter, onClose }) => {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(categoryFilter);
  const [lightboxImage, setLightboxImage] = useState<GeneratedImage | null>(null);
  const { t } = useLocalization();

  const translate = useCallback(
    (key: string, fallback: string) => {
      const localized = t(key);
      return localized === key ? fallback : localized;
    },
    [t],
  );

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
      setImages((prev) =>
        prev.map((img) =>
          img.id === imageId ? { ...img, is_favorite: !img.is_favorite } : img,
        ),
      );
      setLightboxImage((prev) =>
        prev && prev.id === imageId ? { ...prev, is_favorite: !prev.is_favorite } : prev,
      );
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleDelete = async (imageId: number) => {
    if (!confirm(translate('gallery_confirm_delete', 'Are you sure you want to delete this image?')))
      return;
    try {
      await galleryService.deleteImage(imageId);
      setImages((prev) => prev.filter((img) => img.id !== imageId));
      if (lightboxImage?.id === imageId) setLightboxImage(null);
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

  // Loading state
  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
          <span className="text-sm text-white/50">
            {translate('gallery_loading', 'Loading gallery...')}
          </span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="w-full max-w-6xl mx-auto flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-red-400">{error}</p>
        <Button onClick={loadImages} variant="outline" className="text-white border-red-500/20 hover:bg-red-500/10">
          {translate('gallery_retry', 'Retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white/70 hover:text-red-200 hover:bg-red-500/10 shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              {translate('gallery_title', 'My Gallery')}
            </h2>
            <p className="text-xs sm:text-sm text-white/40">
              {images.length}{' '}
              {translate('gallery_images_count', 'images')}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-4 h-4 text-white/30 shrink-0" />
          {FILTERS.map((f) => (
            <Button
              key={f.labelKey}
              variant={selectedCategory === f.key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedCategory(f.key)}
              className={
                selectedCategory !== f.key
                  ? 'text-white/60 hover:text-red-200 hover:bg-red-500/10 whitespace-nowrap'
                  : 'whitespace-nowrap'
              }
            >
              {translate(f.labelKey, f.fallback)}
            </Button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {images.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[350px] bg-black/20 backdrop-blur-sm rounded-2xl border border-red-500/5">
          <ImageIcon className="w-14 h-14 text-white/10 mb-4" />
          <p className="text-lg font-medium text-white/30">
            {translate('gallery_empty_title', 'No images yet')}
          </p>
          <p className="text-sm text-white/15 mt-1">
            {translate('gallery_empty_subtitle', 'Generate your first image to see it here!')}
          </p>
        </div>
      ) : (
        /* Gallery grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {images.map((image) => (
            <div
              key={image.id}
              className="group relative aspect-square bg-black/30 backdrop-blur-sm rounded-xl overflow-hidden border border-red-500/5 hover:border-red-500/30 transition-all cursor-pointer"
              onClick={() => setLightboxImage(image)}
            >
              {/* Media */}
              {image.media_type === 'video' ? (
                <video
                  src={image.image_url}
                  className="w-full h-full object-cover"
                  muted
                  loop
                  onMouseEnter={(e) => e.currentTarget.play()}
                  onMouseLeave={(e) => e.currentTarget.pause()}
                />
              ) : (
                <img
                  src={image.thumbnail_url || image.image_url}
                  alt={`Generated ${image.id}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              )}

              {/* Hover overlay with actions */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3 gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite(image.id);
                  }}
                  className={`h-8 w-8 p-0 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 ${
                    image.is_favorite ? 'text-red-500' : 'text-white/80'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${image.is_favorite ? 'fill-current' : ''}`} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(image.image_url, image.id);
                  }}
                  className="h-8 w-8 p-0 rounded-full bg-black/40 backdrop-blur-sm text-white/80 hover:bg-black/60"
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(image.id);
                  }}
                  className="h-8 w-8 p-0 rounded-full bg-black/40 backdrop-blur-sm text-white/80 hover:bg-red-900/60"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Favorite indicator */}
              {image.is_favorite && (
                <div className="absolute top-2 right-2">
                  <Heart className="w-4 h-4 text-red-500 fill-current drop-shadow-lg" />
                </div>
              )}

              {/* Badge bottom-left */}
              {image.media_type === 'video' && (
                <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                  <VideoIcon className="w-3 h-3" />
                  {image.duration && <span>{image.duration}s</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLightboxImage(null)}
              className="absolute -top-12 right-0 text-white/70 hover:text-red-200 hover:bg-red-500/10"
            >
              <X className="h-5 w-5" />
            </Button>

            {/* Image */}
            {lightboxImage.media_type === 'video' ? (
              <video
                src={lightboxImage.image_url}
                className="w-full max-h-[80vh] object-contain rounded-xl"
                controls
                autoPlay
                loop
              />
            ) : (
              <img
                src={lightboxImage.image_url}
                alt={`Generated ${lightboxImage.id}`}
                className="w-full max-h-[80vh] object-contain rounded-xl"
              />
            )}

            {/* Actions bar below image */}
            <div className="flex items-center justify-center gap-3 mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleFavorite(lightboxImage.id)}
                className={`gap-2 ${
                  lightboxImage.is_favorite
                    ? 'text-red-500'
                    : 'text-white/70 hover:text-red-200'
                } hover:bg-red-500/10`}
              >
                <Heart
                  className={`w-4 h-4 ${lightboxImage.is_favorite ? 'fill-current' : ''}`}
                />
                {lightboxImage.is_favorite
                  ? translate('gallery_unfavorite', 'Unfavorite')
                  : translate('gallery_favorite', 'Favorite')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDownload(lightboxImage.image_url, lightboxImage.id)}
                className="gap-2 text-white/70 hover:text-red-200 hover:bg-red-500/10"
              >
                <Download className="w-4 h-4" />
                {translate('gallery_download', 'Download')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(lightboxImage.id)}
                className="gap-2 text-white/70 hover:text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4" />
                {translate('gallery_delete', 'Delete')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGallery;
