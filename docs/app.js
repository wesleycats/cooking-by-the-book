/* Cooking by the Book — app.js
 *
 * Inhoud (zoek op "---------- <naam>"):
 *    1. icons
 *    2. state: recipes, view, progress per recipe (local + database)
 *    3. unfinished cooking sessions: resume, finish late or start over
 *    4. helpers
 *    5. routing (#recept-<id>, #nieuw, #bewerk-<id>)
 *    6. library
 *    7. recipe
 *    8. cook mode (full screen)
 *    9. timers: keep running across pages and reloads, alarm until stopped
 *   10. stats & gamification (private per user)
 *   11. receptenarchief: veilige kopie, los van wat het kookboek toont
 *   12. testmenu
 *   12b. test version: tester id, events, errors, feedback (only with TESTER)
 *   12c. onboarding: missions, tips and the proefrit (testers; Wes sees it via testmenu → Onboarding bekijken)
 *   13. hold and swipe to tick several items
 *   14. editor
 *   15. boot
 *
 * Werkafspraken
 *   - Gedeelde hulpjes staan onder "helpers" (currentRecipe, portions, shortTitle, fmtDate, stopTimers, copyText,
 *     promptCard, reveal). Gebruik die in plaats van het stukje opnieuw te schrijven.
 *   - Een vraag na het koken of op de startpagina = promptCard({...}); geen losse kaart-HTML.
 *   - Iets dat openklapt of verschijnt: reveal(el, knop) voor soepel in beeld scrollen.
 *   - Versienummer: APP_VERSION (testmenu) bij elke publicatie bijwerken.
 *   - Testen: python3 harness.py <map> <uit> --compare <vorige-uit> (staat in het project als claude/testharness.py).
 */
(() => {
/* ---------- icons ---------- */
const ICON = {
  clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  people:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.6.8 2.6 2.6 3 5.2"/></svg>',
  box:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 8h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M2 5h20v3H2z"/></svg>',
  back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  star:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z"/></svg>',
  starO:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z"/></svg>',
  play:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  pause:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
  bell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/></svg>',
  pan:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="10" cy="13" r="7"/><path d="M17 13h5"/></svg>',
  edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  snow:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v20M4.2 6.5l15.6 11M4.2 17.5l15.6-11M9.5 3.5 12 6l2.5-2.5M9.5 20.5 12 18l2.5 2.5"/></svg>',
  chev:'<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  layers:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/></svg>',
  gear:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1"/></svg>',
  pin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6l-1 7 4 4H6l4-4z"/><path d="M12 14v7"/></svg>',
  dots:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
  reset:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
  xmark:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  flame:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c4 0 7-2.7 7-7 0-4-3-6-4-9-1 2-2 3-3.5 3.5C11 7 10 4.5 10 2 6.5 5 5 9.5 5 15c0 4.3 3 7 7 7z"/><path d="M12 22c-1.7 0-3-1.2-3-3 0-2 1.5-3 3-5 1.5 2 3 3 3 5 0 1.8-1.3 3-3 3z"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  list:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/></svg>',
  copy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h2"/></svg>',
  search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>'
};

/* ---------- state: recipes, view, progress per recipe (local + database) ---------- */
const app = document.getElementById('app');
const newBtn = document.getElementById('new-btn');
let db = null, canWrite = false;
// the public test version (tools/build_testversion.py) sets window.__CBTB_TESTER__: no editing, no test menu,
// reviews stay on the tester's phone, and usage, feedback and errors go to Wes's test sheet (see "test version")
const TESTER = window.__CBTB_TESTER__ || null;
const canReview = () => canWrite || !!TESTER;
let recipes = [];         // [{id, ...data}]
let loaded = false;
let state = { q:'', tag:'Alles' };
const view = { servings:null, checked:new Set(), done:new Set(), cook:false, cur:0, frzOpen:false, loadedFor:null };
let uid = null, progressReady = false;
const progress = {};      // recipeId -> {checked:[], done:[], servings, updatedAt}
const persistT = {};
try { Object.assign(progress, JSON.parse(localStorage.getItem('kb-progress') || '{}')); } catch(e) {}
function saveLocal(){ try { localStorage.setItem('kb-progress', JSON.stringify(progress)); } catch(e) {} }
function applyProgress(r){
  view.loadedFor = r.id;
  const p = progress[r.id]; if (!p) return;
  view.checked = new Set(p.checked || []); view.prepped = new Set(p.prepped || []); view.tasks = new Set(p.tasks || []); view.sessionStart = p.sessionStart || null; view.adjLog = p.adjLog || {}; view.lastSession = p.lastSession || null; view.done = new Set(p.done || []); view.cur = Math.max(0, p.cur || 0); view.proefrit = !!p.proefrit;
  if (view.servings == null && p.servings) view.servings = p.servings;
}
function persist(r){
  progress[r.id] = { ...(progress[r.id]||{}), checked:[...view.checked], prepped:[...(view.prepped||[])], tasks:[...(view.tasks||[])], sessionStart:view.sessionStart||null, adjLog:view.adjLog||{}, lastSession:view.lastSession||null, done:[...view.done], servings:view.servings, cur:Math.max(0, Math.min(view.cur, 999)), proefrit:view.proefrit || undefined, updatedAt:new Date().toISOString() };
  pushProgress(r.id);
}
// save one recipe's progress locally and to the database, without touching the open recipe's view
function pushProgress(id){
  saveLocal();
  if (!db || !uid) return;
  clearTimeout(persistT[id]);
  persistT[id] = setTimeout(async () => {
    try { await db.collection('data/users/' + uid).doc(id).set(progress[id]); lastSync = Date.now(); syncErr = null; } catch(e) { syncErr = e?.code || 'onbekend'; }
    persistT[id] = null;
  }, 700);
}
/* ---------- unfinished cooking sessions: resume, finish late or start over ---------- */
// a session is stale once it has been quiet for longer than the recipe takes plus an hour
function sessionAge(r){
  const p = progress[r.id]; if (!p?.sessionStart) return null;
  const last = Date.parse(p.updatedAt || '') || p.sessionStart;
  return { last, stale: Date.now() - last > ((r.minutes || 30) + 60) * 60000 };
}
function openSessions(){
  return recipes.map(r => {
    const p = progress[r.id], n = (r.steps||[]).length, a = sessionAge(r);
    if (!a || !n || p.proefrit || (p.cur||0) >= n || (p.done||[]).length >= n) return null;
    return { r, p, ...a };
  }).filter(Boolean).sort((a, b) => b.last - a.last);
}
function discardSession(id){
  const p = progress[id]; if (!p) return;
  Object.assign(p, { prepped:[], tasks:[], sessionStart:null, adjLog:{}, done:[], cur:0, updatedAt:new Date().toISOString() });
  stopTimers(t => t.rid === id);
  if (view.loadedFor === id) view.loadedFor = null;
  pushProgress(id);
}
let resumeChecked = false, pendingFinish = null;
// on opening the app: back into cook mode if you were cooking a moment ago
function maybeResume(){
  if (resumeChecked || view.cook) return; resumeChecked = true;
  const h = location.hash.slice(1); if (h && !h.startsWith('recept-')) return;
  const s = openSessions().find(x => !x.stale); if (!s || (h && h !== 'recept-' + s.r.id)) return;
  pendingResume = true; toast('Verder waar je was');
  if (location.hash === '#recept-' + s.r.id) render(); else go('recept-' + s.r.id);
}
function sessionBanner(){
  const s = openSessions()[0]; if (!s) return '';
  const n = s.r.steps.length, st = Math.min(n, (s.p.cur||0) + 1), name = esc(s.r.title);
  let when = ''; try { when = new Date(s.last).toLocaleString('nl-NL', { weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }); } catch(e) {}
  return s.stale
    ? promptCard({ cls:'sesscard', attrs:`id="sesscard" data-id="${esc(s.r.id)}"`, title:`Heb je ${name} afgemaakt?`, sub:`Gestopt bij stap ${st} van ${n}${when ? ' · ' + when : ''}`,
        actions:[{ label:'Ja, afronden', kind:'primary', id:'ss-finish' }, { label:'Nee, opnieuw', id:'ss-reset' }] })
    : promptCard({ cls:'sesscard', attrs:`id="sesscard" data-id="${esc(s.r.id)}"`, title:`Je bent bezig met ${name}`, sub:`Stap ${st} van ${n}`,
        actions:[{ label:ICON.pan + 'Verder koken', kind:'primary', id:'ss-resume' }, { label:'Klaar, afronden', id:'ss-finish' }] });
}
function bindSession(){
  const c = document.getElementById('sesscard'); if (!c) return;
  const s = openSessions().find(x => x.r.id === c.dataset.id); if (!s) return;
  const f = document.getElementById('ss-finish'); if (f) f.onclick = () => { pendingFinish = { id:s.r.id, endAt: s.stale ? s.last : Date.now(), stale: s.stale }; go('recept-' + s.r.id); };
  const rs = document.getElementById('ss-resume'); if (rs) rs.onclick = () => { pendingResume = true; go('recept-' + s.r.id); };
  const rt = document.getElementById('ss-reset'); if (rt) rt.onclick = () => { discardSession(s.r.id); toast('Gewist. De volgende keer begin je opnieuw'); renderLibrary(); };
}
let wakeLock = null;

/* ---------- helpers ---------- */
/* Shared helpers: reach for these instead of re-writing the snippet.
   currentRecipe()        the recipe whose page (#recept-<id>) is open
   plural(n,a,b) / portions(n)   "1 portie", "3 porties"
   shortTitle(title)      "Lichte pesto-pasta" from "Lichte pesto-pasta met kip en citroen"
   fmtDate(d, opts)       Dutch date from "2026-10-13" or an ISO timestamp ("13 okt" by default)
   stopTimers(test)       remove timers matching test(t), silence the alarm when none rings, redraw
   copyText(text, fallbackTextarea, okMsg, failMsg)   clipboard with a visible, selected fallback
   promptCard({...})      the question card used after cooking and on the home screen */
const currentRecipe = () => recipes.find(x => 'recept-' + x.id === location.hash.slice(1));
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const portions = n => plural(n, 'portie', 'porties');
const shortTitle = t => String(t || '').split(/\s(?:met|uit|in)\s/)[0];
const fmtDate = (d, opts = { day:'numeric', month:'short' }) => new Date(/^\d{4}-\d\d-\d\d$/.test(d) ? d + 'T12:00' : d).toLocaleDateString('nl-NL', opts);
function stopTimers(test){
  for (const k of Object.keys(allTimers)) if (test(allTimers[k])) delete allTimers[k];
  saveTimers(); if (!Object.values(allTimers).some(t => t.left <= 0)) stopAlarm(); refreshTimers();
}
// call straight from a click handler: the clipboard is only allowed during the tap
async function copyText(text, fallbackEl, okMsg, failMsg){
  try { await navigator.clipboard.writeText(text); if (okMsg) toast(okMsg); return true; }
  catch(e) {
    if (fallbackEl) { fallbackEl.value = text; fallbackEl.hidden = false; fallbackEl.focus({ preventScroll:true }); fallbackEl.select(); reveal(fallbackEl); }
    if (failMsg) toast(failMsg); return false;
  }
}
/* Time split for a recipe. minutes = total incl. cutting (receptformat); prep = cutting and setting out, from the
   recipe or estimated from its cutting tasks; cleanup = { minutes, items } from the recipe (never guessed).
   timeSplit(r, tasks?) → { total, prep, prepGuess, cook, clean, items } */
const PREP_PER_ING = 0.3, PREP_PER_TASK = 1.5;   // minutes: setting out per ingredient (at least 2) + per cutting task
function timeSplit(r, tasks){
  const all = prepTasks(r, 1).length, base = Math.max(2, Math.round(PREP_PER_ING * (r.ingredients||[]).length));
  const n = tasks ? tasks.length : all, guess = Math.round(base + PREP_PER_TASK * n);
  // with "dingen tegelijk" part of the cutting moves into the waits: take that share off the recipe's own prep time
  const prep = r.prep == null ? guess : Math.max(base, Math.round(r.prep - PREP_PER_TASK * (all - n)));
  const total = r.minutes || 0;
  return { total, prep, prepGuess: r.prep == null || n < all, cook: Math.max(0, total - prep), clean: r.cleanup?.minutes || null, items: r.cleanup?.items || [] };
}
/* One question card. title/sub/text are HTML (escape user text yourself).
   actions: [{ label, kind:'primary'|'ghost'|'', id, attrs }]. With sub, the title and sub stack (home-screen style);
   without, the title runs into the text (end-screen style). */
function promptCard({ cls = 'tsug', attrs = '', title = '', sub = '', text = '', actions = [], extra = '' }){
  const head = sub ? `<p><b>${title}</b><small>${sub}</small></p>` : `<span>${title ? `<b>${title}</b>` + (text ? ' ' : '') : ''}${text}</span>`;
  const btns = actions.map(a => `<button class="btn ${a.kind ? a.kind + ' ' : ''}sm" type="button"${a.id ? ` id="${a.id}"` : ''}${a.attrs ? ' ' + a.attrs : ''}>${a.label}</button>`).join('');
  return `<div class="${cls}"${attrs ? ' ' + attrs : ''}>${head}<div class="row2">${btns}</div>${extra}</div>`;
}
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// scroll just far enough that something that just opened is in view, smoothly; keepEl (e.g. the button you tapped) stays visible
function reveal(el, keepEl){
  if (!el || !el.isConnected) return;
  const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  const r = el.getBoundingClientRect(), k = (keepEl || el).getBoundingClientRect();
  const sc = el.closest('.cook-main, .sheet');
  const top = sc ? sc.getBoundingClientRect().top + 8 : (document.querySelector('.bar')?.getBoundingClientRect().bottom || 0) + 12;
  const bottom = sc ? sc.getBoundingClientRect().bottom : innerHeight;
  const need = Math.min(r.bottom - bottom + 16, k.top - top);
  if (need <= 0) return;
  sc ? sc.scrollBy({ top:need, behavior }) : window.scrollBy({ top:need, behavior });
}
document.addEventListener('change', e => { if (e.target.matches?.('input[type=checkbox]')) e.target.classList.add('tapped'); }, true);
document.addEventListener('click', e => { const n = e.target.closest?.('.step .num'); if (n) n.classList.add('tapped'); }, true);
document.addEventListener('toggle', e => { const d = e.target; if (d?.tagName === 'DETAILS' && d.open) requestAnimationFrame(() => reveal(d, d.querySelector('summary'))); }, true);
function toast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.hidden=false; clearTimeout(toast.t); toast.t=setTimeout(()=>t.hidden=true,2200); }
const UNITS = ['g','gr','gram','kg','ml','cl','dl','l','liter','el','eetlepel','eetlepels','tl','theelepel','theelepels','snuf','snufje','mespunt','teen','teentje','teentjes','stuk','stuks','blik','blikje','bakje','zakje','pak','bos','bosje','plak','plakken','kopje','handje','handvol','scheut','scheutje','takje','takjes'];
const FRAC = {'½':.5,'¼':.25,'¾':.75,'⅓':1/3,'⅔':2/3};
function parseNum(s){
  s = s.trim().replace(',', '.');
  if (FRAC[s]!=null) return FRAC[s];
  let m = s.match(/^(\d+)\s*([½¼¾⅓⅔])$/); if (m) return +m[1] + FRAC[m[2]];
  m = s.match(/^(\d+)\/(\d+)$/); if (m) return +m[1] / +m[2];
  m = s.match(/^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)$/); if (m) return (+m[1] + +m[2]) / 2;
  const n = parseFloat(s); return isNaN(n) ? null : n;
}
function parseIngredient(line){
  line = line.trim(); if (!line) return null;
  const m = line.match(/^((?:\d+(?:[.,]\d+)?\s*[-–]\s*\d+(?:[.,]\d+)?)|(?:\d+\s*[½¼¾⅓⅔])|(?:\d+\/\d+)|(?:\d+(?:[.,]\d+)?)|[½¼¾⅓⅔])\s*(.*)$/);
  if (!m) return { amount:null, unit:'', name:line };
  const amount = parseNum(m[1]);
  let rest = m[2].trim(), unit = '';
  const um = rest.match(/^([a-zA-Zé]+)\.?\s+(.*)$/);
  if (um && UNITS.includes(um[1].toLowerCase())) { unit = um[1].toLowerCase(); rest = um[2]; }
  return { amount, unit, name:rest };
}
function fmtNum(n){
  if (n==null) return '';
  if (n >= 20) return String(Math.round(n / (n>=100?5:1)) * (n>=100?5:1));
  const whole = Math.floor(n), frac = n - whole;
  const opts = [[0,''],[.25,'¼'],[1/3,'⅓'],[.5,'½'],[2/3,'⅔'],[.75,'¾'],[1,'']];
  let best = opts[0]; for (const o of opts) if (Math.abs(frac-o[0]) < Math.abs(frac-best[0])) best = o;
  if (Math.abs(frac-best[0]) > .09) return (Math.round(n*10)/10).toString().replace('.', ',');
  const w = best[0]===1 ? whole+1 : whole;
  if (!best[1]) return String(w);
  return (w ? w : '') + best[1];
}
function ingText(ing, factor){
  if (ing.amount==null) return {amt:'', name:ing.name};
  return { amt: fmtNum(ing.amount*factor) + (ing.unit ? ' ' + ing.unit : ''), name: ing.name };
}
function ingLine(ing){ return ing.amount==null ? ing.name : `${fmtNum(ing.amount)}${ing.unit?' '+ing.unit:''} ${ing.name}`.trim(); }
function detectTimer(text){
  const tot = text.match(/(?:in totaal|totaal)\s*(?:nog\s*)?(\d+)\s*(minuten|minuut|min\b)/i);
  if (tot) return +tot[1] * 60;
  const m = text.match(/(\d+)(?:\s*(?:[-–]|tot)\s*(\d+))?\s*(minuten|minuut|min\b|uur|seconden|sec\b)/i);
  if (!m) return null;
  const n = +(m[2]||m[1]); const u = m[3].toLowerCase();
  return u.startsWith('uur') ? n*3600 : u.startsWith('sec') ? n : n*60;
}
function parseStep(line){
  line = line.trim().replace(/^\d+[.)]\s*/, ''); if (!line) return null;
  let title = '', text = line;
  const m = line.match(/^([^:]{2,32}):\s+(.+)$/);
  if (m) { title = m[1].trim(); text = m[2].trim(); }
  return { title, text, timer: detectTimer(text) };
}
const fmtClock = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
function totalLabel(r){ const t=r.minutes; if(!t) return null; return t>=60 ? `${Math.floor(t/60)} u ${t%60?t%60+' min':''}`.trim() : `${t} min`; }

