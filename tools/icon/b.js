// Definitief icoon: B · pan op het vuur met gouden bladwijzer
const sharp = require('sharp'), fs = require('fs');
const G1 = '#377A44', G2 = '#2A5F33', D = '#1F4A27', W = '#F6F8F4', W2 = '#E3EADF', Y = '#E8A317', Y2 = '#B97E08', Y3 = '#F7D27A';

const flame = (cx, base, h, w) => {
  const p = (H, Wd, col) => `<path d="M${cx} ${base} C ${cx - Wd * 1.05} ${base}, ${cx - Wd * 1.1} ${base - H * 0.55}, ${cx - Wd * 0.2} ${base - H} C ${cx - Wd * 0.05} ${base - H * 0.78}, ${cx + Wd * 0.25} ${base - H * 0.7}, ${cx + Wd * 0.35} ${base - H * 0.6} C ${cx + Wd * 0.5} ${base - H * 0.72}, ${cx + Wd * 0.62} ${base - H * 0.8}, ${cx + Wd * 0.6} ${base - H * 0.9} C ${cx + Wd * 1.2} ${base - H * 0.55}, ${cx + Wd * 1.05} ${base}, ${cx} ${base} Z" fill="${col}"/>`;
  const core = `<path d="M${cx} ${base} C ${cx - w * 0.5} ${base}, ${cx - w * 0.5} ${base - h * 0.32}, ${cx} ${base - h * 0.5} C ${cx + w * 0.5} ${base - h * 0.32}, ${cx + w * 0.5} ${base}, ${cx} ${base} Z" fill="${Y3}"/>`;
  return p(h, w, Y) + core;
};

// alles op een raster van 1024; vormen met dezelfde afronding (r 30)
const mark = `
  <!-- steel: lang, licht omhoog -->
  <g transform="rotate(-10 760 434)"><rect x="752" y="408" width="270" height="52" rx="26" fill="${W}"/><circle cx="986" cy="434" r="12" fill="${G2}"/></g>
  <!-- koekenpan: ondiep, schuine wanden -->
  <path d="M226 440 H 798 L 742 568 Q 730 600 690 600 H 334 Q 294 600 282 568 Z" fill="${W}"/>
  <rect x="204" y="408" width="616" height="52" rx="26" fill="${W}"/>
  <rect x="236" y="421" width="552" height="20" rx="10" fill="${D}"/>
  <path d="M226 460 H 798 L 791 478 H 233 Z" fill="${W2}"/>
  <!-- bladwijzer, gevouwen over de rand -->
  <path d="M330 400 h 96 v 22 h -96 Z" fill="${Y2}"/>
  <path d="M330 422 h 96 v 262 l -48 -40 l -48 40 Z" fill="${Y}"/>
  <!-- vuur -->
  ${flame(404, 850, 160, 54)}${flame(512, 850, 205, 66)}${flame(620, 850, 160, 54)}`;

