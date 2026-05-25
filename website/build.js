import { readFileSync, writeFileSync, cpSync, rmSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { resolve } from 'path';
import { minify as minifyHtml } from 'html-minifier-terser';

const SRC = resolve('website');
const OUT = resolve('website-dist');

rmSync(OUT, { recursive: true, force: true });
cpSync(SRC, OUT, { recursive: true, filter: (src) => !src.endsWith('build.js') });

const flags = { stdio: 'inherit' };

execSync(`bun x cleancss -o "${OUT}/style.css" "${OUT}/style.css"`, flags);

execSync(`bun x terser "${OUT}/main.js" -o "${OUT}/main.js" --compress --mangle`, flags);

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

for (const file of ['index.html', 'index-zh.html', 'index-ru.html', 'index-ar.html', 'index-es.html', 'index-hi.html', 'PRIVACY_POLICY.html']) {
  const fp = resolve(OUT, file);
  if (existsSync(fp)) {
    writeFileSync(fp, await minifyHtml(readFileSync(fp, 'utf-8'), htmlOpts));
  }
}
