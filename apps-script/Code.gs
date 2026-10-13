/**
 * Cooking by the Book — Proefkeuken (alpha), testoverzicht
 * Google Apps Script dat bij één Google Sheet hoort. Het:
 *   1. ontvangt alles uit de testversie (doPost): aanmeldingen, gebruik, kooksessies, feedback, fouten;
 *   2. zet het in tabbladen (Testers, Events, Sessies, Feedback, Fouten);
 *   3. stuurt een pushmelding via ntfy bij een fout of bij feedback "Werkt niet" (en bij een nieuwe tester);
 *   4. levert de gegevens aan het dashboard (doGet, alleen met de geheime sleutel).
 *
 * Installeren (eenmalig, ±5 min):
 *   - Sheet "Testdata - Alpha - Proefkeuken" openen → Extensies → Apps Script → plak dit bestand over Code.gs → opslaan.
 *   - Kies bovenaan de functie `setup` → Uitvoeren → toestemming geven.
 *     Dit maakt de tabbladen, een geheim meldingskanaal en een dashboardsleutel (tabblad "Instellingen")
 *     en stuurt een testmelding.
 *   - Implementeren → Nieuwe implementatie → type Web-app → Uitvoeren als: ikzelf; Toegang: Iedereen → Implementeren.
 *     Kopieer de web-app-URL (eindigt op /exec) en zet die in tabblad Instellingen bij "Web-app-URL".
 * Na een wijziging in dit script: Implementeren → Implementaties beheren → potlood → Versie: Nieuwe versie.
 *
 * Er staan geen geheimen in deze code: kanaal en sleutel staan in de scripteigenschappen (setup) en in Instellingen.
 */

const TZ = 'Europe/Amsterdam';
const NOTIFY = { errors: true, brokenFeedback: true, newTester: true, maxPerHour: 12 };

// tab → [kolomsleutel, kolomkop]; de sleutels gebruikt het dashboard
const TABS = {
  Testers:  [['id','ID'],['name','Naam'],['group','Groep'],['first','Eerste keer'],['last','Laatst actief'],['days','Actieve dagen'],['events','Events'],['device','Toestel'],['size','Scherm'],['version','Versie'],['dayList','Dagen']],
  Events:   [['at','Tijd'],['tid','Tester-ID'],['name','Naam'],['kind','Soort'],['rid','Recept-ID'],['step','Stap'],['screen','Scherm'],['details','Details']],
  Sessies:  [['sid','Sessie-ID'],['tid','Tester-ID'],['name','Naam'],['rid','Recept-ID'],['title','Recept'],['date','Datum'],['servings','Porties'],['min','Kooktijd (min)'],['recipeMin','Recepttijd (min)'],['rating','Sterren'],['chips','Chips'],['note','Notitie'],['adj','Timeraanpassingen'],['updated','Bijgewerkt']],
  Feedback: [['fid','ID'],['at','Tijd'],['tid','Tester-ID'],['name','Naam'],['type','Soort'],['message','Bericht'],['screen','Scherm'],['rid','Recept-ID'],['context','Context'],['status','Status']],
  Fouten:   [['eid','ID'],['at','Tijd'],['tid','Tester-ID'],['name','Naam'],['message','Melding'],['source','Bron'],['screen','Scherm'],['rid','Recept-ID'],['version','Versie'],['device','Toestel'],['stack','Stack'],['status','Status']]
};

/* ---------- eenmalig ---------- */
function setup() {
  const ss = SpreadsheetApp.getActive();
  ss.setSpreadsheetTimeZone(TZ);
  for (const [name, cols] of Object.entries(TABS)) {
    const sh = ss.getSheetByName(name) || ss.insertSheet(name);
    sh.getRange(1, 1, 1, cols.length).setValues([cols.map(c => c[1])]).setFontWeight('bold').setBackground('#e8f0e6');
    sh.setFrozenRows(1);
  }
  const first = ss.getSheetByName('Blad1') || ss.getSheetByName('Sheet1');
  if (first && first.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(first);
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('NTFY_TOPIC')) props.setProperty('NTFY_TOPIC', 'cbtb-' + randomId(18));
  if (!props.getProperty('DASHBOARD_KEY')) props.setProperty('DASHBOARD_KEY', randomId(24));
  const set = ss.getSheetByName('Instellingen') || ss.insertSheet('Instellingen');
  set.clear();
  set.getRange(1, 1, 6, 2).setValues([
    ['Meldingskanaal (ntfy)', props.getProperty('NTFY_TOPIC')],
    ['Abonneren', 'Installeer de app "ntfy" → + → vul het meldingskanaal hierboven in (server ntfy.sh)'],
    ['Dashboardsleutel', props.getProperty('DASHBOARD_KEY')],
    ['Web-app-URL', '(plak hier de /exec-URL na Implementeren)'],
    ['Dashboard', '=IF(LEFT(B4,4)="http","https://wesleycats.github.io/cooking-by-the-book/dashboard.html#k="&B3&"&u="&ENCODEURL(B4),"vul eerst B4 in")'],
    ['Let op', 'Deel de sleutel en het kanaal niet: wie ze heeft, ziet de testgegevens of je meldingen.']
  ]);
  set.getRange('A1:A6').setFontWeight('bold'); set.setColumnWidth(1, 190); set.setColumnWidth(2, 520);
  notify_('Proefkeuken', 'Meldingen werken. Je krijgt hier een bericht bij een fout of "Werkt niet".', 3, ['white_check_mark']);
}

