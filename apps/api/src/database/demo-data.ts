/**
 * Realistic sample workspace for demos and local development. Dates are
 * relative to the day the seed runs so the schedule and dashboards look alive.
 */
import type {
  BillingModel,
  MilestoneStatus,
  NoteType,
  Priority,
  ProjectHealth,
  ProjectMemberRole,
  ProjectStatus,
  ProjectType,
  Role,
  SkillCategory,
  TimeOffType,
} from "../generated/prisma/client.js";

export const DEMO_PASSWORD = "Password123!";

export interface DemoPerson {
  key: string;
  firstName: string;
  lastName: string;
  role: Role;
  jobTitle: string;
  department: string;
  weeklyCapacityHours: number;
  costRate: number;
  /** skill name → [self level, admin rating] */
  skills: Record<string, [number, number]>;
}

export const SKILLS: Array<{ name: string; category: SkillCategory }> = [
  { name: "TypeScript", category: "FRONTEND" },
  { name: "React", category: "FRONTEND" },
  { name: "Next.js", category: "FRONTEND" },
  { name: "Node.js", category: "BACKEND" },
  { name: "NestJS", category: "BACKEND" },
  { name: "PostgreSQL", category: "DATA" },
  { name: "Python", category: "DATA" },
  { name: "React Native", category: "MOBILE" },
  { name: "Kubernetes", category: "DEVOPS" },
  { name: "AWS", category: "DEVOPS" },
  { name: "Figma", category: "DESIGN" },
  { name: "UX research", category: "DESIGN" },
  { name: "Project management", category: "MANAGEMENT" },
  { name: "Client communication", category: "SOFT_SKILL" },
];

export const PEOPLE: DemoPerson[] = [
  {
    key: "claire",
    firstName: "Claire",
    lastName: "Dubois",
    role: "MANAGER",
    jobTitle: "Delivery Manager",
    department: "Delivery",
    weeklyCapacityHours: 40,
    costRate: 70,
    skills: { "Project management": [5, 5], "Client communication": [5, 4] },
  },
  {
    key: "ada",
    firstName: "Ada",
    lastName: "Lovelace",
    role: "MEMBER",
    jobTitle: "Staff Engineer",
    department: "Engineering",
    weeklyCapacityHours: 40,
    costRate: 85,
    skills: { TypeScript: [5, 5], "Node.js": [5, 5], NestJS: [4, 4], PostgreSQL: [4, 4] },
  },
  {
    key: "linus",
    firstName: "Linus",
    lastName: "Park",
    role: "MEMBER",
    jobTitle: "Senior Frontend Engineer",
    department: "Engineering",
    weeklyCapacityHours: 40,
    costRate: 70,
    skills: { React: [5, 4], "Next.js": [4, 4], TypeScript: [4, 4], Figma: [2, 2] },
  },
  {
    key: "grace",
    firstName: "Grace",
    lastName: "Hopper",
    role: "MEMBER",
    jobTitle: "DevOps Engineer",
    department: "Platform",
    weeklyCapacityHours: 32,
    costRate: 75,
    skills: { Kubernetes: [5, 5], AWS: [4, 5], PostgreSQL: [3, 3], Python: [3, 3] },
  },
  {
    key: "dieter",
    firstName: "Dieter",
    lastName: "Rams",
    role: "MEMBER",
    jobTitle: "Product Designer",
    department: "Design",
    weeklyCapacityHours: 40,
    costRate: 65,
    skills: { Figma: [5, 5], "UX research": [4, 4] },
  },
  {
    key: "margaret",
    firstName: "Margaret",
    lastName: "Hamilton",
    role: "MEMBER",
    jobTitle: "Mobile Engineer",
    department: "Engineering",
    weeklyCapacityHours: 40,
    costRate: 70,
    skills: { "React Native": [5, 4], TypeScript: [4, 4], React: [4, 3] },
  },
  {
    key: "alan",
    firstName: "Alan",
    lastName: "Turing",
    role: "MEMBER",
    jobTitle: "Data Engineer",
    department: "Data",
    weeklyCapacityHours: 40,
    costRate: 80,
    skills: { Python: [5, 5], PostgreSQL: [5, 4], AWS: [3, 3] },
  },
  {
    key: "sam",
    firstName: "Sam",
    lastName: "Okafor",
    role: "GUEST",
    jobTitle: "Client Product Owner",
    department: "External",
    weeklyCapacityHours: 0,
    costRate: 0,
    skills: {},
  },
];

