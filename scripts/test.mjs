// Runs every *.test.ts under lib/ with Node's built-in test runner, transpiled by tsx.
// Node 20's `--test` does not glob, so the files are discovered here.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function findTests(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return findTests(path);
    return entry.name.endsWith('.test.ts') ? [path] : [];
  });
}

const files = findTests('lib');
if (files.length === 0) {
  console.error('No test files found under lib/');
  process.exit(1);
}

const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...files], {
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
