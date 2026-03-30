import ImagePlaceholder from "./ImagePlaceholder";
import EnrollLink from "./EnrollLink";

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-28">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-sky-50 -z-10" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-sky-200/30 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-200/30 rounded-full blur-3xl -z-10 -translate-x-1/2 translate-y-1/2" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div className="flex flex-col gap-6">
            <span className="inline-block w-fit bg-indigo-100 text-indigo-700 text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full">
              A Von der Becke Academy 501(c)(3) Endeavour
            </span>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-indigo-900 tracking-tight leading-[1.1]">
              Education of the{" "}
              <span className="bg-gradient-to-r from-sky-500 to-indigo-600 bg-clip-text text-transparent">
                Future
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 leading-relaxed max-w-lg">
              A revolutionary collaboration between martial arts schools, K–12
              education, and advanced coursework — with direct parent
              involvement. Small, community block-sized groups building the
              leaders of tomorrow.
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-4 mt-2">
              <EnrollLink
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold px-8 py-3.5 rounded-full shadow-lg shadow-indigo-200 transition-all hover:shadow-xl hover:shadow-indigo-300"
              >
                Enroll Your Student
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </EnrollLink>
              <a
                href="tel:7125601128"
                className="inline-flex items-center gap-2 bg-white hover:bg-indigo-50 text-indigo-700 font-semibold px-8 py-3.5 rounded-full border border-indigo-200 shadow-sm transition-all"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z"
                    clipRule="evenodd"
                  />
                </svg>
                (712) 560-1128
              </a>
            </div>
          </div>

          {/* Right image placeholder */}
          <div className="relative">
            <ImagePlaceholder
              src="/hero-students.png"
              alt="Diverse group of students in a small community learning pod collaborating on a robotics project with a martial arts instructor guiding them"
              className="w-full shadow-2xl shadow-indigo-200/50"
              aspectRatio="aspect-[4/3]"
            />
            {/* Floating accent card */}
            <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg px-5 py-3 border border-indigo-100">
              <p className="text-2xl font-extrabold text-indigo-900">$200</p>
              <p className="text-xs text-slate-500 font-medium">per month</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
