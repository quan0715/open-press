import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

const CHROME_CANDIDATE_PATHS = {
  darwin: [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ],
  linux: [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
    "/opt/google/chrome/chrome",
  ],
  win32: [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ],
};

const CHROME_BIN_NAMES = {
  darwin: [],
  linux: ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"],
  win32: ["chrome.exe"],
};

let cachedChromePath = null;

function resolveChromePath() {
  if (cachedChromePath) return cachedChromePath;
  if (process.env.CHROME) {
    cachedChromePath = process.env.CHROME;
    return cachedChromePath;
  }

  const platform = process.platform;
  const candidates = [...(CHROME_CANDIDATE_PATHS[platform] ?? [])];

  if (platform === "win32") {
    const roots = [process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"], process.env.LOCALAPPDATA].filter(Boolean);
    for (const root of roots) {
      candidates.push(`${root}\\Google\\Chrome\\Application\\chrome.exe`);
    }
  }

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      cachedChromePath = candidate;
      return cachedChromePath;
    }
  }

  const whichCommand = platform === "win32" ? "where" : "which";
  for (const name of CHROME_BIN_NAMES[platform] ?? []) {
    try {
      const result = spawnSync(whichCommand, [name], { encoding: "utf8" });
      const output = result.stdout?.trim().split(/\r?\n/)[0];
      if (result.status === 0 && output && existsSync(output)) {
        cachedChromePath = output;
        return cachedChromePath;
      }
    } catch {
      // continue
    }
  }

  const lines = [
    `Cannot locate a Chrome / Chromium executable on ${platform}.`,
    `Set the CHROME environment variable to your Chrome binary path, or install Chrome at one of:`,
    ...candidates.map((p) => `  - ${p}`),
  ];
  throw new Error(lines.join("\n"));
}

const DEFAULT_PRINT_OPTIONS = {
  printBackground: true,
  displayHeaderFooter: false,
  preferCSSPageSize: true,
  paperWidth: 8.2677,
  paperHeight: 11.6929,
  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,
};

export async function printUrlToPdf({
  root,
  url,
  outPath,
  chrome,
  waitForReady = waitForPrintReady,
  printOptions = {},
  debuggingPortBase = 9600,
  debuggingPortRange = 300,
  profilePrefix = "chrome-pdf",
}) {
  chrome ??= resolveChromePath();
  await fs.mkdir(path.dirname(outPath), { recursive: true });

  const debuggingPort = String(debuggingPortBase + Math.floor(Math.random() * debuggingPortRange));
  const profileDir = path.join(root, ".openpress", "tmp", `${profilePrefix}-${process.pid}-${Date.now()}`);
  await fs.mkdir(profileDir, { recursive: true });

  const child = spawn(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      `--remote-debugging-port=${debuggingPort}`,
      `--user-data-dir=${profileDir}`,
      "about:blank",
    ],
    { cwd: root, stdio: ["ignore", "pipe", "pipe"] },
  );

  try {
    const tab = await waitForChromeTab(debuggingPort);
    const client = await connectChromeDevTools(tab.webSocketDebuggerUrl);
    try {
      await client.send("Page.enable");
      await client.send("Runtime.enable");
      await client.send("Emulation.setEmulatedMedia", { media: "print" });
      await client.send("Page.navigate", { url });
      const readyResult = await waitForReady(client);
      const result = await client.send("Page.printToPDF", {
        ...DEFAULT_PRINT_OPTIONS,
        ...printOptions,
      });
      await fs.writeFile(outPath, Buffer.from(String(result.data ?? ""), "base64"));
      return readyResult;
    } finally {
      client.close();
    }
  } finally {
    await stopChildProcess(child);
    await cleanupChromeProfile(profileDir);
  }
}

export async function evaluateUrlWithChrome({
  root,
  url,
  chrome,
  evaluate,
  emulatedMedia,
  debuggingPortBase = 9900,
  debuggingPortRange = 300,
  profilePrefix = "chrome-eval",
}) {
  chrome ??= resolveChromePath();

  const debuggingPort = String(debuggingPortBase + Math.floor(Math.random() * debuggingPortRange));
  const profileDir = path.join(root, ".openpress", "tmp", `${profilePrefix}-${process.pid}-${Date.now()}`);
  await fs.mkdir(profileDir, { recursive: true });

  const child = spawn(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      `--remote-debugging-port=${debuggingPort}`,
      `--user-data-dir=${profileDir}`,
      "about:blank",
    ],
    { cwd: root, stdio: ["ignore", "pipe", "pipe"] },
  );

  try {
    const tab = await waitForChromeTab(debuggingPort);
    const client = await connectChromeDevTools(tab.webSocketDebuggerUrl);
    try {
      await client.send("Page.enable");
      await client.send("Runtime.enable");
      if (emulatedMedia) {
        await client.send("Emulation.setEmulatedMedia", { media: emulatedMedia });
      }
      await client.send("Page.navigate", { url });
      return await evaluate(client);
    } finally {
      client.close();
    }
  } finally {
    await stopChildProcess(child);
    await cleanupChromeProfile(profileDir);
  }
}

