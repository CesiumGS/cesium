import { test, expect } from "./test.js";

async function getWidth(locator) {
  const box = await locator.boundingBox();
  return box?.width ?? 0;
}

test.describe("Sandcastle layout", () => {
  test("toggles and restores the code pane from the application bar", async ({
    page,
  }) => {
    await page.goto("/Apps/Sandcastle2/index.html?id=hello-world");

    const editorButton = page.getByRole("button", { name: "Editor" });
    const leftPanel = page.locator(".left-panel");

    await expect(leftPanel).toBeVisible();
    const initialWidth = await getWidth(leftPanel);
    expect(initialWidth).toBeGreaterThan(350);

    await editorButton.click();
    await expect(leftPanel).toBeHidden();

    await editorButton.click();
    await expect(leftPanel).toBeVisible();
    await expect.poll(async () => getWidth(leftPanel)).toBeGreaterThan(350);
    const reopenedWidth = await getWidth(leftPanel);
    expect(Math.abs(reopenedWidth - initialWidth)).toBeLessThanOrEqual(2);
  });

  test("reopens the code pane to half width after it is dragged closed", async ({
    page,
  }) => {
    await page.goto("/Apps/Sandcastle2/index.html?id=hello-world");

    const editorButton = page.getByRole("button", { name: "Editor" });
    const content = page.locator(".content");
    const leftPanel = page.locator(".left-panel");

    await expect(leftPanel).toBeVisible();
    const contentBox = await content.boundingBox();
    const leftBox = await leftPanel.boundingBox();
    expect(contentBox).not.toBeNull();
    expect(leftBox).not.toBeNull();

    const dragY = leftBox.y + leftBox.height / 2;
    await page.mouse.move(leftBox.x + leftBox.width, dragY);
    await page.mouse.down();
    await page.mouse.move(contentBox.x, dragY, { steps: 10 });
    await page.mouse.up();

    await expect(leftPanel).toBeHidden();

    await editorButton.click();
    await expect(leftPanel).toBeVisible();
    await expect.poll(async () => getWidth(leftPanel)).toBeGreaterThan(350);
    const reopenedWidth = await getWidth(leftPanel);
    expect(Math.abs(reopenedWidth - contentBox.width / 2)).toBeLessThanOrEqual(
      2,
    );
  });
});
