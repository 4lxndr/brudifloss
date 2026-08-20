/* Twitch-Login-Zone + Bestenliste (Top 10 je Modus, Overlay, eigener Rang). */

import { $ } from "./config";
import { settings } from "./state";

export type Mode = "classic" | "endless";

interface Me {
  id: string;
  login: string;
  name: string;
  avatar: string;
}
interface BoardRow {
  rank: number;
  name: string;
  avatar: string;
  value: number;
  self: boolean;
}
interface Board {
  top: BoardRow[];
  me: { rank: number; value: number; total: number } | null;
}

let me: Me | null = null;

/* Platz 1 je Modus, Stand der letzten Board-Antwort. null = noch nie geladen,
   value 0 = Liste war leer. Quelle für das Rekord-Badge im Endscreen. */
const globalBest: Record<Mode, { value: number; name: string } | null> = {
  classic: null,
  endless: null,
};

function rememberBest(board: Board, mode: Mode): void {
  globalBest[mode] = board.top.length
    ? { value: board.top[0].value, name: board.top[0].name }
    : { value: 0, name: "" };
}

export function getGlobalBest(mode: Mode): { value: number; name: string } | null {
  return globalBest[mode];
}

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const fmt = (mode: Mode, v: number) => (mode === "endless" ? `${v} m` : String(v));
const currentMode = (): Mode => (settings.endless ? "endless" : "classic");

const LOGIN_BTN = `<a class="twitch-btn" href="/auth/login">Mit Twitch anmelden</a>`;
const OFFLINE_HINT = `<p class="board-hint">Bestenliste gerade nicht erreichbar. 🌊</p>`;

export async function initAccount(): Promise<void> {
  try {
    const res = await fetch("/auth/me");
    me = ((await res.json()) as { user: Me | null }).user;
  } catch {
    me = null;
  }
  renderLoginZone();
}

function renderLoginZone(): void {
  const zone = $("login-zone");
  if (me) {
    zone.innerHTML =
      `<img class="login-avatar" src="${esc(me.avatar)}" alt="" />` +
      `<span class="login-name">${esc(me.name)}</span>` +
      `<button id="logout-btn" class="tool-btn">Abmelden</button>`;
    $("logout-btn").addEventListener("click", () => {
      void fetch("/auth/logout", { method: "POST" }).then(() => {
        me = null;
        renderLoginZone();
        void refreshBoard();
      });
    });
  } else {
    zone.innerHTML = LOGIN_BTN;
  }
}

function listHtml(board: Board, mode: Mode): string {
  if (!board.top.length) {
    return `<li class="board-empty">Noch keine Einträge — sei der Erste auf dem Wasser!</li>`;
  }
  return board.top
    .map(
      (r) =>
        `<li class="board-row${r.self ? " board-me" : ""}">` +
        `<span class="board-rank">${r.rank}.</span>` +
        (r.avatar ? `<img class="board-avatar" src="${esc(r.avatar)}" alt="" />` : `<span class="board-avatar"></span>`) +
        `<span class="board-name">${esc(r.name)}</span>` +
        `<b class="board-value">${fmt(mode, r.value)}</b></li>`,
    )
    .join("");
}

export async function refreshBoard(): Promise<void> {
  const mode = currentMode();
  $("board-mode-label").textContent = mode === "endless" ? "♾️ Endlos" : "🏁 600 m Klassik";
  try {
    const res = await fetch(`/api/scores?mode=${mode}`);
    if (!res.ok) throw new Error(String(res.status));
    const board = (await res.json()) as Board;
    rememberBest(board, mode);
    $("board-list").innerHTML = listHtml(board, mode);
  } catch {
    $("board-list").innerHTML = `<li class="board-empty">Bestenliste gerade nicht erreichbar. 🌊</li>`;
  }
}

/* ---------- Overlay ---------- */

let overlayMode: Mode = "classic";

export function initOverlay(): void {
  $("board-close").addEventListener("click", closeOverlay);
  $("board-overlay").addEventListener("click", (e) => {
    if (e.target === $("board-overlay")) closeOverlay();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("board-overlay").classList.contains("hidden")) closeOverlay();
  });
  $("board-tab-classic").addEventListener("click", () => setOverlayMode("classic"));
  $("board-tab-endless").addEventListener("click", () => setOverlayMode("endless"));
}

