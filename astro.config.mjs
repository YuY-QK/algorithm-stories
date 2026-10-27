import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';

// GitHub Pages 项目站点：https://yuy-qk.github.io/algorithm-stories/
// 预览版（preview 分支）构建时设 SITE_BASE=/algorithm-stories/preview，放在子路径下
export default defineConfig({
  site: 'https://yuy-qk.github.io',
  base: process.env.SITE_BASE ?? '/algorithm-stories',
  trailingSlash: 'always',
  integrations: [vue()],
});
