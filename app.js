'use strict';
const RECIPIENT = 'EMLL@novonesis.com';
const TITLE = 'Zeal-risiko zone';
const DEF_FLOORS = ['5. sal','4. sal','3. sal','2. sal','1. sal','0. sal','Blend','Mikro','Lager'];
const DEF_N = 3;
const $ = id => document.getElementById(id);
const clamp = n => Math.max(1, Math.min(20, Math.round(n) || DEF_N));
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2,'0');
const fmtTime = d => `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()} kl. ${pad(d.getHours())}:${pad(d.getMinutes())}`;
const stamp = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
function show(id){ document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id)); window.scrollTo(0,0); }

// ---------- Indstillinger ----------
function loadSettings(){
  try { const s = JSON.parse(localStorage.getItem('zeal-settings'));
    if (s && Array.isArray(s.floors) && s.floors.length) return { n: clamp(s.n), floors: s.floors.map(String).filter(Boolean) }; } catch {}
  return { n: DEF_N, floors: DEF_FLOORS.slice() };
}
let settings = loadSettings(), draft = null;
function renderSettings(){
  $('pOut').textContent = draft.n;
  const l = $('floorList'); l.innerHTML = '';
  draft.floors.forEach((f, i) => {
    const r = document.createElement('div'); r.className = 'floorrow';
    r.innerHTML = `<input class="txt" maxlength="30" aria-label="Navn på etage ${i+1}"><button aria-label="Flyt op">↑</button><button aria-label="Flyt ned">↓</button><button aria-label="Slet etage" class="danger">✕</button>`;
    const inp = r.querySelector('input'); inp.value = f; inp.oninput = () => { draft.floors[i] = inp.value; };
    const [up, down, del] = r.querySelectorAll('button');
    up.disabled = i === 0; down.disabled = i === draft.floors.length - 1; del.disabled = draft.floors.length === 1;
    up.onclick = () => { [draft.floors[i-1], draft.floors[i]] = [draft.floors[i], draft.floors[i-1]]; renderSettings(); };
    down.onclick = () => { [draft.floors[i+1], draft.floors[i]] = [draft.floors[i], draft.floors[i+1]]; renderSettings(); };
    del.onclick = () => { if (confirm(`Slet "${draft.floors[i] || 'etage'}"?`)) { draft.floors.splice(i, 1); renderSettings(); } };
    l.appendChild(r);
  });
}
$('btnSettings').onclick = () => { draft = { n: settings.n, floors: settings.floors.slice() }; renderSettings(); show('settings'); };
$('pMinus').onclick = () => { draft.n = clamp(draft.n - 1); $('pOut').textContent = draft.n; };
$('pPlus').onclick = () => { draft.n = clamp(draft.n + 1); $('pOut').textContent = draft.n; };
$('btnAddFloor').onclick = () => { draft.floors.push(''); renderSettings(); const ins = $('floorList').querySelectorAll('input'); ins[ins.length-1].focus(); };
$('btnSetDone').onclick = () => {
  const floors = draft.floors.map(f => f.trim()).filter(Boolean);
  settings = { n: clamp(draft.n), floors: floors.length ? floors : DEF_FLOORS.slice() };
  localStorage.setItem('zeal-settings', JSON.stringify(settings)); show('start');
};
$('btnSetReset').onclick = () => { draft = { n: DEF_N, floors: DEF_FLOORS.slice() }; renderSettings(); };

