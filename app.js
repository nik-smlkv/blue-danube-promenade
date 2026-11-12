/* Blue Danube Promenade — motion + interactions (Lenis + GSAP ScrollTrigger). */
(() => {
  'use strict';
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mqMobile = window.matchMedia('(max-width: 860px)');
  const isMobile = () => mqMobile.matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  /* ---------- number formatting ---------- */
  const fmt = (v, dec = 0) => {
    const fixed = Number(v).toFixed(dec);
    const [i, d] = fixed.split('.');
    const int = i.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
    return d ? `${int},${d}` : int;
  };
  const countUp = (el, dur = 1.4) => {
    const to = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.dec || '0', 10);
    if (RM || !hasGSAP) { el.textContent = fmt(to, dec); return; }
    const o = { v: 0 };
    gsap.to(o, { v: to, duration: dur, ease: 'power3.out', onUpdate: () => { el.textContent = fmt(o.v, dec); } });
  };

  /* ---------- section schema data (PGD) ---------- */
  const SR = (document.documentElement.lang || '').toLowerCase().startsWith('sr');
  // plural forms: sr 1 stan / 2–4 stana / 5+ stanova; ru 1 квартира / 2–4 квартиры / 5+ квартир
  const plural = (n) => {
    const d = n % 10, h = n % 100;
    const f = SR ? ['stan', 'stana', 'stanova'] : ['квартира', 'квартиры', 'квартир'];
    if (d === 1 && h !== 11) return f[0];
    if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return f[1];
    return f[2];
  };
  const T = SR ? {
    sec: 'Lamela',
    name: 'Unesite ime\u00a0– najmanje 2 slova',
    phone: 'Unesite broj telefona: najmanje 8 cifara, npr.\u00a0+381\u00a064\u00a0123\u00a04567',
    consent: 'Potvrdite saglasnost sa obradom podataka',
    sending: 'Šaljemo…',
    submit: 'Pošaljite zahtev',
    secCta: (n, c) => `Pogledajte ${c} ${plural(c)} u lameli ${n}`,
    lam: 'Lamela', floor: '7. sprat', apt: 'Stan',
    count: (c) => `${c} ${plural(c)}`,
    ori: { severoistok: 'severoistok', jugozapad: 'jugozapad', jugoistok: 'jugoistok', severozapad: 'severozapad' },
    oriLabel: 'Orijentacija prozora',
    open: 'Pogledajte osnovu',
    openAria: (id) => `Stan ${id}: otvorite originalni list sa osnovom`,
    alt: (id) => `Osnova stana ${id}, isečak sa originalnog lista`,
    fullAlt: (id) => `Originalni list stana ${id}: osnova, specifikacija prostorija i položaj stana na 7. spratu`,
    dlgTitle: (id) => `Stan ${id}`,
    fit: 'Po širini',
    pos: (i, n) => `${i} od ${n}`,
    mb: (b) => `${(b / 1048576).toFixed(1).replace('.', ',')} MB`,
    m2: 'm²',
    areaText: (v) => `do ${v} m²`,
    ctxRest: (a) => `· Lamela ${a.lamela} · 7. sprat · ${a.povrsina_label} m²`,
    formTitle: 'Zatražite prezentaciju', formTitleCtx: 'Zatražite informacije',
    done: 'Zahtev je primljen', doneCtx: (id) => `Zahtev za stan ${id} je primljen`
  } : {
    sec: 'Секция',
    name: 'Укажите имя — минимум 2 буквы',
    phone: 'Укажите телефон: не меньше 8 цифр, например\u00a0+381\u00a064\u00a0123\u00a04567',
    consent: 'Отметьте согласие на обработку данных',
    sending: 'Отправляем…',
    submit: 'Отправить заявку',
    secCta: (n, c) => `Смотреть ${c} ${plural(c)} в секции ${n}`,
    lam: 'Секция', floor: '7-й этаж', apt: 'Квартира',
    count: (c) => `${c} ${plural(c)}`,
    ori: { severoistok: 'северо-восток', jugozapad: 'юго-запад', jugoistok: 'юго-восток', severozapad: 'северо-запад' },
    oriLabel: 'Ориентация окон',
    open: 'Смотреть планировку',
    openAria: (id) => `Квартира ${id}: открыть исходный лист с планировкой`,
    alt: (id) => `Планировка квартиры ${id}, фрагмент исходного листа`,
    fullAlt: (id) => `Исходный лист квартиры ${id}: планировка, экспликация помещений и положение квартиры на 7-м этаже`,
    dlgTitle: (id) => `Квартира ${id}`,
    fit: 'По ширине',
    pos: (i, n) => `${i} из ${n}`,
    mb: (b) => `${(b / 1048576).toFixed(1).replace('.', ',')} МБ`,
    m2: 'м²',
    areaText: (v) => `до ${v} м²`,
    ctxRest: (a) => `· Секция ${a.lamela} · 7-й этаж · ${a.povrsina_label} м²`,
    formTitle: 'Получить презентацию', formTitleCtx: 'Запросить информацию',
    done: 'Заявка принята', doneCtx: (id) => `Заявка по квартире ${id} принята`
  };
  const SECTIONS = SR ? {
    1: 'Duž ulice S126 · 18,5 × 57 m · 167 stanova, 10 lokala',
    2: 'Duž ulice S126 · 49 × 20 m · 181 stan, 14 lokala',
    3: 'Duž ulice S126 · 57,5 × 20 m · 183 stana, 12 lokala',
    4: 'Duž magistrale T6 · 19 × 45 m · 137 stanova, 7 lokala',
    5: 'Duž magistrale T6 · 17 × 40 m · 120 stanova, 5 lokala',
    6: 'Duž interne saobraćajnice · 19 × 62,5 m · 183 stana, 12 lokala',
    7: 'Duž interne saobraćajnice · 19 × 51 m · 174 stana, 15 lokala',
    8: 'Sa otklonom u odnosu na Ratarski put · 19 × 46,5 m · 146 stanova i dva depadansa vrtića',
  } : {
    1: 'Вдоль улицы С126 · 18,5 × 57 м · 167 квартир, 10 помещений',
    2: 'Вдоль улицы С126 · 49 × 20 м · 181 квартира, 14 помещений',
    3: 'Вдоль улицы С126 · 57,5 × 20 м · 183 квартиры, 12 помещений',
    4: 'Вдоль магистрали Т6 · 19 × 45 м · 137 квартир, 7 помещений',
    5: 'Вдоль магистрали Т6 · 17 × 40 м · 120 квартир, 5 помещений',
    6: 'Вдоль внутреннего проезда · 19 × 62,5 м · 183 квартиры, 12 помещений',
    7: 'Вдоль внутреннего проезда · 19 × 51 м · 174 квартиры, 15 помещений',
    8: 'Под углом к Ратарскому пути · 19 × 46,5 м · 146 квартир и два помещения детского сада',
  };
  const secPolys = $$('.scheme .sec');
  const secNums = $$('.scheme .sec-nums text');
  const secCta = $('#sec-cta');
  const FOCUS_LAM = [5, 6];
  let activeSec = 0;
  let secLocked = false; // a click/Enter pins the choice so hover/scroll do not steal it
  const setSection = (n, force = false) => {
    if ((n === activeSec && !force) || !SECTIONS[n]) return;
    activeSec = n;
    secPolys.forEach((p) => p.classList.toggle('is-active', +p.dataset.sec === n));
    secNums.forEach((t, i) => t.classList.toggle('is-active', i + 1 === n));
    $('#sec-title').textContent = `${T.sec} ${n}`;
    $('#sec-text').textContent = SECTIONS[n];
    if (secCta) {
      const focus = FOCUS_LAM.includes(n);
      secCta.hidden = !focus;
      if (focus) { secCta.dataset.lam = n; secCta.textContent = T.secCta(n, (window.STANOVI || []).filter((a) => a.lamela === n).length); }
    }
  };
  const softSection = (n) => { if (!secLocked) setSection(n); };
  secPolys.forEach((p) => {
    const n = +p.dataset.sec;
    p.addEventListener('mouseenter', () => softSection(n));
    p.addEventListener('focus', () => setSection(n));
    p.addEventListener('click', () => { secLocked = true; setSection(n); });
    p.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); secLocked = true; setSection(n); } });
  });
  setSection(1);

  /* ---------- ground floor day / evening toggle ---------- */
  const ground = $('#partner');
  $$('.tgl').forEach((b) => b.addEventListener('click', () => {
    const day = b.dataset.time === 'day';
    ground.classList.toggle('is-day', day);
    $$('.tgl').forEach((x) => { const on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', on); });
  }));

  /* ---------- form (demo only — nothing is sent) ---------- */
  const form = $('#lead-form');
  const done = $('#form-done');
  const setErr = (input, errEl, msg) => {
    errEl.textContent = msg || '';
    if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  };
  const rules = {
    'f-name': (el) => el.value.trim().length < 2 ? T.name : '',
    'f-phone': (el) => el.value.replace(/\D/g, '').length < 8 ? T.phone : '',
    'f-consent': (el) => !el.checked ? T.consent : ''
  };
  const check = (id) => { const el = $('#' + id); const msg = rules[id](el); setErr(el, $('#e-' + id.slice(2)), msg); return !msg; };
  // re-validate on blur/change only after the field was flagged — no nagging while typing
  Object.keys(rules).forEach((id) => {
    const el = $('#' + id);
    el.addEventListener(id === 'f-consent' ? 'change' : 'blur', () => { if (el.getAttribute('aria-invalid') === 'true') check(id); });
  });
  const submitBtn = form.querySelector('[type=submit]');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const ok = Object.keys(rules).map(check).every(Boolean);
    if (!ok) { form.querySelector('[aria-invalid=true]')?.focus(); return; }
    submitBtn.disabled = true; submitBtn.setAttribute('aria-busy', 'true'); submitBtn.textContent = T.sending;
    setTimeout(() => {
      $('#done-title').textContent = ctxApt ? T.doneCtx(ctxApt.id) : T.done;
      form.hidden = true; done.hidden = false; done.focus();
      submitBtn.disabled = false; submitBtn.removeAttribute('aria-busy'); submitBtn.textContent = T.submit;
    }, 450);
  });
  $('#form-reset').addEventListener('click', () => { form.reset(); setFormCtx(ctxApt); done.hidden = true; form.hidden = false; $('#f-name').focus(); });


  /* ---------- 7 · apartment finder (lamele 5/6, 7. sprat, ≤ 50 m²) ---------- */
  const APTS = (window.STANOVI || []).filter((a) => a.sprat === 7 && a.povrsina_m2 <= 50 && (a.lamela === 5 || a.lamela === 6));
  const aptNum = (a) => parseInt(a.id.split('-')[1], 10);
  const fmtArea = (v) => String(v).replace('.', ',');
  const grid = $('#cat-grid');
  const DEF = { lam: 'all', max: 50, ori: 'all', sort: 'area-asc' };
  const st = { ...DEF };
  let shown = [];
  const tabs = $$('.finder-tabs [role=tab]');
  const areaIn = $('#f-area');
  const areaOut = $('#area-out');
  const sortSel = $('#f-sort');
  const oriInputs = $$('input[name=ori]');

  const cardHTML = (a) => `
    <li class="apt" data-id="${a.id}">
      <button type="button" class="apt-open" aria-haspopup="dialog" aria-label="${T.openAria(a.id)}">
        <span class="apt-plan"><img src="${a.preview}" width="${a.preview_px[0]}" height="${a.preview_px[1]}" loading="lazy" decoding="async" alt="${T.alt(a.id)}"></span>
        <span class="apt-body">
          <span class="apt-top"><span class="apt-id">${a.id}</span><span class="apt-area">${a.povrsina_label}<span class="u">&nbsp;${T.m2}</span></span></span>
          <span class="apt-sub">${T.lam} ${a.lamela} · ${T.floor}</span>
          <span class="apt-ori"><span class="k">${T.oriLabel}:</span> ${T.ori[a.orijentacija]}</span>
          <span class="apt-more">${T.open}<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg></span>
        </span>
      </button>
    </li>`;
  if (grid) grid.innerHTML = APTS.map(cardHTML).join('');
  const cards = new Map($$('.apt', grid || document).map((li) => [li.dataset.id, li]));

  const passes = (a, s, ignoreLam = false) =>
    (ignoreLam || s.lam === 'all' || a.lamela === +s.lam) && a.povrsina_m2 <= s.max && (s.ori === 'all' || a.orijentacija === s.ori);
  const sorters = {
    'area-asc': (x, y) => x.povrsina_m2 - y.povrsina_m2 || x.lamela - y.lamela || aptNum(x) - aptNum(y),
    'area-desc': (x, y) => y.povrsina_m2 - x.povrsina_m2 || x.lamela - y.lamela || aptNum(x) - aptNum(y),
    id: (x, y) => x.lamela - y.lamela || aptNum(x) - aptNum(y),
  };
  const isDefault = () => Object.keys(DEF).every((k) => String(st[k]) === String(DEF[k]));
  const render = () => {
    if (!grid) return;
    shown = APTS.filter((a) => passes(a, st)).sort(sorters[st.sort]);
    const ids = new Set(shown.map((a) => a.id));
    cards.forEach((li, id) => { li.hidden = !ids.has(id); });
    shown.forEach((a) => grid.appendChild(cards.get(a.id))); // reorder in place
    $('#cat-count').textContent = T.count(shown.length);
    $('#cat-empty').hidden = shown.length > 0;
    grid.hidden = shown.length === 0;
    $('#cat-reset').hidden = isDefault();
    // live per-tab counts under the other filters
    $$('[data-cnt]').forEach((el) => {
      const k = el.dataset.cnt;
      el.textContent = APTS.filter((a) => passes(a, st, true) && (k === 'all' || a.lamela === +k)).length;
    });
    if (window.ScrollTrigger) { clearTimeout(render.t); render.t = setTimeout(() => ScrollTrigger.refresh(), 120); }
  };
  const setLam = (lam, focusTab = false) => {
    st.lam = String(lam);
    tabs.forEach((t) => {
      const on = t.dataset.lam === st.lam;
      t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1;
      if (on) { $('#cat-panel').setAttribute('aria-labelledby', t.id); if (focusTab) t.focus({ preventScroll: true }); }
    });
    render();
  };
  const syncArea = () => {
    const v = fmtArea(st.max);
    areaOut.textContent = v;
    areaIn.setAttribute('aria-valuetext', T.areaText(v));
    areaIn.style.setProperty('--fill', `${((st.max - +areaIn.min) / (+areaIn.max - +areaIn.min)) * 100}%`);
  };
  const resetFilters = () => {
    Object.assign(st, DEF);
    areaIn.value = DEF.max; syncArea();
    sortSel.value = DEF.sort;
    oriInputs.forEach((i) => { i.checked = i.value === 'all'; });
    setLam('all');
  };
  if (grid) {
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => setLam(t.dataset.lam));
      t.addEventListener('keydown', (e) => {
        let k = null;
        if (e.key === 'ArrowRight') k = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') k = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') k = 0; else if (e.key === 'End') k = tabs.length - 1;
        if (k !== null) { e.preventDefault(); setLam(tabs[k].dataset.lam, true); }
      });
    });
    areaIn.addEventListener('input', () => { st.max = parseFloat(areaIn.value); syncArea(); render(); });
    sortSel.addEventListener('change', () => { st.sort = sortSel.value; render(); });
    oriInputs.forEach((i) => i.addEventListener('change', () => { if (i.checked) { st.ori = i.value; render(); } }));
    $('#cat-reset').addEventListener('click', () => { resetFilters(); tabs[0].focus({ preventScroll: true }); });
    $('#cat-empty-reset').addEventListener('click', () => { resetFilters(); tabs[0].focus({ preventScroll: true }); });
    syncArea(); render();
    // schema → catalog with lamela filter
    if (secCta) secCta.addEventListener('click', () => {
      const lam = secCta.dataset.lam;
      Object.assign(st, { max: DEF.max, ori: 'all' }); areaIn.value = DEF.max; syncArea();
      oriInputs.forEach((i) => { i.checked = i.value === 'all'; });
      setLam(lam);
      setTimeout(() => $(`#tab-${lam}`)?.focus({ preventScroll: true }), RM ? 0 : 1500);
    });
  }

  /* ---------- plan dialog: full original sheet, zoom/pan, download ---------- */
  const dlg = $('#plan-dlg');
  const viewer = $('#dlg-viewer');
  const dImg = $('#dlg-img');
  let cur = null, opener = null, zoom = 0; // zoom 0 = fit width; otherwise share of natural size
  const ZOOMS = [0.5, 0.75, 1, 1.5, 2];
  const lockScroll = (on) => {
    document.documentElement.classList.toggle('is-locked', on);
    if (window.__lenis) { if (on) window.__lenis.stop(); else window.__lenis.start(); }
  };
  const naturalW = () => (cur ? cur.original_px[0] : 1300);
  const fitW = () => Math.max(200, viewer.clientWidth - 2 * parseFloat(getComputedStyle(viewer).paddingLeft || 0));
  const applyZoom = (z, cx = 0.5, cy = 0.5) => {
    // keep the point under (cx, cy) of the viewport stable
    const before = { w: dImg.offsetWidth || 1, h: dImg.offsetHeight || 1 };
    const px = (viewer.scrollLeft + viewer.clientWidth * cx) / before.w;
    const py = (viewer.scrollTop + viewer.clientHeight * cy) / before.h;
    zoom = z;
    const w = z === 0 ? fitW() : Math.round(naturalW() * z);
    dImg.style.width = `${w}px`;
    viewer.classList.toggle('is-zoomed', z !== 0 && w > fitW());
    const after = { w: dImg.offsetWidth, h: dImg.offsetHeight };
    viewer.scrollLeft = px * after.w - viewer.clientWidth * cx;
    viewer.scrollTop = py * after.h - viewer.clientHeight * cy;
    $('#z-val').textContent = `${Math.round((z === 0 ? w / naturalW() : z) * 100)} %`;
    $('#z-out').disabled = z === 0;
    $('#z-in').disabled = z === ZOOMS[ZOOMS.length - 1];
    $('#z-fit').disabled = z === 0;
  };
  const stepZoom = (dir, cx, cy) => {
    // only levels larger than "fit width" are meaningful (fit is ~27 % on a phone, ~70 % on desktop)
    const fitZ = fitW() / naturalW();
    const lv = [0, ...ZOOMS.filter((z) => z > fitZ * 1.04)];
    const curZ = zoom === 0 ? 0 : zoom;
    let i = lv.indexOf(curZ); if (i < 0) i = 0;
    const j = Math.max(0, Math.min(lv.length - 1, i + dir));
    if (j !== i) applyZoom(lv[j], cx, cy);
  };
  const fill = (a) => {
    cur = a;
    const i = shown.findIndex((x) => x.id === a.id);
    $('#dlg-kicker').textContent = `${T.lam} ${a.lamela} · ${T.floor}`;
    $('#dlg-title').textContent = T.dlgTitle(a.id);
    $('#dlg-area').innerHTML = `${a.povrsina_label}&nbsp;${T.m2}`;
    $('#dlg-ori').textContent = T.ori[a.orijentacija];
    const dl = $('#dlg-dl');
    dl.href = a.original; dl.setAttribute('download', a.original.split('/').pop());
    $('#dlg-size').textContent = T.mb(a.original_bytes);
    $('#dlg-pos').textContent = i >= 0 ? T.pos(i + 1, shown.length) : '';
    $('#dlg-prev').disabled = i <= 0; $('#dlg-next').disabled = i < 0 || i >= shown.length - 1;
    viewer.classList.add('is-loading');
    dImg.alt = T.fullAlt(a.id);
    dImg.width = a.original_px[0]; dImg.height = a.original_px[1];
    dImg.onload = () => viewer.classList.remove('is-loading');
    dImg.src = a.original;
    viewer.scrollTop = 0; viewer.scrollLeft = 0;
    applyZoom(0);
  };
  const openPlan = (id, from) => {
    const a = APTS.find((x) => x.id === id); if (!a || !dlg) return;
    opener = from || document.activeElement;
    lockScroll(true);
    if (!dlg.open) dlg.showModal();
    fill(a);
    $('#dlg-title').focus({ preventScroll: true });
  };
  const closePlan = () => { if (dlg.open) dlg.close(); };
  if (dlg) {
    if (grid) grid.addEventListener('click', (e) => { const b = e.target.closest('.apt-open'); if (b) openPlan(b.closest('.apt').dataset.id, b); });
    dlg.addEventListener('close', () => {
      lockScroll(false);
      const back = opener; opener = null;
      if (back && document.contains(back)) back.focus({ preventScroll: true });
    });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) closePlan(); }); // backdrop
    // keep Tab inside the dialog (native modal lets focus escape to the browser chrome)
    dlg.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const f = [...dlg.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || !dlg.contains(document.activeElement) || document.activeElement === $('#dlg-title'))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    $('#dlg-close').addEventListener('click', closePlan);
    // Download the untouched original. The host serves pages in a sandboxed (opaque) origin where the
    // `download` attribute is ignored, so fetch the same file and save it from a blob (bytes unchanged).
    $('#dlg-dl').addEventListener('click', async (e) => {
      const a = e.currentTarget;
      if (a.dataset.busy) { e.preventDefault(); return; }
      if (!window.fetch || !window.URL || !URL.createObjectURL) return; // native link as fallback
      e.preventDefault();
      a.dataset.busy = '1'; a.setAttribute('aria-busy', 'true');
      try {
        const res = await fetch(a.href, { credentials: 'omit' });
        if (!res.ok) throw new Error(res.status);
        const url = URL.createObjectURL(await res.blob());
        const tmp = document.createElement('a');
        tmp.href = url; tmp.download = a.getAttribute('download') || '';
        document.body.appendChild(tmp); tmp.click(); tmp.remove();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      } catch (err) {
        window.open(a.href, '_blank', 'noopener');
      } finally {
        delete a.dataset.busy; a.removeAttribute('aria-busy');
      }
    });
    $('#z-in').addEventListener('click', () => stepZoom(1));
    $('#z-out').addEventListener('click', () => stepZoom(-1));
    $('#z-fit').addEventListener('click', () => applyZoom(0));
    $('#dlg-prev').addEventListener('click', () => { const i = shown.findIndex((x) => x.id === cur.id); if (i > 0) { opener = cards.get(shown[i - 1].id)?.querySelector('.apt-open') || opener; fill(shown[i - 1]); } });
    $('#dlg-next').addEventListener('click', () => { const i = shown.findIndex((x) => x.id === cur.id); if (i >= 0 && i < shown.length - 1) { opener = cards.get(shown[i + 1].id)?.querySelector('.apt-open') || opener; fill(shown[i + 1]); } });
    viewer.addEventListener('dblclick', (e) => {
      const r = viewer.getBoundingClientRect();
      const cx = (e.clientX - r.left) / r.width, cy = (e.clientY - r.top) / r.height;
      applyZoom(zoom === 0 ? 1.5 : 0, cx, cy);
    });
    viewer.addEventListener('wheel', (e) => {
      if (!(e.ctrlKey || e.metaKey)) return; // plain wheel scrolls/pans natively
      e.preventDefault();
      const r = viewer.getBoundingClientRect();
      stepZoom(e.deltaY < 0 ? 1 : -1, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    }, { passive: false });
    // mouse drag-to-pan (touch keeps native scrolling)
    let drag = null;
    viewer.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY, l: viewer.scrollLeft, t: viewer.scrollTop, moved: false };
      viewer.setPointerCapture(e.pointerId); viewer.classList.add('is-drag');
    });
    viewer.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      viewer.scrollLeft = drag.l - dx; viewer.scrollTop = drag.t - dy;
    });
    const endDrag = () => { drag = null; viewer.classList.remove('is-drag'); };
    viewer.addEventListener('pointerup', endDrag); viewer.addEventListener('pointercancel', endDrag);
    dlg.addEventListener('keydown', (e) => {
      if (e.target.matches('input, select, textarea')) return;
      if (e.key === '+' || e.key === '=') { e.preventDefault(); stepZoom(1); }
      else if (e.key === '-' || e.key === '_') { e.preventDefault(); stepZoom(-1); }
      else if (e.key === '0') { e.preventDefault(); applyZoom(0); }
    });
    window.addEventListener('resize', () => { if (dlg.open && zoom === 0) applyZoom(0); });
    // CTA → form with visible context
    $('#dlg-cta').addEventListener('click', () => {
      const a = cur; opener = null; closePlan(); setFormCtx(a);
      const target = $('#zayavka');
      const y = target.getBoundingClientRect().top + window.scrollY;
      if (window.__lenis && !RM) window.__lenis.scrollTo(y, { duration: 1.2 }); else window.scrollTo(0, y);
      setTimeout(() => $('#f-name').focus({ preventScroll: true }), window.__lenis && !RM ? 1300 : 50);
    });
  }

  /* ---------- form context (selected apartment) ---------- */
  const ctxBox = $('#form-ctx');
  let ctxApt = null;
  function setFormCtx(a) {
    ctxApt = a || null;
    if (!ctxBox) return;
    ctxBox.hidden = !a;
    $('#f-stan').value = a ? a.id : '';
    $('#f-lamela').value = a ? a.lamela : '';
    $('#f-sprat').value = a ? a.sprat : '';
    if (a) { $('#ctx-id').textContent = a.id; $('#ctx-rest').textContent = T.ctxRest(a); }
    $('#form-title').textContent = a ? T.formTitleCtx : T.formTitle;
  }
  if (ctxBox) $('#ctx-clear').addEventListener('click', () => { setFormCtx(null); $('#f-name').focus(); });

  /* ---------- header + dots (works without GSAP) ---------- */
  const header = $('.site-header');
  const dotLinks = $$('.dots a');
  const navLinks = $$('.main-nav a');
  const chapters = $$('[data-chapter]');
  const lightSections = $$('.light');
  const updateChrome = () => {
    header.classList.toggle('is-solid', window.scrollY > 40);
    const mid = window.innerHeight * 0.5;
    let current = chapters[0].id;
    chapters.forEach((c) => { const r = c.getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) current = c.id; });
    dotLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${current}`));
    navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${current}`));
    const hh = header.offsetHeight * 0.5;
    const onLight = lightSections.some((s) => { const r = s.getBoundingClientRect(); return r.top <= hh && r.bottom > hh; });
    document.body.classList.toggle('on-light', onLight);
  };

  /* ---------- static fallback ---------- */
  if (RM || !hasGSAP) {
    window.addEventListener('scroll', updateChrome, { passive: true });
    updateChrome();
    $$('[data-count]').forEach((el) => { el.textContent = fmt(parseFloat(el.dataset.count), parseInt(el.dataset.dec || '0', 10)); });
    $('.stats').classList.add('is-list');
    const ring = $('.scroll-cue .ring'); if (ring) ring.style.strokeDashoffset = '0';
    $('.hero-glow').style.opacity = '0.4';
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Lenis smooth scroll ---------- */
  let lenis = null;
  if (typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    window.__lenis = lenis;
    lenis.on('scroll', () => { ScrollTrigger.update(); updateChrome(); });
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    window.addEventListener('scroll', updateChrome, { passive: true });
  }
  updateChrome();

  // anchor links → Lenis
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href') || '';
    if (!/^#[\w-]+$/.test(id)) return; // href may be rewritten later (e.g. the download link)
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    const st = ScrollTrigger.getAll().find((s) => s.pin && s.trigger === target);
    const y = st ? st.start : target.getBoundingClientRect().top + window.scrollY;
    if (lenis) lenis.scrollTo(y, { duration: 1.4 }); else window.scrollTo({ top: y, behavior: 'smooth' });
    if (id === '#zayavka') setTimeout(() => $('#f-name').focus({ preventScroll: true }), 1500);
  }));

  const mm = gsap.matchMedia();

  /* ---------- 0 · HERO — macro pull-back from the glass bay windows ---------- */
  mm.add({ desktop: '(min-width: 861px)', mobile: '(max-width: 860px)' }, (ctx) => {
    const { desktop } = ctx.conditions;
    const startScale = desktop ? 2.6 : 2.0;
    gsap.set('.hero-copy', { xPercent: -50, yPercent: -50 });
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: '.hero', start: 'top top', end: desktop ? '+=180%' : '+=110%', pin: true, scrub: 0.8, anticipatePin: 1 },
    });
    tl.fromTo('.hero-img', { scale: startScale }, { scale: 1, duration: 1 }, 0)
      .fromTo('.hero-shade', { opacity: 1 }, { opacity: 0.82, duration: 1 }, 0)
      .fromTo('.hero-glow', { opacity: 0 }, { opacity: 0.85, duration: 0.7 }, 0.3)
      .fromTo('.hero-sub', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.25 }, 0.12)
      .fromTo('.hero-copy .eyebrow', { opacity: 0.0 }, { opacity: 1, duration: 0.2 }, 0.05)
      .fromTo('.hero-facts', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.3 }, 0.62)
      .fromTo('.vside', { opacity: 0 }, { opacity: 1, duration: 0.2 }, 0.7)
      .fromTo('.scroll-cue .ring', { strokeDashoffset: 188.5 }, { strokeDashoffset: 0, duration: 1 }, 0);
    return () => tl.kill();
  });

  // cursor parallax — additive on wrapper, never on the scrubbed image
  if (window.matchMedia('(pointer: fine)').matches) {
    const par = $('.hero-par');
    const copy = $('.hero-copy');
    const tx = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
    window.addEventListener('pointermove', (e) => {
      tx.x = (e.clientX / window.innerWidth - 0.5) * 2;
      tx.y = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
    const setPar = gsap.quickSetter(par, 'css');
    gsap.ticker.add(() => {
      cur.x += (tx.x - cur.x) * 0.06; cur.y += (tx.y - cur.y) * 0.06;
      setPar({ x: -cur.x * 10, y: -cur.y * 8 });
      gsap.set(copy, { x: cur.x * 6, y: cur.y * 4 });
    });
  }

  /* ---------- 1 · PLACE — schematic roads draw in ---------- */
  $$('.ctx-svg .draw').forEach((p) => {
    const solid = !p.classList.contains('road-st') && !p.classList.contains('road-int');
    if (solid) {
      const len = p.getTotalLength();
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
      gsap.to(p, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '.place-map', start: 'top 85%', end: 'center 45%', scrub: 0.6 } });
    } else {
      gsap.fromTo(p, { opacity: 0 }, { opacity: 1, ease: 'none', scrollTrigger: { trigger: '.place-map', start: 'top 70%', end: 'center 50%', scrub: 0.6 } });
    }
  });
  gsap.fromTo('.ctx-svg .draw-fade', { opacity: 0 }, { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: '.place-map', start: 'top 80%', end: 'center 55%', scrub: 0.6 } });
  gsap.fromTo('.ctx-svg .lbl', { opacity: 0 }, { opacity: 1, stagger: 0.08, ease: 'none', scrollTrigger: { trigger: '.place-map', start: 'top 55%', end: 'center 40%', scrub: 0.6 } });

  /* C1 word sweep on two headlines */
  $$('.reveal-words').forEach((h) => {
    const words = h.textContent.trim().split(/[ \t\n\r]+/); // keep no-break spaces inside a word span
    h.innerHTML = words.map((w) => `<span class="w">${w}</span>`).join(' ');
    gsap.fromTo(h.querySelectorAll('.w'), { opacity: 0.22 }, { opacity: 1, stagger: 0.12, ease: 'none', scrollTrigger: { trigger: h, start: 'top 85%', end: 'top 45%', scrub: true } });
  });

  /* ---------- 2 · BLOCK — sections light up around the courtyard ---------- */
  ScrollTrigger.create({ trigger: '.counters', start: 'top 85%', once: true, onEnter: () => $$('.counters [data-count]').forEach((el) => countUp(el, 1.2)) });
  $$('.counters [data-count]').forEach((el) => { el.textContent = '0'; });
  mm.add('(min-width: 861px)', () => {
    const st = ScrollTrigger.create({
      trigger: '.ch-block', start: 'top top', end: '+=120%', pin: '.block-pin', pinSpacing: true, scrub: true,
      onUpdate: (self) => softSection(Math.min(8, Math.max(1, Math.ceil(self.progress * 8.4)))),
      onLeave: () => { secLocked = false; }, onLeaveBack: () => { secLocked = false; },
    });
    return () => st.kill();
  });
  mm.add('(max-width: 860px)', () => {
    let timer = null;
    const st = ScrollTrigger.create({
      trigger: '.scheme', start: 'top 70%', end: 'bottom 20%',
      onEnter: () => { let n = 1; clearInterval(timer); timer = setInterval(() => { softSection(n); n += 1; if (n > 8) clearInterval(timer); }, 700); },
    });
    secPolys.forEach((p) => p.addEventListener('click', () => clearInterval(timer)));
    return () => { clearInterval(timer); st.kill(); };
  });
  gsap.fromTo('.scheme .sec', { opacity: 0.25 }, { opacity: 1, stagger: 0.05, ease: 'none', scrollTrigger: { trigger: '.scheme', start: 'top 85%', end: 'top 40%', scrub: true } });

  /* ---------- 3 · ARCHITECTURE — height ruler scrub ---------- */
  const rulerVal = $('.ruler-val');
  const floors = $$('.ruler-floors li').reverse(); // bottom (−4) → top (ПС)
  const setRuler = (p) => {
    // underground part (−4…−1) occupies the first 4/15 of the track; metres count from П
    const above = Math.max(0, (p - 4 / 15) / (11 / 15));
    rulerVal.textContent = fmt(above * 36.5, 1);
    const lit = Math.round(p * floors.length);
    floors.forEach((li, i) => li.classList.toggle('lit', i < lit));
  };
  mm.add('(min-width: 641px)', () => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: '.ch-arch', start: 'top top', end: '+=100%', pin: '.arch-pin', scrub: 0.6, onUpdate: (s) => setRuler(s.progress) } });
    tl.fromTo('.ruler-fill', { scaleY: 0 }, { scaleY: 1, ease: 'none', duration: 1 }, 0)
      .fromTo('.mask-arch picture img', { scale: 1.25, yPercent: 6 }, { scale: 1.05, yPercent: -2, ease: 'none', duration: 1 }, 0)
      .fromTo('.mask-round picture img', { scale: 1.3, yPercent: -4 }, { scale: 1.05, yPercent: 3, ease: 'none', duration: 1 }, 0)
      .fromTo('.mask-round', { y: 60 }, { y: -20, ease: 'none', duration: 1 }, 0);
    setRuler(0);
    return () => tl.kill();
  });
  mm.add('(max-width: 640px)', () => {
    const o = { p: 0 };
    const tw = gsap.to(o, { p: 1, ease: 'none', scrollTrigger: { trigger: '.ch-arch', start: 'top 70%', end: 'center 40%', scrub: 0.6 }, onUpdate: () => setRuler(o.p) });
    const img = gsap.fromTo('.mask picture img', { scale: 1.22 }, { scale: 1.02, ease: 'none', scrollTrigger: { trigger: '.arch-media', start: 'top 95%', end: 'bottom 30%', scrub: true } });
    setRuler(0);
    return () => { tw.kill(); img.kill(); };
  });

  /* ---------- 4 · GROUND FLOOR — slow push + counter ---------- */
  gsap.fromTo('.ground-pic img', { scale: 1.14, yPercent: 3 }, { scale: 1.02, yPercent: -2, ease: 'none', scrollTrigger: { trigger: '.ch-ground', start: 'top bottom', end: 'bottom top', scrub: true } });
  ScrollTrigger.create({ trigger: '.ground-copy', start: 'top 85%', once: true, onEnter: () => countUp($('.ground-copy [data-count]'), 1.4) });
  $('.ground-copy [data-count]').textContent = '0';

  /* ---------- 5 · COURTYARD — iris-style clip reveals ---------- */
  $$('.clip-reveal').forEach((el) => {
    gsap.fromTo(el, { clipPath: 'inset(10% 8% 10% 8% round 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round 28px)', ease: 'none', scrollTrigger: { trigger: el, start: 'top 95%', end: 'top 35%', scrub: true } });
    const img = el.querySelector('img');
    gsap.fromTo(img, { scale: 1.18 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* ---------- 6 · STATS — pinned relay ---------- */
  const stats = $$('.stat');
  const sbgs = $$('.sbg');
  const bars = $$('.stats-progress span');
  let curStat = -1;
  const showStat = (i) => {
    if (i === curStat) return;
    curStat = i;
    stats.forEach((s, k) => s.classList.toggle('is-on', k === i));
    sbgs.forEach((b, k) => b.classList.toggle('is-on', k === i));
    const num = stats[i].querySelector('[data-count]');
    countUp(num, 1.1);
  };
  mm.add('(min-width: 861px)', () => {
    $('.stats').classList.remove('is-list');
    const st = ScrollTrigger.create({
      trigger: '.ch-stats', start: 'top top', end: '+=260%', pin: '.stats-pin', scrub: true,
      onUpdate: (self) => {
        const p = self.progress * 4;
        showStat(Math.min(3, Math.floor(p)));
        bars.forEach((b, k) => b.style.setProperty('--p', Math.max(0, Math.min(1, p - k)).toFixed(3)));
      },
      onEnter: () => { if (curStat < 0) showStat(0); },
    });
    return () => { st.kill(); curStat = -1; };
  });
  mm.add('(max-width: 860px)', () => {
    $('.stats').classList.add('is-list');
    stats.forEach((s) => s.classList.add('is-on'));
    const sts = stats.map((s) => ScrollTrigger.create({ trigger: s, start: 'top 85%', once: true, onEnter: () => countUp(s.querySelector('[data-count]'), 1.2) }));
    const fades = stats.map((s) => gsap.fromTo(s, { opacity: 0.2, y: 30 }, { opacity: 1, y: 0, ease: 'none', scrollTrigger: { trigger: s, start: 'top 95%', end: 'top 65%', scrub: true } }));
    return () => { sts.forEach((x) => x.kill()); fades.forEach((x) => x.kill()); };
  });

  /* ---------- 7 · FINDER — calm entrance only (filters must stay instant) ---------- */
  gsap.fromTo('.cat-head > *', { opacity: 0, y: 28 }, { opacity: 1, y: 0, stagger: 0.12, ease: 'none', scrollTrigger: { trigger: '.cat-head', start: 'top 92%', end: 'top 60%', scrub: true } });

  window.addEventListener('load', () => ScrollTrigger.refresh());
  mqMobile.addEventListener('change', () => ScrollTrigger.refresh());
})();
