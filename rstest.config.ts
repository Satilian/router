import { defineConfig } from '@rstest/core';
import { withRslibConfig } from '@rstest/adapter-rslib';

export default defineConfig({
  extends: withRslibConfig(),
  include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  testEnvironment: 'happy-dom',
});
