import type { Route } from "next";

/**
 * THE VA SCHOOL — SINGLE SOURCE OF BRAND & PROGRAM TRUTH
 * =============================================================================
 * Every fact in this file traces to the Iowa DE accreditation package
 * ("VA_School_Complete_Document_Package.pdf"). The document each block came
 * from is cited in its comment, so a copy edit can always be checked against
 * the source of record.
 *
 * WHY THIS FILE EXISTS: the site went from 1 page to ~20 routes. Before this,
 * the nav link list was duplicated in Navbar.tsx and Footer.tsx and the phone
 * number was hardcoded in three places. Structured content lives here exactly
 * once; components render it. If you find yourself typing a program name,
 * a cohort range, or a phone number into JSX, stop and add it here instead.
 *
 * This module is imported by both Server and Client Components, so it must
 * stay free of `server-only` imports, secrets, and Node APIs.
 */

/* ==========================================================================
   INSTITUTIONAL IDENTITY — Document 1 §1.1
   ========================================================================== */

export const school = {
  legalName: "The Von Der Becke Academy Corp",
  dbaName: "The VA School",
  /** Used where the full formal attribution is needed. */
  fullName: "The Von Der Becke Academy Corp · The VA School",
  tagline: "We don't lower the bar. We raise the student.",

  established: 2012,
  legalStatus: "Nonprofit Corporation — 501(c)(3)",
  headOfSchool: "Robert Von Der Becke",

  address: {
    street: "503 Lake Ave",
    city: "Storm Lake",
    state: "Iowa",
    stateCode: "IA",
    zip: "50588",
    county: "Buena Vista County",
  },

  /** Display form; `phoneHref` is the tel: form. */
  phone: "(712) 560-1128",
  phoneHref: "tel:+17125601128",
  email: "teamvcorp@thevacorp.com",

  gradeLevels: "Kindergarten through Grade 12, plus The VA Higher Institute (ages 16–18)",
  calendar: "Year-round, Monday through Thursday (four-day instructional week)",
  /** Document 1 §1.4 */
  facility:
    "A seven-room facility with instructional spaces organized by cohort group, a dedicated Taekwondo training room, restroom facilities, and a lunchroom.",
} as const;

/** Full one-line address, e.g. for JSON-LD and footers. */
export const addressLine = `${school.address.street}, ${school.address.city}, ${school.address.state} ${school.address.zip}`;

/**
 * THE SCHOOL DAY APP — a SEPARATE application at app.vaschool.org.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE DIVISION OF INTENT (stated by the school, and load-bearing)
 *
 *   THIS SITE          → ENROLLMENT ONLY. Public information, and the funnel that turns a
 *                        prospective family into a signed agreement. Plus the staff-side
 *                        admin needed to review and act on those applications.
 *   app.vaschool.org   → EVERYTHING FOR ALREADY-ENROLLED FAMILIES. Daily check-in, the
 *                        school day, and student progress. Its own deployment, its own
 *                        login; shares no routes with us (every route here 404s there).
 *
 * The point of the split is that each site has ONE obvious job, so neither audience has to
 * work out which one they need. Keep it that way:
 *
 *  - Never promise an enrolled family anything on this site. An earlier draft of the home
 *    page said records would "move here" — exactly the blurring this division exists to
 *    prevent.
 *  - Never send a PROSPECTIVE family to app.vaschool.org. They have no account, and a login
 *    wall is the worst possible answer to "I want to enroll my child". Every link to it
 *    carries a "Not enrolled yet?" escape hatch back to /enroll.
 */
export const dailyApp = {
  url: "https://app.vaschool.org",
  loginUrl: "https://app.vaschool.org/login",
  name: "School Day app",
  /** One line, used wherever the link appears. */
  purpose: "Daily check-in and the school day",
  audience: "Already-enrolled students and parents",
} as const;

/** Years in continuous operation, computed so it never goes stale. */
export function yearsInOperation(now: Date = new Date()): number {
  return now.getFullYear() - school.established;
}

