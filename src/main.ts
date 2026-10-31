type Ctor<T> = abstract new (...args: never[]) => T;

/* Optional lookups: a missing element switches its feature off instead of throwing. */
function find<T extends Element>(selector: string, type: Ctor<T>, scope: ParentNode = document): T | null {
  const el = scope.querySelector(selector);
  if (el instanceof type) return el;
  if (import.meta.env.DEV) console.warn(`[site] ${selector} not found, skipping that feature`);
  return null;
}

function findAll<T extends Element>(selector: string, type: Ctor<T>, scope: ParentNode = document): T[] {
  return [...scope.querySelectorAll(selector)].filter((el): el is T => el instanceof type);
}

const root = document.documentElement;
root.classList.add('js');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Entrances: each section's parts arrive in reading order, once. */
function setupReveals(): void {
  const groups = findAll('[data-rise], [data-rise-group]', HTMLElement);
  findAll('[data-rise-group]', HTMLElement).forEach((g) => {
    [...g.children].forEach((c, i) => {
      if (c instanceof HTMLElement) c.style.setProperty('--d', `${i * 70}ms`);
    });
  });
  findAll('section, header', HTMLElement).forEach((s) => {
    findAll('[data-rise]', HTMLElement, s).forEach((el, i) => el.style.setProperty('--d', `${i * 80}ms`));
  });
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    groups.forEach((g) => io.observe(g));
  } else {
    groups.forEach((g) => g.classList.add('in'));
  }
}

/* Nav: mark the section the reader is in. */
function setupNav(): void {
  const links = findAll('.nav a[href^="#"]', HTMLAnchorElement);
  const sections = links
    .map((a) => document.getElementById(a.hash.slice(1)))
    .filter((s): s is HTMLElement => s !== null);
  if (!sections.length || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.setAttribute('aria-current', a.hash === `#${e.target.id}` ? 'true' : 'false'));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => io.observe(s));
}

/* Trimly: replay a client message and the tool calls the agent makes to answer it. */
type Line =
  | readonly ['in', via: string, text: string]
  | readonly ['out', text: string]
  | readonly ['call', code: string]
  | readonly ['ret', code: string];
type Scenario = readonly Line[];

const scenarios: readonly Scenario[] = [
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

function renderLine(line: Line): HTMLLIElement {
  const li = document.createElement('li');
  switch (line[0]) {
    case 'in': {
      li.className = 'msg msg--in';
      const via = document.createElement('span');
      via.className = 'msg__via';
      via.textContent = line[1];
      li.append(via, line[2]);
      break;
    }
    case 'out':
      li.className = 'msg msg--out';
      li.textContent = line[1];
      break;
    case 'call':
    case 'ret': {
      li.className = line[0];
      const code = document.createElement('code');
      code.textContent = line[1];
      li.append(code);
      if (line[0] === 'call') {
        const ok = document.createElement('span');
        ok.className = 'call__ok';
        ok.textContent = 'input valid';
        li.append(ok);
      }
      break;
    }
  }
  return li;
}

function setupReplay(): void {
  const log = find('.agent__log', HTMLOListElement);
  if (!log) return;
  const chips = findAll('.chip', HTMLButtonElement);
  let run = 0;

  const play = (n: number): void => {
    const scenario = scenarios[n];
    if (!scenario) return;
    const id = ++run;
    chips.forEach((c, k) => c.setAttribute('aria-pressed', k === n ? 'true' : 'false'));
    const items = scenario.map(renderLine);
    log.replaceChildren(...items);
    if (reduce) return;
    items.forEach((li) => li.classList.add('wait'));
    items.forEach((li, k) => setTimeout(() => { if (id === run) li.classList.remove('wait'); }, 120 + k * 520));
  };

  chips.forEach((c) => c.addEventListener('click', () => play(Number(c.dataset.scenario))));
}

/* Trimly's ad: waits for a press, so the page never pulls the video unasked, and pauses off screen. */
function setupVideo(): void {
  const host = find('[data-video="trimly"]', HTMLElement);
  if (!host) return;
  const video = find('.video__media', HTMLVideoElement, host);
  const toggle = find('.video__toggle', HTMLButtonElement, host);
  const label = toggle && find('span', HTMLSpanElement, toggle);
  if (!video || !toggle || !label) return;

  const sync = (): void => {
    const playing = !video.paused;
    label.textContent = playing ? 'Pause ad' : 'Play ad';
    toggle.setAttribute('aria-pressed', playing ? 'true' : 'false');
  };
  video.addEventListener('play', sync);
  video.addEventListener('pause', sync);
  toggle.addEventListener('click', () => {
    if (video.paused) video.play().catch(() => {}); else video.pause();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((e) => { if (!e.some((x) => x.isIntersecting)) video.pause(); }, { threshold: 0.1 }).observe(video);
  }
  sync();
}

/* Email: the address is put together here so it never sits in the page source as one string.
   Without JS the links keep their LinkedIn fallback. */
/* Read from data attributes at runtime so the minifier cannot fold the parts back into one string. */
const mailParts = find('[data-mail-user][data-mail-host]', HTMLElement)?.dataset;
const address = mailParts?.mailUser && mailParts.mailHost ? `${mailParts.mailUser}@${mailParts.mailHost}` : '';
const SUBJECT = 'Internship conversation';
/* Mail clients and browsers cope with ~2000 characters of URL; stay well under that. */
const MAX_MAILTO = 1800;

function mailto(body?: string): string {
  let url = `mailto:${address}?subject=${encodeURIComponent(SUBJECT)}`;
  if (body) url += `&body=${encodeURIComponent(body)}`;
  return url;
}

function setupEmailLinks(): void {
  if (!address) return;
  findAll('a[data-email]', HTMLAnchorElement).forEach((a) => {
    a.href = mailto();
    a.textContent = a.dataset.email || address;
  });
}

/* Contact: open an email with the visitor's own words. */
function setupContact(): void {
  const form = find('.contact__form', HTMLFormElement);
  if (!form || !address) return;
  const input = find('#msg', HTMLInputElement, form);
  const error = find('#msg-error', HTMLElement, form);
  if (!input) return;
  form.hidden = false;

  const setError = (on: boolean): void => {
    input.setAttribute('aria-invalid', on ? 'true' : 'false');
    if (error) error.hidden = !on;
  };
  input.addEventListener('input', () => { if (input.value.trim()) setError(false); });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let body = input.value.trim();
    if (!body) { setError(true); input.focus(); return; }
    setError(false);
    /* Encoded length is what counts, so trim the words until the whole URL fits. */
    while (body.length > 0 && mailto(body).length > MAX_MAILTO) body = body.slice(0, -20).trimEnd();
    location.href = mailto(body);
  });
}

setupReveals();
setupNav();
setupEmailLinks();
setupReplay();
setupVideo();
setupContact();
