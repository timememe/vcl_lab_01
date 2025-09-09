import React, { useState } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { ProductPreset, getPresetsForCategory } from '../presets';

interface PresetSelectorProps {
  categoryId: string;
  onPresetSelect: (preset: ProductPreset) => void;
  onUploadSelect: () => void;
  selectedPreset?: ProductPreset | null;
  selectedMode: 'upload' | 'preset';
}

const PresetSelector: React.FC<PresetSelectorProps> = ({ 
  categoryId, 
  onPresetSelect, 
  onUploadSelect, 
  selectedPreset,
  selectedMode 
}) => {
  const { t } = useLocalization();
  const presets = getPresetsForCategory(categoryId);

  return (
    <div className="space-y-4">
      {/* Mode selection */}
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
            // Switch to preset mode - if there are presets available, select the first one
            const presets = getPresetsForCategory(categoryId);
            if (presets.length > 0) {
              onPresetSelect(presets[0]);
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

      {/* Preset selection grid */}
      {selectedMode === 'preset' && presets.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {presets.map((preset) => (
            <div
              key={preset.id}
              onClick={() => onPresetSelect(preset)}
              className={`cursor-pointer p-3 rounded-lg border-2 transition-all ${
                selectedPreset?.id === preset.id
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 hover:border-red-300 bg-white'
              }`}
            >
              <div className="aspect-square bg-gray-100 rounded-md mb-2 overflow-hidden">
                <img
                  src={preset.imagePath}
                  alt={t(preset.nameKey)}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to placeholder if image fails to load
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y3ZjdmNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE4IiBmaWxsPSIjOTk5IiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5QcmVzZXQ8L3RleHQ+PC9zdmc+';
                  }}
                />
              </div>
              <h3 className="font-medium text-sm text-gray-900">{t(preset.nameKey)}</h3>
              <p className="text-xs text-gray-600 mt-1">{t(preset.descriptionKey)}</p>
            </div>
          ))}
        </div>
      )}

      {/* No presets available message */}
      {selectedMode === 'preset' && presets.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No presets available for this category yet.</p>
        </div>
      )}
    </div>
  );
};

export default PresetSelector;