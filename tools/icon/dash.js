// Dashboard-icoon (Proefkeuken · testoverzicht): zelfde familie als het app-icoon (goud lint, wit, groen, r 224),
// maar donker en een staafdiagram, zodat je het op je beginscherm direct van de kookapp onderscheidt.
//   node tools/icon/dash.js <uitmap>
const sharp = require('sharp'), fs = require('fs'), path = require('path');
const D1 = '#24302A', D2 = '#111812', W = '#F6F8F4', L = '#8FBF8F', Y = '#E8A317', Y2 = '#B97E08', G = '#2F6B3A';

// drie staven op een basislijn; de hoogste in het goud van de bladwijzer uit het app-icoon
const mark = `
  <rect x="226" y="548" width="148" height="236" rx="34" fill="${L}"/>
  <rect x="438" y="410" width="148" height="374" rx="34" fill="${W}"/>
  <rect x="650" y="262" width="148" height="522" rx="34" fill="${Y}"/>
  <rect x="650" y="262" width="148" height="44" rx="22" fill="${Y2}" opacity=".55"/>
  <rect x="186" y="806" width="652" height="36" rx="18" fill="${W}" opacity=".9"/>`;
const bg = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${D1}"/><stop offset="1" stop-color="${D2}"/></linearGradient></defs>`;
const svg = ({ rounded = true, scale = 1 } = {}) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${bg}
  ${rounded ? '<rect width="1024" height="1024" rx="224" fill="url(#g)"/>' : '<rect width="1024" height="1024" fill="url(#g)"/>'}
  <g transform="translate(512 512) scale(${scale}) translate(-512 -552)">${mark}</g></svg>`;
module.exports = { svg };

if (require.main === module) (async () => {
  const out = process.argv[2] || 'icon/dashboard'; fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'dash-icon.svg'), svg());
  const r = (src, size, name) => sharp(Buffer.from(src)).resize(size, size).png().toFile(path.join(out, name));
  await r(svg(), 512, 'dash-icon-512.png'); await r(svg(), 192, 'dash-icon-192.png');
  await r(svg({ rounded: false, scale: 0.78 }), 512, 'dash-maskable-512.png'); await r(svg({ rounded: false, scale: 0.78 }), 192, 'dash-maskable-192.png');
  await r(svg({ rounded: false }), 180, 'dash-apple-touch-180.png'); await r(svg(), 48, 'dash-favicon-48.png');
  console.log('ok', out);
})();
