import { expect, test, type Page, type TestInfo } from "@playwright/test";

const NOTES_STORAGE_KEY = "deepflow:workspace-notes:v1";
const VIEWPORT_STORAGE_KEY = "deepflow:workspace-viewport:v1";

const seededNotes = Array.from({ length: 6 }, (_, index) => ({
  id: `grandfathered-note-${index + 1}`,
  title: index === 0 ? "Responsive layout" : `Saved note ${index + 1}`,
  text:
    index === 0
      ? "Body text begins directly below the title."
      : "Existing local note",
  color: ["warm-cream", "soft-lime", "mist-green", "pale-sage", "soft-sand"][
    index % 5
  ],
  x: 20 + (index % 3) * 250,
  y: 90 + Math.floor(index / 3) * 250,
  width: 220,
  height: index === 0 ? 220 : 200,
  createdAt: "2026-07-12T12:00:00.000Z",
  updatedAt: "2026-07-12T12:00:00.000Z",
}));

async function openNotesCanvas(page: Page) {
  await page.addInitScript(
    ({ notesKey, notes, viewportKey }) => {
      window.localStorage.setItem(notesKey, JSON.stringify(notes));
      window.localStorage.setItem(
        viewportKey,
        JSON.stringify({ x: 0, y: 0, zoom: 1 }),
      );
    },
    {
      notesKey: NOTES_STORAGE_KEY,
      notes: seededNotes,
      viewportKey: VIEWPORT_STORAGE_KEY,
    },
  );

  await page.goto("/workspace");
  await page.getByRole("button", { name: "Notes Canvas" }).click();
  await expect(page.locator(".workspace-canvas-card")).toBeVisible();
  await expect(page.locator(".workspace-note")).toHaveCount(6);
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    visualScale: window.visualViewport?.scale ?? 1,
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  expect(dimensions.visualScale).toBe(1);
}

async function expectControlInsideViewport(page: Page, name: string) {
  const control = page.getByRole("button", { name, exact: true });
  await expect(control).toBeVisible();
  const box = await control.boundingBox();
  const viewport = page.viewportSize();

  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height + 1);
  expect(box!.height).toBeGreaterThanOrEqual(43);
}

async function captureRepresentativeScreenshot(
  page: Page,
  testInfo: TestInfo,
  state: "normal" | "expanded",
) {
  const screenshotNames: Record<
    string,
    { normal?: string; expanded?: string }
  > = {
    "webkit-430x932": {
      normal: "normal-mobile.png",
      expanded: "expanded-mobile.png",
    },
    "chromium-768x1024": { normal: "tablet.png" },
    "chromium-1440x900": { normal: "desktop.png" },
  };
  const name = screenshotNames[testInfo.project.name]?.[state];

  if (name) {
    await expect(page).toHaveScreenshot(name, {
      fullPage: state === "normal",
    });
  }
}