/* ==========================================================================
   MISSION & VISION — Document 2 §2.1–2.2
   ========================================================================== */

export const mission =
  "The Von Der Becke Academy Corp exists to develop whole, capable, and confident human beings by holding every student to the highest academic and character standard — providing every resource and individual support needed to reach it, while never lowering the expectation.";

export const vision =
  "The VA School envisions a community in which every graduate — regardless of the path they choose — enters adulthood with mastery of foundational knowledge, genuine self-discipline, the ability to transfer academic skill to real-world performance, and the character to lead in whatever field they pursue.";

/* ==========================================================================
   CATEGORY COLORS
   The crest has four quadrants; the source material has several natural
   four-way sets. This is the only place the mapping is decided.
   Each entry names Tailwind classes generated from the tokens in globals.css.
   ========================================================================== */

export type CategoryColor = "red" | "green" | "blue" | "gold";

export const categoryStyles: Record<
  CategoryColor,
  { text: string; bg: string; border: string; fill: string }
> = {
  red: {
    text: "text-crest-red-600",
    bg: "bg-crest-red-600",
    border: "border-crest-red-600",
    fill: "bg-crest-red-50",
  },
  green: {
    text: "text-crest-green-600",
    bg: "bg-crest-green-600",
    border: "border-crest-green-600",
    fill: "bg-crest-green-50",
  },
  blue: {
    text: "text-crest-blue-600",
    bg: "bg-crest-blue-600",
    border: "border-crest-blue-600",
    fill: "bg-crest-blue-50",
  },
  gold: {
    text: "text-gold-600",
    bg: "bg-gold-600",
    border: "border-gold-600",
    fill: "bg-gold-50",
  },
};

/* ==========================================================================
   COHORT STRUCTURE — Document 3 §3.2
   "These groups are not strictly age-based but reflect the student's current
   academic and developmental stage."
   ========================================================================== */

export const cohorts = [
  {
    id: "early",
    name: "Early",
    range: "Kindergarten – Grade 4",
    color: "green",
    focus:
      "Foundational literacy, numeracy, behavioral skills, and introduction to all discipline areas.",
  },
  {
    id: "middle",
    name: "Middle",
    range: "Grades 5 – 8",
    color: "blue",
    focus:
      "Expanding knowledge across all content areas; developing independent learning habits and pivotal behaviors.",
  },
  {
    id: "upper",
    name: "Upper",
    range: "Grades 9 – 12",
    color: "red",
    focus:
      "Advanced academics through the highest achievable level in each subject; college and career preparation; Taekwondo mastery.",
  },
  {
    id: "higher-institute",
    name: "Higher Institute",
    range: "Post-diploma, ages 16–18",
    color: "gold",
    focus:
      "Career field immersion, credentialing, advanced academic pursuit, and capstone completion.",
  },
] as const satisfies readonly {
  id: string;
  name: string;
  range: string;
  color: CategoryColor;
  focus: string;
}[];

export type CohortId = (typeof cohorts)[number]["id"];

/* ==========================================================================
   EDUCATIONAL PHILOSOPHY — Document 2 §2.3
   Six pillars. These replace the old generic "Four Pillars" marketing copy.
   ========================================================================== */

