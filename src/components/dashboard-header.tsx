"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { GlobalSearch } from "@/components/global-search";

export function DashboardHeader({ title }: { title?: string }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleLogout() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <header
        className="
          sticky top-0 z-30
          flex h-14 items-center gap-4 px-4
          border-b border-border/60
          bg-surface/70 backdrop-blur-md
          shadow-[0_1px_12px_-2px_rgba(15,23,42,0.06)]
          transition-all duration-300
        "
      >
        <SidebarTrigger className="text-text-secondary hover:text-text-primary transition-colors duration-150" />

        {title && (
          <h1 className="text-[15px] font-semibold text-text-primary tracking-tight shrink-0 transition-opacity duration-200">
            {title}
          </h1>
        )}

        <div className="flex flex-1 items-center justify-center px-2">
          <GlobalSearch />
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirmOpen(true)}
          className="
            shrink-0 text-text-secondary hover:text-danger
            hover:bg-danger-light
            transition-all duration-150
            rounded-lg
          "
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </header>

      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!signingOut) setConfirmOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-[360px] p-0 overflow-hidden gap-0">
          {/* Icon + message area */}
          <div className="flex flex-col items-center text-center px-6 pt-8 pb-6">
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
                delay: 0.05,
              }}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-danger-light mb-4"
            >
              <ShieldAlert className="h-7 w-7 text-danger" />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="text-lg font-semibold text-text-primary"
            >
              Sign out?
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              className="mt-2 text-sm text-text-secondary leading-relaxed"
            >
              You will be logged out of your session and redirected to the login
              page.
            </motion.p>
          </div>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="flex gap-3 border-t border-border-light bg-surface-secondary px-6 py-4"
          >
            <Button
              variant="destructive"
              className="flex-1 rounded-lg"
              onClick={handleLogout}
              disabled={signingOut}
            >
              <AnimatePresence mode="wait">
                {signingOut ? (
                  <motion.span
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing out...
                  </motion.span>
                ) : (
                  <motion.span
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
            <Button
              variant="outline"
              className="flex-1 rounded-lg"
              onClick={() => setConfirmOpen(false)}
              disabled={signingOut}
            >
              Cancel
            </Button>
          </motion.div>
        </DialogContent>
      </Dialog>
    </>
  );
}
