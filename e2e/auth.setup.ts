import { test as setup, expect } from "@playwright/test";
import path from "node:path";

const STORAGE_PATH = path.join(__dirname, ".auth/admin.json");

setup("authenticate as admin", async ({ page }) => {
  await page.goto("/login");

  await page.locator("#email").fill("admin@school.com");
  await page.locator("#password").fill("Admin@123");
  await page.getByRole("button", { name: "Sign In" }).click();

  // Wait for redirect to dashboard
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.context().storageState({ path: STORAGE_PATH });
});