export const philosophy = [
  {
    title: "The Standard Does Not Move",
    summary: "Differentiation occurs in the path, not the destination.",
    body: "Academic and behavioral standards exist to be met — not adjusted to the student's current comfort level. Every student works toward the same high academic goal. Instructional scaffolding, task analysis, and individualized pacing provide every student the specific support needed to reach the standard, ensuring that no student is left behind and no standard is diluted.",
  },
  {
    title: "Mastery Before Progression",
    summary: "Students advance when they can demonstrate mastery — not when the calendar says so.",
    body: "This mastery-based progression model, grounded in Applied Behavior Analysis, ensures that every student builds on a foundation of genuine competence. Complex skill demonstration is accepted as evidence of simpler constituent skill mastery, eliminating redundant remediation and honoring students' actual knowledge.",
  },
  {
    title: "True Confidence Is Earned",
    summary: "A belt is not given. It is earned through demonstrated performance.",
    body: "The VA School teaches a deliberate distinction between true and false confidence. True confidence emerges when knowledge is applied through sustained practice until it becomes skill — and that skill is owned, not borrowed. False confidence is the assumption of competence without practice. Students are not praised for passive reception of information, but for demonstrated application and mastery.",
  },
  {
    title: "Pivotal Behavior as Foundation",
    summary: "Behaviors that generalize across every environment, taught as academic subjects.",
    body: "The VA School prioritizes pivotal behaviors — behaviors that, once established, produce broad positive outcomes without requiring skill-by-skill remediation. The three domains are self-control, self-awareness, and strength of character. They are taught as academic subjects, reinforced individually, and assessed as part of the graduation standard.",
  },
  {
    title: "Adversity as Instruction",
    summary: "We do not shield students from difficulty. We coach them through it.",
    body: "Every challenging situation, academic or behavioral, is treated as an instructional opportunity. Staff are trained to engage adverse moments in real time, guiding students to identify what occurred, why, and how to transform the experience into a positive outcome. This produces students who are resilient, reflective, and capable of growth under pressure.",
  },
  {
    title: "Discipline as Respect",
    summary: "Discipline is not punishment. It is the highest form of respect for a student's potential.",
    body: "The Taekwondo framework provides students with a visible, structured path of earned progression, a code of conduct grounded in timeless values, and a physical practice that develops mental clarity, focus, and physical confidence. Students understand that every expectation placed upon them communicates belief in their capacity to meet it.",
  },
] as const;

/* ==========================================================================
   VALUES — Document 2 §2.4, aligned with traditional Taekwondo tenets
   ========================================================================== */

export const values = [
  {
    name: "Self-Control",
    meaning: "Managing emotion, impulse, and response in academic and social environments.",
  },
  {
    name: "Integrity",
    meaning: "Honest representation of one's knowledge, effort, and progress — always.",
  },
  {
    name: "Perseverance",
    meaning: "Continuing toward the standard despite difficulty, delay, or frustration.",
  },
  {
    name: "Courtesy",
    meaning: "Respectful engagement with peers, instructors, and the learning environment.",
  },
  {
    name: "Indomitable Spirit",
    meaning: "Maintaining confidence, purpose, and forward momentum under any circumstance.",
  },
] as const;

/* ==========================================================================
   INSTRUCTIONAL MODEL — Document 3 §3.1, the Whole-Part-Whole cycle
   ========================================================================== */

export const wholePartWhole = [
  {
    phase: "WHOLE",
    label: "Group Concept Introduction",
    description:
      "All cohort members receive instruction on a high-level concept simultaneously. No concept is withheld from younger or earlier-stage students.",
    purpose:
      "Establishes a shared high standard, exposes all students to aspirational content, and activates curiosity and forward orientation.",
  },
  {
    phase: "PART",
    label: "Individual Micro-Instruction",
    description:
      "The instructor works with each student individually on the specific skill components within the concept that are at their current mastery level.",
    purpose:
      "Ensures every student receives instruction matched to their actual ability, filling gaps without removing the student from the group environment.",
  },
  {
    phase: "WHOLE",
    label: "Group Reconvene & Demonstration",
    description:
      "Students reconvene approximately every hour to demonstrate progress, apply the concept in context, and witness their peers' demonstrations.",
    purpose:
      "Reinforces learning through demonstration, builds a community of mutual respect, and allows the instructor to assess progress and recalibrate.",
  },
] as const;

/* ==========================================================================
   SUBJECTS — Document 3 §3.3
   ========================================================================== */

export const coreSubjects = [
  {
    name: "Mathematics",
    scope: "Arithmetic through advanced mathematics — algebra, geometry, pre-calculus, calculus, statistics.",
  },
  {
    name: "Science",
    scope: "Life science, earth science, physical science, biology, chemistry, physics.",
  },
  {
    name: "English Language Arts",
    scope: "Reading, writing, grammar, composition, literature, rhetoric.",
  },
  {
    name: "Social Studies",
    scope: "History (U.S. and world), geography, civics, economics.",
  },
] as const;