export function openBoardOverlay(mode: Mode): void {
  $("board-overlay").classList.remove("hidden");
  setOverlayMode(mode);
}

function closeOverlay(): void {
  $("board-overlay").classList.add("hidden");
}

function setOverlayMode(mode: Mode): void {
  overlayMode = mode;
  $("board-tab-classic").classList.toggle("active", mode === "classic");
  $("board-tab-endless").classList.toggle("active", mode === "endless");
  void loadOverlayBoard();
}

async function loadOverlayBoard(): Promise<void> {
  const list = $("overlay-board-list");
  try {
    const res = await fetch(`/api/scores?mode=${overlayMode}`);
    if (!res.ok) throw new Error(String(res.status));
    const board = (await res.json()) as Board;
    rememberBest(board, overlayMode);
    list.innerHTML = listHtml(board, overlayMode);
  } catch {
    list.innerHTML = `<li class="board-empty">Bestenliste gerade nicht erreichbar. 🌊</li>`;
  }
}

/* ---------- Endscreen: kompakte Zeile + Button ---------- */

const SAVE_FAILED_HINT = `<p class="board-hint">⚠️ Lauf konnte nicht gespeichert werden.</p>`;
const RETRY_DELAY_MS = 10_500;
let retryTimer: ReturnType<typeof setTimeout> | undefined;

function renderEndBox(box: HTMLElement, mode: Mode, hint: string): void {
  box.innerHTML = hint + `<button id="end-board-btn" class="board-open-btn">🏆 Bestenliste</button>`;
  $("end-board-btn").addEventListener("click", () => openBoardOverlay(mode));
}

function placementHint(board: Board, mode: Mode): string {
  return board.me
    ? `<p class="board-hint">🏅 Platz ${board.me.rank} von ${board.me.total} Läufen — dein Bestwert: ${fmt(mode, board.me.value)}</p>`
    : "";
}

/* Ein Retry nach 429 (Rate-Limit): derselbe Lauf wird nochmal gepostet, statt verloren zu gehen. */
async function retryScore(box: HTMLElement, mode: Mode, value: number): Promise<void> {
  try {
    const res = await fetch("/api/scores", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode, value }),
    });
    if (!res.ok) throw new Error(String(res.status));
    const board = (await res.json()) as Board;
    rememberBest(board, mode);
    renderEndBox(box, mode, placementHint(board, mode));
    void refreshBoard();
  } catch {
    renderEndBox(box, mode, SAVE_FAILED_HINT);
  }
}

/* Nach einem Lauf: Score einreichen (falls eingeloggt) und im Endscreen anzeigen. */
export async function reportRun(mode: Mode, value: number): Promise<void> {
  const box = $("end-board");
  clearTimeout(retryTimer); // ein alter Retry darf einen neuen Lauf nicht überschreiben
  if (!me) {
    renderEndBox(
      box,
      mode,
      LOGIN_BTN + `<p class="board-hint">…und beim nächsten Lauf in die Bestenliste einziehen.</p>`,
    );
    return;
  }
  try {
    let hint: string;
    if (value > 0) {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode, value }),
      });
      if (res.ok) {
        const board = (await res.json()) as Board;
        rememberBest(board, mode);
        hint = placementHint(board, mode);
      } else if (res.status === 429) {
        hint = `<p class="board-hint">⏳ Kurz gewartet — dein Lauf wird gleich gespeichert …</p>`;
        retryTimer = setTimeout(() => void retryScore(box, mode, value), RETRY_DELAY_MS);
      } else {
        hint = SAVE_FAILED_HINT;
      }
    } else {
      const board = (await (await fetch(`/api/scores?mode=${mode}`)).json()) as Board;
      rememberBest(board, mode);
      hint = placementHint(board, mode);
    }
    renderEndBox(box, mode, hint);
    void refreshBoard();
  } catch {
    renderEndBox(box, mode, OFFLINE_HINT);
  }
}
