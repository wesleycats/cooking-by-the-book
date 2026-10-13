"""Smoke test of the built test version and the dashboard.

  python3 tools/test_testversion.py DIST   (build DIST with a fake endpoint: https://script.google.com/macros/s/TEST/exec)

Checks: invite group from ?g=, nothing sent before consent, welcome → tester ID, events for opening/cooking steps,
feedback with context, automatic error capture, queue empties; dashboard (demo data) renders every tab without errors.
"""
import asyncio, json, os, re, sys, subprocess, time, urllib.parse
from playwright.async_api import async_playwright
DIST = os.path.abspath(sys.argv[1]); SHOTS = os.path.join(DIST, '..', 'shots-tv'); os.makedirs(SHOTS, exist_ok=True)
fails = []
def ok(n, c, d=''):
    print(('OK  ' if c else 'FOUT') + ' ' + n + ('' if c or not d else ' — ' + str(d)[:200]))
    if not c: fails.append(n)

async def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8765', '--bind', '127.0.0.1', '-d', DIST], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
    BASE = 'http://127.0.0.1:8765'
    async with async_playwright() as p:
        b = await getattr(p, os.environ.get('BROWSER', 'chromium')).launch()
        # ---------- de app voor testers ----------
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, color_scheme='dark')
        pg = await ctx.new_page(); errs = []; posts = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        server = {'status': 'active'}
        async def grab(route):
            if route.request.method == 'GET' and 'action=status' in route.request.url:
                await route.fulfill(status=200, body=json.dumps({'status': server['status']}), headers={'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}); return
            try: posts.append(json.loads(route.request.post_data or '{}'))
            except Exception: posts.append({})
            await route.fulfill(status=200, body='ok')
        await ctx.route('https://script.google.com/**', grab)
        await ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto(BASE + '/index.html?g=vrienden'); await pg.wait_for_timeout(2200)
        items = lambda: [i for p_ in posts for i in p_.get('items', [])]
        ok('niets verstuurd vóór akkoord', not posts, posts[:1])
        ok('welkomstkaart met privacytekst', await pg.locator('#tw').count() == 1 and await pg.locator('.tw-privacy').count() == 1)
        await pg.screenshot(path=os.path.join(SHOTS, 'welcome.png'))
        await pg.click('#tw-go'); await pg.wait_for_timeout(300)
        ok('zonder naam niet starten', await pg.locator('#tw').count() == 1)
        await pg.fill('#tw-name', 'Sanne'); await pg.click('#tw-go'); await pg.wait_for_timeout(1200)
        tid = await pg.evaluate("JSON.parse(localStorage.getItem('kb-tester-id'))")
        ok('test-ID gemaakt', bool(re.match(r'^SANNE-[A-Z0-9]{4}$', tid or '')), tid)
        ok('aanmelding verstuurd met naam, ID en groep', any(p_.get('tester') == {'id': tid, 'name': 'Sanne', 'group': 'vrienden'} for p_ in posts) and any(i['kind'] == 'aanmelding' for i in items()), posts[-1:] )
        ok('eerdere "open" gaat na akkoord alsnog mee', any(i['kind'] == 'open' for i in items()))
        ok('testmenu en nieuw recept verborgen', not await pg.locator('#test-btn').is_visible() and not await pg.locator('#new-btn').is_visible())
        await pg.click('.card'); await pg.wait_for_timeout(500)
        ok('geen bewerken/favoriet', await pg.locator('#rmore').count() == 0 and await pg.locator('#fav').count() == 0)
        await pg.click('#cook'); await pg.click('#ck-next'); await pg.click('#ck-next'); await pg.wait_for_timeout(300)
        await pg.click('#ck-more'); await pg.click('#ck-feedback'); await pg.wait_for_timeout(400)
        ok('feedback vanuit kookmodus toont test-ID', await pg.locator('.fb-sheet').count() == 1 and tid in await pg.inner_text('.fb-ctx'))
        await pg.click('[data-fbt="Werkt niet"]'); await pg.fill('#fb-msg', 'Timer piept niet')
        await pg.screenshot(path=os.path.join(SHOTS, 'feedback.png'))
        await pg.click('#fb-send'); await pg.wait_for_timeout(1200)
        fb = [i for i in items() if i['kind'] == 'feedback']
        ok('feedback komt aan met type, bericht en context', fb and fb[-1]['type'] == 'Werkt niet' and fb[-1]['message'] == 'Timer piept niet' and 'stap 1' in fb[-1]['context'] and tid in fb[-1]['context'], fb[-1:])
        # automatisch gevangen fout
        await pg.evaluate("setTimeout(() => { throw new Error('testfout uit rooktest') }, 0)"); await pg.wait_for_timeout(1200)
        fo = [i for i in items() if i['kind'] == 'fout']
        ok('JS-fout automatisch gemeld', fo and 'testfout uit rooktest' in fo[-1]['message'] and fo[-1]['screen'].startswith('kookmodus'), fo[-1:])
        for _ in range(9): await pg.evaluate("document.querySelector('#ck-next')?.click()"); await pg.wait_for_timeout(80)
        await pg.click('[data-star="4"]'); await pg.wait_for_timeout(300)
        await pg.click('#ck-close'); await pg.wait_for_timeout(300)
        await pg.evaluate("document.dispatchEvent(new Event('visibilitychange'))")
        await pg.evaluate("Object.defineProperty(document, 'visibilityState', {value: 'hidden', configurable: true}); document.dispatchEvent(new Event('visibilitychange'))")
        await pg.wait_for_timeout(2500)
        await pg.evaluate("Object.defineProperty(document, 'visibilityState', {value: 'hidden', configurable: true}); document.dispatchEvent(new Event('visibilitychange'))")
        await pg.wait_for_timeout(800)
        steps = sorted({i['i'] for i in items() if i['kind'] == 'stap'})
        ok('kookstappen gemeten (vragen, klaarzetten, stappen, eindscherm)', steps[:2] == [-2, -1] and max(steps) >= 6, steps)
        ok('kook_start, klaar en kook_dicht gemeten', {'kook_start', 'klaar', 'kook_dicht'} <= {i['kind'] for i in items()}, sorted({i['kind'] for i in items()}))
        se = [i for i in items() if i['kind'] == 'sessie']
        ok('sessie met sterren verstuurd', se and se[-1]['rating'] == 4, se[-1:])
        ok('wachtrij leeg', await pg.evaluate("JSON.parse(localStorage.getItem('kb-ev-queue')||'[]').length") == 0)
        await pg.reload(); await pg.wait_for_timeout(1000)
        ok('welkom niet opnieuw na herladen', await pg.locator('#tw').count() == 0)
        ok('ID blijft na herladen', await pg.evaluate("JSON.parse(localStorage.getItem('kb-tester-id'))") == tid)
        ok('app: geen JS-fouten (buiten de bewuste testfout)', not [e for e in errs if 'testfout' not in e], errs[:3])
        # offline: wachtrij houdt vast
        await ctx.set_offline(True)
        await pg.click('#fb-btn'); await pg.fill('#fb-msg', 'offline bericht'); await pg.click('#fb-send'); await pg.wait_for_timeout(800)
        q = await pg.evaluate("JSON.parse(localStorage.getItem('kb-ev-queue')||'[]').filter(i => i.kind === 'feedback').length")
        ok('offline: feedback blijft in de wachtrij', q == 1, q)
        await ctx.set_offline(False); await pg.evaluate("window.dispatchEvent(new Event('online'))"); await pg.wait_for_timeout(1200)
        ok('weer online: wachtrij verstuurd', any(i.get('message') == 'offline bericht' for i in items()))
        # verwijderd via het dashboard: de app merkt het en biedt een schone lei
        await pg.goto(BASE + '/index.html#recept-koreaanse-kip-gehaktbowl'); await pg.wait_for_timeout(3200)
        ok('recept openen zonder review: geen crash (bindReview)', not [e for e in errs if 'onchange' in e], errs[-2:])
        ok('actieve tester: geen pop-up', await pg.locator('#tr-root').count() == 0)
        server['status'] = 'deleted'
        await pg.goto(BASE + '/index.html'); await pg.wait_for_timeout(3200)
        ok('verwijderde tester: pop-up "opnieuw aanmelden"', await pg.locator('#tr-root #tr-go').count() == 1)
        await pg.screenshot(path=os.path.join(SHOTS, 'reset-popup.png'))
        await pg.click('#tr-go'); await pg.wait_for_timeout(1500)
        ok('na opnieuw aanmelden: schone lei met welkomstkaart', await pg.locator('#tw').count() == 1 and await pg.evaluate("localStorage.getItem('kb-tester-id') === null && localStorage.getItem('kb-stats') === null"))
        server['status'] = 'active'
        await ctx.close()
        # ---------- dashboard met voorbeelddata ----------
        for theme in ('light', 'dark'):
            ctx = await b.new_context(viewport={'width': 390, 'height': 844}, color_scheme=theme)
            pg = await ctx.new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
            await pg.goto(BASE + '/dashboard.html?demo'); await pg.wait_for_timeout(900)
            await pg.screenshot(path=os.path.join(SHOTS, f'{theme}-dash-overzicht.png'), full_page=True)
            ok(f'[{theme}] dashboard: kerncijfers', await pg.locator('.kpi').count() == 4)
            await pg.click('[data-tab="testers"]'); await pg.wait_for_timeout(200)
            ok(f'[{theme}] dashboard: testers', await pg.locator('.tester').count() == 5)
            await pg.screenshot(path=os.path.join(SHOTS, f'{theme}-dash-testers.png'), full_page=True)
            await pg.click('.tester'); await pg.wait_for_timeout(200)
            ok(f'[{theme}] dashboard: tester-tijdlijn', await pg.locator('.tl li.e').count() > 3)
            await pg.screenshot(path=os.path.join(SHOTS, f'{theme}-dash-tester.png'), full_page=True)
            # verwijderen: één tester (alleen testdata), meerdere (tester en alles), ongedaan maken, iedereen met VERWIJDER
            await pg.click('#t-del'); await pg.wait_for_timeout(150)
            ok(f'[{theme}] dashboard: verwijder-dialoog voor één tester', await pg.locator('.modal [name="del-scope"]').count() == 2)
            await pg.screenshot(path=os.path.join(SHOTS, f'{theme}-dash-delete.png'))
            await pg.click('#del-yes'); await pg.wait_for_timeout(250)
            ok(f'[{theme}] dashboard: alleen testdata → tester blijft', await pg.locator('.tester').count() == 5)
            await pg.click('#sel-on'); await pg.locator('.tester').nth(0).click(); await pg.locator('.tester').nth(1).click(); await pg.wait_for_timeout(100)
            ok(f'[{theme}] dashboard: selecteren toont actiebalk', '2 geselecteerd' in await pg.inner_text('.actbar'))
            await pg.click('#sel-del'); await pg.check('[name="del-scope"][value="all"]'); await pg.click('#del-yes'); await pg.wait_for_timeout(250)
            ok(f'[{theme}] dashboard: twee testers volledig verwijderd', await pg.locator('.tester').count() == 3)
            await pg.click('#undo'); await pg.wait_for_timeout(250)
            ok(f'[{theme}] dashboard: ongedaan maken zet ze terug', await pg.locator('.tester').count() == 5)
            await pg.click('#sel-on'); await pg.click('#sel-all'); await pg.click('#sel-del'); await pg.wait_for_timeout(100)
            ok(f'[{theme}] dashboard: iedereen verwijderen vraagt VERWIJDER', await pg.locator('#del-yes[disabled]').count() == 1)
            await pg.fill('#del-confirm', 'verwijder'); await pg.check('[name="del-scope"][value="all"]'); await pg.click('#del-yes'); await pg.wait_for_timeout(250)
            ok(f'[{theme}] dashboard: alles verwijderd → lege staat', await pg.locator('.tester').count() == 0)
            await pg.click('#undo'); await pg.wait_for_timeout(250)
            await pg.click('.tester')
            await pg.click('[data-tab="recepten"]'); await pg.wait_for_timeout(200)
            ok(f'[{theme}] dashboard: trechter per recept', await pg.locator('.funnel').count() >= 1)
            await pg.screenshot(path=os.path.join(SHOTS, f'{theme}-dash-recepten.png'), full_page=True)
            await pg.click('[data-tab="overzicht"]'); await pg.wait_for_timeout(200)
            ok(f'[{theme}] dashboard: beslislijst op overzicht', await pg.locator('.decide li').count() >= 3)
            ok(f'[{theme}] dashboard: navigatie onderin', await pg.evaluate("(() => { const n = document.querySelector('.bnav').getBoundingClientRect(); return n.bottom >= innerHeight - 1 && n.top > innerHeight - 120; })()"))
            await pg.click('[data-tab="feedback"]'); await pg.wait_for_timeout(200)
            n_open = await pg.locator('.item').count()
            first = pg.locator('.item').first
            ok(f'[{theme}] dashboard: P1 bovenaan bij sorteren op prioriteit', await first.locator('[data-p="P1"][aria-pressed="true"]').count() == 1)
            ok(f'[{theme}] dashboard: dubbele meldingen gegroepeerd', await pg.locator('.dup').count() >= 1)
            await pg.locator('.item').nth(1).locator('[data-p="P3"]').click(); await pg.wait_for_timeout(200)
            ok(f'[{theme}] dashboard: prioriteit aanpassen', await pg.evaluate("[...document.querySelectorAll('.item')].some(i => i.querySelector('[data-p=\\'P3\\'][aria-pressed=true]') && !i.querySelector('.prio.auto'))"))
            await pg.locator('.item:not(:has(.dup))').first.locator('select.st').select_option('opgelost'); await pg.wait_for_timeout(200)
            ok(f'[{theme}] dashboard: status opgelost haalt item uit "Open"', await pg.locator('.item').count() < n_open)
            await pg.click('[data-sort="new"]'); await pg.wait_for_timeout(150)
            ok(f'[{theme}] dashboard: sorteren op nieuwste', await pg.locator('[data-sort="new"][aria-pressed="true"]').count() == 1)
            await pg.click('[data-sort="prio"]')
            await pg.screenshot(path=os.path.join(SHOTS, f'{theme}-dash-feedback.png'), full_page=True)
            await pg.click('[data-tab="uitnodigen"]'); await pg.wait_for_timeout(200)
            await pg.fill('#grp', 'familie'); await pg.wait_for_timeout(100)
            ok(f'[{theme}] dashboard: uitnodigingslink per groep + QR', '?g=familie' in await pg.inner_text('#inv-url') and await pg.locator('#qr svg').count() == 1)
            await pg.screenshot(path=os.path.join(SHOTS, f'{theme}-dash-uitnodigen.png'), full_page=True)
            ok(f'[{theme}] dashboard: geen JS-fouten', not errs, errs[:3])
            await ctx.close()
        # ---------- dashboard met echte koppeling, terwijl de browser cross-origin fetch blokkeert ----------
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}); pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
        DATA = {'generated': '2026-10-13T12:00:00Z', 'testers': [{'id': 'WES-AAAA', 'name': 'Wes', 'group': 'test', 'first': '2026-10-13T10:00:00Z', 'last': '2026-10-13T11:00:00Z', 'dayList': '2026-10-13'}],
                'events': [], 'sessies': [], 'feedback': [{'fid': 'f1', 'at': '2026-10-13T11:00:00Z', 'tid': 'WES-AAAA', 'name': 'Wes', 'type': 'Werkt niet', 'message': 'test', 'screen': 's', 'rid': '', 'status': 'nieuw', 'prio': ''}], 'fouten': []}
        calls = []
        async def gas(route):
            u = route.request.url; calls.append(u)
            m = re.search(r'[?&]callback=([A-Za-z0-9_$]+)', u)
            if m: await route.fulfill(status=200, body=m.group(1) + '(' + json.dumps({'ok': True} if 'action=' in u else DATA) + ');', headers={'Content-Type': 'application/javascript'})
            else: await route.abort()   # zoals een adblocker of privacy-extensie: "Failed to fetch"
        await ctx.route('https://script.google.com/**', gas)
        await pg.goto(BASE + '/dashboard.html#k=KEY&u=' + urllib.parse.quote('https://script.google.com/macros/s/TEST/exec', safe='')); await pg.wait_for_timeout(3000)
        jsonp = lambda q: pg.evaluate(f"performance.getEntriesByType('resource').some(e => e.name.includes('callback=') && e.name.includes({json.dumps(q)}))")
        ok('dashboard: fetch geblokkeerd → toch geladen via reserve-methode (JSONP)', await pg.locator('.kpi').count() == 4 and 'Open P1\n1' in await pg.inner_text('.kpis') and await jsonp('key=KEY'))
        await pg.click('[data-tab="feedback"]'); await pg.wait_for_timeout(200)
        await pg.locator('.item').first.locator('[data-p="P2"]').click(); await pg.wait_for_timeout(500)
        ok('dashboard: ook opslaan gaat via de reserve-methode', await jsonp('action=mark'))
        ok('dashboard (echte koppeling): geen JS-fouten', not errs, errs[:2])
        await ctx.close()
        await b.close()
    srv.terminate()
    print(f'\n{"ALLES OK" if not fails else str(len(fails)) + " FOUT"}')

asyncio.run(main())