export const enrichmentSubjects = [
  {
    name: "Computer Science & Coding",
    color: "blue",
    scope: "Programming fundamentals, software development, AI concepts, robotics.",
    image: "/program-ai-programming.png",
  },
  {
    name: "Leadership Development",
    color: "gold",
    scope: "Communication, decision-making, team leadership, ethical reasoning.",
    image: "/pillar-leadership.png",
  },
  {
    name: "Taekwondo",
    color: "red",
    scope: "Physical conditioning, discipline framework, self-defense, rank progression.",
    image: "/program-micro-societies.png",
  },
  {
    name: "Clinical Mental Health Literacy",
    color: "green",
    scope:
      "Emotional regulation, mental wellness, self-advocacy — embedded through the ABA pivotal behavior curriculum.",
    image: "/pillar-collaboration.png",
  },
] as const satisfies readonly {
  name: string;
  color: CategoryColor;
  scope: string;
  image: string;
}[];

/* ==========================================================================
   BEHAVIORAL FRAMEWORK — Document 4 §4.6, the Three Pillars
   Also the schema for admin Template C (behavior records).
   ========================================================================== */

export const behaviorPillars = [
  {
    id: "self-control",
    name: "Self-Control",
    definition:
      "The student manages emotional responses, resists peer pressure, and responds constructively to environmental influences.",
    practice:
      "Practiced daily through structured scenarios, coached in real time during challenges, and demonstrated through observable behavior change.",
    targets: ["Emotional regulation in conflict", "Resistance to peer influence"],
  },
  {
    id: "self-awareness",
    name: "Self-Awareness",
    definition:
      "The student knows where they are, what they are supposed to be doing, and what their current emotional and physical state is at all times.",
    practice:
      "Developed through structured check-ins, reflective practice, and environmental orientation training.",
    targets: ["Task engagement / on-task behavior", "Environmental orientation"],
  },
  {
    id: "strength-of-character",
    name: "Strength of Character",
    definition:
      "The student maintains their values, commitments, and belief structure through adversity, peer influence, and personal challenge.",
    practice:
      "Developed through deliberate exposure to difficulty with coaching support, and affirmed through the Taekwondo value framework.",
    targets: ["Maintaining values under pressure", "Perseverance through academic challenge"],
  },
] as const;

export type BehaviorPillarId = (typeof behaviorPillars)[number]["id"];

/** Document 4 §4.6 — the 5-step response to a behavioral challenge. */
export const behaviorResponseSteps = [
  "Coach the student in the moment — name what occurred, identify the behavior without shaming the student.",
  "Analyze the antecedent — what triggered the behavior? What environmental or emotional factor was at play?",
  "Identify the pivotal behavior that was absent or challenged.",
  "Develop or reinforce the skill — provide direct instruction or additional practice on the relevant pillar.",
  "Affirm the student's capacity — close every coaching interaction with a forward-looking statement of belief in the student.",
] as const;

/* ==========================================================================
   ADMISSIONS — Document 4 §4.2
   ========================================================================== */

/**
 * The four-step admissions process, for the public pages.
 *
 * ⚠️  ALSO TRANSLATED, SEPARATELY. The confirmation email needs these steps in the
 * family's own language, so lib/i18n/messages/*.ts carries them under
 * `email.confirmation.step{1..4}.*`. This array is the English marketing copy; those keys
 * are the email copy. EDIT BOTH — they will not warn you.
 */
export const admissionsSteps = [
  {
    title: "Submit an enrollment application",
    detail: "Complete the Family Enrollment Agreement online. It takes about fifteen minutes.",
  },
  {
    title: "Intake meeting with the Head of School",
    detail:
      "We discuss your student's history, your goals, and exactly what the school expects of families and students.",
  },
  {
    title: "Initial student assessment",
    detail:
      "Informal and observational. It places your student in the appropriate cohort and establishes a baseline for progress monitoring — it is not a test to pass.",
  },
  {
    title: "Enrollment confirmed",
    detail:
      "Confirmed upon receipt of the signed Enrollment Agreement and the first monthly contribution.",
  },
] as const;

