import type { Metadata } from "next";
import { school, addressLine, yearsInOperation, yearsInStormLake } from "@/lib/site";
import { PageHeader, Prose, FactList } from "@/app/components/ui/PageHeader";
import { Section, SectionHeading } from "@/app/components/ui/Section";
import { Callout } from "@/app/components/ui/Callout";
import { CTABand } from "@/app/components/ui/CTABand";
import ImagePlaceholder from "@/app/components/ImagePlaceholder";

/** Source: accreditation package Document 1 — School Profile & Institutional History. */
export const metadata: Metadata = {
  title: "Our History",
  description: `Founded in ${school.established} in ${school.establishedIn} and in Storm Lake, Iowa since ${school.inStormLakeSince}, The VA School teaches K–12 students through mastery-based, ABA-informed instruction.`,
};

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About the school"
        title="Years of not lowering the bar"
        lead={`The Von Der Becke Academy Corp has operated since ${school.established} and has taught families in ${school.address.county} since ${school.inStormLakeSince}, on one conviction: every student can achieve at the highest level when instruction is individualized and expectations are never reduced.`}
      />

      <Section>
        <div className="grid gap-12 lg:grid-cols-5 lg:gap-16">
          <div className="lg:col-span-3">
            <Prose>
              <h2>How the school began</h2>
              <p>
                The Von Der Becke Academy Corp was established in{" "}
                {school.established} in {school.establishedIn}. The school moved to{" "}
                {school.address.city}, Iowa at the end of{" "}
                {school.relocatedToStormLake} and opened here in{" "}
                {school.inStormLakeSince} &mdash; {yearsInStormLake()} years of
                teaching Iowa families. Founded by{" "}
                <strong>{school.headOfSchool}</strong>, a career educator and
                behavioral specialist whose professional experience dates to
                2004. The school was founded on the conviction that every student
                is capable of achieving at the highest levels &mdash; when
                instruction is individualized, expectations are never lowered,
                and the learning environment is built on discipline, mastery, and
                character.
              </p>
              <p>
                Over {yearsInStormLake()} consecutive years in{" "}
                {school.address.county}, the school has served students spanning
                kindergarten through high school, maintaining continuous
                enrollment through a model that few schools attempt:
                competency-based, ABA-informed instruction integrated with a
                martial arts discipline framework.
              </p>
              <p>
                Graduates have gone on to leadership roles in retail management,
                community development, and the technology sector.
              </p>

              <h2>The founding philosophy has not changed</h2>
              <p>
                Hold every student to the highest standard. Provide every tool
                needed to reach it. Never move the goal post downward. Students
                advance when they have <strong>earned</strong> advancement &mdash;
                not when a calendar dictates it.
              </p>

              <h2>Who we serve</h2>
              <p>
                The VA School currently enrolls a small number of students across
                multiple grade levels, which is what makes genuinely
                individualized instruction possible rather than aspirational.
              </p>
              <p>
                {school.address.city} is a diverse agricultural and
                light-industrial community with growing technology and healthcare
                sectors &mdash; the very career fields the school&rsquo;s advanced
                program is built around. We actively serve families seeking an
                alternative to conventional pacing models, including students who
                have been underserved by standard grade-level instruction. Those
                are not edge cases here. They are who this model was designed for.
              </p>
            </Prose>
          </div>

          <div className="lg:col-span-2">
            <ImagePlaceholder
              src="/mission-parent-involvement.png"
              alt="A parent and instructor reviewing a student's progress together at The VA School"
              aspectRatio="aspect-[4/5]"
              sizes="(max-width: 1024px) 100vw, 400px"
            />
          </div>
        </div>
      </Section>

      {/* Institutional identity — Document 1 §1.1 */}
      <Section tone="muted">
        <SectionHeading
          eyebrow="Institutional identity"
          title="The facts on file"
          lead="The same details submitted to the Iowa Department of Education."
        />
        <div className="mt-8 max-w-3xl">
          <FactList
            items={[
              { label: "Legal name", value: school.legalName },
              { label: "Operating name", value: school.dbaName },
              { label: "Address", value: addressLine },
              { label: "County", value: school.address.county },
              {
                label: "Corporation established",
                value: `${school.established} in ${school.establishedIn} (${yearsInOperation()} years of continuous operation)`,
              },
              {
                label: `Opened in ${school.address.city}, Iowa`,
                value: `${school.inStormLakeSince} (${yearsInStormLake()} years; relocated from ${school.establishedIn} at the end of ${school.relocatedToStormLake})`,
              },
              { label: "Legal status", value: school.legalStatus },
              { label: "Grade levels served", value: school.gradeLevels },
              { label: "School calendar", value: school.calendar },
              { label: "Head of School", value: school.headOfSchool },
            ]}
          />
        </div>
      </Section>

      <Section>
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading eyebrow="Our facility" title="Where learning happens" />
            <Prose className="mt-6">
              <p>{school.facility}</p>
              <p>
                The school is actively seeking expanded facilities to accommodate
                program growth, and is pursuing accreditation and school choice
                fund access to support that transition.
              </p>
            </Prose>
          </div>

          <div>
            <SectionHeading
              eyebrow="Partnerships & funding"
              title="Why accreditation matters now"
            />
            <Prose className="mt-6">
              <p>
                The VA School has maintained an operational partnership with a
                K12-powered public virtual school program, through which students
                accessed state-funded curriculum resources.
              </p>
              <p>
                The school is now formalizing its independent accreditation status
                to participate directly in Iowa&rsquo;s Education Savings Account
                (ESA) program &mdash; so that per-pupil funding flows to the
                environment where instruction is actually provided.
              </p>
            </Prose>
            <div className="mt-6">
              <Callout title="Currently in process">
                Accreditation with the Iowa Department of Education is underway.
                Our full submission is published openly &mdash; you can read every
                document we filed.
              </Callout>
            </div>
          </div>
        </div>
      </Section>

      <CTABand
        title="Come see whether this fits your student"
        lead="Start with an application, then meet with the Head of School. We will tell you honestly if we are the right school for your family."
      />
    </>
  );
}
