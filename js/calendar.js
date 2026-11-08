/* CareerCompass: real calendar export.
   Builds a standard iCalendar (.ics) file that Google Calendar and Outlook both import,
   plus one-click "add this session" links. No API keys or sign-in needed. */
window.CC = window.CC || {};

CC.cal = (() => {
  const E = CC.engine;
  const p2 = (n) => String(n).padStart(2, '0');

  // 20261109T190000 (floating local time: imports at the same clock time in the user's zone)
  const local = (d) => `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}T${p2(d.getHours())}${p2(d.getMinutes())}00`;
  const utc = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  // 2026-11-09T19:00:00+07:00
  function isoOffset(d) {
    const off = -d.getTimezoneOffset();
    const sign = off >= 0 ? '+' : '-';
    const a = Math.abs(off);
    return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}:00${sign}${p2(Math.floor(a / 60))}:${p2(a % 60)}`;
  }

  function startOf(tt, s) {
    const d = E.dateOf(tt, s.week, s.day);
    d.setHours(s.hour, 0, 0, 0);
    return d;
  }
  const endOf = (tt, s) => new Date(startOf(tt, s).getTime() + s.minutes * 60000);

  const escText = (t) => String(t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

  // RFC 5545: lines longer than 75 octets are folded with CRLF + one space.
  const enc = new TextEncoder();
  function fold(line) {
    if (enc.encode(line).length <= 75) return line;
    const out = [];
    let cur = '';
    let len = 0;
    for (const ch of line) {
      const b = enc.encode(ch).length;
      if (len + b > 75) { out.push(cur); cur = ' '; len = 1; }
      cur += ch;
      len += b;
    }
    out.push(cur);
    return out.join('\r\n');
  }

  const appLink = (courseId) => (/^https?:$/.test(location.protocol) ? `${location.href.split('#')[0]}#courses/${encodeURIComponent(courseId)}` : '');

  function details(tt, s) {
    const c = E.courseOf(tt, s);
    const link = c.kind === 'course' ? appLink(c.id) : '';
    return `${s.minutes}-minute study session planned by CareerCompass around your real week.${link ? `\nOpen the lesson: ${link}` : ''}`;
  }

  const planned = (tt) => tt.sessions.filter((s) => s.status === 'planned').sort((a, b) => E.sortKey(a) - E.sortKey(b));

  function ics(tt) {
    const stamp = utc(new Date());
    const batch = String(tt.start).slice(0, 10).replace(/-/g, '');
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CareerCompass//Study plan//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'X-WR-CALNAME:CareerCompass study plan',
    ];
    planned(tt).forEach((s) => {
      const c = E.courseOf(tt, s);
      lines.push(
        'BEGIN:VEVENT',
        `UID:cc-${batch}-${s.id}@careercompass.app`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${local(startOf(tt, s))}`,
        `DURATION:PT${s.minutes}M`,
        `SUMMARY:${escText('CareerCompass: ' + c.name)}`,
        `DESCRIPTION:${escText(details(tt, s))}`,
        'CATEGORIES:Study',
        'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escText('Study session: ' + c.name)}`, 'TRIGGER:-PT30M', 'END:VALARM',
        'END:VEVENT',
      );
    });
    lines.push('END:VCALENDAR');
    return lines.map(fold).join('\r\n') + '\r\n';
  }

  function download(text, filename) {
    const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  const qs = (o) => Object.entries(o).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');

  function googleLink(tt, s) {
    const c = E.courseOf(tt, s);
    let ctz = '';
    try { ctz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { /* ignore */ }
    const p = { action: 'TEMPLATE', text: 'CareerCompass: ' + c.name, dates: `${local(startOf(tt, s))}/${local(endOf(tt, s))}`, details: details(tt, s) };
    if (ctz) p.ctz = ctz;
    return 'https://calendar.google.com/calendar/render?' + qs(p);
  }

  function outlookLink(tt, s) {
    const c = E.courseOf(tt, s);
    return 'https://outlook.live.com/calendar/0/deeplink/compose?' + qs({
      path: '/calendar/action/compose', rru: 'addevent',
      subject: 'CareerCompass: ' + c.name,
      startdt: isoOffset(startOf(tt, s)), enddt: isoOffset(endOf(tt, s)),
      body: details(tt, s),
    });
  }

  return { ics, download, googleLink, outlookLink, count: (tt) => planned(tt).length };
})();
