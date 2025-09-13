import { CollagePreset } from '../types/collage';

export const PRODUCT_COLLAGE_PRESETS: CollagePreset[] = [
  {
    id: 'single_hero_product',
    name: 'Hero Product Shot',
    aspectRatio: { width: 16, height: 9 },
    canvasSize: { width: 1920, height: 1080 },
    defaultElements: [
      {
        type: 'image',
        position: { x: 0.35, y: 0.15, width: 0.3, height: 0.7 },
        zIndex: 2
      }
    ],
    maxElements: 1,
    allowBackgroundChange: true,
    allowLabels: true
  },
  {
    id: 'product_comparison_duo',
    name: 'Product Comparison',
    aspectRatio: { width: 16, height: 9 },
    canvasSize: { width: 1920, height: 1080 },
    defaultElements: [
      {
        type: 'image',
        position: { x: 0.15, y: 0.2, width: 0.3, height: 0.6 },
        zIndex: 2
      },
      {
        type: 'image',
        position: { x: 0.55, y: 0.2, width: 0.3, height: 0.6 },
        zIndex: 2
      }
    ],
    maxElements: 2,
    allowBackgroundChange: true,
    allowLabels: true
  },
  {
    id: 'product_lineup_triple',
    name: 'Product Lineup (3)',
    aspectRatio: { width: 16, height: 9 },
    canvasSize: { width: 1920, height: 1080 },
    defaultElements: [
      {
        type: 'image',
        position: { x: 0.05, y: 0.25, width: 0.25, height: 0.5 },
        zIndex: 2
      },
      {
        type: 'image',
        position: { x: 0.375, y: 0.15, width: 0.25, height: 0.7 },
        zIndex: 3
      },
      {
        type: 'image',
        position: { x: 0.7, y: 0.25, width: 0.25, height: 0.5 },
        zIndex: 2
      }
    ],
    maxElements: 3,
    allowBackgroundChange: true,
    allowLabels: true
  },
  {
    id: 'product_showcase_quad',
    name: 'Product Showcase (4)',
    aspectRatio: { width: 16, height: 9 },
    canvasSize: { width: 1920, height: 1080 },
    defaultElements: [
      {
        type: 'image',
        position: { x: 0.1, y: 0.1, width: 0.35, height: 0.35 },
        zIndex: 2
      },
      {
        type: 'image',
        position: { x: 0.55, y: 0.1, width: 0.35, height: 0.35 },
        zIndex: 2
      },
      {
        type: 'image',
        position: { x: 0.1, y: 0.55, width: 0.35, height: 0.35 },
        zIndex: 2
      },
      {
        type: 'image',
        position: { x: 0.55, y: 0.55, width: 0.35, height: 0.35 },
        zIndex: 2
      }
    ],
    maxElements: 4,
    allowBackgroundChange: true,
    allowLabels: true
  },
  {
    id: 'product_social_square',
    name: 'Social Media Square',
    aspectRatio: { width: 1, height: 1 },
    canvasSize: { width: 1080, height: 1080 },
    defaultElements: [
      {
        type: 'image',
        position: { x: 0.2, y: 0.2, width: 0.6, height: 0.6 },
        zIndex: 2
      }
    ],
    maxElements: 1,
    allowBackgroundChange: true,
    allowLabels: true
  },
  {
    id: 'product_social_story',
    name: 'Social Story (9:16)',
    aspectRatio: { width: 9, height: 16 },
    canvasSize: { width: 1080, height: 1920 },
    defaultElements: [
      {
        type: 'image',
        position: { x: 0.15, y: 0.3, width: 0.7, height: 0.4 },
        zIndex: 2
      }
    ],
    maxElements: 1,
    allowBackgroundChange: true,
    allowLabels: true
  }
];

export const getProductPresetById = (id: string): CollagePreset | undefined => {
  return PRODUCT_COLLAGE_PRESETS.find(preset => preset.id === id);
};

export const getDefaultProductPreset = (): CollagePreset => {
  return PRODUCT_COLLAGE_PRESETS[0]; // Hero Product Shot
};