export const nonDiscrimination =
  "The VA School does not discriminate in admissions or services on the basis of race, color, national origin, sex, disability, or religion. Students receiving Iowa Education Savings Account (ESA) funding are accepted through the same process as all other students.";

/* ==========================================================================
   TUITION — Document 4 §4.3
   ========================================================================== */

export const tuition = {
  monthlyContribution: 200,
  monthlyContributionLabel: "$200 per student per month",
  monthlyContributionNote:
    "Covers extracurricular activities and supplementary programming.",
  esaEstimate: 8000,
  esaEstimateLabel: "~$8,000 per student per year",
  esaNote:
    "Paid directly by the Iowa Department of Education ESA program upon school accreditation and family enrollment.",
  hardshipNote:
    "Financial hardship consideration is available on request — contact the Head of School to discuss individually.",
} as const;

/* ==========================================================================
   ATTENDANCE — Document 4 §4.5. Also the schema for admin Template A.
   ========================================================================== */

export const attendanceCodes = {
  P: { label: "Present", color: "green" },
  A: { label: "Absent (Unexcused)", color: "red" },
  E: { label: "Excused Absence", color: "gold" },
  T: { label: "Tardy", color: "blue" },
} as const satisfies Record<string, { label: string; color: CategoryColor }>;

export type AttendanceCode = keyof typeof attendanceCodes;

export const attendancePolicy = {
  /** Triggers a required re-entry meeting with the Head of School. */
  consecutiveAbsenceThreshold: 3,
  /** Chronic absence above this share of instructional days triggers a Student Support Plan. */
  chronicAbsenceRate: 0.1,
  notes: [
    "Families notify the school on any day a student will be absent.",
    "Three or more consecutive absences require a re-entry meeting with the Head of School.",
    "Chronic absence — more than 10% of instructional days — triggers a Student Support Plan.",
    "The school does not penalize students academically for excused absences. Mastery determines advancement, not attendance count alone.",
  ],
} as const;

/* ==========================================================================
   TAEKWONDO — Document 4 §4.7. Also the schema for admin Template D.
   ========================================================================== */

export const beltRanks = [
  "White Belt",
  "Yellow Belt",
  "Green Belt",
  "Blue Belt",
  "Red Belt",
  "Black Belt",
] as const;

export type BeltRank = (typeof beltRanks)[number];

export const taekwondoRequirements = [
  "All students participate in Taekwondo training as part of the regular school schedule.",
  "Belt rank progression follows the school's traditional Taekwondo curriculum.",
  "Rank advancement requires demonstrated mastery of technical skills, forms (poomsae), and demonstrated embodiment of the five Taekwondo values.",
  "Instructors are required to complete foundational Taekwondo training as a condition of employment.",
  "Rank achieved during enrollment is formally documented and recognized.",
] as const;

/* ==========================================================================
   GRADUATION — Document 4 §4.8
   ========================================================================== */

export const graduationPathways = [
  {
    name: "Direct Graduation",
    detail:
      "The student completes all academic and character requirements — target: by age 16 — and is prepared to enter the workforce in a skilled trade or chosen career. The VA School diploma is awarded at a formal ceremony.",
  },
  {
    name: "Higher Institute Pathway",
    detail:
      "The student completes all graduation requirements and elects to enroll in The VA Higher Institute for advanced career and academic preparation (ages 16–18). The diploma is awarded upon Higher Institute completion, representing the fullest achievement the student has pursued.",
  },
] as const;

/* ==========================================================================
   HIGHER INSTITUTE — Document 7
   ========================================================================== */

