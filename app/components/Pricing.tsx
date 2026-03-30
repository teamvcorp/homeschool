import EnrollLink from "./EnrollLink";

export default function Pricing() {
  const included = [
    "K–12 aligned curriculum & instruction",
    "Martial arts training & discipline",
    "Robotics, AI & programming labs",
    "Mechanics & hands-on engineering",
    "Micro-society civic simulations",
    "Small-group learning pods",
    "Direct parent involvement & updates",
    "Leadership & character development",
  ];

  return (
    <section id="pricing" className="py-20 sm:py-28 bg-gradient-to-b from-white to-indigo-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left — explanation */}
          <div className="flex flex-col gap-6">
            <span className="text-sm font-bold tracking-widest uppercase text-sky-600">
              Accessible by Design
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-indigo-900 tracking-tight leading-tight">
              Quality Education at{" "}
              <span className="text-sky-500">$200/month</span>
            </h2>
            <div className="space-y-4 text-slate-600 leading-relaxed">
              <p>
                This price point is intentional. We believe every family
                deserves access to exceptional education regardless of income. By
                keeping costs low, we ensure that as this program grows, all
                state-provided funding goes directly to child extracurricular
                incentives and STEAM programs.
              </p>
              <p>
                No hidden fees. No fundraising pressure. Just a transparent
                partnership between school and parent, focused entirely on your
                child&apos;s growth.
              </p>
            </div>
            <EnrollLink
              className="inline-flex items-center gap-2 w-fit bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold px-8 py-3.5 rounded-full shadow-lg shadow-indigo-200 transition-all hover:shadow-xl hover:shadow-indigo-300 mt-2"
            >
              Get Started Today
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </EnrollLink>
          </div>

          {/* Right — pricing card */}
          <div className="relative">
            <div className="bg-white rounded-3xl border border-indigo-100 shadow-2xl shadow-indigo-100/40 p-8 sm:p-10">
              {/* Price */}
              <div className="text-center mb-8">
                <div className="inline-flex items-baseline gap-1">
                  <span className="text-5xl sm:text-6xl font-extrabold text-indigo-900">
                    $200
                  </span>
                  <span className="text-xl text-slate-400 font-medium">
                    /mo
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-1">per student</p>
              </div>

              {/* Divider */}
              <div className="w-full h-px bg-gradient-to-r from-transparent via-indigo-200 to-transparent mb-8" />

              {/* Includes */}
              <p className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-4">
                Everything Included
              </p>
              <ul className="space-y-3">
                {included.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-sky-500 shrink-0 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-sm text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <EnrollLink
                className="block text-center mt-8 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white font-semibold px-8 py-3.5 rounded-full shadow-lg transition-all"
              >
                Enroll Now
              </EnrollLink>
            </div>

            {/* Floating badge */}
            <div className="absolute -top-3 -right-3 bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-xs font-bold tracking-wider uppercase px-4 py-1.5 rounded-full shadow-lg">
              Best Value
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
