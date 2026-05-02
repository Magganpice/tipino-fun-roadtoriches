import './style.css';

// ── Config ──────────────────────────────────────────────────────
const PAYOUT = 0.003; // $ per stream (Spotify avg.)
const MEAL   = 15;    // USD

// ── Artist name suggestions ───────────────────────────────────────
const ARTIST_NAMES = [
  'Neon Sadness', 'Velvet Glitch', 'Static Bloom', 'Hollow Frequency',
  'Rust & Lace', 'Midnight Codec', 'Fern Signal', 'Glass Trauma',
  'Paper Moon Theory', 'Soft Collapse', 'Echo Bruise', 'Silver Dropout',
  'Tender Noise', 'The Pale Circuit', 'Dusk Protocol', 'Coral Static',
  'Low Signal', 'Cassette Wound', 'Phantom Gradient', 'Moth Frequency',
  'Willow Glitch', 'Buried Hum', 'Numb Pixel', 'Lemon Void',
  'Tide Protocol', 'Drift & Static', 'Grey Bloom', 'Salt Circuit',
  'Velvet Error', 'Brine & Thread',
];

const randomName = () => ARTIST_NAMES[Math.floor(Math.random() * ARTIST_NAMES.length)];

// ── Choice data ───────────────────────────────────────────────────
// All cost/hype values have { single, album } variants.
// maxHype is per-category (shared across choices in that category).

const RECORDING = [
  { id: 'ai',     emoji: '🤖', label: 'AI Tools',          desc: 'Suno, Udio & co.',              cost: { single: 50,   album: 80   }, hype: { single: 1, album: 1 }, maxHype: 5 },
  { id: 'self',   emoji: '🎙️', label: 'Home Studio',        desc: 'Self-recorded, self-mixed',      cost: { single: 400,  album: 800  }, hype: { single: 3, album: 3 }, maxHype: 5 },
  { id: 'studio', emoji: '🎛️', label: 'Studio + Producer',  desc: 'Pro studio, mixing & mastering', cost: { single: 3000, album: 8000 }, hype: { single: 5, album: 5 }, maxHype: 5 },
];

// Album artwork needs more assets (booklet, variants) → higher cost & hype ceiling
const ARTWORK = [
  { id: 'ai',  emoji: '🤖', label: 'AI-Generated',  desc: 'Midjourney, DALL·E',       cost: { single: 0,   album: 0   }, hype: { single: 1, album: 1 }, maxHype: { single: 3, album: 4 } },
  { id: 'diy', emoji: '🖌️', label: 'DIY',           desc: 'Canva, Figma, Photoshop',  cost: { single: 50,  album: 100 }, hype: { single: 2, album: 2 }, maxHype: { single: 3, album: 4 } },
  { id: 'pro', emoji: '🎨', label: 'Pro Designer',   desc: 'Freelance graphic artist', cost: { single: 500, album: 1500 }, hype: { single: 3, album: 4 }, maxHype: { single: 3, album: 4 } },
];

// Albums = multiple singles drop as videos before release → much higher cost & hype ceiling
const VIDEO = [
  { id: 'none', emoji: '📻', label: 'Audio Only',      desc: 'No video content',            cost: { single: 0,    album: 0    }, hype: { single: 0, album: 0 }, maxHype: { single: 3, album: 5 } },
  { id: 'self', emoji: '📱', label: 'Self-Shot',        desc: 'iPhone clips + social reels', cost: { single: 200,  album: 600  }, hype: { single: 2, album: 3 }, maxHype: { single: 3, album: 5 } },
  { id: 'pro',  emoji: '🎬', label: 'Pro Music Video',  desc: 'Videographer + social cuts',  cost: { single: 2500, album: 6000 }, hype: { single: 3, album: 5 }, maxHype: { single: 3, album: 5 } },
];

// Albums need a longer campaign with multiple single-release moments → higher cost & hype ceiling
const PROMO = [
  { id: 'none', emoji: '🙏', label: 'Just Hope',     desc: 'Word of mouth only',           cost: { single: 0,    album: 0    }, hype: { single: 0, album: 0 }, maxHype: { single: 3, album: 5 } },
  { id: 'ads',  emoji: '📣', label: 'Social Ads',    desc: 'Paid ads, ~1 month budget',    cost: { single: 400,  album: 1500 }, hype: { single: 2, album: 3 }, maxHype: { single: 3, album: 5 } },
  { id: 'full', emoji: '🚀', label: 'Full Campaign',  desc: 'PR + playlist pitching + ads', cost: { single: 2000, album: 5000 }, hype: { single: 3, album: 5 }, maxHype: { single: 3, album: 5 } },
];