/* deterministic "plate" illustration per recipe: scattered ingredients on a board */
function paintPlate(canvas, seed){
  const dpr = Math.min(2, window.devicePixelRatio||1);
  const w = canvas.clientWidth, h = canvas.clientHeight; if(!w) return;
  canvas.width = w*dpr; canvas.height = h*dpr;
  const c = canvas.getContext('2d'); c.scale(dpr,dpr);
  let s = 0; for (const ch of seed) s = (s*31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => (s = (s*1664525 + 1013904223) >>> 0) / 4294967296;
  const cs = getComputedStyle(document.documentElement);
  const pal = ['--accent','--pop','--danger','--accent'].map(v=>cs.getPropertyValue(v).trim());
  for (let i=0;i<26;i++){
    const x=rnd()*w, y=rnd()*h, r=4+rnd()*14, col=pal[Math.floor(rnd()*pal.length)];
    c.globalAlpha = .18 + rnd()*.35; c.fillStyle = col;
    c.beginPath();
    if (rnd()<.5) c.ellipse(x,y,r,r*(.45+rnd()*.5),rnd()*Math.PI,0,Math.PI*2);
    else c.arc(x,y,r*.7,0,Math.PI*2);
    c.fill();
  }
}

/* ---------- routing (#recept-<id>, #nieuw, #bewerk-<id>) ---------- */
function go(hash){ if (location.hash === '#'+hash || (!hash && !location.hash)) render(); else location.hash = hash; }
let draftFrom = null, carryServings = null;
window.addEventListener('hashchange', () => { const c = carryServings; carryServings = null; if (location.hash !== '#nieuw') draftFrom = null; resetView(); if (c) view.servings = c; render(); window.scrollTo(0,0); });
function resetView(){ if (cookEl) { cookEl.remove(); cookEl = null; document.documentElement.style.overflow = ''; } sheetOpen = false; menuOpen = false; moreOpen = false; view.servings=null; view.checked=new Set(); view.prepped=new Set(); view.tasks=new Set(); view.done=new Set(); view.cook=false; view.cur=0; view.frzOpen=false; view.loadedFor=null; view.reviewOpen=false; view.reviewSid=null; view.proefrit=false; releaseWake(); }
document.getElementById('home-btn').onclick = () => go('');
newBtn.onclick = () => go('nieuw');
const cameFrom = {};
const toggleTo = page => { const h = location.hash.slice(1); if (h === page) go(cameFrom[page] ?? ''); else { cameFrom[page] = h; go(page); } };
document.getElementById('stats-btn').onclick = () => toggleTo('keuken');
document.getElementById('test-btn').onclick = () => toggleTo('test');

function render(){
  const hh = location.hash.slice(1);
  document.getElementById('test-btn').setAttribute('aria-pressed', hh === 'test');
  document.getElementById('stats-btn').setAttribute('aria-pressed', hh === 'keuken');
  newBtn.hidden = !canWrite;
  const gated = !!TESTER && !testerConsent();
  document.documentElement.classList.toggle('gated', gated);
  if (!loaded) return;
  if (gated) return renderGate();   // test version: sign up first, nothing else works before that
  if (TESTER) setTimeout(showNews, 400);   // what's new after an update: on any page, never during cooking
  obTips();   // a tip from the previous page goes, one for this page may appear
  const h = location.hash.slice(1);
  if (h === 'nieuw') return canWrite ? renderEditor(null) : renderLibrary();
  if (h.startsWith('bewerk-')) { const r = recipes.find(x=>x.id===h.slice(7)); return r && canWrite ? renderEditor(r) : renderLibrary(); }
  if (h.startsWith('recept-')) { const r = recipes.find(x=>x.id===h.slice(7)); return r ? renderRecipe(r) : renderLibrary(); }
  if (h === 'keuken') return renderKitchen();
  if (h === 'test') return renderTest();
  renderLibrary();
}

/* ---------- library ---------- */
function renderLibrary(){
  const tags = ['Alles','Favorieten', ...(recipes.some(r=>r.freeze&&r.freeze.status!=='no')?['Invriesbaar']:[]), ...[...new Set(recipes.flatMap(r=>r.tags||[]))].sort((a,b)=>a.localeCompare(b,'nl'))];
  // the app opens on your default filter (hold a filter to set it, hold "Alles" to clear it)
  if (!state.tagSet && loaded) { state.tag = stats.defaultTag || 'Alles'; state.tagSet = true; }
  if (!tags.includes(state.tag)) state.tag = 'Alles';
  const q = state.q.trim().toLowerCase();
  const list = recipes.filter(r => {
    if (state.tag==='Favorieten' && !r.favorite) return false;
    if (state.tag==='Invriesbaar') { if (!r.freeze || r.freeze.status==='no') return false; }
    else if (state.tag!=='Alles' && state.tag!=='Favorieten' && !(r.tags||[]).includes(state.tag)) return false;
    if (!q) return true;
    const hay = [r.title, r.description, ...(r.tags||[]), ...(r.ingredients||[]).map(i=>i.name)].join(' ').toLowerCase();
    return hay.includes(q);
  });
  // one card per family: the first matching variant in family order
  const seen = new Set(), groups = [];
  for (const r of recipes) {
    const k = famKey(r); if (seen.has(k)) continue;
    const vs = variantsOf(r), hit = vs.find(v => list.includes(v));
    if (hit) { seen.add(k); groups.push({r:hit, n:vs.length}); }
  }

  app.innerHTML = `
  <div class="wrap">
    <section class="lib-head">
      ${testerWelcome() || obCard() + (sessionBanner() || askBanner())}
      <h1>Wat ga je <em>vandaag</em> koken?</h1>
      <div class="search">${ICON.search}<input id="q" type="search" placeholder="Zoek op gerecht of ingrediënt, bijv. kip" value="${esc(state.q)}" autocomplete="off" aria-label="Zoek recepten"></div>
      <div class="chips" role="toolbar" aria-label="Filter">${tags.map(t => { const def = t !== 'Alles' && t === stats.defaultTag; return `<button class="chip" type="button" data-tag="${esc(t)}" aria-pressed="${t===state.tag}"${def ? ' aria-label="' + esc(t) + ', standaard bij openen"' : ''}>${esc(t)}${def ? `<span class="pin" aria-hidden="true">${ICON.pin}</span>` : ''}</button>`; }).join('')}</div>
    </section>
    <div class="count">${groups.length} ${groups.length===1?'GERECHT':'GERECHTEN'}</div>
    ${recipes.length===0 ? emptyAll() : groups.length===0 ? `<div class="empty"><h2>Niets gevonden</h2><p>Probeer een ander woord of kies een ander filter.</p></div>` :
    `<div class="grid">${groups.map(g=>card(g.r,g.n)).join('')}</div>`}
    ${verFoot()}
  </div>`;

  const qi = document.getElementById('q');
  qi.oninput = e => { state.q = e.target.value; const pos=qi.selectionStart; renderLibrary(); const n=document.getElementById('q'); n.focus(); n.setSelectionRange(pos,pos); };
  app.querySelectorAll('.chip').forEach(b => {
    let hold = null, held = false;
    const cancel = () => { clearTimeout(hold); hold = null; };
    b.addEventListener('pointerdown', () => { held = false; cancel(); hold = setTimeout(() => { held = true; setDefaultTag(b.dataset.tag); }, 500); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, cancel));
    b.oncontextmenu = e => e.preventDefault();
    b.onclick = () => { if (held) { held = false; return; } state.tag = b.dataset.tag; renderLibrary(); };
  });
  app.querySelectorAll('.card').forEach(b => b.onclick = () => go('recept-'+b.dataset.id));
  app.querySelectorAll('.plate canvas').forEach(cv => paintPlate(cv, cv.dataset.seed));
  const e = document.getElementById('empty-new'); if (e) e.onclick = () => go('nieuw');
  bindTesterWelcome(); bindSession(); bindAsk(); bindObCard(); obTips();
}
/* ---------- your review on the recipe page: read it, or change it after the end screen ---------- */
// the last cooking session of this recipe (where its stars and chips live)
// sessions of this recipe, oldest first; the latest one is what the review block shows
const recipeSessions = r => stats.sessions.filter(s => s.rid === r.id);
const latestSession = r => stats.sessions.find(s => s.id === progress[r.id]?.lastSession && s.rid === r.id) || recipeSessions(r).slice(-1)[0] || null;
// the session being edited: an older one picked from the timeline, or the latest
const reviewSession = r => (view.reviewSid && stats.sessions.find(s => s.id === view.reviewSid)) || latestSession(r);
// notes used to live only on the recipe; for the latest session fall back to that
const sessionNote = (r, s) => s?.note ?? (s && s.id === latestSession(r)?.id ? (progress[r.id]?.note || '') : '');
function timelineHtml(r){
  const list = recipeSessions(r); if (list.length < 2) return '';
  const timed = list.filter(s => s.min), rated = list.filter(s => s.rating);
  const trend = [timed.length >= 2 ? `kooktijd ${timed[0].min} → ${timed.at(-1).min} min` : '', rated.length >= 2 ? `sterren ${rated[0].rating} → ${rated.at(-1).rating}` : ''].filter(Boolean).join(' · ');
  return `<details class="timeline"><summary>Alle sessies (${list.length})${trend ? `<span>${trend}</span>` : ''}</summary>
    <ol>${[...list].reverse().map(s => { const note = sessionNote(r, s); return `<li><div class="tl-head"><b>${fmtDate(s.date)}</b>${s.min ? `<span>${s.min} min</span>` : ''}${s.rating ? stars(s.rating, false) : ''}${(s.chips||[]).length ? `<span>${s.chips.map(esc).join(', ')}</span>` : ''}${canReview() ? `<button class="rev-edit" type="button" data-redit="${esc(s.id)}">Aanpassen</button>` : ''}</div>${note ? `<p>${esc(note)}</p>` : ''}</li>`; }).join('')}</ol></details>`;
}
function reviewBlock(r){
  const p = progress[r.id] || {}, m = mastery(r.id);
  if (!(p.note || p.rating || p.cooked)) return '';
  const head = `<span class="mn-line">${m.n ? `<span class="lvline">${levelDots(m.level)} ${m.label}</span>` : ''}${p.rating && !view.reviewOpen ? stars(p.rating, false) : ''}<span>${p.cooked ? `${p.cooked}× gekookt` : ''}${p.lastCooked ? ` · laatst ${fmtDate(p.lastCooked)}` : ''}${(p.chips||[]).length && !view.reviewOpen ? ` · ${p.chips.map(esc).join(', ')}` : ''}</span>${canReview() && !view.reviewOpen ? `<button class="rev-edit" type="button" id="rev-edit">Aanpassen</button>` : ''}</span>`;
  if (!view.reviewOpen) return `<div class="mynote">${head}${p.note ? `<p><b>Jouw notitie:</b> ${esc(p.note)}</p>` : ''}${timelineHtml(r)}</div>`;
  const s = reviewSession(r), latest = !s || s.id === latestSession(r)?.id;
  const rating = latest ? (p.rating || 0) : (s.rating || 0), chips = (latest ? p.chips : null) || s?.chips || [], note = latest ? (p.note || '') : sessionNote(r, s);
  return `<div class="mynote open" id="review">${head}
    <span class="eyebrow">${latest ? 'Hoe ging het?' : `Sessie van ${fmtDate(s.date)} aanpassen`}</span>
    ${stars(rating, true).replace(/data-star=/g, 'data-rstar=')}
    <div class="chips2">${CHIPS.map(c => `<button type="button" class="chip2" data-rchip="${esc(c)}" aria-pressed="${chips.includes(c)}">${c}</button>`).join('')}</div>
    <label class="cook-sub" for="rev-note">${latest ? 'Notitie voor de volgende keer' : 'Notitie bij deze sessie'}</label>
    <textarea id="rev-note" rows="3" placeholder="Bijv. meer knoflook, kip 1 minuut korter">${esc(note)}</textarea>
    <div class="row2">
      <button class="btn primary sm" type="button" id="rev-done">Klaar</button>
      ${latest ? `<button class="btn sm" type="button" id="rev-copy">Kopieer voor Claude</button>` : ''}
      ${latest && (r.status || 'concept') === 'concept' ? `<button class="btn ghost sm" type="button" id="rev-tested">Markeer als getest</button>` : ''}
    </div>
    <textarea id="rev-out" class="copy-fallback" rows="6" readonly hidden aria-label="Feedback voor Claude"></textarea>
  </div>`;
}
function bindReview(r){
  const $ = id => document.getElementById(id);
  const pr = () => progress[r.id] || (progress[r.id] = {});
  const redraw = tap => { rerender(r); if (tap) app.querySelector(tap)?.classList.add('tapped'); };
  const open = sid => { view.reviewSid = sid; view.reviewOpen = true; rerender(r); requestAnimationFrame(() => reveal($('review'))); };
  const ed = $('rev-edit'); if (ed) ed.onclick = () => open(null);
  app.querySelectorAll('[data-redit]').forEach(b => b.onclick = () => open(b.dataset.redit));
  if (!view.reviewOpen || !$('rev-note')) return;   // the review block is only drawn when this recipe has a review
  // every change goes to the session; the latest session also updates the recipe's own review
  const sess = () => reviewSession(r), isLatest = () => !sess() || sess().id === latestSession(r)?.id;
  const saveNote = () => { const v = $('rev-note').value.trim(), s = sess();
    if (s && (s.note ?? '') !== v) { s.note = v; saveStats(); }
    if (isLatest() && v !== (pr().note||'')) { pr().note = v; pr().noteDate = today(); persist(r); } };
  app.querySelectorAll('[data-rstar]').forEach(b => b.onclick = () => { saveNote(); const v = +b.dataset.rstar, s = sess();
    if (isLatest()) pr().rating = v; if (s) { s.rating = v; evalBadges(); saveStats(); } persist(r); redraw(`[data-rstar="${b.dataset.rstar}"]`); });
  app.querySelectorAll('[data-rchip]').forEach(b => b.onclick = () => { saveNote(); const c = b.dataset.rchip, s = sess(), cur = (isLatest() ? pr().chips : null) || s?.chips || [];
    const next = cur.includes(c) ? cur.filter(x => x !== c) : [...cur.filter(x => c === 'Precies goed' ? false : x !== 'Precies goed'), c];
    if (isLatest()) pr().chips = next; if (s) { s.chips = next; saveStats(); } persist(r); redraw(`[data-rchip="${c}"]`); });
  $('rev-note').onchange = saveNote;
  $('rev-done').onclick = () => { saveNote(); view.reviewOpen = false; view.reviewSid = null; rerender(r); toast('Review bijgewerkt'); };
  const cp = $('rev-copy'); if (cp) cp.onclick = () => { saveNote(); copyText(feedbackText(r), $('rev-out'), 'Gekopieerd. Plak het in je chat met Claude', 'Tekst geselecteerd, houd ingedrukt om te kopiëren'); };
  const t = $('rev-tested'); if (t) t.onclick = () => { saveNote(); save(r.id, { status:'getest' }, 'Gemarkeerd als getest'); r.status = 'getest'; rerender(r); };
}
function setDefaultTag(t){
  stats.defaultTag = t === 'Alles' ? null : t; saveStats();
  state.tag = t; buzz([8, 40, 8]); renderLibrary();
  toast(t === 'Alles' ? 'Geen standaardfilter meer' : `${t} staat nu standaard aan. Houd Alles vast om dat terug te zetten`);
}
function emptyAll(){
  return `<div class="empty"><h2>Je kookboek is nog leeg</h2>
  <p>${db ? 'Deel een gerecht met Claude in de chat, of voeg er zelf een toe.' : 'Log in bij claude.ai om je recepten te bekijken.'}</p>
  ${canWrite ? '<button class="btn primary" id="empty-new" type="button">Eerste recept toevoegen</button>' : ''}</div>`;
}
function card(r, n=1){
  const t = totalLabel(r);
  const vp = n>1 ? `<span class="vpill">${ICON.layers}${n} varianten</span>` : '';
  return `<button class="card" type="button" data-id="${esc(r.id)}">
    <div class="plate"><canvas data-seed="${esc(r.id+r.title)}"></canvas>${r.favorite?`<span class="fav">${ICON.star.replace('<svg','<svg width="20" height="20"')}</span>`:''}</div>
    <div class="body">
      <h3>${esc(r.title)}</h3>
      <div class="meta">${t?`<span>${ICON.clock}${t}</span>`:''}${r.nutrition?.protein!=null?`<span class="pro">${fmtN(r.nutrition.protein)} g eiwit</span>`:''}${r.nutrition?.kcal!=null?`<span>${Math.round(r.nutrition.kcal)} kcal</span>`:''}</div>
      ${(()=>{ const p=progress[r.id]||{}, ns=(r.steps||[]).length, d=(p.done||[]).length, c=(p.checked||[]).length; if (!d && p.cooked) return `<div class="meta"><span class="prog">${p.cooked}× gekookt${p.rating?' · '+'★'.repeat(p.rating):''}</span></div>`; return d||c ? `<div class="meta"><span class="prog">${d&&d<ns?`Bezig: ${d}/${ns} stappen`:d>=ns&&ns?(p.cooked?`${p.cooked}× gekookt${p.rating?' · '+'★'.repeat(p.rating):''}`:'Laatst helemaal gekookt'):`${c} ingrediënten afgevinkt`}</span></div>` : ''; })()}
      <div class="tags">${statusChip(r)}${vp}</div>
    </div></button>`;
}

/* ---------- recipe ---------- */
function renderRecipe(r){
  const base = r.servings || 2;
  if (view.loadedFor !== r.id) applyProgress(r);
  if (view.servings==null) view.servings = base;
  const factor = view.servings / base;
  const steps = r.steps || [];
  const t = totalLabel(r);

  app.innerHTML = `
  <div class="wrap">
    <section class="hero">
      <div class="hero-top">
        <button class="btn ghost" id="back" type="button">${ICON.back}Recepten</button>
        <span class="spacer"></span>
        ${canWrite?`<button class="btn ghost icon-btn" id="fav" type="button" aria-pressed="${!!r.favorite}" aria-label="${r.favorite?'Uit favorieten':'Favoriet maken'}">${r.favorite?ICON.star:ICON.starO}</button>
        <button class="btn ghost icon-btn" id="rmore" type="button" aria-label="Meer opties" aria-expanded="${!!view.heroMore}">${ICON.dots}</button>
        ${view.heroMore?`<div class="hmenu" role="menu"><button class="more-item" type="button" role="menuitem" id="edit">${ICON.edit}Bewerken</button><button class="more-item" type="button" role="menuitem" id="mkvar">${ICON.layers}Variant maken</button></div>`:''}`:''}
      </div>
      <div class="tags one">${statusChip(r)}${heroTags(r).map(x=>`<span class="tag">${esc(x)}</span>`).join('')}</div>
      <h1>${esc(r.title)}</h1>
      ${variantSwitch(r)}
      ${r.description?`<p class="lead">${esc(r.description)}</p>`:''}
      <div class="meta">${t?`<button class="tsplit-btn" type="button" id="time-btn" aria-expanded="${!!view.timeOpen}" aria-controls="tsplit">${ICON.clock}${t}${ICON.chev}</button>`:''}${t && view.timeOpen ? (() => { const s = timeSplit(r); return `<span class="tsplit" id="tsplit">${s.prepGuess ? '±' : ''}${s.prep} min voorbereiden · ${s.cook} min koken${s.clean ? ` · ±${s.clean} min afwas` : ''}</span>`; })() : ''}${r.keeps?`<span>${ICON.box}${esc(r.keeps)}</span>`:''}${r.freeze?frzBadge(r,true):''}</div>
      ${frzPanel(r)}
      ${kpiHtml(r)}
      <button class="btn primary start" id="cook" type="button">${ICON.pan}${(view.cur>0 || view.sessionStart) && view.done.size<steps.length && !sessionAge(r)?.stale ? `Verder koken (stap ${view.cur+1})` : 'Start met koken'}</button>
      ${reviewBlock(r)}
    </section>

    <div class="layout">
      <aside class="ing-panel" aria-label="Ingrediënten">
        <div class="panel-title"><h2>Ingrediënten</h2>
          <div class="scaler"><button type="button" id="minus" aria-label="Minder porties" ${view.servings<=1?'disabled':''}>−</button><output id="srv" aria-live="polite">${portions(view.servings)}</output><button type="button" id="plus" aria-label="Meer porties">+</button></div>
        </div>
        ${factor!==1?`<p class="scale-note">Hoeveelheden omgerekend van ${base} naar ${view.servings} porties.</p>`:''}
        <ul class="ing-list">${(r.ingredients||[]).map((ing,i)=>{ const x=ingText(ing,factor); return `<li><label><input type="checkbox" id="ing-${i}" data-i="${i}" ${view.checked.has(i)?'checked':''}><span class="amt">${esc(x.amt)}</span><span>${esc(x.name)}</span></label></li>`; }).join('')}</ul>
        ${view.checked.size?`<button class="btn ghost ing-reset" id="uncheck" type="button">Vinkjes wissen</button>`:''}
        <div class="shop">
          <button class="btn" id="copy-list" type="button">${ICON.copy}<span>Kopieer boodschappenlijst</span></button>
          <span class="shop-hint">${view.checked.size?`${view.checked.size} afgevinkt, die sla ik over`:'Vink eerst aan wat je al in huis hebt'}</span>
          <textarea id="copy-fallback" class="copy-fallback" rows="6" readonly hidden aria-label="Boodschappenlijst"></textarea>
        </div>
        ${nutriHtml(r)}
      </aside>

      <section aria-label="Bereiding">
        <div class="panel-title"><h2>Bereiding</h2><span style="display:flex;align-items:center;gap:8px"><span class="eyebrow" id="steps-count">${stepsLabel(steps.length)}</span><button class="btn ghost" id="reset-steps" type="button" style="padding:4px 10px;font-size:.82rem" ${view.done.size?'':'hidden'}>Opnieuw</button></span></div>
        <ol class="steps">${steps.map((s,i)=>stepHtml(s,i,r,factor)).join('')}</ol>
        ${r.notes?`<div class="notes"><h3>Tips</h3><p>${esc(r.notes)}</p></div>`:''}
        ${(r.info||[]).length || (r.tags||[]).length?`<div class="info"><h3>Goed om te weten</h3><dl>${(r.info||[]).map(x=>`<div><dt>${esc(x.label)}</dt><dd>${esc(x.value)}</dd></div>`).join('')}${(r.tags||[]).length?`<div><dt>Labels</dt><dd>${(r.tags||[]).map(esc).join(', ')}</dd></div>`:''}</dl></div>`:''}
      </section>
    </div>
  </div>`;

  document.getElementById('back').onclick = () => go('');
  app.querySelectorAll('.vtab').forEach(b => b.onclick = () => { if (b.dataset.vid!==r.id) { carryServings = view.servings; go('recept-'+b.dataset.vid); } });
  const mv = document.getElementById('mkvar'); if (mv) mv.onclick = () => { view.heroMore = false; draftFrom = r; go('nieuw'); };
  const rm = document.getElementById('rmore'); if (rm) rm.onclick = e => { e.stopPropagation(); view.heroMore = !view.heroMore; rerender(r);
    if (view.heroMore) document.addEventListener('click', ev => { if (view.heroMore && !ev.target.closest('.hmenu')) { view.heroMore = false; const cur = currentRecipe(); if (cur && !view.cook) rerender(cur); } }, { once:true }); };
  bindReview(r);
  const tbtn = document.getElementById('time-btn'); if (tbtn) tbtn.onclick = () => { view.timeOpen = !view.timeOpen; rerender(r); };
  const fb = document.getElementById('frz-btn'); if (fb) fb.onclick = () => { view.frzOpen = !view.frzOpen; rerender(r); if (view.frzOpen) requestAnimationFrame(() => reveal(document.getElementById('frz-panel'), document.getElementById('frz-btn'))); };
  document.getElementById('minus').onclick = () => { view.servings=Math.max(1,view.servings-1); persist(r); rerender(r); };
  document.getElementById('plus').onclick = () => { view.servings=Math.min(40,view.servings+1); persist(r); rerender(r); };
  app.querySelectorAll('.ing-list input').forEach(cb => cb.onchange = () => { const i=+cb.dataset.i; cb.checked?view.checked.add(i):view.checked.delete(i); persist(r); const u=document.getElementById('uncheck'); if(!dragChecking && !!u !== view.checked.size>0) rerender(r); });
  document.getElementById('reset-steps').onclick = () => { view.done.clear(); view.cur = 0; persist(r); rerender(r); };
  const un = document.getElementById('uncheck'); if (un) un.onclick = () => { view.checked.clear(); persist(r); rerender(r); };
  document.getElementById('copy-list').onclick = async () => {
    const items = (r.ingredients||[]).map((ing,i)=>[ing,i]).filter(([,i])=>!view.checked.has(i)).map(([ing])=>{ const x=ingText(ing,factor); return '- ' + (x.amt ? x.amt+' ' : '') + x.name; });
    const text = `Boodschappen: ${r.title}${r.variant?' ('+r.variant+')':''}, ${portions(view.servings)}\n` + items.join('\n');
    const label = document.querySelector('#copy-list span');
    if (await copyText(text, document.getElementById('copy-fallback'), `${items.length} items gekopieerd`, 'Lijst geselecteerd, kopieer hem met je toetsenbord of houd ingedrukt')) {
      label.textContent = 'Gekopieerd!'; setTimeout(() => { if (label.isConnected) label.textContent = 'Kopieer boodschappenlijst'; }, 2000);
    }
  };
  app.querySelectorAll('.step .num').forEach(b => b.onclick = () => { const i=+b.dataset.i; view.done.has(i)?view.done.delete(i):view.done.add(i); persist(r); const eb=document.getElementById('steps-count'); if(eb) eb.textContent=stepsLabel(steps.length); const rs=document.getElementById('reset-steps'); if(rs) rs.hidden=!view.done.size; b.closest('.step').classList.toggle('done'); b.setAttribute('aria-pressed', view.done.has(i)); });
  app.querySelectorAll('.timer[data-k]').forEach(b => b.onclick = () => toggleTimer(r, +b.dataset.i));
  document.getElementById('cook').onclick = () => openCook(r);
  if (pendingFinish && pendingFinish.id === r.id) {
    // finished without the app: count the session up to your last tap and show the end screen
    const f = pendingFinish; pendingFinish = null;
    if (f.stale) stopTimers(t => t.rid === r.id && !t.running);
    openCook(r, Math.max(0, steps.length - 1)); finishSession(r, f.endAt); renderCook(r);
  }
  else if (pendingProefrit) { pendingProefrit = false; resetSession(r); openCook(r, undefined, true); }
  else if (pendingResume) { pendingResume = false; openCook(r, view.cur > 0 || view.sessionStart ? view.cur : undefined); }
  else if (pendingCookStep != null) { const st = pendingCookStep; pendingCookStep = null; openCook(r, st); }
  else if (view.cook) renderCook(r);
  renderTimerBar();
  const fav = document.getElementById('fav'); if (fav) fav.onclick = () => save(r.id, {favorite:!r.favorite}, r.favorite?'Uit favorieten':'Toegevoegd aan favorieten');
  const ed = document.getElementById('edit'); if (ed) ed.onclick = () => { view.heroMore = false; go('bewerk-'+r.id); };
  obTips();
}
const famKey = r => r.family || r.id;
const vName = r => r.variant || 'Origineel';
function variantsOf(r){
  const k = famKey(r);
  return recipes.filter(x => famKey(x)===k).sort((a,b) => (a.family?1:0)-(b.family?1:0) || (a.variantOrder??99)-(b.variantOrder??99) || (a.createdAt||'').localeCompare(b.createdAt||''));
}
const FRZ = { yes:['Invriesbaar',''], partly:['Deels invriesbaar','part'], no:['Niet invriezen','no'] };
function frzBadge(r, interactive){
  const f = r.freeze; if (!f || !FRZ[f.status]) return '';
  const [label, cls] = FRZ[f.status];
  if (!interactive) return `<span class="frz ${cls}">${ICON.snow}${label}</span>`;
  return `<button class="frz ${cls}" type="button" id="frz-btn" aria-expanded="${view.frzOpen}" aria-controls="frz-panel">${ICON.snow}${label}${ICON.chev}</button>`;
}
function frzPanel(r){
  const f = r.freeze; if (!f || !view.frzOpen) return '';
  const facts = [['Houdbaar in vriezer',f.keeps],['Ontdooien',f.thaw],['Opwarmen',f.reheat]].filter(x=>x[1]);
  return `<section class="frz-panel" id="frz-panel" aria-label="Invriezen">
    <h3>${ICON.snow}${f.status==='no'?'Liever niet invriezen':'Zo vries je het in'}</h3>
    ${f.summary?`<p>${esc(f.summary)}</p>`:''}
    ${facts.length?`<dl class="frz-facts">${facts.map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`:''}
    ${(f.steps||[]).length?`<div><p class="frz-sub">Stap voor stap</p><ol class="frz-steps">${f.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol></div>`:''}
  </section>`;
}
const NUTRI_FIELDS =[['kcal','Energie','kcal'],['protein','Eiwit','g'],['carbs','Koolhydraten','g'],['fat','Vet','g'],['fiber','Vezels','g'],['salt','Zout','g']];
const fmtN = v => (Math.round(v*10)/10).toString().replace('.', ',');
const STATUS = { concept:['Concept','st-concept'], getest:['Getest','st-tested'], goed:['Goedgekeurd','st-ok'] };
const statusChip = r => { const st = STATUS[r.status || 'concept']; return `<span class="stchip ${st[1]}">${st[0]}</span>`; };
// the three numbers you choose a meal on: energy, protein, price. Carbs and fat live in the nutrition block.
function kpiHtml(r){
  const n = r.nutrition || {}, c = costPP(r);
  const vs = variantsOf(r), b = vs.length > 1 && vs[0] !== r ? (vs[0].nutrition || {}) : null;
  const sg = x => (x > 0 ? '+' : '−') + Math.abs(x);
  const dk = b && n.kcal != null && b.kcal != null ? Math.round(n.kcal - b.kcal) : 0;
  const dp = b && n.protein != null && b.protein != null ? Math.round(n.protein - b.protein) : 0;
  const items = [
    [n.kcal, 'kcal', Math.round(n.kcal), '', dk ? `<em class="${dk < 0 ? 'good' : ''}">${sg(dk)}</em>` : ''],
    [n.protein, 'eiwit', fmtN(n.protein) + ' g', 'hi', dp ? `<em class="${dp > 0 ? 'good' : ''}">${sg(dp)} g</em>` : ''],
    [c, 'per portie', c != null ? eur(c) : '', '', '']
  ].filter(x => x[0] != null);
  if (!items.length) return '';
  const vsName = b ? ` · verschil t.o.v. ${esc(vName(vs[0]))}` : '';
  return `<div class="kpis" aria-label="Per portie, schatting${vsName}">${items.map(([, l, v, h, d]) => `<div class="kpi ${h||''}"><b>${v}</b><span>${l}${d ? ' ' + d : ''}</span></div>`).join('')}</div>`;
}
// at most three labels up top (main ingredient, type, property); all of them stay under "Goed om te weten"
const MAIN_TAGS = ['Kip','Rund','Varken','Gehakt','Vis','Zalm','Vega','Vegan','Ei'];
const TYPE_TAGS = ['Pasta','Rijst','Bowl','Wrap','Soep','Salade','Curry','Stoof','Ovenschotel','Noedels'];
function heroTags(r){
  const tags = (r.tags||[]).filter(t => t !== r.variant);
  const pick = [tags.find(t => MAIN_TAGS.includes(t)), tags.find(t => TYPE_TAGS.includes(t))].filter(Boolean);
  for (const t of tags) { if (pick.length >= 3) break; if (!pick.includes(t)) pick.push(t); }
  return pick;
}
function nutriHtml(r){
  const n = r.nutrition; if (!n || !NUTRI_FIELDS.some(([k])=>n[k]!=null)) return '';
  const big = [], small = NUTRI_FIELDS.slice(4).filter(([k])=>n[k]!=null);
  const parts = [n.kcal!=null&&Math.round(n.kcal*view.servings)+' kcal', n.protein!=null&&Math.round(n.protein*view.servings)+' g eiwit'].filter(Boolean);
  const tot = parts.length && view.servings!==1 ? `<p class="nutri-note">${view.servings} porties samen: ${parts.join(', ')}</p>` : '';
  return `<div class="nutri" aria-label="Voedingswaarde per portie">
    <div class="nutri-head"><h3>Meer voedingswaarden</h3><span class="eyebrow">per portie · schatting</span></div>
    <div class="nutri-big" hidden>${big.map(([k,l,u])=>`<div class="${k}"><b>${k==='kcal'?Math.round(n[k]):fmtN(n[k])}<small>${u==='g'?'g':''}</small></b><span>${k==='kcal'?'kcal':l}</span></div>`).join('')}</div>
    ${small.length?`<dl class="nutri-small">${small.map(([k,l,u])=>`<div><dt>${l}</dt><dd>${fmtN(n[k])} ${u}</dd></div>`).join('')}</dl>`:''}
    ${tot}${n.note?`<p class="nutri-note">${esc(n.note)}</p>`:''}
  </div>`;
}
function variantSwitch(r){
  const vs = variantsOf(r); if (vs.length<2) return '';
  // the difference with the original is shown on the kcal and protein numbers below
  return `<nav class="variants" aria-label="Varianten van dit gerecht">
    <div class="vtabs">${vs.map(v=>`<button class="vtab" type="button" data-vid="${esc(v.id)}" aria-current="${v.id===r.id}"><b>${esc(vName(v))}</b><span>${v.nutrition?.kcal!=null?Math.round(v.nutrition.kcal)+' kcal':'&nbsp;'}</span></button>`).join('')}</div>
    </nav>`;
}
const stepsLabel = n => view.done.size ? `${view.done.size}/${n} klaar` : `${n} stappen`;
function rerender(r){ const y = window.scrollY; renderRecipe(recipes.find(x=>x.id===r.id) || r); window.scrollTo(0,y); }
function stepHtml(s,i,r,factor){
  // highlight ingredient quantities mentioned in step text e.g. "250 g pasta"
  const text = stepTextHtml(s.text, factor);
  const timer = s.timer ? timerBtn(r, i, s, false) : '';
  return `<li class="step ${view.done.has(i)?'done':''} ${view.cur===i?'current':''}">
    <button class="num" type="button" data-i="${i}" aria-label="Stap ${i+1} afvinken" aria-pressed="${view.done.has(i)}">${i+1}</button>
    <div style="min-width:0">${s.title?`<h3>${esc(s.title)}</h3>`:''}<p>${text}</p>${timer}</div></li>`;
}

/* ---------- cook mode (full screen) ---------- */
const STOP = new Set(['verse','vers','groene','gewone','volkoren','fijn','fijngehakt','geraspt','gehalveerd','blokjes','halve','maantjes','optioneel','uitgelekt','blik','voor','het','pastawater','rode','grote','kleine','extra','naar','smaak','teentje','teentjes','plus','sap','rasp','met','een','van','tot']);
const SHORT_ING = new Set(['ui']);   // ingredients shorter than 3 letters that still count
const wordsOf = t => (t.match(/[a-z]{2,}/g) || []).filter(w => w.length > 2 || SHORT_ING.has(w));
function neededFor(r, s){
  const words = wordsOf((s.title+' '+s.text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''));
  return (r.ingredients||[]).map((ing,i)=>[ing,i]).filter(([ing]) => {
    const keys = wordsOf(ing.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').split(/[,(]/)[0]).filter(k=>!STOP.has(k));
    return keys.some(k => words.some(w => !STOP.has(w) && (w===k || (w.length>=4 && (k.includes(w) || w.includes(k))) || (w.length===3 && k.startsWith(w)))));
  });
}
// quantities in step text, scaled to the chosen portions
const QTY = /(\d+(?:[.,]\d+)?)(?:\s*[-–]\s*(\d+(?:[.,]\d+)?))?\s*(gram|g|ml|kg|el|tl|eetlepels?|theelepels?)\b/g;
function stepTextHtml(text, factor){
  return esc(text).replace(QTY, (m, a, b, u) => {
    if (factor === 1) return `<span class="q">${m}</span>`;
    const sc = v => fmtNum(parseFloat(v.replace(',', '.')) * factor);
    return `<span class="q" title="Origineel: ${m}">${sc(a)}${b ? '–' + sc(b) : ''} ${u}</span>`;
  });
}
let cookEl = null, sheetOpen = false, menuOpen = false, moreOpen = false, ignorePop = false;
let ckSize = 1; try { ckSize = parseFloat(localStorage.getItem('kb-ck-size')) || 1; } catch(e) {}
const CK_SIZES = [0.9, 1, 1.15, 1.3];

/* waiting steps: things that cook by themselves while you can do something else */
const BOILW = /(pasta|spaghetti|penne|fusilli|macaroni|rijst|bulgur|couscous|aardappel|noedel|quinoa)/;
function waitInfo(s){
  if (!s || s.wait === false) return null;
  if (s.wait) return { type:s.wait.type || 'boil', word:s.wait.word || null, min:s.wait.min || (s.timer ? s.timer/60 : 8) };
  const txt = ((s.title||'') + ' ' + (s.text||'')).toLowerCase();
  if (BOILW.test(txt) && /kook/.test(txt) && !/(erdoor|schep de \w+ door|meng|samenvoegen)/.test(txt)) return { type:'boil', word:txt.match(BOILW)[1], min:s.timer ? s.timer/60 : 10 };
  if (/aan de kook/.test(txt) && !s.timer) return { type:'water', word:null, min:8 };
  if (/(pruttel|sudder|stoof|stoven|oven|marine|afkoel|indikk|laat .*(staan|rusten|trekken|weken))/.test(txt) && (s.timer||0) >= 240) return { type:'slow', word:null, min:s.timer/60 };
  return null;
}
/* cutting tasks from ingredient descriptions like "kipfilet, in blokjes" */
function prepTasks(r, factor){
  const out = [];
  (r.ingredients||[]).forEach((ing, k) => {
    const m = ing.name.match(/^([^,]+),\s*([^()]+?)\s*(\(.*\))?$/); if (!m) return;
    const name = m[1].trim(), d = m[2].trim().toLowerCase();
    let txt = null;
    if (/gehalveerd/.test(d)) txt = `Halveer de ${name}`;
    else if (/fijngehakt|gehakt/.test(d)) txt = `Hak de ${name} fijn`;
    else if (/gesnipperd/.test(d)) txt = `Snipper de ${name}`;
    else if (/geraspt/.test(d)) txt = `Rasp de ${name}`;
    else if (/^in /.test(d) || /(gesneden|reepjes|plakjes|ringen|roosjes|stukjes|blokjes)/.test(d)) txt = `Snijd de ${name} ${d}`;
    if (!txt) return;
    const x = ingText(ing, factor);
    out.push({ key:'t'+k, ing:k, text: txt + (x.amt ? ` (${x.amt})` : '') });
  });
  return out;
}
function cookAnswers(r){ const a = progress[r.id]?.answers || {}; return { cut:a.cut || 'no', mode:a.mode || 'parallel' }; }
function setAnswer(r, key, val){ const p = progress[r.id] || (progress[r.id] = {}); p.answers = { ...cookAnswers(r), [key]:val }; persist(r); }
/* the plan for this cooking session, based on the answers */
function cookFlow(r){
  const steps = r.steps || [], ans = cookAnswers(r), factor = view.servings / (r.servings || 2);
  const waits = steps.map(waitInfo);
  const tasks = ans.cut === 'no' ? prepTasks(r, factor) : [];
  const atStep = {}, upfront = [];
  for (const t of tasks) {
    let need = steps.findIndex(s => neededFor(r, s).some(([, k]) => k === t.ing));
    if (need < 0) need = steps.length;
    const w = ans.mode === 'parallel' ? waits.findIndex((wi, j) => wi && j <= need) : -1;
    if (w >= 0) (atStep[w] ||= []).push(t); else upfront.push(t);
  }
  const parallel = {};
  if (ans.mode === 'parallel') waits.forEach((wi, i) => {
    if (!wi || wi.type === 'slow') return;
    const list = [];
    for (let j = i+1; j < steps.length; j++) {
      const txt = ((steps[j].title||'') + ' ' + steps[j].text).toLowerCase();
      if (wi.word ? txt.includes(wi.word) : waitInfo(steps[j])?.type === 'boil') break;
      list.push(j);
    }
    parallel[i] = list;
  });
  return { tasks, atStep, upfront, waits, parallel, ans };
}
// proef: start a proefrit (onboarding): click through, nothing counts
function openCook(r, atStep, proef){
  const n = (r.steps||[]).length; if (!n) return;
  if (atStep == null && sessionAge(r)?.stale) resetSession(r);   // an old, forgotten session starts over
  const fresh = (view.done.size >= n || view.cur >= n) || (view.cur === 0 && view.done.size === 0 && !view.sessionStart);
  if (view.done.size >= n || view.cur >= n) { view.done.clear(); view.cur = 0; }
  if (atStep != null) view.cur = atStep;
  else if (fresh) { view.cur = (progress[r.id]?.cooked||0) >= 2 ? -1 : -2; view.prepped = new Set(); view.tasks = new Set(); view.adjLog = {}; view.sessionStart = null; view.newBadges = []; view.chipsSaved = false; view.proefrit = !!proef; }
  persist(r); track('kook_start', { rid: r.id, at: view.cur, ...proefTag() });
  view.cook = true; view.rated = false; view.proefEnd = null; view.askedFinish = false; view.tSaved = {}; view.renderedStep = null; view.leaveAsk = null; view.fbCopied = false; requestWake();
  try { history.pushState({cook:1}, ''); } catch(e) {}
  renderCook(r);
}
function closeCook(fromPop){
  sheetOpen = false; menuOpen = false; moreOpen = false; view.testMode = false;
  if (view.cook) track('kook_dicht', { i: view.cur, n: (currentRecipe()?.steps||[]).length, ...proefTag() });
  view.cook = false; releaseWake();
  if (view.cur < 0) view.cur = 0;
  cookEl?.remove(); cookEl = null; document.documentElement.style.overflow = '';
  if (!fromPop) { try { const st = history.state; if (st?.cook) { ignorePop = true; history.go(st.layer ? -2 : -1); } } catch(e) {} }
  view.proefEnd = null;
  const r = currentRecipe(); if (r) rerender(r);
  renderTimerBar();
}
const cookR = currentRecipe;
/* panels on top of cook mode (ingredients, leave menu): Android back closes the panel first */
function openLayer(r, which){
  sheetOpen = which === 'ing'; menuOpen = which === 'menu'; moreOpen = which === 'more';
  try { history.pushState({ cook:1, layer:which }, ''); } catch(e) {}
  renderCook(r);
}
function closeLayers(r, fromPop){
  const had = sheetOpen || menuOpen || moreOpen; sheetOpen = false; menuOpen = false; moreOpen = false;
  if (had && !fromPop) { try { if (history.state?.layer) { ignorePop = true; history.back(); } } catch(e) {} }
  if (r && view.cook) renderCook(r);
}
window.addEventListener('popstate', () => {
  if (ignorePop) { ignorePop = false; return; }
  if (sheetOpen || menuOpen || moreOpen) return closeLayers(cookR(), true);
  if (view.cook) {
    // back on the last step: ask once whether you're done, so the session still counts
    const r = cookR();
    if (r && view.cur === (r.steps||[]).length - 1 && !view.askedFinish) {
      view.askedFinish = true;
      try { history.pushState({cook:1}, ''); } catch(e) {}
      return openLayer(r, 'menu');
    }
    closeCook(true);
  }
});
function resetSession(r){
  stopTimers(t => t.rid === r.id);
  view.done = new Set(); view.prepped = new Set(); view.tasks = new Set(); view.adjLog = {}; view.sessionStart = null; view.newBadges = []; view.cur = 0; view.proefrit = false;
  persist(r); refreshTimers();
}
function buzz(ms){ try { navigator.vibrate?.(ms); } catch(e) {} }
function cookGo(r, d){
  const n = r.steps.length;
  view.justDone = null;
  if (d > 0 && view.cur >= 0) {
    if (!view.done.has(view.cur)) view.justDone = view.cur;
    view.done.add(view.cur);
    if (view.cur >= n-1) { finishSession(r); return renderCook(r); }
  }
  view.cur = Math.max(-2, Math.min(n-1, view.cur + d)); persist(r); buzz(8); renderCook(r, d);
}
// endAt: when you actually stopped cooking (defaults to now)
function finishSession(r, endAt){
  const n = r.steps.length;
  view.cur = n; view.done = new Set(r.steps.map((_, k) => k));
  if (view.testMode) { view.lastSession = null; view.newBadges = []; persist(r); return; }
  // a proefrit, or (with onboarding on) tapping through in a few minutes: an end screen, but nothing counts.
  // Only when you tapped to the end yourself: "Ja, afronden" on the home screen (endAt) is always a real session.
  const quick = endAt == null && obActive() && (!view.sessionStart || (Date.now() - view.sessionStart) / 60000 < quickLimit(r));
  if (view.proefrit || quick) {
    view.proefEnd = view.proefrit ? 'proefrit' : 'snel'; view.proefrit = false; view.lastSession = null; view.newBadges = [];
    persist(r); track('proefrit_klaar', { rid: r.id, via: view.proefEnd }); obComplete('proefrit'); buzz(20); return;
  }
  countSession(r, endAt);
}
function countSession(r, endAt){
  const p = progress[r.id] || {}; p.cooked = (p.cooked||0) + 1; p.lastCooked = isoDay(new Date(endAt || Date.now())); progress[r.id] = p;
  recordSession(r, endAt);
  persist(r); buzz(20);
}
function rendRecipeLink(){ return `<button class="btn ghost sm" type="button" id="ck-kitchen" style="align-self:flex-start">${ICON.flame}Bekijk je keuken</button>`; }
function stars(n, interactive){
  return `<div class="stars" role="${interactive?'radiogroup':'img'}" aria-label="${n||0} van 5 sterren">${[1,2,3,4,5].map(k => interactive
    ? `<button type="button" data-star="${k}" class="${k<=n?'on':''}" role="radio" aria-checked="${k===n}" aria-label="${k} ${k===1?'ster':'sterren'}">${ICON.star}</button>`
    : `<span class="${k<=n?'on':''}">${ICON.star}</span>`).join('')}</div>`;
}
const taskList = (list) => `<ul class="ing-list ck-list tasks">${list.map(t => `<li><label><input type="checkbox" data-task="${t.key}" ${view.tasks.has(t.key)?'checked':''}><span>${esc(t.text)}</span></label></li>`).join('')}</ul>`;
function renderCook(r, dir){
  const steps = r.steps || [], n = steps.length, i = view.cur, finished = i >= n;
  const factor = view.servings / (r.servings || 2);
  const flow = cookFlow(r);
  if (!cookEl) { cookEl = document.createElement('div'); bindCookEvents(cookEl); cookEl.className = 'cook'; cookEl.setAttribute('role','dialog'); cookEl.setAttribute('aria-modal','true'); cookEl.setAttribute('aria-label','Kookmodus'); document.body.appendChild(cookEl); document.documentElement.style.overflow = 'hidden'; }
  cookEl.style.setProperty('--ck', ckSize);
  const s = steps[Math.max(0, Math.min(i, n-1))];
  if (i >= 0 && i < n && !view.sessionStart) { view.sessionStart = Date.now(); persist(r); }
  trackCook(r);
  const p = progress[r.id] || {};
  const pan = (r.info||[]).find(x => /pan|gereedschap|nodig/i.test(x.label));
  const hasCut = prepTasks(r, 1).length > 0, hasWait = steps.some(waitInfo);
  let body;
  if (i === -2) {
    const opt = (key, val, label, sub) => `<button type="button" class="opt" data-ans="${key}:${val}" aria-pressed="${flow.ans[key]===val}"><b>${label}</b>${sub?`<small>${sub}</small>`:''}</button>`;
    body = `<div class="ck-left">
        <span class="eyebrow">Even afstemmen</span>
        <h2>Hoe kook je vandaag?</h2>
        <p class="cook-sub">Dan pas ik de stappen erop aan.</p>
        ${proefNote()}
      </div>
      <div class="ck-right qs">
        <div class="qq"><b>Voor hoeveel porties?</b><div class="scaler"><button type="button" id="ck-minus" aria-label="Minder porties" ${view.servings<=1?'disabled':''}>−</button><output aria-live="polite">${view.servings}</output><button type="button" id="ck-plus" aria-label="Meer porties">+</button></div></div>
        ${hasCut ? `<div class="qq col"><b>Moet er nog gesneden worden?</b><div class="opts">${opt('cut','no','Ja, nog snijden','Ik zet het snijwerk in de stappen')}${opt('cut','yes','Nee, ligt klaar','')}</div></div>` : ''}
        ${hasWait ? `<div class="qq col"><b>Tijd besparen?</b><div class="opts">${opt('mode','parallel','Ja, dingen tegelijk','Tijdens het wachten doe je alvast iets anders')}${opt('mode','calm','Nee, rustig aan','Eerst alles klaar, dan stap voor stap')}</div></div>` : ''}
      </div>`;
  } else if (i === -1) {
    const total = (r.ingredients||[]).length, got = (r.ingredients||[]).filter((_,k) => view.prepped.has(k)).length;
    body = `<div class="ck-left">
        <span class="eyebrow">Voordat je begint</span>
        <h2>${flow.upfront.length ? 'Snijd en zet klaar' : 'Zet alles klaar'}</h2>
        ${proefNote()}
        <button class="settings-line" type="button" id="ck-change">${portions(view.servings)} · ${flow.ans.cut==='no'?'nog snijden':'alles gesneden'} · ${flow.ans.mode==='parallel'?'dingen tegelijk':'rustig aan'} <span>Wijzigen</span></button>
        <p class="cook-sub">${n} stappen${r.minutes ? ` · ±${r.minutes} min` : ''} · ${portions(view.servings)}.${Object.keys(flow.atStep).length ? ' Het overige snijwerk doe je straks tijdens het wachten.' : ''}</p>
        ${pan ? `<p class="cook-sub"><b>${esc(pan.label)}:</b> ${esc(pan.value)}</p>` : ''}
        ${(() => { const s = timeSplit(r, flow.upfront); return `<p class="cook-sub">${ICON.clock}±${s.prep} min ${flow.upfront.length ? 'snijden en klaarzetten' : 'klaarzetten'}</p>`; })()}
        ${flow.upfront.length ? `<div><span class="eyebrow">Eerst snijden</span>${taskList(flow.upfront)}</div>` : ''}
      </div>
      <div class="ck-right">
        <span class="eyebrow" id="prep-count">${got}/${total} klaargezet</span>
        <ul class="ing-list ck-list">${(r.ingredients||[]).map((ing,k)=>{ const x=ingText(ing,factor); return `<li><label><input type="checkbox" data-pi="${k}" ${view.prepped.has(k)?'checked':''}><span class="amt">${esc(x.amt)}</span><span>${esc(x.name)}</span></label></li>`; }).join('')}</ul>
      </div>`;
  } else if (finished && view.proefEnd) {
    body = proefEndHtml(r);
  } else if (finished) {
    body = `<div class="ck-left cook-done">
        <span class="eyebrow">Alle ${n} stappen klaar${p.cooked ? ` · ${p.cooked}× gekookt` : ''}</span>
        <h2>Eet smakelijk!</h2>
        ${(() => { const ls = lastSession(); return ls ? `<p class="cook-sub">${ls.min ? `Klaar in ${ls.min} min${ls.recipeMin ? (ls.min <= ls.recipeMin ? ' · sneller dan het recept' : ` · recept zegt ${ls.recipeMin} min`) : ''}. ` : ''}${ls.protein ? `${ls.protein} g eiwit gekookt.` : ''}</p>` : ''; })()}
        ${r.cleanup?.minutes ? `<p class="cook-sub clean-line">Nog ±${r.cleanup.minutes} min afwas${(r.cleanup.items||[]).length ? ': ' + esc(r.cleanup.items.join(', ')) : ''}.</p>` : ''}
        ${(view.newBadges||[]).length ? `<div class="newbadges">${view.newBadges.map(k => { const b = BADGES.find(x => x[0]===k); return `<div class="nb"><i>${ICON[b[1]]}</i><span><small>Nieuwe badge</small><b>${b[2]}</b></span></div>`; }).join('')}</div>` : ''}
        <div class="rate">
        <span class="eyebrow">Hoe ging het?</span>
        ${stars(p.rating||0, true)}
        <div class="chips2">${CHIPS.map(c => `<button type="button" class="chip2" data-chip="${esc(c)}" aria-pressed="${!!lastSession()?.chips?.includes(c)}">${c}</button>`).join('')}</div>
        <label class="cook-sub" for="ck-note">Notitie voor de volgende keer</label>
        <textarea id="ck-note" rows="3" placeholder="Bijv. meer knoflook, kip 1 minuut korter">${esc(p.note||'')}</textarea>
        <button class="btn" type="button" id="ck-save-note">${view.rated ? ICON.check + 'Opgeslagen' : 'Notitie opslaan'}</button>
        </div>
      </div>
      <div class="ck-right cook-next">
        ${Object.entries(view.tSaved||{}).map(([si, t]) => `<div class="tsaved">${ICON.check}<span>${esc(steps[si]?.title || 'Stap ' + (+si+1))} staat voortaan op ${fmtClock(t)}</span></div>`).join('')}
        ${Object.entries(view.testMode ? {} : view.adjLog||{}).filter(([si, d]) => Math.abs(d) >= 30 && steps[si]?.timer).map(([si, d]) => { const st = steps[si], nt = Math.max(30, st.timer + d);
          return promptCard({ attrs:`data-tsug="${si}"`, title:esc(st.title || 'Stap ' + (+si+1)),
            text:`${d > 0 ? `had ${fmtClock(d)} extra nodig` : `was ${fmtClock(-d)} eerder klaar`}. Zet de timer voortaan op ${fmtClock(nt)}?`,
            actions:[{ label:`Ja, voortaan ${fmtClock(nt)}`, kind:'primary', attrs:`data-tyes="${si}" data-t="${nt}"` }, { label:'Nee, was eenmalig', kind:'ghost', attrs:`data-tno="${si}"` }] }); }).join('')}
        ${(() => { const ls = lastSession(); const issues = (ls?.chips||[]).filter(c => c !== 'Precies goed'); const note = view.rated ? (p.note||'') : '';
          if (!canWrite || view.testMode || (!issues.length && !note)) return '';
          return promptCard({ cls:'tsug fb', title:'Verwerken in het recept?', text:'Je gaf aan: ' + esc([...issues, note && '“' + note + '”'].filter(Boolean).join(' · ')),
            actions:[{ label:'Kopieer voor Claude', kind:'primary', id:'ck-fb-copy' }, { label:'Zelf aanpassen', kind:'ghost', id:'ck-fb-edit' }],
            extra:'<textarea id="ck-fb-out" class="copy-fallback" rows="6" readonly hidden aria-label="Feedback voor Claude"></textarea>' }); })()}
        ${canWrite && (r.status || 'concept') === 'concept' && !view.testMode ? promptCard({ title:'Recept getest?', text:'Je hebt het helemaal gekookt. Markeer het als getest.',
            actions:[{ label:'Markeer als getest', kind:'primary', id:'ck-mark-tested' }] }) : ''}
        ${view.leaveAsk ? promptCard({ cls:'tsug leave', attrs:'id="leave-ask"', title: view.leaveAsk.n === 1 ? 'De timervraag hierboven staat nog open.' : `Nog ${view.leaveAsk.n} timervragen open hierboven.`, text:'Die ben je kwijt als je nu weggaat. Je review kun je later nog aanpassen op de receptpagina.',
            actions:[{ label: view.leaveAsk.to === 'kitchen' ? 'Toch naar je keuken' : 'Toch sluiten', kind:'primary', id:'ck-leave-go' }, { label:'Blijven', kind:'ghost', id:'ck-leave-stay' }] }) : ''}
        ${rendRecipeLink()}
      </div>`;
  } else {
    const k = r.id + ':' + i, t = allTimers[k];
    const need = neededFor(r, s);
    const wi = flow.waits[i], wTasks = flow.atStep[i] || [], par = flow.parallel[i] || [];
    const waitCard = wi && flow.ans.mode === 'parallel' && (wTasks.length || par.length) ? `<section class="wait-card" aria-label="Terwijl je wacht">
        <div class="wc-h">${ICON.clock}<b>Terwijl je wacht</b><span data-wk="${esc(k)}">${t ? (t.left<=0 ? 'klaar' : fmtClock(t.left)) : '±' + Math.round(wi.min) + ' min'}</span></div>
        ${wTasks.length ? `<span class="eyebrow">Snijd alvast</span>${taskList(wTasks)}` : ''}
        ${par.length ? `<span class="eyebrow">${wTasks.length ? 'Daarna' : 'Je kunt alvast door met'}</span><ol class="wc-steps">${par.map(j => `<li><b>Stap ${j+1}</b> ${esc(steps[j].title || steps[j].text.slice(0, 50))}</li>`).join('')}</ol>
          <p class="wc-note">${s.timer && !t ? 'Start eerst de timer en tik dan op Volgende.' : 'Tik op Volgende.'} De timer blijft bovenin staan.</p>` : ''}
      </section>` : '';
    body = `<div class="ck-left">
        <span class="eyebrow">Stap ${i+1} van ${n}</span>
        ${s.title?`<h2>${esc(s.title)}</h2>`:''}
        <p class="cook-text">${stepTextHtml(s.text, factor)}</p>
      </div>
      <div class="ck-right">
        ${(() => { // cutting you skipped (on the prep screen or while waiting) comes back on the first step that needs it
          const here = new Set((flow.atStep[i] || []).map(t => t.key));
          const left = flow.tasks.filter(t => !view.tasks.has(t.key) && !here.has(t.key) && need.some(([, k]) => k === t.ing));
          return left.length ? `<div class="need-cut"><span class="eyebrow">Eerst nog snijden</span>${taskList(left)}</div>` : ''; })()}
        ${s.timer ? `<div class="timer-adj">
            <button class="tadj" type="button" data-adj="-60" aria-label="1 minuut minder">−1m</button><button class="tadj" type="button" data-adj="-30" aria-label="30 seconden minder">−30s</button>
            ${timerBtn(r, i, s, true)}
            <button class="tadj" type="button" data-adj="30" aria-label="30 seconden meer">+30s</button><button class="tadj" type="button" data-adj="60" aria-label="1 minuut meer">+1m</button>
          </div>${t ? `<button class="treset" type="button" id="ck-treset">Timer resetten</button>` : ''}` : ''}
        ${need.length ? `<div class="need"><span class="eyebrow">Hiervoor nodig</span><ul class="need-list">${need.map(([ing])=>{ const x=ingText(ing,factor); return `<li>${x.amt?`<b>${esc(x.amt)}</b>`:''}${esc(x.name)}</li>`; }).join('')}</ul></div>` : ''}
        ${waitCard}
      </div>`;
  }
  const nextS = i >= 0 && !finished && i < n-1 ? steps[i+1] : i === -1 ? steps[0] : null;
  // re-rendering the same step (a star, a chip, a timer tap) keeps your scroll position
  const sameStep = !dir && view.renderedStep === i;
  const keepMain = sameStep ? cookEl.querySelector('#ck-main')?.scrollTop : null;
  const keepSheet = sameStep ? cookEl.querySelector('.sheet')?.scrollTop : null;
  view.renderedStep = i;
  cookEl.innerHTML = `
    <div class="cook-top">
      <button class="btn ghost icon-btn" type="button" id="ck-close" aria-label="Kookmodus sluiten"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      <span class="ttl">${view.testMode ? '<b class="testtag">TEST</b> ' : view.proefrit || view.proefEnd ? '<b class="testtag proef">PROEFRIT</b> ' : ''}${esc(r.title)} · ${portions(view.servings)}</span>
      <button class="btn ghost icon-btn" type="button" id="ck-ing" aria-label="Ingrediënten" aria-expanded="${sheetOpen}">${ICON.list}</button>
      <button class="btn ghost icon-btn" type="button" id="ck-more" aria-label="Meer opties" aria-expanded="${moreOpen}">${ICON.dots}</button>
    </div>
    <div class="segs" role="tablist" aria-label="Stappen">${steps.map((_,k)=>`<button type="button" data-seg="${k}" class="${k===i?'cur':view.done.has(k)?'done':''} ${k===view.justDone?'just':''} ${flow.waits[k]?'wait':''}" aria-label="Stap ${k+1}${view.done.has(k)?', klaar':''}"></button>`).join('')}</div>
    <div class="cook-main" id="ck-main" aria-live="polite">${body}</div>
    ${nextS ? `<div class="next-up"><span>${i === -1 ? 'Eerste stap' : 'Hierna'}:</span> ${esc(nextS.title || nextS.text.slice(0, 60))}</div>` : ''}
    <div class="cook-bar">
      ${finished
        ? `<button class="btn" type="button" id="ck-prev">Terug</button><button class="btn primary" type="button" id="ck-end">Sluiten</button>`
        : i === -2
        ? `<button class="btn" type="button" id="ck-close2">Annuleren</button><button class="btn primary" type="button" id="ck-next">Verder</button>`
        : i === -1
        ? `<button class="btn" type="button" id="ck-prev">Terug</button><button class="btn primary" type="button" id="ck-next">Begin met koken</button>`
        : `<button class="btn" type="button" id="ck-prev">${i===0?'Klaarzetten':'Vorige'}</button><button class="btn primary" type="button" id="ck-next">${i>=n-1?'Klaar':'Volgende'}</button>`}
    </div>
    ${sheetOpen ? `<div class="sheet-back" id="ck-sheet-back"></div><div class="sheet" role="dialog" aria-label="Ingrediënten"><div class="sheet-head"><div class="grab" aria-hidden="true"></div><div class="sh-row"><h3>Ingrediënten · ${portions(view.servings)}</h3><button class="sh-x" type="button" id="ck-sheet-close" aria-label="Ingrediënten sluiten">${ICON.xmark}</button></div></div>
      <ul class="ing-list">${(r.ingredients||[]).map((ing,k)=>{ const x=ingText(ing,factor); return `<li><label><input type="checkbox" data-pi="${k}" ${view.prepped.has(k)?'checked':''}><span class="amt">${esc(x.amt)}</span><span>${esc(x.name)}</span></label></li>`; }).join('')}</ul></div>` : ''}
    ${moreOpen ? `<div class="more-back" id="ck-more-back"></div><div class="more" role="menu" aria-label="Meer opties">
      <div class="more-row"><span>Tekstgrootte</span><div class="sizebtns" role="group" aria-label="Tekstgrootte"><button type="button" id="ck-smaller" aria-label="Kleinere tekst" ${ckSize<=CK_SIZES[0]?'disabled':''}>A<small>−</small></button><output>${Math.round(ckSize*100)}%</output><button type="button" id="ck-bigger" aria-label="Grotere tekst" ${ckSize>=CK_SIZES[CK_SIZES.length-1]?'disabled':''}>A<small>+</small></button></div></div>
      ${i >= -1 && !finished ? `<button class="more-item" type="button" role="menuitem" id="ck-settings">${ICON.edit}Kookinstellingen wijzigen<small>${portions(view.servings)} · ${flow.ans.cut==='no'?'nog snijden':'gesneden'} · ${flow.ans.mode==='parallel'?'tegelijk':'rustig'}</small></button>` : ''}
      ${TESTER ? `<button class="more-item" type="button" role="menuitem" id="ck-feedback">${ICON.edit}Feedback geven<small>Over deze stap</small></button>` : `<button class="more-item" type="button" role="menuitem" id="ck-testmenu">${ICON.gear}Testmenu<small>Pauzeert je sessie</small></button>`}
      ${Object.values(allTimers).some(t => t.rid === r.id) ? `<button class="more-item" type="button" role="menuitem" id="ck-stoptimers">${ICON.clock}Timers van dit recept stoppen</button>` : ''}
      ${i > -2 && !finished ? (view.moreConfirm ? `<div class="more-confirm"><span>${view.moreConfirm === 'stop' ? 'Stoppen zonder op te slaan?' : 'Alles van dit recept terug naar het begin?'}</span><div class="row2"><button class="btn danger sm" type="button" id="mc-yes">${view.moreConfirm === 'stop' ? 'Ja, stoppen' : 'Ja, opnieuw'}</button><button class="btn ghost sm" type="button" id="mc-no">Annuleren</button></div></div>`
        : `<div class="more-sep"></div>
      <button class="more-item" type="button" role="menuitem" id="ck-restart">${ICON.reset}Opnieuw beginnen<small>Vinkjes, stappen en timers terug naar het begin</small></button>
      <button class="more-item danger" type="button" role="menuitem" id="ck-stop">${ICON.xmark}Stoppen<small>Zonder opslaan, telt niet mee</small></button>`) : ''}
    </div>` : ''}
    ${menuOpen ? `<div class="sheet-back" id="ck-menu-back"></div><div class="sheet menu" role="dialog" aria-label="Kookmodus verlaten"><div class="sheet-head"><div class="grab" aria-hidden="true"></div><h3>${i === n-1 ? 'Klaar met koken?' : 'Kookmodus verlaten?'}</h3></div>
      <div class="mopts">
        ${i === n-1 ? `<button class="mopt go" type="button" id="m-finish">${ICON.check}<span><b>Klaar, afronden</b><small>${view.testMode || view.proefrit ? 'Naar het eindscherm.' : 'Telt mee in je keuken. Daarna beoordelen en markeren als getest.'}</small></span></button>` : ''}
        <button class="mopt" type="button" id="m-pause">${ICON.pause}<span><b>Pauzeren</b><small>Later verder waar je was. Timers blijven lopen.</small></span></button>
        <button class="mopt" type="button" id="m-restart">${ICON.reset}<span><b>Opnieuw beginnen</b><small>Vinkjes, stappen en timers van dit recept terug naar het begin.</small></span></button>
        <button class="mopt danger" type="button" id="m-stop">${ICON.xmark}<span><b>Stoppen</b><small>Sessie beëindigen zonder op te slaan. Telt niet mee in je keuken.</small></span></button>
        <button class="btn ghost" type="button" id="m-cancel">Annuleren</button>
      </div></div>` : ''}`;

  if (view.tapped) { cookEl.querySelector(view.tapped)?.classList.add('tapped'); view.tapped = null; }
  view.justDone = null;   // the progress-bar fill plays once, not on every redraw of the same step
  const main = cookEl.querySelector('#ck-main');
  if (keepMain) main.scrollTop = keepMain;
  if (keepSheet) { const sh = cookEl.querySelector('.sheet'); if (sh) sh.scrollTop = keepSheet; }
  if (dir && !matchMedia('(prefers-reduced-motion: reduce)').matches) main.animate([{opacity:0, transform:`translateX(${dir*24}px)`},{opacity:1, transform:'none'}], {duration:180, easing:'ease-out'});
  // swipe a panel down to close it
  cookEl.querySelectorAll('.sheet').forEach(sh => {
    let y0 = null, dy = 0, drag = false;
    sh.addEventListener('touchstart', e => { y0 = (e.target.closest('.sheet-head') || sh.scrollTop <= 0) ? e.touches[0].clientY : null; dy = 0; drag = false; }, {passive:true});
    sh.addEventListener('touchmove', e => { if (y0 == null) return;
      // ticking ingredients by swiping must never drag (or close) the panel
      if (dragChecking) { if (drag) { sh.style.transition = 'transform .2s ease-out'; sh.style.transform = ''; } y0 = null; drag = false; return; }
      dy = e.touches[0].clientY - y0; if (dy > 8) { drag = true; sh.style.transition = 'none'; sh.style.transform = `translateY(${dy}px)`; e.preventDefault(); } else if (drag) { sh.style.transform = ''; } }, {passive:false});
    sh.addEventListener('touchend', () => { if (y0 == null) return; if (drag && dy > 90) closeLayers(r); else { sh.style.transition = 'transform .2s ease-out'; sh.style.transform = ''; } y0 = null; });
  });
  let sx = 0, sy = 0;
  main.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, {passive:true});
  main.addEventListener('touchend', e => { if (e.target.closest('textarea,input,label,.timer-adj')) return; const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; if (Math.abs(dx) > 60 && Math.abs(dy) < 60) { if (dx < 0 && !finished) cookGo(r, 1); else if (dx > 0 && i > -2) { if (finished) { view.cur = n-1; persist(r); renderCook(r,-1); } else cookGo(r,-1); } } }, {passive:true});
  obTips();
}
/* ---------- cook mode: every tap and checkbox, in one place ----------
   To add a button: give it an id (or a data-* attribute) in renderCook and add one line to COOK_CLICK.
   Each handler gets c = { r, i, n, finished, steps, $ } for the recipe and step on screen, and the element tapped. */
function cookCtx(r){ const steps = r.steps || [], n = steps.length, i = view.cur; return { r, i, n, steps, finished: i >= n, $: id => cookEl?.querySelector('#' + id) }; }
const restartAt = r => (progress[r.id]?.cooked||0) >= 2 ? -1 : -2;
const setCkSize = (r, d) => { const idx = Math.max(0, Math.min(CK_SIZES.length-1, CK_SIZES.indexOf(ckSize) + d)); ckSize = CK_SIZES[idx < 0 ? 1 : idx]; try { localStorage.setItem('kb-ck-size', ckSize); } catch(e) {} renderCook(r); };
// a typed note is never lost: keep it when you tap elsewhere or close
function keepNote(r){ const ta = cookEl?.querySelector('#ck-note'); if (!ta) return false; const v = ta.value.trim(), pr = progress[r.id] || (progress[r.id] = {}); const ls = lastSession(); if (ls && (ls.note ?? '') !== v) { ls.note = v; saveStats(); } if (v === (pr.note||'')) return false; pr.note = v; pr.noteDate = new Date().toISOString().slice(0,10); view.rated = true; persist(r); return true; }
const hasFb = () => !!cookEl?.querySelector('#ck-fb-copy');
// the "Verwerken in het recept?" card appears below the note: bring it into view the moment it appears
function revealFb(had){ if (had) return; const c = cookEl?.querySelector('#ck-fb-copy')?.closest('.tsug'); if (c) requestAnimationFrame(() => reveal(c)); }
function feedbackText(r){
  const steps = r.steps || [], ls = lastSession(), pr = progress[r.id] || {}, issues = (ls?.chips||[]).filter(c => c !== 'Precies goed');
  const adj = Object.entries(view.adjLog||{}).filter(([si, d]) => Math.abs(d) >= 30 && steps[si]?.timer).map(([si, d]) => `- ${steps[si].title || 'Stap ' + (+si+1)}: timer ${d > 0 ? '+' : '−'}${fmtClock(Math.abs(d))}`);
  return [`Feedback kooksessie: ${r.title}${r.variant ? ' (' + r.variant + ')' : ''}`,
    `${ls?.date || today()} · ${portions(view.servings)} · status ${STATUS[r.status||'concept']?.[0] || 'Concept'}`,
    ls?.min ? `Kooktijd: ${ls.min} min (recept zegt ${r.minutes || '?'} min)` : '',
    pr.rating ? `Beoordeling: ${pr.rating}/5` : '',
    issues.length ? `Opmerkingen: ${issues.join(', ')}` : '',
    pr.note ? `Notitie: ${pr.note}` : '',
    adj.length ? 'Timers bijgesteld:\n' + adj.join('\n') : ''
  ].filter(Boolean).join('\n') + '\n\nVerwerk dit in het recept volgens het receptformat.';
}
const COOK_CLICK = {
  // top bar and navigation
  '#ck-close':        ({ r, i, n, finished }) => { if (i === n-1) { view.askedFinish = true; return openLayer(r, 'menu'); } const mid = i > -2 && !finished; closeCook(); if (mid) toast('Gepauzeerd. Later verder waar je was.'); },
  '#ck-close2':       () => closeCook(),
  '#ck-ing':          ({ r }) => sheetOpen ? closeLayers(r) : openLayer(r, 'ing'),
  '#ck-more':         ({ r }) => { view.moreConfirm = null; moreOpen ? closeLayers(r) : openLayer(r, 'more'); },
  '#ck-prev':         ({ r, n, finished }) => { if (finished) { view.cur = n-1; persist(r); renderCook(r, -1); } else cookGo(r, -1); },
  '#ck-next':         ({ r }) => cookGo(r, 1),
  '[data-seg]':       ({ r }, el) => { const k = +el.dataset.seg, d = Math.sign(k - view.cur); view.cur = k; persist(r); renderCook(r, d); },
  // questions before cooking
  '#ck-change':       ({ r }) => { view.cur = -2; renderCook(r, -1); },
  '#ck-minus':        ({ r }) => { view.servings = Math.max(1, view.servings-1); persist(r); renderCook(r); },
  '#ck-plus':         ({ r }) => { view.servings = Math.min(40, view.servings+1); persist(r); renderCook(r); },
  '[data-ans]':       ({ r }, el) => { const [key, val] = el.dataset.ans.split(':'); setAnswer(r, key, val); renderCook(r); },
  // timer on a step
  '.timer.big':       ({ r, i }) => toggleTimer(r, i),
  '[data-adj]':       ({ r, i }, el) => adjustTimer(r, i, +el.dataset.adj),
  '#ck-treset':       ({ r, i }) => { stopTimer(r.id + ':' + i); renderCook(r); },
  // ⋯ menu
  '#ck-more-back':    ({ r }) => { view.moreConfirm = null; closeLayers(r); },
  '#ck-smaller':      ({ r }) => setCkSize(r, -1),
  '#ck-bigger':       ({ r }) => setCkSize(r, 1),
  '#ck-settings':     ({ r }) => { closeLayers(null); view.cur = -2; renderCook(r, -1); },
  '#ck-feedback':     ({ r }) => { closeLayers(r); openFeedback(); },
  '#ck-testmenu':     ({ r }) => { resumeCookId = r.id; cameFrom.test = 'recept-' + r.id; closeCook(true); go('test'); },
  '#ck-stoptimers':   ({ r }) => { stopTimers(t => t.rid === r.id); closeLayers(r); toast('Timers gestopt'); },
  '#ck-restart':      ({ r }) => { view.moreConfirm = 'restart'; renderCook(r); },
  '#ck-stop':         ({ r }) => { view.moreConfirm = 'stop'; renderCook(r); },
  '#mc-no':           ({ r }) => { view.moreConfirm = null; renderCook(r); },
  '#mc-yes':          ({ r }) => { const what = view.moreConfirm; view.moreConfirm = null; resetSession(r);
                         if (what === 'stop') { closeCook(); toast('Sessie gestopt'); }
                         else { closeLayers(null); view.cur = restartAt(r); persist(r); renderCook(r); toast('Opnieuw begonnen'); } },
  // ingredient panel
  '#ck-sheet-back':   ({ r }) => closeLayers(r),
  '#ck-sheet-close':  ({ r }) => closeLayers(r),
  // leave / finish sheet
  '#ck-menu-back':    ({ r }) => closeLayers(r),
  '#m-cancel':        ({ r }) => closeLayers(r),
  '#m-finish':        ({ r }) => { closeLayers(null); cookGo(r, 1); },
  '#m-pause':         () => { closeCook(); toast('Gepauzeerd. Later verder waar je was.'); },
  '#m-restart':       ({ r }) => { resetSession(r); closeLayers(null); view.cur = restartAt(r); persist(r); renderCook(r); toast('Opnieuw begonnen'); },
  '#m-stop':          ({ r }) => { resetSession(r); closeCook(); toast('Sessie gestopt'); },
  // end screen
  '[data-star]':      ({ r }, el) => { const pr = progress[r.id] || (progress[r.id] = {}); pr.rating = +el.dataset.star; persist(r); const ls = lastSession(); if (ls) { ls.rating = pr.rating; view.newBadges = [...(view.newBadges||[]), ...evalBadges()]; saveStats(); } renderCook(r); },
  '[data-chip]':      ({ r }, el) => { const ls = lastSession(); if (!ls) return; const had = hasFb(), c = el.dataset.chip;
                         ls.chips = ls.chips?.includes(c) ? ls.chips.filter(x => x !== c) : [...(ls.chips||[]).filter(x => c === 'Precies goed' ? false : x !== 'Precies goed'), c];
                         const pr = progress[r.id] || (progress[r.id] = {}); pr.chips = ls.chips; persist(r); saveStats(); renderCook(r); revealFb(had); },
  '#ck-save-note':    ({ r, $ }) => { const pr = progress[r.id] || (progress[r.id] = {}); pr.note = $('ck-note').value.trim(); const ls = lastSession(); if (ls) { ls.note = pr.note; saveStats(); } pr.noteDate = new Date().toISOString().slice(0,10); view.rated = true; const had = hasFb(); persist(r); renderCook(r); revealFb(had); toast('Notitie opgeslagen bij dit recept'); },
  '[data-tyes]':      ({ r }, el) => { const si = +el.dataset.tyes, nt = +el.dataset.t; const newSteps = r.steps.map((x, k) => k === si ? { ...x, timer: nt } : x);
                         delete view.adjLog[si]; view.tSaved = { ...(view.tSaved||{}), [si]: nt }; persist(r); if (canWrite) save(r.id, { steps: newSteps }, `Timer staat voortaan op ${fmtClock(nt)}`); renderCook(r); },
  '[data-tno]':       ({ r }, el) => { delete view.adjLog[+el.dataset.tno]; persist(r); renderCook(r); },
  '#ck-fb-copy':      ({ r, $ }) => (view.fbCopied = true) && copyText(feedbackText(r), $('ck-fb-out'), 'Gekopieerd. Plak het in je chat met Claude', 'Tekst geselecteerd, houd ingedrukt om te kopiëren'),
  '#ck-fb-edit':      ({ r }) => { closeCook(true); go('bewerk-' + r.id); },
  '#ck-mark-tested':  ({ r }) => { save(r.id, { status:'getest' }, 'Gemarkeerd als getest'); r.status = 'getest'; renderCook(r); },
  '#ck-kitchen':      c => leaveEnd(c, 'kitchen'),
  '#ck-end':          c => leaveEnd(c, 'close'),
  '#ck-leave-go':     () => doLeave(view.leaveAsk?.to),
  '#ck-leave-stay':   ({ r }) => { view.leaveAsk = null; renderCook(r); },
  // end screen of a proefrit (onboarding)
  '#ck-real':         ({ r }) => { view.proefEnd = null; countSession(r); track('echt_gekookt', { rid: r.id }); renderCook(r); toast('Telt mee. Geef het nog sterren!'); },
  '#ck-ob-fb':        () => openFeedback(),
  '#ck-ob-home':      () => { closeCook(true); go(''); },
};
const COOK_CHANGE = {
  // cook-mode checklist is separate from the shopping checklist on the recipe page
  '[data-pi]':   ({ r, i, $ }, cb) => { const k = +cb.dataset.pi; cb.checked ? view.prepped.add(k) : view.prepped.delete(k); persist(r);
                    if (cb.checked) { buzz(10); if (i === -1 && (r.ingredients||[]).every((_, j) => view.prepped.has(j))) { toast('Alles staat klaar. Aan de slag!'); buzz([10,60,10]); } }
                    const e = $('prep-count'); if (e) e.textContent = `${(r.ingredients||[]).filter((_, j) => view.prepped.has(j)).length}/${(r.ingredients||[]).length} klaargezet`; },
  '[data-task]': ({ r }, cb) => { if (cb.checked) buzz(10); cb.checked ? view.tasks.add(cb.dataset.task) : view.tasks.delete(cb.dataset.task); persist(r); },
  '#ck-note':    ({ r }) => { const had = hasFb(); if (keepNote(r)) { renderCook(r); revealFb(had); } },
};
// leaving the end screen: ask only when an answer would be lost (timer question, process feedback, mark as tested)
// review, feedback and "getest" can be changed later on the recipe page; only the timer question is lost when you leave
function openEndQuestions(){ return cookEl?.querySelectorAll('.cook-next [data-tsug]').length || 0; }
function leaveEnd({ r }, to){
  keepNote(r);
  const n = openEndQuestions();
  if (n && !view.leaveAsk) { view.leaveAsk = { to, n }; renderCook(r); requestAnimationFrame(() => reveal(cookEl?.querySelector('#leave-ask'))); return; }
  doLeave(to);
}
function doLeave(to){
  view.leaveAsk = null;
  if (to === 'kitchen') { closeCook(true); go('keuken'); } else { toast('Eet smakelijk!'); closeCook(); }
}
function bindCookEvents(el){
  const route = table => e => {
    const r = cookR(); if (!r) return;
    for (const [sel, fn] of Object.entries(table)) { const hit = e.target.closest(sel); if (hit && el.contains(hit)) {
      // remember what was tapped so only that element pops after the redraw
      const key = ['ans', 'chip', 'star'].find(k => hit.dataset[k] != null); view.tapped = key ? `[data-${key}="${hit.dataset[key]}"]` : null;
      fn(cookCtx(r), hit, e); return; } }
  };
  el.addEventListener('click', route(COOK_CLICK));
  el.addEventListener('change', route(COOK_CHANGE));
}
function updStrip(){}
document.addEventListener('keydown', e => {
  if (!view.cook || e.target.closest?.('input,textarea')) return;
  const r = currentRecipe(); if (!r) return;
  if (e.key==='ArrowRight' && view.cur < r.steps.length) cookGo(r, 1);
  else if (e.key==='ArrowLeft' && view.cur > -2) { if (view.cur >= r.steps.length) { view.cur = r.steps.length-1; persist(r); renderCook(r,-1); } else cookGo(r,-1); }
  else if (e.key===' ' && view.cur >= 0 && r.steps[view.cur]?.timer) { e.preventDefault(); toggleTimer(r, view.cur); }
  else if (e.key==='Escape') { if (sheetOpen || menuOpen || moreOpen) closeLayers(r); else closeCook(); }
});

/* ---------- timers: keep running across pages and reloads, alarm until stopped ---------- */
let actx = null;
const allTimers = {};   // "recipeId:stepIndex" -> {rid, i, title, rtitle, total, left, end, running}
try { for (const t of JSON.parse(localStorage.getItem('kb-timers') || '[]')) { if (t.running) t.left = Math.max(0, Math.ceil((t.end - Date.now())/1000)); if (t.running && t.left <= 0) t.running = false; allTimers[t.rid + ':' + t.i] = t; } } catch(e) {}
function saveTimers(){ try { localStorage.setItem('kb-timers', JSON.stringify(Object.values(allTimers))); } catch(e) {} }
function ensureAudio(){ try { actx = actx || new (window.AudioContext||window.webkitAudioContext)(); actx.resume?.(); } catch(e) {} }
function beep(){ try{ ensureAudio(); const t=actx.currentTime; for(let k=0;k<3;k++){ const o=actx.createOscillator(), g=actx.createGain(); o.frequency.value=880; o.connect(g); g.connect(actx.destination); g.gain.setValueAtTime(.0001,t+k*.35); g.gain.exponentialRampToValueAtTime(.35,t+k*.35+.02); g.gain.exponentialRampToValueAtTime(.0001,t+k*.35+.25); o.start(t+k*.35); o.stop(t+k*.35+.3);} }catch(e){} }
let ticker = null, alarmIv = null, alarmStart = 0;
function timerBtn(r, i, s, big){
  const t = allTimers[r.id + ':' + i];
  const cls = t ? (t.left<=0 ? 'ring' : t.running ? 'running' : 'paused') : '';
  return `<button class="timer ${cls} ${big?'big':''}" type="button" data-k="${esc(r.id)}:${i}" data-i="${i}" aria-label="${t ? (t.left<=0 ? 'Timer stoppen' : t.running ? 'Timer pauzeren' : 'Timer hervatten') : 'Timer starten'}">${t&&t.left<=0?ICON.bell:(t&&t.running?ICON.pause:ICON.play)}<span>${t?(t.left<=0?(big?'Stop':'Tijd! Tik om te stoppen'):fmtClock(t.left)):(big?'':'Timer ')+fmtClock(s.timer)}</span></button>`;
}
function toggleTimer(r, i){
  ensureAudio();
  const k = r.id + ':' + i, s = r.steps[i];
  let t = allTimers[k];
  if (t && t.left <= 0) { stopTimer(k); return; }
  if (!t) t = allTimers[k] = { rid:r.id, i, title:s.title || ('Stap ' + (i+1)), rtitle:shortTitle(r.title), total:s.timer, left:s.timer, end:0, running:false };
  if (t.running) { t.running = false; t.left = Math.max(0, Math.ceil((t.end - Date.now())/1000)); }
  else { t.running = true; t.end = Date.now() + t.left*1000; buzz(12); }
  saveTimers(); startTicker(); refreshTimers();
}
function adjustTimer(r, i, delta){
  ensureAudio();
  const k = r.id + ':' + i, s = r.steps[i];
  let t = allTimers[k];
  // only adjustments made before starting, in the second half, or after the alarm say the recipe time is off;
  // early in the run it is usually a late or early start of the timer
  const left0 = t ? (t.running ? (t.end - Date.now())/1000 : t.left) : null;
  const telling = !t || left0 <= 0 || (!t.running && t.left === t.total) || left0 <= (t.total||0) / 2;
  if (telling && view.cook && view.loadedFor === r.id) { view.adjLog = view.adjLog || {}; view.adjLog[i] = (view.adjLog[i]||0) + delta; }
  if (!t) t = allTimers[k] = { rid:r.id, i, title:s.title || ('Stap ' + (i+1)), rtitle:shortTitle(r.title), total:s.timer, left:s.timer, end:0, running:false };
  if (t.left <= 0) { if (delta <= 0) return; t.left = delta; t.running = true; t.end = Date.now() + delta*1000; if (!Object.values(allTimers).some(x => x.left <= 0)) stopAlarm(); }
  else if (t.running) { t.end = Math.max(Date.now() + 5000, t.end + delta*1000); t.left = Math.ceil((t.end - Date.now())/1000); }
  else t.left = Math.max(5, t.left + delta);
  saveTimers(); startTicker(); refreshTimers(); buzz(6);
  const sp = document.querySelector(`.timer.big[data-k="${CSS.escape(k)}"] span`);
  if (sp) sp.animate([{ transform:`translateY(${delta > 0 ? -5 : 5}px)`, opacity:.6 }, { transform:'none', opacity:1 }], { duration:180, easing:'ease-out' });
  const had = !!cookEl?.querySelector('#ck-treset'); if (view.cook && !had) renderCook(r);
}
function addMinute(k){ const t = allTimers[k]; if (!t) return; if (t.running) t.end += 60000; t.left += 60; saveTimers(); refreshTimers(); }
function stopTimer(k){ stopTimers(t => t.rid + ':' + t.i === k); }
function startTicker(){
  if (ticker) return;
  ticker = setInterval(() => {
    let any = false;
    for (const t of Object.values(allTimers)) {
      if (!t.running) continue; any = true;
      t.left = Math.max(0, Math.ceil((t.end - Date.now())/1000));
      if (t.left <= 0) { t.running = false; saveTimers(); startAlarm(); }
    }
    refreshTimers();
    if (!any) { clearInterval(ticker); ticker = null; }
  }, 500);
}
function startAlarm(){
  if (alarmIv) return;
  alarmStart = Date.now();
  const ring = () => { beep(); buzz([300,150,300]); if (Date.now() - alarmStart > 120000) stopAlarm(); };
  ring(); alarmIv = setInterval(ring, 2500);
}
function stopAlarm(){ clearInterval(alarmIv); alarmIv = null; }
function goTimer(t){ if (t.rid === '_test') { stopTimer('_test:0'); return; } if (view.cook && location.hash.slice(1) === 'recept-' + t.rid) { const r = recipes.find(x => x.id===t.rid); if (r) { view.cur = t.i; persist(r); renderCook(r); } return; } if (location.hash.slice(1) === 'recept-' + t.rid) { const r = recipes.find(x => x.id===t.rid); if (r) openCook(r, t.i); } else { pendingCookStep = t.i; go('recept-' + t.rid); } }
let pendingCookStep = null, pendingResume = false, resumeCookId = null;
function refreshTimers(){
  // buttons on the recipe page and in cook mode
  document.querySelectorAll('.timer[data-k]').forEach(b => {
    const [rid, i] = [b.dataset.k.slice(0, b.dataset.k.lastIndexOf(':')), +b.dataset.k.slice(b.dataset.k.lastIndexOf(':')+1)];
    const r = recipes.find(x => x.id===rid); if (!r?.steps?.[i]) return;
    const tmp = document.createElement('div'); tmp.innerHTML = timerBtn(r, i, r.steps[i], b.classList.contains('big'));
    const nb = tmp.firstElementChild; b.className = nb.className; b.innerHTML = nb.innerHTML; b.setAttribute('aria-label', nb.getAttribute('aria-label'));
  });
  document.querySelectorAll('[data-wk]').forEach(el => { const t = allTimers[el.dataset.wk]; if (t) el.textContent = t.left <= 0 ? 'klaar' : fmtClock(t.left); });
  if (view.cook) { const r = currentRecipe(); if (r) { const has = !!allTimers[r.id + ':' + view.cur]; if (!!cookEl?.querySelector('#ck-treset') !== has && view.cur >= 0 && view.cur < r.steps.length) renderCook(r); } }
  renderTimerBar();
}
const barLabel = (t, list) => new Set(list.map(([, x]) => x.rid)).size > 1 ? `${t.rtitle}: ${t.title}` : t.title;
function renderTimerBar(){
  const bar = document.getElementById('tbar'), al = document.getElementById('talarm'); if (!bar || !al) return;
  const list = Object.entries(allTimers);
  const ringing = list.filter(([,t]) => t.left <= 0);
  al.hidden = !ringing.length;
  if (ringing.length) {
    const sig = ringing.map(([k]) => k).join('|');
    if (al.dataset.sig !== sig) { al.dataset.sig = sig;
    al.innerHTML = `${ICON.bell}<span><b>${ringing.length > 1 ? ringing.length + ' timers klaar' : 'Timer klaar'}</b>${ringing.map(([,t]) => esc(t.rtitle) + ' · ' + esc(t.title)).join(', ')}</span><button type="button" id="talarm-stop">Stop</button>`;
    document.getElementById('talarm-stop').onclick = () => { for (const [k, t] of Object.entries(allTimers)) if (t.left <= 0) delete allTimers[k]; saveTimers(); stopAlarm(); refreshTimers(); }; }
  } else al.dataset.sig = '';
  const show = list.length > 0;
  bar.hidden = !show; if (!show) bar.dataset.sig = '';
  if (show) {
    const sig = list.map(([k, t]) => k + (t.left<=0 ? 'r' : t.running ? 'g' : 'p')).join('|');
    if (bar.dataset.sig === sig) { list.forEach(([k, t]) => { const sp = bar.querySelector(`[data-tk="${CSS.escape(k)}"] span`); if (sp) sp.textContent = `${barLabel(t, list)} · ${t.left<=0?'klaar':fmtClock(t.left)}`; }); return; }
    bar.dataset.sig = sig;
    bar.innerHTML = list.map(([k, t]) => `<button type="button" data-tk="${esc(k)}" class="${t.left<=0?'ring':''}">${t.left<=0?ICON.bell:t.running?ICON.clock:ICON.pause}<span>${esc(barLabel(t, list))} · ${t.left<=0?'klaar':fmtClock(t.left)}</span></button>`).join('');
    bar.querySelectorAll('[data-tk]').forEach(b => b.onclick = () => { const t = allTimers[b.dataset.tk]; if (t) goTimer(t); });
  }
}
async function requestWake(){ try{ wakeLock = await navigator.wakeLock?.request('screen'); wakeState = wakeLock ? 'actief' : 'niet ondersteund'; }catch(e){ wakeLock=null; wakeState = 'geweigerd'; } }
function releaseWake(){ try{ wakeLock?.release(); }catch(e){} wakeLock=null; }

/* ---------- stats & gamification (private per user) ---------- */
const pad2 = n => String(n).padStart(2,'0');
const isoDay = d => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const today = () => isoDay(new Date());
const addDays = (iso, n) => { const d = new Date(iso+'T12:00:00'); d.setDate(d.getDate()+n); return isoDay(d); };
const weekKey = iso => { const d = new Date(iso+'T12:00:00'); d.setDate(d.getDate() - (d.getDay()+6)%7); return isoDay(d); };
const costPP = r => r.cost ? r.cost / (r.servings||2) : null;
const newId = () => Math.random().toString(36).slice(2,9);
const eur = n => '€' + (Math.round(n*100)/100).toFixed(2).replace('.', ',');
let stats = { sessions:[], weekGoal:2, compare:12, badges:{}, asked:[], updatedAt:'' };
try { const l = JSON.parse(localStorage.getItem('kb-stats') || 'null'); if (l?.sessions) stats = { ...stats, ...l }; } catch(e) {}
let statsT = null;
/* ---------- appearance: theme mode and accent colour (free; stored in stats so it follows your account) ---------- */
const ACCENTS = [['basilicum','Basilicum','#2f6b3a'],['tomaat','Tomaat','#b0412a'],['bietje','Bietje','#a0305e'],['aubergine','Aubergine','#6a3d90'],['blauwebes','Blauwe bes','#3a52a3']];
let themeSetByApp = false;   // only remove data-theme if we set it (the host may set it too)
function applyAppearance(){
  const a = stats.appearance || {}, root = document.documentElement;
  if (a.accent && a.accent !== 'basilicum') root.dataset.accent = a.accent; else delete root.dataset.accent;
  if (a.mode === 'light' || a.mode === 'dark') { root.dataset.theme = a.mode; themeSetByApp = true; }
  else if (themeSetByApp) { delete root.dataset.theme; themeSetByApp = false; }
}
function setAppearance(p){ stats.appearance = { ...(stats.appearance||{}), ...p }; saveStats(); applyAppearance(); renderKitchen(); }
function appearanceHtml(){
  const a = stats.appearance || {};
  return `<div class="section-h"><h2>Weergave</h2></div>
    <div class="appearance">
      <div class="seg" role="group" aria-label="Thema">${[['auto','Automatisch'],['light','Licht'],['dark','Donker']].map(([v, l]) => `<button type="button" class="seg-btn" data-mode="${v}" aria-pressed="${(a.mode||'auto') === v}">${l}</button>`).join('')}</div>
      <div class="swatches" role="group" aria-label="Accentkleur">${ACCENTS.map(([k, l, c]) => `<button type="button" class="swatch" data-sw="${k}" aria-pressed="${(a.accent||'basilicum') === k}" style="--sw:${c}">${l}</button>`).join('')}</div>
    </div>`;
}
applyAppearance();
function saveStats(){
  stats.updatedAt = new Date().toISOString();
  try { localStorage.setItem('kb-stats', JSON.stringify(stats)); } catch(e) {}
  trackSessions();
  if (!db || !uid) return;
  clearTimeout(statsT);
  statsT = setTimeout(async () => { try { await db.collection('data/users/' + uid).doc('_stats').set(JSON.parse(JSON.stringify(stats))); lastSync = Date.now(); syncErr = null; } catch(e) { syncErr = e?.code || 'onbekend'; } statsT = null; }, 600);
}
const CHIPS = ['Precies goed', 'Te zout', 'Te flauw', 'Te droog', 'Duurde langer'];
function cookDays(weekStart){ const end = addDays(weekStart, 7); return new Set(stats.sessions.filter(s => s.date >= weekStart && s.date < end).map(s => s.date)); }
function weekStreak(){
  let wk = weekKey(today()), n = 0;
  if (cookDays(wk).size < stats.weekGoal) wk = addDays(wk, -7);   // this week is not over yet
  while (cookDays(wk).size >= stats.weekGoal && n < 520) { n++; wk = addDays(wk, -7); }
  return n;
}
function weeksMet(){ return new Set(stats.sessions.map(s => weekKey(s.date))).size && [...new Set(stats.sessions.map(s => weekKey(s.date)))].filter(w => cookDays(w).size >= stats.weekGoal).length; }
function mastery(rid){
  const ss = stats.sessions.filter(s => s.rid === rid), rated = ss.filter(s => s.rating);
  const avg = rated.length ? rated.reduce((a, s) => a + s.rating, 0) / rated.length : null;
  const level = ss.length >= 3 && avg != null && avg >= 4 ? 3 : Math.min(ss.length, 2);
  return { n:ss.length, avg, level, label:['Nieuw','Geprobeerd','Bekend','Beheerst'][level], fastest: ss.filter(s => s.min).reduce((a, s) => a == null || s.min < a ? s.min : a, null) };
}
const BADGES = [
  ['first',  'pan',    'Eerste gerecht',       'Kook je eerste recept helemaal af in de kookmodus', () => stats.sessions.length >= 1],
  ['korst',  'flame',  'Korstje-meester',      'Kook 3 keer een recept met een goudbruin korstje', () => stats.sessions.filter(s => s.korstje).length >= 3],
  ['multi',  'layers', 'Multitasker',          'Kook 3 keer met "dingen tegelijk"', () => stats.sessions.filter(s => s.mode === 'parallel').length >= 3],
  ['fast',   'clock',  'Sneller dan het recept','Ben klaar binnen de tijd die het recept aangeeft', () => stats.sessions.some(s => s.min && s.recipeMin && s.min <= s.recipeMin)],
  ['ten',    'box',    '10 maaltijden',        'Kook in totaal 10 porties', () => stats.sessions.reduce((a, s) => a + (s.servings||0), 0) >= 10],
  ['week',   'check',  'Weekdoel gehaald',     'Haal je weekdoel voor het eerst', () => weeksMet() >= 1],
  ['streak3','flame',  '3 weken op rij',       'Haal 3 weken achter elkaar je weekdoel', () => weekStreak() >= 3],
  ['master', 'star',   'Recept beheerst',      'Kook een recept 3 keer met gemiddeld 4 sterren of meer', () => [...new Set(stats.sessions.map(s => s.rid))].some(id => mastery(id).level === 3)],
  ['fifty',  'box',    '50 maaltijden',        'Kook in totaal 50 porties', () => stats.sessions.reduce((a, s) => a + (s.servings||0), 0) >= 50]
];
function evalBadges(){ const got = []; for (const [k,,,, test] of BADGES) if (!stats.badges[k] && test()) { stats.badges[k] = today(); got.push(k); } return got; }
// faster than this (minutes) is clicking through, not cooking: no cooking time, and with onboarding on a proefrit
const quickLimit = r => Math.max(5, (r.minutes || 0) * 0.4);
function recordSession(r, endAt){
  let mins = view.sessionStart ? Math.round(((endAt || Date.now()) - view.sessionStart) / 60000) : null;
  // clicking through without really cooking should not count as a cooking time
  if (mins != null && mins < quickLimit(r)) mins = null;
  const sess = { id:newId(), rid:r.id, title:r.title, date:endAt ? isoDay(new Date(endAt)) : today(), servings:view.servings, mode:cookAnswers(r).mode, min:mins, recipeMin:r.minutes || null,
    protein: r.nutrition?.protein != null ? Math.round(r.nutrition.protein * view.servings) : null,
    cost: costPP(r) != null ? +(costPP(r) * view.servings).toFixed(2) : null,
    korstje: (r.steps||[]).some(s => /korst/i.test(s.text||'')), rating:null, chips:[], note:null, adj:{ ...(view.adjLog||{}) } };
  stats.sessions.push(sess);
  view.lastSession = sess.id; view.newBadges = evalBadges(); view.sessionStart = null;
  track('klaar', { rid: r.id, sid: sess.id, min: sess.min, recipeMin: sess.recipeMin });
  saveStats(); obComplete('koken');
}
function lastSession(){ return stats.sessions.find(s => s.id === view.lastSession) || null; }
const levelDots = lv => `<span class="lvl" aria-label="Niveau ${lv} van 3">${[1,2,3].map(k => `<i class="${k<=lv?'on':''}"></i>`).join('')}</span>`;

function renderKitchen(){
  const ss = stats.sessions;
  const wk = weekKey(today()), days = cookDays(wk), streak = weekStreak();
  const portions = ss.reduce((a, s) => a + (s.servings||0), 0);
  const protein = ss.reduce((a, s) => a + (s.protein||0), 0);
  const withCost = ss.filter(s => s.cost != null);
  const saved = withCost.reduce((a, s) => a + (stats.compare * s.servings - s.cost), 0);
  const timed = ss.filter(s => s.min);
  const avgMin = timed.length ? Math.round(timed.reduce((a, s) => a + s.min, 0) / timed.length) : null;
  const rids = [...new Set(ss.map(s => s.rid))];
  const labels = ['ma','di','wo','do','vr','za','zo'];
  app.innerHTML = `<div class="wrap kitchen">
    <section class="page-head">
      <div><button class="btn ghost" id="back" type="button" style="margin-left:-12px">${ICON.back}Alle recepten</button></div>
      <h1>Jouw keuken</h1>
      <p>Alles wat je in de kookmodus afmaakt, telt hier mee. Alleen jij ziet dit.</p>
    </section>
    <section class="weekcard" aria-label="Deze week">
      <div class="wk-top">
        <div class="wk-main"><span class="eyebrow">Deze week</span><b>${days.size} <small>van ${stats.weekGoal}</small></b><span>kookdagen</span></div>
        <div class="wk-streak ${streak?'on':''}">${ICON.flame}<b>${streak}</b><span>${streak===1?'week':'weken'} op rij</span></div>
      </div>
      <div class="days">${labels.map((l, ix) => { const d = addDays(wk, ix); return `<div class="d ${days.has(d)?'on':''} ${d===today()?'today':''}"><i>${days.has(d)?ICON.check:''}</i><span>${l}</span></div>`; }).join('')}</div>
      <div class="goal-row"><span>Weekdoel</span><div class="scaler"><button type="button" id="goal-minus" aria-label="Lager weekdoel" ${stats.weekGoal<=1?'disabled':''}>−</button><output>${stats.weekGoal} ${stats.weekGoal===1?'dag':'dagen'}</output><button type="button" id="goal-plus" aria-label="Hoger weekdoel" ${stats.weekGoal>=7?'disabled':''}>+</button></div></div>
    </section>
    <div class="ktiles">
      <div class="ktile"><b>${portions}</b><span>maaltijden gekookt</span></div>
      <div class="ktile"><b>${protein >= 1000 ? fmtN(protein/1000) + ' kg' : protein + ' g'}</b><span>eiwit gekookt</span></div>
      <div class="ktile good"><b>${withCost.length ? eur(saved) : '–'}</b><span>bespaard t.o.v. bezorgen</span></div>
      <div class="ktile"><b>${avgMin != null ? avgMin + ' min' : '–'}</b><span>gemiddelde kooktijd</span></div>
    </div>
    ${ss.length ? '' : `<div class="empty-mini">Nog niets gekookt in de kookmodus. Maak een recept af en je eerste badge staat hier.</div>`}
    ${rids.length ? `<div class="section-h"><h2>Recepten</h2><span class="eyebrow">Nieuw · Geprobeerd · Bekend · Beheerst</span></div>
    <div class="klist">${rids.map(id => { const m = mastery(id), r = recipes.find(x => x.id === id), title = r?.title || ss.find(s => s.rid===id).title; return `<button class="krow" type="button" data-open="${esc(id)}" ${r?'':'disabled'}>
      <span class="t"><b>${esc(title)}</b><small>${m.n}× gekookt${m.avg ? ' · ' + fmtN(m.avg) + ' ★' : ''}${m.fastest ? ' · snelste ' + m.fastest + ' min' : ''}</small></span>
      <span class="lv">${levelDots(m.level)}<small>${m.label}</small></span></button>`; }).join('')}</div>` : ''}
    <div class="section-h"><h2>Badges</h2><span class="eyebrow">${Object.keys(stats.badges).length} van ${BADGES.length}</span></div>
    ${(() => { const got = BADGES.filter(([k]) => stats.badges[k]), open = BADGES.filter(([k]) => !stats.badges[k]);
      return `${got.length ? `<div class="badges">${got.map(([k, ic, name]) => `<div class="badge got"><i>${ICON[ic]}</i><b>${name}</b><small>Behaald ${fmtDate(stats.badges[k])}</small></div>`).join('')}</div>` : `<p class="cook-sub" style="margin:0">Je eerste badge haal je met je eerste gerecht in de kookmodus.</p>`}
      ${open.length ? `<details class="ksettings blocked"><summary>Nog te halen (${open.length})</summary><ul class="blist">${open.map(([k, ic, name, desc]) => `<li><i>${ICON[ic]}</i><span><b>${name}</b><small>${esc(desc)}</small></span></li>`).join('')}</ul></details>` : ''}`; })()}
    ${appearanceHtml()}
    <details class="ksettings"><summary>Hoe wordt "bespaard" berekend?</summary>
      <p>Per maaltijd vergelijk ik de geschatte receptkosten met een bezorgmaaltijd. Pas het bedrag aan naar wat jij normaal kwijt bent.</p>
      <div class="field"><label for="cmp">Bezorgmaaltijd kost gemiddeld (€)</label><input class="inp" id="cmp" type="number" min="0" step="0.5" inputmode="decimal" value="${stats.compare}"></div>
    </details>
  </div>`;
  document.getElementById('back').onclick = () => go('');
  app.querySelectorAll('[data-open]').forEach(b => b.onclick = () => go('recept-' + b.dataset.open));
  app.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => setAppearance({ mode: b.dataset.mode }));
  app.querySelectorAll('[data-sw]').forEach(b => b.onclick = () => setAppearance({ accent: b.dataset.sw }));
  document.getElementById('goal-minus').onclick = () => { stats.weekGoal = Math.max(1, stats.weekGoal-1); evalBadges(); saveStats(); renderKitchen(); };
  document.getElementById('goal-plus').onclick = () => { stats.weekGoal = Math.min(7, stats.weekGoal+1); saveStats(); renderKitchen(); };
  document.getElementById('cmp').onchange = e => { const v = parseFloat(String(e.target.value).replace(',', '.')); if (v >= 0) { stats.compare = v; saveStats(); renderKitchen(); } };
}
/* one-time question on the home screen when the last cook was not rated */
function askBanner(){
  const s = [...stats.sessions].reverse().find(x => !x.rating && !(stats.asked||[]).includes(x.id));
  if (!s || s.date < addDays(today(), -3)) return '';
  const ago = s.date === today() ? 'vandaag' : s.date === addDays(today(), -1) ? 'gisteren' : fmtDate(s.date, { weekday:'long', day:'numeric', month:'short' });
  return `<div class="askcard" id="askcard"><span class="q"><span>Hoe was je <b>${esc(shortTitle(s.title))}</b>?</span><small>Gekookt ${ago}</small></span>${stars(0, true)}<button class="x" type="button" id="ask-x" aria-label="Niet beoordelen">×</button></div>`;
}
function bindAsk(){
  const c = document.getElementById('askcard'); if (!c) return;
  const s = [...stats.sessions].reverse().find(x => !x.rating && !(stats.asked||[]).includes(x.id));
  c.querySelectorAll('[data-star]').forEach(b => b.onclick = () => { s.rating = +b.dataset.star; const p = progress[s.rid] || (progress[s.rid] = {}); p.rating = s.rating; pushProgress(s.rid); evalBadges(); saveStats(); toast('Dank je, opgeslagen'); renderLibrary(); });
  document.getElementById('ask-x').onclick = () => { stats.asked = [...(stats.asked||[]), s.id]; saveStats(); renderLibrary(); };
}

/* ---------- receptenarchief: veilige kopie, los van wat het kookboek toont ---------- */
let archive = [], archiveReady = false;
const RECIPE_KEYS = ['title','description','servings','minutes','prep','cleanup','keeps','tags','favorite','status','source','ingredients','steps','notes','nutrition','freeze','info','cost','family','variant','variantOrder','createdAt','updatedAt'];   // status + source (herkomst: {name, author, url, importedAt}) gaan mee bij import/export/archief
const cleanRecipe = r => Object.fromEntries(RECIPE_KEYS.filter(k => r[k] !== undefined).map(k => [k, r[k]]));
const sameRecipe = (a, b) => JSON.stringify(cleanRecipe(a)) === JSON.stringify(cleanRecipe(b));
async function backupAll(){
  let n = 0;
  for (const r of recipes) { const ex = archive.find(a => a.id === r.id); if (ex && sameRecipe(ex, r)) continue; await db.collection('archive').doc(r.id).set({ ...cleanRecipe(r), archivedAt:new Date().toISOString() }); n++; }
  return n;
}
async function importRecipes(text){
  let data; try { data = JSON.parse(text); } catch(e) { throw new Error('Dit is geen geldig receptenbestand (JSON).'); }
  const list = Array.isArray(data) ? data : Array.isArray(data?.recipes) ? data.recipes : data?.title ? [data] : null;
  if (!list) throw new Error('Geen recepten gevonden in dit bestand.');
  let added = 0, updated = 0, same = 0, bad = 0;
  for (const raw of list) {
    if (!raw?.title || !Array.isArray(raw.ingredients) || !Array.isArray(raw.steps)) { bad++; continue; }
    const id = (raw.id && /^[A-Za-z0-9_\-.~:@+]{1,200}$/.test(raw.id)) ? raw.id : slug(raw.title);
    const ex = archive.find(a => a.id === id);
    if (ex && sameRecipe(ex, raw)) { same++; continue; }
    await db.collection('archive').doc(id).set({ ...cleanRecipe(raw), archivedAt:new Date().toISOString() });
    ex ? updated++ : added++;
  }
  return { added, updated, same, bad };
}
function exportText(){
  return JSON.stringify({ app:'Cooking by the Book', version:1, exportedAt:new Date().toISOString(), recipes: archive.map(a => ({ id:a.id, ...cleanRecipe(a) })) }, null, 2);
}
function archiveHtml(){
  return `<h2 class="tm-h">Receptenarchief</h2>
    <p class="tm-sub">Een veilige kopie van je recepten. Testen, wissen of bewerken in het kookboek raakt het archief niet.</p>
    ${!archiveReady ? `<div class="empty-mini">Archief laden…</div>` : `
    <div class="tm-arch">${archive.length ? archive.map(a => { const live = recipes.find(r => r.id === a.id); const st = !live ? 'Niet in kookboek' : sameRecipe(a, live) ? 'Gelijk aan kookboek' : 'Kookboek is gewijzigd'; return `<div class="arow">
        <span class="t"><b>${esc(a.title)}</b><small>${st} · bewaard ${fmtDate(a.archivedAt||a.updatedAt||new Date().toISOString())}</small></span>
        <span class="acts">${!live || !sameRecipe(a, live) ? `<button class="btn sm" type="button" data-restore="${esc(a.id)}">Terugzetten</button>` : ''}<button class="x" type="button" data-adel="${esc(a.id)}" aria-label="Uit archief verwijderen">×</button></span>
      </div>`; }).join('') : `<div class="empty-mini">Het archief is leeg.</div>`}</div>
    <div class="tm-acts" style="margin-top:10px">
      ${canWrite ? `<button class="btn" type="button" id="a-backup">Kookboek naar archief</button>` : ''}
      <button class="btn" type="button" id="a-export" ${archive.length ? '' : 'disabled'}>Exporteren</button>
      ${canWrite ? `<label class="btn" for="a-file">Importeren<input id="a-file" type="file" accept=".json,application/json" hidden></label>
      <button class="btn ghost" type="button" id="a-paste-btn">Tekst plakken</button>` : ''}
    </div>
    <div id="a-paste" hidden><textarea class="copy-fallback" id="a-text" rows="6" placeholder="Plak hier een geëxporteerd receptenbestand"></textarea><button class="btn sm" type="button" id="a-import-text" style="margin-top:6px">Importeren</button></div>
    <textarea class="copy-fallback" id="a-out" rows="6" readonly hidden aria-label="Export"></textarea>
    <div id="a-confirm"></div>`}`;
}
function bindArchive(){
  const $ = id => document.getElementById(id);
  const report = (res) => toast([res.added && `${res.added} toegevoegd`, res.updated && `${res.updated} bijgewerkt`, res.same && `${res.same} al aanwezig`, res.bad && `${res.bad} ongeldig`].filter(Boolean).join(', ') || 'Niets te importeren');
  app.querySelectorAll('[data-restore]').forEach(b => b.onclick = async () => { const a = archive.find(x => x.id === b.dataset.restore); try { await db.collection('recipes').doc(a.id).set(cleanRecipe(a)); toast(`${shortTitle(a.title)} staat weer in je kookboek`); } catch(e) { toast('Terugzetten lukte niet'); } });
  app.querySelectorAll('[data-adel]').forEach(b => b.onclick = () => { const a = archive.find(x => x.id === b.dataset.adel);
    $('a-confirm').innerHTML = `<div class="confirm" style="margin-top:10px"><span style="flex:1;min-width:180px">"${esc(a.title)}" uit het archief verwijderen?</span><button class="btn danger sm" type="button" id="ad-yes">Verwijderen</button><button class="btn ghost sm" type="button" id="ad-no">Behouden</button></div>`;
    $('ad-no').onclick = () => $('a-confirm').innerHTML = '';
    $('ad-yes').onclick = async () => { try { await db.collection('archive').doc(a.id).delete(); toast('Uit archief verwijderd'); } catch(e) { toast('Verwijderen lukte niet'); } };
  });
  const bk = $('a-backup'); if (bk) bk.onclick = async () => { bk.disabled = true; try { const n = await backupAll(); toast(n ? `${n} ${n===1?'recept':'recepten'} bewaard in archief` : 'Archief was al up-to-date'); } catch(e) { toast('Bewaren lukte niet'); } bk.disabled = false; };
  const ex = $('a-export'); if (ex) ex.onclick = async () => {
    const text = exportText(), name = `recepten-${new Date().toISOString().slice(0,10)}.json`;
    const dl = await window.claude?.use?.('downloads')?.catch?.(() => null);
    if (dl) { try { await dl.save({ filename:name, data:text }); toast('Export opgeslagen'); return; } catch(e) { if (e?.code === 'declined') return; } }
    const out = $('a-out'); out.value = text; out.hidden = false; out.focus({ preventScroll:true }); out.select(); reveal(out);
    copyText(text, null, 'Export gekopieerd', 'Export staat hieronder, kopieer hem handmatig');
  };
  const f = $('a-file'); if (f) f.onchange = async () => { const file = f.files[0]; if (!file) return; try { report(await importRecipes(await file.text())); } catch(e) { toast(e.message); } f.value = ''; };
  const pb = $('a-paste-btn'); if (pb) pb.onclick = () => { $('a-paste').hidden = !$('a-paste').hidden; if (!$('a-paste').hidden) reveal($('a-paste')); };
  const it = $('a-import-text'); if (it) it.onclick = async () => { try { report(await importRecipes($('a-text').value)); $('a-text').value = ''; $('a-paste').hidden = true; } catch(e) { toast(e.message); } };
}

/* ---------- testmenu ---------- */
const APP_VERSION = 'v50 · 15 okt 2026';
const APP_V = APP_VERSION.split(' ')[0];   // short form (v50): footer, update popup
let lastSync = null, syncErr = null, wakeState = 'nog niet gebruikt', vibrateState = 'nog niet getest';
const ago = t => { if (!t) return 'nog niet'; const s = Math.round((Date.now() - t) / 1000); return s < 60 ? `${s} s geleden` : s < 3600 ? `${Math.round(s/60)} min geleden` : `${Math.round(s/3600)} uur geleden`; };
function testVibrate(){ let ok = false; try { ok = !!navigator.vibrate?.([120, 80, 120]); } catch(e) {} vibrateState = ok ? 'werkt' : 'geblokkeerd'; return ok; }
function renderTest(){
  const lsOk = (() => { try { localStorage.setItem('kb-t', '1'); localStorage.removeItem('kb-t'); return true; } catch(e) { return false; } })();
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  const row = (k, v, cls='') => `<div><dt>${k}</dt><dd class="${cls}">${v}</dd></div>`;
  const nProg = Object.keys(progress).filter(k => k[0] !== '_').length;
  app.innerHTML = `<div class="wrap testmenu">
    <section class="page-head">
      <div><button class="btn ghost" id="back" type="button" style="margin-left:-12px">${ICON.back}Alle recepten</button></div>
      <h1>Testmenu</h1>
      ${resumeCookId && recipes.some(x => x.id === resumeCookId) ? `<button class="btn primary" type="button" id="t-resume" style="justify-self:start">${ICON.pan}Terug naar koken</button>` : ''}
      <p>Status, testknoppen en opschonen. Wat je hier test, telt niet mee in je keuken.</p>
    </section>

    <h2 class="tm-h">Status</h2>
    <dl class="tm-list">
      ${row('Versie', APP_VERSION)}
      ${row('Opslag', db && uid ? 'Gesynchroniseerd met je account' : db ? 'Alleen lezen (niet ingelogd)' : 'Alleen op dit apparaat', db && uid ? 'ok' : 'warn')}
      ${row('Laatst opgeslagen', syncErr ? 'Mislukt: ' + esc(syncErr) : ago(lastSync), syncErr ? 'bad' : '')}
      ${row('Lokale opslag', lsOk ? 'Beschikbaar' : 'Geblokkeerd', lsOk ? 'ok' : 'bad')}
      ${row('Recepten', recipes.length)}
      ${row('Voortgang bewaard', nProg + (nProg === 1 ? ' recept' : ' recepten'))}
      ${row('Kooksessies', stats.sessions.length + ' · ' + Object.keys(stats.badges).length + ' badges')}
      ${row('Actieve timers', Object.keys(allTimers).length)}
    </dl>

    <h2 class="tm-h">Dit apparaat</h2>
    <dl class="tm-list">
      ${row('Trillen', vibrateState === 'werkt' ? 'Werkt' : vibrateState === 'geblokkeerd' ? 'Geblokkeerd door deze omgeving' : 'Nog niet getest', vibrateState === 'werkt' ? 'ok' : vibrateState === 'geblokkeerd' ? 'warn' : '')}
      ${row('Scherm aan houden', 'wakeLock' in navigator ? wakeState : 'Niet ondersteund', wakeState === 'actief' ? 'ok' : wakeState === 'geweigerd' ? 'warn' : '')}
      ${row('Geluid', actx ? (actx.state === 'running' ? 'Aan' : 'Wacht op tik') : 'Nog niet gebruikt')}
      ${row('Thema', dark ? 'Donker' : 'Licht')}
      ${row('Schermbreedte', innerWidth + ' px')}
      ${row('Tekstgrootte kookmodus', Math.round(ckSize * 100) + '%')}
    </dl>

    <h2 class="tm-h">Testen</h2>
    <div class="tm-acts">
      <button class="btn" type="button" id="t-alarm">${ICON.bell}Alarm afspelen</button>
      <button class="btn" type="button" id="t-vib">Trillen testen</button>
      <button class="btn" type="button" id="t-timer">${ICON.clock}Timer van 10 s</button>
      <button class="btn" type="button" id="t-wake">Scherm aan houden testen</button>
      ${recipes.length ? `<button class="btn" type="button" id="t-end">${ICON.pan}Eindscherm kookmodus</button>` : ''}
      <button class="btn" type="button" id="t-ob">${ICON.check}${obDemo() ? 'Onboarding opnieuw' : 'Onboarding bekijken'}</button>
    </div>

    ${db ? archiveHtml() : ''}

    <h2 class="tm-h">Opschonen</h2>
    <p class="tm-sub">Je recepten en je instellingen (weergave, standaardfilter, weekdoel) blijven altijd staan.</p>
    <div class="field"><label for="w-scope">Voor</label><select id="w-scope" class="tm-select"><option value="">Alle recepten</option>${recipes.map(x => `<option value="${esc(x.id)}">${esc(x.title)}${x.variant ? ' (' + esc(x.variant) + ')' : ''}</option>`).join('')}</select></div>
    <div class="tm-wipes">
      <button class="wipe" type="button" data-wipe="session"><b>Lopende kooksessie resetten</b><small>Vinkjes, stappen en timers terug naar het begin. Reviews blijven.</small></button>
      <button class="wipe" type="button" data-wipe="history"><b>Reviews en kookgeschiedenis wissen</b><small>Sterren, chips, notities, sessies en "× gekookt". Keukencijfers en reeks tellen opnieuw.</small></button>
      <button class="wipe" type="button" data-wipe="badges"><b>Badges wissen</b><small>Voor alle recepten. Je verdient ze opnieuw bij je volgende kooksessie.</small></button>
    </div>
    <div id="wipe-confirm"></div>

    <h2 class="tm-h">Goed om te weten</h2>
    <ul class="tm-info">
      <li><b>Recepten</b> staan in je kookboek en zijn voor iedereen met de link zichtbaar.</li>
      <li><b>Voortgang, timers en statistieken</b> zijn privé en worden met je account gesynchroniseerd.</li>
      <li><b>Timers</b> lopen door als je de pagina sluit, maar piepen alleen als de pagina open is.</li>
      <li><b>Trillen en een timer in de statusbalk</b> werken niet binnen de Claude-app. In de Play Store-versie wel.</li>
      <li><b>Prijzen en voedingswaarden</b> zijn schattingen.</li>
    </ul>
  </div>`;
  const $ = id => document.getElementById(id);
  $('back').onclick = () => go('');
  const rs = $('t-resume'); if (rs) rs.onclick = () => { const id = resumeCookId; resumeCookId = null; pendingResume = true; go('recept-' + id); };
  $('t-alarm').onclick = () => { ensureAudio(); beep(); renderTest(); };
  $('t-vib').onclick = () => { const ok = testVibrate(); toast(ok ? 'Trillen werkt' : 'Trillen is hier geblokkeerd'); renderTest(); };
  $('t-timer').onclick = () => { ensureAudio(); allTimers['_test:0'] = { rid:'_test', i:0, title:'Testtimer', rtitle:'Test', total:10, left:10, end:Date.now()+10000, running:true }; saveTimers(); startTicker(); refreshTimers(); toast('Testtimer loopt, kijk bovenin'); renderTest(); };
  $('t-wake').onclick = async () => { await requestWake(); toast(wakeState === 'actief' ? 'Scherm blijft aan' : 'Scherm aan houden lukt hier niet'); setTimeout(releaseWake, 3000); renderTest(); };
  const te = $('t-end'); if (te) te.onclick = () => { const r = recipes[0]; view.testMode = true; pendingCookStep = (r.steps||[]).length - 1; go('recept-' + r.id); };
  // see what a tester sees: missions, tips and the proefrit, from the start (your own cooking stays as it is)
  $('t-ob').onclick = () => { try { localStorage.removeItem('kb-ob'); } catch(e) {} lsSet('kb-ob-demo', true); obStart(); go(''); toast('Onboarding-demo: zo ziet een tester het'); };
  if (db && archiveReady) bindArchive();
  app.querySelectorAll('[data-wipe]').forEach(b => b.onclick = () => {
    const what = b.dataset.wipe, rid = $('w-scope').value, scope = rid ? `"${shortTitle(recipes.find(x => x.id === rid)?.title)}"` : 'alle recepten';
    const label = { session:`Vinkjes, stappen en timers van ${scope} terugzetten?`, history:`Sterren, chips, notities en kooksessies van ${scope} wissen?`, badges:'Alle badges wissen?' }[what];
    $('wipe-confirm').innerHTML = `<div class="confirm" style="margin-top:10px"><span style="flex:1;min-width:180px">${label}</span><button class="btn danger sm" type="button" id="w-yes">Wissen</button><button class="btn ghost sm" type="button" id="w-no">Annuleren</button></div>`;
    $('w-no').onclick = () => $('wipe-confirm').innerHTML = '';
    $('w-yes').onclick = async () => {
      wipe(what, rid ? [rid] : null);
      toast('Gewist'); renderTest();
    };
  });
}

/* Cleanup from the test menu. ids = recipe ids, or null for all recipes. Settings (stats.appearance,
   stats.defaultTag, stats.weekGoal, stats.compare) and the recipes themselves are never touched. */
function wipe(what, ids){
  const all = !ids, pick = id => all || ids.includes(id);
  const targets = all ? [...new Set([...Object.keys(progress), ...recipes.map(r => r.id)])].filter(k => k[0] !== '_') : ids;
  if (what === 'session') {
    for (const id of targets) { const p = progress[id]; if (!p) continue; Object.assign(p, { checked:[], prepped:[], tasks:[], done:[], cur:0, sessionStart:null, adjLog:{}, updatedAt:new Date().toISOString() }); pushProgress(id); }
    stopTimers(t => all || pick(t.rid));
  }
  if (what === 'history') {
    for (const id of targets) { const p = progress[id]; if (!p) continue; for (const k of ['cooked','rating','lastCooked','note','noteDate','chips','lastSession']) delete p[k]; p.updatedAt = new Date().toISOString(); pushProgress(id); }
    stats.sessions = stats.sessions.filter(s => !pick(s.rid)); if (all) stats.asked = []; saveStats();
  }
  if (what === 'badges') { stats.badges = {}; saveStats(); }
  view.loadedFor = null;   // the next page shows the cleaned state, not what was in memory
}
/* ---------- test version: tester id, events, errors, feedback, offline queue ----------
   Only active when TESTER is set (public test version, built by build_testversion.py). Everything goes to Wes's
   Google Sheet through one Apps Script web app (TESTER.endpoint): events, finished cooking sessions, feedback and
   JavaScript errors. Nothing leaves the phone before the tester pressed "Starten" on the welcome card (consent).
   The invite link carries the group (?g=vrienden). no-cors POST: the app cannot read the answer, so a resolved fetch
   counts as sent and a network failure keeps the items in the queue (kb-ev-queue) for the next try. */
const FB_TYPES = ['Snap ik niet', 'Werkt niet', 'Mooi', 'Idee'];
// what each kind of feedback is for, and an example (feedback sheet + the feedback mission)
const FB_HELP = {
  'Snap ik niet': ['Je weet niet wat iets doet, of wat je nu moet doen.', 'Bijv. ik snapte niet waar ik moest tikken om verder te gaan'],
  'Werkt niet':   ['Iets gaat mis, loopt vast of klopt niet. Wes krijgt er direct een melding van.', 'Bijv. de timer piepte niet toen hij klaar was'],
  'Mooi':         ['Iets wat je goed of fijn vindt, zodat het zo blijft.', 'Bijv. fijn dat ik tijdens het wachten al kan snijden'],
  'Idee':         ['Iets wat handig zou zijn of beter kan.', 'Bijv. een knop om het recept naar een vriend te sturen']
};
const lsGet = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch(e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {} };
function testerName(){ return lsGet('kb-tester-name', ''); }
function testerInfo(){ return { id: lsGet('kb-tester-id', ''), name: testerName(), group: lsGet('kb-tester-group', '') }; }
const testerConsent = () => !!TESTER && lsGet('kb-tester-welcomed', false) && !!lsGet('kb-tester-id', '');
function makeTesterId(name){
  const slug = (name || '').normalize('NFD').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8) || 'TESTER';
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', b = crypto.getRandomValues(new Uint8Array(4));
  return slug + '-' + [...b].map(x => abc[x % abc.length]).join('');
}
function screenName(){
  const r = currentRecipe(), n = (r?.steps||[]).length, i = view.cur;
  return view.cook ? (i === -2 ? 'kookmodus: vragen vooraf' : i === -1 ? 'kookmodus: klaarzetten' : i >= n ? 'kookmodus: eindscherm' : `kookmodus: stap ${i+1} van ${n} (${r?.steps[i]?.title || ''})`)
    : location.hash.startsWith('#recept-') ? 'receptpagina' : location.hash === '#keuken' ? 'keuken' : 'startpagina';
}
function feedbackContext(){
  const r = currentRecipe(), t = testerInfo();
  return [`Scherm: ${screenName()}`, r ? `Recept: ${r.title}` : '', t.id ? `Tester: ${t.name} (${t.id}${t.group ? ', ' + t.group : ''})` : '', `Versie: ${APP_VERSION}${TESTER?.build ? ' / test ' + TESTER.build : ''}`, `Scherm: ${innerWidth}×${innerHeight}`, `Toestel: ${navigator.userAgent.replace(/^Mozilla\/5\.0 /, '').slice(0, 120)}`].filter(Boolean).join('\n');
}
// one queue for everything; capped so a broken phone never fills its storage
function track(kind, data = {}){
  if (!TESTER) return;
  const r = currentRecipe();
  const item = { kind, at: new Date().toISOString(), screen: screenName(), rid: r?.id || '', ...data };
  const q = lsGet('kb-ev-queue', []); q.push(item); lsSet('kb-ev-queue', q.slice(-400));
  // send soon (feedback and errors fast); a later event never postpones a flush that is already due sooner
  const wait = kind === 'feedback' || kind === 'fout' ? 300 : 4000, due = Date.now() + wait;
  if (!track.t || due < track.due) { clearTimeout(track.t); track.due = due; track.t = setTimeout(() => { track.t = null; flushEvents(); }, wait); }
}
let flushing = false;
async function flushEvents(){
  if (!TESTER?.endpoint || !testerConsent() || flushing || !navigator.onLine) return;
  const q = lsGet('kb-ev-queue', []); if (!q.length) return;
  flushing = true;
  const batch = q.slice(0, 60);
  const body = JSON.stringify({ tester: testerInfo(), version: APP_VERSION, build: TESTER.build || '', device: navigator.userAgent.slice(0, 160), size: `${innerWidth}×${innerHeight}`, items: batch });
  try {
    await fetch(TESTER.endpoint, { method:'POST', mode:'no-cors', headers:{ 'Content-Type':'text/plain;charset=utf-8' }, body, keepalive: body.length < 60000 });
    const sent = new Set(batch.map(x => x.at + x.kind)); lsSet('kb-ev-queue', lsGet('kb-ev-queue', []).filter(x => !sent.has(x.at + x.kind)));
  } catch(e) { /* offline or blocked: try again later */ }
  flushing = false;
  if (lsGet('kb-ev-queue', []).length && batch.length === 60) setTimeout(flushEvents, 500);
}
// cooking steps: one event per screen in the cook mode (-2 questions, -1 prep, 0..n-1 steps, n end screen)
function trackCook(r){
  if (!TESTER || !r) return;
  const key = r.id + ':' + view.cur; if (trackCook.last === key) return; trackCook.last = key;
  track('stap', { rid: r.id, i: view.cur, n: (r.steps||[]).length, ...proefTag() });
}
// finished sessions (with stars, chips, note, timer changes) are sent whenever they change, so later reviews arrive too
function trackSessions(){
  if (!TESTER) return;
  clearTimeout(trackSessions.t);
  trackSessions.t = setTimeout(() => {
    const sent = lsGet('kb-sess-sent', {});
    for (const s of stats.sessions || []) {
      const v = { sid: s.id, rid: s.rid, title: s.title, date: s.date, servings: s.servings, mode: s.mode || '', min: s.min ?? null, recipeMin: s.recipeMin ?? null, rating: s.rating ?? null, chips: s.chips || [], note: s.note || '', adj: s.adj || {} };
      const h = JSON.stringify(v); if (sent[s.id] === h) continue;
      sent[s.id] = h; track('sessie', v);
    }
    lsSet('kb-sess-sent', sent);
  }, 1500);
}
// JavaScript errors: sent automatically (Wes gets a phone notification), each distinct error once per page load
const seenErrors = new Set();
function trackError(msg, src, stack){
  if (!TESTER || !msg) return;
  const key = msg + '|' + src; if (seenErrors.has(key) || seenErrors.size > 20) return; seenErrors.add(key);
  track('fout', { message: String(msg).slice(0, 300), source: String(src || '').slice(0, 200), stack: String(stack || '').slice(0, 900) });
}
function openFeedback(){
  if (!TESTER && !obDemo()) return;
  document.getElementById('fb-root')?.remove();
  const root = document.createElement('div'); root.id = 'fb-root';
  const ctx = feedbackContext(), t = testerInfo();
  root.innerHTML = `<div class="sheet-back fb-back" id="fb-back"></div>
    <div class="sheet fb-sheet" role="dialog" aria-label="Feedback">
      <div class="sheet-head"><div class="grab" aria-hidden="true"></div><div class="sh-row"><h3>Feedback</h3><button class="sh-x" type="button" id="fb-x" aria-label="Sluiten">${ICON.xmark}</button></div></div>
      <div class="fb-body">
        <div class="chips2" role="group" aria-label="Soort feedback">${FB_TYPES.map((x, k) => `<button type="button" class="chip2" data-fbt="${esc(x)}" aria-pressed="${k === 0}">${x}</button>`).join('')}</div>
        <p class="fb-help" id="fb-help" aria-live="polite">${FB_HELP[FB_TYPES[0]][0]}</p>
        <label class="cook-sub" for="fb-msg">Wat viel je op?</label>
        <textarea id="fb-msg" rows="4" placeholder="${esc(FB_HELP[FB_TYPES[0]][1])}"></textarea>
        <p class="fb-ctx">Gaat automatisch mee: ${esc(screenName())}${currentRecipe() ? ' · ' + esc(currentRecipe().title) : ''}${t.id ? ' · ' + esc(t.id) : ''}</p>
        <button class="btn primary" type="button" id="fb-send">Versturen</button>
      </div>
    </div>`;
  document.body.appendChild(root);
  const close = () => { root.remove(); obTips(); };
  root.querySelector('#fb-back').onclick = close; root.querySelector('#fb-x').onclick = close;
  root.querySelectorAll('[data-fbt]').forEach(b => b.onclick = () => { root.querySelectorAll('[data-fbt]').forEach(x => x.setAttribute('aria-pressed', x === b)); b.classList.add('tapped');
    const h = FB_HELP[b.dataset.fbt] || ['', '']; root.querySelector('#fb-help').textContent = h[0]; root.querySelector('#fb-msg').placeholder = h[1]; });
  root.querySelector('#fb-send').onclick = () => {
    const message = root.querySelector('#fb-msg').value.trim(), type = root.querySelector('[data-fbt][aria-pressed="true"]')?.dataset.fbt || FB_TYPES[0];
    if (!message) { root.querySelector('#fb-msg').focus(); toast('Schrijf eerst kort wat je opviel'); return; }
    track('feedback', { type, message: message.slice(0, 2000), context: ctx });
    close(); toast(!TESTER ? 'Demo: niet verstuurd (alleen in de Proefkeuken)' : type === 'Werkt niet' ? 'Verstuurd, Wes krijgt er direct een melding van' : 'Verstuurd, dank je!');
    obComplete('feedback');
    if (view.cook) { const r = currentRecipe(); if (r) renderCook(r); } else if (!location.hash) renderLibrary();
  };
  setTimeout(() => root.querySelector('#fb-msg')?.focus(), 250);
  obTips();
}
function testerWelcome(){
  if (!TESTER || testerConsent()) return '';
  return `<div class="sesscard tester-welcome" id="tw"><p><b>Welkom in de Proefkeuken!</b><small>Je test een vroege versie van mijn kookapp. Na het starten krijg je <b>3 korte missies</b> die je alles laten zien. Tik op <b>Feedback</b> (rechtsboven) bij alles wat opvalt, onduidelijk is of beter kan.</small></p>
    <div class="field"><label for="tw-name">Hoe heet je? <span class="hint">(zodat Wes weet van wie de feedback is)</span></label><input id="tw-name" value="${esc(testerName())}" placeholder="Voornaam" autocomplete="given-name" maxlength="30"></div>
    <p class="tw-privacy">Je krijgt een persoonlijke test-ID. Wes ziet je voornaam, welke schermen en kookstappen je gebruikt, je sterren, notities en feedback, en foutmeldingen. Geen locatie of contacten. Alles weg? Laat het Wes weten.</p>
    <div class="row2"><button class="btn primary sm" type="button" id="tw-go">Akkoord, starten</button></div></div>`;
}
function bindTesterWelcome(){
  const go = document.getElementById('tw-go'); if (!go) return;
  go.onclick = () => {
    const name = document.getElementById('tw-name').value.trim();
    if (!name) { document.getElementById('tw-name').focus(); toast('Vul eerst je voornaam in'); return; }
    lsSet('kb-tester-name', name);
    if (!lsGet('kb-tester-id', '')) lsSet('kb-tester-id', makeTesterId(name));
    lsSet('kb-tester-welcomed', true); lsSet('kb-seen-version', APP_V);   // new testers start on this version: no update popup
    track('aanmelding', { screen: 'startpagina' }); obStart();
    flushEvents(); registerTester(); if (location.hash) location.hash = ''; else render();   // ('go' is the button here) toast(`Welkom ${name}! Je test-ID is ${lsGet('kb-tester-id', '')}`);
  };
}
// removed by Wes in the dashboard? Ask the server (GET, readable answer) and offer a clean restart.
async function checkTesterStatus(){
  if (!TESTER?.endpoint || !testerConsent() || !navigator.onLine || document.getElementById('tr-root')) return;
  if (Date.now() - (checkTesterStatus.at || 0) < 10 * 60 * 1000) return; checkTesterStatus.at = Date.now();
  try {
    const j = await fetch(`${TESTER.endpoint}?action=status&id=${encodeURIComponent(lsGet('kb-tester-id', ''))}`, { cache:'no-store' }).then(r => r.json());
    if (j.status === 'deleted') showTesterReset();
    else if (j.status === 'unknown') { lsSet('kb-tester-ok', ''); registerTester(); }   // sign-up never arrived: register again
  } catch(e) { /* offline or endpoint unreachable: try again later */ }
}
/* Sign-up with a readable answer (GET, like the status check). The event POST is no-cors, so the app cannot see
   whether it arrived; this call can, and is repeated until the Sheet confirms the tester ('kb-tester-ok' = id). */
async function registerTester(){
  if (!TESTER?.endpoint || !testerConsent() || !navigator.onLine) return;
  const t = testerInfo(); if (lsGet('kb-tester-ok', '') === t.id) return;
  const q = new URLSearchParams({ action:'hello', id:t.id, name:t.name, group:t.group, version:APP_VERSION, size:`${innerWidth}×${innerHeight}`, device:navigator.userAgent.slice(0, 160) });
  try {
    const j = await fetch(`${TESTER.endpoint}?${q}`, { cache:'no-store' }).then(r => r.json());
    if (j.status === 'active') lsSet('kb-tester-ok', t.id); else if (j.status === 'deleted') showTesterReset();
  } catch(e) { /* try again at the next start or status check */ }
}
function resetTester(){
  for (const k of ['kb-tester-id', 'kb-tester-name', 'kb-tester-welcomed', 'kb-tester-ok', 'kb-seen-version', 'kb-ev-queue', 'kb-sess-sent', 'kb-progress', 'kb-stats', 'kb-timers', 'kb-ob']) { try { localStorage.removeItem(k); } catch(e) {} }
  location.hash = ''; location.reload();
}
function showTesterReset(){
  const root = document.createElement('div'); root.id = 'tr-root';
  root.innerHTML = `<div class="sheet-back" style="z-index:70"></div>
    <div class="sheet" role="alertdialog" aria-labelledby="tr-h" style="z-index:71">
      <div class="sheet-head"><div class="grab" aria-hidden="true"></div><div class="sh-row"><h3 id="tr-h">Je testgegevens zijn gewist</h3></div></div>
      <div class="fb-body"><p class="cook-sub" style="margin:0">Wes heeft je gegevens uit de Proefkeuken verwijderd. Wil je weer meedoen? Dan begin je met een schone lei en kies je opnieuw een naam.</p>
        <button class="btn primary" type="button" id="tr-go">Opnieuw aanmelden</button></div></div>`;
  document.body.appendChild(root);
  root.querySelector('#tr-go').onclick = resetTester;
}
if (TESTER) {
  const g = new URLSearchParams(location.search).get('g');
  if (g && !lsGet('kb-tester-group', '')) lsSet('kb-tester-group', g.replace(/[^\w -]/g, '').slice(0, 30));
  window.addEventListener('error', e => trackError(e.message, `${(e.filename || '').split('/').pop()}:${e.lineno || 0}:${e.colno || 0}`, e.error?.stack));
  window.addEventListener('unhandledrejection', e => { const r = e.reason; if (r?.message === 'Alleen-lezen in de testversie') return; trackError(r?.message || String(r), 'promise', r?.stack); });
  window.addEventListener('hashchange', () => setTimeout(() => track('pagina'), 50));
  window.addEventListener('online', flushEvents);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushEvents(); });
  setInterval(flushEvents, 30000);
  setTimeout(() => { track('open'); flushEvents(); }, 1500);
  setTimeout(() => { registerTester(); checkTesterStatus(); }, 2500);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkTesterStatus(); });
  const fbBtn = document.getElementById('fb-btn'); if (fbBtn) { fbBtn.hidden = false; fbBtn.onclick = openFeedback; }
  const tb = document.getElementById('test-btn'); if (tb) tb.hidden = true;
  document.documentElement.classList.add('tester');
}
/* ---------- test version: sign-up gate, version footer, what's new ----------
   Gate: in the test version nothing works before the welcome card is accepted (render() shows only the card).
   What's new: after an update, testers see once what changed (any page, never during cooking).
   New version: raise APP_VERSION and add an entry at the top of CHANGELOG, written for testers (max. 4 short
   lines, only what they notice). A version without an entry updates silently. */
