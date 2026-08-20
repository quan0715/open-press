import { expect, test, type Page } from "@playwright/test";

const LEGACY_WORKBENCH_ZOOM_STORAGE_KEY = "openpress:workspace:page-scale-mode";
const WORKBENCH_ZOOM_STORAGE_KEY = "openpress:workspace:page-scale-mode:reader";
const WORKBENCH_PANEL_STORAGE_KEY = "openpress:workspace:panels";
const WORKBENCH_LEFT_PANEL_WIDTH_STORAGE_KEY = "openpress:workspace:left-panel-width";
const PRIMARY_KEYCAP = process.platform === "darwin" ? "⌘" : "Ctrl";

test("signals change preview loading, empty, and error states", async ({ page }) => {
  let responseMode: "empty" | "error" = "empty";
  let releaseInitialRequest: (() => void) | undefined;
  const initialRequestGate = new Promise<void>((resolve) => {
    releaseInitialRequest = resolve;
  });

  await page.route("**/__openpress/change-preview**", async (route) => {
    if (responseMode === "empty") {
      await initialRequestGate;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, preview: null }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, preview: { proposals: "not-an-array" } }),
    });
  });

  await page.goto("/reader/preview");
  const trigger = page.locator("[data-openpress-change-preview-trigger]");
  await expect(trigger).toHaveAttribute("data-openpress-change-preview-status", "loading");
  await expect(trigger).toContainText("讀取 Proposal");
  await expect(trigger).toHaveAttribute("aria-busy", "true");
  expect((await trigger.boundingBox())?.width).toBeGreaterThan(100);

  releaseInitialRequest?.();
  await expect(trigger).toHaveAttribute("data-openpress-change-preview-status", "empty");
  await expect(trigger).toHaveAttribute("aria-label", "尚無 Proposal。Agent 寫入後可點此重新讀取");
  await expect(trigger.locator(".op-workspace-toolbar-action-label")).toBeHidden();
  expect((await trigger.boundingBox())?.width).toBeLessThan(60);
  await expect(trigger.locator("svg")).toHaveCount(1);

  responseMode = "error";
  await trigger.click();
  await expect(trigger).toHaveAttribute("data-openpress-change-preview-status", "failed");
  await expect(trigger).toContainText("Proposal 錯誤");
  await expect(trigger).toHaveAttribute(
    "aria-label",
    "Change Preview 無法讀取：OpenPress change preview returned an invalid format.（點擊重試）",
  );
});

test("explains why an outdated Proposal cannot be opened", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Proposal explanation only needs one browser profile");
  let requestCount = 0;
  let clearCount = 0;
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.route("**/__openpress/change-preview**", async (route) => {
    if (route.request().method() === "DELETE") {
      clearCount += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, cleared: true }),
      });
      return;
    }
    requestCount += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        preview: {
          proposals: [{
            index: 0,
            path: "press/reader/press.tsx",
            before: "Old source text",
            after: "New source text",
            note: "Update the copy",
            matches: 0,
          }],
        },
      }),
    });
  });
  await page.goto("/reader/preview");

  const trigger = page.locator("[data-openpress-change-preview-trigger]");
  await expect(trigger).toContainText("Proposal 需更新");
  await trigger.click();

  const explanation = page.locator("[data-openpress-change-preview-attention]");
  await expect(explanation).toBeVisible();
  await expect(explanation).toContainText("Proposal 需要重新產生");
  await expect(explanation).toContainText("請使用 openpress-collaborate 的 Refresh From Feedback…");
  await expect(explanation).not.toContainText("不要直接修改文件");
  expect((await explanation.boundingBox())?.width).toBeLessThanOrEqual(560);

  const copyPrompt = explanation.locator("[data-openpress-change-preview-copy-prompt]");
  await expect(copyPrompt).toContainText("Click to copy");
  await copyPrompt.click();
  await expect(copyPrompt).toContainText("Copied");
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain(
    "請使用 openpress-collaborate 的 Refresh From Feedback 流程",
  );

  await explanation.getByRole("button", { name: "清除 Proposal" }).click();
  await expect(explanation).toHaveCount(0);
  await expect.poll(() => clearCount).toBe(1);
  await expect(trigger).toHaveAttribute("data-openpress-change-preview-status", "empty");
  expect(requestCount).toBeGreaterThan(0);
});

