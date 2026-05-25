import { readFileSync, writeFileSync, cpSync, rmSync, readdirSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { minify as minifyHtml } from 'html-minifier-terser';

const SRC = resolve('website');
const OUT = resolve('website-dist');

rmSync(OUT, { recursive: true, force: true });
cpSync(SRC, OUT, { recursive: true, filter: (src) => !src.endsWith('build.js') });

const flags = { stdio: 'inherit' };

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const platformDir = readdirSync(resolve(root, 'node_modules', '@minify-selectors')).find((d) =>
  d.startsWith(process.platform)
);
if (!platformDir) throw new Error(`No minify-selectors binary for ${process.platform}`);
const msBin = resolve(
  root,
  'node_modules',
  '@minify-selectors',
  platformDir,
  'bin',
  'minify-selectors'
);

execSync(`"${msBin}" --input "${OUT}" --output "${OUT}"`, flags);

execSync(`npx cleancss -o "${OUT}/style.css" "${OUT}/style.css"`, flags);

execSync(`npx terser "${OUT}/main.js" -o "${OUT}/main.js" --compress --mangle`, flags);

const htmlOpts = {
  collapseWhitespace: true,
  removeComments: true,
  collapseBooleanAttributes: true,
  removeRedundantAttributes: true,
  removeEmptyAttributes: true,
  removeAttributeQuotes: true,
  minifyCSS: false,
  minifyJS: false,
};

for (const file of ['index.html', 'PRIVACY_POLICY.html']) {
  const fp = resolve(OUT, file);
  if (existsSync(fp)) {
    writeFileSync(fp, await minifyHtml(readFileSync(fp, 'utf-8'), htmlOpts));
  }
}