// ── Helpers ───────────────────────────────────────────────────────
const rel       = () => s.release || 'single';
const getCost   = c  => (typeof c.cost    === 'object' ? c.cost[rel()]    : (c.cost    ?? 0));
const getHype   = c  => (typeof c.hype    === 'object' ? c.hype[rel()]    : (c.hype    ?? 0));
const getMaxH   = c  => (typeof c.maxHype === 'object' ? c.maxHype[rel()] : (c.maxHype ?? 0));

function maxHypeTotal() {
  // Recording maxHype is a plain number (same for both release types)
  return RECORDING[0].maxHype + getMaxH(ARTWORK[0]) + getMaxH(VIDEO[0]) + getMaxH(PROMO[0]);
}

// ── State ────────────────────────────────────────────────────────
let s = {
  screen:      0,
  name:        '',
  placeholder: randomName(),
  release:     null,
  recording:   null,
  artwork:     null,
  video:       null,
  promo:       null,
};

let transitioning = false;
let clickHandler  = null;

// ── Utilities ────────────────────────────────────────────────────
const $      = id => document.getElementById(id);
const fmt$   = n  => n === 0 ? 'FREE' : '$' + n.toLocaleString();
const fmtBig = n  => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(0) + 'K' : n.toString();

function calcResults() {
  const rec = RECORDING.find(c => c.id === s.recording);
  const art = ARTWORK.find(c => c.id === s.artwork);
  const vid = VIDEO.find(c => c.id === s.video);
  const pro = PROMO.find(c => c.id === s.promo);
  const costs = {
    recording: rec ? getCost(rec) : 0,
    artwork:   art ? getCost(art) : 0,
    video:     vid ? getCost(vid) : 0,
    promo:     pro ? getCost(pro) : 0,
  };
  const total = Object.values(costs).reduce((a, b) => a + b, 0);
  const hype  = [rec, art, vid, pro].reduce((sum, c) => sum + (c ? getHype(c) : 0), 0);
  return {
    breakdown: [
      { label: 'Recording',  cost: costs.recording },
      { label: 'Artwork',    cost: costs.artwork },
      { label: 'Video',      cost: costs.video },
      { label: 'Promotion',  cost: costs.promo },
    ],
    total,
    hype,
    maxHype: maxHypeTotal(),
    streams: total === 0 ? 0 : Math.ceil(total / PAYOUT),
    streamsForMeal: Math.ceil(MEAL / PAYOUT),
  };
}

function hypeLabel(score, max) {
  const pct = score / max;
  if (pct <= 0.15) return ['👻', 'GHOST RELEASE'];
  if (pct <= 0.40) return ['🌑', 'UNDERGROUND'];
  if (pct <= 0.65) return ['📈', 'GAINING TRACTION'];
  if (pct <= 0.85) return ['🔥', 'VIRAL POTENTIAL'];
  return ['⭐', 'CHART INCOMING'];
}

// ── HTML builders ─────────────────────────────────────────────────
function progressBar(step) {
  const dots = Array.from({ length: 6 }, (_, i) => {
    const cls = i < step - 1 ? 'done' : i === step - 1 ? 'active' : '';
    return `<div class="pdot ${cls}"></div>`;
  }).join('');
  return `<div class="pbar">${dots}<span class="pbar-label">${step}/6</span></div>`;
}

function hypeDots(filled, max) {
  return Array.from({ length: max }, (_, i) =>
    `<div class="hdot ${i < filled ? 'filled' : ''}"></div>`
  ).join('');
}

