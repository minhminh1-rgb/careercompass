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
      id: c.id, skillId: c.skillId, name: c.name, format: c.format, totalMin: c.hours * 60, color: i % 3, kind: 'course',
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

  /* ---------- Member area: courses, lessons & study materials ---------- */
  const FORMAT_BY_SUFFIX = { express: 'video', project: 'project', live: 'live' };
  // Older saved timetables have no `format`, so fall back to the course id suffix.
  const formatOf = (c) => c.format || FORMAT_BY_SUFFIX[String(c.id).split('-').pop()] || 'video';

  function nextSessionOf(tt, courseId) {
    return tt.sessions.filter((s) => s.courseId === courseId && s.status === 'planned').sort((a, b) => sortKey(a) - sortKey(b))[0] || null;
  }

  // One lesson per timetable session, spread over the skill's 5 topics. The timetable stays the
  // single source of truth: lesson j is done when j < completed sessions of the course.
  function lessonsFor(tt, course) {
    const topics = D.TOPICS[course.skillId] || [[course.name, '']];
    const total = Math.max(1, Math.ceil(course.totalMin / Math.max(1, tt.len)));
    const done = Math.min(total, tt.sessions.filter((s) => s.courseId === course.id && s.status === 'done').length);
    const per = Math.ceil(total / topics.length);
    const list = [];
    for (let j = 0; j < total; j++) {
      const m = Math.min(topics.length - 1, Math.floor(j / per));
      list.push({
        idx: j, module: m, title: topics[m][0], idea: topics[m][1],
        part: j - m * per + 1, parts: Math.min(per, total - m * per),
        minutes: Math.min(tt.len, course.totalMin - j * tt.len),
        done: j < done, current: j === done,
      });
    }
    return { list, done, total, topics };
  }

  const STYLE_ORDER = {
    video: ['video', 'cards', 'quiz', 'reading', 'task', 'audio'],
    reading: ['reading', 'cards', 'quiz', 'video', 'task', 'audio'],
    project: ['task', 'video', 'quiz', 'reading', 'cards', 'audio'],
    live: ['live', 'video', 'task', 'quiz', 'reading', 'cards', 'audio'],
  };
  const STYLE_WHY = {
    video: 'you learn best by watching videos',
    reading: 'you learn best with reading & notes',
    project: 'you learn best with hands-on projects',
    live: 'you learn best through live discussion',
  };
  const FORMAT_NATIVE = { video: 'video', project: 'task', live: 'live' };

  // Material tabs ordered for this person's brain test and this course's format.
  function materialsFor(brain, course) {
    const style = STYLE_ORDER[brain.style] ? brain.style : 'video';
    let order = STYLE_ORDER[style].slice();
    const native = FORMAT_NATIVE[formatOf(course)];
    if (native && order.indexOf(native) !== 0) {
      order = order.filter((x) => x !== native);
      order.splice(1, 0, native);
    }
    const tired = brain.burnout && brain.burnout !== 'low';
    return order.map((id, i) => {
      let why = '';
      if (i === 0) why = `Recommended first because ${STYLE_WHY[style]}.`;
      else if (id === native) why = 'This is the core format of the course you chose.';
      else if (tired && (id === 'audio' || id === 'cards')) why = `Low-energy option: your brain test shows ${brain.burnout} burnout risk, so this is lighter for tired days.`;
      return { ...D.MATERIALS[id], recommended: i === 0, lowEnergy: !!tired && (id === 'audio' || id === 'cards'), why };
    });
  }

  // Add a course to an existing timetable without touching other courses or progress.
  function addCourse(tt, course, calendar, perWeek) {
    const idx = tt.courses.length;
    const color = tt.courses.filter((c) => c.kind === 'course').length % 3;
    const rest = restDayFor(tt.brain);
    const used = new Set(tt.pattern.map((p) => key(p.day, p.hour)));
    const picked = [];
    for (let k = 0; k < perWeek; k++) {
      let best = null;
      for (let d = 0; d < 7; d++) {
        if (d === rest) continue;
        const onDay = tt.pattern.filter((p) => p.day === d).length + picked.filter((p) => p.d === d).length;
        for (const h of HOURS) {
          if (isBusy(calendar, d, h) || used.has(key(d, h))) continue;
          if (picked.some((p) => p.d === d && Math.abs(p.h - h) < 2)) continue;
          const score = prefScore(d, h, tt.brain) - onDay * 1.5;
          if (!best || score > best.score) best = { d, h, score };
        }
      }
      if (!best) break;
      picked.push(best);
      used.add(key(best.d, best.h));
    }
    if (!picked.length) return { ok: false, message: 'Your calendar has no free slot left for another course. Free up some time first.' };

    tt.courses.push({ id: course.id, skillId: course.skillId, name: course.name, format: course.format, totalMin: course.hours * 60, color, kind: 'course' });
    picked.sort((a, b) => (a.d - b.d) || (a.h - b.h));
    picked.forEach((p) => tt.pattern.push({ day: p.d, hour: p.h, course: idx }));

    // Fill the weeks that are already planned, starting after the next planned session.
    const ns = nextSession(tt);
    const fromWeek = ns ? ns.week : tt.weeksPlanned + 1;
    const after = (w, d, h) => !ns || w > ns.week || d * 100 + h > ns.day * 100 + ns.hour;
    let rem = course.hours * 60;
    let added = 0;
    for (let w = fromWeek; w <= tt.weeksPlanned && rem > 0; w++) {
      for (const p of picked) {
        if (rem <= 0) break;
        let day = p.d;
        let hour = p.h;
        if (occupied(tt, w).has(key(day, hour)) || !after(w, day, hour)) {
          const alt = bestFree(tt, calendar, w, w === fromWeek && ns ? { day: ns.day, hour: ns.hour } : null);
          if (!alt) continue;
          day = alt.day; hour = alt.hour;
        }
        const minutes = Math.min(tt.len, rem);
        tt.sessions.push({ id: tt.nextId++, courseId: course.id, week: w, day, hour, minutes, status: 'planned' });
        rem -= minutes;
        added++;
      }
    }
    const lastFilled = Math.max(tt.weeksPlanned, fromWeek - 1);
    const moreWeeks = rem > 0 ? Math.ceil(rem / (picked.length * tt.len)) : 0;
    tt.weeksNeeded = Math.min(104, Math.max(tt.weeksNeeded, lastFilled + moreWeeks));
    return { ok: true, perWeek: picked.length, added };
  }

  // After importing new busy times, move any planned session that now clashes.
  function resolveClashes(tt, calendar) {
    let moved = 0;
    tt.sessions.filter((s) => s.status === 'planned' && isBusy(calendar, s.day, s.hour)).forEach((s) => {
      for (let w = s.week; w <= s.week + 4; w++) {
        const slot = bestFree(tt, calendar, w, null, s.id);
        if (slot) { Object.assign(s, { week: w, day: slot.day, hour: slot.hour, moved: true }); moved++; return; }
      }
    });
    return moved;
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
    formatOf, nextSessionOf, lessonsFor, materialsFor, addCourse, resolveClashes,
  };
})();
