/* Die Werkbank: Teile platzieren, Palette, Stats, Raster-Rendering. */

import type { PartDef, PlacedPart } from "./types";
import { $, BRUDI_WEIGHT, CELL, COLS, ROWS, TINT } from "./config";
import { PARTS } from "./parts/index";
import { drawFifthMark, drawPartRect } from "./painters";
import { rocketRisk, topfiCountOf } from "./physics";

export let placed: PlacedPart[] = [];
let selectedDef: PartDef | null = null;
let eraseMode = false;
let hover: { col: number; row: number } | null = null;

function partAt(col: number, row: number) {
  return placed.find(
    (p) => col >= p.col && col < p.col + p.def.w && row >= p.row && row < p.row + p.def.h,
  );
}

function touchesStructure(def: PartDef, col: number, row: number): boolean {
  if (placed.length === 0) return true;
  for (let c = col; c < col + def.w; c++)
    for (let r = row; r < row + def.h; r++)
      for (const [dc, dr] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ])
        if (partAt(c + dc, r + dr)) return true;
  return false;
}

function atMaxCount(def: PartDef): boolean {
  return !!def.max && placed.filter((p) => p.def === def).length >= def.max;
}

function canPlace(def: PartDef, col: number, row: number): boolean {
  if (col < 0 || row < 0 || col + def.w > COLS || row + def.h > ROWS) return false;
  if (atMaxCount(def)) return false;
  for (let c = col; c < col + def.w; c++)
    for (let r = row; r < row + def.h; r++) if (partAt(c, r)) return false;
  return touchesStructure(def, col, row);
}

function anchorFor(def: PartDef, col: number, row: number): [number, number] {
  return [col - Math.floor(def.w / 2), row - Math.floor(def.h / 2)];
}

function buildTotals() {
  const weight = BRUDI_WEIGHT + placed.reduce((s, p) => s + p.def.weight, 0);
  const buoy = placed.reduce((s, p) => s + p.def.buoy, 0);
  const comfort = placed.reduce((s, p) => s + (p.def.comfort || 0), 0);
  return { weight, buoy, comfort, margin: buoy - weight };
}

/* ---------- Rendering ---------- */

export function drawGrid() {
  const c = $("grid") as HTMLCanvasElement;
  if (!c) return;
  const W = COLS * CELL,
    H = ROWS * CELL;
  const dpr = devicePixelRatio || 1;
  c.width = W * dpr;
  c.height = H * dpr;
  c.style.width = W + "px";
  c.style.height = H + "px";
  const ctx = c.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#141428";
  ctx.fillRect(0, 0, W, H);

  // Wasserlinien-Hinweis (untere Zone liegt tiefer im Wasser)
  const wlY = (ROWS - 3) * CELL;
  const grad = ctx.createLinearGradient(0, wlY, 0, H);
  grad.addColorStop(0, "rgba(0,140,255,0.06)");
  grad.addColorStop(1, "rgba(0,140,255,0.16)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, wlY, W, H - wlY);
  ctx.strokeStyle = "rgba(0,180,255,0.35)";
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(0, wlY);
  ctx.lineTo(W, wlY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(120,200,255,0.5)";
  ctx.font = "11px sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText("≈ Wasserlinie (grobe Schätzung, ehrlich)", W - 8, wlY - 4);

  // Raster
  ctx.strokeStyle = "#23233c";
  ctx.lineWidth = 1;
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * CELL + 0.5, 0);
    ctx.lineTo(x * CELL + 0.5, H);
    ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL + 0.5);
    ctx.lineTo(W, y * CELL + 0.5);
    ctx.stroke();
  }

  // Teile
  for (const p of placed) {
    drawPartRect(ctx, p.def, p.col * CELL, p.row * CELL, CELL, false);
    if (p.fifth) drawFifthMark(ctx, p.col * CELL, p.row * CELL, p.def.w * CELL, p.def.h * CELL);
  }

  // Ghost-Vorschau
  if (hover && !eraseMode && selectedDef) {
    const [ac, ar] = anchorFor(selectedDef, hover.col, hover.row);
    const ok = canPlace(selectedDef, ac, ar);
    ctx.globalAlpha = 0.5;
    drawPartRect(ctx, selectedDef, ac * CELL, ar * CELL, CELL, false);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = ok ? "#3dd68c" : "#ff5c5c";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(
      ac * CELL + 1,
      ar * CELL + 1,
      selectedDef.w * CELL - 2,
      selectedDef.h * CELL - 2,
    );
  }
  if (hover && eraseMode) {
    const p = partAt(hover.col, hover.row);
    if (p) {
      ctx.strokeStyle = "#ff5c5c";
      ctx.lineWidth = 3;
      ctx.strokeRect(p.col * CELL + 1, p.row * CELL + 1, p.def.w * CELL - 2, p.def.h * CELL - 2);
    }
  }
}

/* ---------- Palette + Stats ---------- */

