#!/usr/bin/env node
/**
 * Creates a clean source zip using `git archive`.
 *
 * IMPORTANT: Only committed files are included in the zip.
 * If you have uncommitted changes, run `git add -A && git commit` first,
 * or use `git stash` / stage selectively before running this script.
 *
 * Excluded automatically (via .gitattributes export-ignore):
 *   node_modules/   dist/   .git/   *.zip   .env   coverage/
 *
 * Output: <parent-directory>/income-tax-calculator-source.zip
 *
 * Usage:  npm run zip
 */

import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { statSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const outputPath = resolve(projectRoot, '..', 'income-tax-calculator-source.zip');

console.log('Creating clean source zip...');
console.log();
console.log('  NOTE: Only committed files are included.');
console.log('  Commit any pending changes before zipping if you want them included.');
console.log();

try {
  execSync(
    `git archive --worktree-attributes --format=zip --output="${outputPath}" HEAD`,
    { cwd: projectRoot, stdio: 'inherit' }
  );

  const { size } = statSync(outputPath);
  const kb = Math.round(size / 1024);

  console.log();
  console.log(`Created: ${outputPath} (${kb} KB)`);
  console.log();
  console.log('Verify the zip does NOT contain: node_modules/ dist/ .git/ *.zip .env');
  console.log('Recipient must run `npm install` after extracting.');
} catch (err) {
  console.error('Failed to create zip:', err.message);
  console.error('Ensure git is installed and this directory is a git repository.');
  process.exit(1);
}
