// Test van apps-script/Code.gs tegen een nagebootste Google-omgeving (Sheet, Properties, Cache, UrlFetch, Mail, Triggers).
//   node tools/test_apps_script.js apps-script/Code.gs
const fs = require('fs'), vm = require('vm');
const sheets = {}, notes = [], mails = [], triggers = [];
let ntfyStatus = 200;
// s7: nagebootste Linear-API (issues met "Dashboard:"-regels)
let linearIssues = [], linearStatus = 200, linearCalls = 0, linearAuth = null;
const colIdx = c => c.charCodeAt(0) - 65;
function mkSheet(name){ const rows = []; const trim = () => { while (rows.length > 1 && rows[rows.length - 1].every(v => v === '' || v == null)) rows.pop(); }; return {
  name, rows,
  getLastRow: () => rows.length,
  getRange(a, b, c, d){
    if (typeof a === 'string') {
      const col = a.match(/^([A-Z]):\1$/);
      if (col) return { createTextFinder: v => ({ matchEntireCell: () => ({ findNext: () => { const i = rows.findIndex(r => String(r[colIdx(col[1])]) === String(v)); return i < 0 ? null : { getRow: () => i + 1 }; } }) }) };
      const m = a.match(/^([A-Z])(\d+)$/);
      if (m) return { getValue: () => (rows[+m[2] - 1] || [])[colIdx(m[1])] ?? '', setValue(v){ rows[+m[2] - 1] = rows[+m[2] - 1] || []; rows[+m[2] - 1][colIdx(m[1])] = v; }, setDataValidation(){ return this; } };
      return { setFontWeight(){ return this; }, setDataValidation(){ return this; }, setBackground(){ return this; } };
    }
    const r0 = a - 1, c0 = b - 1, nr = c || 1, nc = d || 1;
    return {
      setValues(v){ for (let i = 0; i < v.length; i++) { rows[r0+i] = rows[r0+i] || []; for (let j = 0; j < v[i].length; j++) rows[r0+i][c0+j] = typeof v[i][j] === 'string' && v[i][j][0] === "'" ? v[i][j].slice(1) : v[i][j]; } return this; },
      clearContent(){ for (let i = 0; i < nr; i++) if (rows[r0+i]) for (let j = 0; j < nc; j++) rows[r0+i][c0+j] = ''; trim(); return this; },
      setValue(v){ rows[r0] = rows[r0] || []; rows[r0][c0] = v; return this; },
      getValue(){ return (rows[r0] || [])[c0]; },
      getValues(){ return [...Array(nr)].map((_, i) => [...Array(nc)].map((_, j) => (rows[r0+i] || [])[c0+j] ?? '')); },
      setFontWeight(){ return this; }, setBackground(){ return this; }, setNumberFormat(){ return this; },
      sort({ column, ascending }){ const part = rows.slice(r0, r0 + nr); part.sort((x, y) => { const a = x[column - 1], b = y[column - 1]; return (a > b ? 1 : a < b ? -1 : 0) * (ascending ? 1 : -1); }); rows.splice(r0, nr, ...part); return this; } }; },
  deleteRow(r){ rows.splice(r - 1, 1); },
  appendRow(r){ rows.push(r.map(v => typeof v === 'string' && v[0] === "'" ? v.slice(1) : v)); }, hideSheet(){}, getMaxRows: () => Math.max(rows.length, 1000), insertRowsBefore(r, n){ rows.splice(r - 1, 0, ...Array.from({ length: n }, () => [])); }, setFrozenRows(){}, clear(){ rows.length = 0; }, setColumnWidth(){} }; }
