import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    sentryVitePlugin({
      org: "your-org",
      project: "packstack"
    }),
  ],
  
  // Path aliases resolution
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/containers': path.resolve(__dirname, './src/containers'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/queries': path.resolve(__dirname, './src/queries'),
    },
  },
  
  // WSL2 specific configuration
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // Allow connections from Windows host
    cors: true,
    hmr: {
      clientPort: 5173,
    },
  },
});
