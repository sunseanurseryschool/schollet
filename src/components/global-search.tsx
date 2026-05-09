"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, X, User, Receipt, Loader2 } from "lucide-react";
import type { SearchResponse } from "@/app/api/search/route";

function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = React.useState<T>(value);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [results, setResults] = React.useState<SearchResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const debouncedQuery = useDebounce(query, 300);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Fetch results when debounced query changes
  React.useEffect(() => {
    const q = debouncedQuery.trim();
    if (q.length < 2) {
      setResults(null);
      setError(null);
      setIsOpen(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    void (async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(q)}`
        );
        if (cancelled) return;

        if (!res.ok) {
          const body = (await res.json()) as { error?: string };
          throw new Error(body.error ?? "Search failed");
        }

        const data = (await res.json()) as SearchResponse;
        if (cancelled) return;
        setResults(data);
        setIsOpen(true);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Search failed");
        setResults(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close on Escape
  React.useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  function handleSelect(url: string) {
    setIsOpen(false);
    setQuery("");
    setResults(null);
    router.push(url);
  }

  function handleClear() {
    setQuery("");
    setResults(null);
    setIsOpen(false);
    inputRef.current?.focus();
  }

  const hasResults =
    results &&
    (results.students.length > 0 || results.receipts.length > 0);

  const showDropdown =
    isOpen &&
    (isLoading || error != null || hasResults || debouncedQuery.trim().length >= 2);

  return (
    <div ref={containerRef} className="relative flex-1 max-w-sm">
      {/* Input row */}
      <div className="relative flex items-center">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary"
          aria-hidden
        />
        <input
          ref={inputRef}
          type="search"
          placeholder="Search students, receipts..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results && debouncedQuery.trim().length >= 2) setIsOpen(true);
          }}
          className="h-8 w-full rounded-lg border border-input bg-surface-secondary pl-8 pr-8 text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
          autoComplete="off"
          aria-label="Global search"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-text-tertiary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-ring/50"
            aria-label="Clear search"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          role="listbox"
          aria-label="Search results"
          className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-border-light bg-surface shadow-lg overflow-hidden"
        >
          {isLoading && (
            <div className="flex items-center justify-center gap-2 px-4 py-3 text-sm text-text-secondary">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          )}

          {!isLoading && error && (
            <div className="px-4 py-3 text-sm text-danger">{error}</div>
          )}

          {!isLoading && !error && results && !hasResults && (
            <div className="px-4 py-3 text-sm text-text-secondary">
              No results for &ldquo;{debouncedQuery}&rdquo;
            </div>
          )}

          {!isLoading && !error && results && hasResults && (
            <>
              {results.students.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-text-tertiary bg-surface-secondary border-b border-border-light">
                    Students
                  </div>
                  {results.students.map((item) => (
                    <button
                      key={item.id}
                      role="option"
                      type="button"
                      onClick={() => handleSelect(item.url)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-tertiary focus:bg-surface-tertiary focus:outline-none"
                    >
                      <User className="h-4 w-4 shrink-0 text-brand" aria-hidden />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text-primary">
                          {item.label}
                        </p>
                        <p className="truncate text-xs text-text-secondary">
                          {item.sublabel}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {results.receipts.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-text-tertiary bg-surface-secondary border-b border-border-light">
                    Receipts
                  </div>
                  {results.receipts.map((item) => (
                    <button
                      key={item.id}
                      role="option"
                      type="button"
                      onClick={() => handleSelect(item.url)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-tertiary focus:bg-surface-tertiary focus:outline-none"
                    >
                      <Receipt className="h-4 w-4 shrink-0 text-success" aria-hidden />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text-primary">
                          {item.label}
                        </p>
                        <p className="truncate text-xs text-text-secondary">
                          {item.sublabel}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
