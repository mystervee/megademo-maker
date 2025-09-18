import { defineConfig } from 'vite';
import { resolve, join } from 'node:path';
import { readdir, mkdir, copyFile, stat } from 'node:fs/promises';

async function copyDirectory(src, dest) {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const srcPath = join(src, entry.name);
      const destPath = join(dest, entry.name);
      if (entry.isDirectory()) {
        await copyDirectory(srcPath, destPath);
      } else if (entry.isFile()) {
        await copyFile(srcPath, destPath);
      }
    })
  );
}

function copyConfigPlugin() {
  return {
    name: 'copy-config-folder',
    apply: 'build',
    async generateBundle() {
      const sourceDir = resolve(process.cwd(), 'config');
      try {
        const stats = await stat(sourceDir);
        if (!stats.isDirectory()) return;
        const targetDir = resolve(process.cwd(), 'dist/config');
        await copyDirectory(sourceDir, targetDir);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
    }
  };
}

export default defineConfig({
  server: {
    port: 5173,
    open: true,
    fs: {
      allow: [resolve(process.cwd()), resolve(process.cwd(), 'config')]
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  plugins: [copyConfigPlugin()]
});

