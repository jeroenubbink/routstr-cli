import { fetchAllData } from "./data";
import { renderScreen } from "./render";
import { type MonitorState, TABS, createInitialState } from "./state";
import { disableRawMode, enableRawMode, enterAltScreen, exitAltScreen } from "./terminal";

export async function startMonitor(nodeUrl: string, refreshInterval: number): Promise<void> {
  const state = createInitialState();
  let running = true;
  let refreshTimer: ReturnType<typeof setInterval> | null = null;

  // Setup terminal
  enterAltScreen();
  enableRawMode();

  async function refresh(): Promise<void> {
    await fetchAllData(nodeUrl, state);
    renderScreen(state);
  }

  function cleanup(): void {
    running = false;
    if (refreshTimer) clearInterval(refreshTimer);
    disableRawMode();
    exitAltScreen();
  }

  // Handle resize
  process.stdout.on("resize", () => renderScreen(state));

  // Handle cleanup
  process.on("SIGINT", () => {
    cleanup();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    cleanup();
    process.exit(0);
  });

  // Key handling
  process.stdin.on("data", async (key: string) => {
    if (!running) return;

    switch (key) {
      case "q":
      case "\x03": // Ctrl+C
        cleanup();
        process.exit(0);
        break;

      // Tab navigation
      case "h":
      case "\x1b[D": // left arrow
        state.activeTab = (state.activeTab - 1 + TABS.length) % TABS.length;
        state.scrollOffset = 0;
        renderScreen(state);
        break;
      case "l":
      case "\x1b[C": // right arrow
        state.activeTab = (state.activeTab + 1) % TABS.length;
        state.scrollOffset = 0;
        renderScreen(state);
        break;
      case "1":
      case "2":
      case "3":
        {
          const idx = Number.parseInt(key, 10) - 1;
          if (idx >= 0 && idx < TABS.length) state.activeTab = idx;
        }
        state.scrollOffset = 0;
        renderScreen(state);
        break;

      // Scrolling
      case "j":
      case "\x1b[B": // down arrow
        state.scrollOffset++;
        renderScreen(state);
        break;
      case "k":
      case "\x1b[A": // up arrow
        state.scrollOffset = Math.max(0, state.scrollOffset - 1);
        renderScreen(state);
        break;
      case "g": // gg = top (simplified: single g)
        state.scrollOffset = 0;
        renderScreen(state);
        break;
      case "G": // bottom
        state.scrollOffset = Math.max(0, getDataLength(state) - 10);
        renderScreen(state);
        break;

      // Refresh
      case "R":
      case "r":
        await refresh();
        break;
      case "A":
      case "a":
        state.autoRefresh = !state.autoRefresh;
        renderScreen(state);
        break;
    }
  });

  // Initial fetch + render
  await refresh();

  // Auto-refresh loop
  refreshTimer = setInterval(async () => {
    if (state.autoRefresh && running) {
      await refresh();
    }
  }, refreshInterval * 1000);

  // Keep process alive
  await new Promise<void>(() => {});
}

function getDataLength(state: MonitorState): number {
  switch (state.activeTab) {
    case 1:
      return state.models.length;
    case 2:
      return state.providers.length;
    default:
      return 0;
  }
}
