import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  const rawMapsKey =
    env.VITE_GOOGLE_MAPS_API_KEY ||
    env.GOOGLE_MAPS_API_KEY ||
    env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    env.VITE_MAPS_API_KEY ||
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.VITE_MAPS_API_KEY ||
    '';
  const cleanedKey = rawMapsKey.trim().replace(/^["']|["']$/g, '');
  const mapsApiKey = cleanedKey === 'MY_GOOGLE_MAPS_API_KEY' ? '' : cleanedKey;

  return {
    plugins: [react(), tailwindcss()],
    define: {
      __GMP_API_KEY__: JSON.stringify(mapsApiKey),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
