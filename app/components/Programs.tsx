import ImagePlaceholder from "./ImagePlaceholder";
import EnrollLink from "./EnrollLink";

const programs = [
  {
    title: "Robotics",
    description:
      "Students design, build, and program robots — learning engineering, physics, and computational thinking through hands-on creation.",
    imageSrc: "/program-robotic.png",
    imageAlt:
      "Kids building and programming a small robot with circuit boards and colorful wires",
    accent: "from-sky-400 to-blue-600",
  },
  {
    title: "AI & Programming",
    description:
      "Introduction to artificial intelligence, coding fundamentals, and creative technology — future-proof skills for the careers of tomorrow.",
    imageSrc: "/program-ai-programming.png",
    imageAlt:
      "Young student at a laptop writing code in a modern tech classroom",
    accent: "from-indigo-400 to-purple-600",
  },
  {
    title: "Mechanics",
    description:
      "Hands-on mechanical engineering: from simple machines to engines, students learn how the physical world works by taking things apart and building them.",
    imageSrc: "/program-mechanics.png",
    imageAlt:
      "Student with safety goggles working on a mechanical project with gears and tools",
    accent: "from-emerald-400 to-teal-600",
  },
  {
    title: "Micro Societies",
    description:
      "Students create and run small businesses and governments, learning economics, civics, and cooperation by solving real community problems.",
    imageSrc: "/program-micro-societies.png",
    imageAlt:
      "Kids running a small market or business simulation with handmade signs and mini storefront",
    accent: "from-amber-400 to-orange-600",
  },
];

export default function Programs() {
  return (
    <section id="programs" className="py-20 sm:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-sm font-bold tracking-widest uppercase text-sky-600">
            Future-Proof Engagement
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-indigo-900 tracking-tight">
            Real-World Programs
          </h2>
          <p className="mt-4 text-lg text-slate-600 leading-relaxed">
            We introduce real-world problems — then find solutions by applying
            academic learning. These aren&apos;t electives; they&apos;re how we teach.
          </p>
        </div>

        {/* Program cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {programs.map((program) => (
            <div
              key={program.title}
              className="group flex flex-col bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-100/50 transition-all duration-300 overflow-hidden"
            >
              <ImagePlaceholder
                src={program.imageSrc}
                alt={program.imageAlt}
                className="rounded-none border-0 border-b-2"
                aspectRatio="aspect-square"
              />
              <div className="p-5 flex flex-col flex-1">
                <div className={`w-fit text-xs font-bold tracking-wider uppercase bg-gradient-to-r ${program.accent} bg-clip-text text-transparent mb-2`}>
                  {program.title}
                </div>
                <p className="text-sm text-slate-600 leading-relaxed flex-1">
                  {program.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <EnrollLink
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold px-8 py-3.5 rounded-full shadow-lg shadow-indigo-200 transition-all hover:shadow-xl hover:shadow-indigo-300"
          >
            Sign Up for the Program
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </EnrollLink>
        </div>
      </div>
    </section>
  );
}
