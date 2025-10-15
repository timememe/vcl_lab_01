import React, { useState, useEffect } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { brandService } from '../services/brandService';
import type { Brand, Product } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface PresetSelectorProps {
  onPresetSelect: (preset: Product) => void;
  onUploadSelect: () => void;
  selectedPreset?: Product | null;
  selectedMode: 'upload' | 'preset';
}

const PresetSelector: React.FC<PresetSelectorProps> = ({
  onPresetSelect,
  onUploadSelect,
  selectedPreset,
  selectedMode
}) => {
  const { t } = useLocalization();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Load brands and their products (filtered by user's assigned brands)
  useEffect(() => {
    const loadBrands = async () => {
      try {
        const data = await brandService.getBrands();
        setBrands(data);

        // Flatten all products from all assigned brands
        // No category filtering - only show products from user's assigned brands
        const allProducts = data.flatMap(brand => brand.products);
        setProducts(allProducts);
      } catch (err) {
        console.error('Failed to load brands:', err);
      } finally {
        setLoading(false);
      }
    };
    loadBrands();
  }, []);

  useEffect(() => {
    // For non-admins, if not already on preset mode or no preset is selected, select the first one by default
    if (!isAdmin && products.length > 0 && (selectedMode !== 'preset' || !selectedPreset)) {
      onPresetSelect(products[0]);
    }
  }, [isAdmin, products, selectedMode, selectedPreset, onPresetSelect]);

  return (
    <div className="space-y-4">
      {/* Mode selection */}
      {isAdmin && (
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={onUploadSelect}
            className={`flex-1 py-3 px-4 rounded-md border transition-colors ${
              selectedMode === 'upload'
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-white text-red-700 border-red-200 hover:border-red-300'
            }`}
          >
            📁 {t('preset_option_upload')}
          </button>
          <button
            type="button"
            onClick={() => {
              // Switch to preset mode - if there are products available, select the first one
              if (products.length > 0) {
                onPresetSelect(products[0]);
              }
            }}
            className={`flex-1 py-3 px-4 rounded-md border transition-colors ${
              selectedMode === 'preset'
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-white text-red-700 border-red-200 hover:border-red-300'
            }`}
          >
            🎨 {t('preset_option_choose')}
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && selectedMode === 'preset' && (
        <div className="text-center py-8 text-gray-500">
          <div className="animate-spin w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2">Loading presets...</p>
        </div>
      )}

      {/* Preset selection grid */}
      {!loading && selectedMode === 'preset' && products.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              onClick={() => onPresetSelect(product)}
              className={`cursor-pointer p-3 rounded-lg border-2 transition-all ${
                selectedPreset?.id === product.id
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 hover:border-red-300 bg-white'
              }`}
            >
              <div className="aspect-square bg-gray-100 rounded-md mb-2 overflow-hidden">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to placeholder if image fails to load
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y3ZjdmNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE4IiBmaWxsPSIjOTk5IiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5QcmVzZXQ8L3RleHQ+PC9zdmc+';
                  }}
                />
              </div>
              <h3 className="font-medium text-sm text-gray-900">{product.name}</h3>
              <p className="text-xs text-gray-600 mt-1">
                {product.presets.concept} • {product.presets.lighting}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* No presets available message */}
      {!loading && selectedMode === 'preset' && products.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No presets available for this category yet.</p>
        </div>
      )}
    </div>
  );
};

export default PresetSelector;