export const CLIENTS = [
  {
    key: "northwind",
    name: "Northwind Retail",
    industry: "Retail",
    country: "France",
    website: "https://northwind.example.com",
    contacts: [{ name: "Sam Okafor", email: "sam@northwind.example.com", position: "Product Owner", isPrimary: true }],
  },
  {
    key: "helios",
    name: "Helios Energy",
    industry: "Energy",
    country: "Germany",
    website: "https://helios.example.com",
    contacts: [{ name: "Jana Vogel", email: "jana@helios.example.com", position: "CTO", isPrimary: true }],
  },
  {
    key: "atlas",
    name: "Atlas Mobility",
    industry: "Transportation",
    country: "Spain",
    website: "https://atlas.example.com",
    contacts: [{ name: "Luis Ortega", email: "luis@atlas.example.com", position: "Head of Digital", isPrimary: true }],
  },
];

export interface DemoProject {
  code: string;
  name: string;
  summary: string;
  description: string;
  client: string | null;
  owner: string;
  status: ProjectStatus;
  health: ProjectHealth;
  priority: Priority;
  type: ProjectType;
  billingModel: BillingModel;
  color: string;
  /** Offsets in days from today. */
  start: number;
  end: number;
  progress: number;
  budgetAmount: number | null;
  hourlyRate: number | null;
  estimatedHours: number | null;
  tags: string[];
  techStack: string[];
  objectives: string;
  successCriteria: string;
  scope: string;
  outOfScope: string;
  members: Array<[person: string, role: ProjectMemberRole]>;
  milestones: Array<[name: string, dueOffset: number, status: MilestoneStatus]>;
  risks: Array<[title: string, probability: number, impact: number, mitigation: string]>;
  updates: Array<[daysAgo: number, health: ProjectHealth, progress: number, summary: string]>;
  /** [person, startOffset, endOffset, hoursPerDay] */
  bookings: Array<[string, number, number, number]>;
}