const bg = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${G1}"/><stop offset="1" stop-color="${G2}"/></linearGradient></defs>`;
let TX = -71, TY = -78;
const setOffset = (x, y) => { TX = x; TY = y; };
const svg = ({ rounded = true, scale = 0.9 } = {}) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${bg}
  ${rounded ? '<rect width="1024" height="1024" rx="224" fill="url(#g)"/>' : '<rect width="1024" height="1024" fill="url(#g)"/>'}
  <g transform="translate(512 512) scale(${scale}) translate(-512 -512) translate(${TX} ${TY})">${mark}</g></svg>`;
const MAP = { '#F6F8F4': '#000000', '#E3EADF': '#000000', '#1F4A27': '#FFFFFF', '#2A5F33': '#FFFFFF', '#B97E08': '#FFFFFF', '#E8A317': '#000000', '#F7D27A': '#FFFFFF' };
const mono = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">` + svg().split('<rect width="1024" height="1024" rx="224" fill="url(#g)"/>')[1]
  .replace(/fill="(#[0-9A-F]{6})"/g, (m, c) => `fill="${MAP[c] || c}"`)
  .replace(/<path d="M330 420([^"]*)" fill="#000000"/, '<path d="M330 420$1" fill="#FFFFFF" stroke="#000000" stroke-width="16" stroke-linejoin="round"')
  .replace(/(<path d="M330 398[^"]*" fill="#FFFFFF")/, '$1 stroke="#000000" stroke-width="16"');
module.exports = { svg, mono: () => mono, setOffset };
if (require.main === module) (async () => {
  fs.rmSync('b-out', { recursive: true, force: true }); fs.mkdirSync('b-out');
  const files = { 'icon.svg': svg(), 'icon-maskable.svg': svg({ rounded: false, scale: 0.8 }), 'icon-play-store.svg': svg({ rounded: false, scale: 0.86 }), 'icon-monochrome.svg': mono };
  for (const [f, c] of Object.entries(files)) fs.writeFileSync('b-out/' + f, c);
  const r = (src, size, name) => sharp(Buffer.from(src)).resize(size, size).png().toFile('b-out/' + name);
  await r(svg(), 1024, 'icon-1024.png'); await r(svg(), 512, 'icon-512.png'); await r(svg(), 192, 'icon-192.png');
  await r(svg({ rounded: false, scale: 0.86 }), 512, 'play-store-512.png');
  await r(svg({ rounded: false, scale: 0.8 }), 512, 'maskable-512.png'); await r(svg({ rounded: false, scale: 0.8 }), 192, 'maskable-192.png');
  await r(svg({ rounded: false }), 180, 'apple-touch-icon-180.png');
  await r(svg(), 48, 'favicon-48.png'); await r(svg(), 32, 'favicon-32.png');
  const data = s => 'data:image/svg+xml;base64,' + Buffer.from(s).toString('base64');
  const old = fs.readFileSync('final/B2.svg', 'utf8');
  const others = ['#3A6EA5', '#D9534F', '#F0F0F0', '#222831', '#7B61FF', '#F2A65A', '#4CAF50'];
  let home = ''; for (let r2 = 0; r2 < 2; r2++) for (let c = 0; c < 4; c++) { const x = 860 + c * 120, y = 470 + r2 * 140; home += (r2 === 0 && c === 2) ? `<image href="${data(svg())}" x="${x}" y="${y}" width="86" height="86"/><text x="${x + 43}" y="${y + 112}" text-anchor="middle" font-family="sans-serif" font-size="15" fill="#fff">Cooking</text>` : `<rect x="${x}" y="${y}" width="86" height="86" rx="20" fill="${others[(r2 * 4 + c) % 7]}"/><rect x="${x + 18}" y="${y + 104}" width="50" height="9" rx="4" fill="#ffffff55"/>`; }
  const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="800"><defs><clipPath id="c" clipPathUnits="objectBoundingBox"><circle cx=".5" cy=".5" r=".5"/></clipPath></defs>
   <rect width="1400" height="800" fill="#F6F8F4"/>
   <text x="40" y="58" font-family="sans-serif" font-size="32" font-weight="800" fill="#1C2419">Definitief · Pan op het vuur met gouden bladwijzer</text>
   <image href="${data(svg())}" x="40" y="100" width="340" height="340"/>
   <text x="40" y="472" font-family="sans-serif" font-size="18" fill="#5D6B57">Nieuw</text>
   <image href="${data(old)}" x="420" y="240" width="200" height="200"/>
   <text x="420" y="472" font-family="sans-serif" font-size="18" fill="#5D6B57">Vorige versie</text>
   <image href="${data(files['icon-maskable.svg'])}" x="680" y="100" width="150" height="150" clip-path="url(#c)"/><text x="680" y="276" font-family="sans-serif" font-size="16" fill="#5D6B57">Android rond</text>
   <image href="${data(files['icon-play-store.svg'])}" x="870" y="100" width="150" height="150"/><text x="870" y="276" font-family="sans-serif" font-size="16" fill="#5D6B57">Play Store (vierkant)</text>
   <rect x="1060" y="100" width="150" height="150" rx="20" fill="#fff" stroke="#D9E1D3"/><image href="${data(mono)}" x="1085" y="125" width="100" height="100"/><text x="1060" y="276" font-family="sans-serif" font-size="16" fill="#5D6B57">Zwart-wit</text>
   ${[96, 64, 48, 32].map((s, i) => `<image href="${data(svg())}" x="${680 + [0, 120, 210, 285][i]}" y="${330 + (96 - s) / 2}" width="${s}" height="${s}"/>`).join('')}
   <text x="680" y="460" font-family="sans-serif" font-size="16" fill="#5D6B57">96 · 64 · 48 · 32 px</text>
   <rect x="40" y="510" width="760" height="250" rx="24" fill="#121711"/>
   <image href="${data(svg())}" x="80" y="545" width="180" height="180"/>
   ${[64, 40].map((s, i) => `<image href="${data(svg())}" x="${300 + i * 100}" y="${605 - s / 2 + 30}" width="${s}" height="${s}"/>`).join('')}
   <text x="80" y="752" font-family="sans-serif" font-size="16" fill="#9AAB93">Donkere modus</text>
   <rect x="830" y="440" width="530" height="320" rx="30" fill="#2B3A4A"/>${home}</svg>`;
  await sharp(Buffer.from(sheet)).png().toFile('definitief.png');
  console.log('ok');
})();
