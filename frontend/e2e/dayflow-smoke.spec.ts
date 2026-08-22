import { expect, test, type Page } from "@playwright/test";

const employeeEmail = "asha.rao@dayflow.dev";
const adminEmail = "admin@dayflow.dev";
const password = "DayflowDemo123!";

async function signIn(page: Page, email: string) {
  await page.goto("/sign-in");
  await page.getByLabel(/Work email/).fill(email);
  await page.getByLabel(/Password/).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
}

test("employee requests leave and Admin approves it", async ({ page }) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 60);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 1);
  const dateValue = (value: Date) => value.toISOString().slice(0, 10);
  const reason = `Browser smoke leave ${Date.now().toString()}`;

  await signIn(page, employeeEmail);
  await expect(page.getByRole("heading", { name: "Welcome back, Asha" })).toBeVisible();
  await page.getByRole("button", { name: "Check in" }).click();
  await expect(page.getByText("Checked in", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Leave", exact: true }).click();
  await page.getByRole("link", { name: "Apply for leave" }).first().click();
  await page.getByLabel(/Start date/).fill(dateValue(startDate));
  await page.getByLabel(/End date/).fill(dateValue(endDate));
  await page.getByLabel(/Reason/).fill(reason);
  await page.getByRole("button", { name: "Submit request" }).click();
  await expect(page.getByText(reason)).toBeVisible();
  await expect(
    page.locator("article").filter({ hasText: reason }).getByText("Pending"),
  ).toBeVisible();
  await signOut(page);

  await signIn(page, adminEmail);
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  await page.getByRole("link", { name: "Leave approvals" }).click();
  const pendingRequest = page.locator("article").filter({ hasText: reason });
  await pendingRequest.getByRole("button", { name: "Approve" }).click();
  await page.getByRole("button", { name: "Approve request" }).click();
  await expect(page.getByText("Leave request approved", { exact: true })).toBeVisible();
  await signOut(page);

  await signIn(page, employeeEmail);
  await page.getByRole("link", { name: "Leave", exact: true }).click();
  await expect(
    page.locator("article").filter({ hasText: reason }).getByText("Approved"),
  ).toBeVisible();
});