test("reviews exact AI changes and leaves proposal-local feedback", async ({ page }, testInfo) => {
  const currentText = "Published Reader";
  const proposedText = "Released Document";
  const proposal: Record<string, any> = {
    index: 0,
    path: "press/reader/press.tsx",
    before: "Published",
    after: "Released",
    note: "Tighten the opening",
    matches: 1,
    line: 12,
    endLine: 12,
    afterLine: 12,
    afterEndLine: 12,
  };
  const siblingProposal: Record<string, any> = {
    ...proposal,
    index: 1,
    before: "Reader</h1>",
    after: "Document</h1>",
    note: "Clarify the artifact",
  };
  const proposals = [proposal, siblingProposal];
  let fixtureDocument: Record<string, any> | null = null;
  let savedFeedback: Record<string, unknown> | null = null;
  let activeFeedbackRequests = 0;
  let maxActiveFeedbackRequests = 0;

  await page.route("**/openpress/reader/document.json", async (route) => {
    const response = await route.fetch();
    const document = await response.json() as Record<string, any>;
    document.source.blockMap = {};
    document.source.objectEntities["text:frame%3Acover:preview-title"] = {
      id: "text:frame%3Acover:preview-title",
      kind: "text",
      label: "preview-title",
      frameKey: "cover",
      pageId: "page:cover",
      source: { path: proposal.path, source: { line: proposal.line, column: 1 } },
    };
    document.blocks[0].html = document.blocks[0].html.replace(
      "<h1>Published Reader</h1>",
      '<h1 data-openpress-object-id="text:frame%3Acover:preview-title">Published Reader</h1>',
    );
    fixtureDocument = document;
    await route.fulfill({ response, json: document });
  });
  await page.route("**/__openpress/change-preview**", async (route) => {
    if (route.request().method() === "PATCH") {
      const body = route.request().postDataJSON() as Record<string, any>;
      activeFeedbackRequests += 1;
      maxActiveFeedbackRequests = Math.max(maxActiveFeedbackRequests, activeFeedbackRequests);
      await new Promise((resolve) => setTimeout(resolve, 80));
      savedFeedback = body.feedback;
      proposals[body.index].feedback = body.feedback;
      activeFeedbackRequests -= 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, proposal: { index: body.index, feedback: body.feedback } }),
      });
      return;
    }
    if (!fixtureDocument) throw new Error("Reader fixture document was not loaded before change preview.");
    const proposedDocument = structuredClone(fixtureDocument);
    for (const item of proposals) {
      proposedDocument.blocks[0].html = proposedDocument.blocks[0].html.replace(item.before, item.after);
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, preview: { proposals, document: proposedDocument } }),
    });
  });
  await page.goto("/reader/preview");
  await page.getByRole("button", { name: "Compare 2 proposed changes on the document" }).click();

  const comparison = page.locator("[data-openpress-change-comparison]");
  const currentBlock = comparison.locator('[data-openpress-change-current="true"] [data-openpress-object-id="text:frame%3Acover:preview-title"]');
  const proposedBlock = comparison.locator('[data-openpress-change-proposed="true"] [data-openpress-object-id="text:frame%3Acover:preview-title"]');
  await expect(comparison).toBeVisible();
  await expect(comparison).toHaveAttribute(
    "data-openpress-change-comparison-layout",
    testInfo.project.name === "tablet" ? "stack" : "spread",
  );
  await expect(currentBlock).toContainText(currentText);
  await expect(proposedBlock).toContainText(proposedText);
  await expect(currentBlock).toHaveAttribute("data-openpress-change-tone", "before");
  await expect(proposedBlock).toHaveAttribute("data-openpress-change-tone", "after");

  const currentChangeMarkerWrapper = comparison.locator(
    '[data-openpress-change-marker-wrapper][data-openpress-change-proposal-index="0"][data-openpress-change-review-side="current"]',
  );
  const proposedChangeMarkerWrapper = comparison.locator(
    '[data-openpress-change-marker-wrapper][data-openpress-change-proposal-index="0"][data-openpress-change-review-side="proposed"]',
  );
  const siblingCurrentMarker = comparison.locator(
    '[data-openpress-change-marker-wrapper][data-openpress-change-proposal-index="1"][data-openpress-change-review-side="current"] [data-openpress-change-marker]',
  );
  const siblingProposedMarker = comparison.locator(
    '[data-openpress-change-marker-wrapper][data-openpress-change-proposal-index="1"][data-openpress-change-review-side="proposed"] [data-openpress-change-marker]',
  );
  const currentChangeMarker = currentChangeMarkerWrapper.locator("[data-openpress-change-marker]");
  const proposedChangeMarker = proposedChangeMarkerWrapper.locator("[data-openpress-change-marker]");
  const reviewDock = page.locator("[data-openpress-change-review-dock]");
  await expect(reviewDock).toBeVisible();
  await expect(currentChangeMarker).toHaveText("1");
  await expect(proposedChangeMarker).toHaveText("1");
  await expect(siblingCurrentMarker).toHaveText("2");
  await expect(siblingProposedMarker).toHaveText("2");
  expect((await siblingCurrentMarker.boundingBox())?.y).toBeGreaterThan((await currentChangeMarker.boundingBox())?.y ?? 0);
  await siblingCurrentMarker.click();
  await expect(comparison).toHaveAttribute("data-openpress-change-focused-proposal", "1");
  await expect(reviewDock).toContainText("變更 #2 改動意圖");

  await currentChangeMarker.click();
  await expect(comparison).toHaveAttribute("data-openpress-change-focused-proposal", "0");
  await expect(currentChangeMarkerWrapper).toHaveAttribute("data-openpress-change-marker-active", "true");
  await expect(proposedChangeMarkerWrapper).toHaveAttribute("data-openpress-change-marker-active", "true");
  await expect(currentChangeMarkerWrapper).toHaveCSS("z-index", "130");
  await expect(proposedChangeMarkerWrapper).toHaveCSS("z-index", "130");
  await expect(reviewDock).toContainText("變更 #1 改動意圖");
  await expect(reviewDock).toContainText(proposal.note);
  await expect(currentBlock).toHaveAttribute("data-openpress-change-active", "true");
  await expect(proposedBlock).toHaveAttribute("data-openpress-change-active", "true");
  await proposedChangeMarker.click();
  await expect(reviewDock).toContainText(proposal.note);

  const rejectAction = reviewDock.locator('[data-openpress-review-action="reject"]');
  await expect(rejectAction.locator("svg")).toHaveCount(1);
  await rejectAction.click();
  await expect(rejectAction).toHaveAttribute("aria-pressed", "true");
  await expect(currentChangeMarker).toHaveAttribute("data-openpress-change-feedback", "reject");
  await expect(proposedChangeMarker).toHaveAttribute("data-openpress-change-feedback", "reject");
  await reviewDock.locator("[data-openpress-review-comment-textarea]").fill("Keep the established product term.");
  await expect(reviewDock).toContainText("已自動儲存至 Preview");

  await expect(comparison).toBeVisible();
  expect(savedFeedback).toEqual({
    decision: "reject",
    comment: "Keep the established product term.",
  });
  expect(maxActiveFeedbackRequests).toBe(1);
  await expect(currentChangeMarker).toHaveAttribute("data-openpress-change-feedback", "reject");
  await expect(proposedChangeMarker).toHaveAttribute("data-openpress-change-feedback", "reject");
  await expect(page.locator("[data-openpress-inline-comment-composer]")).toHaveCount(0);

  await page.getByRole("button", { name: "Close rendered change preview" }).click();
  await expect(comparison).toBeHidden();
});

