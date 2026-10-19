// Generates one landing page per tour: tours/<slug>.json -> dist/<slug>/index.html
// A tour file with "extends": "<slug>" is an A/B variant: it inherits that tour and overrides top-level fields.
import { readFile, writeFile, mkdir, readdir, copyFile, cp, rm } from 'node:fs/promises';
import { render } from './src/template.mjs';

const cfg = JSON.parse(await readFile('site.config.json', 'utf8'));
const files = (await readdir('tours')).filter((f) => f.endsWith('.json'));
const raw = Object.fromEntries(
  await Promise.all(files.map(async (f) => [f.replace(/\.json$/, ''), JSON.parse(await readFile(`tours/${f}`, 'utf8'))]))
);
const resolve = (t) => (t.extends ? { ...resolve(raw[t.extends]), ...t } : t);

await rm('dist', { recursive: true, force: true });
await mkdir('dist/assets', { recursive: true });
await cp('assets', 'dist/assets', { recursive: true });
const css = (await readFile('src/fonts.css', 'utf8')) + (await readFile('src/styles.css', 'utf8'));
await writeFile('dist/assets/styles.css', css);
await copyFile('src/app.js', 'dist/assets/app.js');

const tours = Object.values(raw).map(resolve);
// temporary switcher lists main tours only (A/B variants excluded), in schedule order
const nav = tours.filter((t) => !t.extends).sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
  .map((t) => ({ slug: t.slug, name: t.name, when: t.when || '' }));
const links = [];
for (const tour of tours) {
  await mkdir(`dist/${tour.slug}`, { recursive: true });
  await writeFile(`dist/${tour.slug}/index.html`, render(tour, cfg, nav));
  links.push(`<li><a href="./${tour.slug}/index.html">${tour.name}</a></li>`);
  console.log(`built dist/${tour.slug}/index.html`);
}

await writeFile('dist/index.html', `<!doctype html><meta charset="utf-8"><title>Посадочные страницы</title><ul>${links.join('')}</ul>`);
