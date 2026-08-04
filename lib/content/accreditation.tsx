import type { ReactNode } from "react";
import {
  school,
  addressLine,
  yearsInOperation,
  mission,
  vision,
  philosophy,
  values,
  wholePartWhole,
  cohorts,
  coreSubjects,
  enrichmentSubjects,
  curriculumResources,
  masteryAssessment,
  admissionsSteps,
  nonDiscrimination,
  tuition,
  attendancePolicy,
  behaviorPillars,
  behaviorResponseSteps,
  taekwondoRequirements,
  graduationPathways,
  headOfSchool,
  instructorRequirements,
  instructorPreferred,
  higherInstitute,
  careerPathways,
  beltRanks,
  attendanceCodes,
  accreditationDocs,
} from "@/lib/site";
import { DataTable } from "@/app/components/ui/Table";
import { Callout } from "@/app/components/ui/Callout";

/**
 * THE ACCREDITATION PACKET — document content
 * ============================================================================
 * The nine submission documents plus the Iowa DE application narrative, rendered
 * as linkable, printable web pages at /accreditation/[doc].
 *
 * Every fact here is pulled from lib/site.ts rather than retyped, so the packet
 * and the public marketing pages can never disagree with each other. That matters
 * more than usual: this is a regulatory submission, and a discrepancy between the
 * public site and the filed documents is the kind of thing a reviewer notices.
 *
 * Templates A–D (Document 6) render as genuinely blank, printable forms — the
 * school uses them on paper today, and the admin records system built in Phase 5
 * implements the same schema digitally.
 */

/* ---------------------------------------------------------------------------
   Document formatting primitives
   Local to this file: these produce a formal numbered-section document look that
   would be wrong anywhere else on the site.
   --------------------------------------------------------------------------- */

function DocTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="print-keep font-serif text-3xl font-bold leading-tight text-navy-900">
      {children}
    </h1>
  );
}

function Preamble({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 border-l-2 border-gold-400 pl-4 text-sm italic leading-relaxed text-ink-muted">
      {children}
    </p>
  );
}

function S({ n, title }: { n: string; title: string }) {
  return (
    <h2 className="print-keep mt-10 font-serif text-xl font-bold text-navy-900">
      <span className="text-gold-600">{n}</span> {title}
    </h2>
  );
}

function Sub({ children }: { children: ReactNode }) {
  return (
    <h3 className="print-keep mt-6 font-serif text-base font-bold text-navy-800">
      {children}
    </h3>
  );
}

function P({ children }: { children: ReactNode }) {
  return <p className="mt-3 leading-relaxed text-ink">{children}</p>;
}

