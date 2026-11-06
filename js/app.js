/* CareerCompass: app shell, state, screens and interactions. */
(() => {
  'use strict';
  const D = CC.data;
  const E = CC.engine;
  const KEY = 'careercompass-demo-v1';
  const ROUTES = ['onboarding', 'skills', 'time', 'plan', 'dashboard', 'specialist'];
  const STEPS = [
    { route: 'onboarding', n: 1, label: 'Profile' },
    { route: 'skills', n: 2, label: 'Skills' },
    { route: 'time', n: 3, label: 'Time & package' },
    { route: 'plan', n: 4, label: 'Plan' },
    { route: 'dashboard', n: 5, label: 'Track' },
  ];

  const defaults = () => ({
    tier: 'gold',
    onboardStep: 0,
    user: { name: '', email: '' },
    profile: { title: '', industry: '', tasks: '' },
    goal: '',
    selfCheck: {},
    brain: {},
    brainResult: null,
    trial: null,
    selectedSkills: [],
    target: 5,
    calendar: { cells: {}, labels: {}, src: {} },
    synced: [],
    hideDetails: true,
    paintMode: 'work',
    hoursAdj: null,
    hours: null,
    chosen: {},
    filters: { format: 'all' },
    tt: null,
    viewWeek: 1,
    selected: null,
    notice: null,
    replans: {},
    log: [],
    specialist: { stage: 'intro', consent: 'record', proposals: [], form: {} },
  });

  /* ---------- State ---------- */
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        const base = defaults();
        return { ...base, ...saved, calendar: { ...base.calendar, ...(saved.calendar || {}) } };
      }
    } catch (e) { /* storage unavailable: start fresh */ }
    return defaults();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }
  let S = load();

  const tier = () => D.TIERS[S.tier] || D.TIERS.gold;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => (n === 0 ? 'Free' : '$' + n);
  const monthly = (t) => '$' + t.price.toFixed(2) + '/month';
  const hrs = (n) => (Math.round(n * 10) / 10) + (n === 1 ? ' hr' : ' hrs');
  const skillById = (id) => D.SKILLS.find((s) => s.id === id);
  const industryLabel = (id) => (D.INDUSTRIES.find((i) => i.id === id) || {}).label || '—';
  const goal = () => D.GOALS.find((g) => g.id === S.goal) || D.GOALS[0];
  const pad = (h) => String(h).padStart(2, '0') + ':00';

  function setPath(obj, path, value) {
    const parts = path.split('.');
    let o = obj;
    while (parts.length > 1) { const p = parts.shift(); o[p] = o[p] ?? {}; o = o[p]; }
    o[parts[0]] = value;
  }

  function log(text, type = 'info') {
    S.log.unshift({ text, type, at: Date.now() });
    S.log = S.log.slice(0, 10);
  }

  function toast(msg) {
    const box = document.getElementById('toasts');
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(() => el.remove(), 3800);
  }

  /* ---------- Routing ---------- */
  function route() {
    const r = location.hash.replace('#', '');
    return ROUTES.includes(r) ? r : (S.tt ? 'dashboard' : 'onboarding');
  }
  function go(r) {
    if (location.hash === '#' + r) { render(); window.scrollTo(0, 0); } else location.hash = r;
  }
  window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });

  function ready(r) {
    switch (r) {
      case 'onboarding': return true;
      case 'skills': return !!S.brainResult && !!S.trial;
      case 'time': return ready('skills') && S.selectedSkills.length > 0;
      case 'plan': return ready('time') && S.hours != null;
      case 'dashboard': return !!S.tt;
      case 'specialist': return !!S.brainResult;
      default: return false;
    }
  }
  function done(r) {
    switch (r) {
      case 'onboarding': return !!S.brainResult && !!S.trial;
      case 'skills': return S.selectedSkills.length > 0;
      case 'time': return S.hours != null;
      case 'plan': return !!S.tt && S.tt.courses.some((c) => c.kind === 'course');
      default: return false;
    }
  }
  const PREV = { skills: 'onboarding', time: 'skills', plan: 'time', dashboard: 'plan', specialist: 'onboarding' };
  const LABEL = { onboarding: 'onboarding', skills: 'skill selection', time: 'time & package', plan: 'plan building', dashboard: 'tracking' };

  function locked(r) {
    let prev = PREV[r];
    while (prev && !ready(prev)) prev = PREV[prev];
    prev = prev || 'onboarding';
    return `<section class="card center-card">
      <h2>Not quite yet</h2>
      <p class="muted">Finish <strong>${LABEL[prev]}</strong> first. CareerCompass uses it to personalise this step.</p>
      <a class="btn" href="#${prev}">Go to ${LABEL[prev]}</a>
    </section>`;
  }

  /* ---------- Render ---------- */
  const view = document.getElementById('view');
  function render() {
    const r = route();
    view.innerHTML = ready(r) ? SCREENS[r]() : locked(r);
    renderChrome(r);
    save();
  }

  function renderChrome(r) {
    document.getElementById('stepper').innerHTML = STEPS.map((s) => {
      const cls = [s.route === r ? 'is-current' : '', done(s.route) ? 'is-done' : '', ready(s.route) ? '' : 'is-locked'].join(' ');
      return `<a class="step ${cls}" href="#${s.route}" ${s.route === r ? 'aria-current="step"' : ''} ${ready(s.route) ? '' : 'aria-disabled="true" tabindex="-1"'}>
        <span class="step-n">${done(s.route) ? '✓' : s.n}</span><span class="step-label">${s.label}</span></a>`;
    }).join('') + `<a class="step step-special ${r === 'specialist' ? 'is-current' : ''} ${ready('specialist') ? '' : 'is-locked'}" href="#specialist"><span class="step-n">★</span><span class="step-label">Specialist</span></a>`;
    document.getElementById('tierSelect').value = S.tier;
    const badge = document.getElementById('trialBadge');
    if (S.trial) {
      if (S.trial.paid) badge.innerHTML = '<span class="chip chip-good">Subscribed</span>';
      else {
        const left = Math.max(0, 7 - Math.floor((Date.now() - S.trial.start) / 86400000));
        badge.innerHTML = `<span class="chip chip-accent">Free trial · ${left} day${left === 1 ? '' : 's'} left</span>`;
      }
    } else badge.innerHTML = '';
  }

  /* ======================================================================
     Phase 1: Onboarding
     ====================================================================== */
  const OB_TITLES = ['Create your account', 'Your work', 'Your goal', 'Quick skills check', 'Brain test', 'Your analysis'];
  const OB_SUBS = [
    'Takes about 3 minutes. We only ask what we need to build your plan.',
    'Tell us about your job so the AI can suggest skills that actually matter for it.',
    'What do you want upskilling to do for you?',
    'Rate what you already know. We\'ll skip what you\'ve got and shorten time estimates.',
    'Six quick questions about how you study, so your plan fits your energy, not just your calendar.',
    'Here\'s what CareerCompass learned about you.',
  ];

  function scrOnboarding() {
    const st = S.onboardStep;
    const body = [obSignup, obProfile, obGoal, obSkillCheck, obBrain, obSummary][st]();
    return `<section class="screen narrow">
      <div class="screen-head">
        <p class="eyebrow">Phase 1 · Onboarding · Step ${st + 1} of 6</p>
        <h1>${OB_TITLES[st]}</h1>
        <p>${OB_SUBS[st]}</p>
        <div class="mini-progress" role="progressbar" aria-valuemin="1" aria-valuemax="6" aria-valuenow="${st + 1}"><span style="width:${((st + 1) / 6) * 100}%"></span></div>
      </div>
      ${body}
    </section>`;
  }

  const backBtn = () => (S.onboardStep > 0 ? '<button class="btn btn-ghost left" data-action="obBack" type="button">Back</button>' : '');

  function obSignup() {
    return `<div class="card">
      <div class="demo-callout">
        <div><strong>Presenting to judges?</strong><p class="muted small">Load a sample persona and jump straight to the analysis.</p></div>
        <button class="btn btn-sm" data-action="demoPersona" type="button">Use demo persona</button>
      </div>
      <div class="field"><label for="f-name">Full name</label>
        <input id="f-name" type="text" data-bind="user.name" value="${esc(S.user.name)}" autocomplete="name" placeholder="e.g. Linh Tran"></div>
      <div class="field"><label for="f-email">Email</label>
        <input id="f-email" type="email" data-bind="user.email" value="${esc(S.user.email)}" autocomplete="email" placeholder="you@example.com">
        <span class="hint">Demo only. Nothing you type leaves this browser.</span></div>
      <div class="actions"><button class="btn" data-action="obNext" type="button">Sign up &amp; continue</button></div>
    </div>`;
  }

  function obProfile() {
    return `<div class="card">
      <div class="field"><label for="f-title">Job title</label>
        <input id="f-title" type="text" data-bind="profile.title" value="${esc(S.profile.title)}" placeholder="e.g. Data analyst"></div>
      <div class="field"><span class="label">Industry</span>
        <div class="options options-2">
          ${D.INDUSTRIES.map((i) => `<button type="button" class="option ${S.profile.industry === i.id ? 'is-active' : ''}" aria-pressed="${S.profile.industry === i.id}" data-action="pick" data-path="profile.industry" data-value="${i.id}"><strong>${esc(i.label)}</strong></button>`).join('')}
        </div></div>
      <div class="field"><label for="f-tasks">Main daily tasks</label>
        <textarea id="f-tasks" data-bind="profile.tasks" placeholder="e.g. weekly reports in Excel, answering data requests, team meetings">${esc(S.profile.tasks)}</textarea></div>
      <div class="actions">${backBtn()}<button class="btn" data-action="obNext" type="button">Continue</button></div>
    </div>`;
  }

  function obGoal() {
    return `<div class="card">
      <div class="options">
        ${D.GOALS.map((g) => `<button type="button" class="option ${S.goal === g.id ? 'is-active' : ''}" aria-pressed="${S.goal === g.id}" data-action="pick" data-path="goal" data-value="${g.id}"><strong>${esc(g.label)}</strong><span>${esc(g.desc)}</span></button>`).join('')}
      </div>
      <div class="actions">${backBtn()}<button class="btn" data-action="obNext" type="button">Continue</button></div>
    </div>`;
  }

  function checkSkills() {
    const ind = S.profile.industry;
    return D.SKILLS.filter((s) => s.industries.includes(ind) || s.industries.includes('all')).slice(0, 7);
  }

  function obSkillCheck() {
    const levels = ['None', 'Some', 'Confident'];
    return `<div class="card">
      ${checkSkills().map((s) => `<div class="skillcheck-row">
        <span>${esc(s.name)}</span>
        <div class="segmented" role="group" aria-label="${esc(s.name)}">
          ${levels.map((l, i) => `<button type="button" class="${S.selfCheck[s.id] === i ? 'is-active' : ''}" aria-pressed="${S.selfCheck[s.id] === i}" data-action="selfCheck" data-id="${s.id}" data-level="${i}">${l}</button>`).join('')}
        </div></div>`).join('')}
      <p class="muted small" style="margin-top:12px">Skip any you're unsure about. We'll treat them as "None".</p>
      <div class="actions">${backBtn()}<button class="btn" data-action="obNext" type="button">Continue</button></div>
    </div>`;
  }

  function obBrain() {
    return `<div class="card">
      ${D.BRAIN.map((q, n) => `<div class="q-block">
        <h3>${n + 1}. ${esc(q.q)}</h3>
        <div class="q-opts" role="group" aria-label="${esc(q.q)}">
          ${q.opts.map(([v, l]) => {
            const on = String(S.brain[q.id]) === v;
            return `<button type="button" class="option ${on ? 'is-active' : ''}" aria-pressed="${on}" data-action="brain" data-q="${q.id}" data-v="${v}"><strong>${esc(l)}</strong></button>`;
          }).join('')}
        </div></div>`).join('')}
      <div class="actions">${backBtn()}<button class="btn" data-action="obNext" type="button">See my analysis</button></div>
    </div>`;
  }

  const TIME_LABEL = { morning: 'Early mornings', evening: 'Evenings', weekend: 'Weekends', varies: 'Flexible' };
  const STYLE_LABEL = { video: 'Videos', project: 'Hands-on projects', reading: 'Reading & notes', live: 'Live discussion' };
  const BURN_CHIP = { low: 'chip-good', medium: 'chip-warn', high: 'chip-bad' };
  const BURN_TEXT = {
    low: 'You have energy to spare, so we can plan steady progress.',
    medium: 'We\'ll keep one rest day free and trim your weekly load by 15%.',
    high: 'We\'ll cap sessions at 45 min, keep a rest day and trim your weekly load by 30%.',
  };

  function obSummary() {
    const b = S.brainResult;
    return `<div class="grid-2">
      <div class="card">
        <h3>Profile</h3>
        <ul class="summary-list">
          <li><span>Name</span><span>${esc(S.user.name)}</span></li>
          <li><span>Role</span><span>${esc(S.profile.title)}</span></li>
          <li><span>Industry</span><span>${esc(industryLabel(S.profile.industry))}</span></li>
          <li><span>Goal</span><span>${esc(goal().label)}</span></li>
        </ul>
      </div>
      <div class="card">
        <h3>Brain test</h3>
        <ul class="summary-list">
          <li><span>Burnout risk</span><span><span class="chip ${BURN_CHIP[b.burnout]}">${b.burnout}</span></span></li>
          <li><span>Session length</span><span>${b.session} min</span></li>
          <li><span>Best focus time</span><span>${TIME_LABEL[b.time]}</span></li>
          <li><span>Learns best with</span><span>${STYLE_LABEL[b.style]}</span></li>
        </ul>
      </div>
    </div>
    <div class="notice notice-info"><p><strong>What this means for your plan:</strong> ${BURN_TEXT[b.burnout]} Sessions are planned for ${TIME_LABEL[b.time].toLowerCase()} where your calendar allows.</p></div>
    <div class="card">
      <h3>Ready for your skill recommendations?</h3>
      <p class="muted">Start your 1-week free trial of ${tier().name}. After that it's ${monthly(tier())}, with every course included. Cancel before it ends and you won't pay anything.</p>
      <div class="actions">${backBtn()}
        <button class="btn btn-ghost" data-action="startTrial" data-paid="1" type="button">Subscribe now · ${monthly(tier())}</button>
        <button class="btn" data-action="startTrial" type="button">Start 1-week free trial</button>
      </div>
    </div>`;
  }

  function obValidate() {
    switch (S.onboardStep) {
      case 0: if (!S.user.name.trim()) return 'Please enter your name.'; break;
      case 1: if (!S.profile.title.trim()) return 'Please enter your job title.'; if (!S.profile.industry) return 'Please choose your industry.'; break;
      case 2: if (!S.goal) return 'Please choose a goal.'; break;
      case 4: if (D.BRAIN.some((q) => S.brain[q.id] == null)) return 'Please answer all six questions.'; break;
      default: break;
    }
    return null;
  }

  /* ======================================================================
     Phase 2: Skill selection
     ====================================================================== */
  function scrSkills() {
    const t = tier();
    const ranked = E.rankSkills(S.profile, S.goal, S.selfCheck);
    const lim = t.skills;
    const limText = lim === 1 ? 'Silver plans cover 1 skill at a time.' : lim >= 99 ? 'Platinum: pick as many skills as you like.' : `Your Gold plan covers up to ${lim} skills at once.`;
    return `<section class="screen">
      <div class="screen-head">
        <p class="eyebrow">Phase 2 · Skill selection</p>
        <h1>Your top skills to ${esc(goal().label.toLowerCase())}</h1>
        <p>Ranked for a <strong>${esc(S.profile.title)}</strong> in <strong>${esc(industryLabel(S.profile.industry))}</strong>, based on your goal, your skills check and demand in your field. ${limText}</p>
      </div>
      <div class="grid-2">
        ${ranked.map((s, i) => skillCard(s, i, t)).join('')}
        <div class="card upsell">
          <h3>None of these fit?</h3>
          <p class="muted">Talk to one of the specialists who design our courses. The AI briefs them on your profile beforehand.</p>
          <a class="btn btn-ghost" href="#specialist">Request a specialist session</a>
        </div>
      </div>
      <div class="sticky-bar">
        <span><strong>${S.selectedSkills.length}</strong> selected${S.selectedSkills.length ? ': ' + S.selectedSkills.map((id) => esc(skillById(id).short)).join(', ') : ''}</span>
        <button class="btn" data-action="goto" data-route="time" ${S.selectedSkills.length ? '' : 'disabled'} type="button">Continue to time &amp; package</button>
      </div>
    </section>`;
  }

  function skillCard(s, i, t) {
    const sel = S.selectedSkills.includes(s.id);
    const role = t.detail >= 2
      ? `<div class="detail"><strong>For a ${esc(S.profile.title || 'professional')}:</strong> ${esc(s.role)}</div>`
      : '<div class="detail locked"><span class="lock">Gold: role-specific detail on why this skill matters</span></div>';
    const evidence = t.detail >= 3
      ? `<div class="detail"><strong>Job-posting signal:</strong> mentioned in ${s.demand}% of sampled postings in your field. ${esc(s.evidence)} <span class="muted tiny">(illustrative demo data)</span></div>`
      : '<div class="detail locked"><span class="lock">Platinum: job-posting data &amp; deeper evidence</span></div>';
    return `<article class="card skill-card ${sel ? 'is-selected' : ''}">
      <span class="rank">#${i + 1}</span>
      <h3>${esc(s.name)}</h3>
      <p>${esc(s.whyFull)}</p>
      <div class="skill-meta">
        <div><span class="muted">Time to useful level</span><b>~${s.hoursNeeded} hrs</b></div>
        <div><span class="muted">Cost</span><b>Included in your plan</b><span class="muted tiny">usually ${money(s.cost[0])}–$${s.cost[1]} elsewhere</span></div>
      </div>
      ${role}${evidence}
      <div><button class="btn ${sel ? 'btn-good' : 'btn-soft'} btn-sm" data-action="toggleSkill" data-id="${s.id}" aria-pressed="${sel}" type="button">${sel ? '✓ Selected' : 'Choose this skill'}</button></div>
    </article>`;
  }

  /* ======================================================================
     Phase 3: Time & package
     ====================================================================== */
  function scrTime() {
    const t = tier();
    const R = E.realisticHours(S.calendar, S.brainResult, t);
    const def = Math.min(S.target || R.hours, R.hours);
    const adj = S.hoursAdj ?? def;
    const max = Math.max(4, Math.ceil(Math.max(R.hours, S.target || 0) * 1.5));
    return `<section class="screen">
      <div class="screen-head">
        <p class="eyebrow">Phase 3 · Time &amp; package</p>
        <h1>How much time do you really have?</h1>
        <p>Sync your calendars or paint your week. The AI subtracts your commitments and adds a safety margin, so your plan survives a real week.</p>
      </div>

      <div class="grid-2">
        <div class="card">
          <h3>Your package</h3>
          <div class="options" role="group" aria-label="Subscription package">
            ${Object.values(D.TIERS).map((x) => `<button type="button" class="option ${x.id === t.id ? 'is-active' : ''}" aria-pressed="${x.id === t.id}" data-action="setTier" data-id="${x.id}">
              <span class="row" style="gap:8px"><strong>${x.name}</strong><span class="spacer"></span><strong>${monthly(x)}</strong></span>
              <span>${esc(x.perks)}</span></button>`).join('')}
          </div>
          <p class="muted small" style="margin:10px 0 16px">${S.trial && S.trial.paid ? `Subscribed · ${monthly(t)}` : `Free for 7 days, then ${monthly(t)}`} · all courses included. Assumed MVP prices.</p>
          <div class="field"><label for="f-target">Target study hours per week</label>
            <input id="f-target" type="number" min="1" max="40" step="0.5" data-bind="target" data-num data-rerender value="${esc(S.target)}">
            <span class="hint">What you'd like to do. We'll check whether it's realistic.</span></div>
        </div>
        <div class="card">
          <h3>Sync calendars</h3>
          <p class="muted small">${t.name} plan: ${t.calendars >= 3 ? 'multiple calendars' : t.calendars + ' calendar' + (t.calendars > 1 ? 's' : '')}${t.buffer ? ' + buffer for unexpected events' : ''}.</p>
          <div class="stack">
            ${D.CAL_SOURCES.map((c) => {
              const on = S.synced.includes(c.id);
              return `<div class="row"><span class="swatch sw-${c.type}"></span><span><strong>${c.name}</strong> <span class="muted small">(${c.provider})</span></span><span class="spacer"></span>
                <button type="button" class="btn btn-sm ${on ? 'btn-ghost' : 'btn-soft'}" data-action="sync" data-id="${c.id}">${on ? 'Disconnect' : 'Sync (demo)'}</button></div>`;
            }).join('')}
          </div>
          <label class="switch" style="margin-top:16px"><input type="checkbox" data-bind="hideDetails" data-bool data-rerender ${S.hideDetails ? 'checked' : ''}> Black out private event details</label>
          <p class="muted tiny" style="margin:6px 0 0">When on, the AI only sees that you're busy, never what the event is.</p>
        </div>
      </div>

      <div class="card">
        <div class="row" style="margin-bottom:6px"><h3 style="margin:0">Your typical week</h3><span class="spacer"></span><button type="button" class="link-btn small" data-action="clearCal">Clear all</button></div>
        <p class="muted small">Click or drag on the grid to mark busy time. Click a block again to clear it.</p>
        <div class="cal-toolbar" role="group" aria-label="Paint mode">
          ${[['work', 'Work'], ['family', 'Family'], ['private', 'Private'], ['free', 'Erase']].map(([m, l]) => `<button type="button" class="paint-btn ${S.paintMode === m ? 'is-active' : ''}" aria-pressed="${S.paintMode === m}" data-action="paintMode" data-mode="${m}"><span class="swatch sw-${m}"></span>${l}</button>`).join('')}
        </div>
        <div class="grid-scroll">${calendarGrid()}</div>
      </div>

      <div class="card card-accent">
        <div class="grid-2" style="align-items:start">
          <div>
            <p class="eyebrow">AI estimate</p>
            <div class="big-hours"><b>${R.hours}</b><span>hrs / week<br><span class="muted small">you realistically have</span></span></div>
            <ul class="calc">
              ${R.steps.map((s, i) => `<li class="${i > 0 && s.value < 0 ? 'neg' : ''}"><span>${esc(s.label)}</span><span>${s.value > 0 && i > 0 ? '+' : ''}${s.value} h</span></li>`).join('')}
              <li class="total"><span>Realistic study time</span><span>${R.hours} h</span></li>
            </ul>
            ${!t.buffer ? '<p class="muted small"><span class="lock">Gold adds a 15% buffer for unexpected events</span></p>' : ''}
          </div>
          <div>
            ${S.target > R.hours
              ? `<div class="notice notice-warn"><p>Your target of <strong>${S.target} hrs</strong> is above what your week can sustain. Planning for ${R.hours} hrs keeps you from falling behind.</p></div>`
              : `<div class="notice notice-good"><p>Your target of <strong>${S.target} hrs</strong> fits comfortably inside your ${R.hours} realistic hours.</p></div>`}
            <div class="field" style="margin-top:16px"><label for="hoursSlider">Hours to plan per week: <strong id="adjOut">${hrs(adj)}</strong></label>
              <input id="hoursSlider" type="range" min="1" max="${max}" step="0.5" value="${adj}" data-max-real="${R.hours}">
              <span class="hint" id="adjWarn" ${adj > R.hours ? '' : 'hidden'}>Above your realistic hours, so burnout risk goes up.</span></div>
            <div class="actions"><button class="btn" data-action="finishTime" data-adj="${adj}" type="button">Use ${hrs(adj)} per week</button></div>
          </div>
        </div>
      </div>
    </section>`;
  }

  function calendarGrid() {
    const cells = S.calendar.cells;
    const labels = S.calendar.labels || {};
    let html = '<div class="week-grid paintable" id="paintGrid"><div class="wg-head"></div>';
    html += D.DAYS.map((d) => `<div class="wg-head">${d}</div>`).join('');
    for (const h of D.HOURS) {
      html += `<div class="wg-time">${pad(h)}</div>`;
      for (let d = 0; d < 7; d++) {
        const k = E.key(d, h);
        const type = cells[k];
        let lbl = labels[k] || '';
        if (type === 'private' && S.hideDetails) lbl = 'Busy';
        html += `<div class="wg-cell ${type ? 't-' + type : ''}" data-cell="${k}" title="${esc(D.DAYS[d] + ' ' + pad(h) + (type ? ' · ' + (lbl || type) : ' · free'))}">${lbl ? `<span class="lbl">${esc(lbl)}</span>` : ''}</div>`;
      }
    }
    return html + '</div>';
  }

  // Calendar painting (mouse + touch via pointer events)
  let painting = null;
  function paintCell(el) {
    const k = el.dataset.cell;
    const cal = S.calendar;
    if (painting.value === 'free') { delete cal.cells[k]; delete cal.labels[k]; delete cal.src[k]; el.className = 'wg-cell'; el.innerHTML = ''; }
    else { cal.cells[k] = painting.value; delete cal.labels[k]; delete cal.src[k]; el.className = 'wg-cell t-' + painting.value; el.innerHTML = ''; }
  }
  document.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('#paintGrid [data-cell]');
    if (!el) return;
    e.preventDefault();
    const mode = S.paintMode;
    const cur = S.calendar.cells[el.dataset.cell];
    painting = { value: mode === 'free' || cur === mode ? 'free' : mode, last: el };
    paintCell(el);
  });
  document.addEventListener('pointermove', (e) => {
    if (!painting) return;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('#paintGrid [data-cell]');
    if (el && el !== painting.last) { painting.last = el; paintCell(el); }
  });
  const endPaint = () => { if (!painting) return; painting = null; S.hoursAdj = null; S.hours = null; render(); };
  document.addEventListener('pointerup', endPaint);
  document.addEventListener('pointercancel', endPaint);

  /* ======================================================================
     Phase 4: Plan building
     ====================================================================== */
  function scrPlan() {
    const t = tier();
    const n = S.selectedSkills.length;
    const alloc = S.hours / n;
    const f = S.filters;
    const allChosen = S.selectedSkills.every((id) => S.chosen[id]);
    const filterBar = t.refined
      ? `<div class="card card-flat"><div class="row">
          <strong class="small">Refined filters</strong>
          <div class="segmented" role="group" aria-label="Format">
            ${[['all', 'All formats'], ['video', 'Videos'], ['project', 'Projects'], ['live', 'Live']].map(([v, l]) => `<button type="button" class="${f.format === v ? 'is-active' : ''}" aria-pressed="${f.format === v}" data-action="filter" data-key="format" data-value="${v}">${l}</button>`).join('')}
          </div>
        </div></div>`
      : '<div class="card card-flat upsell"><p class="small muted" style="margin:0"><span class="lock">Gold &amp; Platinum add refined filters (e.g. course format) to narrow down courses.</span></p></div>';

    return `<section class="screen">
      <div class="screen-head">
        <p class="eyebrow">Phase 4 · Plan building</p>
        <h1>Courses that fit your week</h1>
        <p>Every course is designed by CareerCompass specialists and included in your ${t.name} plan. At <strong>${hrs(S.hours)}/week</strong>${n > 1 ? ` (${hrs(alloc)} per skill)` : ''}, here's what fits.</p>
      </div>
      ${filterBar}
      ${S.selectedSkills.map((id) => {
        const sk = skillById(id);
        const list = E.matchCourses(id, alloc, S.brainResult, f, t.refined).slice(0, 3);
        return `<div>
          <h2>${esc(sk.name)}</h2>
          ${list.length ? `<div class="grid-3">${list.map((c, i) => courseCard(c, id, i === 0)).join('')}</div>`
            : '<div class="card card-flat"><p class="muted" style="margin:0">No courses match these filters. Try loosening them.</p></div>'}
        </div>`;
      }).join('')}
      <div class="card upsell">
        <div class="row"><div><h3 style="margin:0">None of these fit?</h3><p class="muted small" style="margin:0">A specialist can design a plan around your situation.</p></div><span class="spacer"></span><a class="btn btn-ghost" href="#specialist">Talk to a specialist</a></div>
      </div>
      <div class="sticky-bar">
        <span>All courses included in your <strong>${t.name}</strong> plan <span class="muted small">· ${monthly(t)}</span></span>
        <button class="btn" data-action="openPay" ${allChosen ? '' : 'disabled'} type="button">${S.tt && S.tt.courses.some((c) => c.kind === 'course') ? 'Rebuild my timetable' : 'Build my timetable'}</button>
      </div>
    </section>`;
  }

  function courseCard(c, skillId, recommended) {
    const sel = S.chosen[skillId] === c.id;
    return `<article class="card course-card ${sel ? 'is-selected' : ''}">
      <div class="chips">
        ${recommended ? '<span class="chip chip-accent">AI pick</span>' : ''}
        <span class="chip chip-good">Included in ${tier().name}</span>
        ${c.styleMatch ? '<span class="chip">Matches how you learn</span>' : ''}
      </div>
      <h4>${esc(c.name)}</h4>
      <span class="muted small">${esc(c.formatLabel)}</span>
      <div class="course-facts">
        <div><span class="muted">Length</span><b>${c.hours} hrs</b></div>
        <div><span class="muted">At your pace</span><b>~${c.weeks} weeks</b></div>
      </div>
      <div class="row"><span class="spacer"></span>
        <button type="button" class="btn btn-sm ${sel ? 'btn-good' : 'btn-soft'}" data-action="chooseCourse" data-skill="${skillId}" data-id="${c.id}" aria-pressed="${sel}">${sel ? '✓ Chosen' : 'Choose'}</button></div>
    </article>`;
  }

  function payModal() {
    const items = S.selectedSkills.map((id) => D.coursesFor(skillById(id)).find((x) => x.id === S.chosen[id]));
    const t = tier();
    const trial = S.trial && !S.trial.paid;
    const rebuild = S.tt && S.tt.courses.some((c) => c.kind === 'course');
    showModal(`<h2 id="mTitle">Confirm your plan</h2>
      <ul class="summary-list">
        ${items.map((c) => `<li><span>${esc(c.name)}</span><span>Included</span></li>`).join('')}
        <li><span>${t.name} subscription</span><span>${trial ? `Free for 7 days, then ${monthly(t)}` : monthly(t)}</span></li>
        <li><span><strong>Due today</strong></span><span>${trial ? '$0.00' : '$' + t.price.toFixed(2)}</span></li>
      </ul>
      ${rebuild ? '<div class="notice notice-warn" style="margin-top:14px"><p>Rebuilding replaces your current timetable and resets progress.</p></div>' : ''}
      <p class="muted small" style="margin-top:14px">Demo checkout: no real payment is taken. Prices are assumed for the MVP.</p>
      <div class="actions"><button class="btn btn-ghost" data-action="closeModal" type="button">Cancel</button><button class="btn" data-action="confirmPay" type="button">Confirm &amp; build timetable</button></div>`);
  }

  /* ======================================================================
     Phase 5: Tracking dashboard
     ====================================================================== */
  function scrDashboard() {
    const tt = S.tt;
    const t = tier();
    const P = E.progress(tt);
    const next = E.nextSession(tt);
    const lw = E.lastWeek(tt);
    if (S.viewWeek > lw) S.viewWeek = lw;
    const wk = S.viewWeek;
    const weekMin = tt.sessions.filter((s) => s.week === wk).reduce((a, s) => a + s.minutes, 0);
    const hasCourses = tt.courses.some((c) => c.kind === 'course');
    const sel = S.selected && tt.sessions.find((s) => s.id === S.selected);

    return `<section class="screen">
      <div class="screen-head row">
        <div>
          <p class="eyebrow">Progress tracking</p>
          <h1>${esc(S.user.name ? S.user.name.split(' ')[0] + '\'s' : 'Your')} learning plan</h1>
          <p>Starts ${E.fmtDate(new Date(tt.start))} · ${hasCourses ? `finish by <strong>${E.fmtDate(E.endDate(tt))}</strong>` : 'no courses yet'} · ${hrs(tt.hours || S.hours || 0)}/week</p>
        </div>
      </div>

      ${S.notice ? `<div class="notice notice-${S.notice.type}" role="status"><p>${S.notice.html}</p><button class="x" data-action="dismissNotice" aria-label="Dismiss" type="button">×</button></div>` : ''}
      ${tt.shortfall ? `<div class="notice notice-warn"><p>Your calendar only had room for part of your weekly plan (${tt.shortfall} session${tt.shortfall > 1 ? 's' : ''} short). Free up time in Phase 3 for a faster finish.</p></div>` : ''}

      <div class="grid-4">
        <div class="card kpi"><div class="label">Overall progress</div><div class="value">${P.pct}%</div><div class="bar"><span style="width:${P.pct}%"></span></div></div>
        <div class="card kpi"><div class="label">Finish by</div><div class="value">${hasCourses ? E.fmtDate(E.endDate(tt)).replace(/^\w+ /, '') : '—'}</div><div class="sub">${E.endWeek(tt)} week${E.endWeek(tt) > 1 ? 's' : ''} total</div></div>
        <div class="card kpi"><div class="label">Week ${wk} planned</div><div class="value">${hrs(weekMin / 60)}</div><div class="sub">${tt.sessions.filter((s) => s.week === wk).length} sessions</div></div>
        <div class="card kpi"><div class="label">Streak</div><div class="value">${tt.streak || 0}</div><div class="sub">sessions in a row</div></div>
      </div>

      <div class="card">
        <div class="row">
          <div><h3 style="margin:0">Simulate your week</h3><p class="muted small" style="margin:0">Demo controls: act out what happens as real days pass.</p></div>
          <span class="spacer"></span>
          <div class="sim-bar">
            <button class="btn btn-good btn-sm" data-action="completeNext" type="button" ${next ? '' : 'disabled'}>✓ Complete next session</button>
            <button class="btn btn-warn btn-sm" data-action="missNext" type="button" ${next ? '' : 'disabled'}>✗ I missed my next session</button>
          </div>
        </div>
        ${next ? `<p class="small" style="margin:12px 0 0"><span class="muted">Next up:</span> <strong>${esc(E.courseOf(tt, next).name)}</strong> · ${E.fmtSlot(tt, next)} · ${next.minutes} min</p>` : '<p class="small" style="margin:12px 0 0"><strong>All planned sessions are complete.</strong></p>'}
      </div>

      <div class="dash">
        <div class="card">
          <div class="row" style="margin-bottom:10px"><h3 style="margin:0">Timetable</h3><span class="spacer"></span>
            <span class="muted small">${sel ? 'Moving: click a highlighted free slot' : 'Click a session to edit or move it'}</span></div>
          <div class="week-tabs" role="tablist" aria-label="Weeks">
            ${Array.from({ length: lw }, (_, i) => i + 1).map((w) => `<button type="button" role="tab" aria-selected="${w === wk}" class="${w === wk ? 'is-active' : ''}" data-action="week" data-week="${w}">Week ${w}</button>`).join('')}
          </div>
          ${tt.weeksPlanned < tt.weeksNeeded ? `<div class="notice notice-info" style="margin-bottom:12px"><p><span class="lock">${t.name} plans ${t.weeks} weeks ahead.</span> Your course runs ${tt.weeksNeeded} weeks. Weeks ${tt.weeksPlanned + 1}–${tt.weeksNeeded} unlock as you go, or switch to a higher package to see them now.</p></div>` : ''}
          <div class="grid-scroll ${sel ? 'moving' : ''}">${timetableGrid(wk)}</div>
          <div class="legend">
            ${tt.courses.filter((c, i, a) => a.findIndex((x) => x.color === c.color && x.kind === c.kind) === i || c.kind === 'course').map((c) => `<span><span class="swatch sw-c${c.color}"></span>${esc(c.kind === 'specialist' ? 'Specialist items' : c.name)}</span>`).join('')}
            <span><span class="swatch sw-work"></span>Busy (calendar)</span>
            <span><span class="swatch" style="outline:2px dashed var(--needle);outline-offset:-2px"></span>Replanned</span>
          </div>
        </div>

        <aside class="side">
          ${sel ? selectedPanel(sel) : ''}
          ${insights(P, next)}
          <div class="card">
            <h3>Stuck or need a different plan?</h3>
            <p class="muted small">${t.specialist}. Your AI pre-brief is sent automatically.</p>
            <a class="btn btn-ghost btn-sm" href="#specialist">Talk to a specialist</a>
          </div>
          <div class="card">
            <h3>Activity</h3>
            ${S.log.length ? `<ul class="log">${S.log.map((l) => `<li class="${l.type}">${l.text}</li>`).join('')}</ul>` : '<p class="muted small" style="margin:0">Nothing yet. Use the demo controls above.</p>'}
          </div>
        </aside>
      </div>
    </section>`;
  }

  function timetableGrid(week) {
    const tt = S.tt;
    const cells = S.calendar.cells;
    let html = '<div class="week-grid"><div class="wg-head"></div>';
    for (let d = 0; d < 7; d++) {
      const dt = E.dateOf(tt, week, d);
      html += `<div class="wg-head">${D.DAYS[d]}<span>${dt.getDate()}/${dt.getMonth() + 1}</span></div>`;
    }
    const byKey = {};
    tt.sessions.filter((s) => s.week === week).forEach((s) => { byKey[E.key(s.day, s.hour)] = s; });
    for (const h of D.HOURS) {
      html += `<div class="wg-time">${pad(h)}</div>`;
      for (let d = 0; d < 7; d++) {
        const k = E.key(d, h);
        const s = byKey[k];
        if (s) {
          const c = E.courseOf(tt, s);
          const cls = ['wg-cell', 'has-session', 's-c' + c.color, s.status === 'done' ? 'is-done' : '', s.moved ? 'is-moved' : '', S.selected === s.id ? 'is-selected' : ''].join(' ');
          html += `<button type="button" class="${cls}" data-action="selectSession" data-id="${s.id}" title="${esc(c.name + ' · ' + D.DAYS[d] + ' ' + pad(h) + ' · ' + s.minutes + ' min' + (s.status === 'done' ? ' · done' : ''))}"><span class="st">${esc(c.name)}</span><span class="sm">${s.minutes}m</span></button>`;
        } else if (cells[k]) {
          html += `<div class="wg-cell t-${cells[k]}" title="Busy"></div>`;
        } else {
          html += `<button type="button" class="wg-cell free" data-action="slot" data-day="${d}" data-hour="${h}" aria-label="Free slot ${D.DAYS[d]} ${pad(h)}"></button>`;
        }
      }
    }
    return html + '</div>';
  }

  function selectedPanel(s) {
    const tt = S.tt;
    const c = E.courseOf(tt, s);
    return `<div class="card card-accent">
      <p class="eyebrow">Selected session</p>
      <h3>${esc(c.name)}</h3>
      <p class="small muted">${E.fmtSlot(tt, s)} · ${s.minutes} min · ${s.status === 'done' ? 'completed' : s.moved ? 'replanned' : 'planned'}</p>
      <p class="small">Click any highlighted free slot in the timetable to move it there.</p>
      <div class="row">
        ${s.status !== 'done' ? `<button class="btn btn-good btn-sm" data-action="markDone" data-id="${s.id}" type="button">Mark done</button>
        <button class="btn btn-warn btn-sm" data-action="markMissed" data-id="${s.id}" type="button">I missed this</button>` : ''}
        <button class="btn btn-ghost btn-sm" data-action="deselect" type="button">Cancel</button>
      </div>
    </div>`;
  }

  function insights(P, next) {
    const t = tier();
    const tt = S.tt;
    const bars = `<div class="card"><h3>Progress by course</h3>
      ${P.perCourse.map((c) => `<div style="margin-bottom:12px"><div class="row small"><span>${esc(c.name)}</span><span class="spacer"></span><span class="muted">${Math.round(c.done / 60 * 10) / 10}/${Math.round(c.totalMin / 60)} h</span></div><div class="bar c${c.color}"><span style="width:${c.pct}%"></span></div></div>`).join('') || '<p class="muted small">No courses yet.</p>'}
    </div>`;
    if (t.motivation === 'basic') {
      return bars + '<div class="card upsell"><p class="small muted" style="margin:0"><span class="lock">Gold adds payoff insights &amp; reminders. Platinum adds weekly check-ins and recovery coaching.</span></p></div>';
    }
    const lvl = Object.values(S.selfCheck).reduce((a, v) => a + v, 0);
    const startMatch = Math.min(55, 30 + lvl * 3);
    const nowMatch = Math.round(startMatch + (P.pct / 100) * (92 - startMatch));
    let html = bars + `<div class="card">
      <h3>Payoff insight</h3>
      <p class="muted small" style="margin-bottom:4px">Estimated match to job postings for your goal: ${esc(goal().label.toLowerCase())}</p>
      <div class="match">${P.pct > 0 ? `<span class="from">${startMatch}%</span>` : ''}${nowMatch}%</div>
      <div class="bar"><span style="width:${nowMatch}%"></span></div>
      <p class="tiny muted" style="margin:8px 0 0">${P.pct > 0 ? `Up ${nowMatch - startMatch} point${nowMatch - startMatch === 1 ? '' : 's'} since you started.` : 'Complete sessions to watch this climb.'} Illustrative estimate.</p>
    </div>`;
    if (next) {
      html += `<div class="card"><h3>Reminder</h3><p class="small" style="margin:0"><strong>${esc(E.courseOf(tt, next).name)}</strong><br>${E.fmtSlot(tt, next)} · ${next.minutes} min</p><p class="tiny muted" style="margin:6px 0 0">We'll nudge you 30 min before (demo).</p></div>`;
    }
    if (t.motivation === 'full') {
      html += `<div class="card"><h3>Weekly check-in</h3><p class="small muted">How's your energy this week?</p>
        <div class="row">
          <button class="btn btn-soft btn-sm" data-action="checkin" data-v="great" type="button">Great</button>
          <button class="btn btn-soft btn-sm" data-action="checkin" data-v="ok" type="button">Okay</button>
          <button class="btn btn-warn btn-sm" data-action="checkin" data-v="tired" type="button">Exhausted</button>
        </div></div>`;
    }
    return html;
  }

  function handleMiss(id) {
    const tt = S.tt;
    const s = tt.sessions.find((x) => x.id === id);
    if (!s) return;
    const t = tier();
    const name = E.courseOf(tt, s).name;
    if (t.replan === 'limited') {
      const used = S.replans[s.week] || 0;
      if (used >= 1) {
        S.selected = id;
        S.viewWeek = s.week;
        tt.streak = 0;
        S.notice = { type: 'warn', html: `<strong>Missed “${esc(name)}”.</strong> Silver includes 1 auto-replan per week and you've used it. The session is selected: click any free slot to move it yourself, or switch to Gold for automatic replanning.` };
        log(`Missed “${esc(name)}”: manual move needed (Silver limit).`, 'warn');
        render();
        return;
      }
      S.replans[s.week] = used + 1;
    }
    const res = E.replan(tt, id, S.calendar);
    S.selected = null;
    S.viewWeek = s.week;
    let html = `<strong>Auto-replanned.</strong> ${esc(res.message)}`;
    if (t.motivation === 'full') html += ' <br><em>Recovery tip: one missed session is normal. Your next session is short and set at your best focus time, so getting back on track is easy.</em>';
    S.notice = { type: res.delayed ? 'warn' : 'good', html };
    log(`Missed a session → AI replanned. ${esc(res.message)}`, res.delayed ? 'warn' : 'info');
    render();
  }

  function markDone(id) {
    const tt = S.tt;
    const s = tt.sessions.find((x) => x.id === id);
    if (!s || s.status === 'done') return;
    s.status = 'done';
    tt.streak = (tt.streak || 0) + 1;
    S.selected = null;
    S.viewWeek = s.week;
    const P = E.progress(tt);
    log(`Completed “${esc(E.courseOf(tt, s).name)}” (${s.minutes} min). Overall ${P.pct}%.`, 'good');
    if (tt.streak > 0 && tt.streak % 3 === 0) S.notice = { type: 'good', html: `<strong>${tt.streak}-session streak!</strong> You're building a real habit.` };
    // Unlock more weeks as you go (rolling window for limited packages)
    const cur = (E.nextSession(tt) || s).week;
    E.extendPlan(tt, S.calendar, Math.min(tier().weeks + cur - 1, 520));
    render();
  }

  /* ======================================================================
     Specialist (Phase 5 in the brief)
     ====================================================================== */
  function scrSpecialist() {
    const sp = D.SPECIALISTS[S.profile.industry] || D.SPECIALISTS.other;
    const t = tier();
    const st = S.specialist.stage;
    const head = `<div class="screen-head">
      <p class="eyebrow">Specialist session</p>
      <h1>Talk to the people who design your courses</h1>
      <p>When the AI's suggestions don't fit, a specialist builds a plan with you. Whatever you agree goes straight into your timetable.</p>
    </div>`;
    const person = `<div class="person"><div class="avatar">${sp.initials}</div><div><strong>${esc(sp.name)}</strong><div class="muted small">${esc(sp.role)}</div></div></div>`;
    let body = '';

    if (st === 'intro') {
      body = `<div class="grid-2">
        <div class="card">${person}
          <ul class="summary-list" style="margin-top:16px">
            <li><span>Your package</span><span>${t.name}</span></li>
            <li><span>Price</span><span>${t.specialistPrice}</span></li>
            <li><span>AI notes / recording</span><span>${t.recording ? 'Included' : 'Not included'}</span></li>
            <li><span>Length</span><span>30 minutes</span></li>
          </ul>
          <div class="actions"><button class="btn" data-action="spStage" data-stage="brief" type="button">Request a session</button></div>
        </div>
        <div class="card"><h3>How it works</h3>
          <ol class="brief-list">
            <li>The AI sends the specialist a pre-brief of everything it knows about you.</li>
            <li>You choose whether the session can be recorded.</li>
            <li>You and the specialist discuss and agree on a plan.</li>
            <li>The agreed items are added to your timetable. You confirm before anything is added.</li>
          </ol>
        </div>
      </div>`;
    } else if (st === 'brief') {
      const R = E.realisticHours(S.calendar, S.brainResult, t);
      const skills = S.selectedSkills.map((id) => skillById(id).name);
      const consent = S.specialist.consent;
      body = `<div class="grid-2">
        <div class="card"><p class="eyebrow">AI pre-brief sent to ${esc(sp.name.split(' ')[0])}</p>
          <ul class="brief-list">
            <li><strong>${esc(S.user.name || 'User')}</strong>, ${esc(S.profile.title || '—')} · ${esc(industryLabel(S.profile.industry))}</li>
            <li>Goal: ${esc(goal().label)}</li>
            ${S.profile.tasks ? `<li>Daily tasks: ${esc(S.profile.tasks)}</li>` : ''}
            <li>Brain test: ${S.brainResult.burnout} burnout risk, ${S.brainResult.session}-min sessions, best at ${TIME_LABEL[S.brainResult.time].toLowerCase()}, prefers ${STYLE_LABEL[S.brainResult.style].toLowerCase()}</li>
            <li>Realistic time: ${hrs(S.hours ?? R.hours)}/week · package: ${t.name} (${monthly(t)})</li>
            <li>Skills of interest: ${skills.length ? esc(skills.join(', ')) : 'none chosen yet: suggestions didn\'t fit'}</li>
            ${S.tt ? `<li>Progress so far: ${E.progress(S.tt).pct}%</li>` : ''}
          </ul>
        </div>
        <div class="card"><h3>Can the AI record this session?</h3>
          <div class="options">
            <button type="button" class="option ${consent === 'record' ? 'is-active' : ''}" aria-pressed="${consent === 'record'}" data-action="consent" data-v="record" ${t.recording ? '' : 'disabled'}>
              <strong>Yes, record &amp; take notes</strong><span>${t.recording ? 'The AI turns the specialist\'s suggestions into timetable items for you to confirm.' : 'Available on Gold & Platinum.'}</span></button>
            <button type="button" class="option ${consent === 'no' || !t.recording ? 'is-active' : ''}" aria-pressed="${consent === 'no' || !t.recording}" data-action="consent" data-v="no">
              <strong>No recording</strong><span>Afterwards, answer a few quick questions and the AI schedules what you agreed.</span></button>
          </div>
          <div class="actions"><button class="btn btn-ghost left" data-action="spStage" data-stage="intro" type="button">Back</button><button class="btn" data-action="spStage" data-stage="live" type="button">Start session (simulated)</button></div>
        </div>
      </div>`;
    } else if (st === 'live') {
      const rec = S.specialist.consent === 'record' && t.recording;
      const sk = S.selectedSkills[0] ? skillById(S.selectedSkills[0]).short : 'a core skill';
      body = `<div class="card">
        <div class="row">${person}<span class="spacer"></span>${rec ? '<span class="chip chip-bad"><span class="rec-dot"></span> Recording</span>' : '<span class="chip">Not recorded</span>'}</div>
        <div class="transcript" style="margin-top:20px">
          <p><b>${esc(sp.name.split(' ')[0])}</b>I've read your brief. With ${hrs(S.hours || 4)} a week, let's keep it focused. Start with ${esc(sk)} and apply it to your actual job.</p>
          <p class="me"><b>You</b>That sounds good. I keep falling behind on weekdays though.</p>
          <p><b>${esc(sp.name.split(' ')[0])}</b>Then let's do one hands-on mini-project a week, plus a short check-in with me so you stay accountable.</p>
        </div>
        <div class="actions"><button class="btn" data-action="endSession" type="button">End session</button></div>
      </div>`;
    } else if (st === 'review') {
      const props = S.specialist.proposals;
      body = `<div class="grid-2">
        <div class="card"><p class="eyebrow">AI meeting notes</p>
          <ul class="brief-list">${S.specialist.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
        </div>
        <div class="card"><h3>Proposed timetable items</h3>
          <p class="muted small">Nothing is added until you confirm.</p>
          <div class="stack">${props.map((p) => `<label class="check-item"><input type="checkbox" data-action="toggleProp" data-id="${p.id}" ${p.on ? 'checked' : ''}><span><strong>${esc(p.title)}</strong><br><span class="muted small">${p.minutes} min × ${p.perWeek}/week for ${p.weeks} weeks${p.startWeek > 1 ? `, from week ${p.startWeek}` : ''}</span></span></label>`).join('')}</div>
          <div class="actions"><button class="btn" data-action="addProps" type="button">Add selected to my timetable</button></div>
        </div>
      </div>`;
    } else if (st === 'questions') {
      const f = S.specialist.form;
      body = `<div class="card" style="max-width:640px">
        <h3>Quick follow-up</h3>
        <p class="muted small">The session wasn't recorded, so tell us what you agreed and the AI will schedule it.</p>
        <div class="field"><label for="q-what">What skill or course did the specialist suggest?</label><input id="q-what" type="text" data-bind="specialist.form.title" value="${esc(f.title || '')}" placeholder="e.g. Weekly SQL practice project"></div>
        <div class="grid-2">
          <div class="field"><label for="q-min">Minutes per session</label><select id="q-min" data-bind="specialist.form.minutes" data-num>${[30, 45, 60, 90].map((m) => `<option value="${m}" ${+f.minutes === m ? 'selected' : ''}>${m} min</option>`).join('')}</select></div>
          <div class="field"><label for="q-per">Sessions per week</label><select id="q-per" data-bind="specialist.form.perWeek" data-num>${[1, 2, 3].map((m) => `<option value="${m}" ${+f.perWeek === m ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
          <div class="field"><label for="q-weeks">For how many weeks?</label><input id="q-weeks" type="number" min="1" max="12" data-bind="specialist.form.weeks" data-num value="${esc(f.weeks || 4)}"></div>
          <div class="field"><label for="q-start">Start in week</label><input id="q-start" type="number" min="1" max="12" data-bind="specialist.form.startWeek" data-num value="${esc(f.startWeek || 1)}"></div>
        </div>
        <div class="field"><label for="q-cost">Cost (USD, if any)</label><input id="q-cost" type="number" min="0" data-bind="specialist.form.cost" data-num value="${esc(f.cost || 0)}"></div>
        <div class="actions"><button class="btn" data-action="addForm" type="button">Add to my timetable</button></div>
      </div>`;
    } else if (st === 'done') {
      body = `<div class="card center-card">
        <h2>Added to your timetable</h2>
        <p class="muted">${esc(S.specialist.doneMsg || '')}</p>
        <div class="row" style="justify-content:center"><a class="btn" href="#dashboard">View timetable</a><button class="btn btn-ghost" data-action="spStage" data-stage="intro" type="button">Book another</button></div>
      </div>`;
    }
    return `<section class="screen">${head}${body}</section>`;
  }

  function makeProposals() {
    const sk = S.selectedSkills[0] ? skillById(S.selectedSkills[0]) : null;
    const name = sk ? sk.short : 'your new skill';
    const len = S.brainResult.session;
    S.specialist.proposals = [
      { id: 'p1', title: `Mini-project: use ${name} on a real task from work`, minutes: Math.max(len, 45), perWeek: 1, weeks: 4, startWeek: 1, on: true },
      { id: 'p2', title: 'Specialist check-in', minutes: 30, perWeek: 1, weeks: 4, startWeek: 1, on: true },
      { id: 'p3', title: `Portfolio write-up for your ${goal().noun}`, minutes: len, perWeek: 1, weeks: 2, startWeek: 4, on: false },
    ];
    S.specialist.notes = [
      `Goal confirmed: ${goal().label.toLowerCase()} as a ${S.profile.title || 'professional'}.`,
      `Keep weekday sessions at ${len} min or less. Weekdays are where you fall behind.`,
      `Focus on ${sk ? sk.name : 'one core skill'} first and apply it to real work tasks.`,
      'Weekly 30-min check-in with the specialist for accountability.',
      S.brainResult.burnout !== 'low' ? 'Keep one full rest day per week (burnout risk flagged).' : 'Energy looks good, so a steady pace is fine.',
    ];
  }

  function addSpecialistItems(items) {
    if (!S.tt) S.tt = E.emptyTimetable(S.brainResult, S.hours || 0);
    const n = E.addItems(S.tt, items, S.calendar);
    S.specialist.doneMsg = `${n} session${n === 1 ? '' : 's'} added from your specialist plan: ${items.map((i) => i.title).join('; ')}.`;
    log(`Specialist plan: added ${n} session${n === 1 ? '' : 's'}.`, 'info');
    S.specialist.stage = 'done';
    S.viewWeek = Math.max(1, Math.min(...items.map((i) => i.startWeek || 1)));
  }

  /* ---------- Modal ---------- */
  function showModal(html) {
    document.getElementById('modal').innerHTML = `<div class="modal-backdrop" data-action="backdrop"><div class="card modal" role="dialog" aria-modal="true" aria-labelledby="mTitle">${html}</div></div>`;
    const btn = document.querySelector('#modal .modal .btn:last-child');
    if (btn) btn.focus();
  }
  function closeModal() { document.getElementById('modal').innerHTML = ''; }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  /* ---------- Demo persona ---------- */
  function demoPersona() {
    Object.assign(S, {
      user: { name: 'Linh Tran', email: 'linh@example.com' },
      profile: { title: 'Data analyst', industry: 'fintech', tasks: 'Weekly reporting in Excel, answering data requests from managers, building dashboards' },
      goal: 'promote',
      selfCheck: { 'python-data': 1, prompt: 1, ml: 0, cyber: 0, 'risk-ai': 0, dataviz: 2, payments: 0 },
      brain: { energy: '1', sleep: '1', time: 'evening', focus: '45', style: 'project', overwhelm: '1' },
      onboardStep: 5,
    });
    S.brainResult = E.brainResult(S.brain);
    render();
    toast('Demo persona loaded: Linh, a fintech data analyst aiming for promotion.');
  }

  /* ---------- Actions ---------- */
  const A = {
    goto: (ds) => go(ds.route),
    reset: () => {
      if (!confirm('Reset the demo? This clears all data you entered.')) return;
      S = defaults();
      save();
      closeModal();
      go('onboarding');
    },
    demoPersona,
    pick: (ds) => { setPath(S, ds.path, ds.value); render(); },
    obBack: () => { S.onboardStep = Math.max(0, S.onboardStep - 1); render(); window.scrollTo(0, 0); },
    obNext: () => {
      const err = obValidate();
      if (err) { toast(err); return; }
      if (S.onboardStep === 4) S.brainResult = E.brainResult(S.brain);
      S.onboardStep = Math.min(5, S.onboardStep + 1);
      render();
      window.scrollTo(0, 0);
    },
    selfCheck: (ds) => { S.selfCheck[ds.id] = +ds.level; render(); },
    brain: (ds) => { S.brain[ds.q] = ds.v; render(); },
    startTrial: (ds) => {
      S.trial = { start: Date.now(), paid: !!ds.paid };
      log(ds.paid ? `Subscribed to ${tier().name}.` : `Started 1-week free trial (${tier().name}).`, 'good');
      go('skills');
    },
    toggleSkill: (ds) => {
      const lim = tier().skills;
      const i = S.selectedSkills.indexOf(ds.id);
      if (i >= 0) S.selectedSkills.splice(i, 1);
      else if (S.selectedSkills.length >= lim) {
        if (lim === 1) S.selectedSkills = [ds.id];
        else { toast(`${tier().name} covers up to ${lim} skills at once. Deselect one first, or upgrade.`); return; }
      } else S.selectedSkills.push(ds.id);
      render();
    },
    sync: (ds) => {
      const t = tier();
      const src = D.CAL_SOURCES.find((c) => c.id === ds.id);
      const cal = S.calendar;
      if (S.synced.includes(ds.id)) {
        S.synced = S.synced.filter((x) => x !== ds.id);
        Object.keys(cal.src).forEach((k) => { if (cal.src[k] === ds.id) { delete cal.cells[k]; delete cal.labels[k]; delete cal.src[k]; } });
      } else {
        if (S.synced.length >= t.calendars) {
          toast(`${t.name} syncs ${t.calendars} calendar${t.calendars > 1 ? 's' : ''}. Switch package to sync more, or paint the rest manually.`);
          return;
        }
        S.synced.push(ds.id);
        src.blocks.forEach((b) => { const k = E.key(b.d, b.h); cal.cells[k] = src.type; cal.labels[k] = b.label; cal.src[k] = src.id; });
        toast(`${src.name} synced (sample data).`);
      }
      S.hoursAdj = null; S.hours = null;
      render();
    },
    clearCal: () => { S.calendar = { cells: {}, labels: {}, src: {} }; S.synced = []; S.hoursAdj = null; S.hours = null; render(); },
    paintMode: (ds) => { S.paintMode = ds.mode; render(); },
    finishTime: () => {
      const v = S.hoursAdj ?? +document.getElementById('hoursSlider').value;
      S.hours = v;
      log(`Planning ${hrs(v)} of study per week.`, 'info');
      go('plan');
    },
    filter: (ds) => { S.filters[ds.key] = ds.value; render(); },
    chooseCourse: (ds) => { S.chosen[ds.skill] = ds.id; render(); },
    openPay: payModal,
    closeModal,
    backdrop: (ds, el, e) => { if (e.target === el) closeModal(); },
    confirmPay: () => {
      const courses = S.selectedSkills.map((id) => D.coursesFor(skillById(id)).find((x) => x.id === S.chosen[id]));
      S.tt = E.buildTimetable({ courses, hours: S.hours, calendar: S.calendar, brain: S.brainResult, tier: tier() });
      S.viewWeek = 1; S.selected = null; S.replans = {}; S.notice = null;
      log(`AI built your timetable: ${S.tt.sessions.length} sessions over ${S.tt.weeksPlanned} week${S.tt.weeksPlanned > 1 ? 's' : ''}.`, 'good');
      closeModal();
      go('dashboard');
      toast('Timetable built. Your sessions are in your calendar.');
    },
    week: (ds) => { S.viewWeek = +ds.week; render(); },
    selectSession: (ds) => { S.selected = S.selected === +ds.id ? null : +ds.id; render(); },
    deselect: () => { S.selected = null; render(); },
    slot: (ds) => {
      if (!S.selected) { toast('Select a session first, then click a free slot to move it.'); return; }
      const res = E.moveSession(S.tt, S.selected, S.viewWeek, +ds.day, +ds.hour, S.calendar);
      if (res.ok) { log(`Manual edit: ${esc(res.message)}`, 'info'); S.notice = { type: 'info', html: esc(res.message) }; S.selected = null; }
      else toast(res.message);
      render();
    },
    markDone: (ds) => markDone(+ds.id),
    markMissed: (ds) => handleMiss(+ds.id),
    completeNext: () => { const n = E.nextSession(S.tt); if (n) markDone(n.id); },
    missNext: () => { const n = E.nextSession(S.tt); if (n) handleMiss(n.id); },
    dismissNotice: () => { S.notice = null; render(); },
    checkin: (ds) => {
      const next = E.nextSession(S.tt);
      const wk = next ? next.week : S.viewWeek;
      if (ds.v === 'tired') {
        const msg = E.lighten(S.tt, wk, S.calendar);
        S.notice = { type: 'info', html: msg ? esc(msg) : 'Noted. Your week is already light, so take it easy.' };
        log('Check-in: exhausted → AI lightened your week.', 'warn');
      } else {
        S.notice = { type: 'good', html: ds.v === 'great' ? 'Great to hear! Keep the rhythm going.' : 'Thanks for checking in. Your plan stays as it is.' };
        log(`Check-in: energy ${ds.v === 'great' ? 'great' : 'okay'}.`, 'info');
      }
      render();
    },
    spStage: (ds) => { S.specialist.stage = ds.stage; render(); window.scrollTo(0, 0); },
    consent: (ds) => { S.specialist.consent = ds.v; render(); },
    endSession: () => {
      const rec = S.specialist.consent === 'record' && tier().recording;
      if (rec) { makeProposals(); S.specialist.stage = 'review'; }
      else { S.specialist.form = { title: '', minutes: 45, perWeek: 1, weeks: 4, startWeek: 1, cost: 0, ...S.specialist.form }; S.specialist.stage = 'questions'; }
      log(`Specialist session ended (${rec ? 'recorded' : 'not recorded'}).`, 'info');
      render();
    },
    toggleProp: (ds) => { const p = S.specialist.proposals.find((x) => x.id === ds.id); if (p) p.on = !p.on; save(); },
    addProps: () => {
      const items = S.specialist.proposals.filter((p) => p.on);
      if (!items.length) { toast('Select at least one item, or go back.'); return; }
      addSpecialistItems(items);
      render();
    },
    addForm: () => {
      const f = S.specialist.form;
      if (!String(f.title || '').trim()) { toast('Please enter what the specialist suggested.'); return; }
      const item = { title: f.title.trim(), minutes: +f.minutes || 45, perWeek: +f.perWeek || 1, weeks: Math.min(12, Math.max(1, +f.weeks || 4)), startWeek: Math.min(12, Math.max(1, +f.startWeek || 1)) };
      addSpecialistItems([item]);
      render();
    },
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const fn = A[el.dataset.action];
    if (!fn) return;
    if (el.tagName !== 'INPUT') e.preventDefault();
    fn(el.dataset, el, e);
  });

  function readInput(el) {
    if (el.dataset.bool !== undefined) return el.checked;
    if (el.dataset.num !== undefined) return el.value === '' ? 0 : +el.value;
    return el.value;
  }
  document.addEventListener('input', (e) => {
    const el = e.target;
    if (el.id === 'hoursSlider') {
      const v = +el.value;
      S.hoursAdj = v;
      document.getElementById('adjOut').textContent = hrs(v);
      document.getElementById('adjWarn').hidden = v <= +el.dataset.maxReal;
      const b = document.querySelector('[data-action="finishTime"]');
      if (b) b.textContent = `Use ${hrs(v)} per week`;
      save();
      return;
    }
    if (el.dataset.bind && el.dataset.rerender === undefined) { setPath(S, el.dataset.bind, readInput(el)); save(); }
  });
  document.addEventListener('change', (e) => {
    const el = e.target;
    if (!el.dataset.bind) return;
    setPath(S, el.dataset.bind, readInput(el));
    if (el.dataset.bind === 'target') { S.hoursAdj = null; S.hours = null; }
    if (el.dataset.rerender !== undefined) render(); else save();
  });

  document.getElementById('tierSelect').addEventListener('change', (e) => setTier(e.target.value));
  A.setTier = (ds) => { if (ds.id !== S.tier) setTier(ds.id); };

  function setTier(id) {
    S.tier = id;
    S.hoursAdj = null; // buffer rules differ per package
    const t = tier();
    const notes = [];
    if (S.selectedSkills.length > t.skills) { S.selectedSkills = S.selectedSkills.slice(0, t.skills); notes.push(t.skills === 1 ? 'kept your first skill' : `kept your first ${t.skills} skills`); }
    if (S.synced.length > t.calendars) notes.push(`${S.synced.length} calendars stay synced for this demo`);
    if (S.tt) {
      const before = S.tt.weeksPlanned;
      E.extendPlan(S.tt, S.calendar, t.weeks);
      if (S.tt.weeksPlanned > before) notes.push(`timetable extended to ${S.tt.weeksPlanned} weeks`);
    }
    render();
    toast(`Switched to ${t.name} (${monthly(t)})${notes.length ? ': ' + notes.join(', ') : ''}.`);
  }

  const SCREENS = { onboarding: scrOnboarding, skills: scrSkills, time: scrTime, plan: scrPlan, dashboard: scrDashboard, specialist: scrSpecialist };
  render();
})();
