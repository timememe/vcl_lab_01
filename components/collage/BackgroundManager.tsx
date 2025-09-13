import React, { useState } from 'react';
import { Upload, Palette, Image as ImageIcon } from 'lucide-react';

interface BackgroundManagerProps {
  currentBackground?: {
    type: 'color' | 'image';
    value: string;
    label?: string;
  };
  onBackgroundChange: (background: { type: 'color' | 'image'; value: string; label?: string }) => void;
  onLabelChange?: (label: string) => void;
  allowLabels?: boolean;
}

const BackgroundManager: React.FC<BackgroundManagerProps> = ({
  currentBackground,
  onBackgroundChange,
  onLabelChange,
  allowLabels = true
}) => {
  const [backgroundType, setBackgroundType] = useState<'color' | 'image'>(
    currentBackground?.type || 'color'
  );
  const [colorValue, setColorValue] = useState(
    currentBackground?.type === 'color' ? currentBackground.value : '#ffffff'
  );

  const predefinedColors = [
    '#ffffff', '#000000', '#f3f4f6', '#e5e7eb', '#d1d5db',
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6',
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f59e0b'
  ];

  const handleColorChange = (color: string) => {
    setColorValue(color);
    onBackgroundChange({ type: 'color', value: color });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      onBackgroundChange({ type: 'image', value: result });
    };
    reader.readAsDataURL(file);
  };

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const label = e.target.value;
    onLabelChange?.(label);
  };

  return (
    <div className="space-y-4 p-4 border border-gray-200 rounded-lg">
      <h3 className="text-lg font-semibold text-gray-800">Background Settings</h3>

      {/* Background Type Selector */}
      <div className="flex space-x-2">
        <button
          onClick={() => setBackgroundType('color')}
          className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
            backgroundType === 'color'
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Palette className="w-4 h-4 mr-2" />
          Color
        </button>
        <button
          onClick={() => setBackgroundType('image')}
          className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
            backgroundType === 'image'
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <ImageIcon className="w-4 h-4 mr-2" />
          Image
        </button>
      </div>

      {/* Color Picker */}
      {backgroundType === 'color' && (
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <input
              type="color"
              value={colorValue}
              onChange={(e) => handleColorChange(e.target.value)}
              className="w-12 h-8 rounded border border-gray-300"
            />
            <input
              type="text"
              value={colorValue}
              onChange={(e) => handleColorChange(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="#ffffff"
            />
          </div>

          {/* Predefined Colors */}
          <div className="grid grid-cols-5 gap-2">
            {predefinedColors.map((color) => (
              <button
                key={color}
                onClick={() => handleColorChange(color)}
                className={`w-8 h-8 rounded border-2 ${
                  colorValue === color ? 'border-red-500' : 'border-gray-300'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      )}

      {/* Image Upload */}
      {backgroundType === 'image' && (
        <div>
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-8 h-8 mb-4 text-gray-500" />
              <p className="mb-2 text-sm text-gray-500">
                <span className="font-semibold">Click to upload</span> background image
              </p>
              <p className="text-xs text-gray-500">PNG, JPG or JPEG</p>
            </div>
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleImageUpload}
            />
          </label>
        </div>
      )}

      {/* Background Label */}
      {allowLabels && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Background Label (optional)
          </label>
          <input
            type="text"
            onChange={handleLabelChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="Describe the background..."
          />
        </div>
      )}

      {/* Current Background Preview */}
      {currentBackground && (
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Current Background:</p>
          <div className="flex items-center space-x-2">
            {currentBackground.type === 'color' ? (
              <div
                className="w-8 h-8 rounded border border-gray-300"
                style={{ backgroundColor: currentBackground.value }}
              />
            ) : (
              <img
                src={currentBackground.value}
                alt="Background"
                className="w-12 h-8 object-cover rounded border border-gray-300"
              />
            )}
            <span className="text-sm text-gray-600">
              {currentBackground.type === 'color' ? currentBackground.value : 'Custom Image'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackgroundManager;