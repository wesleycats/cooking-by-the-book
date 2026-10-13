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
const NOTIFY = { errors: true, feedback: true, newTester: true };
// ntfy.sh (gratis) telt per IP: 250 berichten/dag, 60 achter elkaar. Apps Script deelt IP's met andere scripts, dus
// alles wordt gebundeld: urgent (fout, "Werkt niet") en overig elk in een eigen bundel, die pas vertrekt als de oudste
// melding erin het ingestelde aantal uren oud is (Instellingen B9 en B10; 0 = direct). Geen meldingen = geen bericht.
// Mail (B8): reserve (alleen als push mislukt), altijd (push én mail) of nee. Dezelfde bundels en tijden gelden voor mail.
const BUDGET = { pushPerDay: 60, mailPerDay: 40 };
const DEFAULT_HOURS = { urgent: 1, rest: 6 };
// logboeken: nieuwste bovenaan, tijd tot op de seconde
const TIME_COLS = { Events: ['at'], Feedback: ['at'], Fouten: ['at'], Sessies: ['updated'], Testers: ['first', 'last'] };
const NEWEST_FIRST = { Events: 'at', Feedback: 'at', Fouten: 'at', Sessies: 'updated' };
const TIME_FMT = 'dd-mm-yyyy HH:mm:ss';
// prioriteit per feedbacksoort (ntfy: 5 = urgent, 4 = hoog, 3 = normaal met geluid, 2 = stil)
const FB_PRIO = { 'Werkt niet': [4, 'bug', '🐞'], 'Snap ik niet': [3, 'question', '❓'], 'Idee': [3, 'bulb', '💡'], 'Mooi': [2, 'heart', '♥'] };

// tab → [kolomsleutel, kolomkop]; de sleutels gebruikt het dashboard
const TABS = {
  Testers:  [['id','ID'],['name','Naam'],['group','Groep'],['first','Eerste keer'],['last','Laatst actief'],['days','Actieve dagen'],['events','Events'],['device','Toestel'],['size','Scherm'],['version','Versie'],['dayList','Dagen']],
  Events:   [['at','Tijd'],['tid','Tester-ID'],['name','Naam'],['kind','Soort'],['rid','Recept-ID'],['step','Stap'],['screen','Scherm'],['details','Details']],
  Sessies:  [['sid','Sessie-ID'],['tid','Tester-ID'],['name','Naam'],['rid','Recept-ID'],['title','Recept'],['date','Datum'],['servings','Porties'],['min','Kooktijd (min)'],['recipeMin','Recepttijd (min)'],['rating','Sterren'],['chips','Chips'],['note','Notitie'],['adj','Timeraanpassingen'],['updated','Bijgewerkt']],
  Feedback: [['fid','ID'],['at','Tijd'],['tid','Tester-ID'],['name','Naam'],['type','Soort'],['message','Bericht'],['screen','Scherm'],['rid','Recept-ID'],['context','Context'],['status','Status'],['prio','Prioriteit']],
  Fouten:   [['eid','ID'],['at','Tijd'],['tid','Tester-ID'],['name','Naam'],['message','Melding'],['source','Bron'],['screen','Scherm'],['rid','Recept-ID'],['version','Versie'],['device','Toestel'],['stack','Stack'],['status','Status'],['prio','Prioriteit']]
};