export const higherInstitute = {
  premise:
    "Academic knowledge is not equivalent to professional competency. True competency — true confidence — requires knowledge applied through sustained, supervised, real-world practice.",
  positioning:
    "The VA Higher Institute is not a continuation of high school. It is a professional development and career immersion program, grounded in the same mastery-based, discipline-driven philosophy as The VA School, but applied to authentic career fields.",
  eligibility: [
    "Recipient of The VA School diploma",
    "Demonstrated black-belt level character mastery — all three Pivotal Behavior pillars at generalized level",
    "Family consent and student commitment to the two-year program structure",
    "Minimum age 16 at time of enrollment",
  ],
  /** §7.3 — the two-year framework, five components. */
  structure: [
    {
      component: "Career Field Immersion",
      yearOne: "3 days per week — observational and assisted participation in a career field placement.",
      yearTwo: "4 days per week — active contributor with increasing independent responsibility.",
      delivery: "Employer partnerships, supervised apprenticeships, internship agreements",
    },
    {
      component: "Academic Bridge",
      yearOne:
        "2 days per week at school — formal translation of field experience into academic and conceptual frameworks.",
      yearTwo: "1–2 days — independent research, project development, dual enrollment coursework.",
      delivery: "The VA School facility, community college dual enrollment",
    },
    {
      component: "Dojo Development",
      yearOne: "Daily morning Taekwondo — continued discipline, physical conditioning, leadership skills.",
      yearTwo: "Morning training plus peer mentorship of younger VA School students.",
      delivery: "The VA School Taekwondo facility",
    },
    {
      component: "Mentorship",
      yearOne: "Weekly debrief with a career mentor — field-to-concept translation sessions.",
      yearTwo: "Bi-weekly debrief plus capstone project development with a professional panel.",
      delivery: "Industry professionals, program alumni, Head of School",
    },
    {
      component: "Capstone Project",
      yearOne: "Career exploration and field documentation portfolio.",
      yearTwo:
        "A real professional deliverable in the chosen field, presented to a panel of practitioners at program completion.",
      delivery: "Student-led, mentor-guided, professionally reviewed",
    },
  ],
  dualEnrollment:
    "Higher Institute students may simultaneously enroll in credit-bearing courses at Iowa Lakes Community College, Northwest Iowa Community College, and others serving Buena Vista County. Credits earned at ages 16–18 count toward future degrees, enabling students to arrive at higher education with up to 30 college credits at no additional cost to the family through Iowa's Senior Year Plus Act (Iowa Code §261E).",
  completion:
    "Students exit at approximately age 18 with a high school diploma, up to 30 college credits, two years of documented career field experience, industry credentials, and a professional capstone project.",
} as const;

/** Document 7 §7.4 — the four career pathways. */
export const careerPathways = [
  {
    id: "pre-medicine",
    name: "Pre-Medicine & Health Sciences",
    color: "red",
    audience:
      "Students pursuing medical school, nursing, physical therapy, or other health professions.",
    placements: "Clinical settings, medical offices, therapy practices, public health organizations",
    academics: "Advanced biology, chemistry, anatomy; MCAT concept introduction; scientific writing",
    certifications: ["CPR/AED", "Certified Nursing Assistant (CNA), if age-eligible", "Medical Terminology"],
    outcome:
      "The student enters a college or medical school pipeline with clinical exposure, academic preparation, and professional references.",
    disclaimer:
      "The VA Higher Institute does not confer medical credentials. It prepares students for the academic and professional demands of medical education.",
  },
  {
    id: "technology",
    name: "Technology & Innovation",
    color: "blue",
    audience:
      "Students pursuing software development, artificial intelligence, robotics, cybersecurity, or IT careers.",
    placements: "Technology firms, IT departments, startup environments, robotics labs",
    academics:
      "Programming languages (Python, JavaScript, and others), AI and machine learning concepts, systems design, data analysis",
    certifications: [
      "CompTIA IT Fundamentals",
      "Google IT Support",
      "AWS Cloud Practitioner",
      "Relevant coding certifications",
    ],
    outcome:
      "The student enters the workforce or a college technology program with portfolio projects and industry credentials.",
    /**
     * Declared explicitly as undefined rather than omitted. With `as const`, an
     * omitted key is absent from that union member's type, and reading
     * `pathway.disclaimer` across the union then fails to typecheck. Every member
     * carrying the key keeps the union uniform.
     */
    disclaimer: undefined,
  },
  {
    id: "mechanical",
    name: "Mechanical & Engineering",
    color: "gold",
    audience:
      "Students pursuing mechanical engineering, automotive systems, manufacturing, or related fields.",
    placements: "Mechanical shops, manufacturing facilities, engineering firms, equipment dealerships",
    academics: "Physics, mechanical systems, technical drawing, problem-solving frameworks",
    certifications: [
      "ASE Student Certification",
      "OSHA 10 safety certification",
      "Forklift and equipment licenses, as age-appropriate",
    ],
    outcome:
      "The student enters the workforce with mechanical competency, or an engineering program with hands-on experience.",
    disclaimer: undefined,
  },
  {
    id: "skilled-trades",
    name: "Skilled Trades",
    color: "green",
    audience:
      "Students pursuing electrician, HVAC, plumbing, or construction careers — high-demand, recession-resistant fields.",
    placements:
      "Licensed electricians, HVAC companies, plumbing contractors — working alongside licensed tradespeople",
    academics: "Electrical theory, mechanical systems, code basics, the business of the trades",
    certifications: [
      "OSHA 10",
      "EPA 608 (HVAC refrigerant)",
      "Relevant pre-apprenticeship certifications",
    ],
    outcome:
      "The student enters a union or independent apprenticeship program with documented pre-apprenticeship hours and credentials.",
    disclaimer: undefined,
  },
] as const satisfies readonly {
  id: string;
  name: string;
  color: CategoryColor;
  audience: string;
  placements: string;
  academics: string;
  certifications: readonly string[];
  outcome: string;
  disclaimer?: string;
}[];

