# Collage Module Documentation

## Overview
The Collage Module is a comprehensive system for creating, editing, and AI-enhancing collages within the VCL Lab application. It provides users with tools to compose multiple images, manage backgrounds, add labels, and export the final composition as PNG files for AI processing.

## Key Features

### 1. **Preset System**
- **Single Product**: 16:9 aspect ratio, single element
- **Product Comparison**: Side-by-side layout for 2 products
- **Triple Showcase**: Three-element horizontal layout
- **Portrait Single**: 9:16 aspect ratio for mobile/social
- **Square Grid**: 2x2 grid layout (1:1 aspect ratio)

### 2. **Interactive Canvas**
- Drag-and-drop element positioning
- Real-time preview with proper aspect ratios
- Visual feedback for selected elements
- Automatic element positioning for new uploads

### 3. **Background Management**
- Solid color backgrounds with preset and custom colors
- Image backgrounds with file upload
- Background labeling for AI context
- Live preview integration

### 4. **Element Labeling**
- Individual descriptions for each image element
- Quick-suggestion buttons for common labels
- Position and size information display
- Label integration with AI prompts

### 5. **AI Integration**
- Automatic prompt generation from collage data
- Integration with existing Gemini and OpenAI services
- Style variations (Professional, Lifestyle, Minimalist, Artistic, Luxury)
- Custom prompt support

### 6. **Export Functionality**
- High-resolution PNG export
- Configurable quality settings
- Metadata generation for AI processing
- Direct download capability

## File Structure

```
components/collage/
├── CollageCanvas.tsx      # Main canvas component with drag-drop
├── BackgroundManager.tsx  # Background color/image management
├── ElementLabels.tsx      # Element labeling interface
└── CollageCreator.tsx     # Main collage interface

services/
├── collagePresets.ts      # Preset definitions and management
├── collageExport.ts       # PNG export and composition
└── collageAiService.ts    # AI integration service

types/
└── collage.ts            # TypeScript interfaces and types
```

## Usage Flow

1. **Category Selection**: User selects "Collage" from main categories
2. **Preset Selection**: Choose from 5 predefined layout presets
3. **Image Upload**: Upload 1-4 images (depending on preset)
4. **Composition**: Drag elements to desired positions
5. **Background Setup**: Choose solid color or upload background image
6. **Labeling**: Add descriptions to elements and background
7. **AI Enhancement**: Generate enhanced version with custom prompts
8. **Export**: Download final PNG or view AI-generated results

## API Integration

### CollageAiService
```typescript
// Generate AI-enhanced collage
const result = await collageAiService.generateFromCollage(model, {
  collageState,
  customPrompt: "Make it professional",
  enhancePrompt: true
});

// Get style variations
const variations = collageAiService.getStyleVariations();
```

### CollageExportService
```typescript
// Export collage as PNG
const { blob, dataUrl, promptData } = await collageExportService.exportCollage(
  collageState,
  { format: 'png', quality: 0.95, includeLabels: true }
);
```

## Configuration

### Default Settings
- **Canvas Resolution**: 1920x1080 (16:9), 1080x1920 (9:16), 1200x1200 (1:1)
- **Export Quality**: 95%
- **Max Elements**: 1-4 depending on preset
- **Default Background**: White (#ffffff)

### Supported Formats
- **Input**: PNG, JPG, JPEG images
- **Output**: PNG with configurable quality
- **AI Models**: Gemini, OpenAI GPT-Image-1

## Localization Support

The module includes full translations for:
- **Russian (ru)**: Коллаж - Создание и AI-обработка коллажей
- **English (en)**: Collage - Create and AI-enhance collages
- **Kazakh (kk)**: Коллаж - Коллаждарды жасау және AI арқылы жақсарту

## Future Enhancements

Potential improvements for the collage module:
1. **Advanced Layouts**: Custom grid systems, circular arrangements
2. **Text Elements**: Direct text overlay support
3. **Layer Effects**: Shadows, borders, opacity controls
4. **Batch Processing**: Multiple collage variations
5. **Template Library**: Pre-designed layouts for different industries
6. **Collaboration**: Multi-user editing capabilities

## Integration Points

The collage module seamlessly integrates with:
- Main VCL application routing (`App.tsx`)
- Existing AI services (`aiService.ts`)
- Localization system (`i18n/locales.ts`)
- Category system (`constants.tsx`)
- File upload utilities
- Result display components