import ImagePlaceholder from "./ImagePlaceholder";

export default function Mission() {
  return (
    <section id="mission" className="py-20 sm:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Image */}
          <ImagePlaceholder
            src="/mission-parent-involvement.png"
            alt="Parent and child working together on a project at a community learning center showing direct parent involvement in education"
            className="w-full shadow-xl shadow-indigo-100/50"
            aspectRatio="aspect-[4/3]"
          />

          {/* Content */}
          <div className="flex flex-col gap-6">
            <span className="text-sm font-bold tracking-widest uppercase text-sky-600">
              Our Mission
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-indigo-900 tracking-tight leading-tight">
              Advancing Public Education Through{" "}
              <span className="text-sky-500">Community</span>
            </h2>
            <div className="space-y-4 text-slate-600 leading-relaxed">
              <p>
                Homeschool+ is a bold advancement in public education. We form a
                powerful collaboration between private martial arts schools, K–12
                education providers, and advanced coursework — all with direct
                parent involvement at the core.
              </p>
              <p>
                Our small, community block-sized learning groups build
                collaboration, leadership, critical thinking, and problem solving
                as the foundation of every student&apos;s academic journey.
              </p>
              <p>
                We don&apos;t just meet current educational standards — we exceed
                them. Every student is empowered to surpass those standards in
                their own way and on their own timeline.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
