/* CareerCompass: simulated "AI" engine.
   Deterministic rules stand in for the AI so the demo is reliable offline. */
window.CC = window.CC || {};

CC.engine = (() => {
  const D = CC.data;
  const { DAYS, HOURS } = D;
  const key = (d, h) => d + '-' + h;
  const sortKey = (s) => s.week * 1000 + s.day * 100 + s.hour;
  const round1 = (n) => Math.round(n * 10) / 10;

  /* ---------- Phase 1: brain test ---------- */
  function brainResult(a) {
    const score = (+a.energy || 0) + (+a.sleep || 0) + (+a.overwhelm || 0);
    const burnout = score <= 1 ? 'low' : score <= 3 ? 'medium' : 'high';
    const focus = +a.focus || 45;
    const session = burnout === 'high' ? Math.min(focus, 45) : focus;
    return { burnout, burnoutScore: score, focus, session, time: a.time || 'varies', style: a.style || 'video' };
  }

  /* ---------- Phase 2: skill ranking ---------- */
  const GOAL_LEAD = {
    keep: 'Protects your current role.',
    promote: 'Strengthens your promotion case.',
    switch: 'Opens a door into a new field.',
  };

  function rankSkills(profile, goal, selfCheck) {
    const sc = selfCheck || {};
    return D.SKILLS.map((s) => {
      let score = 0;
      if (s.industries.includes(profile.industry)) score += 3;
      else if (s.industries.includes('all')) score += 2;
      else if (profile.industry === 'other') score += 0.5;
      else score -= 2;
      if (s.goals.includes(goal)) score += 3;
      const lvl = sc[s.id];
      if (lvl === 2) score -= 4;          // already confident → less useful
      else if (lvl === 1) score += 0.5;
      else if (lvl === 0) score += 1.5;   // clear gap
      score += s.demand / 50;
      const hoursNeeded = Math.round(s.hours * (lvl === 1 ? 0.6 : 1));
      const levelNote = lvl === 1 ? ' You already know some of this, so we shortened the estimate.' : lvl === 0 ? ' Your skills check shows this is a gap.' : '';
      return { ...s, score, hoursNeeded, whyFull: `${GOAL_LEAD[goal] || ''} ${s.why}${levelNote}`.trim() };
    }).sort((a, b) => b.score - a.score).slice(0, 5);
  }

  /* ---------- Phase 3: realistic hours ---------- */
  function realisticHours(calendar, brain, tier) {
    const total = 7 * HOURS.length;
    const busy = Object.keys(calendar.cells || {}).length;
    const free = total - busy;
    const steps = [];
    steps.push({ label: 'Waking hours in your week (06:00–23:00)', value: total });
    steps.push({ label: 'Fixed commitments from your calendar', value: -busy });
    let h = free * 0.25;
    steps.push({ label: 'Keep ~75% of free time for rest, meals, chores & people', value: -(free - h) });
    if (tier.buffer) {
      const b = h * 0.15;
      steps.push({ label: 'Buffer for unexpected events (15%)', value: -b });
      h -= b;
    }
    const cut = { low: 0, medium: 0.15, high: 0.3 }[brain.burnout] || 0;
    if (cut) {
      steps.push({ label: `Burnout guard: ${brain.burnout} risk from your brain test (−${cut * 100}%)`, value: -h * cut });
      h -= h * cut;
    }
    const hours = Math.max(1, Math.round(h * 2) / 2);
    return { hours, free, busy, total, steps: steps.map((s) => ({ ...s, value: round1(s.value) })) };
  }

  /* ---------- Phase 4: course matching ---------- */
  function matchCourses(skillId, allocHours, brain, filters, refined) {
    const skill = D.SKILLS.find((s) => s.id === skillId);
    if (!skill) return [];
    const want = D.STYLE_FORMAT[brain.style];
    let list = D.coursesFor(skill).map((c) => ({
      ...c,
      weeks: Math.ceil(c.hours / Math.max(0.5, allocHours)),
      styleMatch: c.format === want,
    }));
    if (refined && filters) {
      if (filters.format && filters.format !== 'all') list = list.filter((c) => c.format === filters.format);
      if (filters.maxWeeks) list = list.filter((c) => c.weeks <= filters.maxWeeks);
    }
    return list.sort((a, b) => (b.styleMatch - a.styleMatch) || (a.weeks - b.weeks));
  }

  /* ---------- Scheduling helpers ---------- */
  function prefScore(d, h, brain) {
    let s = 0;
    const t = brain.time;
    if (t === 'morning' && h >= 6 && h < 9) s += 3;
    if (t === 'evening' && h >= 18 && h <= 21) s += 3;
    if (t === 'weekend' && d >= 5 && h >= 9 && h <= 17) s += 3;
    if (t === 'varies' && h >= 7 && h <= 21) s += 1;
    if (h >= 22 || h < 7) s -= 2;
    if (brain.burnout === 'high' && h >= 21) s -= 2;
    if (d >= 5 && h >= 9 && h <= 18) s += 1;
    return s;
  }

  const isBusy = (calendar, d, h) => !!(calendar.cells && calendar.cells[key(d, h)]);

  function occupied(tt, week, exceptId) {
    const set = new Set();
    tt.sessions.forEach((s) => { if (s.week === week && s.id !== exceptId) set.add(key(s.day, s.hour)); });
    return set;
  }

  function dayCount(tt, week, day, exceptId) {
    return tt.sessions.filter((s) => s.week === week && s.day === day && s.id !== exceptId).length;
  }

  // Best free slot in a week, optionally only after a given (day, hour).
  function bestFree(tt, calendar, week, after, exceptId) {
    const occ = occupied(tt, week, exceptId);
    let best = null;
    for (let d = 0; d < 7; d++) {
      for (const h of HOURS) {
        if (after && d * 100 + h <= after.day * 100 + after.hour) continue;
        if (isBusy(calendar, d, h) || occ.has(key(d, h))) continue;
        let score = prefScore(d, h, tt.brain) - dayCount(tt, week, d, exceptId) * 1.5;
        if (d === restDayFor(tt.brain)) score -= 3;          // protect the rest day
        if (after) score -= 0.4 * (d - after.day);           // sooner is better when recovering
        if (!best || score > best.score) best = { day: d, hour: h, score };
      }
    }
    return best;
  }

  function startDate() {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    const dow = (t.getDay() + 6) % 7; // Mon=0
    if (dow !== 0) t.setDate(t.getDate() + (7 - dow)); // next Monday
    return t.toISOString();
  }

  function dateOf(tt, week, day) {
    const d = new Date(tt.start);
    d.setDate(d.getDate() + (week - 1) * 7 + day);
    return d;
  }

  const fmtDate = (d) => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const fmtSlot = (tt, s) => `${fmtDate(dateOf(tt, s.week, s.day))}, ${String(s.hour).padStart(2, '0')}:00`;

  // Medium/high burnout risk → keep one day study-free (Sunday, or Friday for weekend learners).
  function restDayFor(brain) {
    return !brain || brain.burnout === 'low' ? -1 : (brain.time === 'weekend' ? 4 : 6);
  }

  // Weekly slot pattern: spread sessions across days, best-preferred hours first.
  function pickPattern(calendar, brain, need) {
    const maxPerDay = brain.burnout === 'high' ? 1 : 2;
    const restDay = restDayFor(brain);
    const cand = [];
    for (let d = 0; d < 7; d++) for (const h of HOURS) {
      if (!isBusy(calendar, d, h)) cand.push({ d, h, score: prefScore(d, h, brain), rest: d === restDay });
    }
    cand.sort((a, b) => (b.score - a.score) || (a.d - b.d) || (a.h - b.h));
    const picked = [];
    const perDay = Array(7).fill(0);
    const tooClose = (c) => picked.some((p) => p.d === c.d && Math.abs(p.h - c.h) < 2);
    for (let cap = 1; cap <= maxPerDay && picked.length < need; cap++) {
      for (const c of cand) {
        if (picked.length >= need) break;
        if (c.rest || picked.includes(c) || perDay[c.d] >= cap || tooClose(c)) continue;
        picked.push(c); perDay[c.d]++;
      }
    }
    for (const c of cand) { // fallback: ignore spacing rules if still short
      if (picked.length >= need) break;
      if (!picked.includes(c)) { picked.push(c); perDay[c.d]++; }
    }
    return picked.sort((a, b) => (a.d - b.d) || (a.h - b.h));
  }

  function remaining(tt, courseId) {
    const c = tt.courses.find((x) => x.id === courseId);
    const used = tt.sessions.filter((s) => s.courseId === courseId).reduce((a, s) => a + s.minutes, 0);
    return c ? c.totalMin - used : 0;
  }

  function generateWeeks(tt, calendar, toWeek) {
    for (let w = tt.weeksPlanned + 1; w <= toWeek; w++) {
      if (tt.courses.filter((c) => c.kind === 'course').every((c) => remaining(tt, c.id) <= 0)) break;
      for (const p of tt.pattern) {
        const c = tt.courses[p.course];
        const rem = remaining(tt, c.id);
        if (rem <= 0) continue;
        let { day, hour } = p;
        if (occupied(tt, w).has(key(day, hour))) {
          const alt = bestFree(tt, calendar, w);
          if (!alt) continue;
          day = alt.day; hour = alt.hour;
        }
        tt.sessions.push({ id: tt.nextId++, courseId: c.id, week: w, day, hour, minutes: Math.min(tt.len, rem), status: 'planned' });
      }
      tt.weeksPlanned = w;
    }
    return tt;
  }

  function emptyTimetable(brain, hours) {
    return {
      start: startDate(), len: brain.session, brain: { ...brain }, hours: hours || 0,
      pattern: [], courses: [], sessions: [], nextId: 1, weeksNeeded: 1, weeksPlanned: 0, streak: 0, shortfall: 0,
    };
  }

  function buildTimetable({ courses, hours, calendar, brain, tier }) {
    const tt = emptyTimetable(brain, hours);
    const len = tt.len;
    const n = courses.length;
    const perWeekTotal = Math.max(n, Math.round((hours * 60) / len));
    const per = courses.map((_, i) => Math.floor(perWeekTotal / n) + (i < perWeekTotal % n ? 1 : 0));
    const need = per.reduce((a, b) => a + b, 0);
    const slots = pickPattern(calendar, brain, need);
    const seq = [];
    const left = per.slice();
    while (seq.length < need) for (let i = 0; i < n; i++) if (left[i] > 0) { seq.push(i); left[i]--; }
    tt.pattern = slots.map((s, i) => ({ day: s.d, hour: s.h, course: seq[i] }));
    tt.shortfall = Math.max(0, need - slots.length);
    tt.courses = courses.map((c, i) => ({
      id: c.id, skillId: c.skillId, name: c.name, totalMin: c.hours * 60, color: i % 3, kind: 'course',
    }));
    tt.weeksNeeded = Math.min(104, Math.max(...tt.courses.map((c, i) => {
      const perWeekMin = tt.pattern.filter((p) => p.course === i).length * len;
      return perWeekMin ? Math.ceil(c.totalMin / perWeekMin) : 104;
    })));
    generateWeeks(tt, calendar, Math.min(tt.weeksNeeded, tier.weeks));
    return tt;
  }

  function extendPlan(tt, calendar, weeksLimit) {
    const target = Math.min(tt.weeksNeeded, weeksLimit);
    if (target > tt.weeksPlanned) generateWeeks(tt, calendar, target);
    return tt;
  }

  const lastWeek = (tt) => Math.max(tt.weeksPlanned, 1, ...tt.sessions.map((s) => s.week));
  const endWeek = (tt) => Math.max(tt.weeksNeeded, ...tt.sessions.map((s) => s.week));
  const endDate = (tt) => dateOf(tt, endWeek(tt), 6);

  function nextSession(tt) {
    return tt.sessions.filter((s) => s.status === 'planned').sort((a, b) => sortKey(a) - sortKey(b))[0] || null;
  }

  function courseOf(tt, s) { return tt.courses.find((c) => c.id === s.courseId) || { name: 'Session', color: 0 }; }

  /* ---------- Replanning ---------- */
  function replan(tt, id, calendar) {
    const s = tt.sessions.find((x) => x.id === id);
    if (!s) return null;
    const before = endWeek(tt);
    const from = { week: s.week, day: s.day, hour: s.hour };
    let target = null;
    for (let w = s.week; w <= s.week + 4 && !target; w++) {
      // never the same evening you just missed. Start from the next day.
      const slot = bestFree(tt, calendar, w, w === s.week ? { day: from.day, hour: 99 } : null, s.id);
      if (slot) target = { week: w, day: slot.day, hour: slot.hour };
    }
    if (!target) return { message: 'No free slot found in the next 4 weeks. Try freeing up time in your calendar.', delayed: true };
    Object.assign(s, target, { moved: true, missed: (s.missed || 0) + 1 });
    tt.streak = 0;
    const after = endWeek(tt);
    const name = courseOf(tt, s).name;
    const moved = `Moved “${name}” from ${fmtSlot(tt, from)} to ${fmtSlot(tt, s)}.`;
    if (after > before) {
      return { delayed: true, message: `${moved} Your finish date moves back ${after - before} week to ${fmtDate(endDate(tt))}. Falling behind is recoverable.` };
    }
    return { delayed: false, message: `${moved} You're still on track to finish by ${fmtDate(endDate(tt))}.` };
  }

  function moveSession(tt, id, week, day, hour, calendar) {
    const s = tt.sessions.find((x) => x.id === id);
    if (!s) return { ok: false, message: 'Session not found.' };
    if (isBusy(calendar, day, hour) || occupied(tt, week, id).has(key(day, hour))) return { ok: false, message: 'That slot is not free.' };
    const from = { week: s.week, day: s.day, hour: s.hour };
    Object.assign(s, { week, day, hour, moved: true });
    return { ok: true, message: `Moved “${courseOf(tt, s).name}” from ${fmtSlot(tt, from)} to ${fmtSlot(tt, s)}.` };
  }

  // Platinum check-in: user is exhausted → move one session out of the given week.
  function lighten(tt, week, calendar) {
    const inWeek = tt.sessions.filter((s) => s.week === week && s.status === 'planned').sort((a, b) => sortKey(b) - sortKey(a));
    if (!inWeek.length) return null;
    const s = inWeek[0];
    const from = { week: s.week, day: s.day, hour: s.hour };
    const w = endWeek(tt);
    let target = null;
    for (let x = Math.max(w, week + 1); x <= w + 2 && !target; x++) {
      const slot = bestFree(tt, calendar, x, null, s.id);
      if (slot) target = { week: x, day: slot.day, hour: slot.hour };
    }
    if (!target) return null;
    Object.assign(s, target, { moved: true });
    return `Lightened week ${week}: moved “${courseOf(tt, s).name}” from ${fmtSlot(tt, from)} to ${fmtSlot(tt, s)}. Rest matters too.`;
  }

  /* ---------- Phase 5: specialist items ---------- */
  function addItems(tt, items, calendar) {
    let added = 0;
    items.forEach((it) => {
      const cid = 'sp-' + tt.nextId++;
      tt.courses.push({ id: cid, name: it.title, totalMin: it.minutes * it.perWeek * it.weeks, color: 3, kind: 'specialist' });
      const startW = Math.max(1, it.startWeek || 1);
      for (let w = startW; w < startW + it.weeks; w++) {
        for (let i = 0; i < it.perWeek; i++) {
          const slot = bestFree(tt, calendar, w);
          if (!slot) continue;
          tt.sessions.push({ id: tt.nextId++, courseId: cid, week: w, day: slot.day, hour: slot.hour, minutes: it.minutes, status: 'planned' });
          added++;
        }
      }
    });
    return added;
  }

  /* ---------- Tracking ---------- */
  function progress(tt) {
    const total = tt.courses.reduce((a, c) => a + c.totalMin, 0);
    const done = tt.sessions.filter((s) => s.status === 'done').reduce((a, s) => a + s.minutes, 0);
    const perCourse = tt.courses.map((c) => {
      const d = tt.sessions.filter((s) => s.courseId === c.id && s.status === 'done').reduce((a, s) => a + s.minutes, 0);
      return { ...c, done: d, pct: c.totalMin ? Math.round((d / c.totalMin) * 100) : 0 };
    });
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0, perCourse };
  }

  return {
    key, sortKey, brainResult, rankSkills, realisticHours, matchCourses, buildTimetable, extendPlan, emptyTimetable,
    nextSession, replan, moveSession, lighten, addItems, progress, lastWeek, endWeek, endDate, dateOf,
    fmtDate, fmtSlot, courseOf, isBusy,
  };
})();
