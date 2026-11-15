import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const html = readFileSync('index.html', 'utf8');
const app = readFileSync('js/app.js', 'utf8');
assert.match(html, /<html lang="en">/);
assert.match(app, /let LANG = 'en'/);
assert.match(html, /data-lang="es"/);
assert.match(html, /data-lang="en"/);
const resources = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)]
  .map(match => match[1]).filter(url => !/^(?:https?:|data:|mailto:)/.test(url));
for (const path of resources) assert.ok(existsSync(path), `Missing local asset: ${path}`);
for (const file of ['js/app.js', 'js/imagenes.js', 'lib/three.min.js', 'lib/OrbitControls.js', 'lib/astronomy.browser.min.js']) {
  new vm.Script(readFileSync(file, 'utf8'), { filename: file });
}
const context = vm.createContext({ console, window: { matchMedia: () => ({ matches: false }) }, localStorage: { getItem: () => null } });
vm.runInContext(readFileSync('lib/astronomy.browser.min.js', 'utf8'), context);
context.Astronomy = context.window.Astronomy;
const boundary = app.indexOf('const SIM3D =');
assert.ok(boundary > 0, 'Could not locate the calculation/renderer boundary');
vm.runInContext(app.slice(0, boundary), context);
const results = vm.runInContext(`(() => {
  HZ.init();
  state.win = 3;
  state.sc.a.start = Date.UTC(2026, 10, 15);
  const results = [];
  for (const site of SITES) {
    Object.assign(state.sc.a, {site: site.id, lat: site.lat, lon: site.lon, terrain: true});
    compute('a');
    const d = data.a;
    results.push({site: site.id, ...d.stats, operationHours: d.op.h,
      finite: ['sunEl','earthEl','sunAz','earthAz','batt'].every(key => Array.from(d[key]).every(Number.isFinite))});
  }
  return { language: LANG, results, coverageStart: HZ.T0, coverageEnd: HZ.T1 };
})()`, context, { timeout: 90000 });
assert.equal(results.language, 'en');
assert.equal(results.results.length, 14);
for (const item of results.results) {
  assert.ok(item.finite, `Nonfinite values: ${item.site}`);
  for (const key of ['sun','earth','both']) assert.ok(item[key] >= 0 && item[key] <= 1);
  assert.ok(item.both <= Math.min(item.sun, item.earth));
  assert.ok(item.operationHours >= 0 && Number.isFinite(item.operationHours));
}
vm.runInContext(readFileSync('js/imagenes.js', 'utf8'), context);
const tiles = vm.runInContext('Object.entries(TERRAIN_TILES).map(([id,t]) => ({id,w:t.w,h:t.h,step:t.step}))', context);
for (const tile of tiles) {
  assert.equal(Buffer.from(tile.h, 'base64').length, tile.w * tile.w * 2, `Invalid terrain grid: ${tile.id}`);
  assert.ok(tile.step > 0);
}
const images = vm.runInContext('[IMG_MOON,IMG_POLE,IMG_LOLA,IMG_EARTH,IMG_HERO,IMG_LUZ,IMG_TIERRA,IMG_FA,IMG_FB,IMG_SUELO]', context);
for (const image of images) {
  assert.match(image, /^data:image\/(?:png|jpeg|webp);base64,/);
  assert.ok(Buffer.from(image.split(',')[1], 'base64').length > 100);
}
console.log(JSON.stringify({syntax:'passed',localAssets:resources.length,defaultLanguage:'en',spanishSelector:true,
  computedSites:results.results.length,terrainTiles:tiles.length,embeddedImages:images.length,
  limitation:'Runtime invariants and packaging checks only; not an independent scientific validation or a browser/WebGL test.'},null,2));