const ss = { setSpreadsheetTimeZone(){}, getSheetByName: n => sheets[n] || null, insertSheet: n => (sheets[n] = mkSheet(n)), getSheets: () => Object.values(sheets), deleteSheet(){} };
const props = {}, cache = {};
const ctx = {
  SpreadsheetApp: { getActive: () => ss, newDataValidation: () => { const b = { requireValueInList: () => b, requireNumberBetween: () => b, setHelpText: () => b, build: () => ({}) }; return b; } },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] ?? null, setProperty: (k, v) => props[k] = v }) },
  CacheService: { getScriptCache: () => ({ get: k => cache[k] ?? null, put: (k, v) => cache[k] = v, remove: k => { delete cache[k]; } }) },
  LockService: { getScriptLock: () => ({ waitLock(){}, releaseLock(){} }) },
  UrlFetchApp: { fetch: (u, o) => {
    if (u === 'https://api.linear.app/graphql') { linearCalls++; linearAuth = o.headers.Authorization; const body = linearStatus === 200 ? { data: { issues: { nodes: linearIssues, pageInfo: { hasNextPage: false, endCursor: null } } } } : { errors: [{ message: 'Authentication required' }] }; return { getResponseCode: () => linearStatus === 200 ? 200 : 400, getContentText: () => JSON.stringify(body) }; }
    const m = JSON.parse(o.payload); m._auth = (o.headers || {}).Authorization; if (ntfyStatus === 200) notes.push(m); return { getResponseCode: () => ntfyStatus, getContentText: () => ntfyStatus === 429 ? 'limit reached' : 'ok' }; } },
  MailApp: { sendEmail: m => mails.push(m) },
  Session: { getEffectiveUser: () => ({ getEmail: () => 'wes@example.com' }) },
  ScriptApp: { getProjectTriggers: () => triggers, newTrigger: h => ({ timeBased: () => ({ everyMinutes: n => ({ create: () => triggers.push({ getHandlerFunction: () => h, n }) }) }) }) },
  Utilities: { formatDate: (d, tz, f) => f === 'yyyy-MM-dd' ? d.toISOString().slice(0, 10) : f === 'yyyy-M-d H:m:s' ? (() => { const x = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' }).formatToParts(d).map(p => [p.type, p.value])); return `${+x.year}-${+x.month}-${+x.day} ${+x.hour}:${+x.minute}:${+x.second}`; })() : d.toISOString(), getUuid: () => Math.random().toString(16).slice(2) + 'abcdefgh', base64Encode: x => Buffer.from(x).toString('base64'), computeDigest: (a, s) => [...require('crypto').createHash('md5').update(s).digest()], DigestAlgorithm: { MD5: 1 } },
  ContentService: { createTextOutput: s => ({ s, setMimeType(){ return this; } }), MimeType: { TEXT: 1, JSON: 2, JAVASCRIPT: 3 } },
  console: { log(){}, warn(){}, error(){} }
};
vm.createContext(ctx); vm.runInContext(fs.readFileSync(process.argv[2], 'utf8'), ctx);
let fails = 0;
const assert = (c, m) => { console.log((c ? 'OK   ' : 'FOUT ') + m); if (!c) fails++; };
const post = b => ctx.doPost({ postData: { contents: JSON.stringify(b) } }).s;
const get = p => JSON.parse(ctx.doGet({ parameter: p }).s);
const T = { id: 'SANNE-7K3F', name: 'Sanne', group: 'vrienden' }, now = () => new Date().toISOString();

// ---------- setup ----------
ctx.setup();
assert(['Events', 'Feedback', 'Fouten', 'Instellingen', 'Sessies', 'Testers'].every(n => sheets[n]), 'setup maakt tabbladen');
assert(props.NTFY_TOPIC && props.DASHBOARD_KEY && notes.length === 1, 'setup: kanaal, sleutel en testmelding');
assert(triggers.length === 1 && triggers[0].getHandlerFunction() === 'digestVersturen', 'setup maakt de bundel-trigger');
ctx.setup(); assert(triggers.length === 1, 'opnieuw setup: geen dubbele trigger');
sheets.Instellingen.rows[3][1] = 'https://script.google.com/x/exec'; sheets.Instellingen.rows[6][1] = 'tk_abc123';
ctx.setup(); assert(sheets.Instellingen.rows[3][1] === 'https://script.google.com/x/exec' && sheets.Instellingen.rows[6][1] === 'tk_abc123', 'setup bewaart web-app-URL en token');
assert(String(sheets.Instellingen.rows[4][1]).startsWith('https://wesleycats.github.io/cooking-by-the-book/dashboard.html#k=' + props.DASHBOARD_KEY + '&u=https%3A%2F%2Fscript.google.com'), 'B5: dashboardlink als tekst (geen formule)');
sheets.Instellingen.rows[3][1] = 'https://script.google.com/macros/s/NIEUW/exec';
ctx.onEdit({ range: { getSheet: () => ({ getName: () => 'Instellingen' }), getRow: () => 4, getColumn: () => 2 } });
assert(String(sheets.Instellingen.rows[4][1]).includes('NIEUW'), 'B4 aanpassen werkt de link in B5 meteen bij');
sheets.Instellingen.rows[3][1] = 'https://script.google.com/x/exec'; ctx.onEdit({ range: { getSheet: () => ({ getName: () => 'Instellingen' }), getRow: () => 4, getColumn: () => 2 } });
assert(/^cb_1\(\{"error"/.test(ctx.doGet({ parameter: { key: 'fout', callback: 'cb_1' } }).s) && !/^x\(/.test(ctx.doGet({ parameter: { key: 'fout', callback: 'x);alert(1' } }).s), 'JSONP: callback werkt, onveilige naam geweigerd');
notes.length = 0;

// ---------- ontvangen ----------
const cell = (r, v) => { sheets.Instellingen.rows[r - 1][1] = v; };
const age = (key, h) => { const q = JSON.parse(props[key] || '[]'); q.forEach(x => x[2] -= h * 3600000); props[key] = JSON.stringify(q); };
assert(String(sheets.Instellingen.rows[8][1]) === '1' && String(sheets.Instellingen.rows[9][1]) === '6' && sheets.Instellingen.rows[7][1] === 'reserve', 'instellingen: urgent 1 uur, overig 6 uur, mail reserve');
assert(post({ tester: { id: 'bad' }, items: [] }) === 'bad tester', 'ongeldige tester geweigerd');
assert(post({ tester: T, version: 'v46', device: 'Android', size: '412×915', items: [{ kind: 'open', at: now() }, { kind: 'aanmelding', at: now() }, { kind: 'stap', at: now(), rid: 'r1', i: 0, n: 6, screen: 'kookmodus' }] }) === 'ok', 'batch aangenomen');
assert(sheets.Testers.rows.length === 2 && sheets.Testers.rows[1][0] === T.id, 'tester toegevoegd');
assert(sheets.Events.rows.length === 4 && sheets.Events.rows[1][3] === 'stap' && sheets.Events.rows[1][5] === 0 && sheets.Events.rows[3][3] === 'open', 'events: nieuwste bovenaan, met stapnummer');
assert(Object.prototype.toString.call(sheets.Events.rows[1][0]) === '[object Date]', 'events: tijd is een echte datum/tijd');
assert(notes.length === 0 && JSON.parse(props.Q_REST).length === 1, 'nieuwe tester: niet direct, in de overige bundel');

// ---------- urgent per uur, overig per 6 uur ----------
post({ tester: T, items: [
  { kind: 'feedback', at: now(), type: 'Werkt niet', message: 'Timer piept niet', screen: 's', context: 'c' },
  { kind: 'fout', at: now(), message: 'boem', source: 'app.js:1:1' }, { kind: 'fout', at: new Date(Date.now() + 5000).toISOString(), message: 'boem', source: 'app.js:1:1' },
  { kind: 'feedback', at: now(), type: 'Snap ik niet', message: 'waar is de pasta?' },
  { kind: 'sessie', at: now(), sid: 's1', rid: 'r1', title: 'Pasta', rating: 3, chips: ['Te zout'], adj: { 0: 30 } }] });
assert(sheets.Feedback.rows.length === 3 && sheets.Fouten.rows.length === 3, 'feedback en fouten opgeslagen');
assert(notes.length === 0 && JSON.parse(props.Q_URGENT).length === 2, 'urgent niet direct: werkt-niet + fout wachten (dubbele fout niet)');
ctx.digestVersturen({}); assert(notes.length === 0, 'trigger binnen het uur: nog niets');
age('Q_URGENT', 1.01); ctx.digestVersturen({});
assert(notes.length === 1 && /2 dringende/.test(notes[0].title) && notes[0].priority === 4 && /werkt niet/.test(notes[0].message) && notes[0].click.endsWith('&tab=feedback'), 'na 1 uur: één urgent bundelbericht');
assert(notes[0]._auth === 'Bearer tk_abc123', 'token wordt meegestuurd');
ctx.digestVersturen({}); assert(notes.length === 1, 'lege bundel: geen bericht');
age('Q_REST', 5.9); ctx.digestVersturen({}); assert(notes.length === 1, 'overig na 5,9 uur: nog niet');
age('Q_REST', 0.2); ctx.digestVersturen({});
assert(notes.length === 2 && /2 nieuwe meldingen/.test(notes[1].title) && notes[1].priority === 3, 'overig na 6 uur: één bundel (tester + snap ik niet)');
cell(9, '0,5'); post({ tester: T, items: [{ kind: 'feedback', at: now(), type: 'Werkt niet', message: 'x' }] }); age('Q_URGENT', 0.51); ctx.digestVersturen({});
assert(notes.length === 3, 'zelf instellen: urgent elke 0,5 uur werkt');
cell(10, 0); post({ tester: T, items: [{ kind: 'feedback', at: now(), type: 'Idee', message: 'meteen' }] });
assert(notes.length === 4 && /idee/.test(notes[3].title), 'overig op 0 = direct');
cell(9, 'abc'); post({ tester: T, items: [{ kind: 'feedback', at: now(), type: 'Werkt niet', message: 'y' }] });
assert(notes.length === 4, 'onzin in de cel: valt terug op 1 uur'); cell(9, 1); age('Q_URGENT', 1.01); ctx.digestVersturen({});

// ---------- mail: zelfde bundels ----------
ntfyStatus = 429; notes.length = 0; mails.length = 0;
post({ tester: T, items: [{ kind: 'feedback', at: now(), type: 'Werkt niet', message: 'knop doet niks' }] }); age('Q_URGENT', 1.01); ctx.digestVersturen({});
assert(notes.length === 0 && mails.length === 1 && /Proefkeuken/.test(mails[0].subject) && /429/.test(mails[0].body), 'ntfy-limiet (429): bundel per mail');
ntfyStatus = 200; cell(8, 'altijd');
post({ tester: T, items: [{ kind: 'feedback', at: now(), type: 'Werkt niet', message: 'z' }] }); age('Q_URGENT', 1.01); ctx.digestVersturen({});
assert(notes.length === 1 && mails.length === 2, 'mail "altijd": push én mail, zelfde bundel');
cell(8, 'nee'); ntfyStatus = 500;
post({ tester: T, items: [{ kind: 'feedback', at: now(), type: 'Werkt niet', message: 'q' }] }); age('Q_URGENT', 1.01); ctx.digestVersturen({});
assert(mails.length === 2, 'mail "nee": geen mail');
ntfyStatus = 200; cell(8, 'reserve'); ctx.digestVersturen(true);
props.PUSH_DAY = JSON.stringify({ d: new Date().toISOString().slice(0, 10), n: 60 }); mails.length = 0;
post({ tester: T, items: [{ kind: 'feedback', at: now(), type: 'Werkt niet', message: 'weer kapot' }] }); age('Q_URGENT', 1.01); ctx.digestVersturen({});
assert(mails.length === 1 && /dagbudget/.test(mails[0].body), 'eigen dagbudget op: per mail');
props.PUSH_DAY = '{}';

// ---------- sessies, dashboard ----------
post({ tester: T, items: [{ kind: 'sessie', at: now(), sid: 's1', rid: 'r1', title: 'Pasta', rating: 5, note: 'top' }] });
assert(sheets.Sessies.rows.length === 2 && sheets.Sessies.rows[1][9] === 5 && sheets.Sessies.rows[1][11] === 'top', 'sessie bijgewerkt (geen dubbele rij)');
post({ tester: T, items: [{ kind: 'feedback', at: '2030-01-01T10:00:00Z', type: 'Idee', message: 'nieuwste' }] });
assert(sheets.Feedback.rows[1][5] === 'nieuwste', 'feedback: nieuwste bovenaan');
sheets.Events.rows.push([new Date('2000-01-01'), 'X', 'x', 'oud', '', '', '', '']); ctx.setup();
assert(sheets.Events.rows[sheets.Events.rows.length - 1][3] === 'oud' && sheets.Events.rows[1][0] >= sheets.Events.rows[2][0], 'setup sorteert bestaande rijen: nieuwste bovenaan');
assert(get({ key: 'fout' }).error, 'dashboard zonder juiste sleutel geweigerd');
const d = get({ key: props.DASHBOARD_KEY });
assert(d.testers.length === 1 && d.feedback.length >= 4 && d.fouten.length === 2 && d.sessies.length === 1, 'dashboarddata compleet');
assert(get({ key: props.DASHBOARD_KEY, action: 'mark', tab: 'Feedback', id: d.feedback[0].fid, prio: 'P1', status: 'gepland' }).ok && sheets.Feedback.rows[1][10] === 'P1' && sheets.Feedback.rows[1][9] === 'gepland', 'prioriteit en status zetten');
assert(get({ key: props.DASHBOARD_KEY, action: 'mark', tab: 'Feedback', id: d.feedback[0].fid, status: 'kapot' }).error, 'onbekende status geweigerd');
notes.length = 0; ctx.testMelding(); assert(notes.length === 1 && /test/.test(notes[0].title), 'testMelding verstuurt');

// ---------- actieve dagen: datum-omzetting van Sheets ----------
sheets.Testers.rows[1][10] = new Date('2026-10-12T10:00:00Z');
post({ tester: T, items: [{ kind: 'open', at: now() }] });
assert(/^\d{4}-\d{2}-\d{2},\d{4}-\d{2}-\d{2}$/.test(sheets.Testers.rows[1][10]) && sheets.Testers.rows[1][5] === 2, 'actieve dagen: datum uit Sheets wordt weer tekst, geen dubbele telling');

// ---------- bewaren ----------
post({ tester: T, items: [{ kind: 'feedback', at: now(), type: 'Idee', message: 'bewaar mij' }, { kind: 'feedback', at: now(), type: 'Snap ik niet', message: 'niet doen ding' }, { kind: 'feedback', at: now(), type: 'Mooi', message: 'gepland ding' }] });
const fbId = msg => sheets.Feedback.rows.find(r => r[5] === msg)[0];
const kept = () => sheets.Bewaard.rows.slice(1);
const base = kept().length;   // eerder op 'gepland' gezet = al automatisch bewaard
assert(get({ key: props.DASHBOARD_KEY, action: 'keep', tab: 'Feedback', id: fbId('bewaar mij') }).ok && kept().length === base + 1 && kept()[0][7] === 'bewaar mij' && kept()[0][12] === 'ster', 'ster: melding bewaard');
get({ key: props.DASHBOARD_KEY, action: 'keep', tab: 'Feedback', id: fbId('bewaar mij') }); assert(kept().length === base + 1, 'twee keer bewaren: geen dubbele rij');
assert(!kept()[0].some(v => String(v).includes(T.id)), 'bewaard zonder tester-ID');
const m1 = get({ key: props.DASHBOARD_KEY, action: 'mark', tab: 'Feedback', id: fbId('niet doen ding'), status: 'niet doen' });
assert(m1.ok && m1.kept && kept().some(r => r[7] === 'niet doen ding' && r[11] === 'niet doen' && r[12] === 'niet doen'), '"niet doen" wordt automatisch bewaard');
get({ key: props.DASHBOARD_KEY, action: 'mark', tab: 'Feedback', id: fbId('gepland ding'), status: 'gepland', prio: 'P2' });
assert(kept().some(r => r[7] === 'gepland ding' && r[12] === 'gepland'), '"gepland" wordt automatisch bewaard');
get({ key: props.DASHBOARD_KEY, action: 'mark', tab: 'Feedback', id: fbId('gepland ding'), status: 'opgelost' });
assert(kept().find(r => r[7] === 'gepland ding')[11] === 'opgelost', 'status van het origineel volgt in Bewaard');
const bid = kept().find(r => r[7] === 'bewaar mij')[0];
assert(get({ key: props.DASHBOARD_KEY, action: 'mark', tab: 'Bewaard', id: bid, note: 'fixen in v48' }).ok && kept().find(r => r[0] === bid)[13] === 'fixen in v48', 'notitie bij bewaarde melding');
assert(get({ key: props.DASHBOARD_KEY }).bewaard.length === base + 3, 'dashboard krijgt de bewaarde meldingen');
assert(get({ key: props.DASHBOARD_KEY, action: 'unkeep', id: fbId('bewaar mij') }).ok && kept().length === base + 2, 'ster uit: niet meer bewaard');
get({ key: props.DASHBOARD_KEY, action: 'keep', tab: 'Feedback', id: fbId('bewaar mij') });
const rk = get({ key: props.DASHBOARD_KEY, action: 'delete', ids: T.id, scope: 'all' });
assert(rk.ok && kept().length === base + 3 && rk.removed.bewaardBlijft === base + 3, 'tester verwijderen: bewaarde meldingen blijven');
get({ key: props.DASHBOARD_KEY, action: 'undo', batch: rk.batch });
const rw = get({ key: props.DASHBOARD_KEY, action: 'delete', ids: T.id, scope: 'all', wipeKept: '1' });
assert(rw.ok && kept().length === 0, 'met vinkje: ook bewaarde meldingen van deze tester gewist');
get({ key: props.DASHBOARD_KEY, action: 'undo', batch: rw.batch });
assert(kept().length === base + 3 && sheets.Testers.rows.some(r => r[0] === T.id), 'ongedaan maken zet ook bewaarde meldingen terug');

// ---------- verwijderen ----------
const K = props.DASHBOARD_KEY, T2 = { id: 'JOOST-Q2MA', name: 'Joost', group: 'vrienden' };
post({ tester: T2, items: [{ kind: 'open', at: now() }, { kind: 'feedback', at: now(), type: 'Idee', message: 'joost idee' }] });
const count = (tab, id) => sheets[tab].rows.slice(1).filter(r => r[tab === 'Feedback' || tab === 'Fouten' ? 2 : tab === 'Testers' ? 0 : 1] === id).length;
assert(get({ action: 'status', id: T2.id }).status === 'active' && get({ action: 'status', id: 'NIEMAND-AAAA' }).status === 'unknown', 'status: actief / onbekend (zonder sleutel)');
assert(get({ action: 'delete', ids: T2.id, scope: 'data' }).error, 'verwijderen zonder sleutel geweigerd');
let r1 = get({ key: K, action: 'delete', ids: T2.id, scope: 'data' });
assert(r1.ok && count('Events', T2.id) === 0 && count('Feedback', T2.id) === 0 && count('Testers', T2.id) === 1 && count('Events', T.id) > 0, 'alleen testdata: data weg, tester blijft, andere tester onaangeroerd');
assert(get({ action: 'status', id: T2.id }).status === 'active', 'na alleen testdata: tester nog actief');
let r2 = get({ key: K, action: 'delete', ids: T2.id, scope: 'all' });
assert(r2.ok && count('Testers', T2.id) === 0 && get({ action: 'status', id: T2.id }).status === 'deleted', 'tester en alles: weg en gemarkeerd als verwijderd');
assert(post({ tester: T2, items: [{ kind: 'open', at: now() }] }) === 'deleted' && count('Testers', T2.id) === 0, 'verwijderde tester verschijnt niet terug');
assert(sheets.Prullenbak && sheets.Prullenbak.rows.length > 1, 'prullenbak gevuld');
const u = get({ key: K, action: 'undo', batch: r2.batch });
assert(u.ok && count('Testers', T2.id) === 1 && get({ action: 'status', id: T2.id }).status === 'active', 'ongedaan maken: tester terug en weer actief');
assert(get({ key: K, action: 'undo', batch: r1.batch }).ok && count('Feedback', T2.id) === 1, 'ongedaan maken van testdata: feedback terug');
const evBefore = sheets.Events.rows.length;
const r3 = get({ key: K, action: 'delete', ids: '*', scope: 'all' });
assert(r3.ok && r3.testers >= 2 && sheets.Testers.rows.length === 1 && sheets.Events.rows.length === 1 && sheets.Feedback.rows.length === 1, 'alles verwijderen: alle tabbladen leeg (kop blijft)');
assert(get({ action: 'status', id: T.id }).status === 'deleted', 'alles verwijderen: iedereen gemarkeerd');
assert(get({ key: K, action: 'undo', batch: r3.batch }).ok && sheets.Events.rows.length === evBefore && sheets.Testers.rows.length === 3, 'alles ongedaan maken: alles terug');

// ---------- opslaan betrouwbaar (13 okt) ----------
assert(/^s\d+$/.test(get({ key: K }).script), 'dashboard-data noemt de scriptversie (bv. s4)');
assert(get({ key: K }).api >= 3, 'dashboard-data noemt de API-versie (dashboard waarschuwt bij een oud script)');
assert(/Onbekende actie/.test(get({ key: K, action: 'bestaatniet' }).error || ''), 'onbekende actie geeft een fout, geen data');
const ids = [...Array(400)].map(() => ctx.shortId_());
assert(ids.every(x => /^[a-z][a-z0-9]{7}$/.test(x) && isNaN(Number(x))), 'ID\'s beginnen met een letter: Sheets maakt er nooit een getal van');
post({ tester: T, items: [{ kind: 'feedback', at: now(), type: 'Idee', message: 'notitie via bron' }] });
const srcId = sheets.Feedback.rows.slice(1).find(r => r[5] === 'notitie via bron')[0];
get({ key: K, action: 'keep', tab: 'Feedback', id: srcId });
assert(get({ key: K, action: 'mark', tab: 'Bewaard', id: srcId, note: 'via bron' }).ok && sheets.Bewaard.rows.some(r => r[1] === srcId && r[13] === 'via bron'), 'notitie lukt ook met de bron-ID (ster net gezet)');

// ---------- aanmelden met leesbaar antwoord (15 okt, s5) ----------
const H = { id: 'HALLO-K2M4', name: 'Hallo', group: 'vrienden' };
assert(get({ action: 'status', id: H.id }).status === 'unknown', 'hello: tester eerst onbekend');
const h1 = get({ action: 'hello', ...H, version: 'v50' });
assert(h1.status === 'active' && h1.isNew && count('Testers', H.id) === 1, 'hello: tester staat in Testers (zonder sleutel)');
assert(get({ action: 'hello', ...H }).isNew === false && count('Testers', H.id) === 1, 'hello: twee keer = nog steeds één rij');
post({ tester: H, items: [{ kind: 'open', at: now() }] });
assert(count('Testers', H.id) === 1, 'hello + events: geen dubbele rij');
assert(get({ action: 'hello', id: 'fout' }).status === 'unknown' && !sheets.Testers.rows.some(r => r[0] === 'fout'), 'hello: ongeldige ID wordt genegeerd');
get({ key: K, action: 'delete', ids: H.id, scope: 'all' });
assert(get({ action: 'hello', ...H }).status === 'deleted' && count('Testers', H.id) === 0, 'hello: verwijderde tester komt niet terug');
const H2 = { id: 'HALLO-P7Q9', name: 'Hallo', group: 'vrienden' };
assert(get({ action: 'hello', ...H2 }).status === 'active' && count('Testers', H2.id) === 1, 'opnieuw aangemeld met nieuwe ID: staat er weer in');

// ---------- s6: dubbele meldingen (PK-3) en lege meldingen (PK-6) ----------
const D = { id: 'DUBBEL-AB12', name: 'Dubbel', group: 'vrienden' };
const fbCount = msg => sheets.Feedback.rows.slice(1).filter(r => r[5] === msg).length;
const at1 = now();
post({ tester: D, items: [{ kind: 'feedback', eid: 'e1', at: at1, type: 'Idee', message: 'met eid' }] });
post({ tester: D, items: [{ kind: 'feedback', eid: 'e1', at: at1, type: 'Idee', message: 'met eid' }] });
assert(fbCount('met eid') === 1, 'PK-3: zelfde eid twee keer verstuurd = één melding');
post({ tester: D, items: [{ kind: 'feedback', eid: 'e2', at: at1, type: 'Idee', message: 'zelfde batch' }, { kind: 'feedback', eid: 'e2', at: at1, type: 'Idee', message: 'zelfde batch' }] });
assert(fbCount('zelfde batch') === 1, 'PK-3: dubbel binnen één batch = één melding');
const at2 = now();
post({ tester: D, items: [{ kind: 'feedback', at: at2, type: 'Idee', message: 'oude app' }] });
post({ tester: D, items: [{ kind: 'feedback', at: at2, type: 'Idee', message: 'oude app' }] });
assert(fbCount('oude app') === 1, 'PK-3: oude app zonder eid, zelfde tijd en bericht = één melding');
for (const k in cache) delete cache[k];   // cache leeg (Google ruimt die soms op): de Sheet vangt het
post({ tester: D, items: [{ kind: 'feedback', eid: 'e1', at: at1, type: 'Idee', message: 'met eid' }] });
assert(fbCount('met eid') === 1, 'PK-3: ook met lege cache geen dubbele (controle in de Sheet)');
post({ tester: D, items: [{ kind: 'feedback', eid: 'e3', at: new Date(Date.now() + 60000).toISOString(), type: 'Idee', message: 'met eid' }] });
assert(fbCount('met eid') === 2, 'PK-3: zelfde tekst later opnieuw gestuurd = wél een nieuwe melding');
const ev0 = sheets.Events.rows.length, ate = now();
post({ tester: D, items: [{ kind: 'stap', eid: 'e4', at: ate, rid: 'r1', i: 2 }] }); post({ tester: D, items: [{ kind: 'stap', eid: 'e4', at: ate, rid: 'r1', i: 2 }] });
assert(sheets.Events.rows.length === ev0 + 1, 'PK-3: gewone events ook ontdubbeld');
post({ tester: D, items: [{ kind: 'sessie', eid: 'e5', at: now(), sid: 'sx', rid: 'r1', title: 'Pasta', rating: 2 }, { kind: 'sessie', eid: 'e5', at: now(), sid: 'sx', rid: 'r1', title: 'Pasta', rating: 4 }] });
assert(sheets.Sessies.rows.filter(r => r[0] === 'sx').length === 1 && sheets.Sessies.rows.find(r => r[0] === 'sx')[9] === 4, 'sessies blijven bijwerken (geen ontdubbeling nodig)');
const fb0 = sheets.Feedback.rows.length, ev1 = sheets.Events.rows.length;
assert(post({ tester: D, items: [{}, null, { at: now() }, { kind: 'feedback', at: now(), type: '', message: '  ' }] }) === 'ok', 'PK-6: batch met lege items geeft geen fout');
assert(sheets.Feedback.rows.length === fb0 && sheets.Events.rows.length === ev1, 'PK-6: lege items en lege melding worden niet opgeslagen');
sheets.Feedback.rows.splice(1, 0, ['', '', '', '', '', '', '', '', '', '', '']);
assert(!get({ key: K }).feedback.some(f => !f.fid && !f.at && !f.message), 'PK-6: lege rij in de Sheet komt niet in het dashboard');
// opschonen: oude dubbelen (van vóór s6) en lege rijen
const oud = new Date('2026-10-16T11:48:31Z');
for (let k = 0; k < 3; k++) sheets.Feedback.rows.splice(2, 0, ['f' + k + 'xxxxxx', oud, D.id, 'Dubbel', 'Idee', 'Korte vragenlijst', 'start', '', '', 'nieuw', '']);
sheets.Fouten.rows.splice(1, 0, ['', '', '', '', '', '', '', '', '', '', '', '', '']);
const tr0 = (sheets.Prullenbak?.rows.length || 1);
const op = ctx.meldingenOpschonen();
assert(sheets.Feedback.rows.slice(1).filter(r => r[5] === 'Korte vragenlijst').length === 1 && op.uit.Feedback.dubbel === 2 && op.uit.Feedback.leeg === 1, 'opschonen: 3× dezelfde melding wordt 1×, lege rij weg');
assert(op.uit.Fouten && op.uit.Fouten.leeg === 1 && !sheets.Fouten.rows.slice(1).some(r => r.every(v => v === '')), 'opschonen: lege rij in Fouten weg');
assert(sheets.Prullenbak.rows.length === tr0 + 2, 'opschonen: dubbelen staan in de Prullenbak');
assert(fbCount('met eid') === 2 && fbCount('oude app') === 1, 'opschonen: echte meldingen blijven staan');
assert(!ctx.meldingenOpschonen().batch, 'opschonen nog eens: niets meer te doen');
// ---------- s7: koppeling met Linear (BL-5) ----------
const L = { id: 'LINEA-R7K2', name: 'Lin', group: 'vrienden' };
post({ tester: L, items: [{ kind: 'feedback', eid: 'l1', at: '2026-10-28T07:12:40Z', type: 'Werkt niet', message: 'linear een' },
                          { kind: 'feedback', eid: 'l2', at: '2026-10-28T07:15:05Z', type: 'Idee', message: 'linear twee' },
                          { kind: 'feedback', eid: 'l3', at: '2026-10-28T07:20:00Z', type: 'Idee', message: 'linear drie' },
                          { kind: 'fout', eid: 'l4', at: '2026-10-28T07:21:00Z', message: 'linear fout', source: 'app.js:9:9' }] });
const row = (tab, msg) => sheets[tab].rows.find(r => r[tab === 'Feedback' ? 5 : 4] === msg);
const fcol = k => ctx.TABS ? 0 : 0; const FC = ['fid','at','tid','name','type','message','screen','rid','context','status','prio','linear','linearState'], EC = ['eid','at','tid','name','message','source','screen','rid','version','device','stack','status','prio','linear','linearState'];
assert(get({ key: K }).linear.on === false && /sleutel/i.test(get({ key: K, action: 'linear' }).error || ''), 'zonder sleutel: koppelen meldt dat de sleutel ontbreekt');
assert(linearCalls === 0, 'zonder sleutel: Linear wordt niet aangeroepen');
sheets.Instellingen.rows[10] = sheets.Instellingen.rows[10] || []; sheets.Instellingen.rows[10][1] = 'lin_api_GEHEIM123';
sheets.Bewaard.rows.push(['bweesje1', 'weg12345', 'Feedback', new Date(), new Date('2026-10-13T13:04:54Z'), 'Stan', 'Idee', 'afbeeldingen', 'kookmodus', '', '', 'gepland', 'gepland', '']);
sheets.Feedback.rows.push(['oudmelding', new Date('2026-10-13T13:09:26Z'), '', 'Oude Naam', 'Idee', 'zonder tester-id', 'keuken', '', '', 'nieuw', '']);
const id1 = row('Feedback', 'linear een')[0], id3 = row('Feedback', 'linear drie')[0], idE = row('Fouten', 'linear fout')[0];
linearIssues = [
  { identifier: 'PK-21', url: 'https://linear.app/cbtb/issue/PK-21/timer', state: { name: 'Backlog', type: 'backlog' }, description: 'Timer doet niks.\n\nDashboard: ' + id1 + ', ' + idE },
  { identifier: 'PK-22', url: 'https://linear.app/cbtb/issue/PK-22/idee', state: { name: 'Klaar', type: 'completed' }, description: 'Idee.\n\nDashboard: LINEA-R7K2 @ 28-10-2026, 08:15:05' },   // oude kopie: tester + tijd (Amsterdam)
  { identifier: 'PK-23', url: 'https://linear.app/cbtb/issue/PK-23/x', state: { name: 'Niet doen', type: 'canceled' }, description: '**Dashboard:** `' + id3 + '`' },
  { identifier: 'PK-25', url: 'https://linear.app/cbtb/issue/PK-25/z', state: { name: 'Backlog', type: 'backlog' }, description: 'Dashboard: TESTWES-27R3 @ 24-10-2026, 20:24:00, Oude Naam @ 13-10-2026, 15:09:26' },
  { identifier: 'PK-15', url: 'https://linear.app/cbtb/issue/PK-15/a', state: { name: 'Backlog', type: 'backlog' }, description: 'Dashboard: Stan @ 13-10-2026, 15:04:54' },
  { identifier: 'PK-24', url: 'https://linear.app/cbtb/issue/PK-24/y', state: { name: 'Duplicate', type: 'duplicate' }, description: 'Dashboard: ' + id1 }];
const lk = get({ key: K, action: 'linear' });
assert(row('Feedback', 'zonder tester-id')[FC.indexOf('linear')] === 'PK-25', 'heel oude melding zonder tester-ID: gekoppeld op naam @ tijd');
assert(sheets.Bewaard.rows.find(r => r[0] === 'bweesje1')[14] === 'PK-15' && sheets.Bewaard.rows.find(r => r[0] === 'bweesje1')[15] === 'Backlog', 'bewaarde melding van verwijderde tester: gekoppeld op naam @ tijd');
assert(lk.ok && lk.linked === 5 && linearAuth === 'lin_api_GEHEIM123', 'koppelen: 5 meldingen gekoppeld, sleutel meegestuurd');
assert(props.LINEAR_KEY === 'lin_api_GEHEIM123' && !String(sheets.Instellingen.rows[10][1]).includes('lin_api_'), 'sleutel naar scripteigenschappen, cel B11 gewist');
const r1l = row('Feedback', 'linear een');
assert(r1l[FC.indexOf('linear')] === 'PK-21' && r1l[FC.indexOf('linearState')] === 'Backlog' && r1l[FC.indexOf('status')] === 'gepland', 'op meldings-ID: PK-21 · Backlog, status gepland (open issue wint van duplicaat)');
const r2l = row('Feedback', 'linear twee');
assert(r2l[FC.indexOf('linear')] === 'PK-22' && r2l[FC.indexOf('status')] === 'opgelost', 'op tester @ tijd (Amsterdam): PK-22, Klaar → opgelost');
assert(row('Feedback', 'linear drie')[FC.indexOf('status')] === 'niet doen' && row('Feedback', 'linear drie')[FC.indexOf('linear')] === 'PK-23', 'markdown om de regel heen: werkt; Niet doen → niet doen');
assert(row('Fouten', 'linear fout')[EC.indexOf('linear')] === 'PK-21', 'fouten worden ook gekoppeld');
assert(sheets.Bewaard.rows.some(r => r[1] === id3 && r[11] === 'niet doen' && r[14] === 'PK-23'), 'niet doen: automatisch bewaard, met Linear-ID');
assert(!sheets.Feedback.rows.some(r => r[5] === 'met eid' && r[FC.indexOf('linear')]), 'niet genoemde meldingen blijven ongekoppeld');
const dl = get({ key: K });
assert(dl.linear.on && dl.linear.base === 'https://linear.app/cbtb' && !dl.linear.error && dl.feedback.find(f => f.message === 'linear een').linear === 'PK-21', 'dashboard krijgt koppeling, Linear-adres en geen fout');
const calls0 = linearCalls; get({ key: K }); assert(linearCalls === calls0, 'dashboard openen binnen 2 min: Linear niet opnieuw gevraagd');
props.LINEAR_AT = String(Date.now() - 180000); get({ key: K }); assert(linearCalls === calls0 + 1, 'dashboard openen na 2 min: eerst koppelen');
linearIssues[0].state = { name: 'Klaar', type: 'completed' };
ctx.digestVersturen({}); assert(row('Feedback', 'linear een')[FC.indexOf('status')] === 'opgelost' && row('Feedback', 'linear een')[FC.indexOf('linearState')] === 'Klaar', 'trigger: issue naar Klaar → melding opgelost');
linearIssues = linearIssues.filter(i => i.identifier !== 'PK-22');
get({ key: K, action: 'linear' }); assert(row('Feedback', 'linear twee')[FC.indexOf('linear')] === '', 'kenmerk weg uit Linear: koppeling weg');
linearStatus = 401; const bad = get({ key: K, action: 'linear' });
assert(bad.error && /Linear/.test(get({ key: K }).linear.error) && row('Feedback', 'linear een')[FC.indexOf('linear')] === 'PK-21', 'Linear-fout: melding in het dashboard, koppelingen blijven staan');
linearStatus = 200; get({ key: K, action: 'linear' }); assert(!get({ key: K }).linear.error, 'daarna weer goed: fout weg');
ctx.setup(); assert(props.LINEAR_KEY === 'lin_api_GEHEIM123' && /opgeslagen/.test(sheets.Instellingen.rows[10][1]), 'setup opnieuw: sleutel blijft bewaard');
assert(sheets.Feedback.rows[0][11] === 'Linear' && sheets.Feedback.rows[0][12] === 'Linear-status', 'setup: kolomkoppen Linear en Linear-status');
assert(get({ key: K }).script === 's8' && get({ key: K }).api === 4, 'scriptversie s8, API 4');
console.log(fails ? fails + ' FOUT' : 'ALLES OK'); process.exit(fails ? 1 : 0);