// ---------- Rundering ----------
const state = { floors: [], cur: 0, time: null };
function downscale(file){
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => {
      const s = Math.min(1, 1280 / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width*s); c.height = Math.round(img.height*s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      c.toBlob(b => b ? res(b) : rej(new Error('blob')), 'image/jpeg', 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('img')); };
    img.src = url;
  });
}
function startRound(){
  state.floors = settings.floors.map(name => ({ name, photos: Array.from({ length: settings.n }, () => ({ photo: null, url: '', note: '' })) }));
  state.cur = 0; renderPick();
}
const floorDone = f => f.photos.every(p => p.photo);
const doneFloors = () => state.floors.filter(floorDone);
function renderPick(){
  const l = $('pickList'); l.innerHTML = '';
  state.floors.forEach((f, i) => {
    const got = f.photos.filter(p => p.photo).length, n = f.photos.length;
    const b = document.createElement('button');
    b.innerHTML = `<span>${esc(f.name)}<small>${got === n ? 'Færdig ✓' : got ? `${got} af ${n} billeder` : `${n} billeder`}</small></span><span aria-hidden="true">${got === n ? '✓' : '›'}</span>`;
    b.onclick = () => { state.cur = i; renderFloor(); show('floor'); }; l.appendChild(b);
  });
  const d = doneFloors().length;
  $('btnPickSave').hidden = !d; $('btnPickSave').textContent = `Gem og send (${d} ${d === 1 ? 'etage' : 'etager'})`;
  $('pickHint').textContent = d ? 'Vælg en etage mere, eller gem og send det, du har.' : 'Vælg en etage. Du kan gemme, så snart den er færdig.';
  show('pick');
}
function renderFloor(){
  const f = state.floors[state.cur], n = f.photos.length;
  $('floorProg').textContent = 'Etage';
  $('floorTitle').textContent = f.name;
  const got = f.photos.filter(p => p.photo).length;
  const box = $('slots'); box.innerHTML = '';
  f.photos.forEach((p, i) => {
    const s = document.createElement('div'); s.className = 'slot' + (p.photo ? ' has' : '');
    s.innerHTML = `<h3>${TITLE} ${i+1} af ${n}</h3>${p.photo ? `<img alt="${TITLE} ${i+1}">` : ''}
      <label class="big filebtn ${p.photo ? 'secondary' : 'primary'}"><span>📷 ${p.photo ? 'Tag nyt billede' : 'Tag billede'}</span><input type="file" accept="image/*" capture="environment"></label>
      ${p.photo ? `<input class="txt" maxlength="120" placeholder="Note (valgfrit)">` : ''}`;
    if (p.photo) { s.querySelector('img').src = p.url; const t = s.querySelector('input.txt'); t.value = p.note; t.oninput = () => { p.note = t.value; }; }
    s.querySelector('input[type=file]').onchange = async e => {
      const file = e.target.files && e.target.files[0]; e.target.value = ''; if (!file) return;
      try { const blob = await downscale(file); if (p.url) URL.revokeObjectURL(p.url); p.photo = blob; p.url = URL.createObjectURL(blob); renderFloor(); }
      catch { alert('Billedet kunne ikke læses. Prøv igen.'); }
    };
    box.appendChild(s);
  });
  const ok = got === n;
  $('floorHint').textContent = ok ? `Alle ${n} billeder er taget. Gem nu, eller tag en etage mere.` : `Tag ${n} billeder (${got} af ${n} taget), så kan du gemme.`;
  $('btnNext').disabled = !ok; $('btnMore').disabled = !ok;
}
$('btnNext').onclick = () => { if (doneFloors().length) summary(); };
$('btnMore').onclick = renderPick;
$('btnBackPick').onclick = renderPick;
$('btnPickSave').onclick = () => { if (doneFloors().length) summary(); };
$('btnPickCancel').onclick = () => { if (!doneFloors().length || confirm('Afbryd runderingen? Billederne bliver ikke gemt.')) show('start'); };
$('btnEdit').onclick = renderPick;

