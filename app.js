(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ================= HERO: scrub-the-foam windshield ================= */
  const ws = $('#ws'), cv = $('#wsCanvas'), ctx = cv.getContext('2d');
  const sponge = $('#sponge'), cleanImg = $('.clean', ws);
  const GX = 48, GY = 28; let grid, cleared = 0, done = false, W = 0, H = 0, dpr = 1;
  const R = () => Math.max(46, Math.min(W, H) * 0.09);

  function coverRect(img, w, h, py = 0.62) {
    const ir = img.naturalWidth / img.naturalHeight, r = w / h;
    let dw, dh; if (ir > r) { dh = h; dw = h * ir; } else { dw = w; dh = w / ir; }
    return [(w - dw) / 2, (h - dh) * py, dw, dh];
  }
  function paintFoam() {
    const r = ws.getBoundingClientRect(); W = r.width; H = r.height; dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    // dulled, grimy version of the car underneath
    ctx.filter = 'blur(3px) saturate(.35) brightness(.72) sepia(.35)';
    if (cleanImg.complete && cleanImg.naturalWidth) ctx.drawImage(cleanImg, ...coverRect(cleanImg, W, H));
    ctx.filter = 'none';
    ctx.fillStyle = 'rgba(92,82,66,.38)'; ctx.fillRect(0, 0, W, H);
    // foam: layered bubbles
    const n = Math.round(W * H / 260);
    for (let i = 0; i < n; i++) {
      const x = Math.random() * W, y = Math.random() * H * (0.35 + Math.random() * 0.8);
      const s = Math.random() ** 2.2 * 26 + 2;
      const g = ctx.createRadialGradient(x - s * .3, y - s * .3, s * .1, x, y, s);
      g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(.7, 'rgba(236,242,242,.55)'); g.addColorStop(1, 'rgba(200,214,216,.15)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, s, 0, 7); ctx.fill();
    }
    // drips
    for (let i = 0; i < W / 18; i++) {
      const x = Math.random() * W, y = H * (.2 + Math.random() * .4), l = 30 + Math.random() * 140;
      const g = ctx.createLinearGradient(0, y, 0, y + l);
      g.addColorStop(0, 'rgba(245,248,248,.7)'); g.addColorStop(1, 'rgba(245,248,248,0)');
      ctx.fillStyle = g; ctx.fillRect(x, y, 3 + Math.random() * 6, l);
    }
    grid = new Uint8Array(GX * GY); cleared = 0; done = false; cv.style.transition = 'none'; cv.style.opacity = 1;
    updateMeter();
  }
  function wipe(x, y, px, py) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const rr = R();
    const g = ctx.createRadialGradient(x, y, rr * .35, x, y, rr);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    if (px != null) { ctx.strokeStyle = 'rgba(0,0,0,1)'; ctx.lineWidth = rr * 1.2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke(); }
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rr, 0, 7); ctx.fill();
    // mark grid
    const cw = W / GX, ch = H / GY, rad = rr * .75;
    for (let gy = Math.max(0, ((y - rad) / ch) | 0); gy <= Math.min(GY - 1, ((y + rad) / ch) | 0); gy++)
      for (let gx = Math.max(0, ((x - rad) / cw) | 0); gx <= Math.min(GX - 1, ((x + rad) / cw) | 0); gx++) {
        const i = gy * GX + gx; if (!grid[i]) { const dx = (gx + .5) * cw - x, dy = (gy + .5) * ch - y; if (dx * dx + dy * dy < rad * rad) { grid[i] = 1; cleared++; } }
      }
    updateMeter();
  }
  function updateMeter() {
    const p = Math.min(100, Math.round(cleared / (GX * GY) * 100 / .62));
    $('#wsPct').textContent = p + '%'; $('#wsBar').style.width = p + '%';
    $('#wsReset').classList.toggle('on', p > 8);
    if (p >= 100 && !done) {
      done = true; cv.style.transition = 'opacity 1.2s ease'; cv.style.opacity = 0;
      $('#wsMsg').textContent = 'Spotless. Now imagine yours →';
    }
  }
  let last = null, down = false;
  const pos = e => { const r = ws.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  ws.addEventListener('pointermove', e => {
    const [x, y] = pos(e); sponge.style.transform = `translate(${x}px,${y}px)`;
    sponge.style.width = sponge.style.height = R() * 1.6 + 'px'; sponge.style.margin = `-${R() * .8}px 0 0 -${R() * .8}px`;
    if (e.pointerType === 'mouse' || down) { wipe(x, y, last?.[0], last?.[1]); last = [x, y]; }
  });
  ws.addEventListener('pointerdown', e => { down = true; const [x, y] = pos(e); last = [x, y]; wipe(x, y); });
  ['pointerup', 'pointercancel'].forEach(t => window.addEventListener(t, () => { down = false; last = null; }));
  ws.addEventListener('pointerleave', () => { last = null; });
  $('#wsReset').addEventListener('click', e => { e.stopPropagation(); paintFoam(); $('#wsMsg').textContent = 'Real Scrubz job · Driveway, King County'; });
  // intro swipe so the reveal reads instantly
  function introSwipe() {
    let t = 0, prev = null; const pts = [];
    const step = () => {
      t += 0.022; if (t > 1) return;
      const x = W * (.08 + .84 * t), y = H * (.5 + Math.sin(t * Math.PI * 2.2) * .14);
      wipe(x, y, prev?.[0], prev?.[1]); prev = [x, y]; requestAnimationFrame(step);
    };
    step();
  }
  const init = () => { paintFoam(); setTimeout(introSwipe, 650); };
  if (cleanImg.complete) init(); else cleanImg.addEventListener('load', init);
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (Math.abs(ws.getBoundingClientRect().width - W) > 40) paintFoam(); }, 250); });

  /* ================= Packages filter ================= */
  $$('.pkg-switch button').forEach(b => b.addEventListener('click', () => {
    $$('.pkg-switch button').forEach(x => x.classList.toggle('on', x === b));
    const f = b.dataset.f;
    $$('.pkg').forEach(p => p.classList.toggle('dim', f !== 'all' && !p.dataset.k.split(' ').includes(f)));
  }));

  /* ================= Add-ons ================= */
  const ADDONS = [
    { n: 'Interior Fabric Extraction', p: 100, d: 'Enzymes, drill-brush agitation and deep shampoo extraction, finished with a water repellent against spills.' },
    { n: 'Engine Bay Detail', p: 80, d: 'Degreased, nylon-brushed, safely steamed and dried — then a spray shine and protective coating.' },
    { n: 'Interior Material Polish', p: 60, d: 'Vinyl, rubber and plastic cleaned, conditioned and protected with a pH-balanced formula.' },
    { n: 'Exterior Material Polish', p: 40, d: 'Faded or dried trim revitalized with an acrylic polymer for deep shine and UV protection.' },
    { n: 'Light Restoration', p: 35, u: 'per light', d: 'Head or taillights cleared of oxidation and imperfections for optical clarity — and safety.' },
  ];
  const picked = new Set();
  const list = $('#addonList');
  list.innerHTML = ADDONS.map((a, i) => `<button type="button" class="addon" data-i="${i}">
    <div class="top"><span class="nm">${a.n}</span><span class="pr">$${a.p}${a.u ? ` <small>${a.u}</small>` : ''}</span></div>
    <span class="ds">${a.d}</span><span class="tg">Add</span></button>`).join('');
  $('#qAddons').innerHTML = ADDONS.map(a => `<button type="button" class="opt" data-v="${a.n}"><b>${a.n}</b><span>$${a.p}${a.u ? ' ' + a.u : ''}</span></button>`).join('');
  function syncAddons() {
    $$('.addon', list).forEach(b => { const on = picked.has(ADDONS[b.dataset.i].n); b.classList.toggle('on', on); $('.tg', b).textContent = on ? 'Added' : 'Add'; });
    $$('#qAddons .opt').forEach(b => b.classList.toggle('on', picked.has(b.dataset.v)));
    const sum = ADDONS.filter(a => picked.has(a.n)).reduce((s, a) => s + a.p, 0);
    $('#addonSum').textContent = (picked.has('Light Restoration') ? 'from ' : '') + '$' + sum;
    $('#addonCount').textContent = picked.size + ' selected';
  }
  list.addEventListener('click', e => { const b = e.target.closest('.addon'); if (!b) return; const n = ADDONS[b.dataset.i].n; picked.has(n) ? picked.delete(n) : picked.add(n); syncAddons(); });
  syncAddons();

  /* ================= Before / After ================= */
  const BA = [
    ['element-exterior', 'Honda Element', 'Exterior wash'],
    ['element-steering', 'Honda Element', 'Steering & cabin'],
    ['seat-stain', 'Cloth seat', 'Stain extraction'],
    ['cargo-floor', 'Cargo floor', 'Deep shampoo'],
    ['floor-mat', 'Floor liner', 'Interior reset'],
    ['rubber-mat', 'Rubber mat', 'Interior reset'],
    ['cupholders', 'Center console', 'Detail clean'],
    ['dash', 'Dash & controls', 'Material polish'],
    ['wheel', 'Wheel & tire', 'Wheels dressed'],
    ['truck-bed', 'Truck bed', 'Exterior'],
    ['bedliner', 'Bed liner', 'Material restoration'],
    ['pedals', 'Footwell', 'Interior reset'],
  ];
  let bi = 0; const ba = $('#ba');
  $('#baThumbs').innerHTML = BA.map((b, i) => `<button aria-label="${b[0]}" data-i="${i}"><img src="assets/ba-${b[0]}-after.jpg" alt="" loading="lazy"></button>`).join('');
  function showBA(i) {
    bi = (i + BA.length) % BA.length; const [k, t, s] = BA[bi];
    $('#baBefore').src = `assets/ba-${k}-before.jpg`; $('#baAfter').src = `assets/ba-${k}-after.jpg`;
    $('#baN').textContent = String(bi + 1).padStart(2, '0') + '/' + BA.length; $('#baT').textContent = t; $('#baS').textContent = s;
    $$('#baThumbs button').forEach((b, j) => b.classList.toggle('on', j === bi));
    animateTo(50, 20);
  }
  let p = 50, anim;
  const setP = v => { p = Math.max(0, Math.min(100, v)); ba.style.setProperty('--p', p + '%'); };
  function animateTo(target, from) {
    cancelAnimationFrame(anim); const start = from ?? p, t0 = performance.now();
    const f = now => { const k = Math.min(1, (now - t0) / 900), e = 1 - Math.pow(1 - k, 3); setP(start + (target - start) * e); if (k < 1) anim = requestAnimationFrame(f); };
    anim = requestAnimationFrame(f);
  }
  let drag = false;
  const baMove = e => { const r = ba.getBoundingClientRect(); setP((e.clientX - r.left) / r.width * 100); };
  ba.addEventListener('pointerdown', e => { drag = true; cancelAnimationFrame(anim); ba.setPointerCapture(e.pointerId); baMove(e); });
  ba.addEventListener('pointermove', e => { if (drag) baMove(e); });
  ba.addEventListener('pointerup', () => drag = false);
  $('#baThumbs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) showBA(+b.dataset.i); });
  $('#baPrev').onclick = () => showBA(bi - 1); $('#baNext').onclick = () => showBA(bi + 1);
  showBA(0);
  // sweep when it scrolls into view
  new IntersectionObserver((en, o) => { if (en[0].isIntersecting) { animateTo(50, 92); o.disconnect(); } }, { threshold: .5 }).observe(ba);

  /* ================= Reel ================= */
  const REEL = [['foam-x-close'], ['camaro-side'], ['tesla-s-street', 1], ['cadillac-wheel'], ['lexus-interior'], ['tacoma-rear', 1], ['interior-seats'], ['foam-tesla-x'], ['tesla-s-clean', 1], ['camaro-foam'], ['foam-texture']];
  const reelHTML = REEL.map(([k, w]) => `<figure class="${w ? 'w' : ''}"><img src="assets/${k}.jpg" alt="Scrubz detailing work" loading="lazy"></figure>`).join('');
  $('#reel').innerHTML = reelHTML + reelHTML;

  /* ================= Hours ================= */
  const HOURS = [['Monday', '8 AM – 8 PM'], ['Tuesday', '8 AM – 8 PM'], ['Wednesday', '8 AM – 8 PM'], ['Thursday', '8 AM – 8 PM'], ['Friday', 'Closed'], ['Saturday', '8 AM – 8 PM'], ['Sunday', '8 AM – 12 AM']];
  const today = (new Date().getDay() + 6) % 7;
  $('#hours').innerHTML = HOURS.map((h, i) => `<div class="${i === today ? 'today' : ''}"><span>${h[0]}${i === today ? ' · today' : ''}</span><span>${h[1]}</span></div>`).join('');

  /* ================= Quote wizard ================= */
  const state = { service: null, vehicle: null, condition: null };
  let step = 0; const steps = $$('.q-step'), prog = $$('.q-prog i');
  $$('.opts[data-single]').forEach(g => g.addEventListener('click', e => {
    const b = e.target.closest('.opt'); if (!b) return;
    $$('.opt', g).forEach(x => x.classList.toggle('on', x === b)); state[g.dataset.name] = b.dataset.v;
    if (g.dataset.name === 'service') setTimeout(() => go(1), 260);
  }));
  $('#qAddons').addEventListener('click', e => { const b = e.target.closest('.opt'); if (!b) return; picked.has(b.dataset.v) ? picked.delete(b.dataset.v) : picked.add(b.dataset.v); syncAddons(); });
  function pickService(v) { state.service = v; $$('.opts[data-name=service] .opt').forEach(x => x.classList.toggle('on', x.dataset.v === v)); go(1); }
  $$('[data-pick]').forEach(a => a.addEventListener('click', () => pickService(a.dataset.pick)));
  const val = id => $(id).value.trim();
  function summary() {
    return [
      ['Service', state.service || '—'], ['Vehicle', [state.vehicle, val('#qModel')].filter(Boolean).join(' · ') || '—'],
      ['Condition', state.condition || '—'], ['Add-ons', [...picked].join(', ') || 'None'],
      ['Where', val('#qAddr') || '—'], ['When', [val('#qDate'), $('#qTime').value].filter(Boolean).join(' · ')],
      ['Name', val('#qName') || '—'], ['Phone', val('#qPhone') || '—'], ['Notes', val('#qNote') || '—'],
    ];
  }
  function go(n) {
    if (n === 1 && !state.service) { flash(0); return; }
    if (n === 2 && !state.vehicle) { flash(1); return; }
    step = n; steps.forEach((s, i) => s.classList.toggle('on', i === n));
    prog.forEach((p, i) => p.classList.toggle('on', i <= Math.min(n, 4)));
    $('#qBack').hidden = n === 0 || n === 5; $('#qNav').style.display = n === 5 ? 'none' : '';
    $('#qNext').innerHTML = n === 4 ? 'Prepare request <span class="arr">→</span>' : 'Continue <span class="arr">→</span>';
    if (n === 4) $('#qSummary').innerHTML = summary().map(([k, v]) => `<div><span>${k}</span><span>${v}</span></div>`).join('');
    if (n === 5) {
      const body = 'Hi Scrubz! I’d like a quote.\n' + summary().map(([k, v]) => `${k}: ${v}`).join('\n');
      $('#sendSms').href = 'sms:+12064924729?&body=' + encodeURIComponent(body);
      $('#sendMail').href = 'mailto:scrubzdetaillc@gmail.com?subject=' + encodeURIComponent('Quote request — ' + (state.service || 'Detail')) + '&body=' + encodeURIComponent(body);
    }
  }
  function flash(i) { const g = $$('.opts', steps[i])[0]; g.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }], { duration: 320 }); }
  $('#qNext').onclick = () => go(step + 1);
  $('#qBack').onclick = () => go(step - 1);
  const d = $('#qDate'); d.min = new Date().toISOString().slice(0, 10);

  /* ================= Reveal ================= */
  const io = new IntersectionObserver(en => en.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  $$('.rv').forEach((el, i) => { el.style.transitionDelay = (i % 3) * 80 + 'ms'; io.observe(el); });
})();