export const PROJECTS: DemoProject[] = [
  {
    code: "NW-COMMERCE",
    name: "Northwind Commerce Replatform",
    summary: "Move Northwind's storefront to a headless Next.js stack.",
    description:
      "Northwind's legacy monolith can't keep up with seasonal peaks. We are replacing the storefront with a headless architecture: Next.js frontend, NestJS BFF, and a managed commerce engine.\n\n**Constraints:** zero downtime cut-over before Black Friday.",
    client: "northwind",
    owner: "claire",
    status: "ACTIVE",
    health: "AT_RISK",
    priority: "CRITICAL",
    type: "CLIENT",
    billingModel: "FIXED_PRICE",
    color: "#2a78d6",
    start: -60,
    end: 45,
    progress: 55,
    budgetAmount: 180_000,
    hourlyRate: 110,
    estimatedHours: 1_600,
    tags: ["e-commerce", "replatform"],
    techStack: ["Next.js", "NestJS", "PostgreSQL", "Kubernetes"],
    objectives: "Cut page load time by 50%. Handle 5× peak traffic. Enable weekly releases.",
    successCriteria: "LCP < 2s on mobile; checkout conversion ≥ current; no Sev-1 during cut-over.",
    scope: "Storefront, checkout, account area, CMS integration, observability.",
    outOfScope: "ERP integration changes, warehouse systems.",
    members: [
      ["ada", "LEAD"],
      ["linus", "CONTRIBUTOR"],
      ["grace", "CONTRIBUTOR"],
      ["dieter", "REVIEWER"],
      ["sam", "STAKEHOLDER"],
    ],
    milestones: [
      ["Architecture sign-off", -45, "DONE"],
      ["Catalog & search live on staging", -10, "DONE"],
      ["Checkout feature-complete", 7, "IN_PROGRESS"],
      ["Load test at 5× peak", 25, "PENDING"],
      ["Production cut-over", 45, "PENDING"],
    ],
    risks: [
      ["Payment provider sandbox instability", 4, 4, "Contract test suite + fallback provider stubbed."],
      ["Black Friday freeze compresses the cut-over window", 3, 5, "Rehearse cut-over twice; feature flags on every path."],
      ["Key-person dependency on Ada for BFF", 3, 3, "Pair Linus on BFF modules; document ADRs."],
    ],
    updates: [
      [35, "ON_TRACK", 30, "Catalog migration finished early; search relevance tuned with the client."],
      [14, "ON_TRACK", 45, "Staging environment live; first client demo well received."],
      [2, "AT_RISK", 55, "Payment sandbox outages cost us 4 days; checkout slipping ~1 week."],
    ],
    bookings: [
      ["ada", -60, 45, 6],
      ["linus", -40, 45, 8],
      ["grace", -20, 30, 4],
      ["dieter", -60, 10, 3],
    ],
  },
  {
    code: "HELIOS-GRID",
    name: "Helios Grid Analytics",
    summary: "Real-time analytics platform for Helios' solar fleet.",
    description:
      "Ingest telemetry from 12k inverters, detect anomalies and forecast production. Dashboards for operators and a public API for partners.",
    client: "helios",
    owner: "claire",
    status: "ACTIVE",
    health: "ON_TRACK",
    priority: "HIGH",
    type: "CLIENT",
    billingModel: "TIME_AND_MATERIALS",
    color: "#1baf7a",
    start: -30,
    end: 90,
    progress: 30,
    budgetAmount: 240_000,
    hourlyRate: 120,
    estimatedHours: 2_000,
    tags: ["iot", "analytics"],
    techStack: ["Python", "PostgreSQL", "AWS", "React"],
    objectives: "Detect inverter anomalies within 5 minutes; 95% forecast accuracy at day-ahead.",
    successCriteria: "Operators adopt the dashboard daily; partner API has 3 integrations at launch.",
    scope: "Ingestion pipeline, anomaly detection, forecasting, operator dashboard, partner API.",
    outOfScope: "Hardware procurement, field maintenance tooling.",
    members: [
      ["alan", "LEAD"],
      ["grace", "CONTRIBUTOR"],
      ["linus", "CONTRIBUTOR"],
    ],
    milestones: [
      ["Telemetry ingestion MVP", -5, "DONE"],
      ["Anomaly detection beta", 30, "PENDING"],
      ["Operator dashboard v1", 60, "PENDING"],
      ["Partner API GA", 90, "PENDING"],
    ],
    risks: [
      ["Telemetry data quality varies by inverter vendor", 4, 3, "Vendor-specific normalizers + data quality dashboard."],
      ["Forecast accuracy depends on weather API licensing", 2, 4, "Evaluate two providers during beta."],
    ],
    updates: [
      [20, "ON_TRACK", 15, "Kick-off done; data contracts agreed with Helios engineering."],
      [4, "ON_TRACK", 30, "Ingestion MVP processing 8k devices in staging."],
    ],
    bookings: [
      ["alan", -30, 90, 7],
      ["grace", -30, 90, 3],
      ["linus", 10, 60, 2],
    ],
  },
  {
    code: "ATLAS-APP",
    name: "Atlas Rider App",
    summary: "Cross-platform rider app for Atlas' e-scooter network.",
    description: "React Native app for booking, unlocking and paying for scooters, with offline-first trip history.",
    client: "atlas",
    owner: "claire",
    status: "ACTIVE",
    health: "OFF_TRACK",
    priority: "HIGH",
    type: "CLIENT",
    billingModel: "FIXED_PRICE",
    color: "#eb6834",
    start: -75,
    end: 12,
    progress: 60,
    budgetAmount: 120_000,
    hourlyRate: 100,
    estimatedHours: 1_100,
    tags: ["mobile"],
    techStack: ["React Native", "TypeScript", "NestJS"],
    objectives: "Ship to both stores with ≥4.5 rating in the first month.",
    successCriteria: "Crash-free sessions ≥ 99.5%; unlock time < 3s.",
    scope: "Rider app, payments, trip history, support chat.",
    outOfScope: "Fleet operator app.",
    members: [
      ["margaret", "LEAD"],
      ["dieter", "CONTRIBUTOR"],
      ["ada", "REVIEWER"],
    ],
    milestones: [
      ["Design system ready", -60, "DONE"],
      ["Payments integration", -12, "MISSED"],
      ["Store submission", 12, "PENDING"],
    ],
    risks: [
      ["App store review delays", 3, 4, "Submit early TestFlight builds; prepare review notes."],
      ["BLE unlock unreliable on older Android devices", 4, 5, "Fallback QR unlock; device lab testing."],
    ],
    updates: [
      [30, "AT_RISK", 45, "BLE unlock flakiness on Android 11 devices."],
      [3, "OFF_TRACK", 60, "Payments missed its milestone; store submission at risk. Proposing scope cut on support chat."],
    ],
    bookings: [
      ["margaret", -75, 12, 8],
      ["dieter", -40, 12, 4],
    ],
  },
  {
    code: "PLATFORM",
    name: "Internal Platform & Tooling",
    summary: "Shared CI/CD, observability and developer tooling.",
    description: "Standardize our delivery platform: golden-path templates, CI pipelines, preview environments and on-call tooling.",
    client: null,
    owner: "grace",
    status: "ACTIVE",
    health: "ON_TRACK",
    priority: "MEDIUM",
    type: "INTERNAL",
    billingModel: "NON_BILLABLE",
    color: "#4a3aa7",
    start: -120,
    end: 120,
    progress: 40,
    budgetAmount: null,
    hourlyRate: null,
    estimatedHours: 600,
    tags: ["internal", "devex"],
    techStack: ["Kubernetes", "AWS", "Node.js"],
    objectives: "New project from zero to deployed preview in under one day.",
    successCriteria: "All client projects on the shared pipeline.",
    scope: "Templates, CI, preview environments, observability stack.",
    outOfScope: "Client-specific infrastructure.",
    members: [
      ["grace", "LEAD"],
      ["ada", "CONTRIBUTOR"],
    ],
    milestones: [
      ["Golden-path template", -30, "DONE"],
      ["Preview environments", 40, "IN_PROGRESS"],
    ],
    risks: [["Competes with billable work for capacity", 4, 2, "Reserve a fixed 10% of platform team time."]],
    updates: [[10, "ON_TRACK", 40, "Template adopted by two teams."]],
    bookings: [
      ["grace", -120, 120, 1],
      ["ada", -30, 60, 1],
    ],
  },
  {
    code: "NW-LOYALTY",
    name: "Northwind Loyalty Programme",
    summary: "Discovery for a points-based loyalty programme.",
    description: "Discovery phase: customer interviews, competitive analysis and a clickable prototype.",
    client: "northwind",
    owner: "claire",
    status: "PLANNING",
    health: "ON_TRACK",
    priority: "MEDIUM",
    type: "CLIENT",
    billingModel: "TIME_AND_MATERIALS",
    color: "#e87ba4",
    start: 20,
    end: 70,
    progress: 0,
    budgetAmount: 40_000,
    hourlyRate: 105,
    estimatedHours: 350,
    tags: ["discovery"],
    techStack: ["Figma"],
    objectives: "Validate whether a loyalty programme lifts repeat purchases.",
    successCriteria: "Prototype tested with 12 customers; business case signed off.",
    scope: "Research, prototype, business case.",
    outOfScope: "Implementation.",
    members: [
      ["dieter", "LEAD"],
      ["claire", "CONTRIBUTOR"],
    ],
    milestones: [
      ["Interviews complete", 40, "PENDING"],
      ["Prototype & business case", 70, "PENDING"],
    ],
    risks: [],
    updates: [],
    bookings: [["dieter", 20, 70, 4]],
  },
];

export const TIME_OFF: Array<[person: string, type: TimeOffType, start: number, end: number, note: string]> = [
  ["linus", "VACATION", 14, 18, "Family trip"],
  ["grace", "VACATION", 5, 9, ""],
  ["alan", "SICK", -2, -1, ""],
  ["margaret", "HOLIDAY", 30, 30, "Regional holiday"],
];

export const NOTES: Array<[about: string, author: "claire" | "admin", type: NoteType, content: string, project?: string]> = [
  ["ada", "claire", "KUDOS", "Unblocked the checkout BFF design in a single afternoon — outstanding.", "NW-COMMERCE"],
  ["ada", "admin", "REMARK", "Consider for the architecture guild lead role next quarter."],
  ["margaret", "claire", "WARNING", "Carrying too much of ATLAS-APP alone; overtime three weeks running.", "ATLAS-APP"],
  ["linus", "claire", "NOTE", "Wants more exposure to backend work; pair on the BFF."],
];