export async function waitForPrintReady(client) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const result = await client.send("Runtime.evaluate", {
      returnByValue: true,
      awaitPromise: true,
      expression: `Promise.resolve().then(async () => {
        const root = document.querySelector('[data-openpress-print-document="true"]');
        const ready = root?.getAttribute('data-openpress-pagination') === 'ready';
        if (!ready) return 0;

        await document.fonts?.ready;
        await Promise.all(Array.from(document.images).map(async (img) => {
          if (!img.complete) {
            await new Promise((resolve) => {
              const settle = () => {
                img.removeEventListener('load', settle);
                img.removeEventListener('error', settle);
                resolve();
              };

              img.addEventListener('load', settle, { once: true });
              img.addEventListener('error', settle, { once: true });
            });
          }

          await img.decode?.().catch(() => undefined);
        }));

        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

        const pages = Array.from(document.querySelectorAll('.openpress-public-page > .openpress-html-page'));
        const contentFitsPageBody = (body) => {
          const bodyBottom = body.getBoundingClientRect().bottom;
          const contentBottom = Array.from(body.children).reduce((bottom, child) => {
            if (getComputedStyle(child).display === 'none') return bottom;
            const marginBottom = Number.parseFloat(getComputedStyle(child).marginBottom) || 0;
            return Math.max(bottom, child.getBoundingClientRect().bottom + marginBottom);
          }, body.getBoundingClientRect().top);
          return contentBottom <= bodyBottom + 1;
        };
        const bodyOverflowSafe = pages.every((page) => {
          const body = page.querySelector('.page-body');
          return !body || contentFitsPageBody(body);
        });

        return pages.length > 0 && bodyOverflowSafe ? pages.length : 0;
      })`,
    });
    const count = Number(result.result?.value ?? 0);
    if (count > 0) return count;
    await delay(100);
  }
  throw new Error("Timed out waiting for OpenPress pagination before PDF export.");
}

export async function stopChildProcess(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill();
  const closed = await waitForChildClose(child, 2500);
  if (closed || child.exitCode !== null || child.signalCode !== null) return;
  child.kill("SIGKILL");
  await waitForChildClose(child, 2500);
}

async function waitForChromeTab(debuggingPort) {
  const deadline = Date.now() + 10000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${debuggingPort}/json/list`);
      const tabs = await response.json();
      const tab = tabs.find((item) => item.type === "page" && item.webSocketDebuggerUrl);
      if (tab) return tab;
    } catch (error) {
      lastError = error;
    }
    await delay(100);
  }
  throw new Error(`Timed out waiting for Chrome DevTools${lastError ? `: ${lastError.message}` : ""}`);
}

async function connectChromeDevTools(webSocketDebuggerUrl) {
  const socket = new WebSocket(webSocketDebuggerUrl);
  const pending = new Map();
  let nextId = 0;

  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (!message.id || !pending.has(message.id)) return;
    const callbacks = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) callbacks?.reject(new Error(message.error.message ?? "Chrome DevTools command failed."));
    else callbacks?.resolve(message.result ?? {});
  });

  return {
    send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = ++nextId;
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    close() {
      socket.close();
    },
  };
}

function waitForChildClose(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve(true);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (closed) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.off("close", onClose);
      child.off("error", onError);
      resolve(closed);
    };
    const onClose = () => finish(true);
    const onError = () => finish(true);
    const timer = setTimeout(() => finish(false), timeoutMs);
    child.once("close", onClose);
    child.once("error", onError);
  });
}

async function cleanupChromeProfile(profileDir) {
  try {
    await fs.rm(profileDir, { recursive: true, force: true, maxRetries: 8, retryDelay: 150 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Could not remove temporary Chrome profile ${profileDir}: ${message}`);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
