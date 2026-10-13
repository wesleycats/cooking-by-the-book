// Test van apps-script/Code.gs tegen een nagebootste Google-omgeving (Sheet, Properties, Cache, UrlFetch, Mail, Triggers).
//   node tools/test_apps_script.js apps-script/Code.gs
const fs = require('fs'), vm = require('vm');
const sheets = {}, notes = [], mails = [], triggers = [];
let ntfyStatus = 200;
const colIdx = c => c.charCodeAt(0) - 65;
function mkSheet(name){ const rows = []; return {
  name, rows,
  getLastRow: () => rows.length,
  getRange(a, b, c, d){
    if (typeof a === 'string') {
      if (a === 'A:A') return { createTextFinder: v => ({ matchEntireCell: () => ({ findNext: () => { const i = rows.findIndex(r => String(r[0]) === String(v)); return i < 0 ? null : { getRow: () => i + 1 }; } }) }) };
      const m = a.match(/^([A-Z])(\d+)$/);
      if (m) return { getValue: () => (rows[+m[2] - 1] || [])[colIdx(m[1])] ?? '', setValue(v){ rows[+m[2] - 1] = rows[+m[2] - 1] || []; rows[+m[2] - 1][colIdx(m[1])] = v; }, setDataValidation(){ return this; } };
      return { setFontWeight(){ return this; }, setDataValidation(){ return this; }, setBackground(){ return this; } };
    }
    const r0 = a - 1, c0 = b - 1, nr = c || 1, nc = d || 1;
    return {
      setValues(v){ for (let i = 0; i < v.length; i++) { rows[r0+i] = rows[r0+i] || []; for (let j = 0; j < v[i].length; j++) rows[r0+i][c0+j] = v[i][j]; } return this; },
      setValue(v){ rows[r0] = rows[r0] || []; rows[r0][c0] = v; return this; },
      getValue(){ return (rows[r0] || [])[c0]; },
      getValues(){ return [...Array(nr)].map((_, i) => [...Array(nc)].map((_, j) => (rows[r0+i] || [])[c0+j] ?? '')); },
      setFontWeight(){ return this; }, setBackground(){ return this; } }; },
  appendRow(r){ rows.push(r); }, setFrozenRows(){}, clear(){ rows.length = 0; }, setColumnWidth(){} }; }
const ss = { setSpreadsheetTimeZone(){}, getSheetByName: n => sheets[n] || null, insertSheet: n => (sheets[n] = mkSheet(n)), getSheets: () => Object.values(sheets), deleteSheet(){} };
const props = {}, cache = {};
const ctx = {
  SpreadsheetApp: { getActive: () => ss, newDataValidation: () => { const b = { requireValueInList: () => b, requireNumberBetween: () => b, setHelpText: () => b, build: () => ({}) }; return b; } },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] ?? null, setProperty: (k, v) => props[k] = v }) },
  CacheService: { getScriptCache: () => ({ get: k => cache[k] ?? null, put: (k, v) => cache[k] = v, remove: k => { delete cache[k]; } }) },
  LockService: { getScriptLock: () => ({ waitLock(){}, releaseLock(){} }) },
  UrlFetchApp: { fetch: (u, o) => { const m = JSON.parse(o.payload); m._auth = (o.headers || {}).Authorization; if (ntfyStatus === 200) notes.push(m); return { getResponseCode: () => ntfyStatus, getContentText: () => ntfyStatus === 429 ? 'limit reached' : 'ok' }; } },
  MailApp: { sendEmail: m => mails.push(m) },
  Session: { getEffectiveUser: () => ({ getEmail: () => 'wes@example.com' }) },
  ScriptApp: { getProjectTriggers: () => triggers, newTrigger: h => ({ timeBased: () => ({ everyMinutes: n => ({ create: () => triggers.push({ getHandlerFunction: () => h, n }) }) }) }) },
  Utilities: { formatDate: (d, tz, f) => f === 'yyyy-MM-dd' ? d.toISOString().slice(0, 10) : d.toISOString(), getUuid: () => Math.random().toString(16).slice(2) + 'abcdefgh', base64Encode: x => Buffer.from(x).toString('base64'), computeDigest: (a, s) => [...require('crypto').createHash('md5').update(s).digest()], DigestAlgorithm: { MD5: 1 } },
  ContentService: { createTextOutput: s => ({ s, setMimeType(){ return this; } }), MimeType: { TEXT: 1, JSON: 2 } },
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
sheets.Instellingen.rows[3][1] = 'https://script.google.com/x/exec'; sheets.Instellingen.rows[4][1] = 'https://x/dashboard.html#k=K&u=U'; sheets.Instellingen.rows[6][1] = 'tk_abc123';
ctx.setup(); assert(sheets.Instellingen.rows[3][1] === 'https://script.google.com/x/exec' && sheets.Instellingen.rows[6][1] === 'tk_abc123', 'setup bewaart web-app-URL en token');
sheets.Instellingen.rows[4][1] = 'https://x/dashboard.html#k=K&u=U';
notes.length = 0;

