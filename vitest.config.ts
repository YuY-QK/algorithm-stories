import { defineConfig } from 'vitest/config';

export default defineConfig({
  // 引擎测试会跑几千组随机输入，CI 或机器忙时可能超过默认的 5 秒
  test: { include: ['tests/**/*.test.ts'], testTimeout: 30_000 },
});