function Ul({ items }: { items: readonly ReactNode[] }) {
  return (
    <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 leading-relaxed text-ink">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function Ol({ items }: { items: readonly ReactNode[] }) {
  return (
    <ol className="mt-3 flex list-decimal flex-col gap-1.5 pl-5 leading-relaxed text-ink">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ol>
  );
}

function T({ ...props }: React.ComponentProps<typeof DataTable>) {
  return (
    <div className="mt-4">
      <DataTable {...props} />
    </div>
  );
}

/** A fill-in rule for the blank paper templates and signature blocks. */
function Blank({ label, width = "w-64" }: { label: string; width?: string }) {
  return (
    <span className="mr-6 inline-flex items-baseline gap-2 whitespace-nowrap">
      <span className="text-sm font-semibold text-navy-900">{label}:</span>
      <span
        aria-hidden="true"
        className={`${width} border-b border-ink-subtle`}
      >
        &nbsp;
      </span>
    </span>
  );
}

/** Empty rows for a blank printable form. */
function blankRows(cols: number, count: number): readonly (readonly string[])[] {
  return Array.from({ length: count }, () => Array.from({ length: cols }, () => " "));
}

/* ---------------------------------------------------------------------------
   DOCUMENT 1 — School Profile & Institutional History
   --------------------------------------------------------------------------- */

function Doc1() {
  return (
    <>
      <DocTitle>School Profile &amp; Institutional History</DocTitle>
      <Preamble>
        Prepared for the Iowa Department of Education &mdash; Nonpublic School
        Accreditation Application.
      </Preamble>

      <S n="1.1" title="Institutional Identity" />
      <T
        caption="Institutional identity fields"
        headers={["Field", "Information"]}
        rowHeaders
        rows={[
          ["Legal name", school.legalName],
          ["Operating name (DBA)", school.dbaName],
          ["Address", addressLine],
          ["County", school.address.county],
          ["Phone", school.phone],
          ["Email", school.email],
          [
            "Year established",
            `${school.established} (${yearsInOperation()} years of continuous operation)`,
          ],
          ["Legal status", school.legalStatus],
          ["Grade levels served", school.gradeLevels],
          ["School calendar", school.calendar],
          ["Head of School", school.headOfSchool],
        ]}
      />

      <S n="1.2" title="Institutional History" />
      <P>
        The Von Der Becke Academy Corp was established in {school.established} in{" "}
        {school.address.city}, Iowa, by {school.headOfSchool}, a career educator
        and behavioral specialist with professional experience dating to 2004. The
        school was founded on the conviction that every student is capable of
        achieving at the highest levels when instruction is individualized,
        expectations are never lowered, and the learning environment is built on
        discipline, mastery, and character.
      </P>
      <P>
        Operating in {school.address.county} for {yearsInOperation()} consecutive
        years, The VA School has served students spanning kindergarten through high
        school, maintaining continuous enrollment through its model of
        competency-based, ABA-informed instruction integrated with a martial arts
        discipline framework. Over its operational history, the school has produced
        graduates who have gone on to assume leadership roles in retail management,
        community development, and the technology sector.
      </P>
      <P>
        The school&rsquo;s founding philosophy remains unchanged: hold every
        student to the highest standard, provide every tool needed to reach it, and
        never move the goal post downward. Students advance when they have earned
        advancement &mdash; not when a calendar dictates it.
      </P>

      <S n="1.3" title="Current Population & Community Context" />
      <P>
        The VA School enrolls a small number of students across multiple grade
        levels, reflecting its highly individualized instructional approach.{" "}
        {school.address.city}, Iowa is a diverse agricultural and light-industrial
        community with growing technology and healthcare sectors &mdash; the very
        career fields around which the school&rsquo;s advanced program is designed.
        The school actively serves families who seek an alternative to conventional
        pacing models, including students who have been underserved by standard
        grade-level instruction.
      </P>

      <S n="1.4" title="Facility" />
      <P>{school.facility}</P>
      <P>
        The school is actively seeking expanded facilities to accommodate program
        growth and is pursuing accreditation and school choice fund access to
        support this transition.
      </P>

      <S n="1.5" title="Existing Partnerships" />
      <P>
        The VA School has maintained an operational partnership with a K12-powered
        public virtual school program, through which students have accessed
        state-funded curriculum resources. The school is now formalizing its
        independent accreditation status to enable direct participation in
        Iowa&rsquo;s Education Savings Account (ESA) school choice program,
        ensuring that per-pupil funding flows directly to the educational
        environment where instruction is provided.
      </P>
    </>
  );
}

/* ---------------------------------------------------------------------------
   DOCUMENT 2 — Mission, Vision & Educational Philosophy
   --------------------------------------------------------------------------- */

function Doc2() {
  return (
    <>
      <DocTitle>Mission, Vision &amp; Educational Philosophy</DocTitle>

      <S n="2.1" title="Mission Statement" />
      <div className="mt-3 border-l-4 border-gold-400 bg-navy-50 py-4 pl-5 pr-4">
        <p className="font-serif text-lg italic leading-relaxed text-navy-900">
          {mission}
        </p>
      </div>

      <S n="2.2" title="Vision Statement" />
      <P>{vision}</P>

      <S n="2.3" title="Core Educational Philosophy" />
      {philosophy.map((p) => (
        <div key={p.title}>
          <Sub>{p.title}</Sub>
          <P>{p.body}</P>
        </div>
      ))}

      <S n="2.4" title="The VA School Values (Aligned with Traditional Taekwondo Tenets)" />
      <T
        caption="The five school values and their applied meaning"
        headers={["Value", "Applied meaning at The VA School"]}
        rowHeaders
        rows={values.map((v) => [v.name, v.meaning])}
      />
    </>
  );
}

/* ---------------------------------------------------------------------------
   DOCUMENT 3 — Curriculum Framework & Scope of Instruction
   --------------------------------------------------------------------------- */

function Doc3() {
  return (
    <>
      <DocTitle>Curriculum Framework &amp; Scope of Instruction</DocTitle>

      <S n="3.1" title="Instructional Model — The Whole-Part-Whole Cycle" />
      <P>
        The VA School&rsquo;s instructional delivery is built around a repeating
        Whole-Part-Whole cycle that operates across all cohort groups and all
        subjects. This model ensures that all students are constantly oriented
        toward high-level concepts while receiving the individualized instruction
        necessary to build mastery at their current level.
      </P>
      <T
        caption="The three phases of the Whole-Part-Whole instructional cycle"
        headers={["Phase", "Description", "Purpose"]}
        rowHeaders
        rows={wholePartWhole.map((p) => [
          `${p.phase} — ${p.label}`,
          p.description,
          p.purpose,
        ])}
      />

      <S n="3.2" title="Cohort Group Structure" />
      <P>
        Students are organized into four developmental cohort groups. These groups
        are not strictly age-based but reflect the student&rsquo;s current academic
        and developmental stage.
      </P>
      <T
        caption="The four cohort groups, their level ranges and focus"
        headers={["Cohort", "Level range", "Focus"]}
        rowHeaders
        rows={cohorts.map((c) => [c.name, c.range, c.focus])}
      />

      <S n="3.3" title="Subject Areas & Content Coverage" />
      <Sub>Core academic subjects</Sub>
      <Ul items={coreSubjects.map((s) => (<><strong>{s.name}</strong> &mdash; {s.scope}</>))} />
      <Sub>Enrichment &amp; applied subjects</Sub>
      <Ul items={enrichmentSubjects.map((s) => (<><strong>{s.name}</strong> &mdash; {s.scope}</>))} />

      <S n="3.4" title="Curriculum Resources" />
      {curriculumResources.map((r) => (
        <div key={r.name}>
          <Sub>{r.name}</Sub>
          <P>{r.detail}</P>
        </div>
      ))}

      <S n="3.5" title="Mastery Assessment Framework" />
      <P>
        The VA School does not use conventional letter grades as the primary
        measure of learning. Assessment is mastery-based:
      </P>
      <Ul items={masteryAssessment} />

      <div className="mt-6">
        <Callout title="Equivalency note for Iowa DE" variant="statute">
          The Whole-Part-Whole instructional cycle, paired with mastery-based
          progression and hierarchical competency assessment, delivers equivalent
          or superior instructional contact across all required subject areas.
          Students receive individualized instruction matched to their exact
          developmental level while consistently working toward and demonstrating
          high-level academic standards.
        </Callout>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------------------
   DOCUMENT 4 — Student & Family Handbook
   --------------------------------------------------------------------------- */

function Doc4() {
  return (
    <>
      <DocTitle>Student &amp; Family Handbook</DocTitle>
      <Preamble>
        This Handbook governs enrollment, attendance, conduct, and progression at
        The VA School. By enrolling, families affirm understanding of and agreement
        with all policies contained herein.
      </Preamble>

      <S n="4.1" title="School Contact Information" />
      <P>
        {school.legalName} ({school.dbaName})
        <br />
        {addressLine}
        <br />
        {school.phone} &middot; {school.email}
      </P>

      <S n="4.2" title="Enrollment & Admissions" />
      <Sub>Who we serve</Sub>
      <P>
        The VA School accepts students in grades Kindergarten through 12, and
        eligible graduates into The VA Higher Institute (ages 16&ndash;18). The
        school is designed to serve students at all academic and behavioral
        starting points. No student is turned away because of academic gaps,
        behavioral history, or prior school difficulty &mdash; these are exactly
        the students our model is built for.
      </P>
      <Sub>Admissions process</Sub>
      <Ol items={admissionsSteps.map((s) => (<><strong>{s.title}.</strong> {s.detail}</>))} />
      <Sub>Non-discrimination policy</Sub>
      <P>{nonDiscrimination}</P>

      <S n="4.3" title="Tuition & Fees" />
      <T
        caption="Tuition and fee schedule"
        headers={["Fee type", "Amount", "Notes"]}
        rowHeaders
        rows={[
          [
            "Monthly family contribution",
            tuition.monthlyContributionLabel,
            tuition.monthlyContributionNote,
          ],
          ["Iowa ESA tuition", tuition.esaEstimateLabel, tuition.esaNote],
          [
            "Financial hardship",
            "Available on request",
            "Contact the Head of School to discuss individually.",
          ],
        ]}
      />

      <S n="4.4" title="School Calendar & Schedule" />
      <Ul
        items={[
          "Instructional days: Monday through Thursday (four-day week)",
          "Schedule: Year-round with scheduled breaks",
          "Daily hours are published to enrolled families and provided on request",
          `School closures follow ${school.address.county} weather emergency protocols`,
        ]}
      />

      <S n="4.5" title="Attendance Policy" />
      <P>
        Consistent attendance is essential to the mastery-based model. Because each
        student&rsquo;s progression is tracked individually, absences create gaps
        in the instructional sequence that must be resolved before advancement.
      </P>
      <Ul items={attendancePolicy.notes} />

      <S n="4.6" title="Behavioral Framework — The Three Pillars" />
      <P>
        The VA School&rsquo;s behavioral expectations are grounded in Applied
        Behavior Analysis and expressed through three Pivotal Behavior pillars.
        These are taught as academic content, reinforced individually, and held to
        the same mastery standard as any academic subject.
      </P>
      <T
        caption="The three pivotal behavior pillars"
        headers={["Pillar", "Definition & practice"]}
        rowHeaders
        rows={behaviorPillars.map((p) => [p.name, `${p.definition} ${p.practice}`])}
      />
      <Sub>Responding to behavioral challenges</Sub>
      <P>
        At The VA School, no behavioral challenge is a crisis &mdash; it is an
        instructional opportunity. When a student exhibits behavior that disrupts
        learning or violates the school&rsquo;s values, the following process is
        used:
      </P>
      <Ol items={behaviorResponseSteps} />
      <div className="mt-6">
        <Callout title="Note" variant="statute">
          The VA School does not use punitive discipline, exclusionary practices,
          or shame-based responses. Suspension and expulsion are last-resort
          measures used only in the event of safety threats, and only after
          documented intervention efforts.
        </Callout>
      </div>

      <S n="4.7" title="Taekwondo Requirements" />
      <P>
        Taekwondo is a core component of The VA School experience &mdash; not
        elective, not supplementary. It is the physical, behavioral, and
        philosophical vessel through which the school&rsquo;s values are embodied
        and practiced.
      </P>
      <Ul items={taekwondoRequirements} />

      <S n="4.8" title="Graduation Requirements" />
      <P>
        Graduation from The VA School represents the full achievement of academic
        mastery and character development. It is not conferred by age or seat time
        &mdash; it is earned.
      </P>
      <Sub>Academic requirements</Sub>
      <Ul
        items={[
          "Demonstrated mastery in all core subject areas: Mathematics, Science, English Language Arts, Social Studies",
          "Completion of applied subject requirements: Computer Science/Coding, Leadership Development",
          "Competency in all skills within the student's individualized progression sequence",
          "Successful demonstration of high-level academic performance consistent with 12th-grade equivalency",
        ]}
      />
      <Sub>Character &amp; physical requirements</Sub>
      <Ul
        items={[
          "Demonstrated mastery of all three Pivotal Behavior pillars, assessed through instructor observation, structured demonstration, and behavioral history",
          "Taekwondo rank consistent with black-belt level values and character standard, as assessed by the Head of School",
          "Demonstrated physical conditioning and self-discipline through sustained Taekwondo participation",
        ]}
      />
      <Sub>Graduation pathways</Sub>
      <T
        caption="The two graduation pathways"
        headers={["Pathway", "Description"]}
        rowHeaders
        rows={graduationPathways.map((p) => [p.name, p.detail])}
      />
      <div className="mt-6">
        <Callout title="Note on graduation age" variant="statute">
          Iowa Code §299.1 establishes compulsory school attendance for children
          ages 6&ndash;16. There is no Iowa statute prohibiting graduation before
          age 18. The VA School&rsquo;s graduation standard is achievement-based,
          not age-based. Students who complete all requirements by age 16 are
          fully eligible to receive a VA School diploma under Iowa law.
        </Callout>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------------------
   DOCUMENT 5 — Staff Qualifications & Instructor Framework
   --------------------------------------------------------------------------- */

function Doc5() {
  return (
    <>
      <DocTitle>Staff Qualifications &amp; Instructor Framework</DocTitle>

      <S n="5.1" title="Head of School" />
      <T
        caption="Head of School qualifications"
        headers={["Field", "Details"]}
        rowHeaders
        rows={[
          ["Name", headOfSchool.name],
          ["Title", headOfSchool.title],
          ["Professional experience", headOfSchool.experience],
          ["Credentials", headOfSchool.credentials.join("; ")],
          ["ABA competencies", headOfSchool.abaCompetencies],
          [
            "Taekwondo",
            "Master-level rank; certified instructor; curriculum design and rank assessment",
          ],
          ["Role at school", headOfSchool.role],
        ]}
      />

      <S n="5.2" title="Instructor Requirements" />
      <P>
        All instructors at The VA School, whether full-time, part-time, or
        volunteer, are required to meet the following standards as a condition of
        serving in an instructional role.
      </P>
      <Sub>Required for all instructors</Sub>
      <Ul items={instructorRequirements} />
      <Sub>Preferred credentials</Sub>
      <Ul items={instructorPreferred} />
      <Sub>Current recruitment</Sub>
      <P>
        The VA School is actively recruiting instructors and parent volunteers.
        Interested candidates should contact {headOfSchool.name} at{" "}
        {school.email}. All applicants undergo an interview, background screening,
        and orientation before working with students.
      </P>

      <S n="5.3" title="Instructor Log" />
      <P>
        The school maintains a formal log of all instructional staff. Compliance
        items &mdash; ABA foundational training, Taekwondo orientation,
        subject-matter competency, background check clearance, and the signed
        Instructor Agreement &mdash; are recorded for each individual.
      </P>
      <T
        caption="Instructor log"
        headers={["Name", "Role", "Credentials", "Start date"]}
        rows={[
          [
            headOfSchool.name,
            "Head of School / Lead Instructor",
            "See Section 5.1",
            String(school.established),
          ],
          ...blankRows(4, 3),
        ]}
      />
    </>
  );
}

/* ---------------------------------------------------------------------------
   DOCUMENT 6 — Student Records System & Templates
   The four templates render as blank printable forms.
   --------------------------------------------------------------------------- */

function Doc6() {
  return (
    <>
      <DocTitle>Student Records System &amp; Templates</DocTitle>

      <S n="6.1" title="Records Policy" />
      <P>
        The VA School maintains a confidential student record for every enrolled
        student. Records are stored securely, accessible only to authorized school
        personnel and the student&rsquo;s family. Records are retained for a
        minimum of seven years following the student&rsquo;s departure from the
        school. Families may request access to their student&rsquo;s records at any
        time.
      </P>

      <S n="6.2" title="Record Types Maintained" />
      <Ul
        items={[
          "Student enrollment file (application, signed agreements, emergency contacts, immunization or exemption records)",
          "Attendance log (daily, by student)",
          "Academic progress record (mastery log by subject and skill domain)",
          "Behavioral progress record (pivotal behavior data by pillar)",
          "Taekwondo progression record (rank history, assessment dates)",
          "Instructor observation notes (filed by date)",
          "Correspondence with families",
        ]}
      />

      <S n="6.3" title="Template A — Daily Attendance Log" />
      <div className="mt-3 text-sm text-ink-muted">
        <Blank label="Week of" width="w-40" />
        <Blank label="Cohort" width="w-32" />
      </div>
      <T
        caption="Template A — blank daily attendance log"
        headers={["Student name", "Mon", "Tue", "Wed", "Thu", "Notes"]}
        rows={blankRows(6, 6)}
      />
      <p className="mt-2 text-xs italic text-ink-subtle">
        Key:{" "}
        {Object.entries(attendanceCodes)
          .map(([code, { label }]) => `${code} = ${label}`)
          .join(" | ")}
      </p>

      <S n="6.4" title="Template B — Academic Mastery Progress Log" />
      <div className="mt-3 text-sm text-ink-muted">
        <Blank label="Student" width="w-56" />
        <Blank label="Cohort" width="w-32" />
        <Blank label="School year" width="w-28" />
      </div>
      <T
        caption="Template B — blank academic mastery progress log"
        headers={["Subject", "Skill / unit", "Date mastered", "Assessment method"]}
        rows={[
          ...coreSubjects.flatMap((s) => [
            [s.name, " ", " ", " "],
            [s.name, " ", " ", " "],
          ]),
          ["Computer Science / Coding", " ", " ", " "],
          ["Leadership Development", " ", " ", " "],
          ["Taekwondo", " ", " ", " "],
        ]}
      />

      <S n="6.5" title="Template C — Behavioral Progress Record (Pivotal Behaviors)" />
      <div className="mt-3 text-sm text-ink-muted">
        <Blank label="Student" width="w-56" />
        <Blank label="Period" width="w-40" />
      </div>
      <T
        caption="Template C — blank behavioral progress record"
        headers={["Pillar", "Target behavior", "Current level (1–5)", "Notes / next steps"]}
        rows={behaviorPillars.flatMap((pillar) =>
          pillar.targets.map((target) => [pillar.name, target, " ", " "]),
        )}
      />
      <p className="mt-2 text-xs italic leading-relaxed text-ink-subtle">
        Scale: 1 = Skill not yet observed | 2 = Emerging with significant support |
        3 = Developing with occasional support | 4 = Independent in familiar
        contexts | 5 = Generalized across environments
      </p>

      <S n="6.6" title="Template D — Taekwondo Rank Record" />
      <div className="mt-3 text-sm text-ink-muted">
        <Blank label="Student" width="w-56" />
      </div>
      <T
        caption="Template D — blank Taekwondo rank record"
        headers={["Belt rank", "Requirements demonstrated", "Assessment date", "Assessed by"]}
        rowHeaders
        rows={beltRanks.map((rank) => [rank, " ", " ", " "])}
      />
    </>
  );
}

/* ---------------------------------------------------------------------------
   DOCUMENT 7 — The VA Higher Institute Program Framework
   --------------------------------------------------------------------------- */

function Doc7() {
  return (
    <>
      <DocTitle>The VA Higher Institute Program Framework</DocTitle>
      <Preamble>
        Advanced Career &amp; Academic Preparation Program &middot; Ages
        16&ndash;18
      </Preamble>

      <S n="7.1" title="Program Overview" />
      <P>
        The VA Higher Institute is a structured two-year post-diploma program for
        graduates of The VA School who elect to continue their preparation before
        entering their chosen career or higher education pathway. It is designed
        for students who have demonstrated academic mastery and character strength
        at the black-belt standard.
      </P>
      <P>{higherInstitute.positioning}</P>
      <P>
        <strong>The central premise:</strong> {higherInstitute.premise} The VA
        Higher Institute is where that translation happens &mdash; before age 18,
        and before a student chooses a career path by default.
      </P>

      <S n="7.2" title="Eligibility" />
      <Ul items={higherInstitute.eligibility} />
      <div className="mt-4">
        <Callout variant="statute">
          Iowa Code §299.1 compulsory attendance ends at age 16 or upon
          graduation. Enrollment in The VA Higher Institute is voluntary and does
          not constitute K&ndash;12 schooling.
        </Callout>
      </div>

      <S n="7.3" title="Program Structure — Two-Year Framework" />
      <T
        caption="The five program components across Year 1 and Year 2"
        headers={["Component", "Year 1 (age 16–17)", "Year 2 (age 17–18)", "Delivery model"]}
        rowHeaders
        rows={higherInstitute.structure.map((c) => [
          c.component,
          c.yearOne,
          c.yearTwo,
          c.delivery,
        ])}
      />

      <S n="7.4" title="Career Pathways" />
      {careerPathways.map((p, i) => (
        <div key={p.id}>
          <Sub>
            Pathway {i + 1} &mdash; {p.name}
          </Sub>
          <P>{p.audience}</P>
          <Ul
            items={[
              <><strong>Field placements:</strong> {p.placements}</>,
              <><strong>Academic preparation:</strong> {p.academics}</>,
              <><strong>Certifications available:</strong> {p.certifications.join(", ")}</>,
              <><strong>Outcome:</strong> {p.outcome}</>,
              ...(p.disclaimer ? [<em key="d">{p.disclaimer}</em>] : []),
            ]}
          />
        </div>
      ))}
      <div className="mt-6">
        <Callout title="Iowa labor law note" variant="statute">
          Iowa Code Chapter 92 permits 16&ndash;17 year olds to work in the vast
          majority of occupational settings without a work permit. Hazardous
          occupation restrictions (mining, roofing, certain heavy manufacturing)
          are observed in all placement design. Iowa Workforce Development is
          consulted for placement compliance review.
        </Callout>
      </div>

      <S n="7.5" title="Community College Dual Enrollment" />
      <P>{higherInstitute.dualEnrollment}</P>

      <S n="7.6" title="Program Completion" />
      <P>
        Upon successful completion of the two-year program, students receive The VA
        Higher Institute Certificate of Completion and, if not previously
        conferred, The VA School diploma. The capstone project is presented to a
        professional panel and retained in the student&rsquo;s permanent record as
        a portfolio artifact. {higherInstitute.completion}
      </P>
    </>
  );
}

/* ---------------------------------------------------------------------------
   DOCUMENT 8 — Employer Partnership Agreement (MOU Template)
   --------------------------------------------------------------------------- */

function Doc8() {
  return (
    <>
      <DocTitle>Employer Partnership Agreement</DocTitle>
      <Preamble>
        Memorandum of Understanding &mdash; VA Higher Institute Career Immersion
        Placement
      </Preamble>

      <div className="mt-6 flex flex-col gap-3 text-sm">
        <p className="text-ink">
          <strong>Between:</strong> {school.legalName} (The VA School / The VA
          Higher Institute)
        </p>
        <div>
          <Blank label="And (“Partner Organization”)" width="w-72" />
        </div>
        <div>
          <Blank label="Date" width="w-48" />
        </div>
      </div>

      <S n="8.1" title="Purpose" />
      <P>
        This Memorandum of Understanding establishes a cooperative relationship
        between The VA School and the Partner Organization for the purpose of
        providing structured career immersion placement for one or more students
        enrolled in The VA Higher Institute. <strong>This agreement is not an
        employment contract.</strong> It defines the roles, responsibilities, and
        expectations of both parties to ensure a safe, productive, and
        educationally meaningful experience for the student.
      </P>

      <S n="8.2" title="Student & Placement Information" />
      <div className="mt-3 flex flex-col gap-3 text-sm">
        <div><Blank label="Student name(s)" width="w-72" /></div>
        <div>
          <Blank label="Placement start date" width="w-40" />
          <Blank label="End date" width="w-40" />
        </div>
        <div><Blank label="Career pathway" width="w-72" /></div>
        <div>
          <Blank label="Days per week on site" width="w-28" />
          <Blank label="Hours per day" width="w-28" />
        </div>
        <div><Blank label="Site mentor" width="w-64" /></div>
      </div>

      <S n="8.3" title="Responsibilities of The VA School" />
      <Ul
        items={[
          "Provide the Partner Organization with a clear description of the student's academic background, learning goals, and behavioral framework",
          "Ensure the student arrives prepared, on time, and in compliance with the school's behavioral standards",
          "Assign a School Liaison (Head of School or designated staff) available by phone during all placement hours",
          "Conduct weekly debrief sessions with the student to translate field experience into academic learning",
          "Review and maintain documentation of student participation, progress, and any incidents",
          "Ensure all placements are reviewed for compliance with Iowa Code Chapter 92 (youth employment regulations)",
          "Maintain appropriate liability insurance for student activities during placement",
        ]}
      />

      <S n="8.4" title="Responsibilities of the Partner Organization" />
      <Ul
        items={[
          "Designate a Site Mentor — a staff member who will supervise the student during all on-site hours",
          "Provide meaningful, age-appropriate tasks and learning experiences within the student's chosen pathway",
          "Adhere to all applicable Iowa and federal youth employment laws regarding tasks, hours, and occupational restrictions",
          "Notify the School Liaison immediately in the event of any safety concern, incident, or significant behavioral issue",
          "Provide a quarterly written evaluation of the student's performance, professionalism, and growth",
          "Not assign the student to tasks classified as hazardous under the FLSA or Iowa Code Chapter 92",
        ]}
      />

      <S n="8.5" title="Compensation" />
      <Ul
        items={[
          "☐ This placement is unpaid (internship / observational model)",
          "☐ This placement is compensated at $______ per hour, paid directly by the Partner Organization to the student",
          "☐ Other arrangement: ________________________________",
        ]}
      />
      <p className="mt-3 text-sm italic leading-relaxed text-ink-subtle">
        If compensated, the Partner Organization is responsible for applicable tax
        withholding and compliance with Iowa and federal wage laws for minors.
      </p>

      <S n="8.6" title="Duration & Termination" />
      <P>
        This agreement is in effect for the period stated above. Either party may
        terminate the placement with five (5) business days written notice. The VA
        School reserves the right to remove a student from a placement immediately
        if a safety or conduct concern arises.
      </P>

      <S n="8.7" title="Confidentiality" />
      <P>
        Both parties agree to maintain confidentiality regarding student records
        and performance. Student information shared in the course of this placement
        is subject to FERPA protections and shall not be disclosed to third parties
        without written family consent.
      </P>

      <S n="8.8" title="Signatures" />
      <div className="mt-4 grid gap-8 sm:grid-cols-2">
        <div className="flex flex-col gap-4 text-sm">
          <p className="font-semibold text-navy-900">For The VA School</p>
          <div><Blank label="Name" width="w-48" /></div>
          <div><Blank label="Title" width="w-48" /></div>
          <div><Blank label="Signature" width="w-48" /></div>
          <div><Blank label="Date" width="w-32" /></div>
        </div>
        <div className="flex flex-col gap-4 text-sm">
          <p className="font-semibold text-navy-900">For Partner Organization</p>
          <div><Blank label="Name" width="w-48" /></div>
          <div><Blank label="Title" width="w-48" /></div>
          <div><Blank label="Signature" width="w-48" /></div>
          <div><Blank label="Date" width="w-32" /></div>
          <div><Blank label="Organization" width="w-48" /></div>
          <div><Blank label="Address" width="w-48" /></div>
          <div><Blank label="Phone" width="w-40" /></div>
          <div><Blank label="Email" width="w-48" /></div>
        </div>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------------------
   DOCUMENT 9 — Family Enrollment Agreement
   --------------------------------------------------------------------------- */

function Doc9() {
  return (
    <>
      <DocTitle>Family Enrollment Agreement</DocTitle>
      <Preamble>
        Complete one agreement per enrolled student. Return the signed original to
        the Head of School. This agreement may also be completed online.
      </Preamble>

      <S n="9.1" title="Student Information" />
      <div className="mt-3 flex flex-col gap-3 text-sm">
        <div><Blank label="Student legal name" width="w-72" /></div>
        <div>
          <Blank label="Date of birth" width="w-36" />
          <Blank label="Grade level / cohort" width="w-40" />
        </div>
        <div><Blank label="Enrollment start date" width="w-48" /></div>
      </div>

      <S n="9.2" title="Family / Guardian Information" />
      <div className="mt-3 flex flex-col gap-3 text-sm">
        <div><Blank label="Parent/guardian name(s)" width="w-72" /></div>
        <div><Blank label="Address" width="w-72" /></div>
        <div>
          <Blank label="Primary phone" width="w-40" />
          <Blank label="Email" width="w-56" />
        </div>
        <div><Blank label="Emergency contact (if different)" width="w-56" /></div>
        <div><Blank label="Emergency phone" width="w-40" /></div>
      </div>

      <S n="9.3" title="Iowa ESA / School Choice" />
      <Ul
        items={[
          "☐ Our family intends to apply for Iowa Education Savings Account (ESA) funding for this student",
          "☐ Our family will pay the monthly family contribution without ESA funding",
          "☐ Our family is applying for financial hardship consideration",
        ]}
      />
      <p className="mt-3 text-sm italic leading-relaxed text-ink-subtle">
        ESA applications are made directly through the Iowa Department of
        Education. The VA School will provide any required documentation to support
        your application.
      </p>

      <S n="9.4" title="Program Acknowledgments" />
      <P>
        By signing below, the parent/guardian confirms they have read The VA School
        Student &amp; Family Handbook and agree to the following:
      </P>
      <Ul
        items={[
          "☐ We understand and accept the school's mastery-based progression model — our student advances upon demonstrated mastery, not by calendar year.",
          "☐ We understand that Taekwondo is a core and required component of enrollment, not elective.",
          "☐ We understand that graduation from The VA School is earned through demonstrated academic and character mastery, and is not conferred by age.",
          "☐ We agree to maintain consistent attendance and to communicate promptly regarding absences.",
          "☐ We understand and accept the school's behavioral framework, including the Three Pillars of Pivotal Behavior.",
          `☐ We acknowledge the monthly family contribution of $${tuition.monthlyContribution} per student and agree to timely payment.`,
          "☐ We consent to our student's participation in all regular school activities, including Taekwondo training.",
          "☐ We understand that student records are maintained confidentially and may be accessed by the family upon request.",
        ]}
      />

      <S n="9.5" title="Medical & Health" />
      <div className="mt-3 flex flex-col gap-3 text-sm">
        <div><Blank label="Known medical conditions or allergies" width="w-64" /></div>
        <div><Blank label="Current medications (if any)" width="w-64" /></div>
        <div><Blank label="Doctor/clinic name and phone" width="w-64" /></div>
      </div>
      <Ul
        items={[
          "☐ Immunization records on file",
          "☐ Immunization exemption on file",
        ]}
      />
      <p className="mt-3 text-sm italic leading-relaxed text-ink-subtle">
        Iowa law requires documentation of either immunization compliance or a
        valid exemption for enrolled students.
      </p>

      <S n="9.6" title="Photo & Media Release" />
      <Ul
        items={[
          "☐ I consent to photographs or video of my student being used for school promotional materials",
          "☐ I do NOT consent to photographs or video of my student for any school promotional use",
        ]}
      />

      <S n="9.7" title="Signatures" />
      <div className="mt-4 grid gap-8 sm:grid-cols-2">
        <div className="flex flex-col gap-4 text-sm">
          <p className="font-semibold text-navy-900">Parent / Guardian</p>
          <div><Blank label="Name (print)" width="w-48" /></div>
          <div><Blank label="Signature" width="w-48" /></div>
          <div><Blank label="Date" width="w-32" /></div>
        </div>
        <div className="flex flex-col gap-4 text-sm">
          <p className="font-semibold text-navy-900">Head of School</p>
          <p className="text-ink-muted">
            {headOfSchool.name} &mdash; {school.legalName}
          </p>
          <div><Blank label="Signature" width="w-48" /></div>
          <div><Blank label="Date" width="w-32" /></div>
        </div>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------------------
   BONUS — Iowa DE Accreditation Application Narrative
   --------------------------------------------------------------------------- */

function Narrative() {
  return (
    <>
      <DocTitle>
        Iowa Department of Education Nonpublic School Accreditation &mdash;
        Application Narrative
      </DocTitle>
      <Preamble>
        This narrative is prepared for submission with the Iowa DE nonpublic school
        accreditation application. It addresses each review area specified under
        Iowa Code Chapter 256.
      </Preamble>

      <S n="" title="Applicant Information" />
      <T
        caption="Applicant information"
        headers={["Field", "Information"]}
        rowHeaders
        rows={[
          ["School name", `${school.legalName} (${school.dbaName})`],
          ["Address", addressLine],
          ["Head of School", school.headOfSchool],
          [
            "Years in operation",
            `${yearsInOperation()} years (established ${school.established})`,
          ],
          ["Legal status", school.legalStatus],
        ]}
      />

      <S n="1" title="Educational Program & Equivalent Instruction" />
      <P>
        {school.legalName} provides comprehensive instruction in all subject areas
        required for a K&ndash;12 education under Iowa educational standards,
        including Mathematics, Science, English Language Arts, Social Studies, and
        Physical Education. Instruction is enriched by applied courses in Computer
        Science, Leadership Development, and the integrated Taekwondo discipline
        curriculum.
      </P>
      <P>
        The school&rsquo;s primary academic curriculum resource is the K12/Stride
        platform &mdash; a Cognia-accredited, nationally recognized curriculum
        covering all core subjects from kindergarten through grade 12. All course
        content is delivered and supplemented by direct instruction from the Head
        of School and supporting instructors.
      </P>
      <P>
        The instructional model &mdash; the Whole-Part-Whole cycle &mdash; ensures
        that all students engage with high-level academic content in group
        instruction, receive individualized micro-instruction calibrated to their
        current mastery level, and demonstrate progress through group reconvening
        sessions approximately every hour. This model satisfies and exceeds the
        &ldquo;equivalent instruction&rdquo; standard required of Iowa nonpublic
        schools, providing individualized instructional attention that public
        classrooms with larger student-to-teacher ratios cannot replicate.
      </P>
      <P>
        Student advancement is governed by demonstrated mastery, not seat time.
        This approach, grounded in Applied Behavior Analysis, ensures that no
        student advances without genuine competency, producing a more rigorous
        academic standard than calendar-based promotion.
      </P>

      <S n="2" title="Student Progress & Assessment" />
      <P>
        The VA School maintains individual academic progress records for every
        enrolled student, using a skill mastery log that documents the specific
        skills demonstrated, the date of mastery, and the assessment method.
        Mastery is assessed through direct performance demonstration &mdash;
        written, oral, and applied &mdash; with complex task demonstration accepted
        as evidence of constituent skill mastery (hierarchical competency
        assessment).
      </P>
      <P>
        Behavioral progress is tracked through the school&rsquo;s Pivotal Behavior
        framework, monitoring three domains: self-control, self-awareness, and
        strength of character. These records are maintained using a structured
        behavioral progress template (see Document 6) rated on a five-point
        generalization scale.
      </P>
      <P>
        The school maintains a formal records management system aligned with best
        practices for nonpublic school documentation. All records are maintained
        for a minimum of seven years.
      </P>

      <S n="3" title="Instructor Qualifications" />
      <P>
        {school.legalName} is led by {headOfSchool.name}, a career educator and
        behavioral specialist with {headOfSchool.experience.toLowerCase()}. He
        holds masters-level preparation in Applied Behavior Analysis, Taekwondo
        instruction, Education, and Clinical Mental Health Counseling, and has been
        the primary instructor and school administrator since the school&rsquo;s
        founding in {school.established}.
      </P>
      <P>
        Iowa does not require teacher certification for nonpublic school
        instructors. The VA School goes beyond this baseline by requiring all
        instructors to complete foundational training in both ABA instructional
        principles and Taekwondo values as a condition of employment. This ensures
        consistency in instructional approach and behavioral framework across all
        staff. Background check clearance is required prior to any student contact.
      </P>

      <S n="4" title="School Policies & Governance" />
      <P>
        {school.legalName} operates under the governance of its founding director,{" "}
        {headOfSchool.name}, with a nonprofit board structure. The school maintains
        a comprehensive Student &amp; Family Handbook (Document 4 of this package)
        covering enrollment, attendance, behavioral expectations, graduation
        requirements, and family rights. All families receive and sign an
        acknowledgment of the Handbook at enrollment.
      </P>
      <P>
        Disciplinary practices at The VA School are non-punitive and grounded in
        ABA coaching methodology. No exclusionary discipline is used as a first
        response. All behavioral challenges are addressed through direct coaching,
        functional analysis, and skill development, consistent with best practices
        in behavioral intervention.
      </P>

      <S n="5" title="Physical Facility" />
      <P>
        {school.facility} The facility is located at {addressLine} and meets
        applicable health and safety codes for an educational setting. Fire and
        health inspection certificates are provided as attachments to this
        application.
      </P>
      <P>
        The school is actively seeking a larger facility to accommodate program
        growth and The VA Higher Institute expansion. This accreditation and the
        associated access to Iowa ESA school choice funding are the primary
        mechanisms through which the school will finance a facility upgrade.
      </P>

      <S n="6" title="Summary Statement" />
      <P>
        {school.legalName} has served Iowa students and families for{" "}
        {yearsInOperation()} consecutive years with a distinctive,
        research-grounded instructional model that holds every student to the
        highest standard &mdash; and provides the individual support to reach it.
        The school&rsquo;s integration of Applied Behavior Analysis, Taekwondo
        discipline, mastery-based progression, and character development produces
        graduates who are academically prepared, behaviorally self-sufficient, and
        professionally confident.
      </P>
      <P>
        Accreditation by the Iowa Department of Education would formalize what{" "}
        {yearsInOperation()} years of operational history has already demonstrated:
        The VA School is a genuine, capable, and distinctive nonpublic school
        deserving of full recognition under Iowa Code Chapter 256.
      </P>
    </>
  );
}

/* ---------------------------------------------------------------------------
   REGISTRY
   Slug → renderer. Keyed to accreditationDocs in lib/site.ts, which drives both
   the packet index and generateStaticParams.
   --------------------------------------------------------------------------- */

const bodies: Record<string, () => ReactNode> = {
  "school-profile": Doc1,
  "mission-philosophy": Doc2,
  "curriculum-framework": Doc3,
  "family-handbook": Doc4,
  "staff-qualifications": Doc5,
  "student-records": Doc6,
  "higher-institute": Doc7,
  "employer-mou": Doc8,
  "enrollment-agreement": Doc9,
  "iowa-de-narrative": Narrative,
};

export type AccreditationDoc = (typeof accreditationDocs)[number];

/** Returns the document metadata and renderer for a slug, or null if unknown. */
export function getAccreditationDoc(slug: string): {
  meta: AccreditationDoc;
  Body: () => ReactNode;
} | null {
  const meta = accreditationDocs.find((d) => d.slug === slug);
  const Body = bodies[slug];
  if (!meta || !Body) return null;
  return { meta, Body };
}

export { accreditationDocs };
