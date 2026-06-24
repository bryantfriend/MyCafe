import { spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const ignored = new Set(['node_modules', '.git', '.codex-publish']);
const files = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (ignored.has(entry)) continue;
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (/\.(js|mjs|cjs)$/.test(entry)) {
      files.push(fullPath);
    }
  }
}

walk(root);

const failures = [];
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {
    encoding: 'utf8',
    shell: false
  });
  if (result.status !== 0) {
    failures.push({
      file: relative(root, file),
      stderr: result.stderr || result.stdout
    });
  }
}

if (failures.length) {
  failures.forEach(failure => {
    console.error(`\n${failure.file}\n${failure.stderr}`);
  });
  process.exit(1);
}

console.log(`Checked ${files.length} JavaScript files.`);