function showInfo(def: PartDef | null) {
  if (!def) {
    $("info-bar").innerHTML =
      "👆 Wähl oben ein Bauteil und klick es aufs Raster. Qualität der Knoten: fragwürdig.";
    return;
  }
  $("info-bar").innerHTML =
    `${def.icon} <b>${def.name}</b> (${def.w}×${def.h}) · 🎈 Auftrieb <b>${def.buoy}</b> · ⚖️ Gewicht <b>${def.weight}</b>` +
    ` · 🛡️ Festigkeit <b>${"★".repeat(def.tough)}${"☆".repeat(5 - def.tough)}</b>` +
    (def.comfort ? ` · 🛋️ Komfort <b>+${def.comfort}</b>` : "") +
    ` — <i>${def.flavor}</i>`;
}

function renderPalette() {
  const pal = $("palette");
  pal.innerHTML = "";
  for (const def of PARTS) {
    const tile = document.createElement("div");
    const maxed = atMaxCount(def);
    tile.className =
      "part-tile" + (selectedDef === def ? " selected" : "") + (maxed ? " maxed" : "");
    const tint = TINT[def.id] || "255,255,255";
    tile.style.background = `linear-gradient(160deg, rgba(${tint},0.26), rgba(${tint},0.07))`;
    tile.style.borderColor = `rgba(${tint},0.4)`;
    const badge = def.max
      ? `${placed.filter((p) => p.def === def).length}/${def.max}`
      : `${def.w}×${def.h}`;
    tile.innerHTML = `<span class="size">${badge}</span><canvas class="icon-canvas" width="60" height="40"></canvas><span class="name">${def.name}</span>`;
    const icv = tile.querySelector("canvas") as HTMLCanvasElement;
    const ictx = icv.getContext("2d")!;
    const ics = Math.min(60 / def.w, 40 / def.h);
    drawPartRect(ictx, def, (60 - def.w * ics) / 2, (40 - def.h * ics) / 2, ics);
    tile.addEventListener("click", () => {
      selectedDef = selectedDef === def ? null : def;
      eraseMode = false;
      updateEraseBtn();
      renderPalette();
      showInfo(selectedDef);
      drawGrid();
    });
    tile.addEventListener("mouseenter", () => showInfo(def));
    tile.addEventListener("mouseleave", () => showInfo(selectedDef));
    pal.appendChild(tile);
  }
}

function renderStats() {
  const t = buildTotals();
  $("stat-weight").textContent = t.weight + " kg";
  $("stat-buoy").textContent = t.buoy + " kg";
  $("stat-comfort").textContent = t.comfort ? "+" + t.comfort : "0";
  $("stat-rocket").textContent =
    topfiCountOf(placed) >= 10 ? "☢️ DEFCON 1" : Math.round(rocketRisk(placed) * 100) + " %";
}

export function renderBuild() {
  renderPalette();
  renderStats();
  drawGrid();
}

function updateEraseBtn() {
  const btn = $("erase-btn");
  btn.textContent = eraseMode ? "🧨 Abreißen: AN" : "🧨 Abreißen: AUS";
  btn.classList.toggle("active", eraseMode);
}

function removePartAt(col: number, row: number) {
  const p = partAt(col, row);
  if (!p) return;
  placed.splice(placed.indexOf(p), 1);
  renderBuild();
}

/* ---------- Maus-Input ---------- */

export function initBuilderInput() {
  const c = $("grid");
  const cellFromEvent = (e: MouseEvent) => {
    const rect = c.getBoundingClientRect();
    return {
      col: Math.floor((e.clientX - rect.left) / CELL),
      row: Math.floor((e.clientY - rect.top) / CELL),
    };
  };
  c.addEventListener("mousemove", (e) => {
    hover = cellFromEvent(e);
    drawGrid();
  });
  c.addEventListener("mouseleave", () => {
    hover = null;
    drawGrid();
  });
  c.addEventListener("click", (e) => {
    const { col, row } = cellFromEvent(e);
    if (eraseMode) {
      removePartAt(col, row);
      return;
    }
    if (!selectedDef) return;
    const [ac, ar] = anchorFor(selectedDef, col, row);
    if (!canPlace(selectedDef, ac, ar)) return;
    const inst: PlacedPart = { def: selectedDef, col: ac, row: ar, broken: false };
    placed.push(inst);
    // Das 5. platzierte Fass wird automatisch zum legendären 5. Fass.
    if (
      selectedDef.id === "fass" &&
      !placed.some((p) => p.fifth) &&
      placed.filter((p) => p.def.id === "fass").length === 5
    ) {
      inst.fifth = true;
      $("info-bar").innerHTML =
        "🛢️ <b>DAS FÜNFTE FASS.</b> Jetzt ist es offiziell professioneller Floßbau. (Mehr Auftrieb, fragwürdige Befestigung, Legendenstatus.)";
    }
    renderBuild();
  });
  c.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    const { col, row } = cellFromEvent(e as MouseEvent);
    removePartAt(col, row);
  });

  $("erase-btn").addEventListener("click", () => {
    eraseMode = !eraseMode;
    if (eraseMode) selectedDef = null;
    updateEraseBtn();
    renderPalette();
    drawGrid();
  });
  $("clear-btn").addEventListener("click", () => {
    placed = [];
    renderBuild();
  });
}