export type CareerPathwayId = (typeof careerPathways)[number]["id"];

/* ==========================================================================
   STAFF — Document 5
   ========================================================================== */

export const headOfSchool = {
  name: "Robert Von Der Becke",
  title: "Head of School, Lead Instructor, and Founding Director",
  experience:
    "22 years in education, behavioral intervention, and martial arts instruction (since 2004)",
  credentials: [
    "Masters-level preparation in Applied Behavior Analysis",
    "Masters-level Taekwondo instructor certification",
    "Masters program in Education",
    "Masters program in Clinical Mental Health Counseling",
  ],
  abaCompetencies:
    "Task analysis, pivotal response training, discrete trial instruction, behavioral intervention planning, data-based decision making, functional behavior assessment",
  role: "Administers all academic programs; leads Taekwondo instruction; supervises all instructors; manages school operations; conducts family intake and progress conferences",
} as const;

export const instructorRequirements = [
  "Completion of foundational training in ABA principles as applied to classroom instruction, provided by the Head of School",
  "Completion of introductory Taekwondo orientation — values, terminology, and classroom integration",
  "Demonstrated subject-matter competency in the assigned instructional area",
  "Background check clearance prior to any student contact",
  "Signed Instructor Agreement acknowledging school policies, the behavioral framework, and confidentiality obligations",
] as const;

export const instructorPreferred = [
  "Bachelor's degree or higher in education, a content area, or a related professional field",
  "Experience in individualized or special education settings",
  "Knowledge of the K12/Stride curriculum platform",
  "Experience in youth mentorship, coaching, or career development",
] as const;

/* ==========================================================================
   NAVIGATION
   One source for both SiteHeader and SiteFooter. `children` renders as a
   grouped menu on desktop and a nested disclosure on mobile.
   ========================================================================== */

/**
 * `Route` rather than `string` because next.config.ts enables `typedRoutes`, so
 * <Link href> only accepts paths that actually exist. A typo'd nav href becomes a
 * compile error instead of a 404 discovered in production.
 */
export type NavItem = {
  label: string;
  href: Route;
  description?: string;
  children?: readonly NavItem[];
};

