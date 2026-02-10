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
        allowedHosts: ['vcl-lab-01.onrender.com', 'localhost', '127.0.0.1'],
        proxy: {
          '/api': {
            target: 'http://localhost:4000',
            changeOrigin: true
          }
        }
      },
      preview: {
        host: '0.0.0.0',
        port: parseInt(process.env.PORT || '4173'),
        allowedHosts: ['vcl-lab-01.onrender.com', 'localhost', '127.0.0.1']
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              three: ['three', '@react-three/fiber', '@react-three/postprocessing', 'postprocessing']
            }
          }
        }
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, 'src'),
        }
      }
    };
});