test("keeps the comment toolbar action as a toggle and reviews pending comments in a floating dock", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Comment review dock interaction only needs one browser profile");
  let comments = [
    {
      id: "comment-1",
      path: "press/reader/press.tsx",
      line: 10,
      note: "Clarify the opening title.",
      timestamp: "2026-08-21T01:00:00.000Z",
    },
    {
      id: "comment-2",
      path: "press/reader/press.tsx",
      line: 25,
      note: "Keep the chapter label concise.",
      timestamp: "2026-08-21T01:05:00.000Z",
    },
  ];
  let clearedCommentId = "";
  let updatedCommentNote = "";

  await page.route("**/__openpress/comment", async (route) => {
    if (route.request().method() === "PATCH") {
      const body = route.request().postDataJSON() as { id?: string; note?: string };
      updatedCommentNote = body.note ?? "";
      const updatedComment = comments.find((comment) => comment.id === body.id);
      if (updatedComment) updatedComment.note = updatedCommentNote;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, comment: updatedComment }),
      });
      return;
    }
    if (route.request().method() === "DELETE") {
      const body = route.request().postDataJSON() as { id?: string };
      clearedCommentId = body.id ?? "";
      comments = comments.filter((comment) => comment.id !== body.id);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, removedCount: 1, comments }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, comments }),
    });
  });

  await page.goto("/reader/preview");
  const toggle = page.locator("[data-openpress-inspector-toggle]");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(toggle).toHaveAttribute("data-openpress-toolbar-expanded", "false");
  await expect(toggle).toContainText("2");
  expect((await toggle.boundingBox())?.width).toBeLessThan(60);

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("[data-openpress-comment-menu]")).toHaveCount(0);

  const dock = page.locator("[data-openpress-comment-review-dock]");
  const textarea = dock.locator("[data-openpress-comment-review-textarea]");
  await expect(dock).toBeVisible();
  await expect(dock).toContainText(/1\s*\/\s*2/);
  await expect(textarea).toHaveValue("Clarify the opening title.");
  await expect(page.locator("[data-openpress-inline-comment-marker]")).toHaveCount(0);
  await expect(page.locator("[data-openpress-inline-comment-composer]")).toHaveCount(0);
  await expect(page.locator('[data-openpress-inspector-selected="true"]')).toHaveCount(0);

  await textarea.fill("Clarify the opening title and purpose.");
  await dock.locator("[data-openpress-comment-review-submit]").click();
  await expect.poll(() => updatedCommentNote).toBe("Clarify the opening title and purpose.");
  await expect(textarea).toHaveValue("Clarify the opening title and purpose.");

  await dock.locator("[data-openpress-comment-review-next]").click();
  await expect(dock).toContainText(/2\s*\/\s*2/);
  await expect(textarea).toHaveValue("Keep the chapter label concise.");
  await dock.locator("[data-openpress-comment-review-next]").click();
  await expect(dock).toContainText(/1\s*\/\s*2/);
  await expect(textarea).toHaveValue("Clarify the opening title and purpose.");

  await dock.locator("[data-openpress-comment-review-clear]").click();
  await expect.poll(() => clearedCommentId).toBe("comment-1");
  await expect(dock).toContainText(/1\s*\/\s*1/);
  await expect(textarea).toHaveValue("Keep the chapter label concise.");

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(dock).toHaveCount(0);
});

async function expectHotkeyRow(
  shortcuts: ReturnType<Page["locator"]>,
  commandId: string,
  label: string,
  keycaps: string[],
) {
  const row = shortcuts.locator(`[data-openpress-hotkey-command="${commandId}"]`);
  await expect(row.getByText(label, { exact: true })).toBeVisible();
  await expect(row.locator("kbd")).toHaveText(keycaps);
}

async function mockWritableWorkspaceSettings(page: Page) {
  let settings = {
    version: 1,
    appearance: { colorMode: "dark", accent: "amber" },
    page: "a4",
    captionNumbering: { figure: "Figure", table: "Table", separator: " " },
    pdf: { filename: "document.pdf" },
    deploy: {
      adapter: "cloudflare-pages",
      source: ".deploy/openpress",
      projectName: null,
      commitDirty: false,
      requiresConfirmation: true,
    },
  };
  await page.route("**/__openpress/workspace-settings", async (route) => {
    if (route.request().method() === "PUT") {
      const body = route.request().postDataJSON() as {
        appearance: typeof settings.appearance;
      };
      settings = {
        ...settings,
        appearance: body.appearance,
      };
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        settings,
        source: "settings",
        writable: true,
      }),
    });
  });
  return () => settings;
}

