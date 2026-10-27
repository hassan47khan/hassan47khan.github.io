(() => {
  const root = document.documentElement;
  root.classList.add('js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Entrances: each section's parts arrive in reading order, once. */
  const groups = document.querySelectorAll('[data-rise], [data-rise-group]');
  document.querySelectorAll('[data-rise-group]').forEach((g) => {
    [...g.children].forEach((c, i) => c.style.setProperty('--d', `${i * 70}ms`));
  });
  document.querySelectorAll('section, header').forEach((s) => {
    s.querySelectorAll('[data-rise]').forEach((el, i) => el.style.setProperty('--d', `${i * 80}ms`));
  });
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px' });
    groups.forEach((g) => io.observe(g));
  } else {
    groups.forEach((g) => g.classList.add('in'));
  }

  /* Work: a pinned stage on large screens, one screen of scroll per project. */
  const work = document.querySelector('.work');
  const projects = [...document.querySelectorAll('.project')];
  const links = [...document.querySelectorAll('.work__index a')];
  const big = matchMedia('(min-width: 960px) and (min-height: 680px)');
  let current = -1;

  const show = (i) => {
    if (i === current) return;
    projects.forEach((p, k) => {
      p.classList.toggle('was-on', k === current && k !== i);
      p.classList.toggle('is-on', k === i);
      p.toggleAttribute('inert', root.classList.contains('pinned') && k !== i);
    });
    links.forEach((a, k) => a.setAttribute('aria-current', k === i ? 'true' : 'false'));
    current = i;
  };

  const pin = document.querySelector('.work__pin');
  const step = () => innerHeight * 0.75;

  /* Pinned only when the whole left column fits the screen; otherwise stack. */
  const setMode = () => {
    root.classList.toggle('pinned', big.matches);
    if (big.matches && pin.scrollHeight > pin.clientHeight + 1) root.classList.remove('pinned');
    current = -1;
    if (root.classList.contains('pinned')) { show(0); onScroll(); }
    else projects.forEach((p) => { p.classList.remove('is-on', 'was-on'); p.removeAttribute('inert'); });
  };

  links.forEach((a) => a.addEventListener('click', (e) => {
    if (!root.classList.contains('pinned')) return;
    e.preventDefault();
    const i = Number(a.dataset.go);
    const top = work.getBoundingClientRect().top + scrollY + i * step() + 2;
    scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
  }));

  /* The wordmarks give a little under the scroll. */
  const outMark = document.querySelector('[data-scale="out"]');
  const inMark = document.querySelector('[data-scale="in"]');
  const foot = document.querySelector('.foot');

  function onScroll() {
    const vh = innerHeight;
    if (root.classList.contains('pinned')) {
      const r = work.getBoundingClientRect();
      const i = Math.min(projects.length - 1, Math.max(0, Math.floor((-r.top + step() * 0.4) / step())));
      show(i);
    }
    if (reduce) return;
    const p = Math.min(1, Math.max(0, scrollY / vh));
    if (outMark) outMark.style.transform = `scale(${1 - 0.07 * p})`;
    if (inMark && foot) {
      const f = foot.getBoundingClientRect();
      const q = Math.min(1, Math.max(0, 1 - f.top / vh));
      inMark.style.transform = `scale(${0.93 + 0.07 * q})`;
    }
  }

  let ticking = false;
  addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(() => { onScroll(); ticking = false; }); ticking = true; }
  }, { passive: true });
  big.addEventListener('change', setMode);
  addEventListener('resize', () => { clearTimeout(setMode.t); setMode.t = setTimeout(setMode, 150); });
  setMode();
  if (document.fonts) document.fonts.ready.then(setMode);
  onScroll();

  /* Trimly: replay a client message and the tool calls the agent makes to answer it. */
  const scenarios = [
    [
      ['in', 'SMS', 'can i get a skin fade sat around 2?'],
      ['call', 'check_availability({ service: "skin_fade", day: "Sat Oct 31", after: "13:30" })'],
      ['ret', '→ ["2:00 PM · Marcus", "2:45 PM · Dee"]'],
      ['call', 'hold_slot({ time: "2:00 PM", barber: "Marcus" })'],
      ['ret', '→ held for 10 minutes'],
      ['out', "Marcus has 2:00 on Saturday for a skin fade, $35 and about 45 minutes. Reply YES and it's yours."],
    ],
    [
      ['in', 'WhatsApp', 'need to push my thursday 5pm to next week'],
      ['call', 'find_booking({ client: "+1 516 ••• 8830" })'],
      ['ret', '→ Thu Oct 29, 5:00 PM · cut and beard · Dee'],
      ['call', 'check_availability({ service: "cut_beard", week: "Nov 2–7", after: "16:00", barber: "Dee" })'],
      ['ret', '→ ["Tue Nov 3 5:00 PM", "Wed Nov 4 5:30 PM"]'],
      ['out', 'No problem. Dee can do Tuesday Nov 3 at 5:00 or Wednesday Nov 4 at 5:30. Which one should I move you to?'],
    ],
    [
      ['in', 'Email', 'how much for a beard trim and do you take walk-ins'],
      ['call', 'get_service({ query: "beard trim" })'],
      ['ret', '→ { name: "Beard trim", price: 20, minutes: 20 }'],
      ['call', 'get_policy({ topic: "walk_ins" })'],
      ['ret', '→ "Walk-ins welcome before 3 PM on weekdays"'],
      ['out', 'A beard trim is $20 and takes about 20 minutes. Walk-ins are welcome before 3 PM on weekdays, or I can book you a time now.'],
    ],
  ];

  const log = document.querySelector('.agent__log');
  const chips = [...document.querySelectorAll('.chip')];
  let run = 0;

  const line = ([kind, a, b]) => {
    const li = document.createElement('li');
    if (kind === 'in' || kind === 'out') {
      li.className = `msg msg--${kind}`;
      if (kind === 'in') { const v = document.createElement('span'); v.className = 'msg__via'; v.textContent = a; li.append(v, b); }
      else li.textContent = a;
    } else {
      li.className = kind;
      const c = document.createElement('code'); c.textContent = a; li.append(c);
      if (kind === 'call') { const ok = document.createElement('span'); ok.className = 'call__ok'; ok.textContent = 'input valid'; li.append(ok); }
    }
    return li;
  };

  const play = (n) => {
    const id = ++run;
    chips.forEach((c, k) => c.setAttribute('aria-pressed', k === n ? 'true' : 'false'));
    const items = scenarios[n].map(line);
    log.replaceChildren(...items);
    if (reduce) return;
    items.forEach((li) => li.classList.add('wait'));
    items.forEach((li, k) => setTimeout(() => { if (id === run) li.classList.remove('wait'); }, 120 + k * 520));
  };

  chips.forEach((c, k) => c.addEventListener('click', () => play(k)));

  /* Contact: open an email with the visitor's own words. */
  const form = document.querySelector('.contact__form');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const body = form.querySelector('#msg').value.trim();
    location.href = `mailto:hassan.c.khan@outlook.com?subject=${encodeURIComponent('Internship conversation')}&body=${encodeURIComponent(body)}`;
  });
})();
