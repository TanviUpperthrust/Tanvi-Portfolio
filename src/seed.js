// First-run content. Everything here is editable in /admin.
// The case study copy is placeholder writing in Tanvi's voice; replace it with the real stories.

export const SEED_PROJECTS = [
  {
    title: 'Paisa: Budgeting App',
    slug: 'paisa-budgeting-app',
    category: 'Mobile · Fintech · 2025',
    tags: ['Research', 'UI'],
    theme: 's1',
    layout: 'phone',
    summary: 'A budgeting app for first-time earners that made tracking money feel less like homework. I redesigned onboarding and the daily spending flow.',
    client: 'Paisa',
    role: 'Lead product designer',
    duration: '14 weeks',
    challenge:
      "Paisa had strong downloads but lost most new users before they logged a single expense. Onboarding asked for bank details, income, savings goals and categories before showing any value.\n\nThe home screen buried the one number people actually cared about: how much they could still spend this month.",
    approach:
      "I ran 18 interviews with new and churned users and watched 9 people onboard in person. The pattern was clear: people wanted to see the app work before trusting it with anything.\n\n- Rebuilt onboarding around a single question, *what do you earn a month?*, and deferred everything else\n- Made \"safe to spend\" the hero of the home screen, updated with every expense\n- Designed a two-tap expense logger with smart category suggestions\n- Prototyped three directions in Protopie and tested each with six users before committing",
    outcome:
      'The new onboarding shipped in March 2025. Drop-off before the first logged expense fell by half within a month, and the two-tap logger became the most used feature in the app.',
    metrics: [
      { value: '52%', label: 'fewer drop-offs during onboarding' },
      { value: '2 taps', label: 'to log an expense' },
      { value: '4.7★', label: 'App Store rating after launch' },
    ],
  },
  {
    title: 'CareLink Dashboard',
    slug: 'carelink-dashboard',
    category: 'Web · Healthcare · 2025',
    tags: ['IA', 'Design system'],
    theme: 's2',
    layout: 'wide',
    summary: 'A clinical dashboard that helps nurses and doctors see which patients need attention next, without hunting across five screens.',
    client: 'CareLink Health',
    role: 'UX lead, IA & design system',
    duration: '5 months',
    challenge:
      "The dashboard had been built by accretion: every new feature added another tab. During a busy shift, a nurse needed six clicks to check a patient's latest vitals.\n\nWorse, critical alerts looked exactly like routine reminders.",
    approach:
      "I shadowed ward staff across three hospitals and mapped every task they did on the dashboard during a 12-hour shift.\n\n- Card-sorted 40+ screens into a navigation built around the *patient*, not the feature\n- Designed an attention queue that ranks patients by urgency, with alert levels distinct in colour, shape and text\n- Built a component library and tokens so four product squads could ship consistently\n- Tested with clinicians on real tablets, in real wards, at 3 a.m.",
    outcome:
      "Clinicians now reach any patient detail in two clicks. Every CareLink team builds on the design system, and support tickets asking \"where is X?\" dropped sharply.",
    metrics: [
      { value: '6 → 2', label: 'clicks to reach patient vitals' },
      { value: '38%', label: 'fewer navigation support tickets' },
      { value: '4', label: 'product squads on one design system' },
    ],
  },
  {
    title: 'Chai & Co. Ordering',
    slug: 'chai-and-co-ordering',
    category: 'Mobile · F&B · 2024',
    tags: ['Prototyping', 'UI'],
    theme: 's3',
    layout: 'phone-profile',
    summary: 'A mobile ordering flow for a busy chain of tea cafés, designed so regulars can reorder their usual in under ten seconds.',
    client: 'Chai & Co.',
    role: 'Product designer',
    duration: '8 weeks',
    challenge:
      "Queues were out the door every morning, but the app was a menu PDF with a checkout bolted on. Most customers ordered the same thing every day and still had to scroll through 60 items to find it.",
    approach:
      "- Mapped the morning rush with café staff to find the real peak-hour pain points\n- Designed a personal home screen that puts *your usual* first, with one-tap reorder\n- Prototyped pickup timing so orders are ready the moment customers arrive\n- Ran hallway tests in three cafés with a clickable Figma prototype",
    outcome:
      'Reordering became the most common way to buy, and peak-hour waits came down. The café team now uses the same prototype to test seasonal menu launches.',
    metrics: [
      { value: '8 sec', label: 'average time to reorder' },
      { value: '3×', label: 'more app orders at peak hours' },
      { value: '61%', label: "of orders placed via \"your usual\"" },
    ],
  },
  {
    title: 'Orbit: SaaS Analytics',
    slug: 'orbit-saas-analytics',
    category: 'Web · B2B SaaS · 2024',
    tags: ['UX audit', 'Redesign'],
    theme: 's4',
    layout: 'wide-sidebar',
    summary: "A UX audit and redesign of a B2B analytics product whose power users loved it and whose new users couldn't find their way in.",
    client: 'Orbit Analytics',
    role: 'Senior product designer',
    duration: '6 months',
    challenge:
      'Orbit had grown feature by feature for five years. Trial users struggled to build their first report, the interface had four different button styles, and every new screen took engineers twice as long as it should.',
    approach:
      "I started with a heuristic audit and session recordings from 200 trial accounts, then prioritised fixes by impact and effort with the product team.\n\n- Redesigned the report builder around templates, so a first report takes minutes\n- Consolidated 300+ one-off UI patterns into a documented design system with tokens\n- Paired weekly with engineers to migrate screens without a big-bang rewrite",
    outcome:
      'Trial-to-paid conversion went up, the team ships features twice as fast on the new system, and engineers start new screens from components instead of from scratch.',
    metrics: [
      { value: '2×', label: 'faster feature delivery' },
      { value: '+23%', label: 'trial-to-paid conversion' },
      { value: '300 → 42', label: 'UI patterns consolidated' },
    ],
  },
];

// *word* renders as italic serif emphasis on the site.
export const SEED_TESTIMONIALS = [
  { quote: "Tanvi didn't just redesign our app, she *rethought* how our users manage money. Onboarding drop-off fell by half within a month.", name: 'Aarav Mehta', role: 'Founder, Paisa' },
  { quote: "Her research uncovered problems we'd been blind to for years. The new dashboard feels *calm*, and our clinicians actually enjoy using it.", name: 'Dr. Neha Kapoor', role: 'Product Lead, CareLink' },
  { quote: 'The design system she built is the reason we ship twice as fast. Clear docs, thoughtful tokens and a *joy* to work with.', name: 'Rohan Iyer', role: 'Engineering Manager, Orbit' },
];

export const DEFAULT_SITE = {
  showProjectTemplates: true,
  available: true,
  availability: 'Open to new projects',
  email: 'hello@tanvi.design',
  location: 'Mumbai, India · Available worldwide',
  instagram: '',
  linkedin: '',
  behance: '',
  dribbble: '',
  stats: [
    { tag: 'Experience', value: '4+', text: 'Years designing web & mobile products across fintech, health and SaaS.', accent: false },
    { tag: 'Shipped', value: '32', text: 'Projects shipped end to end, from discovery workshops to launch.', accent: false },
    { tag: 'Impact', value: '+41%', text: 'Average lift in task completion after my usability redesigns.', accent: true },
    { tag: 'Research', value: '120+', text: 'User interviews and usability sessions run and synthesised.', accent: false },
  ],
  highlights: [
    { value: '98%', text: 'of clients came back for a second project' },
    { value: '4.9★', text: 'average rating across freelance platforms' },
    { value: '2×', text: 'faster dev handoff with documented systems' },
  ],
};
