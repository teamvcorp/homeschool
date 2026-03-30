import ImagePlaceholder from "./ImagePlaceholder";

const pillars = [
  {
    title: "Collaboration",
    description:
      "Small pod-based groups learn to work together, pooling strengths and supporting one another — mirroring real-world team dynamics.",
    imageSrc: "/pillar-collaboration.png",
    imageAlt:
      "Small group of students sitting in a circle brainstorming together with sticky notes and whiteboards",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
  {
    title: "Leadership",
    description:
      "Through martial arts discipline and peer mentorship, students develop confidence, responsibility, and the ability to lead with integrity.",
    imageSrc: "/pillar-leadership.png",
    imageAlt:
      "Young student in a martial arts uniform confidently leading a group activity in a bright dojo setting",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    ),
  },
  {
    title: "Critical Thinking",
    description:
      "We teach students to question, analyze, and evaluate — not just memorize. Every lesson builds deeper understanding and intellectual curiosity.",
    imageSrc: "/pillar-critical-thinking.png",
    imageAlt:
      "Student examining something closely during a hands-on science experiment with focused expression",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
      </svg>
    ),
  },
  {
    title: "Problem Solving",
    description:
      "Real-world challenges in robotics, AI, and micro-societies give students hands-on practice identifying problems and creating solutions.",
    imageSrc: "/pillar-problem-solving.png",
    imageAlt:
      "Students gathered around an engineering project troubleshooting together with wires tools and laptops",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.42 15.17l-5.657-5.657a8 8 0 1111.314 0l-5.657 5.657z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.42 15.17L8.59 18H4.82l2.83-2.83M11.42 15.17l2.83 2.83h3.77l-2.83-2.83" />
      </svg>
    ),
  },
];

export default function Pillars() {
  return (
    <section id="pillars" className="py-20 sm:py-28 bg-gradient-to-b from-indigo-50/50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-sm font-bold tracking-widest uppercase text-sky-600">
            Foundation
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-indigo-900 tracking-tight">
            Four Pillars of Learning
          </h2>
          <p className="mt-4 text-lg text-slate-600 leading-relaxed">
            Every lesson, activity, and challenge is built on these core
            principles — the skills that matter most in school and in life.
          </p>
        </div>

        {/* Pillar cards */}
        <div className="grid sm:grid-cols-2 gap-8">
          {pillars.map((pillar) => (
            <div
              key={pillar.title}
              className="group bg-white rounded-2xl border border-indigo-100 shadow-sm hover:shadow-xl hover:shadow-indigo-100/50 transition-all duration-300 overflow-hidden"
            >
              <ImagePlaceholder
                src={pillar.imageSrc}
                alt={pillar.imageAlt}
                className="rounded-none border-0 border-b-2"
                aspectRatio="aspect-[16/9]"
              />
              <div className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white shrink-0">
                    {pillar.icon}
                  </div>
                  <h3 className="text-xl font-bold text-indigo-900">
                    {pillar.title}
                  </h3>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
