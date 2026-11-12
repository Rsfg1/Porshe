// Generates one landing page per tour: tours/<slug>.json -> dist/<slug>/index.html
// A tour file with "extends": "<slug>" is an A/B variant: it inherits that tour and overrides top-level fields.
import { readFile, writeFile, mkdir, readdir, copyFile, cp, rm } from 'node:fs/promises';
import { render } from './src/template.mjs';

// SITE_ENV=prod merges site.prod.json over site.config.json (own domain: lead endpoint, canonical, robots, sitemap)
const env = process.env.SITE_ENV;
const cfg = { ...JSON.parse(await readFile('site.config.json', 'utf8')), ...(env ? JSON.parse(await readFile(`site.${env}.json`, 'utf8')) : {}) };
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
// temporary switcher (only when site.config.json has "tourNav": true) lists main tours only (A/B variants excluded), in schedule order
const nav = tours.filter((t) => !t.extends).sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
  .map((t) => ({ slug: t.slug, name: t.name, when: t.when || '', sold: (t.departures || []).filter((d) => d.status === 'sold').map((d) => d.label) }));
const links = [];
for (const tour of tours) {
  await mkdir(`dist/${tour.slug}`, { recursive: true });
  await writeFile(`dist/${tour.slug}/index.html`, render(tour, cfg, cfg.tourNav ? nav : []));
  links.push(`<li><a href="./${tour.slug}/index.html">${tour.name}</a></li>`);
  console.log(`built dist/${tour.slug}/index.html`);
}

if (cfg.homeRedirect) {
  // own domain: the home page sends visitors to one tour (301 via .htaccess, meta refresh as a fallback)
  await writeFile('dist/index.html', `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0; url=/${cfg.homeRedirect}/"><title>${cfg.brand}</title><a href="/${cfg.homeRedirect}/">${cfg.brand}</a>`);
  await writeFile('dist/.htaccess', `RewriteEngine On\nRewriteRule ^$ /${cfg.homeRedirect}/ [R=301,L]\n`);
} else {
  await writeFile('dist/index.html', `<!doctype html><meta charset="utf-8">${cfg.siteUrl ? '<meta name="robots" content="noindex">' : ''}<title>Посадочные страницы</title><ul>${links.join('')}</ul>`);
}

if (cfg.siteUrl) {
  // only main tours go to the sitemap; A/B variants point their canonical to the main page
  const day = new Date().toISOString().slice(0, 10);
  const urls = tours.filter((t) => !t.extends).map((t) => `<url><loc>${cfg.siteUrl}/${t.slug}/</loc><lastmod>${day}</lastmod></url>`);
  await writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
  await writeFile('dist/robots.txt', `User-agent: *\nDisallow: /lead.php\nClean-param: utm_source&utm_medium&utm_campaign&utm_content&utm_term&yclid&gclid\n\nSitemap: ${cfg.siteUrl}/sitemap.xml\n`);
}
