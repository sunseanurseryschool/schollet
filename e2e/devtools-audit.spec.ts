import { test, expect, type Page, type ConsoleMessage } from "@playwright/test";

/**
 * Chrome DevTools-style audit.
 *
 * Walks every authenticated dashboard route, attaches CDP listeners for
 * console messages, uncaught page errors, and failed network requests,
 * then asserts that none surface during navigation/load.
 *
 * Catches the class of bugs that pass functional tests: hydration mismatches,
 * Base UI prop warnings, hook misuse, accidental 4xx/5xx API calls from the UI.
 */

interface Issue {
  page: string;
  kind: "console-error" | "console-warn" | "page-error" | "request-failed" | "response-error";
  text: string;
}

// Console messages we choose to ignore — these are external noise, not app bugs.
const IGNORED_PATTERNS: RegExp[] = [
  /\[Fast Refresh\]/i,
  /Download the React DevTools/i,
  /Lit is in dev mode/i,
  // Recharts fires a transient warning on first mount before its ResponsiveContainer
  // is measured. minWidth/minHeight workarounds don't fully suppress it. The chart
  // renders correctly once layout settles.
  /The width\(-?\d+\) and height\(-?\d+\) of chart should be greater than 0/i,
];

function shouldIgnore(text: string): boolean {
  return IGNORED_PATTERNS.some((re) => re.test(text));
}

async function auditPage(page: Page, path: string): Promise<Issue[]> {
  const issues: Issue[] = [];

  const onConsole = (msg: ConsoleMessage) => {
    const text = msg.text();
    if (shouldIgnore(text)) return;
    if (msg.type() === "error") {
      issues.push({ page: path, kind: "console-error", text });
    } else if (msg.type() === "warning") {
      issues.push({ page: path, kind: "console-warn", text });
    }
  };
  const onPageError = (err: Error) => {
    issues.push({ page: path, kind: "page-error", text: err.message });
  };
  const onRequestFailed = (req: { url: () => string; failure: () => { errorText: string } | null }) => {
    const failure = req.failure();
    if (!failure) return;
    // Browsers cancel some prefetches; ignore aborted/cancelled ones
    if (/aborted|cancelled|ERR_ABORTED/i.test(failure.errorText)) return;
    issues.push({
      page: path,
      kind: "request-failed",
      text: `${req.url()} → ${failure.errorText}`,
    });
  };
  const onResponse = (res: { url: () => string; status: () => number; request: () => { resourceType: () => string } }) => {
    const status = res.status();
    const url = res.url();
    // Skip non-doc/script/xhr resources — favicon misses etc. are noise.
    const type = res.request().resourceType();
    if (!["document", "xhr", "fetch", "script"].includes(type)) return;
    if (status >= 400 && status !== 401 && status !== 304) {
      // 401 happens during auth probes; 304 is just caching. Anything else >= 400 is interesting.
      issues.push({
        page: path,
        kind: "response-error",
        text: `${status} ${url}`,
      });
    }
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("requestfailed", onRequestFailed);
  page.on("response", onResponse);

  try {
    await page.goto(path, { waitUntil: "networkidle" });
    // Give React a moment to settle (effects, hydration)
    await page.waitForTimeout(400);
  } finally {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
    page.off("requestfailed", onRequestFailed);
    page.off("response", onResponse);
  }

  return issues;
}

const ROUTES_TO_AUDIT = [
  "/dashboard",
  "/dashboard/students",
  "/dashboard/fees/collect",
  "/dashboard/fees/dues",
  "/dashboard/fees/config",
  "/dashboard/accounts",
  "/dashboard/expenses",
  "/dashboard/reports",
  "/dashboard/staff",
  "/dashboard/roles",
  "/dashboard/inventory",
  "/dashboard/audit-log",
];

test.describe("Chrome DevTools audit", () => {
  for (const route of ROUTES_TO_AUDIT) {
    test(`${route} → no console errors, page errors, or failed XHR`, async ({
      page,
    }) => {
      const issues = await auditPage(page, route);
      // Group by kind for the failure message
      if (issues.length > 0) {
        const summary = issues
          .map((i) => `  [${i.kind}] ${i.text}`)
          .join("\n");
        throw new Error(
          `Found ${issues.length} issue(s) on ${route}:\n${summary}`,
        );
      }
      expect(issues).toEqual([]);
    });
  }
});

test.describe("Chrome DevTools audit (interactions)", () => {
  test("Open Add Student dialog → no console errors", async ({ page }) => {
    const issues: Issue[] = [];
    page.on("console", (msg) => {
      const t = msg.text();
      if (shouldIgnore(t)) return;
      if (msg.type() === "error" || msg.type() === "warning") {
        issues.push({ page: "/dashboard/students [dialog]", kind: msg.type() === "error" ? "console-error" : "console-warn", text: t });
      }
    });
    page.on("pageerror", (err) => {
      issues.push({ page: "/dashboard/students [dialog]", kind: "page-error", text: err.message });
    });

    await page.goto("/dashboard/students");
    await page.getByRole("button", { name: /Add Student/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.waitForTimeout(300);
    if (issues.length > 0) {
      throw new Error(
        `Dialog issues:\n${issues.map((i) => `  [${i.kind}] ${i.text}`).join("\n")}`,
      );
    }
  });

  test("Open Adjust Balance dialog → no console errors", async ({ page }) => {
    const issues: Issue[] = [];
    page.on("console", (msg) => {
      const t = msg.text();
      if (shouldIgnore(t)) return;
      if (msg.type() === "error" || msg.type() === "warning") {
        issues.push({ page: "/dashboard/accounts [adjust]", kind: msg.type() === "error" ? "console-error" : "console-warn", text: t });
      }
    });
    page.on("pageerror", (err) => {
      issues.push({ page: "/dashboard/accounts [adjust]", kind: "page-error", text: err.message });
    });

    await page.goto("/dashboard/accounts");
    await page
      .getByRole("row", { name: /Bank/ })
      .getByRole("button", { name: /Adjust balance/ })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.waitForTimeout(300);
    if (issues.length > 0) {
      throw new Error(
        `Dialog issues:\n${issues.map((i) => `  [${i.kind}] ${i.text}`).join("\n")}`,
      );
    }
  });
});