test("opens workspace settings and persists appearance choices", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Settings integration only needs one browser profile");
  const readSettings = await mockWritableWorkspaceSettings(page);
  await page.goto("/workspace/settings");

  await expect(page).toHaveURL(/\/workspace\/settings(?:#.*)?$/);
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Appearance" })).toBeVisible();
  const settingsContent = page.locator("[data-openpress-workspace-settings-content]");
  await expect(settingsContent).toHaveCount(1);
  const shortcuts = page.locator("[data-openpress-keyboard-shortcuts]");
  await expect(shortcuts.getByRole("heading", { name: "Keyboard shortcuts" })).toBeVisible();
  const appearanceBox = await page.locator('[aria-labelledby="workspace-appearance-heading"]').boundingBox();
  const shortcutsBox = await shortcuts.boundingBox();
  expect(appearanceBox).not.toBeNull();
  expect(shortcutsBox).not.toBeNull();
  expect(Math.abs((shortcutsBox?.x ?? 0) - (appearanceBox?.x ?? 0))).toBeLessThanOrEqual(1);
  expect(shortcutsBox?.y ?? 0).toBeGreaterThanOrEqual((appearanceBox?.y ?? 0) + (appearanceBox?.height ?? 0));
  for (const context of ["Workspace", "View", "Reader", "Presentation", "Editing", "Context controls"]) {
    await expect(shortcuts.getByRole("heading", { name: context })).toBeVisible();
  }
  await expectHotkeyRow(shortcuts, "workspace.toggle-bookmarks", "Toggle bookmarks", [PRIMARY_KEYCAP, "/"]);
  await expectHotkeyRow(shortcuts, "view.zoom-in", "Zoom in", [PRIMARY_KEYCAP, "+", PRIMARY_KEYCAP, "="]);
  await expectHotkeyRow(shortcuts, "reader.next", "Next page", ["→", "⇟"]);
  await expectHotkeyRow(shortcuts, "presentation.enter-fullscreen", "Enter fullscreen", ["F"]);
  await expectHotkeyRow(shortcuts, "editing.submit-comment", "Submit comment", [PRIMARY_KEYCAP, "↵"]);
  await expectHotkeyRow(shortcuts, "thumbnails.activate", "Activate thumbnail", ["↵", "␣"]);
  const readerNextKeys = shortcuts.locator('[data-openpress-hotkey-command="reader.next"] kbd');
  await expect(readerNextKeys.nth(0)).toHaveAttribute("aria-label", "Arrow Right");
  await expect(readerNextKeys.nth(1)).toHaveAttribute("aria-label", "Page Down");
  const submitCommentKeys = shortcuts.locator('[data-openpress-hotkey-command="editing.submit-comment"] kbd');
  await expect(submitCommentKeys.nth(0)).toHaveAttribute(
    "aria-label",
    process.platform === "darwin" ? "Command" : "Control",
  );
  await expect(submitCommentKeys.nth(1)).toHaveAttribute("aria-label", "Enter");
  await expect(shortcuts.getByText("reader", { exact: true })).toHaveCount(0);
  await expect(shortcuts.getByText("presentation", { exact: true })).toHaveCount(0);

  const light = page.locator('[data-openpress-workspace-mode-option="light"]');
  const violet = page.locator('[data-openpress-workspace-accent-option="violet"]');
  await light.click();
  await violet.click();

  await expect(page.locator("html")).toHaveAttribute("data-openpress-workspace-color-mode", "light");
  await expect(page.locator("html")).toHaveAttribute("data-openpress-workspace-accent", "violet");
  await expect.poll(() => readSettings().appearance).toEqual({
    colorMode: "light",
    accent: "violet",
  });
  expect(await page.evaluate(() => ({
    mode: window.localStorage.getItem("openpress:workspace:color-mode"),
    accent: window.localStorage.getItem("openpress:workspace:accent"),
  }))).toEqual({ mode: null, accent: null });

  await page.reload();
  await expect(light).toHaveAttribute("aria-pressed", "true");
  await expect(violet).toHaveAttribute("aria-pressed", "true");
});

test("opens Settings from More and keeps appearance separate from the Press theme", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Appearance history only needs one browser profile");
  await mockWritableWorkspaceSettings(page);
  await page.goto("/reader/preview#page-03");
  const pressAccentBefore = await page.locator(".reader-page").first().evaluate((element) => (
    getComputedStyle(element).getPropertyValue("--openpress-accent").trim()
  ));

  await page.locator("[data-openpress-workbench-more]").click();
  await page.locator("[data-openpress-overflow-settings]").click();
  await expect(page).toHaveURL(/\/workspace\/settings$/);

  await page.emulateMedia({ colorScheme: "light" });
  await page.locator('[data-openpress-workspace-mode-option="system"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-openpress-workspace-color-mode", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-openpress-workspace-color-mode", "dark");

  for (const accent of ["amber", "blue", "emerald", "violet", "rose"]) {
    await page.locator(`[data-openpress-workspace-accent-option="${accent}"]`).click();
    await expect(page.locator("html")).toHaveAttribute("data-openpress-workspace-accent", accent);
  }

  await page.goBack();
  await expect(page).toHaveURL(/\/reader\/preview#page-03$/);
  await expect(page.locator(".reader-page").first()).toBeVisible();
  const pressAccentAfter = await page.locator(".reader-page").first().evaluate((element) => (
    getComputedStyle(element).getPropertyValue("--openpress-accent").trim()
  ));
  expect(pressAccentAfter).toBe(pressAccentBefore);

  await page.goForward();
  await expect(page).toHaveURL(/\/workspace\/settings$/);
  await expect(page.locator('[data-openpress-workspace-accent-option="rose"]')).toHaveAttribute("aria-pressed", "true");
});

test("uses the compact workbench toolbar hierarchy", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Toolbar hierarchy only needs one browser profile");
  await page.route("**/openpress/workspace.json", async (route) => {
    const response = await route.fetch();
    const manifest = await response.json() as {
      presses: Array<Record<string, unknown> & { slug: string; title: string }>;
    };
    const reader = manifest.presses.find((press) => press.slug === "reader");
    if (!reader) throw new Error("Expected reader fixture Press");
    await route.fulfill({
      response,
      json: {
        ...manifest,
        presses: [reader, { ...reader, slug: "secondary", title: "Secondary E2E Fixture" }],
      },
    });
  });
  await page.goto("/reader/preview");

  await expect(page.locator(
    '[aria-label="Workspace navigation"] [data-openpress-back-to-workspace] + [data-openpress-bookmarks-toggle]',
  )).toBeVisible();
  await expect(page.locator("[data-openpress-color-mode-toggle]")).toHaveCount(0);
  await expect(page.locator("[data-openpress-mdx-editor-toggle]")).toHaveCount(0);
  await expect(page.locator("[data-openpress-deploy]")).toHaveCount(0);

  const rightActions = page.locator('[aria-label="Workspace actions"] > *');
  await expect(rightActions.first()).toHaveAttribute("data-openpress-search");

  await page.locator("[data-openpress-workbench-more]").click();
  await expect(page.locator("[data-openpress-overflow-settings]")).toBeVisible();
  await expect(page.locator("[data-openpress-overflow-document-info]")).toBeVisible();
  await expect(page.locator("[data-openpress-overflow-mdx]")).toBeVisible();
  const deploymentItem = page.locator("[data-openpress-overflow-deployment]");
  await expect(deploymentItem).toBeVisible();
  await deploymentItem.click();
  const deploymentDialog = page.locator(".openpress-deploy-dialog");
  await expect(deploymentDialog).toBeVisible();
  await expect.poll(() => deploymentDialog.evaluate(
    (element) => Number.parseFloat(getComputedStyle(element).width),
  )).toBe(420);
});

test("opens the current Press in local Reader preview mode", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Toolbar action only needs one browser profile");
  await page.addInitScript(() => {
    const browserWindow = window as typeof window & { __openpressReaderPreviewUrl?: string };
    browserWindow.open = ((url?: string | URL) => {
      browserWindow.__openpressReaderPreviewUrl = String(url);
      return null;
    }) as typeof window.open;
  });
  await page.goto("/reader/preview#page-02");

  const readerPreview = page.locator("[data-openpress-reader-preview]");
  await expect(readerPreview).toBeEnabled();
  await expect(readerPreview).toHaveAttribute("aria-label", "以公開閱讀模式預覽目前內容");
  await expect(readerPreview.locator(".op-workspace-toolbar-action-label")).toBeHidden();
  await readerPreview.click();
  await expect.poll(() => page.evaluate(
    () => (window as typeof window & { __openpressReaderPreviewUrl?: string }).__openpressReaderPreviewUrl,
  )).toBe("http://127.0.0.1:5195/reader/preview?reader=1#page-02");
  const openedUrl = await page.evaluate(
    () => (window as typeof window & { __openpressReaderPreviewUrl?: string }).__openpressReaderPreviewUrl,
  );

  await page.goto(openedUrl!);
  await expect(page.locator('[aria-label="Workspace navigation"]')).toHaveCount(0);
  await expect(page.locator('[aria-label="閱讀工具"]')).toBeVisible();
  await expect(page.locator("[data-openpress-public-pdf-download]")).toHaveCount(0);
});