/* ---------- eenmalig ---------- */
function setup() {
  const ss = SpreadsheetApp.getActive();
  ss.setSpreadsheetTimeZone(TZ);
  for (const [name, cols] of Object.entries(TABS)) {
    const sh = ss.getSheetByName(name) || ss.insertSheet(name);
    sh.getRange(1, 1, 1, cols.length).setValues([cols.map(c => c[1])]).setFontWeight('bold').setBackground('#e8f0e6');
    sh.setFrozenRows(1);
    if (name === 'Testers') sh.getRange(2, cols.length, Math.max(sh.getMaxRows() - 1, 1), 1).setNumberFormat('@');
    for (const k of TIME_COLS[name] || []) sh.getRange(2, cols.findIndex(c => c[0] === k) + 1, Math.max(sh.getMaxRows() - 1, 1), 1).setNumberFormat(TIME_FMT);
    const by = NEWEST_FIRST[name];   // bestaande rijen eenmalig sorteren: nieuwste bovenaan
    if (by && sh.getLastRow() > 2) sh.getRange(2, 1, sh.getLastRow() - 1, cols.length).sort({ column: cols.findIndex(c => c[0] === by) + 1, ascending: false });
  }
  const first = ss.getSheetByName('Blad1') || ss.getSheetByName('Sheet1');
  if (first && first.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(first);
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('NTFY_TOPIC')) props.setProperty('NTFY_TOPIC', 'cbtb-' + randomId(18));
  if (!props.getProperty('DASHBOARD_KEY')) props.setProperty('DASHBOARD_KEY', randomId(24));
  const set = ss.getSheetByName('Instellingen') || ss.insertSheet('Instellingen');
  const keep = c => { const v = set.getRange(c).getValue(); return v === null || v === undefined ? '' : String(v); };      // wat Wes zelf invulde, bewaren bij opnieuw uitvoeren
  const keepUrl = keep('B4'), keepToken = keep('B7'), keepMail = keep('B8'), keepU = keep('B9'), keepR = keep('B10');
  set.clear();
  set.getRange(1, 1, 10, 2).setValues([
    ['Meldingskanaal (ntfy)', props.getProperty('NTFY_TOPIC')],
    ['Abonneren', 'Installeer de app "ntfy" → + → vul het meldingskanaal hierboven in (server ntfy.sh)'],
    ['Dashboardsleutel', props.getProperty('DASHBOARD_KEY')],
    ['Web-app-URL', keepUrl.startsWith('http') ? keepUrl : '(plak hier de /exec-URL na Implementeren)'],
    ['Dashboard', '=IF(LEFT(B4,4)="http","https://wesleycats.github.io/cooking-by-the-book/dashboard.html#k="&B3&"&u="&ENCODEURL(B4),"vul eerst B4 in")'],
    ['Let op', 'Deel de sleutel, het kanaal en de token niet: wie ze heeft, ziet de testgegevens of je meldingen.'],
    ['ntfy-token (optioneel)', keepToken || '(leeg = zonder account; plak hier een gratis ntfy.sh-token, begint met tk_)'],
    ['Mail', /^(altijd|nee)$/i.test(keepMail) ? keepMail.toLowerCase() : 'reserve'],
    ['Urgent bundelen: elke … uur', keepU !== '' ? keepU : DEFAULT_HOURS.urgent],
    ['Overig bundelen: elke … uur', keepR !== '' ? keepR : DEFAULT_HOURS.rest]
  ]);
  set.getRange(8, 3, 3, 1).setValues([
    ['reserve = alleen als de pushmelding mislukt · altijd = push én mail · nee = geen mail'],
    ['Fouten en "Werkt niet". Getal in uren, bv. 1 of 0,5. 0 = direct. Geldt voor push én mail.'],
    ['Snap ik niet, ideeën, mooi, nieuwe testers. Getal in uren, bv. 6. 0 = direct.']
  ]);
  set.getRange('A1:A10').setFontWeight('bold'); set.setColumnWidth(1, 220); set.setColumnWidth(2, 380); set.setColumnWidth(3, 520);
  try {   // keuzelijst en getalcontrole, zodat een tikfout niets breekt
    set.getRange('B8').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['reserve', 'altijd', 'nee'], true).build());
    set.getRange('B9:B10').setDataValidation(SpreadsheetApp.newDataValidation().requireNumberBetween(0, 48).setHelpText('Aantal uren tussen 0 en 48').build());
    set.getRange('B8:B10').setBackground('#fff8e1');
  } catch (err) { console.warn('Validatie niet gezet: ' + err); }
  // bundel-trigger: verstuurt opgespaarde meldingen ook als er even niets binnenkomt
  if (!ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'digestVersturen'))
    ScriptApp.newTrigger('digestVersturen').timeBased().everyMinutes(10).create();
  deliver_('Proefkeuken', 'Meldingen werken. Fouten en "Werkt niet" komen direct, de rest gebundeld.', 3, ['white_check_mark']);
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
  if (tombstones_()[t.id]) return text_('deleted');   // verwijderd via het dashboard: de app vraagt de tester opnieuw aan te melden
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const ss = SpreadsheetApp.getActive();
    const isNew = upsertTester_(ss, t.id, name, group, body, items);
    const events = [], feedback = [], errors = [], alerts = [];
    for (const it of items) {
      const at = parseDate_(it.at), rid = String(it.rid || '').slice(0, 80), screen = String(it.screen || '').slice(0, 120);
      if (it.kind === 'sessie') { upsertSession_(ss, t.id, name, it); continue; }
      if (it.kind === 'feedback') {
        feedback.push([shortId_(), at, t.id, name, String(it.type || ''), String(it.message || '').slice(0, 2000), screen, rid, String(it.context || '').slice(0, 1500), 'nieuw', '']);
        if (NOTIFY.feedback) { const [pr, tag, ic] = FB_PRIO[it.type] || [3, 'speech_balloon', '💬'];
          alerts.push([ic + ' ' + name + ': ' + String(it.type || 'feedback').toLowerCase(), String(it.message || '').slice(0, 300) + '\n' + screen, pr, [tag]]); }
        continue;
      }
      if (it.kind === 'fout') {
        errors.push([shortId_(), at, t.id, name, String(it.message || '').slice(0, 300), String(it.source || '').slice(0, 200), screen, rid, String(body.version || ''), String(body.device || '').slice(0, 160), String(it.stack || '').slice(0, 900), 'nieuw', '']);
        if (NOTIFY.errors && firstTime_('err:' + t.id + ':' + it.message, 1800)) alerts.push(['⚠️ Fout bij ' + name, String(it.message || '').slice(0, 200) + '\n' + screen, 4, ['warning']]);
        continue;
      }
      const step = it.i != null ? Number(it.i) : '';
      const details = {}; for (const k in it) if (!['kind','at','rid','screen','i'].includes(k)) details[k] = it[k];
      events.push([at, t.id, name, String(it.kind || '').slice(0, 30), rid, step, screen, Object.keys(details).length ? JSON.stringify(details).slice(0, 1000) : '']);
    }
    append_(ss, 'Events', events); append_(ss, 'Feedback', feedback); append_(ss, 'Fouten', errors);
    if (isNew && NOTIFY.newTester) alerts.push(['👋 Nieuwe tester: ' + name, (group ? 'Groep: ' + group + ' · ' : '') + 'ID ' + t.id, 3, ['wave']]);
    dispatch_(alerts);
  } finally { lock.releaseLock(); }
  return text_('ok');
}

