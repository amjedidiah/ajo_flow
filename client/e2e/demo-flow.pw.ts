import { expect, test } from "@playwright/test";

test("public demo path routes unauthenticated users into auth", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /your ajo, reimagined\./i }),
  ).toBeVisible();

  await page.getByRole("link", { name: /start a pod/i }).click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(
    page.getByRole("heading", { name: /create your account|register/i }),
  ).toBeVisible();

  await page.goto("/pods");
  await expect(
    page.getByRole("heading", { name: /browse pods/i }),
  ).toBeVisible();
  await expect(page.getByText(/new here\?/i)).toBeVisible();

  await page.getByRole("link", { name: /create account/i }).first().click();
  await expect(page).toHaveURL(/\/register$/);
});
