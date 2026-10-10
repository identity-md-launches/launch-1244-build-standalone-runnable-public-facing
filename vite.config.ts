import path from 'node:path';

// Optional external toolchain path is used only by the constrained build worker.
// Normal npm ci installs resolve through the project's own node_modules.
const external = process.env.AIMARKET_DEPENDENCY_ROOT;
export default {
  base: './',
  esbuild: { jsx: 'automatic' },
  resolve: external
    ? {
        alias: [
          { find: /^react-dom(\/.*)?$/, replacement: `${path.join(external, 'react-dom')}$1` },
          { find: /^react(\/.*)?$/, replacement: `${path.join(external, 'react')}$1` },
        ],
      }
    : undefined,
  build: { outDir: 'dist', sourcemap: false },
};