function upsertTester_(ss, id, name, group, body, items) {
  const sh = ss.getSheetByName('Testers'), now = new Date();
  const day = Utilities.formatDate(now, TZ, 'yyyy-MM-dd');
  const f = sh.getRange('A:A').createTextFinder(id).matchEntireCell(true).findNext();
  if (!f) {
    sh.appendRow([id, name, group, now, now, 1, items.length, String(body.device || ''), String(body.size || ''), String(body.version || ''), "'" + day]);
    return true;
  }
  const r = f.getRow(), row = sh.getRange(r, 1, 1, 11).getValues()[0];
  const days = dayList_(row[10]); if (!days.includes(day)) days.push(day);
  sh.getRange(r, 1, 1, 11).setValues([[id, name || row[1], row[2] || group, row[3], now, days.length, Number(row[6] || 0) + items.length, String(body.device || row[7]), String(body.size || row[8]), String(body.version || row[9]), "'" + days.join(',')]]);
  return false;
}

function dayList_(v) {
  if (v instanceof Date || Object.prototype.toString.call(v) === '[object Date]') return [Utilities.formatDate(v, TZ, 'yyyy-MM-dd')];
  return String(v || '').split(',').map(x => x.trim()).filter(Boolean).map(x => /^\d{4}-\d{2}-\d{2}$/.test(x) ? x : (isNaN(new Date(x)) ? '' : Utilities.formatDate(new Date(x), TZ, 'yyyy-MM-dd'))).filter(Boolean);
}

function upsertSession_(ss, tid, name, it) {
  const sh = ss.getSheetByName('Sessies'), sid = String(it.sid || '').slice(0, 40); if (!sid) return;
  const adj = Object.entries(it.adj || {}).map(([k, v]) => 'stap ' + (Number(k) + 1) + ': ' + (v > 0 ? '+' : '') + v + ' s').join(', ');
  const row = [sid, tid, name, String(it.rid || ''), String(it.title || ''), String(it.date || ''), it.servings || '', it.min ?? '', it.recipeMin ?? '', it.rating ?? '', (it.chips || []).join(', '), String(it.note || '').slice(0, 1000), adj, new Date()];
  const f = sh.getRange('A:A').createTextFinder(sid).matchEntireCell(true).findNext();
  if (f && sh.getRange(f.getRow(), 2).getValue() === tid) sh.getRange(f.getRow(), 1, 1, row.length).setValues([row]);
  else top_(sh, [row], 'Sessies');
}

