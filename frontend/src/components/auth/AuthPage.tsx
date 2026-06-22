"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function AuthPage() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, name, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero header */}
      <header className="gradient-brand text-white px-6 py-10 shadow-xl">
        <div className="max-w-md mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <h1 className="text-4xl font-black tracking-tight">RevCast</h1>
            <span className="text-4xl font-black text-blue-400">AI</span>
          </div>
          <p className="text-lg text-blue-100 font-light">
            Probabilistic Revenue Forecasting &amp; Budget Optimization
          </p>
        </div>
      </header>

      {/* Auth form */}
      <main className="flex-1 flex items-start justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border shadow-sm p-6 sm:p-8 surface" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
            {/* Tab toggle */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-6">
              <button
                onClick={() => { setIsLogin(true); setError(null); }}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  isLogin ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setIsLogin(false); setError(null); }}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  !isLogin ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={!isLogin}
                    placeholder="KeerthiShree TS"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Min 6 characters"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                />
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-white text-sm gradient-btn-primary hover:opacity-90 disabled:opacity-40 transition-opacity shadow-lg shadow-blue-100"
              >
                {loading
                  ? isLogin ? "Signing in..." : "Creating account..."
                  : isLogin ? "Sign In" : "Create Account"
                }
              </button>
            </form>

            <p className="text-xs text-gray-400 text-center mt-6">
              {isLogin
                ? "Don't have an account? Click \"Create Account\" above."
                : "Already have an account? Click \"Sign In\" above."
              }
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {["P10/P50/P90 Forecasts", "Budget Optimizer", "AI Summary", "Calibration Proof"].map((p) => (
              <span
                key={p}
                className="border text-xs font-medium px-3 py-1 rounded-full surface"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