function thumbs(el, floors, urlOf){
  el.innerHTML = '';
  floors.forEach((f, fi) => {
    const h = document.createElement('p'); h.className = 'progress'; h.textContent = f.name; el.appendChild(h);
    const g = document.createElement('div'); g.className = 'thumbs';
    f.photos.forEach((p, i) => {
      const t = document.createElement('button'); t.className = 'thumb'; const u = urlOf(fi, i);
      t.innerHTML = `<img alt="" src="${u}"><div><b>${TITLE} ${i+1}</b>${p.note ? esc(p.note) : ''}</div>`;
      t.onclick = () => { $('viewImg').src = u; $('viewCap').textContent = `${f.name} · ${TITLE} ${i+1}${p.note ? ' · ' + p.note : ''}`; $('viewer').hidden = false; };
      g.appendChild(t);
    });
    el.appendChild(g);
  });
}
$('viewClose').onclick = () => { $('viewer').hidden = true; };
const count = floors => floors.reduce((a, f) => a + f.photos.length, 0);
function summary(){
  state.time = new Date();
  $('sumTime').textContent = fmtTime(state.time);
  const df = doneFloors();
  $('sumFloors').textContent = df.map(f => f.name).join(', ');
  $('sumCount').textContent = count(df);
  $('initials').value = localStorage.getItem('zeal-initials') || '';
  thumbs($('sumThumbs'), df, (fi, i) => df[fi].photos[i].url);
  show('sum');
}

// ---------- IndexedDB ----------
function db(){ return new Promise((res, rej) => { const r = indexedDB.open('zeal-rundering', 1); r.onupgradeneeded = () => r.result.createObjectStore('rounds', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function tx(mode, fn){ const d = await db(); return new Promise((res, rej) => { const t = d.transaction('rounds', mode); const r = fn(t.objectStore('rounds')); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); }); }
const putR = c => tx('readwrite', s => s.put(c));
const allR = () => tx('readonly', s => s.getAll());
const delR = id => tx('readwrite', s => s.delete(id));

// ---------- Mail ----------
function safe(s){ return s.replace(/æ/g,'ae').replace(/ø/g,'oe').replace(/å/g,'aa').replace(/Æ/g,'Ae').replace(/Ø/g,'Oe').replace(/Å/g,'Aa').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9]+/g,'-').replace(/^-+|-+$/g,''); }
const fileName = (c, f, i) => `Zeal-risiko-zone_${safe(f.name) || 'etage'}_${i+1}_${stamp(new Date(c.ts))}.jpg`;
function allFiles(c){ const out = []; c.floors.forEach(f => f.photos.forEach((p, i) => out.push({ name: fileName(c, f, i), blob: p.photo }))); return out; }
function mailParts(c){
  const subject = `Zeal-rundering ${c.floors.map(f => f.name).join(', ')} – ${fmtTime(new Date(c.ts))}`;
  const lines = c.floors.map(f => `${f.name}:\n` + f.photos.map((p, i) => `  ${TITLE} ${i+1}${p.note ? ' – ' + p.note : ''}`).join('\n'));
  const body = `Zeal-rundering\n\nTidspunkt: ${fmtTime(new Date(c.ts))}\nInitialer: ${c.initials || '–'}\nEtager: ${c.floors.map(f => f.name).join(', ')}\nBilleder: ${count(c.floors)} vedhæftet\n\n${lines.join('\n\n')}\n`;
  return { subject, body };
}
function b64utf8(s){ return btoa(unescape(encodeURIComponent(s))); }
function blobToB64(blob){ return new Promise(r => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(',')[1]); fr.readAsDataURL(blob); }); }
const wrap76 = s => s.replace(/.{1,76}/g, m => m + '\r\n');
async function buildEml(c, subject, body){
  const bnd = 'zeal-' + Date.now().toString(36);
  const lines = [`To: ${RECIPIENT}`, `Subject: =?UTF-8?B?${b64utf8(subject)}?=`, `Date: ${new Date().toUTCString().replace('GMT','+0000')}`, 'X-Unsent: 1', 'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${bnd}"`, '', `--${bnd}`, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', wrap76(b64utf8(body))];
  for (const f of allFiles(c)) lines.push(`--${bnd}`, `Content-Type: image/jpeg; name="${f.name}"`, 'Content-Transfer-Encoding: base64', `Content-Disposition: attachment; filename="${f.name}"`, '', wrap76(await blobToB64(f.blob)));
  lines.push(`--${bnd}--`, '');
  return new Blob([lines.join('\r\n')], { type: 'message/rfc822' });
}
const mailto = (s, b) => `mailto:${RECIPIENT}?subject=${encodeURIComponent(s)}&body=${encodeURIComponent(b)}`;
async function send(c){
  const { subject, body } = mailParts(c);
  const link = $('mailtoLink'); link.href = mailto(subject, body); link.hidden = true;
  const files = allFiles(c).map(f => new File([f.blob], f.name, { type: 'image/jpeg' }));
  const text = `Til: ${RECIPIENT}\nEmne: ${subject}\n\n${body}`;
  if (navigator.canShare && navigator.canShare({ files })) {
    try { await navigator.share({ files, title: subject, text }); $('doneMsg').textContent = `Vælg Mail, skriv ${RECIPIENT} som modtager hvis den mangler, og tryk Send.`; show('done'); return; }
    catch (e) { if (e && e.name === 'AbortError') { $('doneMsg').textContent = 'Runderingen er gemt, men ikke sendt. Du kan sende den fra "Tidligere runderinger".'; show('done'); return; } }
  }
  try {
    const eml = await buildEml(c, subject, body);
    const a = document.createElement('a'); a.href = URL.createObjectURL(eml); a.download = 'Zeal-rundering.eml';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    $('doneMsg').textContent = 'Filen Zeal-rundering.eml er hentet. Åbn den, og tryk Send i dit mailprogram.';
    link.hidden = false; link.textContent = 'Åbn mail uden billeder'; show('done');
  } catch {
    $('doneMsg').textContent = 'Din mail åbner nu – billederne skal vedhæftes manuelt. Tryk Send i dit mailprogram.';
    link.hidden = false; show('done'); location.href = link.href;
  }
}
$('btnSave').onclick = async () => {
  const initials = $('initials').value.trim().toUpperCase(); localStorage.setItem('zeal-initials', initials);
  const c = { id: Date.now(), ts: state.time.getTime(), initials, floors: doneFloors().map(f => ({ name: f.name, photos: f.photos.map(p => ({ photo: p.photo, note: p.note.trim() })) })) };
  $('btnSave').disabled = true;
  try { await putR(c); } catch { alert('Runderingen kunne ikke gemmes på telefonen, men sendes alligevel.'); }
  await send(c); $('btnSave').disabled = false;
};
$('btnHome').onclick = () => show('start');