/* ---------- meldingen (ntfy) ---------- */
/* ---------- meldingen ---------- */
function dispatch_(alerts) {
  if (!alerts.length) return;
  const urgent = alerts.filter(a => a[2] >= 4), rest = alerts.filter(a => a[2] < 4);
  if (urgent.length) queue_('urgent', urgent);
  if (rest.length) queue_('rest', rest);
  digestVersturen(false);
}
function queue_(name, alerts) {
  const p = PropertiesService.getScriptProperties(), key = 'Q_' + name.toUpperCase(), q = JSON.parse(p.getProperty(key) || '[]');
  alerts.forEach(a => q.push([a[0], String(a[1]).split('\n')[0].slice(0, 160), Date.now()]));
  p.setProperty(key, JSON.stringify(q.slice(-60)));
}
function hours_(cell, def) {
  const v = parseFloat(String(setting_(cell)).replace(',', '.'));
  return isNaN(v) || v < 0 ? def : Math.min(v, 48);
}
/** Verstuurt een bundel zodra de oudste melding erin het ingestelde aantal uren oud is. Tijdtrigger elke 10 min. */
function digestVersturen(force) {
  const p = PropertiesService.getScriptProperties();
  try { opruimen_(); } catch (err) { console.warn('Opruimen mislukt: ' + err); }
  const kinds = [['urgent', hours_('B9', DEFAULT_HOURS.urgent), 4, '⚠️', 'dringende meldingen', ['warning']],
                 ['rest', hours_('B10', DEFAULT_HOURS.rest), 3, '📋', 'nieuwe meldingen', ['clipboard']]];
  for (const [name, hrs, prio, ic, label, tags] of kinds) {
    const key = 'Q_' + name.toUpperCase(), q = JSON.parse(p.getProperty(key) || '[]');
    if (!q.length) continue;
    const oldest = Math.min(...q.map(x => x[2] || Date.now()));
    if (force !== true && Date.now() - oldest < hrs * 3600000) continue;
    const title = q.length === 1 ? q[0][0] : ic + ' ' + q.length + ' ' + label;
    const body = q.length === 1 ? q[0][1] : q.slice(0, 15).map(x => '• ' + x[0] + (x[1] ? ' — ' + x[1] : '')).join('\n') + (q.length > 15 ? '\n… en ' + (q.length - 15) + ' meer in het dashboard' : '');
    if (deliver_(title, body.slice(0, 3500), prio, tags)) p.setProperty(key, '[]');
  }
}
/** Eén pushbericht; mislukt het (limiet, storing, budget op), dan per mail. Geeft true als het ergens is aangekomen. */
function deliver_(title, message, priority, tags) {
  const p = PropertiesService.getScriptProperties(), topic = p.getProperty('NTFY_TOPIC');
  const day = Utilities.formatDate(new Date(), 'UTC', 'yyyy-MM-dd');          // ntfy telt per UTC-dag
  const used = JSON.parse(p.getProperty('PUSH_DAY') || '{}'), n = used.d === day ? used.n : 0;
  let ok = false, why = '';
  if (!topic) why = 'geen kanaal: voer setup uit';
  else if (n >= BUDGET.pushPerDay) why = 'eigen dagbudget van ' + BUDGET.pushPerDay + ' pushberichten op';
  else {
    p.setProperty('PUSH_DAY', JSON.stringify({ d: day, n: n + 1 }));
    const msg = { topic, title: String(title).slice(0, 200), message: String(message).slice(0, 3800), priority, tags };
    const url = dashboardUrl_(); if (url) msg.click = url + '&tab=feedback';
    const headers = {}, token = setting_('B7'); if (/^tk_/.test(token)) headers.Authorization = 'Bearer ' + token;
    try {
      const r = UrlFetchApp.fetch('https://ntfy.sh/', { method: 'post', contentType: 'application/json', headers, payload: JSON.stringify(msg), muteHttpExceptions: true });
      ok = r.getResponseCode() === 200;
      if (!ok) why = 'ntfy ' + r.getResponseCode() + (r.getResponseCode() === 429 ? ' (limiet van ntfy.sh)' : '') + ': ' + r.getContentText().slice(0, 200);
    } catch (err) { why = 'ntfy niet bereikbaar: ' + err; }
  }
  if (ok) { if (mailMode_() === 'altijd') mail_(title, message); return true; }
  console.warn('Push mislukt: ' + why);
  return mail_(title, message + '\n\n— Per mail omdat de pushmelding niet lukte (' + why + ').');
}
function mailMode_() { const v = setting_('B8').toLowerCase(); return v === 'altijd' || v === 'nee' ? v : 'reserve'; }
function mail_(title, body) {
  if (mailMode_() === 'nee') return false;
  const p = PropertiesService.getScriptProperties(), day = Utilities.formatDate(new Date(), 'UTC', 'yyyy-MM-dd');
  const used = JSON.parse(p.getProperty('MAIL_DAY') || '{}'), n = used.d === day ? used.n : 0;
  if (n >= BUDGET.mailPerDay) { console.warn('Ook mailbudget op'); return false; }
  try {
    MailApp.sendEmail({ to: Session.getEffectiveUser().getEmail(), subject: '[Proefkeuken] ' + title, body: body + (dashboardUrl_() ? '\n\nDashboard: ' + dashboardUrl_() + '&tab=feedback' : '') });
    p.setProperty('MAIL_DAY', JSON.stringify({ d: day, n: n + 1 }));
    return true;
  } catch (err) { console.error('Mail mislukt: ' + err); return false; }
}
function setting_(cell) { const set = SpreadsheetApp.getActive().getSheetByName('Instellingen'); if (!set) return ''; const v = set.getRange(cell).getValue(); return v === null || v === undefined ? '' : String(v).trim(); }

