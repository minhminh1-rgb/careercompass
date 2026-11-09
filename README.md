# CareerCompass — MVP prototype

Competition MVP for **CareerCompass**: a website that helps busy workers (AI & software, fintech, green energy) pick the right skills, find the hours they *realistically* have, build a timetable, and get replanned automatically when they fall behind.

Everything runs in the browser. The "AI", calendar sync and payments are simulated, so the demo works offline and behaves the same every time.

## How to open
Double-click `index.html` (landing page) → **Try the demo** / **Start free trial** opens `app.html`.
No install or build step. To share online, drag the `ybc` folder onto https://app.netlify.com/drop or push it to GitHub Pages.

Progress is saved in your browser; **Reset demo** (top right) clears it.

## 3-minute demo script for judges
1. **Landing page**: problem stats (WEF 2025, Kahoot 2024), pain points → solution, pricing tiers, B2B2C expansion.
2. **Phase 1 Onboarding**: click **Use demo persona** (Linh, fintech data analyst aiming for promotion) → analysis summary with brain-test results → **Start 1-week free trial**.
3. **Phase 2 Skills**: 5 AI-ranked skills with *why it matters*, time and cost. Pick one (Gold allows up to 3).
4. **Phase 3 Time & package**: the package card shows each tier's price (click one to switch). Click **Connect** on Outlook (work) + Google Calendar (family). Watch *"You realistically have X hrs/week"* and its breakdown (commitments, rest, buffer, burnout guard). Try painting busy blocks on the grid. Toggle "black out private details".
5. **Phase 4 Plan**: choose a course (designed by in-house specialists) → **Build my timetable** (demo checkout).
6. **Dashboard** (the sidebar layout replaces the step bar once the timetable exists):
   - **Add to Google Calendar / Add to Outlook** downloads a real `.ics` file with every planned session (30-min reminders). Import it into a real calendar to show it working. Each upcoming session also has one-click "+ Google Calendar / + Outlook" links.
   - **My courses**, **+ Add course** (adds a second skill without resetting progress; Silver shows the limit) and the dated **Study plan**.
   - Below: click **I missed my next session**. The AI moves it and says whether you're still on track. Click a session, then a free slot, to move it manually.
7. **Courses**: open a course. Each lesson has a video, reading notes, a hands-on task, a quiz, flashcards and an audio summary, ordered by the brain test (Linh learns best hands-on, so the task comes first, and audio/flashcards are flagged as low-energy options). **Finish this session** ticks off the next timetable session.
8. **Your data**: brain-test results and how the plan uses them, skills improving (start marker vs now), mentors contacted, connected calendars and export history.
9. **Specialist**: request a session → AI pre-brief → choose *record* (AI notes + proposed items to confirm) or *no recording* (short questionnaire) → items appear in the timetable, and the mentor appears under Your data.
10. **Switch package** (top right: Silver / Gold / Platinum) to show the differences: Silver plans 2 weeks and allows 1 auto-replan per week; Platinum adds check-ins (try "Exhausted") and job-posting evidence on skills.

**Edit my plan** in the sidebar brings back the Phase 1–4 steps.

## Files
| File | Purpose |
|---|---|
| `index.html` | Landing / pitch page |
| `app.html` | App shell (hash-routed screens) |
| `css/styles.css` | Design tokens (brand palette: #DDDCDB grey, #FD7B41 orange, #EDBF9B peach, #3C4044 charcoal; light only), layout, components |
| `js/data.js` | Mock data: skills, course topics, study materials, brain test, packages, sample calendars |
| `js/engine.js` | Simulated AI: skill ranking, realistic hours, course matching, timetable building, replanning, lessons & material order, adding courses |
| `js/calendar.js` | Real calendar export: `.ics` file + Google Calendar / Outlook one-click links (no API keys) |
| `js/app.js` | State (localStorage), screens (setup phases + sidebar member area), interactions |

## Notes
- Job-posting percentages on Platinum skill cards and the "payoff insight" are **illustrative demo data**, labelled as such in the UI.
- Package prices are assumed for the MVP: Silver $9.99, Gold $19.99, Platinum $34.99 per month. All courses are included in every package.
- Calendar **export** is real (standard iCalendar file). Calendar **import** (reading busy times) is simulated with sample events; a live version would need Google and Microsoft sign-in (OAuth) and a hosted site.
- Course videos, audio and live classes are placeholders; the lesson text, tasks, quizzes and flashcards are generated from sample topic data.
