"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Label } from "@/components/ui/label";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { Loader2, Eye, EyeOff } from "lucide-react";

// ─── Decorative floating shape ───────────────────────────────────────────────

function FloatingShape({
  size,
  top,
  left,
  delay,
  opacity,
}: {
  size: number;
  top: string;
  left: string;
  delay: number;
  opacity: number;
}) {
  return (
    <motion.div
      className="absolute rounded-full bg-white pointer-events-none"
      style={{
        width: size,
        height: size,
        top,
        left,
        opacity,
      }}
      animate={{
        y: [0, -18, 0],
        scale: [1, 1.06, 1],
      }}
      transition={{
        duration: 5 + delay,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    />
  );
}

// ─── Login form component ─────────────────────────────────────────────────────

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* ── Left: Brand panel — gradient stays as brand identity ─────────── */}
      <div
        className="relative flex flex-col items-center justify-center overflow-hidden
                   md:w-1/2 min-h-[240px] md:min-h-screen
                   px-10 py-12"
        style={{
          background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
        }}
      >
        {/* Dot-grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Floating decorative blobs */}
        <FloatingShape size={160} top="-5%" left="-8%" delay={0}   opacity={0.06} />
        <FloatingShape size={80}  top="15%" left="75%" delay={1.2} opacity={0.08} />
        <FloatingShape size={120} top="60%" left="-5%" delay={2.1} opacity={0.07} />
        <FloatingShape size={60}  top="80%" left="80%" delay={0.7} opacity={0.09} />
        <FloatingShape size={200} top="50%" left="55%" delay={3}   opacity={0.04} />

        {/* Brand content — spread vertically */}
        <motion.div
          className="relative z-10 flex flex-col items-center gap-8 text-center max-w-xs"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {/* Logo */}
          <motion.div
            animate={{
              boxShadow: [
                "0 0 0 0 rgba(255,255,255,0)",
                "0 0 0 14px rgba(255,255,255,0.08)",
                "0 0 0 0 rgba(255,255,255,0)",
              ],
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="rounded-2xl"
          >
            <Image
              src="/logo.png"
              alt="Schollet"
              width={80}
              height={80}
              className="rounded-2xl shadow-2xl"
            />
          </motion.div>

          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
              {APP_NAME}
            </h1>
            <p className="mt-2 text-base text-white/90 font-medium">
              {APP_TAGLINE}
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-col items-center gap-2.5">
            {[
              "Manage fees with confidence",
              "Real-time financial insights",
              "Built for modern schools",
            ].map((text, i) => (
              <motion.div
                key={text}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.12, duration: 0.4 }}
                className="flex items-center gap-2.5 rounded-full bg-white/10 backdrop-blur-sm px-4 py-1.5 text-sm text-white/80"
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/70" />
                {text}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Right: Login form ──────────────────────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center bg-surface-secondary px-6 py-12">
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: 0.15,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        >
          {/* Card */}
          <div className="rounded-2xl border border-border-light bg-surface shadow-[0_8px_40px_-12px_rgba(15,23,42,0.15),0_2px_8px_-2px_rgba(15,23,42,0.06)] px-8 py-9">
            <div className="mb-7 space-y-1.5">
              <h2 className="text-2xl font-bold text-text-primary tracking-tight">
                Welcome back
              </h2>
              <p className="text-sm text-text-primary/60">
                Sign in to your <span className="font-medium text-brand">{APP_NAME}</span> account
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email field */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-text-secondary"
                >
                  Email address
                </Label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    placeholder="email@school.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="
                      h-10 w-full rounded-lg border border-border-light bg-surface-secondary
                      px-3.5 text-sm text-text-primary placeholder:text-text-tertiary
                      outline-none
                      transition-all duration-200
                      focus:border-brand focus:bg-surface
                      focus:ring-3 focus:ring-brand/15
                      hover:border-border
                      dark:hover:border-border-light
                    "
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-text-secondary"
                >
                  Password
                </Label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="
                      h-10 w-full rounded-lg border border-border-light bg-surface-secondary
                      px-3.5 pr-10 text-sm text-text-primary placeholder:text-text-tertiary
                      outline-none
                      transition-all duration-200
                      focus:border-brand focus:bg-surface
                      focus:ring-3 focus:ring-brand/15
                      hover:border-border
                      dark:hover:border-border-light
                    "
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Error message — animated shake + fade */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      x: [0, -6, 6, -4, 4, -2, 2, 0],
                    }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{
                      opacity: { duration: 0.2 },
                      y: { duration: 0.2 },
                      x: { duration: 0.4, ease: "easeOut" },
                    }}
                    className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 dark:border-red-900/60 dark:bg-red-950/40"
                  >
                    <p className="text-sm text-red-600 font-medium dark:text-red-400">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit button — gradient stays as brand identity */}
              <motion.button
                type="submit"
                disabled={loading}
                className="
                  relative mt-1 h-10 w-full overflow-hidden rounded-lg
                  text-sm font-semibold text-white
                  disabled:opacity-70 disabled:cursor-not-allowed
                  focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2
                "
                style={{
                  background:
                    "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
                }}
                whileHover={
                  loading
                    ? undefined
                    : {
                        scale: 1.015,
                        boxShadow:
                          "0 6px 24px -4px rgba(37,99,235,0.45)",
                      }
                }
                whileTap={loading ? undefined : { scale: 0.98 }}
                transition={{ duration: 0.15 }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  "Sign In"
                )}
              </motion.button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-text-tertiary">
            {APP_NAME} &copy; {new Date().getFullYear()} &middot; School Finance
          </p>
        </motion.div>
      </div>
    </div>
  );
}