/** Handmatige test: kies `testMelding` → Uitvoeren. Het logboek onderin laat zien wat er gebeurt. */
function testMelding() {
  const p = PropertiesService.getScriptProperties();
  console.log('Kanaal: ' + p.getProperty('NTFY_TOPIC') + '  (moet exact gelijk zijn aan het abonnement in de ntfy-app)');
  console.log('Token: ' + (/^tk_/.test(setting_('B7')) ? 'ja (limiet per account)' : 'nee (limiet per gedeeld Google-IP)') + ' · vandaag verstuurd: ' + (JSON.parse(p.getProperty('PUSH_DAY') || '{}').n || 0) + '/' + BUDGET.pushPerDay);
  console.log('Bundels: urgent elke ' + hours_('B9', DEFAULT_HOURS.urgent) + ' uur, overig elke ' + hours_('B10', DEFAULT_HOURS.rest) + ' uur · mail: ' + mailMode_());
  const ok = deliver_('🔔 Proefkeuken test', 'Als je dit ziet, werken de meldingen.', 4, ['bell']);
  console.log(ok ? 'Aangekomen (push, of per mail als push niet lukte: zie waarschuwing hierboven).' : 'Niet aangekomen: zie de waarschuwingen hierboven.');
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
  if (p.action === 'status') {                     // de app vraagt: besta ik nog? (geen sleutel nodig, geeft alleen dit terug)
    const id = String(p.id || '');
    if (!/^[A-Z0-9]{1,8}-[A-Z0-9]{4}$/.test(id)) return json_({ status: 'unknown' });
    if (tombstones_()[id]) return json_({ status: 'deleted' });
    const f = SpreadsheetApp.getActive().getSheetByName('Testers').getRange('A:A').createTextFinder(id).matchEntireCell(true).findNext();
    return json_({ status: f ? 'active' : 'unknown' });
  }
  if (!p.key || p.key !== PropertiesService.getScriptProperties().getProperty('DASHBOARD_KEY')) return json_({ error: 'Ongeldige sleutel' });
  const ss = SpreadsheetApp.getActive();
  if (p.action === 'mark') {                       // status van feedback of fout bijwerken vanuit het dashboard
    const tab = p.tab === 'Fouten' ? 'Fouten' : 'Feedback', sh = ss.getSheetByName(tab);
    const f = sh.getRange('A:A').createTextFinder(String(p.id || '')).matchEntireCell(true).findNext();
    if (!f || f.getRow() < 2) return json_({ error: 'Niet gevonden' });
    const cols = TABS[tab].map(c => c[0]);
    const STATUS = ['nieuw', 'gepland', 'opgelost', 'niet doen'], PRIO = ['P1', 'P2', 'P3', ''];
    if (p.status != null) { if (!STATUS.includes(p.status)) return json_({ error: 'Onbekende status' }); sh.getRange(f.getRow(), cols.indexOf('status') + 1).setValue(p.status); }
    if (p.prio != null) { if (!PRIO.includes(p.prio)) return json_({ error: 'Onbekende prioriteit' }); sh.getRange(f.getRow(), cols.indexOf('prio') + 1).setValue(p.prio); }
    return json_({ ok: true });
  }
  if (p.action === 'delete') return json_(deleteTesters_(ss, String(p.ids || ''), p.scope === 'all' ? 'all' : 'data'));
  if (p.action === 'undo') return json_(undoDelete_(ss, String(p.batch || '')));
  const out = { generated: new Date().toISOString() };
  for (const [name, cols] of Object.entries(TABS)) out[name.toLowerCase()] = rows_(ss, name, cols, name === 'Events' ? 8000 : 2000);
  return json_(out);
}

