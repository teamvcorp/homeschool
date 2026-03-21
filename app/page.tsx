export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-sky-50 to-indigo-100 px-6 py-16 font-sans">
      <main className="flex flex-col items-center text-center max-w-2xl w-full gap-8">

        {/* Badge */}
        <span className="inline-block bg-indigo-100 text-indigo-700 text-sm font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full">
          Coming Soon
        </span>

        {/* Logo / Name */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-5xl font-extrabold text-indigo-900 tracking-tight leading-tight">
            Homeschool<span className="text-sky-500">+</span>
          </h1>
          <p className="text-xl font-medium text-indigo-600 tracking-wide">
            Education of the Future
          </p>
        </div>

        {/* Divider */}
        <div className="w-16 h-1 rounded-full bg-sky-400" />

        {/* Description */}
        <p className="text-lg text-slate-600 leading-relaxed max-w-md">
          We&apos;re building something amazing for the next generation of
          learners. Our platform is currently under construction — stay tuned!
        </p>

        {/* CTA */}
        <div className="flex flex-col items-center gap-3 mt-2">
          <p className="text-slate-500 text-sm uppercase tracking-widest font-semibold">
            Call for details
          </p>
          <a
            href="tel:7125601128"
            className="inline-flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-2xl font-bold px-8 py-4 rounded-2xl shadow-lg transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-6 h-6 shrink-0"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z"
                clipRule="evenodd"
              />
            </svg>
            (712) 560-1128
          </a>
        </div>

        {/* Footer note */}
        <p className="text-slate-400 text-xs mt-8">
          &copy; {new Date().getFullYear()} Homeschool+. All rights reserved.
        </p>
      </main>
    </div>
  );
}
