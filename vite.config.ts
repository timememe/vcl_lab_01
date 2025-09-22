import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    return {
      plugins: [react()],
      css: {
        postcss: './postcss.config.js',
      },
      server: {
        host: '0.0.0.0',
        port: parseInt(process.env.PORT || '5173'),
        allowedHosts: ['vcl-lab-01.onrender.com', 'localhost', '127.0.0.1']
      },
      preview: {
        host: '0.0.0.0',
        port: parseInt(process.env.PORT || '4173'),
        allowedHosts: ['vcl-lab-01.onrender.com', 'localhost', '127.0.0.1']
      },
      define: {
        // Use environment variables from Render or local .env files
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY),
        'process.env.OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY || process.env.OPENAI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