function optCard(choice, selected) {
  const cost    = getCost(choice);
  const hype    = getHype(choice);
  const maxHype = getMaxH(choice);
  const sel     = selected === choice.id ? 'selected' : '';
  const hypeRow = maxHype > 0 ? `
    <div class="opt-hype">
      <span class="hype-label">HYPE</span>
      <div class="hype-mini">${hypeDots(hype, maxHype)}</div>
    </div>` : '';
  return `
    <div class="opt-card ${sel}" data-id="${choice.id}">
      <div class="opt-top">
        <span class="opt-emoji">${choice.emoji}</span>
        <div class="opt-info">
          <div class="opt-label">${choice.label}</div>
          <div class="opt-desc">${choice.desc}</div>
        </div>
        <div class="opt-cost">${fmt$(cost)}</div>
      </div>
      ${hypeRow}
    </div>`;
}

// ── Screens ───────────────────────────────────────────────────────
function renderSplash() {
  return `
    <div class="screen screen-splash">
      <div class="splash-note">🎵</div>
      <h1 class="game-title">ROAD<br>TO<br>RICHES</h1>
      <p class="game-sub">AN INDIE ARTIST SIMULATOR</p>
      <p class="game-desc">
        What does it really cost<br>to release music?<br>
        And how many streams<br>to get it back?
      </p>
      <button class="btn btn-gold" data-action="to-1">▶ PRESS START</button>
      <p class="spoiler">spoiler: it's not pretty.</p>
    </div>`;
}

function renderName() {
  return `
    <div class="screen screen-step">
      ${progressBar(1)}
      <div class="step-label">LEVEL 1</div>
      <h2>WHAT'S YOUR<br>ARTIST NAME?</h2>
      <p class="step-hint">Band, solo act, alias — whatever you go by.</p>
      <input
        id="nameInput"
        class="pixel-input mt-16"
        type="text"
        placeholder="e.g. ${escHtml(s.placeholder)}"
        maxlength="28"
        autocomplete="off"
        value="${escHtml(s.name)}"
      />
      <button class="btn btn-gold mt-auto" data-action="to-2">NEXT →</button>
    </div>`;
}

function renderRelease() {
  return `
    <div class="screen screen-step">
      ${progressBar(2)}
      <div class="artist-tag">${escHtml(s.name)}</div>
      <div class="step-label">LEVEL 2</div>
      <h2>WHAT ARE YOU<br>DROPPING?</h2>
      <div class="release-grid mt-16">
        <div class="rel-card ${s.release === 'single' ? 'selected' : ''}" data-action="select-release" data-val="single">
          <div class="rel-emoji">🎵</div>
          <div class="rel-name">SINGLE</div>
          <div class="rel-desc">One track.<br>Less risk.</div>
          <div class="rel-cost">From $50</div>
        </div>
        <div class="rel-card ${s.release === 'album' ? 'selected' : ''}" data-action="select-release" data-val="album">
          <div class="rel-emoji">📀</div>
          <div class="rel-name">ALBUM</div>
          <div class="rel-desc">Full LP.<br>Big ambitions.</div>
          <div class="rel-cost">From $80</div>
        </div>
      </div>
    </div>`;
}

function renderRecording() {
  return `
    <div class="screen screen-step">
      ${progressBar(3)}
      <div class="artist-tag">${escHtml(s.name)} · ${(s.release || '').toUpperCase()}</div>
      <div class="step-label">LEVEL 3</div>
      <h2>HOW DID YOU<br>RECORD IT?</h2>
      <div class="opts-list mt-16" data-field="recording">
        ${RECORDING.map(c => optCard(c, s.recording)).join('')}
      </div>
    </div>`;
}

function renderArtwork() {
  return `
    <div class="screen screen-step">
      ${progressBar(4)}
      <div class="artist-tag">${escHtml(s.name)} · ${(s.release || '').toUpperCase()}</div>
      <div class="step-label">LEVEL 4</div>
      <h2>WHAT ABOUT<br>THE COVER?</h2>
      <div class="opts-list mt-16" data-field="artwork">
        ${ARTWORK.map(c => optCard(c, s.artwork)).join('')}
      </div>
    </div>`;
}

function renderVideo() {
  return `
    <div class="screen screen-step">
      ${progressBar(5)}
      <div class="artist-tag">${escHtml(s.name)} · ${(s.release || '').toUpperCase()}</div>
      <div class="step-label">LEVEL 5</div>
      <h2>ANY VIDEO<br>CONTENT?</h2>
      <p class="step-hint">Includes social reels &amp; vertical cuts.</p>
      <div class="opts-list" data-field="video">
        ${VIDEO.map(c => optCard(c, s.video)).join('')}
      </div>
    </div>`;
}

