import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';

// GitHub Pages 项目站点：https://yuy-qk.github.io/algorithm-stories/
export default defineConfig({
  site: 'https://yuy-qk.github.io',
  base: '/algorithm-stories',
  trailingSlash: 'always',
  integrations: [vue()],
});
