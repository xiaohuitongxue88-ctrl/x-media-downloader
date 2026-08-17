import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_SOURCE_ORDER = Object.freeze([
  'src/00-bootstrap.js',
  'src/core/config.js',
  'src/core/utils.js',
  'src/core/evidence.js',
  'src/media/tweet-context.js',
  'src/media/dom-collector.js',
  'src/media/fiber-collector.js',
  'src/media/performance-collector.js',
  'src/media/media-collector.js',
  'src/media/recovery.js',
  'src/download/download-manager.js',
  'src/ui/icons.js',
  'src/ui/styles.js',
  'src/ui/floating-trigger.js',
  'src/ui/media-picker.js',
  'src/ui/task-center.js',
  'src/ui/progress-dock.js',
  'src/enhancer/dom-router.js',
  'src/enhancer/ad-filter.js',
  'src/enhancer/sensitive-media.js',
  'src/enhancer/spam-filter.js',
  'src/support/support-prompt.js',
  'src/99-main.js'
]);

export function buildUserscript({
  rootDir = process.cwd(),
  outputFile = path.join(rootDir, 'dist', 'x-media-downloader.user.js'),
  sourceOrder = DEFAULT_SOURCE_ORDER
} = {}) {
  const chunks = [];
  for (const relativePath of sourceOrder) {
    const fullPath = path.join(rootDir, relativePath);
    if (!fs.existsSync(fullPath)) continue;
    chunks.push(fs.readFileSync(fullPath, 'utf8').replace(/\s+$/u, ''));
  }

  if (chunks.length === 0) {
    throw new Error('没有可构建的 XMD 源文件。');
  }

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, `${chunks.join('\n\n')}\n`, 'utf8');
  return { outputFile, files: chunks.length };
}

function main() {
  const result = buildUserscript();
  console.log(`XMD Build: ${result.files} files -> ${result.outputFile}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