// ---------- Historik ----------
let urls = [];
async function renderHistory(){
  const list = $('histList'); list.innerHTML = '';
  let all = []; try { all = await allR(); } catch {}
  all.sort((a, b) => b.ts - a.ts); $('histEmpty').hidden = all.length > 0;
  for (const c of all) {
    const b = document.createElement('button');
    b.innerHTML = `<span>${fmtTime(new Date(c.ts))}<small>${esc(c.floors.map(f => f.name).join(', '))} · ${count(c.floors)} billeder${c.initials ? ' · ' + esc(c.initials) : ''}</small></span><span aria-hidden="true">›</span>`;
    b.onclick = () => openDetail(c); list.appendChild(b);
  }
  show('history');
}
function openDetail(c){
  urls.forEach(u => URL.revokeObjectURL(u)); urls = [];
  const map = c.floors.map(f => f.photos.map(p => { const u = URL.createObjectURL(p.photo); urls.push(u); return u; }));
  $('detTime').textContent = fmtTime(new Date(c.ts)); $('detInit').textContent = c.initials || '–'; $('detCount').textContent = count(c.floors);
  thumbs($('detThumbs'), c.floors, (fi, i) => map[fi][i]);
  $('btnResend').onclick = () => send(c);
  $('btnDelete').onclick = async () => { if (confirm('Slet denne rundering fra telefonen?')) { await delR(c.id); renderHistory(); } };
  show('detail');
}
$('btnHistory').onclick = renderHistory;
$('btnNew').onclick = startRound;
document.querySelectorAll('[data-back]').forEach(b => b.onclick = () => { if (b.dataset.back === 'history') renderHistory(); else show(b.dataset.back); });
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
