import EnrollLink from "./EnrollLink";

export default function Footer() {
  return (
    <footer className="bg-indigo-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <h3 className="text-xl font-extrabold tracking-tight mb-3">
              Homeschool<span className="text-sky-400">+</span>
            </h3>
            <p className="text-sm text-indigo-300 leading-relaxed">
              A Von der Becke Academy endeavour.
              <br />
              501(c)(3) educational facility.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-xs font-bold tracking-widest uppercase text-indigo-400 mb-4">
              Navigate
            </h4>
            <ul className="space-y-2">
              {[
                { label: "Mission", href: "#mission" },
                { label: "Pillars", href: "#pillars" },
                { label: "Programs", href: "#programs" },
                { label: "Pricing", href: "#pricing" },
                { label: "Transparency", href: "#transparency" },
              ].map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-indigo-300 hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xs font-bold tracking-widest uppercase text-indigo-400 mb-4">
              Contact
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="tel:7125601128"
                  className="text-sm text-indigo-300 hover:text-white transition-colors"
                >
                  (712) 560-1128
                </a>
              </li>
              <li>
                <EnrollLink
                  className="text-sm text-indigo-300 hover:text-white transition-colors"
                >
                  Sign Up Online
                </EnrollLink>
              </li>
            </ul>
          </div>

          {/* Enroll CTA */}
          <div>
            <h4 className="text-xs font-bold tracking-widest uppercase text-indigo-400 mb-4">
              Ready to Start?
            </h4>
            <EnrollLink
              className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white font-semibold px-6 py-2.5 rounded-full text-sm transition-colors"
            >
              Enroll Now
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </EnrollLink>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-indigo-800 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-indigo-400">
            &copy; {new Date().getFullYear()} Homeschool+. All rights reserved.
          </p>
          <p className="text-xs text-indigo-500">
            Von der Becke Academy &middot; 501(c)(3) Educational Facility
          </p>
        </div>
      </div>
    </footer>
  );
}