const CHANGELOG = [
  { v:'v50', date:'15 okt', items:[
    'Na een update zie je voortaan in zo\'n venster wat er nieuw is.',
    'Onderaan de startpagina staat welke versie je hebt. Handig als je feedback geeft.',
    'Nieuwe testers melden zich eerst aan, zodat hun feedback altijd goed aankomt.'
  ] }
];
const vnum = v => parseInt(String(v || '').replace(/\D/g, ''), 10) || 0;
function verFoot(){ return `<p class="app-ver">${TESTER ? 'Proefkeuken' : 'Cooking by the Book'} ${esc(APP_V)}</p>`; }
function renderGate(){
  app.innerHTML = `<div class="wrap gate">${testerWelcome()}${verFoot()}</div>`;
  bindTesterWelcome();
}
function showNews(){
  if (!TESTER || !testerConsent() || view.cook || document.getElementById('news-root') || document.getElementById('tr-root')) return;
  const seen = lsGet('kb-seen-version', 'v49');   // testers from before v50 had no marker yet
  if (vnum(seen) >= vnum(APP_V)) return;
  const news = CHANGELOG.filter(c => vnum(c.v) > vnum(seen) && vnum(c.v) <= vnum(APP_V)).slice(0, 3);
  lsSet('kb-seen-version', APP_V);
  if (!news.length) return;
  const root = document.createElement('div'); root.id = 'news-root';
  root.innerHTML = `<div class="sheet-back" id="news-back" style="z-index:70"></div>
    <div class="sheet news-sheet" role="dialog" aria-labelledby="news-h" style="z-index:71">
      <div class="sheet-head"><div class="grab" aria-hidden="true"></div><div class="sh-row"><h3 id="news-h">Nieuw in de Proefkeuken</h3><span class="news-v">${esc(APP_V)}</span></div></div>
      <div class="fb-body">${news.map(c => `<div class="news-block">${news.length > 1 ? `<p class="news-sub">${esc(c.v)} · ${esc(c.date)}</p>` : ''}<ul>${c.items.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}
        <p class="news-foot">Versie ${esc(APP_V)}${news.length === 1 ? ' · ' + esc(news[0].date) : ''} · zie je iets geks? Tik op Feedback.</p>
        <button class="btn primary" type="button" id="news-ok">Top, verder</button></div></div>`;
  document.body.appendChild(root);
  const close = () => { root.remove(); obTips(); };
  root.querySelector('#news-ok').onclick = close; root.querySelector('#news-back').onclick = close;
  track('update_gezien', { v: APP_V, from: seen });
}
/* ---------- onboarding: missions, tips and the proefrit ----------
   So a tester gets going from the link alone. All content lives in ONBOARDING; the engine below only plays it.
     - Change a text, an order or a target: edit the table, nothing else.
     - New tip: one line in tips with a new key. Every key is shown once per person, so new keys after an update
       work as "wat is nieuw" for everyone who already saw the old ones.
     - screen: library · recipe · kitchen · feedback · cook:-2 (vragen) · cook:-1 (klaarzetten) · cook:step · cook:end
       target: CSS selector of what the tip points at (it waits until that element is on screen)
       when(c): optional extra condition, c = { i (step), r (recipe), proef (in a proefrit) }
   Active in the test version after the welcome card (consent), and for Wes as a demo (testmenu → Onboarding bekijken).
   State: localStorage 'kb-ob' = { start, done:{mission:at}, seen:{tip:at}, off (no more tips), party (finale closed) }.
   Measured with track(): 'missie' {m, n}, 'tip' {tip, a: ok | tik | uit}, 'proefrit_klaar' {via}, 'echt_gekookt';
   cook events during a proefrit carry proef:1, so the dashboard keeps them apart from real cooking. */
const ONBOARDING = {
  realDays: 7,   // mission "kook echt": within this many days after starting (after that: "mag ook later")
  missions: [
    { id:'proefrit', title:'Maak een proefrit', cta:'Start proefrit',
      text:'Klik één recept door tot het eindscherm. Je hoeft niet te koken: zo zie je hoe de kookmodus werkt. Telt niet mee.' },
    { id:'feedback', title:'Laat weten wat je vindt', cta:'Feedback geven',
      text:'Tik rechtsboven op Feedback, kies wat past en schrijf kort wat je opviel. Alles helpt, ook kleine dingen.', help:true },
    { id:'koken', title:'Kook één recept echt', cta:'Kies een recept',
      text:'Kies een recept dat je lekker lijkt en kook het met de kookmodus. Geef op het eindscherm sterren en zeg wat opviel.' }
  ],
  tips: [
    { key:'recept-start',  screen:'recipe',   target:'#cook', text:'Hier start je de kookmodus: stap voor stap, met timers die meelopen.' },
    { key:'kook-vragen',   screen:'cook:-2',  target:'#ck-next', text:'Eerst een paar vragen. Daarmee past de app de stappen aan jouw keuken aan. Daarna tik je op Verder.' },
    { key:'kook-klaarzet', screen:'cook:-1',  target:'.ck-list li', text:'Vink af wat klaarstaat. Sneller: houd een vinkje even vast en veeg omlaag.' },
    { key:'kook-stap',     screen:'cook:step', target:'#ck-next', text:'Klaar met deze stap? Tik op Volgende of veeg naar links. De balk bovenin laat zien waar je bent.' },
    { key:'kook-timer',    screen:'cook:step', target:'.timer.big', text:'Tik om de timer te starten. Hij loopt door als je de app sluit en piept als hij klaar is.' },
    { key:'kook-wachten',  screen:'cook:step', target:'.wait-card .wc-h', text:'Moet je wachten? Hier staat wat je ondertussen al kunt doen.' },
    { key:'kook-ingr',     screen:'cook:step', target:'#ck-ing', when: c => c.i >= 1, text:'Alle ingrediënten met hoeveelheden zie je hier, op elk moment.' },
    { key:'kook-eind',     screen:'cook:end', target:'.cook-done .stars', text:'Hoe was het? Geef sterren en tik aan wat opviel. Zo wordt het recept beter.' }
  ],
  // the recipe for the proefrit: a tested one if there is one, then the fewest steps (quickest to click through)
  proefritRecipe: list => [...list].filter(r => (r.steps||[]).length).sort((a, b) => ((a.status||'concept') === 'concept') - ((b.status||'concept') === 'concept') || a.steps.length - b.steps.length)[0]
};
let pendingProefrit = false, obJust = null, obOpen = null;
const obState = () => lsGet('kb-ob', {});
const obSave = s => lsSet('kb-ob', s);
const obDemo = () => !TESTER && lsGet('kb-ob-demo', false);
const obActive = () => TESTER ? testerConsent() : obDemo();
const proefTag = () => view.proefrit || view.proefEnd ? { proef: 1 } : {};
const obDoneN = s => ONBOARDING.missions.filter(m => s.done?.[m.id]).length;
function obStart(){ const s = obState(); if (!s.start) { s.start = new Date().toISOString(); obSave(s); } }
// a mission is done: once, with a check, a buzz and a toast (after any toast that is still showing)
function obComplete(id){
  if (!obActive()) return;
  const s = obState(); if (s.done?.[id]) return;
  s.done = { ...(s.done||{}), [id]: new Date().toISOString() };
  if (id === 'koken' && !s.done.proefrit) s.done.proefrit = s.done.koken;   // cooked for real: the proefrit is no longer needed
  obSave(s); obJust = id;
  const n = obDoneN(s), all = n >= ONBOARDING.missions.length;
  track('missie', { m: id, n });
  const t = document.getElementById('toast'), say = () => { toast(all ? 'Alle missies gehaald!' : `Missie gehaald · ${n} van ${ONBOARDING.missions.length}`); buzz([12, 50, 12]); };
  if (t && !t.hidden) setTimeout(say, 1500); else say();
}
// the missions card on the home screen
function obCard(){
  if (!obActive() || !recipes.length) return '';
  obStart();
  const s = obState(), ms = ONBOARDING.missions, n = obDoneN(s);
  if (n >= ms.length) return s.party ? '' : `<section class="obcard party" id="obcard" aria-label="Proefkeuken">
      <div class="ob-confetti" aria-hidden="true">${obJust ? [...Array(18)].map((_, k) => `<i style="--k:${k}"></i>`).join('') : ''}</div>
      <span class="ob-medal" aria-hidden="true">${ICON.check}</span>
      <p><b>Alle missies gehaald!</b><small>Dank je${testerName() ? ', ' + esc(testerName()) : ''}. Kook gerust verder en blijf feedback geven: elke opmerking maakt de app beter.</small></p>
      <div class="row2"><button class="btn primary sm" type="button" id="ob-party">Top, verbergen</button></div>
    </section>`;
  const cur = ms.find(m => !s.done?.[m.id]), open = obOpen && !s.done?.[obOpen] ? obOpen : cur.id;
  const days = s.start ? ONBOARDING.realDays - Math.floor((Date.now() - Date.parse(s.start)) / 864e5) : ONBOARDING.realDays;
  const row = (m, k) => {
    const done = !!s.done?.[m.id], isOpen = !done && m.id === open, just = obJust === m.id;
    const due = m.id === 'koken' && !done ? `<span class="ob-due">${days > 0 ? `nog ${plural(days, 'dag', 'dagen')}` : 'mag ook later'}</span>` : '';
    return `<li class="ob-m ${done ? 'done' : ''} ${isOpen ? 'open' : ''} ${just ? 'just' : ''}">
      <button class="ob-row" type="button" data-obm="${m.id}" aria-expanded="${isOpen}" ${done ? 'disabled' : ''}><span class="ob-ck" aria-hidden="true">${done ? ICON.check : k + 1}</span><b>${esc(m.title)}</b>${due}</button>
      ${isOpen ? `<div class="ob-body"><p>${esc(m.text)}</p>
        ${m.help ? `<dl class="ob-help">${FB_TYPES.map(t => `<div><dt>${esc(t)}</dt><dd>${esc(FB_HELP[t][0])}</dd></div>`).join('')}</dl>` : ''}
        <button class="btn primary sm" type="button" data-obgo="${m.id}">${m.id === 'proefrit' ? ICON.pan : ''}${esc(m.cta)}</button></div>` : ''}
    </li>`;
  };
  return `<section class="obcard" id="obcard" aria-label="Proefkeuken-missies">
    <div class="ob-head"><span class="eyebrow">${obDemo() ? 'Demo · ' : ''}Proefkeuken</span><b>Jouw missies</b><span class="ob-count">${n} van ${ms.length}</span></div>
    <div class="ob-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${ms.length}" aria-valuenow="${n}"><i style="width:${(n / ms.length * 100).toFixed(0)}%"></i></div>
    <ol class="ob-list">${ms.map(row).join('')}</ol>
    ${obDemo() ? `<button class="btn ghost sm ob-stop" type="button" id="ob-demo-stop">Demo stoppen</button>` : ''}
  </section>`;
}
function bindObCard(){
  const c = document.getElementById('obcard'); if (!c) return;
  obJust = null;   // the check pop and the confetti play once
  c.querySelectorAll('[data-obm]').forEach(b => b.onclick = () => { obOpen = b.dataset.obm; renderLibrary(); });
  c.querySelectorAll('[data-obgo]').forEach(b => b.onclick = () => obGo(b.dataset.obgo));
  const p = document.getElementById('ob-party'); if (p) p.onclick = () => { const s = obState(); s.party = true; obSave(s); renderLibrary(); };
  const d = document.getElementById('ob-demo-stop'); if (d) d.onclick = () => { lsSet('kb-ob-demo', false); obHideTip(); renderLibrary(); toast('Demo gestopt'); };
}
function obGo(id){
  if (id === 'proefrit') {
    const r = ONBOARDING.proefritRecipe(recipes.filter(x => !openSessions().some(o => o.r.id === x.id))) || ONBOARDING.proefritRecipe(recipes);
    if (!r) return;
    pendingProefrit = true; track('proefrit', { rid: r.id }); go('recept-' + r.id);
  }
  else if (id === 'feedback') openFeedback();
  else document.querySelector('.count')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}
// cook mode: the note on the first screen of a proefrit, and its end screen
function proefNote(){ return view.proefrit ? `<p class="ob-proef">${ICON.check}<span><b>Proefrit:</b> klik gerust alles door, je hoeft niet echt te koken. Telt niet mee.</span></p>` : ''; }
function proefEndHtml(r){
  const via = view.proefEnd, s = obState(), next = ONBOARDING.missions.find(m => !s.done?.[m.id]);
  return `<div class="ck-left cook-done ob-end">
      <span class="ob-medal" aria-hidden="true">${ICON.check}</span>
      <span class="eyebrow">Proefrit · alle ${(r.steps||[]).length} stappen gezien</span>
      <h2>${via === 'proefrit' ? 'Proefrit gehaald!' : 'Dat ging snel!'}</h2>
      <p class="cook-sub">${via === 'proefrit' ? 'Nu weet je hoe de kookmodus werkt. Deze rit telt niet mee in je keuken.' : 'Je tikte in een paar minuten door alle stappen. Dat telt als proefrit, niet als kookbeurt.'}</p>
      ${via === 'snel' ? `<button class="btn" type="button" id="ck-real">${ICON.pan}Ik heb echt gekookt</button>` : ''}
    </div>
    <div class="ck-right cook-next">
      ${next ? promptCard({ title:'Volgende missie:', text:esc(next.title.toLowerCase()) + '.',
          actions: next.id === 'feedback' ? [{ label:'Feedback geven', kind:'primary', id:'ck-ob-fb' }, { label:'Naar de missies', kind:'ghost', id:'ck-ob-home' }] : [{ label:'Naar de missies', kind:'primary', id:'ck-ob-home' }] })
        : obActive() ? promptCard({ title:'Alle missies gehaald.', text:'Dank je wel!', actions:[{ label:'Naar de recepten', kind:'primary', id:'ck-ob-home' }] }) : ''}
    </div>`;
}
/* tips: one small bubble at a time, next to what it explains; it follows scrolling and waits until its element is on
   screen. "Begrepen" (or tapping the element itself) marks it seen; "Geen tips meer" turns all tips off. */
let obTipEl = null, obTipKey = null, obTipTarget = null;
function obScreen(){
  if (document.getElementById('fb-root')) return 'feedback';
  if (view.cook) { const r = currentRecipe(), n = (r?.steps||[]).length, i = view.cur; return i === -2 ? 'cook:-2' : i === -1 ? 'cook:-1' : i >= n ? 'cook:end' : 'cook:step'; }
  const h = location.hash.slice(1); return h.startsWith('recept-') ? 'recipe' : h === 'keuken' ? 'kitchen' : h || 'library';
}
const obVisible = el => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
function obTips(){ if (!obActive() && !obTipEl) return; cancelAnimationFrame(obTips.raf); obTips.raf = requestAnimationFrame(obShowTip); }
function obShowTip(){
  const s = obState();
  if (!obActive() || s.off || sheetOpen || menuOpen || moreOpen || view.leaveAsk || document.getElementById('tr-root')) return obHideTip();
  const scr = obScreen(), c = { i: view.cur, r: currentRecipe(), proef: !!view.proefrit };
  let target = null;
  const t = ONBOARDING.tips.find(t => t.screen === scr && !s.seen?.[t.key] && (!t.when || t.when(c)) && (target = [...document.querySelectorAll(t.target)].find(obVisible)));
  if (!t) return obHideTip();
  const fresh = obTipKey !== t.key;
  if (!obTipEl) { obTipEl = document.createElement('div'); obTipEl.className = 'obtip'; obTipEl.setAttribute('role', 'note'); document.body.appendChild(obTipEl); }
  if (fresh || !obTipEl.querySelector('#obt-ok')) {
    obTipEl.innerHTML = `<i class="obtip-arrow" aria-hidden="true"></i><p><span class="eyebrow">Tip</span>${esc(t.text)}</p>
      <div class="row2"><button class="btn primary sm" type="button" id="obt-ok">Begrepen</button><button class="btn ghost sm" type="button" id="obt-off">Geen tips meer</button></div>`;
    obTipEl.querySelector('#obt-ok').onclick = () => obSeen('ok');
    obTipEl.querySelector('#obt-off').onclick = () => { const st = obState(); st.off = true; obSave(st); track('tip', { tip: obTipKey, a: 'uit' }); obHideTip(); toast('Tips staan uit. Je missies blijven staan.'); };
    obTipEl.classList.remove('in'); void obTipEl.offsetWidth; obTipEl.classList.add('in');
  }
  obTipKey = t.key;
  if (obTipTarget !== target) { obTipTarget?.classList.remove('ob-spot'); obTipTarget = target; target.classList.add('ob-spot'); }
  if (fresh) reveal(target);
  obPlace();
}
function obSeen(how){
  if (!obTipKey) return;
  const s = obState(); s.seen = { ...(s.seen||{}), [obTipKey]: new Date().toISOString() }; obSave(s);
  track('tip', { tip: obTipKey, a: how }); obHideTip(); obTips();
}
function obHideTip(){ obTipTarget?.classList.remove('ob-spot'); obTipTarget = null; obTipKey = null; obTipEl?.remove(); obTipEl = null; }
// below the element when it fits, otherwise above; the arrow points at its middle
function obPlace(){
  if (!obTipEl || !obTipTarget) return;
  if (!obTipTarget.isConnected) return obTips();
  const b = obTipTarget.getBoundingClientRect(), w = Math.min(320, innerWidth - 24), h = obTipEl.offsetHeight;
  const top0 = (document.querySelector('.tbar:not([hidden])')?.getBoundingClientRect().bottom || 0) + 8;
  const below = b.bottom + 12 + h <= innerHeight - 8, y = below ? b.bottom + 12 : Math.max(top0, b.top - 12 - h);
  const x = Math.max(12, Math.min(innerWidth - w - 12, b.left + b.width / 2 - w / 2));
  Object.assign(obTipEl.style, { width: w + 'px', left: x + 'px', top: y + 'px' });
  obTipEl.classList.toggle('above', !below);
  obTipEl.style.setProperty('--ax', Math.max(18, Math.min(w - 18, b.left + b.width / 2 - x)) + 'px');
  obTipEl.hidden = b.bottom < top0 || b.top > innerHeight;   // scrolled out of view: hide until it is back
}
document.addEventListener('scroll', () => { if (obTipEl) requestAnimationFrame(obPlace); }, true);
window.addEventListener('resize', () => { if (obTipEl) requestAnimationFrame(obPlace); });
// doing what the tip says counts as "seen"
document.addEventListener('click', e => { if (obTipTarget && obTipTarget.contains(e.target)) obSeen('tik'); }, true);
// test version: ?onboarding=reset starts the missions and tips over (the tester ID and cooking history stay)
if (TESTER && new URLSearchParams(location.search).get('onboarding') === 'reset') {
  try { localStorage.removeItem('kb-ob'); const qs = new URLSearchParams(location.search); qs.delete('onboarding'); history.replaceState(null, '', location.pathname + (qs.toString() ? '?' + qs : '') + location.hash); } catch(e) {}
}
/* ---------- hold and swipe to tick several items ---------- */
let dragChecking = false, suppressClick = false;
(() => {
  let hold = null, drag = null, raf = 0;
  const HOLD_MS = 300, MOVE_TOL = 8;
  const itemAt = (x, y) => document.elementFromPoint(x, y)?.closest('.ing-list li');
  const cbOf = li => li?.querySelector('input[type=checkbox]');
  function setItem(li, quiet){
    const cb = cbOf(li); if (!cb || cb.checked === drag.target) return false;
    cb.checked = drag.target; cb.dispatchEvent(new Event('change', { bubbles:true }));
    drag.touched.add(li); drag.count++;
    if (!quiet) buzz(5);
    bubble(); return true;
  }
  function bubble(){
    if (!drag.el) { drag.el = document.createElement('div'); drag.el.className = 'drag-count'; document.body.appendChild(drag.el); }
    drag.el.textContent = `${drag.target ? '✓' : '↺'} ${drag.count}`;
    drag.el.style.left = drag.x + 'px'; drag.el.style.top = drag.y + 'px';
    drag.el.classList.remove('bump'); void drag.el.offsetWidth; drag.el.classList.add('bump');
  }
  function scroller(li){ return li.closest('.sheet, .cook-main') || null; }
  function autoScroll(){
    if (!drag) return;
    const sc = drag.scroller, r = sc ? sc.getBoundingClientRect() : { top:0, bottom:innerHeight };
    const edge = 70, y = drag.y; let v = 0;
    if (y < r.top + edge) v = -Math.ceil((r.top + edge - y) / 6);
    else if (y > r.bottom - edge) v = Math.ceil((y - (r.bottom - edge)) / 6);
    if (v) { sc ? sc.scrollBy(0, v) : window.scrollBy(0, v); sweepTo(drag.x, drag.y); }
    raf = requestAnimationFrame(autoScroll);
  }
  // find the row by height only and clamp to the first/last row, so a fast swipe that
  // overshoots the list, drifts sideways or lands on a gap still ticks every row it passed
  function indexAt(y){
    const items = drag.list.children, n = items.length; if (!n) return -1;
    if (y <= items[0].getBoundingClientRect().top) return 0;
    for (let k = 0; k < n; k++) if (y < items[k].getBoundingClientRect().bottom) return k;
    return n - 1;
  }
  function sweepTo(x, y){
    if (!drag?.list.isConnected) return;
    const items = [...drag.list.children], to = indexAt(y), from = drag.last;
    if (to < 0 || to === from) return;
    const step = to > from ? 1 : -1;
    for (let k = from + step; step > 0 ? k <= to : k >= to; k += step) setItem(items[k], k !== to);
    drag.last = to;
  }
  function start(li, x, y){
    const cb = cbOf(li); if (!cb) return;
    drag = { list:li.parentElement, target:!cb.checked, touched:new Set(), count:0, x, y, last:[...li.parentElement.children].indexOf(li), el:null, scroller:scroller(li) };
    dragChecking = true; suppressClick = true;
    li.classList.add('grip'); drag.list.classList.add('dragging');
    buzz(12);
    setItem(li);
    raf = requestAnimationFrame(autoScroll);
  }
  function end(e){
    clearTimeout(hold?.t); hold = null;
    if (!drag) return;
    // a quick flick releases before the last move event arrives: count the release point too
    const p = e?.changedTouches?.[0] || (e?.clientY != null ? e : null);
    if (p) sweepTo(p.clientX, p.clientY);
    setTimeout(() => { suppressClick = false; }, 400);   // only eat the ghost click right after release
    cancelAnimationFrame(raf);
    drag.list.querySelectorAll('.grip').forEach(x => x.classList.remove('grip'));
    drag.list.classList.remove('dragging');
    drag.touched.forEach(li => { li.classList.remove('settle'); void li.offsetWidth; li.classList.add('settle'); });
    if (drag.count > 1) buzz([8, 40, 8]);
    const el = drag.el; if (el) { el.classList.add('out'); setTimeout(() => el.remove(), 220); }
    drag = null; dragChecking = false;
    // the recipe page shows a "Vinkjes wissen" button that depends on the ticks
    const h = location.hash.slice(1);
    if (h.startsWith('recept-') && !view.cook) { const r = recipes.find(x => x.id === h.slice(7)); if (r) rerender(r); }
  }
  document.addEventListener('touchstart', e => {
    const li = e.target.closest?.('.ing-list li'); if (!li || e.touches.length > 1) return;
    const t = e.touches[0];
    hold = { li, x:t.clientX, y:t.clientY, t:setTimeout(() => { if (hold) start(hold.li, hold.x, hold.y); }, HOLD_MS) };
  }, { passive:true });
  document.addEventListener('touchmove', e => {
    const t = e.touches[0];
    if (drag) { e.preventDefault(); drag.x = t.clientX; drag.y = t.clientY; sweepTo(t.clientX, t.clientY); bubble(); return; }
    if (hold && Math.hypot(t.clientX - hold.x, t.clientY - hold.y) > MOVE_TOL) { clearTimeout(hold.t); hold = null; }
  }, { passive:false });
  document.addEventListener('touchend', end, { passive:true });
  document.addEventListener('touchcancel', end, { passive:true });
  // mouse: same gesture with click-and-hold
  document.addEventListener('mousedown', e => {
    if (e.button !== 0) return; const li = e.target.closest?.('.ing-list li'); if (!li) return;
    hold = { li, x:e.clientX, y:e.clientY, t:setTimeout(() => { if (hold) start(hold.li, hold.x, hold.y); }, HOLD_MS) };
  });
  document.addEventListener('mousemove', e => {
    if (drag) { drag.x = e.clientX; drag.y = e.clientY; sweepTo(e.clientX, e.clientY); bubble(); return; }
    if (hold && Math.hypot(e.clientX - hold.x, e.clientY - hold.y) > MOVE_TOL) { clearTimeout(hold.t); hold = null; }
  });
  document.addEventListener('mouseup', end);
  // the click that follows a hold must not toggle the first item back
  document.addEventListener('click', e => { if (suppressClick && e.target.closest?.('.ing-list')) { e.preventDefault(); e.stopPropagation(); } suppressClick = false; }, true);
  document.addEventListener('contextmenu', e => { if (drag || hold) e.preventDefault(); });
  // tint flash on every tick (tap or sweep), soft fade on untick
  document.addEventListener('change', e => {
    const cb = e.target; if (cb.type !== 'checkbox') return;
    let li = cb.closest('.ing-list li'); if (!li) return;
    if (!li.isConnected) li = app.querySelector(`.ing-list input[data-i="${cb.dataset.i}"]`)?.closest('li');   // page re-rendered on first tick
    if (!li) return;
    li.classList.remove('lit', 'unlit'); void li.offsetWidth; li.classList.add(cb.checked ? 'lit' : 'unlit');
    li.addEventListener('animationend', ev => { if (ev.target === li) li.classList.remove('lit', 'unlit'); }, { once:true });
  });
})();

/* ---------- editor ---------- */
function renderEditor(r){
  const isNew = !r, src = isNew ? draftFrom : null;
  if (src) { const {id, favorite, createdAt, updatedAt, ...rest} = src; r = {...rest, family: famKey(src), variant: ''}; }
  r = r || {title:'',description:'',tags:[],servings:2,minutes:'',keeps:'',ingredients:[],steps:[],notes:''};
  app.innerHTML = `
  <div class="wrap"><form class="editor" id="form" novalidate>
    <div><button class="btn ghost" id="cancel-top" type="button" style="margin-left:-12px">${ICON.back}${isNew?'Annuleren':'Terug naar recept'}</button></div>
    <h1>${src?'Nieuwe variant van '+esc(src.title):isNew?'Nieuw recept':'Recept bewerken'}</h1>
    ${src?'<p style="margin:0;color:var(--muted)">Alles is gekopieerd. Geef de variant een naam en pas aan wat anders is.</p>':''}
    <div class="field"><label for="f-title">Naam van het gerecht</label><input id="f-title" required value="${esc(r.title)}" placeholder="Romige pesto-pasta met kip"></div>
    <div class="field"><label for="f-desc">Korte omschrijving</label><input id="f-desc" value="${esc(r.description)}" placeholder="Snel, romig en vol smaak"></div>
    <div class="row">
      <div class="field"><label for="f-serv">Porties</label><input id="f-serv" type="number" min="1" max="40" inputmode="numeric" value="${esc(r.servings)}"></div>
      <div class="field"><label for="f-min">Totale tijd (min)</label><input id="f-min" type="number" min="0" inputmode="numeric" value="${esc(r.minutes)}"></div>
      <div class="field"><label for="f-keep">Houdbaar</label><input id="f-keep" value="${esc(r.keeps)}" placeholder="3 dagen koelkast"></div>
    </div>
    <div class="row">
      <div class="field"><label for="f-prep">Voorbereiden (min)</label><input id="f-prep" type="number" min="0" inputmode="numeric" value="${esc(r.prep ?? '')}" placeholder="schat de app"><span class="hint">Snijden en klaarzetten. Leeg = schatting uit het snijwerk.</span></div>
      <div class="field"><label for="f-clean">Afwas (min)</label><input id="f-clean" type="number" min="0" inputmode="numeric" value="${esc(r.cleanup?.minutes ?? '')}" placeholder="10"></div>
    </div>
    <div class="field"><label for="f-cleanwhat">Af te wassen</label><input id="f-cleanwhat" value="${esc((r.cleanup?.items||[]).join(', '))}" placeholder="hapjespan, kookpan, vergiet"><span class="hint">Scheid met komma's. Verschijnt op het eindscherm.</span></div>
    ${variantFields(r, isNew)}
    <div class="row">
      <div class="field"><label for="f-status">Status</label><select class="inp" id="f-status">${Object.entries(STATUS).map(([k,[l]]) => `<option value="${k}" ${(r.status||'concept')===k?'selected':''}>${l}</option>`).join('')}</select><span class="hint">Goedgekeurd = zelf gekookt en goed bevonden.</span></div>
      <div class="field"><label for="f-cost">Kosten totaal (€)</label><input class="inp" id="f-cost" type="number" min="0" step="0.01" inputmode="decimal" value="${esc(r.cost ?? '')}" placeholder="11,20"><span class="hint">Voor alle porties samen, schatting is prima.</span></div>
    </div>
    <div class="field"><label for="f-tags">Labels</label><input id="f-tags" value="${esc((r.tags||[]).join(', '))}" placeholder="Pasta, Kip, Meal prep"><span class="hint">Scheid met komma's. Labels worden filters op de startpagina.</span></div>
    <div class="field"><label for="f-ing">Ingrediënten</label><textarea id="f-ing" class="mono" rows="9" placeholder="250 g pasta&#10;1 el olijfolie&#10;1 teentje knoflook&#10;zout naar smaak">${esc((r.ingredients||[]).map(ingLine).join('\n'))}</textarea><span class="hint">Eén per regel: hoeveelheid, eenheid, naam. Zo kan de app porties omrekenen.</span></div>
    <div class="field"><label for="f-steps">Bereiding</label><textarea id="f-steps" rows="10" placeholder="Pasta koken: Kook de pasta 10 minuten al dente.&#10;Kip bakken: Bak de kip in 8 minuten goudbruin.">${esc((r.steps||[]).map(s=>(s.title?s.title+': ':'')+s.text).join('\n'))}</textarea><span class="hint">Eén stap per regel. Begin met "Titel:" voor een kopje. Tijden zoals "8 minuten" worden automatisch een timer.</span>
      <div class="stepcheck" id="step-check" aria-live="polite"></div></div>
    <div class="field"><label for="f-notes">Tips en variaties</label><textarea id="f-notes" rows="3">${esc(r.notes)}</textarea></div>
    <fieldset class="field" style="border:0;padding:0;margin:0"><legend style="font-weight:600;font-size:.92rem;margin-bottom:6px">Invriezen</legend>
      <div class="row">
        <div class="field"><label for="f-frz">Invriesbaar?</label><select id="f-frz" style="width:100%;padding:11px 13px;border:1px solid var(--line);border-radius:10px;background:var(--surface)">
          ${[['','Niet ingevuld'],['yes','Ja'],['partly','Deels'],['no','Nee']].map(([v,l])=>`<option value="${v}" ${(r.freeze?.status||'')===v?'selected':''}>${l}</option>`).join('')}</select></div>
        <div class="field"><label for="f-frz-keeps">Houdbaar in vriezer</label><input id="f-frz-keeps" value="${esc(r.freeze?.keeps)}" placeholder="3 maanden"></div>
      </div>
      <div class="field"><label for="f-frz-sum">Korte uitleg</label><input id="f-frz-sum" value="${esc(r.freeze?.summary)}" placeholder="Vriest perfect in, per portie."></div>
      <div class="row">
        <div class="field"><label for="f-frz-thaw">Ontdooien</label><input id="f-frz-thaw" value="${esc(r.freeze?.thaw)}" placeholder="Nacht in de koelkast"></div>
        <div class="field"><label for="f-frz-heat">Opwarmen</label><input id="f-frz-heat" value="${esc(r.freeze?.reheat)}" placeholder="Pan, laag vuur, 8 min"></div>
      </div>
      <div class="field"><label for="f-frz-steps">Stappen</label><textarea id="f-frz-steps" rows="4" placeholder="Laat volledig afkoelen.&#10;Verdeel per portie over bakjes.">${esc((r.freeze?.steps||[]).join('\n'))}</textarea><span class="hint">Eén stap per regel.</span></div>
    </fieldset>
    <fieldset class="field" style="border:0;padding:0;margin:0"><legend style="font-weight:600;font-size:.92rem;margin-bottom:6px">Voedingswaarde per portie</legend>
      <div class="row">${NUTRI_FIELDS.map(([k,l,u])=>`<div class="field"><label for="f-n-${k}">${l} (${u})</label><input id="f-n-${k}" type="number" min="0" step="0.1" inputmode="decimal" value="${esc(r.nutrition?.[k] ?? '')}"></div>`).join('')}</div>
      <span class="hint">Laat leeg wat je niet weet. Vraag Claude om een schatting.</span>
    </fieldset>
    <div class="field"><label for="f-info">Goed om te weten</label><textarea id="f-info" rows="4" placeholder="Bewaren: 3 dagen koelkast&#10;Pan: diepe hapjespan van 28 cm&#10;Allergenen: melk, noten">${esc((r.info||[]).map(x=>x.label+': '+x.value).join('\n'))}</textarea><span class="hint">Eén per regel als "Onderwerp: info".</span></div>
    <div class="qcheck" id="qcheck" aria-live="polite"></div>
    <p class="err" id="f-err" hidden></p>
    <div class="form-actions">
      <button class="btn primary" type="submit" id="f-save">${isNew?'Recept opslaan':'Wijzigingen opslaan'}</button>
      <button class="btn ghost" type="button" id="cancel">Annuleren</button>
      <span class="spacer"></span>
      ${isNew?'':'<button class="btn danger" type="button" id="del">Verwijderen</button>'}
    </div>
    <div id="confirm-slot"></div>
  </form></div>`;

  const back = () => go(src ? 'recept-'+src.id : isNew ? '' : 'recept-'+r.id);
  document.getElementById('cancel').onclick = back;
  document.getElementById('cancel-top').onclick = back;
  const del = document.getElementById('del');
  if (del) del.onclick = () => {
    document.getElementById('confirm-slot').innerHTML = `<div class="confirm"><span style="flex:1;min-width:180px">"${esc(r.title)}" uit je kookboek verwijderen? Er blijft een kopie in het archief.${recipes.some(x=>x.family===r.id)?' De varianten blijven bestaan.':''}</span><button class="btn danger" type="button" id="del-yes">Ja, verwijderen</button><button class="btn ghost" type="button" id="del-no">Behouden</button></div>`;
    document.getElementById('del-no').onclick = () => document.getElementById('confirm-slot').innerHTML='';
    document.getElementById('del-yes').onclick = async () => { try{
      // keep a copy in the archive first, so deleting is never permanent by accident
      const ex = archive.find(a => a.id === r.id);
      if (!ex || !sameRecipe(ex, r)) await db.collection('archive').doc(r.id).set({ ...cleanRecipe(r), archivedAt:new Date().toISOString() });
      await db.collection('recipes').doc(r.id).delete(); toast('Verwijderd. Terugzetten kan via Testmenu → Receptenarchief'); go(''); }catch(e){ showErr('Verwijderen lukte niet. Probeer het opnieuw.'); } };
  };
  // wait-step toggles + quality check, live while typing
  const parsedSteps = () => document.getElementById('f-steps').value.split('\n').map(parseStep).filter(Boolean);
  const initialWait = st => { const old = (r.steps||[]).find(o => (o.title||'') === (st.title||'') && o.text === st.text) || (r.steps||[]).find(o => o.title && o.title === st.title); return old && 'wait' in old ? !!old.wait : !!waitInfo({ ...st, wait:undefined }); };
  let waitFlags = parsedSteps().map(initialWait);
  const stepKeys = () => parsedSteps().map(st => st.title || st.text.slice(0, 30));
  let lastKeys = stepKeys();
  function qualityIssues(){
    const out = [], v = id => document.getElementById(id).value.trim();
    const steps = parsedSteps(), ings = v('f-ing').split('\n').map(parseIngredient).filter(Boolean);
    if (!v('f-n-kcal') || !v('f-n-protein')) out.push('Voedingswaarden ontbreken (minimaal kcal en eiwit).');
    if (!v('f-cost')) out.push('Prijs ontbreekt, dus geen prijs per portie.');
    if (!v('f-keep')) out.push('Houdbaarheid ontbreekt.');
    ings.forEach(i => { if (i.amount == null && !/(naar smaak|optioneel|snuf)/i.test(i.name)) out.push(`Ingrediënt zonder hoeveelheid: "${i.name}".`); });
    steps.forEach((st, ix) => {
      if (!st.title) out.push(`Stap ${ix+1} heeft geen titel (begin met "Titel:").`);
      if (st.text.length > 220) out.push(`Stap ${ix+1} is lang. Splits hem in twee handelingen.`);
      if ((st.text.match(/\d+\s*(minuten|minuut|min\b)/gi) || []).length > 1 && !/totaal/i.test(st.text)) out.push(`Stap ${ix+1} noemt meerdere tijden. De timer pakt de eerste.`);
    });
    return out;
  }
  function updateChecks(){
    const steps = parsedSteps(), keys = stepKeys();
    if (keys.join('|') !== lastKeys.join('|')) { const prev = new Map(lastKeys.map((k, ix) => [k, waitFlags[ix]])); waitFlags = steps.map((st, ix) => prev.has(keys[ix]) ? prev.get(keys[ix]) : !!waitInfo({ ...st, wait:undefined })); lastKeys = keys; }
    document.getElementById('step-check').innerHTML = steps.length ? `<span class="eyebrow">Stappen</span>${steps.map((st, ix) => `<div class="sc-row"><span class="n">${ix+1}</span><span class="t"><b>${esc(st.title || st.text.slice(0, 40))}</b>${st.timer ? `<small>timer ${fmtClock(st.timer)}</small>` : ''}</span><label class="sc-wait"><input type="checkbox" data-w="${ix}" ${waitFlags[ix]?'checked':''}> Wachtstap</label></div>`).join('')}<span class="hint">Wachtstap: iets kookt of pruttelt vanzelf, zodat je ondertussen iets anders kunt doen.</span>` : '';
    document.getElementById('step-check').querySelectorAll('[data-w]').forEach(cb => cb.onchange = () => { waitFlags[+cb.dataset.w] = cb.checked; });
    const qs = qualityIssues();
    document.getElementById('qcheck').innerHTML = qs.length ? `<div class="qbox warn"><b>Kwaliteitscheck: ${qs.length} ${qs.length===1?'aandachtspunt':'aandachtspunten'}</b><ul>${qs.map(q => `<li>${esc(q)}</li>`).join('')}</ul><small>Je kunt toch opslaan, bijvoorbeeld als Concept.</small></div>` : `<div class="qbox ok">${ICON.check}<b>Kwaliteitscheck: alles compleet</b></div>`;
  }
  let qT = null; document.getElementById('form').addEventListener('input', () => { clearTimeout(qT); qT = setTimeout(updateChecks, 250); });
  updateChecks();
  document.getElementById('form').onsubmit = async ev => {
    ev.preventDefault();
    const title = document.getElementById('f-title').value.trim();
    if (!title) return showErr('Geef het gerecht een naam.');
    if (document.getElementById('f-fam').value && !document.getElementById('f-vname').value.trim()) { document.getElementById('f-vname').focus(); return showErr('Geef deze variant een naam, bijvoorbeeld Licht of Vegetarisch.'); }
    const data = {
      title,
      description: document.getElementById('f-desc').value.trim(),
      servings: Math.max(1, parseInt(document.getElementById('f-serv').value) || 2),
      minutes: parseInt(document.getElementById('f-min').value) || 0,
      prep: (v => v === '' ? null : Math.max(0, parseInt(v) || 0))(document.getElementById('f-prep').value.trim()),
      cleanup: (m => m ? { minutes: m, items: document.getElementById('f-cleanwhat').value.split(',').map(x => x.trim()).filter(Boolean) } : null)(parseInt(document.getElementById('f-clean').value) || 0),
      keeps: document.getElementById('f-keep').value.trim(),
      family: document.getElementById('f-fam').value || (r.family && document.getElementById('f-fam').disabled ? r.family : null),
      variant: document.getElementById('f-vname').value.trim() || null,
      tags: document.getElementById('f-tags').value.split(',').map(s=>s.trim()).filter(Boolean).map(s=>s[0].toUpperCase()+s.slice(1)),
      ingredients: document.getElementById('f-ing').value.split('\n').map(parseIngredient).filter(Boolean),
      steps: document.getElementById('f-steps').value.split('\n').map(parseStep).filter(Boolean).map((st, ix) => { const same = (r.steps||[]).find(o => (o.title||'') === (st.title||'') && o.text === st.text); if (same && same.timer) st.timer = same.timer;
        st.wait = waitFlags[ix] ? (waitInfo({ ...st, wait:undefined }) || { type:'slow', min: st.timer ? st.timer/60 : 5 }) : false; return st; }),
      status: document.getElementById('f-status').value,
      cost: parseFloat(String(document.getElementById('f-cost').value).replace(',', '.')) || null,
      notes: document.getElementById('f-notes').value.trim(),
      nutrition: r.nutrition?.note ? {note:r.nutrition.note, ...Object.fromEntries(NUTRI_FIELDS.map(([k])=>[k, parseFloat(String(document.getElementById('f-n-'+k).value).replace(',','.'))]).filter(([,v])=>!isNaN(v)))} : Object.fromEntries(NUTRI_FIELDS.map(([k])=>[k, parseFloat(String(document.getElementById('f-n-'+k).value).replace(',','.'))]).filter(([,v])=>!isNaN(v))),
      freeze: (()=>{ const st=document.getElementById('f-frz').value; if(!st) return null; const v=id=>document.getElementById(id).value.trim();
        return {status:st, summary:v('f-frz-sum'), keeps:v('f-frz-keeps'), thaw:v('f-frz-thaw'), reheat:v('f-frz-heat'), steps:v('f-frz-steps').split('\n').map(x=>x.trim()).filter(Boolean)}; })(),
      info: document.getElementById('f-info').value.split('\n').map(l=>{ l=l.trim(); if(!l) return null; const i=l.indexOf(':'); return i>0 ? {label:l.slice(0,i).trim(), value:l.slice(i+1).trim()} : {label:'Info', value:l}; }).filter(Boolean),
      favorite: !!r.favorite,
      ...(r.variantOrder!=null?{variantOrder:r.variantOrder}:{}),
      ...(r.source?{source:r.source}:{}),   // herkomst blijft bewaard bij bewerken
      createdAt: r.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const btn = document.getElementById('f-save'); btn.disabled = true; btn.textContent = 'Opslaan…';
    try{
      const ref = isNew ? db.collection('recipes').doc(slug(title)) : db.collection('recipes').doc(r.id);
      await ref.set(data);
      toast('Recept opgeslagen'); go('recept-'+ref.id);
    }catch(e){
      btn.disabled=false; btn.textContent='Opnieuw proberen';
      showErr(e?.code==='quota_exceeded' ? 'Je kookboek zit vol. Verwijder eerst een oud recept.' : e?.code==='invalid_argument' ? 'Je hebt geen rechten om recepten op te slaan.' : 'Opslaan lukte niet. Controleer je verbinding en probeer opnieuw.');
    }
  };
  function showErr(m){ const e=document.getElementById('f-err'); e.textContent=m; e.hidden=false; }
}
function variantFields(r, isNew){
  const hasChildren = !isNew && recipes.some(x => x.family===r.id);
  const fams = []; const seen = new Set();
  for (const x of recipes) { const k=famKey(x); if (seen.has(k) || (!isNew && k===famKey(r) && !r.family)) continue; seen.add(k); const root = recipes.find(y=>y.id===k) || variantsOf(x)[0]; fams.push([k, root.title]); }
  const cur = r.family || '';
  return `<div class="row">
    <div class="field"><label for="f-fam">Variant van</label>
      <select id="f-fam" ${hasChildren?'disabled':''} style="width:100%;padding:11px 13px;border:1px solid var(--line);border-radius:10px;background:var(--surface)">
        <option value="">Geen, dit is een eigen gerecht</option>
        ${fams.filter(([k])=>k!==r.id).map(([k,t])=>`<option value="${esc(k)}" ${cur===k?'selected':''}>${esc(t)}</option>`).join('')}
      </select>
      <span class="hint">${hasChildren?'Dit is het hoofdrecept van een familie, dus het blijft los.':'Koppel aan een bestaand gerecht om ertussen te wisselen.'}</span></div>
    <div class="field"><label for="f-vname">Naam van deze variant</label><input id="f-vname" value="${esc(r.variant||'')}" placeholder="Origineel, Licht, Vegetarisch…"></div>
  </div>`;
}
function slug(t){ const s = t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40) || 'recept'; return recipes.some(r=>r.id===s) ? s+'-'+Date.now().toString(36).slice(-4) : s; }

async function save(id, patch, msg){
  try{ await db.collection('recipes').doc(id).update(patch); if(msg) toast(msg); }
  catch(e){ toast('Opslaan lukte niet'); }
}

/* ---------- boot ---------- */
async function boot(){
  const claude = window.claude;
  if (!claude?.use){ loaded = true; render(); return; }
  const [d, u] = await Promise.all([claude.use('db'), claude.use('user')]);
  db = d;
  if (!db){ loaded = true; render(); return; }
  const w = u ? await u.can('data.write') : null;
  canWrite = TESTER ? false : w !== false;
  uid = u ? await u.id() : null;
  if (uid) db.collection('data/users/' + uid).onSnapshot(snap => {
    let changedCurrent = false;
    let changedStats = false;
    for (const d of snap.docs) {
      if (d.id === '_stats') {
        const v = d.data();
        if (!d.metadata.hasPendingWrites && !statsT && v?.sessions && (v.updatedAt||'') > (stats.updatedAt||'')) { stats = { ...stats, ...v }; try { localStorage.setItem('kb-stats', JSON.stringify(stats)); } catch(e) {} changedStats = true; }
        continue;
      }
      if (d.metadata.hasPendingWrites || persistT[d.id]) continue;
      const v = d.data(), loc = progress[d.id];
      if (loc && (loc.updatedAt||'') > (v.updatedAt||'')) continue;
      if (JSON.stringify(loc) === JSON.stringify(v)) continue;
      progress[d.id] = v; if (view.loadedFor === d.id) changedCurrent = true;
    }
    progressReady = true; saveLocal();
    if (changedStats) applyAppearance();   // a colour chosen on another device
    const h = location.hash.slice(1);
    if (h.startsWith('recept-')) { const r = recipes.find(x=>x.id===h.slice(7)); if (r && changedCurrent && !view.cook) { view.loadedFor = null; view.servings = null; rerender(r); } }
    else if (h === 'keuken' && changedStats) render();
    else if (!h && loaded && document.activeElement?.id !== 'q') render();
  }, () => {});
  db.collection('archive').onSnapshot(snap => {
    archive = snap.docs.map(d => ({ id:d.id, ...d.data() })).sort((a, b) => (a.title||'').localeCompare(b.title||'', 'nl'));
    archiveReady = true;
    if (location.hash === '#test' && !app.querySelector('#a-text:focus')) renderTest();
  }, () => { archiveReady = true; });
  db.collection('recipes').onSnapshot(snap => {
    recipes = snap.docs.map(d => ({id:d.id, ...d.data()})).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
    loaded = true;
    if (!resumeChecked) { maybeResume(); if (pendingResume) return; }
    const h = location.hash.slice(1);
    if (h.startsWith('recept-') && !(TESTER && !testerConsent())) { const r = recipes.find(x=>x.id===h.slice(7)); if (r) { rerender(r); if (TESTER) setTimeout(showNews, 400); return; } }
    if (h==='nieuw' || h.startsWith('bewerk-')) { if (app.querySelector('#form')) return; }
    render();
  }, () => { loaded = true; render(); });
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState==='visible') { if (view.cook) requestWake(); for (const t of Object.values(allTimers)) if (t.running) t.left = Math.max(0, Math.ceil((t.end-Date.now())/1000)); refreshTimers(); } });
if (Object.values(allTimers).some(t => t.running)) startTicker();
setTimeout(renderTimerBar, 0);
boot();
setTimeout(() => { if (!loaded){ loaded = true; render(); } }, 10000);
})();
