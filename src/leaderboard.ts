/* Twitch-Login-Zone + Bestenliste (Top 10 je Modus, eigener Rang). */

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

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const fmt = (mode: Mode, v: number) => (mode === "endless" ? `${v} m` : String(v));
const currentMode = (): Mode => (settings.endless ? "endless" : "classic");

const LOGIN_BTN = `<a class="twitch-btn" href="/auth/login">Mit Twitch anmelden</a>`;

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
    $("board-list").innerHTML = listHtml((await res.json()) as Board, mode);
  } catch {
    $("board-list").innerHTML = `<li class="board-empty">Bestenliste gerade nicht erreichbar. 🌊</li>`;
  }
}

/* Nach einem Lauf: Score einreichen (falls eingeloggt) und im Endscreen anzeigen. */
export async function reportRun(mode: Mode, value: number): Promise<void> {
  const box = $("end-board");
  if (!me) {
    box.innerHTML =
      LOGIN_BTN + `<p class="board-hint">…und beim nächsten Lauf in die Bestenliste einziehen.</p>`;
    return;
  }
  try {
    let board: Board;
    let saveFailed = false;
    if (value > 0) {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode, value }),
      });
      if (res.ok) {
        board = (await res.json()) as Board;
      } else {
        saveFailed = true;
        board = (await (await fetch(`/api/scores?mode=${mode}`)).json()) as Board;
      }
    } else {
      board = (await (await fetch(`/api/scores?mode=${mode}`)).json()) as Board;
    }
    const placement = saveFailed
      ? `<p class="board-hint">⚠️ Lauf konnte nicht gespeichert werden — die Liste zeigt den letzten Stand.</p>`
      : board.me
        ? `<p class="board-hint">Platz ${board.me.rank} von ${board.me.total} — dein Bestwert: ${fmt(mode, board.me.value)}</p>`
        : "";
    box.innerHTML = `<h3>🏆 Bestenliste</h3><ol class="board-list">${listHtml(board, mode)}</ol>${placement}`;
    void refreshBoard();
  } catch {
    box.innerHTML = `<p class="board-hint">Bestenliste gerade nicht erreichbar. 🌊</p>`;
  }
}
