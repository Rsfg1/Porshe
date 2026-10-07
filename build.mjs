// Generates one landing page per tour: tours/<slug>.json -> dist/<slug>/index.html
import { readFile, writeFile, mkdir, readdir, copyFile, rm } from 'node:fs/promises';
import { render } from './src/template.mjs';

const cfg = JSON.parse(await readFile('site.config.json', 'utf8'));
const files = (await readdir('tours')).filter((f) => f.endsWith('.json'));

await rm('dist', { recursive: true, force: true });
await mkdir('dist/assets', { recursive: true });
await copyFile('src/styles.css', 'dist/assets/styles.css');
await copyFile('src/app.js', 'dist/assets/app.js');

const links = [];
for (const f of files) {
  const tour = JSON.parse(await readFile(`tours/${f}`, 'utf8'));
  await mkdir(`dist/${tour.slug}`, { recursive: true });
  await writeFile(`dist/${tour.slug}/index.html`, render(tour, cfg));
  links.push(`<li><a href="./${tour.slug}/">${tour.name}</a></li>`);
  console.log(`built dist/${tour.slug}/index.html`);
}

await writeFile(
  'dist/index.html',
  `<!doctype html><meta charset="utf-8"><title>Посадочные страницы</title><ul>${links.join('')}</ul>`
);
