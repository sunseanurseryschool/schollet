"use client";

import * as React from "react";
import type { Account } from "@/types/database";

export function useAccounts() {
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/accounts");
        if (res.ok && !cancelled) {
          setAccounts((await res.json()) as Account[]);
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { accounts, isLoading };
}