test("opens search in the native right panel and focuses input", async ({ page }) => {
  await page.goto("/reader/preview");

  const searchButton = page.locator("[data-openpress-search]");
  await expect(searchButton).toBeVisible();
  await searchButton.click();

  const panel = page.locator("[data-openpress-right-panel]");
  await expect(panel).toHaveAttribute("data-openpress-panel-visible", "true");
  await expect(panel.locator("[data-openpress-search-panel]")).toBeVisible();
  const input = panel.locator('input[type="search"]');
  await expect(input).toBeFocused();
  await expect.poll(() => page.evaluate(() => {
    const main = document.querySelector<HTMLElement>("[data-openpress-main-content]");
    const rightPanel = document.querySelector<HTMLElement>("[data-openpress-right-panel]");
    if (!main || !rightPanel) return false;
    return main.getBoundingClientRect().right <= rightPanel.getBoundingClientRect().left + 1;
  })).toBe(true);
  await page.keyboard.press("Escape");
  await expect(panel).toHaveAttribute("data-openpress-panel-visible", "false");
});

test("gives the canvas the right column and keeps export in the toolbar", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Workbench uses the fixed desktop panel shell");
  await page.goto("/reader/preview");

  await expect(page.locator("[data-openpress-right-panel]")).toHaveAttribute("data-openpress-panel-visible", "false");
  await expect(page.locator("[data-openpress-tools-trigger]")).toHaveCount(0);
  const dock = page.locator('[data-openpress-page-zoom-dock="floating"]');
  await expect(dock).toBeVisible();
  await expectFlatZoomControls(page);
  await expect(page.locator('[data-openpress-page-zoom-dock="panel"]')).toHaveCount(0);

  const mainBounds = await page.locator("[data-openpress-main-content]").boundingBox();
  const viewportWidth = await page.evaluate(() => window.innerWidth);
  expect((mainBounds?.x ?? 0) + (mainBounds?.width ?? 0)).toBeGreaterThanOrEqual(viewportWidth - 1);
  await expect.poll(() => page.evaluate(() => {
    const leftPanel = document.querySelector<HTMLElement>("[data-openpress-left-panel]");
    const currentPage = document.querySelector<HTMLElement>('[aria-label="目前頁面"]');
    if (!leftPanel || !currentPage) return false;
    return Math.abs(leftPanel.getBoundingClientRect().bottom - currentPage.getBoundingClientRect().bottom) <= 2;
  })).toBe(true);

  const exportControl = page.locator("[data-openpress-export-control]");
  await expect(exportControl).toBeVisible();
  const exportTrigger = exportControl.locator('button[aria-label="匯出"]');
  const moreTrigger = page.locator("[data-openpress-workbench-more]");
  const exportBox = await exportTrigger.boundingBox();
  const moreBox = await moreTrigger.boundingBox();
  expect(exportBox?.width).toBe(moreBox?.width);
  expect(exportBox?.height).toBe(moreBox?.height);
  await expect(exportTrigger.locator("svg")).toHaveCount(1);
  await expect(exportTrigger).not.toContainText("匯出");

  await exportTrigger.click();
  await expect(exportTrigger).toHaveAttribute("data-openpress-toolbar-active", "true");
  await expect(page.getByRole("menuitem", { name: "PDF" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Word DOCX" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "PNG 圖片" })).toBeVisible();
});

test("opens theme and structure details only when requested", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Workbench uses the desktop toolbar");
  await page.goto("/reader/preview");

  await expect(page.locator("[data-openpress-document-info-dialog]")).toHaveCount(0);
  await page.locator("[data-openpress-workbench-more]").click();
  await page.locator("[data-openpress-document-info]").click();

  const dialog = page.locator("[data-openpress-document-info-dialog]");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Template style")).toBeVisible();
  await expect(dialog.getByText("Structure Summary")).toBeVisible();
  await dialog.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("opens extension panels in an overlay without resizing the canvas", async ({ page }) => {
  await page.goto("/reader/preview");
  await page.evaluate(async () => {
    const harness = await import(/* @vite-ignore */ "/tests/e2e/fixtures/WorkbenchToolsControlHarness.tsx") as {
      mountWorkbenchToolsControlHarness: () => void;
    };
    harness.mountWorkbenchToolsControlHarness();
  });

  const harness = page.locator("#workbench-tools-control-harness-root");
  const canvas = harness.locator("[data-openpress-main-content]");
  const trigger = harness.locator("[data-openpress-workbench-more]");
  await expect(harness.locator("[data-openpress-export-control]")).toBeVisible();
  await expect(harness.locator("[data-openpress-workbench-more]")).toBeVisible();
  await expect(harness.locator('[data-openpress-page-zoom-dock="floating"]')).toBeVisible();
  await expect(trigger).toBeVisible();
  expect(await harness.locator("[data-openpress-workbench-toolbar]").evaluate((toolbar) => (
    toolbar.scrollWidth <= toolbar.clientWidth
  ))).toBe(true);

  const widthBefore = (await canvas.boundingBox())?.width;
  const zoomBefore = await harness.locator("[data-openpress-zoom-value]").getAttribute("data-openpress-scale-mode");
  await trigger.click();
  await page.locator("[data-openpress-overflow-tools]").click();
  await expect(page.locator("[data-openpress-tools-drawer]")).toBeVisible();
  await expect(page.getByText("Custom panel content")).toBeVisible();
  expect((await canvas.boundingBox())?.width).toBe(widthBefore);
  await expect(harness.locator("[data-openpress-zoom-value]")).toHaveAttribute("data-openpress-scale-mode", zoomBefore ?? "fit");

  await page.locator("[data-openpress-tools-drawer]").press("Escape");
  await expect(page.locator("[data-openpress-tools-drawer]")).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await trigger.click();
  await page.locator("[data-openpress-overflow-tools]").click();
  await page.evaluate(() => {
    (window as typeof window & { __openpressSetToolsHarnessPanels?: (visible: boolean) => void })
      .__openpressSetToolsHarnessPanels?.(false);
  });
  await expect(page.locator("[data-openpress-tools-drawer]")).toHaveCount(0);
  await trigger.click();
  await expect(page.locator("[data-openpress-overflow-tools]")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    (window as typeof window & { __openpressSetToolsHarnessPanels?: (visible: boolean) => void })
      .__openpressSetToolsHarnessPanels?.(true);
  });
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(page.locator("[data-openpress-overflow-tools]")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-openpress-tools-drawer]")).toHaveCount(0);
});

test("offers slide-specific export actions and presents the current slide", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Press-type behavior only needs one browser profile");
  await page.goto("/reader/preview#page-02");
  await page.evaluate(async () => {
    const harness = await import(/* @vite-ignore */ "/tests/e2e/fixtures/WorkbenchToolsControlHarness.tsx") as {
      mountSlideWorkbenchHarness: () => void;
    };
    harness.mountSlideWorkbenchHarness();
  });

  const harness = page.locator("#workbench-tools-control-harness-root");
  await harness.locator("[data-openpress-export-control]").getByRole("button", { name: "匯出" }).click();
  await expect(page.getByRole("menuitem", { name: "放映模式" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "PDF" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "PNG 圖片" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Word DOCX" })).toHaveCount(0);

  await page.getByRole("menuitem", { name: "放映模式" }).click();
  await expect(harness).toHaveAttribute("data-openpress-presentation-index", "1");
});

test("persists a custom workbench zoom mode", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Workbench uses the fixed desktop panel shell");
  await page.goto("/reader/preview");
  await page.evaluate(({ legacyKey, storageKey }) => {
    window.localStorage.setItem(legacyKey, "scale-75");
    window.localStorage.removeItem(storageKey);
  }, { legacyKey: LEGACY_WORKBENCH_ZOOM_STORAGE_KEY, storageKey: WORKBENCH_ZOOM_STORAGE_KEY });
  await page.reload();

  await page.locator("[data-openpress-zoom-value]").click();
  const input = page.locator("[data-openpress-custom-zoom]");
  await input.fill("137");
  await input.press("Enter");
  await expect(page.locator("[data-openpress-zoom-value]")).toHaveAttribute(
    "data-openpress-scale-mode",
    "scale-137",
  );
  await expect.poll(
    () => page.evaluate((storageKey) => window.localStorage.getItem(storageKey), WORKBENCH_ZOOM_STORAGE_KEY),
  ).toBe("scale-137");
  expect(
    await page.evaluate((legacyKey) => window.localStorage.getItem(legacyKey), LEGACY_WORKBENCH_ZOOM_STORAGE_KEY),
  ).toBe("scale-75");

  await page.reload();
  await expect(page.locator("[data-openpress-zoom-value]")).toHaveAttribute(
    "data-openpress-scale-mode",
    "scale-137",
  );
});

test("adjusts workbench zoom with command shortcuts", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Workbench uses the fixed desktop panel shell");
  await page.goto("/reader/preview");

  const zoomValue = page.locator("[data-openpress-zoom-value]");
  await zoomValue.click();
  await page.locator('[data-openpress-zoom-option="scale-100"]').click();

  await page.keyboard.press("ControlOrMeta+=");
  await expect(zoomValue).toHaveAttribute("data-openpress-scale-mode", "scale-110");
  await page.keyboard.press("ControlOrMeta+-");
  await expect(zoomValue).toHaveAttribute("data-openpress-scale-mode", "scale-100");
});

test("updates zoom control boundaries from fixed mode state", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Workbench uses the fixed desktop panel shell");
  await page.goto("/reader/preview");

  const zoomValue = page.locator("[data-openpress-zoom-value]");
  const increase = page.locator("[data-openpress-zoom-increase]");
  await zoomValue.click();
  await page.locator('[data-openpress-zoom-option="scale-200"]').click();
  await zoomValue.click();
  await page.locator("[data-openpress-custom-zoom]").fill("190");
  await page.keyboard.press("Enter");

  await expect(increase).toBeEnabled();
  await increase.click();
  await expect(zoomValue).toHaveAttribute("data-openpress-scale-mode", "scale-200");
  await expect(increase).toBeDisabled();
});

test("reloads zoom when the Press storage key changes", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Workbench uses the fixed desktop panel shell");
  await page.goto("/reader/preview");
  await page.evaluate(() => {
    window.localStorage.setItem("openpress:test:page-scale:alpha", "scale-125");
    window.localStorage.setItem("openpress:test:page-scale:beta", "scale-175");
  });
  await page.evaluate(async () => {
    const harness = await import(/* @vite-ignore */ "/tests/e2e/fixtures/PageViewportScaleHarness.tsx") as {
      mountPageViewportScaleHarness: () => void;
    };
    harness.mountPageViewportScaleHarness();
  });

  const harness = page.locator("[data-page-viewport-scale-harness]");
  await expect(harness).toHaveAttribute("data-scale-mode", "scale-125");
  await page.evaluate(() => {
    const controls = window as typeof window & {
      __openpressScaleStorageWrites?: Array<[string, string]>;
      __openpressSwitchScaleStorageKey?: () => void;
    };
    const originalSetItem = Storage.prototype.setItem;
    controls.__openpressScaleStorageWrites = [];
    Storage.prototype.setItem = function setItem(key, value) {
      controls.__openpressScaleStorageWrites?.push([key, value]);
      originalSetItem.call(this, key, value);
    };
    controls.__openpressSwitchScaleStorageKey?.();
  });
  await expect(harness).toHaveAttribute("data-scale-mode", "scale-175");
  expect(await page.evaluate(() => {
    const controls = window as typeof window & { __openpressScaleStorageWrites?: Array<[string, string]> };
    return {
      alpha: window.localStorage.getItem("openpress:test:page-scale:alpha"),
      beta: window.localStorage.getItem("openpress:test:page-scale:beta"),
      writes: controls.__openpressScaleStorageWrites,
    };
  })).toEqual({
    alpha: "scale-125",
    beta: "scale-175",
    writes: [["openpress:test:page-scale:beta", "scale-175"]],
  });
});