function renderPromo() {
  return `
    <div class="screen screen-step">
      ${progressBar(6)}
      <div class="artist-tag">${escHtml(s.name)} · ${(s.release || '').toUpperCase()}</div>
      <div class="step-label">LEVEL 6</div>
      <h2>HOW WILL YOU<br>GET HEARD?</h2>
      <div class="opts-list mt-16" data-field="promo">
        ${PROMO.map(c => optCard(c, s.promo)).join('')}
      </div>
    </div>`;
}

function renderResults() {
  const r   = calcResults();
  const pct = Math.round((r.hype / r.maxHype) * 100);
  const [hEmoji, hLabel] = hypeLabel(r.hype, r.maxHype);
  const shareText = buildShareText(r);

  return `
    <div class="screen screen-results">

      <div class="res-header">
        <div class="res-artist">${escHtml(s.name)}</div>
        <div class="res-release">${(s.release || '').toUpperCase()} RELEASE</div>
      </div>

      <div class="res-card">
        <div class="res-card-title">💸 TOTAL INVESTMENT</div>
        <div class="breakdown">
          ${r.breakdown.filter(b => b.cost > 0).map(b => `
            <div class="breakdown-row">
              <span>${b.label}</span>
              <span>${fmt$(b.cost)}</span>
            </div>`).join('')}
          ${r.breakdown.every(b => b.cost === 0) ? `<div class="breakdown-row"><span>—</span><span>Free ride</span></div>` : ''}
        </div>
        <div class="total-cost">${fmt$(r.total)}</div>
      </div>

      <div class="res-card">
        <div class="res-card-title">⚡ HYPE-O-METER</div>
        <div class="hype-bar-wrap">
          <div class="hype-bar-fill" style="--pct: ${pct}%"></div>
        </div>
        <div class="hype-status">${hEmoji} ${hLabel} &nbsp;(${r.hype}/${r.maxHype})</div>
      </div>

      <div class="res-card res-card-highlight">
        <div class="res-card-title">🎧 STREAMS TO BREAK EVEN</div>
        <div class="big-number" id="streamCounter">${r.total === 0 ? '0' : '...'}</div>
        <div class="big-sub">streams &nbsp;·&nbsp; $0.003 each (Streaming avg.)</div>
        ${r.total > 0 ? `
        <div class="meal-compare">
          To earn $15 for one meal: <strong>${r.streamsForMeal.toLocaleString()} streams</strong>
        </div>` : `
        <div class="meal-compare">
          Impressive. Your costs are $0. Now go find listeners.
        </div>`}
      </div>

      <div class="share-row mt-20">
        <button class="btn btn-share" id="shareBtn" data-action="share">⤴ SHARE RESULT</button>
        <a
          class="btn-x"
          href="https://x.com/intent/tweet?text=${encodeURIComponent(buildTwitterText(r))}"
          target="_blank"
          rel="noopener"
          title="Share on X"
        >𝕏</a>
      </div>

      <button class="btn btn-ghost" data-action="restart">↺ TRY AGAIN</button>

      <div class="tipino-section">
        <div class="tipino-logo">tipino</div>
        <h3>WHAT IS TIPINO?</h3>
        <p>
          Tipino lets music fans add fair pay to their streaming —
          set a monthly donation that goes directly to the artists
          you love and listen to.
        </p>
        <p class="tipino-sub">
          Because streaming alone is never going to be enough.
        </p>
        <a class="btn-waitlist" href="https://tipino.app/" target="_blank" rel="noopener">
          JOIN THE WAITLIST →
        </a>
        <div class="tipino-fine">Coming Soon.</div>
      </div>

    </div>`;
}

// ── Share ─────────────────────────────────────────────────────────
const GAME_URL = 'https://fun.tipino.app/roadtoriches/';

