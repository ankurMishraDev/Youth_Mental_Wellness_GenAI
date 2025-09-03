import { useState } from "react";
import { Link } from "react-router";

export default function Register() {
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  return (
    <div className="min-h-screen flex bg-white text-slate-900">
      {/* Left side (branding) — takes most space */}
      <div className="flex-1 flex items-center justify-center p-10 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-lg">
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-slate-900 text-white font-black text-lg">YA</div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 font-Landing">Youth-foundary</h1>
          </div>
          <p className="text-xl text-slate-700 mb-8 leading-relaxed">
            A safe space for teens & young adults to ask about studies, careers, and well-being—powered by Gemini + RAG.
          </p>
          <div className="grid gap-4">
            <div className="flex items-center gap-3 text-slate-700">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              <span>Privacy-first approach to your personal data</span>
            </div>
            <div className="flex items-center gap-3 text-slate-700">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              <span>24×7 AI-powered guidance and support</span>
            </div>
            <div className="flex items-center gap-3 text-slate-700">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              <span>Goal tracking and progress monitoring</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side (registration form) — fixed width */}
      <div className="w-96 flex items-center justify-center p-8 border-l border-slate-200">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Create your account</h2>
            <p className="text-slate-600 text-sm mt-2 ">Welcome to Youth-foundary — let's get you set up.</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Full name</span>
                <input
                  type="text"
                  placeholder="Alex Johnson"
                  className="rounded-xl bg-white border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-colors"
                  autoComplete="name"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Email</span>
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="rounded-xl bg-white border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-colors"
                  autoComplete="email"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Password</span>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    placeholder="••••••••"
                    className="w-full rounded-xl bg-white border border-slate-300 px-4 py-2.5 pr-12 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-colors"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    {showPw ? "Hide" : "Show"}
                  </button>
                </div>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Confirm password</span>
                <div className="relative">
                  <input
                    type={showPw2 ? "text" : "password"}
                    placeholder="••••••••"
                    className="w-full rounded-xl bg-white border border-slate-300 px-4 py-2.5 pr-12 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-colors"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw2((s) => !s)}
                    className="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    {showPw2 ? "Hide" : "Show"}
                  </button>
                </div>
              </label>

              <button
                type="submit"
                className="mt-4 rounded-xl bg-blue-600 text-white font-medium px-4 py-2.5 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors"
              >
                Create account
              </button>
            </div>

            <div className="mt-6 text-center text-sm text-slate-700">
              Already have an account? <Link to ="/login" className="text-blue-600 hover:underline font-medium bg-transparent border-none cursor-pointer">Sign in</Link>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            By signing up, you agree to our <span className="text-blue-600 hover:underline cursor-pointer">Terms</span> and <span className="text-blue-600 hover:underline cursor-pointer">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
}