test("Notes Canvas remains usable across the responsive viewport matrix", async ({
  page,
}, testInfo) => {
  await openNotesCanvas(page);
  await expectNoHorizontalOverflow(page);

  await expect(page.getByText("6 / 5 notes used", { exact: true })).toBeVisible();
  await expect(page.getByText(/up to 5 local notes/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Add note" })).toBeDisabled();

  const firstNote = page.locator(".workspace-note").first();
  const titleBox = await firstNote.locator(".workspace-note__title").boundingBox();
  const bodyBox = await firstNote.locator(".workspace-note__body").boundingBox();
  expect(titleBox).not.toBeNull();
  expect(bodyBox).not.toBeNull();
  expect(bodyBox!.y - (titleBox!.y + titleBox!.height)).toBeGreaterThanOrEqual(0);
  expect(bodyBox!.y - (titleBox!.y + titleBox!.height)).toBeLessThanOrEqual(16);

  await captureRepresentativeScreenshot(page, testInfo, "normal");

  const expandButton = page.getByRole("button", { name: "Expand canvas" });
  await expandButton.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -80));
  const scrollBeforeExpand = await page.evaluate(() => window.scrollY);
  await expandButton.evaluate((button) => (button as HTMLButtonElement).click());

  const expanded = page.locator('.workspace-canvas-card[data-expanded="true"]');
  await expect(expanded).toBeVisible();
  const expandedMetrics = await expanded.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const canvas = element.querySelector<HTMLElement>(".workspace-canvas");
    const toolbar = element.querySelector<HTMLElement>(
      ".workspace-canvas__expanded-toolbar",
    );
    const canvasBounds = canvas?.getBoundingClientRect();
    const toolbarBounds = toolbar?.getBoundingClientRect();
    const footer = document.querySelector<HTMLElement>("footer");
    const backgroundRoot = [...document.body.children].find(
      (child) => child !== element && child.tagName !== "SCRIPT",
    ) as HTMLElement | undefined;

    return {
      backgroundHidden: backgroundRoot
        ? backgroundRoot.getClientRects().length === 0 &&
          backgroundRoot.inert &&
          backgroundRoot.getAttribute("aria-hidden") === "true"
        : false,
      bodyParent: element.parentElement === document.body,
      bounds: {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      },
      canvasBottom: canvasBounds?.bottom,
      canvasHeight: canvasBounds?.height,
      canvasTop: canvasBounds?.top,
      footerPainted: footer ? footer.getClientRects().length > 0 : false,
      position: getComputedStyle(element).position,
      toolbarBottom: toolbarBounds?.bottom,
    };
  });
  const viewport = page.viewportSize()!;

  expect(expandedMetrics.backgroundHidden).toBe(true);
  expect(expandedMetrics.bodyParent).toBe(true);
  expect(expandedMetrics.position).toBe("fixed");
  expect(expandedMetrics.bounds.x).toBeCloseTo(0, 0);
  expect(expandedMetrics.bounds.y).toBeCloseTo(0, 0);
  expect(expandedMetrics.bounds.width).toBeCloseTo(viewport.width, 0);
  expect(expandedMetrics.bounds.height).toBeCloseTo(viewport.height, 0);
  expect(expandedMetrics.footerPainted).toBe(false);
  expect(expandedMetrics.canvasTop).toBeGreaterThanOrEqual(
    expandedMetrics.toolbarBottom ?? 0,
  );
  expect(expandedMetrics.canvasBottom).toBeLessThanOrEqual(viewport.height + 1);
  expect(expandedMetrics.canvasHeight).toBeGreaterThan(viewport.height * 0.55);

  await expectControlInsideViewport(page, "Add note");
  await expectControlInsideViewport(page, "Zoom out");
  await expectControlInsideViewport(page, "Zoom in");
  await expectControlInsideViewport(page, "Reset view");
  await expectControlInsideViewport(page, "Minimize Canvas");

  const originalNoteBox = await firstNote.boundingBox();
  const dragBox = await firstNote.locator(".workspace-note__handle").boundingBox();
  expect(originalNoteBox).not.toBeNull();
  expect(dragBox).not.toBeNull();
  await page.mouse.move(dragBox!.x + 12, dragBox!.y + 12);
  await page.mouse.down();
  await page.mouse.move(dragBox!.x + 42, dragBox!.y + 32, { steps: 3 });
  await page.mouse.up();
  const movedNoteBox = await firstNote.boundingBox();
  expect(movedNoteBox!.x).toBeGreaterThan(originalNoteBox!.x + 15);

  const resizeHandle = firstNote.locator(".workspace-note__resize-handle");
  const resizeBox = await resizeHandle.boundingBox();
  const sizeBeforeResize = await firstNote.boundingBox();
  expect(resizeBox).not.toBeNull();
  await page.mouse.move(
    resizeBox!.x + resizeBox!.width / 2,
    resizeBox!.y + resizeBox!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(resizeBox!.x + 36, resizeBox!.y + 36, { steps: 3 });
  await page.mouse.up();
  const sizeAfterResize = await firstNote.boundingBox();
  expect(sizeAfterResize!.width).toBeGreaterThan(sizeBeforeResize!.width + 10);
  expect(sizeAfterResize!.height).toBeGreaterThan(sizeBeforeResize!.height + 10);

  await captureRepresentativeScreenshot(page, testInfo, "expanded");
  await page.getByRole("button", { name: "Minimize Canvas" }).click();
  await expect(expanded).toHaveCount(0);
  await expect
    .poll(async () =>
      Math.abs((await page.evaluate(() => window.scrollY)) - scrollBeforeExpand),
    )
    .toBeLessThanOrEqual(80);
  await expectNoHorizontalOverflow(page);
});