/* ---------- verwijderen (dashboard) ----------
   scope 'data': alle testdata van de testers (events, sessies, feedback, fouten), de testers zelf blijven.
   scope 'all': ook de testers; hun ID komt op een lijst, zodat de app ze vraagt opnieuw aan te melden.
   Alles gaat eerst naar het verborgen tabblad Prullenbak (30 dagen), zodat het terug te zetten is. */
const TID_COL = { Testers: 'id', Events: 'tid', Sessies: 'tid', Feedback: 'tid', Fouten: 'tid' };
function tombstones_() { return JSON.parse(PropertiesService.getScriptProperties().getProperty('DELETED') || '{}'); }
function trash_(ss) {
  let sh = ss.getSheetByName('Prullenbak');
  if (!sh) { sh = ss.insertSheet('Prullenbak'); sh.getRange(1, 1, 1, 5).setValues([['Verwijderd op', 'Batch', 'Tabblad', 'Tester-ID', 'Rij (JSON)']]).setFontWeight('bold'); sh.setFrozenRows(1); try { sh.hideSheet(); } catch (e) {} }
  return sh;
}
function deleteTesters_(ss, idsParam, scope) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const all = idsParam === '*';
    const ids = new Set(all ? [] : idsParam.split(',').map(x => x.trim()).filter(x => /^[A-Z0-9]{1,8}-[A-Z0-9]{4}$/.test(x)));
    if (!all && !ids.size) return { error: 'Geen testers gekozen' };
    const batch = shortId_(), now = new Date(), trash = [], removed = {}, removedIds = new Set();
    for (const [tab, cols] of Object.entries(TABS)) {
      if (!TID_COL[tab] || (tab === 'Testers' && scope !== 'all')) continue;
      const sh = ss.getSheetByName(tab), last = sh.getLastRow(); if (last < 2) continue;
      const ci = cols.findIndex(c => c[0] === TID_COL[tab]), width = cols.length;
      const vals = sh.getRange(2, 1, last - 1, width).getValues(), keep = [];
      for (const row of vals) {
        const hit = all ? String(row[ci] || '') !== '' : ids.has(String(row[ci]));
        if (hit) { trash.push([now, batch, tab, String(row[ci]), JSON.stringify(row)]); removedIds.add(String(row[ci])); } else keep.push(row);
      }
      removed[tab] = vals.length - keep.length;
      if (!removed[tab]) continue;
      sh.getRange(2, 1, last - 1, width).clearContent();
      if (keep.length) sh.getRange(2, 1, keep.length, width).setValues(keep);
    }
    if (trash.length) { const t = trash_(ss); t.getRange(t.getLastRow() + 1, 1, trash.length, 5).setValues(trash); }
    if (scope === 'all') {
      const ts = tombstones_(); (all ? removedIds : ids).forEach(id => ts[id] = now.toISOString());
      PropertiesService.getScriptProperties().setProperty('DELETED', JSON.stringify(ts));
    }
    return { ok: true, batch, removed, testers: (all ? removedIds : ids).size };
  } finally { lock.releaseLock(); }
}
function undoDelete_(ss, batch) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const t = ss.getSheetByName('Prullenbak'); if (!t || t.getLastRow() < 2 || !batch) return { error: 'Niets om terug te zetten' };
    const vals = t.getRange(2, 1, t.getLastRow() - 1, 5).getValues();
    const mine = vals.filter(r => String(r[1]) === batch), rest = vals.filter(r => String(r[1]) !== batch);
    if (!mine.length) return { error: 'Niets om terug te zetten' };
    const byTab = {};
    mine.forEach(r => (byTab[r[2]] = byTab[r[2]] || []).push(JSON.parse(r[4]).map((v, i) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v) ? new Date(v) : v)));
    for (const [tab, rows] of Object.entries(byTab)) {
      const sh = ss.getSheetByName(tab); top_(sh, rows, tab);
      const by = NEWEST_FIRST[tab]; if (by && sh.getLastRow() > 2) sh.getRange(2, 1, sh.getLastRow() - 1, TABS[tab].length).sort({ column: TABS[tab].findIndex(c => c[0] === by) + 1, ascending: false });
    }
    t.getRange(2, 1, vals.length, 5).clearContent();
    if (rest.length) t.getRange(2, 1, rest.length, 5).setValues(rest);
    const ts = tombstones_(); new Set(mine.map(r => String(r[3]))).forEach(id => delete ts[id]);
    PropertiesService.getScriptProperties().setProperty('DELETED', JSON.stringify(ts));
    return { ok: true, restored: mine.length };
  } finally { lock.releaseLock(); }
}
/** Ruimt de prullenbak op (ouder dan 30 dagen) en vergeten verwijder-lijst (ouder dan 90 dagen). Draait mee met de trigger. */
function opruimen_() {
  const p = PropertiesService.getScriptProperties(), today = new Date().toISOString().slice(0, 10);
  if (p.getProperty('CLEANED') === today) return; p.setProperty('CLEANED', today);
  const t = SpreadsheetApp.getActive().getSheetByName('Prullenbak');
  if (t && t.getLastRow() > 1) {
    const vals = t.getRange(2, 1, t.getLastRow() - 1, 5).getValues(), keep = vals.filter(r => Date.now() - new Date(r[0]).getTime() < 30 * 864e5);
    if (keep.length < vals.length) { t.getRange(2, 1, vals.length, 5).clearContent(); if (keep.length) t.getRange(2, 1, keep.length, 5).setValues(keep); }
  }
  const ts = tombstones_(); let changed = false;
  for (const id in ts) if (Date.now() - Date.parse(ts[id]) > 90 * 864e5) { delete ts[id]; changed = true; }
  if (changed) p.setProperty('DELETED', JSON.stringify(ts));
}

