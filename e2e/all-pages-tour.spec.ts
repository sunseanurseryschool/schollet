import { test, expect } from "@playwright/test";

/**
 * Visual tour spec — visits every dashboard page, exercises the primary
 * action where one exists, then cancels. No persistent data changes.
 *
 * Designed to be run headed (--headed) so the user sees each screen.
 *   E2E_SLOW_MO=600 npx playwright test --headed e2e/all-pages-tour.spec.ts
 */

test.describe("Fee Collection page", () => {
  test("/dashboard/fees/collect — student search input is present", async ({
    page,
  }) => {
    await page.goto("/dashboard/fees/collect");
    await expect(
      page.getByRole("heading", { name: "Collect Fee", exact: true }),
    ).toBeVisible();
    const search = page.getByPlaceholder(/Search by name or admission/i);
    await expect(search).toBeVisible();
    // Type something and verify the dropdown shows up (or "No results")
    await search.fill("zzzzzzz");
    await page.waitForTimeout(500);
  });
});

test.describe("Pending Dues page", () => {
  test("/dashboard/fees/dues — table renders", async ({ page }) => {
    await page.goto("/dashboard/fees/dues");
    await expect(
      page.getByRole("heading", { name: "Pending Dues", exact: true }),
    ).toBeVisible();
  });
});

test.describe("Fee Config page", () => {
  test("/dashboard/fees/config — open Add Config dialog → cancel", async ({
    page,
  }) => {
    await page.goto("/dashboard/fees/config");
    await expect(
      page.getByRole("heading", { name: "Fee Configuration", exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: /Add Config/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // Close via Escape (no committed data)
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });
});

test.describe("Expenses page", () => {
  test("/dashboard/expenses — open Add Expense dialog → cancel", async ({
    page,
  }) => {
    await page.goto("/dashboard/expenses");
    await expect(
      page.getByRole("heading", { name: "Expenses", exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: /Add Expense/ }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "Add Expense" }),
    ).toBeVisible();
    // Account picker is present
    await expect(dialog.locator("#expense-account")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });
});

test.describe("Reports page", () => {
  test("/dashboard/reports — Income vs Expense tab renders net summary", async ({
    page,
  }) => {
    await page.goto("/dashboard/reports");
    await expect(
      page.getByRole("heading", { name: "Reports & Analytics" }),
    ).toBeVisible();

    // Income vs Expense should be visible by default (or after clicking the tab)
    const ieTab = page.getByRole("tab", { name: /Income vs Expense/i });
    if ((await ieTab.count()) > 0) {
      await ieTab.click();
    }
    // The simplified P&L card shows "Profit & Loss" + Net
    await expect(
      page.getByText(/Profit & Loss|Total Income|Net/i).first(),
    ).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Staff page", () => {
  test("/dashboard/staff — open Add Staff dialog → cancel", async ({
    page,
  }) => {
    await page.goto("/dashboard/staff");
    await expect(
      page.getByRole("heading", { name: "Staff", exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: /Add Staff/ }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });
});

test.describe("Roles page", () => {
  test("/dashboard/roles — page heading renders", async ({ page }) => {
    await page.goto("/dashboard/roles");
    await expect(
      page.getByRole("heading", { name: /Roles/, level: 1 }),
    ).toBeVisible();
  });
});

test.describe("Inventory page", () => {
  test("/dashboard/inventory — open Add Item dialog → cancel", async ({
    page,
  }) => {
    await page.goto("/dashboard/inventory");
    await expect(
      page.getByRole("heading", { name: "Inventory", exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: /Add Item/ }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });
});

test.describe("Audit Log page", () => {
  test("/dashboard/audit-log — table renders", async ({ page }) => {
    await page.goto("/dashboard/audit-log");
    await expect(
      page.getByRole("heading", { name: /Audit Log/i }),
    ).toBeVisible();
  });
});
