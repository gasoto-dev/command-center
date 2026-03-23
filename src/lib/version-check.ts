const BUILD_ID = __BUILD_ID__;
const VERSION_URL = "/version.json";
const CHECK_INTERVAL_MS = 60_000; // check every 60s

let checking = false;

async function checkForUpdate(): Promise<void> {
  if (checking) return;
  checking = true;
  try {
    const resp = await fetch(VERSION_URL, { cache: "no-store" });
    if (!resp.ok) return;
    const data = (await resp.json()) as { buildId: string };
    if (data.buildId && data.buildId !== BUILD_ID) {
      console.log(`[version-check] New build detected: ${data.buildId} (current: ${BUILD_ID}). Reloading...`);
      window.location.reload();
    }
  } catch {
    // network error — skip
  } finally {
    checking = false;
  }
}

export function startVersionCheck(): void {
  // Check on visibility change (user comes back to tab)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void checkForUpdate();
    }
  });

  // Periodic check
  setInterval(() => void checkForUpdate(), CHECK_INTERVAL_MS);

  // Initial check after a short delay (let the app boot)
  setTimeout(() => void checkForUpdate(), 5_000);
}

declare const __BUILD_ID__: string;
