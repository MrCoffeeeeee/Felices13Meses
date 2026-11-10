(() => {
  const C = window.CONFIG;
  const $ = id => document.getElementById(id);
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  // ---- Textos
  $('legend').textContent = C.leyenda;
  $('openPoem').textContent = C.botonPoema;
  $('poemaTitulo').textContent = C.poemaTitulo;
  $('poema').innerHTML = C.poema.split(/\r?\n/).map((l, i) =>
    l.trim() ? `<span class="ln" style="transition-delay:${(1.2 + i * .3).toFixed(2)}s">${l}</span>` : '<span class="gap"></span>').join('');
  $('sign').textContent = C.de ? '— ' + C.de : '';
  $('razonesTitulo').textContent = C.razonesTitulo;
  $('capitulos').innerHTML = C.capitulos.map((c, i) => `
    <article class="chapter ${i % 2 ? 'alt' : ''}">
      <figure class="polaroid">
        ${/\.(mp4|webm)$/i.test(c.foto)
          ? `<video src="${c.foto}" ${c.poster ? `poster="${c.poster}"` : ''} autoplay muted loop playsinline webkit-playsinline preload="auto" aria-label="${c.titulo}"></video>`
          : `<img src="${c.foto}" alt="${c.titulo}" loading="lazy" onerror="this.parentNode.classList.add('empty');this.remove()">`}
        <figcaption>${c.fecha}</figcaption>
      </figure>
      <div class="ctext"><h4>${c.titulo}</h4><p>${c.texto}</p></div>
    </article>`).join('');
  $('razones').innerHTML = C.razones.map(r =>
    `<div class="card"><div class="card-in"><div class="face front">♥</div><div class="face back">${r}</div></div></div>`).join('');
  document.querySelectorAll('.card').forEach(c => c.addEventListener('click', () => { c.classList.toggle('flip'); burst(c.getBoundingClientRect().x + 40, c.getBoundingClientRect().y + 40, 10); }));

  // ---- Canvas
  const bg = $('bg'), fx = $('fx'), bctx = bg.getContext('2d'), fctx = fx.getContext('2d');
  let W, H;
  function resize() {
    W = innerWidth; H = innerHeight;
    [bg, fx].forEach(c => { c.width = W * DPR; c.height = H * DPR; });
    bctx.setTransform(DPR, 0, 0, DPR, 0, 0); fctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  addEventListener('resize', resize); resize();

  // Corazones flotantes de fondo
  const hearts = Array.from({ length: 28 }, () => ({
    x: Math.random() * innerWidth, y: Math.random() * innerHeight,
    s: 8 + Math.random() * 16, v: .2 + Math.random() * .6, a: .1 + Math.random() * .3, p: Math.random() * 6
  }));
  function heart(ctx, x, y, s) {
    ctx.beginPath(); ctx.moveTo(x, y + s / 4);
    ctx.bezierCurveTo(x, y - s / 2, x - s, y - s / 2, x - s, y + s / 4);
    ctx.bezierCurveTo(x - s, y + s, x, y + s * 1.2, x, y + s * 1.5);
    ctx.bezierCurveTo(x, y + s * 1.2, x + s, y + s, x + s, y + s / 4);
    ctx.bezierCurveTo(x + s, y - s / 2, x, y - s / 2, x, y + s / 4); ctx.fill();
  }

  // Partículas (explosiones y estela táctil)
  const parts = [];
  function burst(x, y, n = 30, big = false) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = (big ? 3 : 1.5) + Math.random() * (big ? 6 : 3);
      parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1, life: 1, s: 4 + Math.random() * 7, h: Math.random() < .6 ? 340 + Math.random() * 30 : 40 + Math.random() * 20, heart: Math.random() < .7 });
    }
  }
  addEventListener('pointerdown', e => burst(e.clientX, e.clientY, 8));
  addEventListener('pointermove', e => { if (e.pressure > 0 || e.pointerType === 'mouse') parts.push({ x: e.clientX, y: e.clientY, vx: (Math.random() - .5), vy: -Math.random(), life: .8, s: 5, h: 340, heart: true }); });

  let t = 0;
  (function loop() {
    t += .01;
    bctx.clearRect(0, 0, W, H);
    hearts.forEach(h => {
      h.y -= h.v; h.x += Math.sin(t + h.p) * .3;
      if (h.y < -30) { h.y = H + 30; h.x = Math.random() * W; }
      bctx.fillStyle = `rgba(255,107,157,${h.a})`; heart(bctx, h.x, h.y, h.s / 2);
    });
    fctx.clearRect(0, 0, W, H);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.x += p.vx; p.y += p.vy; p.vy += .06; p.life -= .014;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      fctx.fillStyle = `hsla(${p.h},90%,65%,${p.life})`;
      p.heart ? heart(fctx, p.x, p.y, p.s / 2) : (fctx.fillRect(p.x, p.y, p.s / 2, p.s / 2));
    }
    requestAnimationFrame(loop);
  })();

  // ---- Abrir sobre
  const env = $('envelope');
  function open() {
    if (env.classList.contains('open')) return;
    env.classList.add('open');
    burst(innerWidth / 2, innerHeight / 2, 50, true);
    startMusic();
    setTimeout(() => {
      $('intro').classList.add('hidden');
      $('letter').classList.remove('hidden');
      scrollTo(0, 0); observe(); startDoom();
    }, 1100);
  }
  env.addEventListener('click', open);
  env.addEventListener('keydown', e => (e.key === 'Enter' || e.key === ' ') && open());

  // ---- Reloj del fin del mundo: meses -> días -> minutos (y luego en vivo)
  const start = new Date(C.inicio).getTime();
  const fmt = n => Math.floor(n).toLocaleString('es-MX');
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const easeOut = x => 1 - Math.pow(1 - x, 3);
  let doomStarted = false, liveTimer;

  function countTo(from, to, ms) {
    return new Promise(res => {
      const t0 = Date.now();
      const iv = setInterval(() => {
        const p = Math.min((Date.now() - t0) / ms, 1);
        $('digits').textContent = fmt(from + (to - from) * easeOut(p));
        if (p >= 1) { clearInterval(iv); res(); }
      }, 30);
    });
  }
  async function glitch(unit) {
    const clock = $('clock');
    clock.classList.add('glitch');
    navigator.vibrate && navigator.vibrate(60);
    await sleep(450);
    $('unit').textContent = unit;
    clock.classList.remove('glitch');
  }
  async function startDoom() {
    if (doomStarted) return; doomStarted = true;
    const days = () => (Date.now() - start) / 86400000;
    const mins = () => (Date.now() - start) / 60000;
    await sleep(900);
    await countTo(0, C.meses, 2200);           // 13 meses
    await sleep(2200);
    await glitch('días');
    await countTo(C.meses, days(), 2600);      // días
    await sleep(2200);
    await glitch('minutos');
    await countTo(days(), mins(), 3200);       // minutos
    // En vivo: los minutos suben y los segundos corren
    const live = () => {
      const s = (Date.now() - start) / 1000;
      $('digits').textContent = fmt(s / 60);
      $('secs').textContent = 'y ' + String(Math.floor(s % 60)).padStart(2, '0') + ' segundos';
    };
    live(); liveTimer = setInterval(live, 250);
    $('clock').classList.add('live');
    await sleep(1500);
    $('scrollHint').classList.add('on');
  }


  // ---- Aparecer al hacer scroll
  function observe() {
    const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && (e.target.classList.add('show'), io.unobserve(e.target))), { threshold: .4 });
    document.querySelectorAll('.chapter').forEach(p => io.observe(p));
  }

  // ---- Pergamino con el poema
  const openBtn = $('openPoem'), parch = $('parchment');
  openBtn.addEventListener('click', () => {
    openBtn.classList.add('gone');
    parch.classList.add('open');
    parch.setAttribute('aria-hidden', 'false');
    navigator.vibrate && navigator.vibrate(40);
    setTimeout(() => parch.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    let n = 0;
    const iv = setInterval(() => { burst(Math.random() * W, H * .2 + Math.random() * H * .5, 22, true); if (++n > 5) clearInterval(iv); }, 400);
  });

  // ---- Música opcional
  let audio;
  if (C.musica) {
    audio = new Audio(C.musica); audio.loop = true;
    const b = $('music'); b.hidden = false;
    b.addEventListener('click', () => { if (audio.paused) { audio.play(); b.classList.remove('off'); } else { audio.pause(); b.classList.add('off'); } });
  }
  function startMusic() { audio && audio.play().catch(() => $('music').classList.add('off')); }
})();
