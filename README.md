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
4. **Phase 3 Time & package**: the package card shows each tier's price (click one to switch). Click **Sync** on Work + Family calendars. Watch *"You realistically have X hrs/week"* and its breakdown (commitments, rest, buffer, burnout guard). Try painting busy blocks on the grid. Toggle "black out private details".
5. **Phase 4 Plan**: choose a course (designed by in-house specialists) → **Pay & build my timetable** (demo checkout).
6. **Track**: click **I missed my next session**. The AI moves it and says whether you're still on track. Click a session, then a free slot, to move it manually.
7. **Switch package** (top right: Silver / Gold / Platinum) to show the differences: Silver plans 2 weeks and allows 1 auto-replan per week; Platinum adds check-ins (try "Exhausted") and job-posting evidence on skills.
8. **Specialist**: request a session → AI pre-brief → choose *record* (AI notes + proposed items to confirm) or *no recording* (short questionnaire) → items appear in the timetable.

## Files
| File | Purpose |
|---|---|
| `index.html` | Landing / pitch page |
| `app.html` | App shell (hash-routed screens) |
| `css/styles.css` | Design tokens (light + dark mode), layout, components |
| `js/data.js` | Mock data: skills, courses, brain test, packages, sample calendars |
| `js/engine.js` | Simulated AI: skill ranking, realistic hours, course matching, timetable building, replanning |
| `js/app.js` | State (localStorage), screens, interactions |

## Notes
- Job-posting percentages on Platinum skill cards and the "payoff insight" are **illustrative demo data**, labelled as such in the UI.
- Package prices are assumed for the MVP: Silver $9.99, Gold $19.99, Platinum $34.99 per month. All courses are included in every package.
