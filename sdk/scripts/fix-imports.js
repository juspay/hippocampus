/**
 * Post-build script: adds .js extensions to relative imports in compiled output.
 * This allows TypeScript source to use clean extensionless imports while
 * producing Node.js ESM-compatible output.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;

const RELATIVE_IMPORT = /(from\s+['"])(\.\.?\/[^'"]*?)(['"])/g;

async function fixFile(filePath) {
  const content = await readFile(filePath, 'utf-8');
  const fixed = content.replace(RELATIVE_IMPORT, (match, pre, specifier, post) => {
    if (specifier.endsWith('.js') || specifier.endsWith('.json')) return match;
    return `${pre}${specifier}.js${post}`;
  });
  if (fixed !== content) {
    await writeFile(filePath, fixed, 'utf-8');
  }
}

const files = await readdir(DIST);
for (const file of files) {
  if (file.endsWith('.js') || file.endsWith('.d.ts')) {
    await fixFile(join(DIST, file));
  }
}
