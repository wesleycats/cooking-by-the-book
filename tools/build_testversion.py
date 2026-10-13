#!/usr/bin/env python3
"""Build the public test version of Cooking by the Book (GitHub Pages, folder docs/).

  python3 tools/build_testversion.py SRC_DIR docs --recipes recipes.json --config config/tester.json

SRC_DIR   index.html, styles.css, app.js as published in the artifact (Artifact read with path)
recipes   JSON with {"recipes": [...]} (ArtifactData list recipes, or receptenbank.json)
config    {"endpoint": "https://script.google.com/macros/s/.../exec"}   (null until the Apps Script is deployed:
          the app then keeps everything in its queue on the phone and sends it once a build with an endpoint is live)

Output (docs/): the same app + testkit.js (stands in for Claude's runtime: recipes read-only, progress on the phone,
tester mode), recipes.json and the dashboard for Wes (dashboard.html + vendor/qrcode.js).
"""
import argparse, json, os, re, shutil, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SKELETON = ('<!doctype html><html lang="nl"><head><meta charset=utf8><meta name=viewport content="width=device-width,'
            'initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex"><meta name="theme-color" content="#2f6b3a"><link rel="icon" type="image/svg+xml" href="icons/icon.svg"><link rel="icon" type="image/png" sizes="48x48" href="icons/favicon-48.png"><link rel="apple-touch-icon" href="icons/apple-touch-icon-180.png">'
            '<style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:'
            'env(safe-area-inset-bottom,0px)}html{scroll-padding-top:env(safe-area-inset-top,0px)}body{margin:0;padding:0;'
            'font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#fff;color:#000}img{max-width:100%}'
            '[hidden]:not([hidden=until-found i]){display:none!important}</style></head><body>')

TESTKIT = r"""/* testkit.js: stands in for the Claude runtime in the public test version.
   recipes: read-only snapshot; everything else (progress, stats) the app already keeps in localStorage.
   window.__CBTB_TESTER__ switches the app into tester mode (see "test version" in app.js). */
(() => {
  const RECIPES = __RECIPES__;
  const snap = docs => ({ docs: docs.map(d => ({ id: d.id, data: () => JSON.parse(JSON.stringify(d)), metadata: { hasPendingWrites: false } })) });
  const readOnly = () => Promise.reject({ code: 'invalid_argument', message: 'Alleen-lezen in de testversie' });
  const coll = path => ({
    onSnapshot(cb) { setTimeout(() => cb(snap(path === 'recipes' ? RECIPES : [])), 0); return () => {}; },
    doc(id) { return {
      id,
      set: path.startsWith('data/users/') ? async () => {} : readOnly,
      update: path.startsWith('data/users/') ? async () => {} : readOnly,
      delete: path.startsWith('data/users/') ? async () => {} : readOnly,
      async get() { const d = path === 'recipes' ? RECIPES.find(r => r.id === id) : null; return { exists: !!d, id, data: () => d && JSON.parse(JSON.stringify(d)) }; } }; },
    async add() { return readOnly(); }
  });
  window.__CBTB_TESTER__ = __CONFIG__;
  window.claude = { use: async k => k === 'db' ? { collection: coll } : k === 'user' ? { can: async () => false, id: async () => 'local', isOwner: async () => false, canEdit: async () => false } : null };
})();
"""

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('src'); ap.add_argument('out'); ap.add_argument('--recipes', required=True); ap.add_argument('--config', required=True)
    a = ap.parse_args()
    data = json.load(open(a.recipes, encoding='utf8'))
    recipes = data.get('recipes', data) if isinstance(data, dict) else data
    recipes = [r for r in recipes if not r.get('id', '').startswith('_')]
    cfg = json.load(open(a.config, encoding='utf8'))
    endpoint = cfg.get('endpoint')
    assert endpoint is None or re.match(r'^https://script\.google\.com/macros/s/[\w-]+/exec$', endpoint), 'endpoint moet een Apps Script /exec-URL zijn'
    tester = {'endpoint': endpoint, 'build': datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}
    if os.path.isdir(a.out): shutil.rmtree(a.out)
    os.makedirs(a.out)
    html = open(os.path.join(a.src, 'index.html'), encoding='utf8').read()
    if re.search(r'<head[\s>]', html):                     # published copy already wrapped: keep only the content
        html = html.split('<body>', 1)[1].rsplit('</body>', 1)[0]
    html = html.replace('<title>Cooking by the Book</title>', '<title>Cooking by the Book · Proefkeuken</title>')
    html = html.replace('<script src="app.js"></script>', '<script src="testkit.js"></script>\n<script src="app.js"></script>')
    assert 'testkit.js' in html, 'app.js script tag not found'
    open(os.path.join(a.out, 'index.html'), 'w', encoding='utf8').write(SKELETON + html + '</body></html>\n')
    for f in ('styles.css', 'app.js'): shutil.copy(os.path.join(a.src, f), os.path.join(a.out, f))
    kit = TESTKIT.replace('__RECIPES__', json.dumps(recipes, ensure_ascii=False)).replace('__CONFIG__', json.dumps(tester, ensure_ascii=False))
    open(os.path.join(a.out, 'testkit.js'), 'w', encoding='utf8').write(kit)
    json.dump({'recipes': [{k: r.get(k) for k in ('id', 'title', 'variant', 'minutes', 'steps')} for r in recipes]},
              open(os.path.join(a.out, 'recipes.json'), 'w', encoding='utf8'), ensure_ascii=False)
    for f in ('dashboard.html', 'dashboard.webmanifest', 'dashboard-sw.js'): shutil.copy(os.path.join(ROOT, 'dashboard', f), os.path.join(a.out, f))
    shutil.copytree(os.path.join(ROOT, 'dashboard', 'vendor'), os.path.join(a.out, 'vendor'))
    shutil.copytree(os.path.join(ROOT, 'icon'), os.path.join(a.out, 'icons'), ignore=shutil.ignore_patterns('voorbeeld.png'))
    open(os.path.join(a.out, '.nojekyll'), 'w').close()       # GitHub Pages: serve files as they are
    print(f'testversie: {len(recipes)} recepten, {"endpoint gekoppeld" if endpoint else "nog geen endpoint (alles wacht in de wachtrij op de telefoon)"}, build {tester["build"]}')

if __name__ == '__main__':
    main()
