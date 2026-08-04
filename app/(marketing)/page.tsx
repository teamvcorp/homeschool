import Hero from "@/app/components/home/Hero";
import MasteryModel from "@/app/components/home/MasteryModel";
import Philosophy from "@/app/components/home/Philosophy";
import CharacterPillars from "@/app/components/home/CharacterPillars";
import Cohorts from "@/app/components/home/Cohorts";
import Programs from "@/app/components/home/Programs";
import TuitionTeaser from "@/app/components/home/TuitionTeaser";
import { CTABand } from "@/app/components/ui/CTABand";

/**
 * Home page. Serves "/" — the (marketing) route group does not appear in the URL.
 *
 * Section order follows the argument the school actually makes:
 *   1. the claim (tagline + credibility facts)
 *   2. the mission and the instructional model that delivers it
 *   3. why we do it this way (six convictions)
 *   4. the hardest-to-believe part, stated boldly (character as coursework)
 *   5. the practical questions (who's grouped how, what's taught, what it costs)
 *   6. the ask
 *
 * No `metadata` export here: the root layout's default title already reads
 * "The VA School — We don't lower the bar. We raise the student.", which is
 * exactly right for the home page. Interior pages override it.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <MasteryModel />
      <Philosophy />
      <CharacterPillars />
      <Cohorts />
      <Programs />
      <TuitionTeaser />
      <CTABand />
    </>
  );
}