test("keeps zoom independent across Presses", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Workbench uses the fixed desktop panel shell");
  await page.route("**/openpress/workspace.json", async (route) => {
    const response = await route.fetch();
    const manifest = await response.json() as {
      presses: Array<Record<string, unknown> & { slug: string; title: string }>;
    };
    const reader = manifest.presses.find((press) => press.slug === "reader");
    if (!reader) throw new Error("Expected reader fixture Press");
    await route.fulfill({
      response,
      json: {
        ...manifest,
        presses: [
          reader,
          { ...reader, slug: "secondary", title: "Secondary E2E Fixture" },
        ],
      },
    });
  });
  await page.goto("/reader/preview");
  await page.evaluate(() => {
    window.localStorage.removeItem("openpress:workspace:page-scale-mode:reader");
    window.localStorage.removeItem("openpress:workspace:page-scale-mode:secondary");
  });
  await page.reload();

  await selectZoomMode(page, "scale-125");
  await page.getByRole("tab", { name: "Secondary E2E Fixture" }).click();
  await expect(page).toHaveURL(/\/secondary\/preview/);
  await expect(page.locator("[data-openpress-zoom-value]")).toHaveAttribute(
    "data-openpress-scale-mode",
    "fit-width",
  );
  await selectZoomMode(page, "scale-150");

  await page.getByRole("tab", { name: "Reader E2E Fixture" }).click();
  await expect(page).toHaveURL(/\/reader\/preview/);
  await expect(page.locator("[data-openpress-zoom-value]")).toHaveAttribute(
    "data-openpress-scale-mode",
    "scale-125",
  );
  expect(await page.evaluate(() => ({
    reader: window.localStorage.getItem("openpress:workspace:page-scale-mode:reader"),
    secondary: window.localStorage.getItem("openpress:workspace:page-scale-mode:secondary"),
  }))).toEqual({ reader: "scale-125", secondary: "scale-150" });
});