// ---------- ontvangen ----------
const cell = (r, v) => { sheets.Instellingen.rows[r - 1][1] = v; };
const age = (key, h) => { const q = JSON.parse(props[key] || '[]'); q.forEach(x => x[2] -= h * 3600000); props[key] = JSON.stringify(q); };
assert(String(sheets.Instellingen.rows[8][1]) === '1' && String(sheets.Instellingen.rows[9][1]) === '6' && sheets.Instellingen.rows[7][1] === 'reserve', 'instellingen: urgent 1 uur, overig 6 uur, mail reserve');
assert(post({ tester: { id: 'bad' }, items: [] }) === 'bad tester', 'ongeldige tester geweigerd');
assert(post({ tester: T, version: 'v46', device: 'Android', size: '412×915', items: [{ kind: 'open', at: now() }, { kind: 'aanmelding', at: now() }, { kind: 'stap', at: now(), rid: 'r1', i: 0, n: 6, screen: 'kookmodus' }] }) === 'ok', 'batch aangenomen');
assert(sheets.Testers.rows.length === 2 && sheets.Testers.rows[1][0] === T.id, 'tester toegevoegd');
assert(sheets.Events.rows.length === 4 && sheets.Events.rows[3][5] === 0, 'events met stapnummer');
assert(notes.length === 0 && JSON.parse(props.Q_REST).length === 1, 'nieuwe tester: niet direct, in de overige bundel');

// ---------- urgent per uur, overig per 6 uur ----------
post({ tester: T, items: [
  { kind: 'feedback', at: now(), type: 'Werkt niet', message: 'Timer piept niet', screen: 's', context: 'c' },
  { kind: 'fout', at: now(), message: 'boem', source: 'app.js:1:1' }, { kind: 'fout', at: now(), message: 'boem', source: 'app.js:1:1' },
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
assert(get({ key: 'fout' }).error, 'dashboard zonder juiste sleutel geweigerd');
const d = get({ key: props.DASHBOARD_KEY });
assert(d.testers.length === 1 && d.feedback.length >= 4 && d.fouten.length === 2 && d.sessies.length === 1, 'dashboarddata compleet');
assert(get({ key: props.DASHBOARD_KEY, action: 'mark', tab: 'Feedback', id: d.feedback[0].fid, prio: 'P1', status: 'gepland' }).ok && sheets.Feedback.rows[1][10] === 'P1' && sheets.Feedback.rows[1][9] === 'gepland', 'prioriteit en status zetten');
assert(get({ key: props.DASHBOARD_KEY, action: 'mark', tab: 'Feedback', id: d.feedback[0].fid, status: 'kapot' }).error, 'onbekende status geweigerd');
notes.length = 0; ctx.testMelding(); assert(notes.length === 1 && /test/.test(notes[0].title), 'testMelding verstuurt');
console.log(fails ? fails + ' FOUT' : 'ALLES OK'); process.exit(fails ? 1 : 0);
