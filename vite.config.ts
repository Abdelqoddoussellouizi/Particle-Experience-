import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    glsl({
      include: ['**/*.glsl', '**/*.vert', '**/*.frag'],
      minify: false,
      watch: true,
    }),
  ],
  server: {
    port: 5173,
    strictPort: false,
    host: true,
  },
  build: {
    target: 'esnext',
    sourcemap: false,
    // three.js + postprocessing + drei form one unavoidably large vendor
    // chunk for a single-page WebGL hero; splitting it further wouldn't
    // reduce total payload, just add more round trips.
    chunkSizeWarningLimit: 1800,
  },
});