test("collapses only bookmarks and persists the workspace preference", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Workbench uses the fixed desktop panel shell");
  await page.goto("/reader/preview");

  const toggle = page.locator("[data-openpress-bookmarks-toggle]");
  const panel = page.locator("[data-openpress-left-panel]");
  const main = page.locator("[data-openpress-main-content]");
  const floatingDock = page.locator('[data-openpress-page-zoom-dock="floating"]');
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(panel).toHaveAttribute("data-openpress-panel-visible", "true");
  await expect(floatingDock).toBeVisible();
  const widthBefore = (await main.boundingBox())?.width ?? 0;

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(panel).toHaveAttribute("data-openpress-panel-visible", "false");
  const viewportWidth = await page.evaluate(() => window.innerWidth);
  await expect.poll(async () => (await main.boundingBox())?.width ?? 0).toBeGreaterThan(widthBefore);
  await expect.poll(async () => (await main.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(viewportWidth - 1);
  await expect(page.locator("[data-openpress-export-control]")).toBeVisible();
  await expect(page.locator("[data-openpress-workbench-more]")).toBeVisible();
  await expect(floatingDock).toBeVisible();
  await expect.poll(() => page.evaluate(
    (key) => window.localStorage.getItem(key),
    WORKBENCH_PANEL_STORAGE_KEY,
  )).toContain('"leftPanelOpen":false');

  await page.reload();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(panel).toHaveAttribute("data-openpress-panel-visible", "false");
  await toggle.click();
  await expect(panel).toHaveAttribute("data-openpress-panel-visible", "true");
});

test("uses caption directories in the workbench bookmarks panel", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Workbench navigation integration only needs one browser profile");
  await page.goto("/reader/preview");

  const trigger = page.locator("[data-openpress-directory-trigger]");
  await expect(trigger).toContainText("主目錄");
  await trigger.click();
  await page.locator('[data-openpress-directory-option="figure"]').click();

  const figure = page.locator('[data-openpress-directory-list="figure"] [data-openpress-caption-directory-item]');
  await expect(figure).toContainText("圖 1");
  await figure.click();
  await expect(page).toHaveURL(/#page-04$/);
  await expect(page.locator("[data-openpress-current-page]")).toHaveText("04");
});

test("toggles and persists bookmarks with the primary slash shortcut", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Workbench uses the fixed desktop panel shell");
  await page.goto("/reader/preview");

  const toggle = page.locator("[data-openpress-bookmarks-toggle]");
  const panel = page.locator("[data-openpress-left-panel]");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");

  await page.keyboard.press("ControlOrMeta+/");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(panel).toHaveAttribute("data-openpress-panel-visible", "false");
  await expect.poll(() => page.evaluate(
    (key) => window.localStorage.getItem(key),
    WORKBENCH_PANEL_STORAGE_KEY,
  )).toContain('"leftPanelOpen":false');

  await page.reload();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await page.keyboard.press("ControlOrMeta+/");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
});

test("defaults bookmarks closed on narrow screens and honors a saved open preference", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "tablet", "Narrow default belongs to the tablet profile");
  await page.goto("/reader/preview");

  const toggle = page.locator("[data-openpress-bookmarks-toggle]");
  const panel = page.locator("[data-openpress-left-panel]");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(panel).toHaveAttribute("data-openpress-panel-visible", "false");

  await page.evaluate((key) => {
    window.localStorage.setItem(key, JSON.stringify({ leftPanelOpen: true, rightPanelOpen: false }));
  }, WORKBENCH_PANEL_STORAGE_KEY);
  await page.reload();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(panel).toHaveAttribute("data-openpress-panel-visible", "true");
});

