"use client";

import { useState, useEffect, useCallback } from "react";

const ENROLL_URL = "https://www.taekwondostormlake.com/members";
const REDIRECT_DELAY = 3000;

interface EnrollLinkProps {
  className?: string;
  children: React.ReactNode;
}

export default function EnrollLink({ className = "", children }: EnrollLinkProps) {
  const [show, setShow] = useState(false);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      setShow(true);
    },
    [],
  );

  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(() => {
      window.open(ENROLL_URL, "_blank", "noopener,noreferrer");
      setShow(false);
    }, REDIRECT_DELAY);
    return () => clearTimeout(timer);
  }, [show]);

  return (
    <>
      <a
        href={ENROLL_URL}
        onClick={handleClick}
        className={className}
      >
        {children}
      </a>

      {/* Toast overlay */}
      {show && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-md bg-white rounded-2xl shadow-2xl shadow-indigo-200/60 border border-indigo-100 p-6 animate-[slideUp_0.3s_ease-out]">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                  />
                </svg>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-indigo-900">
                  Redirecting you now!
                </p>
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                  You&apos;re being taken to{" "}
                  <span className="font-semibold text-indigo-700">
                    Storm Lake Taekwondo
                  </span>{" "}
                  where Homeschool+ is currently housed.
                </p>

                {/* Progress bar */}
                <div className="mt-3 h-1 w-full bg-indigo-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-sky-500 rounded-full"
                    style={{
                      animation: `shrink ${REDIRECT_DELAY}ms linear forwards`,
                    }}
                  />
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={() => setShow(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline keyframes */}
      {show && (
        <style>{`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(16px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes shrink {
            from { width: 100%; }
            to { width: 0%; }
          }
        `}</style>
      )}
    </>
  );
}
