<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# VCL Lab 01 - AI Image Generation App

Professional AI-powered image generation tool with support for multiple AI models, interactive collage creation, and various image transformation categories.

## 🎯 Key Features

### **Dual Mode Product Photography**
- **Single Product Mode**: Text-to-image generation with advanced prompt controls
- **Collage Mode**: Interactive multi-product compositions with drag-drop canvas
- **Seamless Toggle**: One-click switching between modes

### **Interactive Collage System**
- **Visual Upload Grid**: 2x2 interactive slots for image upload
- **Inline Text Editing**: Add descriptions directly on images
- **6 Product-Specific Presets**: Hero shots, comparisons, lineups, showcases, social formats
- **Real-time Canvas**: Live preview with drag-drop positioning
- **Smart Text Rendering**: Stylized labels under products in final output

### **AI Integration**
- **Multiple AI Models**: Google Gemini and OpenAI GPT-Image-1
- **Enhanced Prompting**: Automatic prompt generation from collage data and settings
- **7 Generation Categories**: Product photos, collages, model products, concept art, storyboards, angle changes, and model reskins
- **Professional Results**: High-quality commercial photography style outputs

### **User Experience**
- **Multi-language Support**: Russian, English, and Kazakh
- **Loading Animation**: Custom dombra.gif animation during AI processing
- **Professional Interface**: Step-by-step workflow with intuitive navigation
- **Advanced Options**: Background management, lighting styles, camera angles, and custom prompts

## Local Development

**Prerequisites:** Node.js 18+

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env.local` file in the root directory:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) in your browser

## Deployment on Render

### Environment Variables Setup

In your Render dashboard, add the following environment variables:

- `GEMINI_API_KEY`: Your Google Gemini API key
- `OPENAI_API_KEY`: Your OpenAI API key

### Build Settings

- **Build Command:** `npm run build`
- **Start Command:** `npm start`
- **Node Version:** 18 or higher

### Port Configuration

The app is configured to:
- Listen on all interfaces (`0.0.0.0`)
- Use Render's `$PORT` environment variable
- Fallback to port 5173 for development

The app will automatically use environment variables from Render's deployment environment.

## 🏗️ Project Structure

```
├── components/              # React components
│   ├── collage/            # Collage system components
│   │   ├── CollageCanvas.tsx        # Interactive canvas with drag-drop
│   │   ├── CollageCreator.tsx       # Main collage interface
│   │   ├── ProductCollageCreator.tsx # Enhanced Product Photography
│   │   ├── InteractiveUploadGrid.tsx # Visual upload interface
│   │   ├── BackgroundManager.tsx    # Background controls
│   │   └── ElementLabels.tsx        # Label management
│   ├── category-specific/  # Category-specific forms
│   └── ui/                # UI components
├── services/               # Service layer
│   ├── collagePresets.ts   # Collage layout presets
│   ├── collageExport.ts    # PNG export functionality
│   ├── collageAiService.ts # AI integration for collages
│   └── aiService.ts        # Main AI service
├── types/                  # TypeScript definitions
│   └── collage.ts         # Collage-specific types
├── contexts/              # React contexts (localization)
├── i18n/                  # Translation files (RU/EN/KK)
├── public/                # Static assets
│   └── load_dombra.gif    # Custom loading animation
├── App.tsx                # Main application
├── constants.tsx          # Category configurations
└── types.ts              # Core type definitions
```

## 🎨 Workflow Examples

### **Single Product Photography**
1. Select "Product Photography" category
2. Choose product type from dropdown (smartphone, laptop, etc.)
3. Configure style settings (camera angle, concept, background, lighting)
4. Add custom requirements
5. Generate professional product photo from text

### **Multi-Product Collage**
1. Select "Product Photography" → "Switch to Collage Mode"
2. Choose layout preset (Hero Shot, Comparison, Lineup, etc.)
3. Upload images via interactive 2x2 grid
4. Add text descriptions inline on each image
5. Adjust positioning with drag-drop canvas
6. Generate AI-enhanced collage composition

### **Background & Style Customization**
- **Backgrounds**: White, black, gradient, studio, natural, minimalist
- **Lighting**: Soft, dramatic, bright, golden hour, professional studio
- **Camera Angles**: Default, top-down, 45°, close-up
- **Concepts**: Warm & natural, modern & clean, isolated, lifestyle

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS
- **AI Services:** Google Gemini API, OpenAI API
- **Internationalization:** Custom i18n implementation

## Contributing

This project is developed by [VCL Technology](https://vcl.studio). For issues or feature requests, please contact the development team.