test("resizes the clean navigation panel and persists one Workspace width", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Resizable navigation is a desktop interaction");
  await page.route("**/openpress/workspace.json", async (route) => {
    const response = await route.fetch();
    const manifest = await response.json() as {
      presses: Array<Record<string, unknown> & { slug: string; title: string }>;
    };
    const reader = manifest.presses.find((press) => press.slug === "reader");
    if (!reader) throw new Error("Expected reader fixture Press");
    await route.fulfill({
      response,
      json: {
        ...manifest,
        presses: [reader, { ...reader, slug: "secondary", title: "Secondary E2E Fixture" }],
      },
    });
  });
  await page.goto("/reader/preview");
  await page.evaluate((key) => window.localStorage.removeItem(key), WORKBENCH_LEFT_PANEL_WIDTH_STORAGE_KEY);
  await page.reload();

  await expect(page.locator(".op-workspace-left-identity")).toHaveCount(0);
  const panel = page.locator("[data-openpress-left-panel]");
  const separator = page.getByRole("separator", { name: "調整書籤寬度" });
  await expect(separator).toBeVisible();
  const initialWidth = (await panel.boundingBox())?.width ?? 0;
  const initialValue = Number(await separator.getAttribute("aria-valuenow"));

  await separator.press("ArrowRight");
  await expect(separator).toHaveAttribute("aria-valuenow", String(initialValue + 8));
  await expect.poll(async () => (await panel.boundingBox())?.width ?? 0).toBeGreaterThan(initialWidth);

  const handleBox = await separator.boundingBox();
  if (!handleBox) throw new Error("Expected resize separator bounds");
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + 40);
  await page.mouse.down();
  await page.mouse.move(handleBox.x + 48, handleBox.y + 40, { steps: 4 });
  await page.mouse.up();
  const persisted = Number(await page.evaluate((key) => window.localStorage.getItem(key), WORKBENCH_LEFT_PANEL_WIDTH_STORAGE_KEY));
  expect(persisted).toBeGreaterThan(initialValue + 8);

  await page.reload();
  await expect(separator).toHaveAttribute("aria-valuenow", String(persisted));
  await page.getByRole("tab", { name: "Secondary E2E Fixture" }).click();
  await expect(separator).toHaveAttribute("aria-valuenow", String(persisted));

  await separator.dblclick();
  await expect.poll(
    () => page.evaluate((key) => window.localStorage.getItem(key), WORKBENCH_LEFT_PANEL_WIDTH_STORAGE_KEY),
  ).toBeNull();
});

test("keeps a saved desktop panel width dormant on compact screens", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "tablet", "Compact width behavior belongs to the tablet profile");
  await page.goto("/reader/preview");
  await page.evaluate(({ panelKey, widthKey }) => {
    window.localStorage.setItem(panelKey, JSON.stringify({ leftPanelOpen: true, rightPanelOpen: false }));
    window.localStorage.setItem(widthKey, "480");
  }, { panelKey: WORKBENCH_PANEL_STORAGE_KEY, widthKey: WORKBENCH_LEFT_PANEL_WIDTH_STORAGE_KEY });
  await page.reload();

  await expect(page.getByRole("separator", { name: "調整書籤寬度" })).toHaveCount(0);
  const panelWidth = (await page.locator("[data-openpress-left-panel]").boundingBox())?.width ?? 0;
  expect(panelWidth).toBeLessThan(480);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), WORKBENCH_LEFT_PANEL_WIDTH_STORAGE_KEY)).toBe("480");
});

test("makes oversized workbench pages horizontally reachable", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Workbench uses the fixed desktop panel shell");
  await page.goto("/reader/preview");

  const stage = page.locator(".reader-stage");
  const zoomValue = page.locator("[data-openpress-zoom-value]");
  await zoomValue.click();
  await page.locator('[data-openpress-zoom-option="scale-200"]').click();
  await expect(zoomValue).toHaveAttribute("data-openpress-scale-mode", "scale-200");

  await expectOversizedPageReachable(page);
  await expect(stage).toHaveCSS("scrollbar-width", "thin");

  await zoomValue.click();
  await page.locator('[data-openpress-zoom-option="fit-width"]').click();
  await expect(zoomValue).toHaveAttribute("data-openpress-scale-mode", "fit-width");
  await expectPageCenteredWithoutHorizontalOverflow(page);
});

async function expectFlatZoomControls(page: Page) {
  const controls = [
    page.locator("[data-openpress-zoom-decrease]"),
    page.locator("[data-openpress-zoom-value]"),
    page.locator("[data-openpress-zoom-increase]"),
  ];
  for (const control of controls) {
    await expect(control).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await control.hover();
    await expect(control).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  }
  await expect(page.locator("[data-openpress-zoom-value]")).toHaveCSS("font-size", "13px");
  await expect(page.locator("[data-openpress-zoom-decrease] svg")).toHaveCSS("width", "18px");
  await expect(page.locator("[data-openpress-zoom-increase] svg")).toHaveCSS("width", "18px");
}

async function selectZoomMode(page: Page, mode: string) {
  await page.locator("[data-openpress-zoom-value]").click();
  await page.locator(`[data-openpress-zoom-option="${mode}"]`).click();
  await expect(page.locator("[data-openpress-zoom-value]")).toHaveAttribute(
    "data-openpress-scale-mode",
    mode,
  );
}

async function expectOversizedPageReachable(page: Page) {
  const stage = page.locator(".reader-stage");
  await expect.poll(() => stage.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);

  const edges = await stage.evaluate((element) => {
    const target = element.querySelector<HTMLElement>("#page-01");
    if (!target) throw new Error("Expected first rendered page");
    element.style.scrollBehavior = "auto";
    element.scrollLeft = 0;
    const stageAtStart = element.getBoundingClientRect();
    const pageAtStart = target.getBoundingClientRect();
    const leftReachable = pageAtStart.left >= stageAtStart.left - 1;

    element.scrollLeft = element.scrollWidth - element.clientWidth;
    const stageAtEnd = element.getBoundingClientRect();
    const pageAtEnd = target.getBoundingClientRect();
    return {
      leftReachable,
      rightReachable: pageAtEnd.right <= stageAtEnd.right + 1,
      leftGap: pageAtStart.left - stageAtStart.left,
      rightOverflow: pageAtEnd.right - stageAtEnd.right,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      scrollLeft: element.scrollLeft,
    };
  });

  expect(edges.leftReachable, JSON.stringify(edges)).toBe(true);
  expect(edges.rightReachable, JSON.stringify(edges)).toBe(true);
}

async function expectPageCenteredWithoutHorizontalOverflow(page: Page) {
  const stage = page.locator(".reader-stage");
  await expect.poll(() => stage.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  const result = await stage.evaluate((element) => {
    const target = element.querySelector<HTMLElement>("#page-01");
    if (!target) throw new Error("Expected first rendered page");
    const stageRect = element.getBoundingClientRect();
    const pageRect = target.getBoundingClientRect();
    return Math.abs(
      (pageRect.left - stageRect.left) - (stageRect.right - pageRect.right),
    );
  });
  expect(result).toBeLessThanOrEqual(1);
}
