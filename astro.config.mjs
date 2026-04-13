import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://dashcam.byteflowers.com',
  build: {
    format: 'directory',
  },
  devToolbar: {
    enabled: false,
  },
});