function rows_(ss, name, cols, max) {
  const sh = ss.getSheetByName(name); if (!sh) return [];
  const last = sh.getLastRow(); if (last < 2) return [];
  const n = Math.min(max, last - 1);                 // nieuwste staan bovenaan: de eerste n rijen
  return sh.getRange(2, 1, n, cols.length).getValues().map(v => {
    const o = {}; cols.forEach(([k], i) => { o[k] = v[i] instanceof Date ? v[i].toISOString() : v[i]; }); return o;
  });
}

/* ---------- hulpjes ---------- */
function append_(ss, name, rows) { if (rows.length) top_(ss.getSheetByName(name), rows.slice().reverse(), name); }
/** Zet rijen direct onder de kop (nieuwste bovenaan), in de opmaak van gewone rijen, niet die van de kop. */
function top_(sh, rows, name) {
  sh.insertRowsBefore(2, rows.length);
  const r = sh.getRange(2, 1, rows.length, rows[0].length);
  r.setFontWeight('normal').setBackground(null).setValues(rows);
  for (const k of TIME_COLS[name] || []) { const i = TABS[name].findIndex(c => c[0] === k); if (i >= 0) sh.getRange(2, i + 1, rows.length, 1).setNumberFormat(TIME_FMT); }
}
function parseDate_(s) { const d = new Date(s); return isNaN(d) ? new Date() : d; }
function shortId_() { return Utilities.getUuid().slice(0, 8); }
function text_(s) { return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.TEXT); }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
