import { expect, test } from "@playwright/test";

/**
 * Critical user workflow: create a lead, open it, change status, add a
 * discussion with a follow-up, verify the dashboard, reload, verify
 * persistence. Requires the backend running at NEXT_PUBLIC_API_URL
 * (default http://localhost:8000) with a writable database.
 */
test("lead lifecycle persists across reload", async ({ page }) => {
  const uniqueName = `E2E Lead ${Date.now()}`;
  await page.goto("/");

  // 1. Dashboard loads.
  await expect(page.getByText("LeadFlow")).toBeVisible();

  // 2. Create a lead.
  await page.getByRole("button", { name: "Add New Lead" }).click();
  await page.getByLabel(/full name/i).fill(uniqueName);
  await page.getByLabel(/company/i).fill("E2E Corp");
  await page.getByRole("button", { name: "Save Lead" }).click();
  await expect(page.getByText(uniqueName).first()).toBeVisible();

  // 3. Open its details.
  await page.getByRole("button", { name: `Open details for ${uniqueName}` }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  // 4. Change its status.
  await page.getByLabel("Lead status").selectOption("Qualified");
  await expect(page.getByLabel("Lead status")).toHaveValue("Qualified");

  // 5. Add a discussion with a follow-up for tomorrow.
  const tomorrow = new Date(Date.now() + 86400_000);
  const yyyy = tomorrow.getFullYear();
  const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
  const dd = String(tomorrow.getDate()).padStart(2, "0");
  await page.getByLabel(/log a new discussion/i).fill("E2E discussion note.");
  await page.getByLabel(/set follow-up/i).check();
  await page.getByLabel("Follow-up date").fill(`${yyyy}-${mm}-${dd}`);
  await page.getByLabel("Follow-up time").fill("14:30");
  await page.getByRole("button", { name: "Save Note" }).click();
  await expect(
    page.getByRole("dialog").getByText("E2E discussion note."),
  ).toBeVisible();

  // 6. Close the dialog; dashboard reflects status + note.
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const card = page.getByRole("button", { name: `Open details for ${uniqueName}` });
  await expect(card.getByText("QUALIFIED")).toBeVisible();
  await expect(card.getByText(/E2E discussion note\./)).toBeVisible();

  // 7. Reload: data remains persisted.
  await page.reload();
  await expect(
    page.getByRole("button", { name: `Open details for ${uniqueName}` }),
  ).toBeVisible();
});
