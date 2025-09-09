<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# VCL Lab 01 - AI Image Generation App

Professional AI-powered image generation tool with support for multiple AI models and various image transformation categories.

## Features

- **Multiple AI Models**: Google Gemini and OpenAI GPT-Image-1
- **6 Generation Categories**: Product photos, model products, concept art, storyboards, angle changes, and model reskins
- **Multi-language Support**: Russian, English, and Japanese
- **Professional Interface**: Step-by-step workflow with intuitive navigation
- **Advanced Options**: Consistency reference images, custom prompts, and preset styles

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

## Project Structure

```
├── components/          # React components
├── contexts/           # React contexts (localization)
├── i18n/              # Translation files
├── services/          # AI service integrations
├── public/            # Static assets
├── App.tsx            # Main application component
├── constants.tsx      # Category configurations
└── types.ts           # TypeScript type definitions
```

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS
- **AI Services:** Google Gemini API, OpenAI API
- **Internationalization:** Custom i18n implementation

## Contributing

This project is developed by [VCL Technology](https://vcl.studio). For issues or feature requests, please contact the development team.
