import { CollagePreset, CollageConfig } from '../types/collage';

export const COLLAGE_PRESETS: CollagePreset[] = [
  {
    id: 'single_product',
    name: 'Single Product',
    aspectRatio: { width: 16, height: 9 },
    canvasSize: { width: 1920, height: 1080 },
    defaultElements: [
      {
        type: 'image',
        position: { x: 0.3, y: 0.2, width: 0.4, height: 0.6 },
        zIndex: 2
      }
    ],
    maxElements: 1,
    allowBackgroundChange: true,
    allowLabels: true
  },
  {
    id: 'product_comparison',
    name: 'Product Comparison',
    aspectRatio: { width: 16, height: 9 },
    canvasSize: { width: 1920, height: 1080 },
    defaultElements: [
      {
        type: 'image',
        position: { x: 0.1, y: 0.2, width: 0.35, height: 0.6 },
        zIndex: 2
      },
      {
        type: 'image',
        position: { x: 0.55, y: 0.2, width: 0.35, height: 0.6 },
        zIndex: 2
      }
    ],
    maxElements: 2,
    allowBackgroundChange: true,
    allowLabels: true
  },
  {
    id: 'triple_showcase',
    name: 'Triple Showcase',
    aspectRatio: { width: 16, height: 9 },
    canvasSize: { width: 1920, height: 1080 },
    defaultElements: [
      {
        type: 'image',
        position: { x: 0.05, y: 0.2, width: 0.28, height: 0.6 },
        zIndex: 2
      },
      {
        type: 'image',
        position: { x: 0.36, y: 0.2, width: 0.28, height: 0.6 },
        zIndex: 2
      },
      {
        type: 'image',
        position: { x: 0.67, y: 0.2, width: 0.28, height: 0.6 },
        zIndex: 2
      }
    ],
    maxElements: 3,
    allowBackgroundChange: true,
    allowLabels: true
  },
  {
    id: 'portrait_single',
    name: 'Portrait Single',
    aspectRatio: { width: 9, height: 16 },
    canvasSize: { width: 1080, height: 1920 },
    defaultElements: [
      {
        type: 'image',
        position: { x: 0.2, y: 0.3, width: 0.6, height: 0.4 },
        zIndex: 2
      }
    ],
    maxElements: 1,
    allowBackgroundChange: true,
    allowLabels: true
  },
  {
    id: 'square_grid',
    name: 'Square Grid (2x2)',
    aspectRatio: { width: 1, height: 1 },
    canvasSize: { width: 1200, height: 1200 },
    defaultElements: [
      {
        type: 'image',
        position: { x: 0.05, y: 0.05, width: 0.4, height: 0.4 },
        zIndex: 2
      },
      {
        type: 'image',
        position: { x: 0.55, y: 0.05, width: 0.4, height: 0.4 },
        zIndex: 2
      },
      {
        type: 'image',
        position: { x: 0.05, y: 0.55, width: 0.4, height: 0.4 },
        zIndex: 2
      },
      {
        type: 'image',
        position: { x: 0.55, y: 0.55, width: 0.4, height: 0.4 },
        zIndex: 2
      }
    ],
    maxElements: 4,
    allowBackgroundChange: true,
    allowLabels: true
  }
];

export const DEFAULT_COLLAGE_CONFIG: CollageConfig = {
  presets: COLLAGE_PRESETS,
  defaultPresetId: 'single_product',
  exportOptions: {
    format: 'png',
    quality: 0.95,
    includeLabels: true,
    backgroundColor: '#ffffff'
  }
};

export const getPresetById = (id: string): CollagePreset | undefined => {
  return COLLAGE_PRESETS.find(preset => preset.id === id);
};

export const getDefaultPreset = (): CollagePreset => {
  return getPresetById(DEFAULT_COLLAGE_CONFIG.defaultPresetId) || COLLAGE_PRESETS[0];
};