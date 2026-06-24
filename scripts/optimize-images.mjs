import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const assetsDir = join(process.cwd(), 'assets');
const maxBytes = 600 * 1024;
const oversized = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (/\.(png|jpg|jpeg|webp)$/i.test(entry) && stats.size > maxBytes) {
      oversized.push({ file: fullPath, size: stats.size });
    }
  }
}

if (existsSync(assetsDir)) {
  walk(assetsDir);
}

if (oversized.length) {
  console.warn('Large images found. Compress these before production deploy:');
  oversized.forEach(item => {
    console.warn(`- ${item.file} (${Math.round(item.size / 1024)} KB)`);
  });
  process.exitCode = 1;
} else {
  console.log('Image size check passed.');
}
