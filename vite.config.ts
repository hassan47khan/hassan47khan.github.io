import { defineConfig } from 'vite';

// A user site, served from the domain root: https://hassan47khan.github.io/
export default defineConfig({
  base: '/',
  build: {
    // Keep the photos and the ad as real files rather than inlined data URIs.
    assetsInlineLimit: 0,
  },
});