export const navigation: readonly NavItem[] = [
  {
    label: "About",
    href: "/about",
    children: [
      { label: "Our History", href: "/about", description: "Founded 2012 in Storm Lake" },
      { label: "Mission & Philosophy", href: "/mission", description: "What we believe and why" },
      { label: "Staff & Instructors", href: "/staff", description: "Who teaches here" },
      { label: "Accreditation", href: "/accreditation", description: "Our Iowa DE submission" },
    ],
  },
  {
    label: "Academics",
    href: "/curriculum",
    children: [
      { label: "Curriculum", href: "/curriculum", description: "Whole-Part-Whole and mastery" },
      { label: "Student Handbook", href: "/handbook", description: "Policies and expectations" },
    ],
  },
  { label: "Higher Institute", href: "/higher-institute" },
  {
    label: "Admissions",
    href: "/admissions",
    children: [
      { label: "How to Enroll", href: "/admissions", description: "Our four-step process" },
      { label: "Tuition & Iowa ESA", href: "/tuition", description: "$200/month and ESA funding" },
    ],
  },
  { label: "Contact", href: "/contact" },
] as const;

/** Compact link set for the footer's "Navigate" column. */
export const footerNav: readonly NavItem[] = [
  { label: "Our History", href: "/about" },
  { label: "Mission & Philosophy", href: "/mission" },
  { label: "Curriculum", href: "/curriculum" },
  { label: "Student Handbook", href: "/handbook" },
  { label: "Higher Institute", href: "/higher-institute" },
  { label: "Staff & Instructors", href: "/staff" },
  { label: "Tuition & Iowa ESA", href: "/tuition" },
  { label: "Accreditation", href: "/accreditation" },
] as const;

/* ==========================================================================
   ACCREDITATION PACKET — the nine documents plus the Iowa DE narrative.
   Slugs are the [doc] route segment at /accreditation/[doc].
   ========================================================================== */

export const accreditationDocs = [
  { n: 1, slug: "school-profile", title: "School Profile & Institutional History" },
  { n: 2, slug: "mission-philosophy", title: "Mission, Vision & Educational Philosophy" },
  { n: 3, slug: "curriculum-framework", title: "Curriculum Framework & Scope of Instruction" },
  { n: 4, slug: "family-handbook", title: "Student & Family Handbook" },
  { n: 5, slug: "staff-qualifications", title: "Staff Qualifications & Instructor Framework" },
  { n: 6, slug: "student-records", title: "Student Records System & Templates" },
  { n: 7, slug: "higher-institute", title: "The VA Higher Institute Program Framework" },
  { n: 8, slug: "employer-mou", title: "Employer Partnership Agreement (MOU Template)" },
  { n: 9, slug: "enrollment-agreement", title: "Family Enrollment Agreement" },
  {
    n: null,
    slug: "iowa-de-narrative",
    title: "Iowa DE Accreditation Application Narrative",
  },
] as const;

/* ==========================================================================
   CURRICULUM RESOURCES — Document 3 §3.4
   ========================================================================== */

export const curriculumResources = [
  {
    name: "K12/Stride Curriculum Platform",
    detail:
      "Cognia-accredited, providing structured course content, assessments, and materials across all core subject areas. Currently accessed through the school's public partnership; transitioning to direct private school licensing upon accreditation.",
  },
  {
    name: "ABA Instructional Design",
    detail:
      "All instruction is task-analyzed, sequenced, and delivered using Applied Behavior Analysis methodology. The school's behavioral curriculum framework was designed by the Head of School, who holds advanced credentials in ABA.",
  },
  {
    name: "Traditional Taekwondo Curriculum",
    detail:
      "Instruction follows the traditional Taekwondo curriculum as structured by the school's master-level program. Belt progression serves as a formal assessment and advancement system.",
  },
] as const;

/** Document 3 §3.5 */
export const masteryAssessment = [
  "Students demonstrate mastery of skills through performance — written, oral, and applied demonstration.",
  "Mastery of a complex task is accepted as evidence of mastery of all simpler constituent skills embedded within it (hierarchical competency assessment).",
  "Group demonstrations provide naturalistic evidence of skill generalization across the peer environment.",
  "Individual task analyses document each student's precise position within any given skill sequence.",
  "Academic records include skill mastery logs, task analysis completion records, and behavioral progress documentation.",
] as const;