function randomId(n) {
  const abc = 'abcdefghijkmnpqrstuvwxyz23456789'; let s = '';
  for (let i = 0; i < n; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return s;
}

/* ---------- ontvangen uit de testversie ---------- */
function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return text_('bad json'); }
  const t = body.tester || {};
  if (!/^[A-Z0-9]{1,8}-[A-Z0-9]{4}$/.test(t.id || '') || !Array.isArray(body.items)) return text_('bad tester');
  const items = body.items.slice(0, 100);
  const name = String(t.name || '').slice(0, 30), group = String(t.group || '').slice(0, 30);
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const ss = SpreadsheetApp.getActive();
    const isNew = upsertTester_(ss, t.id, name, group, body, items);
    const events = [], feedback = [], errors = [], alerts = [];
    for (const it of items) {
      const at = parseDate_(it.at), rid = String(it.rid || '').slice(0, 80), screen = String(it.screen || '').slice(0, 120);
      if (it.kind === 'sessie') { upsertSession_(ss, t.id, name, it); continue; }
      if (it.kind === 'feedback') {
        feedback.push([shortId_(), at, t.id, name, String(it.type || ''), String(it.message || '').slice(0, 2000), screen, rid, String(it.context || '').slice(0, 1500), 'nieuw']);
        if (it.type === 'Werkt niet' && NOTIFY.brokenFeedback) alerts.push(['🐞 ' + name + ': werkt niet', String(it.message || '').slice(0, 300) + '\n' + screen, 4, ['bug']]);
        continue;
      }
      if (it.kind === 'fout') {
        errors.push([shortId_(), at, t.id, name, String(it.message || '').slice(0, 300), String(it.source || '').slice(0, 200), screen, rid, String(body.version || ''), String(body.device || '').slice(0, 160), String(it.stack || '').slice(0, 900), 'nieuw']);
        if (NOTIFY.errors && firstTime_('err:' + t.id + ':' + it.message, 1800)) alerts.push(['⚠️ Fout bij ' + name, String(it.message || '').slice(0, 200) + '\n' + screen, 4, ['warning']]);
        continue;
      }
      const step = it.i != null ? Number(it.i) : '';
      const details = {}; for (const k in it) if (!['kind','at','rid','screen','i'].includes(k)) details[k] = it[k];
      events.push([at, t.id, name, String(it.kind || '').slice(0, 30), rid, step, screen, Object.keys(details).length ? JSON.stringify(details).slice(0, 1000) : '']);
    }
    append_(ss, 'Events', events); append_(ss, 'Feedback', feedback); append_(ss, 'Fouten', errors);
    if (isNew && NOTIFY.newTester) alerts.push(['👋 Nieuwe tester: ' + name, (group ? 'Groep: ' + group + ' · ' : '') + 'ID ' + t.id, 2, ['wave']]);
    alerts.forEach(a => notify_(a[0], a[1], a[2], a[3]));
  } finally { lock.releaseLock(); }
  return text_('ok');
}

function upsertTester_(ss, id, name, group, body, items) {
  const sh = ss.getSheetByName('Testers'), now = new Date();
  const day = Utilities.formatDate(now, TZ, 'yyyy-MM-dd');
  const f = sh.getRange('A:A').createTextFinder(id).matchEntireCell(true).findNext();
  if (!f) {
    sh.appendRow([id, name, group, now, now, 1, items.length, String(body.device || ''), String(body.size || ''), String(body.version || ''), day]);
    return true;
  }
  const r = f.getRow(), row = sh.getRange(r, 1, 1, 11).getValues()[0];
  const days = String(row[10] || '').split(',').filter(Boolean); if (!days.includes(day)) days.push(day);
  sh.getRange(r, 1, 1, 11).setValues([[id, name || row[1], row[2] || group, row[3], now, days.length, Number(row[6] || 0) + items.length, String(body.device || row[7]), String(body.size || row[8]), String(body.version || row[9]), days.join(',')]]);
  return false;
}