function buildShareText(r) {
  const name    = s.name || 'My release';
  const release = s.release || 'release';
  const cost    = r.total > 0 ? `$${r.total.toLocaleString()}` : '$0';
  const streams = r.total > 0 ? `${fmtBig(r.streams)} streams` : 'zero streams (free release!)';
  return `🎵 ${name}'s ${release} costs ${cost} to release.\nThat's ${streams} just to break even on streaming.\n(5,000 streams to afford a $15 meal.)\n\nMusic streaming pays artists almost nothing.\n\n#RoadToRiches #IndieArtist\n\nPlay the game:`;
}

function buildTwitterText(r) {
  return buildShareText(r) + `\n\n🎵 Play the game: ${GAME_URL}`;
}

async function doShare() {
  const r    = calcResults();
  const text = buildShareText(r);
  const btn  = $('shareBtn');
  if (navigator.share) {
    try { await navigator.share({ title: 'Road to Riches', text, url: GAME_URL }); }
    catch { /* user cancelled */ }
    return;
  }
  try {
    await navigator.clipboard.writeText(text + `\n\n🎵 Play the game: ${GAME_URL}`);
    if (btn) { btn.textContent = '✓ COPIED!'; setTimeout(() => { btn.textContent = '⤴ SHARE RESULT'; }, 2200); }
  } catch {
    if (btn) btn.textContent = 'COPY FAILED :(';
  }
}

// ── Event handling ────────────────────────────────────────────────
function handleClick(e) {
  if (transitioning) return;
  const btn     = e.target.closest('[data-action]');
  const optCard = e.target.closest('.opt-card');
  const relCard = e.target.closest('.rel-card[data-action]');

  if (relCard) { action(relCard.dataset.action, relCard.dataset); return; }
  if (btn)     { action(btn.dataset.action, btn.dataset); return; }
  if (optCard) {
    const field = optCard.closest('[data-field]')?.dataset.field;
    if (field) selectOpt(field, optCard.dataset.id);
  }
}

function action(name, data = {}) {
  switch (name) {
    case 'to-1': go(1); break;
    case 'to-2':
      if (!s.name.trim()) return shake('nameInput');
      go(2);
      break;
    case 'select-release':
      s.release = data.val;
      advance(3);
      break;
    case 'restart':
      s = { screen: 0, name: '', placeholder: randomName(), release: null, recording: null, artwork: null, video: null, promo: null };
      render();
      break;
    case 'share': doShare(); break;
  }
}

function selectOpt(field, id) {
  s[field] = id;
  const nextMap = { recording: 4, artwork: 5, video: 6, promo: 7 };
  const next = nextMap[field];
  if (!next) return;
  document.querySelectorAll('.opt-card').forEach(c => {
    c.classList.toggle('selected', c.dataset.id === id);
  });
  advance(next);
}

function advance(nextScreen) {
  transitioning = true;
  setTimeout(() => { transitioning = false; go(nextScreen); }, 320);
}

function go(screen) {
  s.screen = screen;
  render();
  window.scrollTo(0, 0);
}

function shake(inputId) {
  const el = $(inputId);
  if (!el) return;
  el.style.borderColor = '#e91e8c';
  el.focus();
  setTimeout(() => { el.style.borderColor = ''; }, 600);
}

// ── Counter animation ─────────────────────────────────────────────
function animateCounter(target) {
  const el = $('streamCounter');
  if (!el || target === 0) { if (el) el.textContent = '0'; return; }
  const duration = 1400;
  const start    = Date.now();
  function tick() {
    const t = Math.min((Date.now() - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = fmtBig(Math.round(eased * target));
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ── Render ────────────────────────────────────────────────────────
function render() {
  const app = $('game');
  const screens = [
    renderSplash, renderName, renderRelease,
    renderRecording, renderArtwork, renderVideo, renderPromo,
    renderResults,
  ];
  app.innerHTML = screens[s.screen]?.() ?? '';

  if (clickHandler) app.removeEventListener('click', clickHandler);
  clickHandler = e => handleClick(e);
  app.addEventListener('click', clickHandler);

  const nameInput = $('nameInput');
  if (nameInput) {
    nameInput.focus();
    nameInput.addEventListener('input', e => { s.name = e.target.value; });
    nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') action('to-2'); });
  }

  if (s.screen === 7) {
    const r = calcResults();
    requestAnimationFrame(() => animateCounter(r.streams));
  }
}

// ── Sanitize ──────────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Boot ──────────────────────────────────────────────────────────
render();
