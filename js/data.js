/* CareerCompass: mock data for the MVP demo.
   Everything here is sample data so the prototype works offline. */
window.CC = window.CC || {};

(() => {
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const HOURS = [];
  for (let h = 6; h <= 22; h++) HOURS.push(h); // waking hours 06:00–23:00 (17 one-hour slots/day)

  const INDUSTRIES = [
    { id: 'ai', label: 'AI & software development' },
    { id: 'fintech', label: 'Fintech' },
    { id: 'green', label: 'Green & energy engineering' },
    { id: 'other', label: 'Another field' },
  ];

  const GOALS = [
    { id: 'keep', label: 'Keep my current job safe', desc: 'Future-proof the role I have as AI changes it', noun: 'current role' },
    { id: 'promote', label: 'Get promoted', desc: 'Build the skills for the next level up', noun: 'promotion case' },
    { id: 'switch', label: 'Switch careers', desc: 'Move into a new, in-demand field', noun: 'career switch' },
  ];

  // Subscription packages, taken from the brief's feature table.
  const TIERS = {
    silver: {
      id: 'silver', name: 'Silver', price: 9.99, perks: '1 calendar · 2 weeks planned · limited auto-replan', calendars: 1, buffer: false, weeks: 2, skills: 1,
      replan: 'limited', motivation: 'basic', refined: false, detail: 1,
      specialist: 'Pay per session', specialistPrice: 'Standard rate', recording: false,
    },
    gold: {
      id: 'gold', name: 'Gold', price: 19.99, perks: '2 calendars + buffer · 8 weeks planned · auto-replan', calendars: 2, buffer: true, weeks: 8, skills: 3,
      replan: 'auto', motivation: 'insights', refined: true, detail: 2,
      specialist: 'Discounted rate every session', specialistPrice: 'Discounted rate', recording: true,
    },
    platinum: {
      id: 'platinum', name: 'Platinum', price: 34.99, perks: 'Multiple calendars · unlimited planning · continuous replanning + check-ins', calendars: 3, buffer: true, weeks: 520, skills: 99,
      replan: 'continuous', motivation: 'full', refined: true, detail: 3,
      specialist: '1 free priority session every 3 months', specialistPrice: 'Free (1 per 3 months)', recording: true,
    },
  };

  // demand = share of sampled job postings mentioning the skill (DEMO DATA, illustrative only)
  const SKILLS = [
    {
      id: 'prompt', name: 'AI-assisted workflows & prompt engineering', short: 'AI workflows',
      industries: ['all'], goals: ['keep', 'promote'], hours: 20, cost: [0, 60], demand: 78,
      why: 'Lets you hand repetitive work to AI tools and keep the judgement calls for yourself.',
      role: 'Start by automating the routine parts of your daily tasks: reports, emails and first drafts.',
      evidence: 'AI and big-data skills top the WEF 2025 list of fastest-growing skills.',
    },
    {
      id: 'python-data', name: 'Python for data analysis', short: 'Python data',
      industries: ['ai', 'fintech', 'green'], goals: ['keep', 'promote', 'switch'], hours: 60, cost: [30, 200], demand: 72,
      why: 'The common language of data work across tech, finance and energy.',
      role: 'Replace manual spreadsheet work with repeatable scripts your team can reuse.',
      evidence: 'Python is the most requested programming language in data-related postings.',
    },
    {
      id: 'ml', name: 'Machine learning fundamentals', short: 'ML basics',
      industries: ['ai', 'fintech'], goals: ['promote', 'switch'], hours: 80, cost: [80, 300], demand: 64,
      why: 'Understand how models are built, evaluated and deployed, and when not to use one.',
      role: 'Lets you lead AI conversations with engineers instead of waiting on them.',
      evidence: 'ML specialist roles appear among the fastest-growing jobs to 2030 in WEF data.',
    },
    {
      id: 'llm-apps', name: 'Building products with LLM APIs', short: 'LLM apps',
      industries: ['ai'], goals: ['switch', 'promote'], hours: 45, cost: [0, 150], demand: 69,
      why: 'Companies are racing to ship AI features, and builders who can do it are scarce.',
      role: 'Prototype an AI feature for your own product within weeks.',
      evidence: 'Postings asking for LLM/GenAI experience grew faster than any other software skill.',
    },
    {
      id: 'mlops', name: 'Cloud & MLOps', short: 'Cloud & MLOps',
      industries: ['ai'], goals: ['promote', 'switch'], hours: 70, cost: [100, 350], demand: 58,
      why: 'Every AI system needs reliable infrastructure to run in production.',
      role: 'Owning deployment makes you the go-to person when models reach production.',
      evidence: 'Cloud certifications are among the most-listed requirements for senior engineers.',
    },
    {
      id: 'cyber', name: 'Cybersecurity essentials', short: 'Security',
      industries: ['ai', 'fintech'], goals: ['keep', 'switch'], hours: 50, cost: [50, 250], demand: 61,
      why: 'More AI means more attack surface, and security skills protect every role.',
      role: 'Spot risky practices in your own team before they become incidents.',
      evidence: 'Network & cybersecurity is a top-3 growing skill in the WEF 2025 report.',
    },
    {
      id: 'payments', name: 'Digital payments & blockchain', short: 'Payments tech',
      industries: ['fintech'], goals: ['switch', 'promote'], hours: 45, cost: [40, 200], demand: 47,
      why: 'Payment rails are being rebuilt, and people who understand them are in demand.',
      role: 'Understand the systems behind the products your team supports.',
      evidence: 'Real-time payments and tokenisation appear in a growing share of fintech postings.',
    },
    {
      id: 'risk-ai', name: 'AI for risk & compliance', short: 'AI risk',
      industries: ['fintech'], goals: ['keep', 'promote'], hours: 40, cost: [60, 220], demand: 55,
      why: 'Regulators expect firms to explain and govern their AI models.',
      role: 'Combine your domain knowledge with AI governance, a rare and valued mix.',
      evidence: 'AI-governance requirements are now common in risk-analyst postings.',
    },
    {
      id: 'energy-data', name: 'Energy data analytics', short: 'Energy data',
      industries: ['green'], goals: ['keep', 'promote', 'switch'], hours: 50, cost: [40, 220], demand: 57,
      why: 'Smart grids and renewables generate huge data, and analysing it is a core skill.',
      role: 'Turn plant or grid data into decisions your managers can act on.',
      evidence: 'Data skills are increasingly required even in traditional engineering postings.',
    },
    {
      id: 'solar', name: 'Solar PV & battery storage design', short: 'Solar & storage',
      industries: ['green'], goals: ['switch', 'promote'], hours: 60, cost: [80, 320], demand: 52,
      why: 'Renewable-energy engineers are among the fastest-growing jobs globally.',
      role: 'Move from general engineering into one of the busiest project areas.',
      evidence: 'Renewable energy engineers rank in the WEF top-15 fastest-growing jobs.',
    },
    {
      id: 'esg', name: 'Carbon accounting & ESG reporting', short: 'ESG reporting',
      industries: ['green', 'fintech'], goals: ['keep', 'switch'], hours: 35, cost: [50, 200], demand: 49,
      why: 'New disclosure rules make emissions reporting a must-have for many companies.',
      role: 'Become the person who can answer "what is our footprint?" with evidence.',
      evidence: 'Environmental stewardship is a fast-rising skill in the WEF 2025 report.',
    },
    {
      id: 'agile', name: 'Agile project leadership', short: 'Leadership',
      industries: ['all'], goals: ['promote'], hours: 30, cost: [30, 180], demand: 60,
      why: 'Promotions go to people who can run work, not just do it.',
      role: 'Practise running sprints and stand-ups on your own team\'s projects.',
      evidence: 'Leadership & social influence is among the top skills employers say are rising.',
    },
    {
      id: 'dataviz', name: 'Data storytelling & dashboards', short: 'Data storytelling',
      industries: ['all'], goals: ['keep', 'promote'], hours: 25, cost: [0, 120], demand: 63,
      why: 'Insights only matter if decision-makers understand them.',
      role: 'Upgrade the reports you already make into dashboards people actually use.',
      evidence: 'Analytical thinking remains the #1 core skill for employers (WEF 2025).',
    },
  ];

  // Each skill has 3 in-house course formats designed by CareerCompass specialists.
  // All courses are included in every subscription package.
  function coursesFor(skill) {
    return [
      {
        id: skill.id + '-express', skillId: skill.id, name: skill.short + ': Express',
        format: 'video', formatLabel: 'Short videos, readings & quizzes',
        hours: Math.max(8, Math.round(skill.hours * 0.7)),
      },
      {
        id: skill.id + '-project', skillId: skill.id, name: skill.short + ': Guided project',
        format: 'project', formatLabel: 'Hands-on project with feedback',
        hours: skill.hours,
      },
      {
        id: skill.id + '-live', skillId: skill.id, name: skill.short + ': Live cohort',
        format: 'live', formatLabel: 'Live small-group classes',
        hours: Math.round(skill.hours * 1.2),
      },
    ];
  }

  const STYLE_FORMAT = { video: 'video', reading: 'video', project: 'project', live: 'live' };

  const BRAIN = [
    {
      id: 'energy', q: 'After a typical workday, your energy is…', numeric: true,
      opts: [['0', 'Still high'], ['1', 'Okay'], ['2', 'Drained']],
    },
    {
      id: 'sleep', q: 'How much do you sleep on work nights?', numeric: true,
      opts: [['0', '7+ hours'], ['1', '6–7 hours'], ['2', 'Under 6 hours']],
    },
    {
      id: 'time', q: 'When do you focus best?',
      opts: [['morning', 'Early morning'], ['evening', 'Evenings'], ['weekend', 'Weekends'], ['varies', 'It varies']],
    },
    {
      id: 'focus', q: 'How long can you focus before needing a break?', numeric: true,
      opts: [['30', '~30 min'], ['45', '~45 min'], ['60', '60+ min']],
    },
    {
      id: 'style', q: 'How do you learn best?',
      opts: [['video', 'Watching videos'], ['project', 'Hands-on projects'], ['reading', 'Reading & notes'], ['live', 'Live discussion']],
    },
    {
      id: 'overwhelm', q: 'In the last month, how often did work leave you overwhelmed?', numeric: true,
      opts: [['0', 'Rarely'], ['1', 'Sometimes'], ['2', 'Often']],
    },
  ];

  const SPECIALISTS = {
    ai: { name: 'Minh Anh Le', role: 'AI & software course specialist', initials: 'ML' },
    fintech: { name: 'Daniel Okafor', role: 'Fintech course specialist', initials: 'DO' },
    green: { name: 'Sofia Lindqvist', role: 'Green energy course specialist', initials: 'SL' },
    other: { name: 'Priya Nair', role: 'Career & skills specialist', initials: 'PN' },
  };

  // Sample calendars used by the mock "Sync" buttons. day: 0=Mon … 6=Sun
  const range = (a, b) => { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; };
  const CAL_SOURCES = [
    {
      id: 'work', name: 'Work calendar', provider: 'Outlook', type: 'work',
      blocks: [0, 1, 2, 3, 4].flatMap((d) => [
        { d, h: 8, label: 'Commute' },
        ...range(9, 16).map((h) => ({ d, h, label: h === 12 ? 'Lunch' : 'Work' })),
        { d, h: 17, label: 'Commute' },
      ]),
    },
    {
      id: 'family', name: 'Family calendar', provider: 'Google', type: 'family',
      blocks: [
        ...[0, 1, 2, 3, 4].flatMap((d) => [{ d, h: 18, label: 'Dinner' }, { d, h: 19, label: 'Kids / family' }]),
        { d: 5, h: 10, label: 'Family outing' }, { d: 5, h: 11, label: 'Family outing' }, { d: 5, h: 12, label: 'Family outing' },
        { d: 6, h: 12, label: 'Lunch with parents' }, { d: 6, h: 13, label: 'Lunch with parents' },
      ],
    },
    {
      id: 'personal', name: 'Personal calendar', provider: 'Google', type: 'private',
      blocks: [
        { d: 1, h: 20, label: 'Therapy' }, { d: 3, h: 20, label: 'Gym' },
        { d: 5, h: 8, label: 'Gym' }, { d: 6, h: 9, label: 'Doctor' },
      ],
    },
  ];

  CC.data = { DAYS, HOURS, INDUSTRIES, GOALS, TIERS, SKILLS, coursesFor, STYLE_FORMAT, BRAIN, SPECIALISTS, CAL_SOURCES };
})();