function upsertSession_(ss, tid, name, it) {
  const sh = ss.getSheetByName('Sessies'), sid = String(it.sid || '').slice(0, 40); if (!sid) return;
  const adj = Object.entries(it.adj || {}).map(([k, v]) => 'stap ' + (Number(k) + 1) + ': ' + (v > 0 ? '+' : '') + v + ' s').join(', ');
  const row = [sid, tid, name, String(it.rid || ''), String(it.title || ''), String(it.date || ''), it.servings || '', it.min ?? '', it.recipeMin ?? '', it.rating ?? '', (it.chips || []).join(', '), String(it.note || '').slice(0, 1000), adj, new Date()];
  const f = sh.getRange('A:A').createTextFinder(sid).matchEntireCell(true).findNext();
  if (f && sh.getRange(f.getRow(), 2).getValue() === tid) sh.getRange(f.getRow(), 1, 1, row.length).setValues([row]);
  else sh.appendRow(row);
}

/* ---------- meldingen (ntfy) ---------- */
function notify_(title, message, priority, tags) {
  const props = PropertiesService.getScriptProperties(), topic = props.getProperty('NTFY_TOPIC'); if (!topic) return;
  const cache = CacheService.getScriptCache(), n = Number(cache.get('notify-count') || 0);
  if (n >= NOTIFY.maxPerHour) return;            // nooit een stortvloed op je telefoon
  cache.put('notify-count', String(n + 1), 3600);
  const msg = { topic, title, message, priority, tags };
  const url = dashboardUrl_(); if (url) msg.click = url + '&tab=feed';
  UrlFetchApp.fetch('https://ntfy.sh/', { method: 'post', contentType: 'application/json', payload: JSON.stringify(msg), muteHttpExceptions: true });
}
function dashboardUrl_() {
  const set = SpreadsheetApp.getActive().getSheetByName('Instellingen'); if (!set) return '';
  const v = String(set.getRange('B5').getValue() || ''); return v.startsWith('http') ? v : '';
}
function firstTime_(key, seconds) {
  const cache = CacheService.getScriptCache(), k = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, key)).slice(0, 40);
  if (cache.get(k)) return false; cache.put(k, '1', seconds); return true;
}

/* ---------- dashboard ---------- */
function doGet(e) {
  const p = e.parameter || {};
  if (!p.key || p.key !== PropertiesService.getScriptProperties().getProperty('DASHBOARD_KEY')) return json_({ error: 'Ongeldige sleutel' });
  const ss = SpreadsheetApp.getActive();
  if (p.action === 'mark') {                       // status van feedback of fout bijwerken vanuit het dashboard
    const tab = p.tab === 'Fouten' ? 'Fouten' : 'Feedback', sh = ss.getSheetByName(tab);
    const f = sh.getRange('A:A').createTextFinder(String(p.id || '')).matchEntireCell(true).findNext();
    if (!f || f.getRow() < 2) return json_({ error: 'Niet gevonden' });
    sh.getRange(f.getRow(), TABS[tab].length).setValue(p.status === 'nieuw' ? 'nieuw' : 'opgelost');
    return json_({ ok: true });
  }
  const out = { generated: new Date().toISOString() };
  for (const [name, cols] of Object.entries(TABS)) out[name.toLowerCase()] = rows_(ss, name, cols, name === 'Events' ? 8000 : 2000);
  return json_(out);
}

function rows_(ss, name, cols, max) {
  const sh = ss.getSheetByName(name); if (!sh) return [];
  const last = sh.getLastRow(); if (last < 2) return [];
  const start = Math.max(2, last - max + 1);
  return sh.getRange(start, 1, last - start + 1, cols.length).getValues().map(v => {
    const o = {}; cols.forEach(([k], i) => { o[k] = v[i] instanceof Date ? v[i].toISOString() : v[i]; }); return o;
  });
}

/* ---------- hulpjes ---------- */
function append_(ss, name, rows) { if (!rows.length) return; const sh = ss.getSheetByName(name); sh.getRange(sh.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows); }
function parseDate_(s) { const d = new Date(s); return isNaN(d) ? new Date() : d; }
function shortId_() { return Utilities.getUuid().slice(0, 8); }
function text_(s) { return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.TEXT); }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
